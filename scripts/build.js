/**
 * Build script: OPhim + Google Sheets + TMDB → static files + Supabase Admin config → JSON
 * Chạy: node scripts/build.js [--incremental]
 */
import 'dotenv/config';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import sharp from 'sharp';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import slugify from 'slugify';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC_DATA = path.join(ROOT, 'public', 'data');
const BATCH_SIZE = 100;
const OPHIM_DELAY_MS = 200;

const OPHIM_BASE = process.env.OPHIM_BASE_URL || 'https://ophim1.com/v1/api';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch JSON from URL */
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

const OPHIM_FETCH_TIMEOUT_MS = Number(process.env.OPHIM_FETCH_TIMEOUT_MS) || 25000;

/** Fetch JSON with timeout (tránh treo khi API chậm/không phản hồi) */
async function fetchJsonWithTimeout(url, timeoutMs = OPHIM_FETCH_TIMEOUT_MS) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

/** R2 client (S3 compatible) */
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

/** Upload buffer to R2, return public URL */
async function uploadToR2(buffer, key, contentType = 'image/webp') {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) return null;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  return base ? `${base}/${key}` : null;
}

/** Download image, convert to WebP, optional upload R2 */
async function processImage(url, slug, folder = 'thumbs') {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const buf = Buffer.from(await res.arrayBuffer());
    const webp = await sharp(buf).webp({ quality: 80 }).toBuffer();
    const key = `${folder}/${slug}.webp`;
    const r2Url = await uploadToR2(webp, key);
    return r2Url || url;
  } catch {
    return url;
  }
}

/** Giới hạn OPhim: số trang tối đa (0 = không giới hạn), số phim tối đa (0 = không giới hạn). Đặt env để tránh build quá lâu (vd: OPHIM_MAX_PAGES=5, OPHIM_MAX_MOVIES=500). */
const OPHIM_MAX_PAGES = Number(process.env.OPHIM_MAX_PAGES) || 0;
const OPHIM_MAX_MOVIES = Number(process.env.OPHIM_MAX_MOVIES) || 0;

/** 1. Thu thập phim từ OPhim */
async function fetchOPhimMovies() {
  const list = [];
  let page = 1;
  while (true) {
    if (OPHIM_MAX_PAGES > 0 && page > OPHIM_MAX_PAGES) {
      console.log('   OPhim: đạt giới hạn số trang:', OPHIM_MAX_PAGES);
      break;
    }
    if (OPHIM_MAX_MOVIES > 0 && list.length >= OPHIM_MAX_MOVIES) {
      console.log('   OPhim: đạt giới hạn số phim:', OPHIM_MAX_MOVIES);
      break;
    }
    const url = `${OPHIM_BASE}/danh-sach/phim-moi?page=${page}&limit=100`;
    let data;
    try {
      data = await fetchJsonWithTimeout(url);
    } catch (e) {
      console.warn('OPhim list page', page, 'failed:', e.message);
      break;
    }
    const items = data?.data?.items || [];
    if (items.length === 0) break;
    console.log('   OPhim page', page, 'items:', items.length, 'total:', list.length);
    for (const item of items) {
      if (OPHIM_MAX_MOVIES > 0 && list.length >= OPHIM_MAX_MOVIES) break;
      const slug = item?.slug;
      if (!slug) continue;
      await sleep(OPHIM_DELAY_MS);
      try {
        const detail = await fetchJsonWithTimeout(`${OPHIM_BASE}/phim/${slug}`);
        const movie = detail?.data?.movie || detail?.data;
        if (!movie) continue;
        const m = normalizeOPhimMovie(movie, slug);
        list.push(m);
      } catch (e) {
        console.warn('OPhim detail skip:', slug, e.message);
      }
    }
    page++;
  }
  return list;
}

