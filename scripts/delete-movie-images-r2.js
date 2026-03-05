import 'dotenv/config';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = 'true';
    }
  }
  return out;
}

function parseBool(v, dflt) {
  if (v == null) return dflt;
  const s = String(v).trim().toLowerCase();
  if (!s) return dflt;
  if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
  if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
  return dflt;
}

function parseList(raw) {
  const s = String(raw || '').trim();
  if (!s) return [];
  return Array.from(
    new Set(
      s
        .split(/[\n\r,\t ]+/)
        .map((x) => String(x || '').trim())
        .filter(Boolean)
    )
  );
}

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const key = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !key || !secret) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: key, secretAccessKey: secret },
  });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function listAllKeysByPrefix(client, bucket, prefix, limit) {
  const keys = [];
  let token = undefined;
  while (true) {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    );
    const items = res.Contents || [];
    for (const it of items) {
      const k = it && it.Key ? String(it.Key) : '';
      if (!k) continue;
      keys.push(k);
      if (limit > 0 && keys.length >= limit) return keys;
    }
    if (!res.IsTruncated) break;
    token = res.NextContinuationToken;
    if (!token) break;
  }
  return keys;
}

async function deleteKeys(client, bucket, keys, opts) {
  const dryRun = !!opts.dryRun;
  if (!keys.length) return { deleted: 0, errors: 0 };

  if (dryRun) {
    return { deleted: 0, errors: 0 };
  }

  let deleted = 0;
  let errors = 0;
  const chunks = chunk(keys, 1000);
  for (const part of chunks) {
    const res = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: part.map((k) => ({ Key: k })),
          Quiet: true,
        },
      })
    );
    const del = res && res.Deleted ? res.Deleted.length : 0;
    const err = res && res.Errors ? res.Errors.length : 0;
    deleted += del;
    errors += err;
    if (err) {
      const sample = (res.Errors || []).slice(0, 5);
      console.warn('Delete errors sample:', sample);
    }
  }
  return { deleted, errors };
}

function loadState(statePath) {
  try {
    if (!fs.existsSync(statePath)) return { version: 1, uploaded: {} };
    const raw = fs.readFileSync(statePath, 'utf-8');
    const j = JSON.parse(raw);
    if (!j || typeof j !== 'object') return { version: 1, uploaded: {} };
    if (!j.uploaded || typeof j.uploaded !== 'object') j.uploaded = {};
    if (!j.version) j.version = 1;
    return j;
  } catch {
    return { version: 1, uploaded: {} };
  }
}

function markDeletedInState(state, movieId, kind) {
  if (!state || !state.uploaded) return;
  const row = state.uploaded[movieId];
  if (!row || typeof row !== 'object') return;
  const kinds = kind === 'both' ? ['thumb', 'poster'] : [kind];
  for (const k of kinds) {
    if (row[k] && typeof row[k] === 'object') {
      row[k] = { ok: false, at: Date.now(), reason: 'deleted' };
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const mode = String(args.mode || 'prefix').trim();
  const prefix = String(args.prefix || '').trim();
  const kindRaw = String(args.kind || 'both').trim().toLowerCase();
  const kind = kindRaw === 'thumb' || kindRaw === 'poster' ? kindRaw : 'both';
  const dryRun = parseBool(args.dry_run, true);
  const limit = Math.max(0, Number(args.limit || 0) || 0);

  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) {
    throw new Error('Missing R2 credentials env (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)');
  }

  const stateRel = String(args.state_file || 'public/data/r2_upload_state.json');
  const statePath = path.isAbsolute(stateRel) ? stateRel : path.join(ROOT, stateRel);
  const state = loadState(statePath);

  let keysToDelete = [];

  if (mode === 'prefix') {
    if (!prefix) throw new Error('mode=prefix requires --prefix, e.g. thumbs/ or posters/');
    keysToDelete = await listAllKeysByPrefix(client, bucket, prefix, limit);
  } else if (mode === 'keys') {
    const keys = parseList(args.keys);
    keysToDelete = limit ? keys.slice(0, limit) : keys;
  } else if (mode === 'movie_ids') {
    const ids = parseList(args.movie_ids);
    const out = [];
    for (const id of ids) {
      const row = state.uploaded && state.uploaded[id] ? state.uploaded[id] : null;
      if (!row) continue;
      const addKey = (k) => {
        const v = row && row[k] && row[k].ok && row[k].key ? String(row[k].key) : '';
        if (v) out.push(v);
      };
      if (kind === 'both') {
        addKey('thumb');
        addKey('poster');
      } else {
        addKey(kind);
      }
    }
    keysToDelete = Array.from(new Set(out));
    if (limit) keysToDelete = keysToDelete.slice(0, limit);
  } else {
    throw new Error('Invalid mode. Use prefix | keys | movie_ids');
  }

  console.log('R2 delete mode=', mode, 'kind=', kind, 'dry_run=', dryRun, 'limit=', limit || 'no');
  console.log('Keys matched:', keysToDelete.length);
  if (keysToDelete.length) {
    console.log('Sample:', keysToDelete.slice(0, 10));
  }

  const { deleted, errors } = await deleteKeys(client, bucket, keysToDelete, { dryRun });

  if (dryRun) {
    console.log('Dry run: no objects were deleted.');
    return;
  }

  if (mode === 'movie_ids') {
    const ids = parseList(args.movie_ids);
    for (const id of ids) markDeletedInState(state, id, kind);
    fs.ensureDirSync(path.dirname(statePath));
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    console.log('State updated:', statePath);
  }

  console.log('Deleted objects:', deleted, 'errors:', errors);
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