function normalizeOPhimMovie(m, slug) {
  const id = m._id || m.id || `ophim_${slug}`;
  const quality = (m.quality || '').toLowerCase();
  const is4k = /4k|uhd|2160p/.test(quality);
  return {
    id,
    _id: id,
    title: m.name || m.title || '',
    origin_name: m.origin_name || m.original_title || '',
    slug: m.slug || slug,
    thumb: m.thumb_url || m.poster_url || m.thumb || '',
    poster: m.poster_url || m.poster || m.thumb || '',
    year: m.year || '',
    type: m.type || 'single',
    genre: m.category?.map((c) => ({ id: c.id, name: c.name, slug: c.slug || slugify(c.name, { lower: true }) })) || [],
    country: m.country?.map((c) => ({ id: c.id, name: c.name, slug: c.slug || slugify(c.name, { lower: true }) })) || [],
    lang_key: m.lang || '',
    episode_current: m.episode_current || m.episodes?.length || '1',
    quality: m.quality || '',
    modified: m.modified || m.updated_at || new Date().toISOString(),
    is_4k: is4k,
    is_exclusive: false,
    status: '',
    showtimes: '',
    chieurap: m.chieurap || false,
    sub_docquyen: m.sub_docquyen || false,
    episodes: m.episodes || [],
    time: m.time,
    description: m.content || m.description || '',
    tmdb: m.tmdb || null,
  };
}

/** 2. Đọc Google Sheets (hoặc Excel fallback) */
async function fetchCustomMovies() {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (sheetId && keyPath && (await fs.pathExists(keyPath))) {
    try {
      const { google } = await import('googleapis');
      const key = await fs.readJson(keyPath);
      const auth = new google.auth.GoogleAuth({
        credentials: key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const res = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: ['movies!A1:Z1000', 'episodes!A1:Z2000'],
      });
      const valueRanges = res.data.valueRanges || [];
      const moviesRows = valueRanges[0]?.values || [];
      const episodesRows = valueRanges[1]?.values || [];
      return parseSheetMovies(moviesRows, episodesRows);
    } catch (e) {
      console.warn('Google Sheets failed, fallback to Excel:', e.message);
    }
  }
  const xlsxPath = path.join(ROOT, 'custom_movies.xlsx');
  if (await fs.pathExists(xlsxPath)) {
    const wb = XLSX.readFile(xlsxPath);
    const moviesSheet = wb.Sheets['movies'] || wb.Sheets[wb.SheetNames[0]];
    const episodesSheet = wb.Sheets['episodes'];
    const moviesRows = XLSX.utils.sheet_to_json(moviesSheet, { header: 1 });
    const episodesRows = episodesSheet ? XLSX.utils.sheet_to_json(episodesSheet, { header: 1 }) : [];
    return parseSheetMovies(moviesRows, episodesRows);
  }
  return [];
}

function parseSheetMovies(moviesRows, episodesRows) {
  if (moviesRows.length < 2) return [];
  const headers = moviesRows[0].map((h) => (h || '').toString().toLowerCase().trim());
  const idx = (name) => {
    const i = headers.indexOf(name);
    return i >= 0 ? i : headers.indexOf(name.replace('_', ' '));
  };
  const movies = [];
  for (let i = 1; i < moviesRows.length; i++) {
    const row = moviesRows[i];
    const title = row[idx('title')] || row[idx('name')] || '';
    if (!title) continue;
    const extId = `ext_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 9)}`;
    const slug = slugify((row[idx('title')] || '').toString(), { lower: true }) || extId;
    const genre = (row[idx('genre')] || '')
      .toString()
      .split(',')
      .map((g) => ({ name: g.trim(), slug: slugify(g.trim(), { lower: true }) }));
    const country = (row[idx('country')] || '')
      .toString()
      .split(',')
      .map((c) => ({ name: c.trim(), slug: slugify(c.trim(), { lower: true }) }));
    const quality = (row[idx('quality')] || '').toString();
    const is4k = /4k|uhd|2160p/i.test(quality);
    const movie = {
      id: extId,
      title: title.toString(),
      origin_name: (row[idx('origin_name')] || '').toString(),
      slug,
      thumb: (row[idx('thumb_url')] || row[idx('thumb')] || '').toString(),
      poster: (row[idx('poster_url')] || row[idx('poster')] || '').toString(),
      year: (row[idx('year')] || '').toString(),
      type: (row[idx('type')] || 'single').toString(),
      genre,
      country,
      lang_key: (row[idx('language')] || '').toString(),
      episode_current: (row[idx('episode_current')] || '1').toString(),
      quality,
      modified: new Date().toISOString(),
      is_4k: is4k,
      is_exclusive: Boolean(row[idx('is_exclusive')]),
      status: (row[idx('status')] || '').toString(),
      showtimes: (row[idx('showtimes')] || '').toString(),
      chieurap: false,
      sub_docquyen: false,
      episodes: [],
      description: (row[idx('description')] || row[idx('content')] || '').toString(),
      tmdb_id: row[idx('tmdb_id')] ? Number(row[idx('tmdb_id')]) : null,
      cast: [],
      director: [],
      keywords: [],
    };
    movies.push(movie);
  }
  const epHeaders = episodesRows[0]?.map((h) => (h || '').toString().toLowerCase().trim()) || [];
  const epIdx = (name) => epHeaders.indexOf(name);
  const movieIdCol = epIdx('movie_id') >= 0 ? 'movie_id' : epHeaders.find((h) => h.includes('movie'));
  const movieBySlug = Object.fromEntries(movies.map((m) => [m.slug, m]));
  for (let i = 1; i < episodesRows.length; i++) {
    const row = episodesRows[i];
    const mid = row[epHeaders.indexOf(movieIdCol)]?.toString() || row[0]?.toString();
    const slug = movies.find((m) => m.id === mid || m.slug === mid)?.slug;
    const movie = slug ? movieBySlug[slug] : null;
    if (!movie) continue;
    const name = (epIdx('name') >= 0 ? row[epIdx('name')] : row[1]) || `Tap ${i}`;
    let sources = [];
    const srcStr = row[epIdx('sources')] ?? row[epIdx('source')];
    if (srcStr) {
      try {
        sources = typeof srcStr === 'string' ? JSON.parse(srcStr) : srcStr;
      } catch {}
    }
    movie.episodes.push({ name, slug: slugify(name, { lower: true }), server_data: sources });
  }
  return movies;
}

/** 3. Làm giàu TMDB (credits, keywords) */
async function enrichTmdb(movies) {
  if (!TMDB_KEY) return;
  for (const m of movies) {
    const tid = m.tmdb?.id || m.tmdb_id;
    if (!tid) continue;
    const type = (m.type || 'movie') === 'single' ? 'movie' : 'tv';
    await sleep(150);
    try {
      const [creditsRes, keywordsRes] = await Promise.all([
        fetchJson(`${TMDB_BASE}/${type}/${tid}/credits?api_key=${TMDB_KEY}`),
        fetchJson(`${TMDB_BASE}/${type}/${tid}/keywords?api_key=${TMDB_KEY}`).catch(() => ({ keywords: [] })),
      ]);
      const cast = (creditsRes.cast || []).slice(0, 15).map((c) => c.name);
      const director = (creditsRes.crew || []).filter((c) => c.job === 'Director').map((c) => c.name);
      const keywords = (keywordsRes.keywords || []).map((k) => k.name);
      m.cast = m.cast?.length ? m.cast : cast;
      m.director = m.director?.length ? m.director : director;
      m.keywords = m.keywords?.length ? m.keywords : keywords;
    } catch {}
  }
}

/** 4. Hợp nhất và xử lý ảnh (optional: upload R2) */
function mergeMovies(ophim, custom) {
  const bySlug = new Map();
  for (const m of ophim) bySlug.set(m.slug, m);
  for (const m of custom) {
    if (!bySlug.has(m.slug)) bySlug.set(m.slug, m);
  }
  return Array.from(bySlug.values());
}

/** 5. Tạo movies-light.js (cùng thứ tự sắp xếp theo id như batch để getBatchPath tính đúng) */
function writeMoviesLight(movies) {
  const sorted = [...movies].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const light = sorted.map((m) => ({
    id: m.id,
    title: m.title,
    origin_name: m.origin_name || '',
    slug: m.slug,
    thumb: m.thumb,
    poster: m.poster,
    year: m.year,
    type: m.type,
    genre: m.genre,
    country: m.country,
    lang_key: m.lang_key,
    episode_current: m.episode_current,
    quality: m.quality,
    status: m.status || '',
    showtimes: m.showtimes || '',
    is_4k: m.is_4k,
    is_exclusive: m.is_exclusive || false,
    chieurap: m.chieurap,
    sub_docquyen: m.sub_docquyen,
    modified: m.modified,
  }));
  const content = `window.moviesLight = ${JSON.stringify(light)};`;
  fs.writeFileSync(path.join(PUBLIC_DATA, 'movies-light.js'), content, 'utf8');
}

/** 6. Tạo filters.js */
function writeFilters(movies) {
  const genreMap = {};
  const countryMap = {};
  const yearMap = {};
  const typeMap = {};
  const statusMap = {};
  const quality4kIds = [];
  const exclusiveIds = [];
  for (const m of movies) {
    if (m.is_4k) quality4kIds.push(m.id);
    if (m.is_exclusive) exclusiveIds.push(m.id);
    if (m.type) {
      if (!typeMap[m.type]) typeMap[m.type] = [];
      typeMap[m.type].push(m.id);
    }
    if (m.status) {
      if (!statusMap[m.status]) statusMap[m.status] = [];
      statusMap[m.status].push(m.id);
    }
    const y = (m.year || '').toString();
    if (y) {
      if (!yearMap[y]) yearMap[y] = [];
      yearMap[y].push(m.id);
    }
    for (const g of m.genre || []) {
      const s = g.slug || slugify(g.name, { lower: true });
      if (!genreMap[s]) genreMap[s] = [];
      genreMap[s].push(m.id);
    }
    for (const c of m.country || []) {
      const s = c.slug || slugify(c.name, { lower: true });
      if (!countryMap[s]) countryMap[s] = [];
      countryMap[s].push(m.id);
    }
  }
  const content = `window.filtersData = ${JSON.stringify({
    genreMap,
    countryMap,
    yearMap,
    typeMap,
    statusMap,
    quality4kIds,
    exclusiveIds,
  })};`;
  fs.writeFileSync(path.join(PUBLIC_DATA, 'filters.js'), content, 'utf8');
}

/** 7. Tạo actors.js */
function writeActors(movies) {
  const map = {};
  const names = {};
  for (const m of movies) {
    for (const name of m.cast || []) {
      const s = slugify(name, { lower: true });
      if (!s) continue;
      if (!map[s]) map[s] = [];
      map[s].push(m.id);
      names[s] = name;
    }
  }
  const content = `window.actorsData = ${JSON.stringify({ map, names })};`;
  fs.writeFileSync(path.join(PUBLIC_DATA, 'actors.js'), content, 'utf8');
}

/** 8. Tạo batch files */
function writeBatches(movies) {
  const sorted = [...movies].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const batchDir = path.join(PUBLIC_DATA, 'batches');
  fs.ensureDirSync(batchDir);
  for (let start = 0; start < sorted.length; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, sorted.length);
    const batch = sorted.slice(start, end);
    const content = `window.moviesBatch = ${JSON.stringify(batch)};`;
    fs.writeFileSync(path.join(batchDir, `batch_${start}_${end}.js`), content, 'utf8');
  }
}

/** 9. Đọc Supabase Admin và xuất config JSON */
async function exportConfigFromSupabase() {
  const url = process.env.SUPABASE_ADMIN_URL;
  const key = process.env.SUPABASE_ADMIN_SERVICE_ROLE_KEY;
  if (!url || !key) {
    await writeDefaultConfig();
    return;
  }
  const supabase = createClient(url, key);
  const configDir = path.join(PUBLIC_DATA, 'config');
  fs.ensureDirSync(configDir);

  const today = new Date().toISOString().slice(0, 10);
  const [sources, bannersRes, sections, settings, staticPages, donate] = await Promise.all([
    supabase.from('server_sources').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('ad_banners').select('*').eq('is_active', true),
    supabase.from('homepage_sections').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('site_settings').select('key, value'),
    supabase.from('static_pages').select('*'),
    supabase.from('donate_settings').select('*').limit(1).single(),
  ]);

  const banners = (bannersRes.data || []).filter((b) => {
    if (b.start_date && b.start_date > today) return false;
    if (b.end_date && b.end_date < today) return false;
    return true;
  });
  const defaultSections = [{ title: 'Phim mới', source_type: 'type', source_value: 'series', limit_count: 24, sort_order: 0 }];
  fs.writeFileSync(path.join(configDir, 'server-sources.json'), JSON.stringify(sources.data || [], null, 2));
  fs.writeFileSync(path.join(configDir, 'banners.json'), JSON.stringify(banners, null, 2));
  fs.writeFileSync(path.join(configDir, 'homepage-sections.json'), JSON.stringify((sections.data && sections.data.length) ? sections.data : defaultSections, null, 2));
  const settingsObj = Object.fromEntries((settings.data || []).map((r) => [r.key, r.value]));
  const defaultSettings = {
    site_name: 'DAOP Phim',
    google_analytics_id: '',
    simple_analytics_script: '',
    twikoo_env_id: '',
    supabase_user_url: '',
    supabase_user_anon_key: '',
    player_warning_enabled: 'true',
    player_warning_text: 'Cảnh báo: Phim chứa hình ảnh đường lưỡi bò phi pháp xâm phạm chủ quyền biển đảo Việt Nam.',
  };
  const mergedSettings = { ...defaultSettings, ...settingsObj };
  fs.writeFileSync(path.join(configDir, 'site-settings.json'), JSON.stringify(mergedSettings, null, 2));
  fs.writeFileSync(path.join(configDir, 'static-pages.json'), JSON.stringify(staticPages.data || [], null, 2));
  fs.writeFileSync(path.join(configDir, 'donate.json'), JSON.stringify(donate.data || {}, null, 2));
}

async function writeDefaultConfig() {
  const configDir = path.join(PUBLIC_DATA, 'config');
  fs.ensureDirSync(configDir);
  const defaults = {
    'server-sources.json': [],
    'banners.json': [],
    'homepage-sections.json': [{ title: 'Phim mới', source_type: 'type', source_value: 'series', limit_count: 24, sort_order: 0 }],
    'site-settings.json': {
      site_name: 'DAOP Phim',
      google_analytics_id: '',
      simple_analytics_script: '',
      twikoo_env_id: '',
      supabase_user_url: '',
      supabase_user_anon_key: '',
      player_warning_enabled: 'true',
      player_warning_text: 'Cảnh báo: Phim chứa hình ảnh đường lưỡi bò phi pháp xâm phạm chủ quyền biển đảo Việt Nam.',
    },
    'static-pages.json': [],
    'donate.json': { target_amount: 0, target_currency: 'VND', current_amount: 0 },
  };
  for (const [file, data] of Object.entries(defaults)) {
    fs.writeFileSync(path.join(configDir, file), JSON.stringify(data, null, 2));
  }
}

/** 10. Sitemap & robots */
function writeSitemap(movies) {
  const base = process.env.SITE_URL || 'https://yourdomain.com';
  let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const pages = ['', '/phim-bo', '/phim-le', '/tim-kiem', '/gioi-thieu', '/donate'];
  for (const p of pages) xml += `<url><loc>${base}${p || '/'}</loc><changefreq>daily</changefreq></url>`;
  for (const m of movies) xml += `<url><loc>${base}/phim/${m.slug}.html</loc><changefreq>weekly</changefreq></url>`;
  xml += '</urlset>';
  fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), xml);
}

function writeRobots() {
  const base = process.env.SITE_URL || 'https://yourdomain.com';
  const content = `User-agent: *
Allow: /
Sitemap: ${base}/sitemap.xml
`;
  fs.writeFileSync(path.join(ROOT, 'public', 'robots.txt'), content);
}

/** Main */
async function main() {
  const incremental = process.argv.includes('--incremental');
  console.log('Build started (incremental:', incremental, ')');
  await fs.ensureDir(PUBLIC_DATA);
  await fs.ensureDir(path.join(PUBLIC_DATA, 'config'));
  await fs.ensureDir(path.join(PUBLIC_DATA, 'batches'));

  console.log('1. Fetching OPhim...');
  const ophim = await fetchOPhimMovies();
  console.log('   OPhim count:', ophim.length);

  console.log('2. Fetching custom (Sheets/Excel)...');
  const custom = await fetchCustomMovies();
  console.log('   Custom count:', custom.length);

  console.log('3. Enriching TMDB...');
  await enrichTmdb(ophim);
  await enrichTmdb(custom);

  const allMovies = mergeMovies(ophim, custom);
  console.log('4. Total movies:', allMovies.length);

  console.log('5. Writing movies-light.js, filters.js, actors.js, batches...');
  writeMoviesLight(allMovies);
  writeFilters(allMovies);
  writeActors(allMovies);
  writeBatches(allMovies);

  console.log('6. Exporting config from Supabase Admin...');
  await exportConfigFromSupabase();

  console.log('7. Writing sitemap.xml & robots.txt...');
  writeSitemap(allMovies);
  writeRobots();

  const lastBuild = { builtAt: new Date().toISOString(), movieCount: allMovies.length };
  fs.writeFileSync(path.join(PUBLIC_DATA, 'last_build.json'), JSON.stringify(lastBuild, null, 2));
  const lastModified = {};
  for (const m of allMovies) lastModified[m.id] = m.modified || m.updated_at || '';
  fs.writeFileSync(path.join(PUBLIC_DATA, 'last_modified.json'), JSON.stringify(lastModified, null, 2));
  console.log('Build done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
