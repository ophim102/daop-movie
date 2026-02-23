// Sync phim hiện có (OPhim + custom đã build) sang Google Sheets (chỉ append phim chưa có trong sheet)
// Sử dụng cấu trúc sheet movies/episodes hiện tại, không ghi đè dòng đã tồn tại.

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC_DATA = path.join(ROOT, 'public', 'data');

function parseWindowArray(jsContent, globalName) {
  const prefix = `window.${globalName}`;
  let s = jsContent.trim();
  if (!s.startsWith(prefix)) {
    throw new Error(`Không tìm thấy prefix ${prefix} trong file.`);
  }
  s = s.replace(new RegExp(`^${prefix}\\s*=\\s*`), '');
  s = s.replace(/;\s*$/, '');
  return JSON.parse(s);
}

async function loadLocalMovies() {
  const moviesLightPath = path.join(PUBLIC_DATA, 'movies-light.js');
  if (!(await fs.pathExists(moviesLightPath))) {
    throw new Error('Không tìm thấy public/data/movies-light.js. Hãy chạy build trước.');
  }
  const mlRaw = await fs.readFile(moviesLightPath, 'utf8');
  const light = parseWindowArray(mlRaw, 'moviesLight');

  const batchesDir = path.join(PUBLIC_DATA, 'batches');
  const moviesById = new Map();
  if (await fs.pathExists(batchesDir)) {
    const files = (await fs.readdir(batchesDir)).filter((f) => f.startsWith('batch_') && f.endsWith('.js'));
    for (const file of files) {
      const raw = await fs.readFile(path.join(batchesDir, file), 'utf8');
      try {
        const batch = parseWindowArray(raw, 'moviesBatch');
        for (const m of batch || []) {
          const idStr = String(m.id);
          moviesById.set(idStr, m);
        }
      } catch (e) {
        console.warn('   Không parse được batch', file, ':', e.message);
      }
    }
  }

  const fullMovies = light.map((m) => {
    const idStr = String(m.id);
    const full = moviesById.get(idStr);
    return full || { ...m, episodes: [] };
  });

  return fullMovies;
}

function buildMovieRow(movie, headers, nextId) {
  const row = new Array(headers.length).fill('');
  const headerIndex = (name) => {
    const lower = name.toLowerCase();
    let idx = headers.findIndex((h) => h === lower);
    if (idx >= 0) return idx;
    idx = headers.findIndex((h) => h === lower.replace('_', ' '));
    return idx;
  };

  const idStr = String(nextId);
  const setIfExists = (name, val) => {
    const idx = headerIndex(name);
    if (idx >= 0 && val != null) row[idx] = String(val);
  };

  setIfExists('id', idStr);
  setIfExists('slug', movie.slug || '');
  setIfExists('title', movie.title || '');
  setIfExists('name', movie.title || '');
  setIfExists('origin_name', movie.origin_name || '');
  setIfExists('type', movie.type || '');
  setIfExists('year', movie.year || '');
  const genreNames = (movie.genre || []).map((g) => g.name || g.slug || '').filter(Boolean);
  setIfExists('genre', genreNames.join(', '));
  const countryNames = (movie.country || []).map((c) => c.name || c.slug || '').filter(Boolean);
  setIfExists('country', countryNames.join(', '));
  setIfExists('language', movie.lang_key || movie.language || '');
  setIfExists('episode_current', movie.episode_current || '');
  setIfExists('quality', movie.quality || '');
  setIfExists('thumb_url', movie.thumb || '');
  setIfExists('thumb', movie.thumb || '');
  setIfExists('poster_url', movie.poster || movie.thumb || '');
  setIfExists('poster', movie.poster || movie.thumb || '');
  const desc = movie.description || movie.content || '';
  setIfExists('description', desc);
  setIfExists('content', desc);
  setIfExists('status', movie.status || '');
  setIfExists('showtimes', movie.showtimes || '');
  const tmdbId = movie.tmdb?.id || movie.tmdb_id;
  if (tmdbId) setIfExists('tmdb_id', tmdbId);
  if (Array.isArray(movie.director) && movie.director.length) {
    setIfExists('director', movie.director.join(', '));
  }
  if (Array.isArray(movie.cast) && movie.cast.length) {
    setIfExists('cast', movie.cast.join(', '));
  }
  if (Array.isArray(movie.keywords) && movie.keywords.length) {
    setIfExists('tags', movie.keywords.join(', '));
  }
  if (movie.is_exclusive) {
    setIfExists('is_exclusive', '1');
  }

  return row;
}

function buildEpisodeRows(movieIdInSheet, movie, epHeaders) {
  const rows = [];
  if (!Array.isArray(movie.episodes) || movie.episodes.length === 0) return rows;

  const headerIndex = (name) => {
    const lower = name.toLowerCase();
    let idx = epHeaders.findIndex((h) => h === lower);
    if (idx >= 0) return idx;
    idx = epHeaders.findIndex((h) => h === lower.replace('_', ' '));
    return idx;
  };

  const movieIdColName = headerIndex('movie_id') >= 0 ? 'movie_id' : epHeaders.find((h) => h.includes('movie')) || 'movie_id';
  const idxMovieId = headerIndex(movieIdColName) >= 0 ? headerIndex(movieIdColName) : 0;
  const idxName = headerIndex('name') >= 0 ? headerIndex('name') : 1;
  const idxSources = headerIndex('sources') >= 0 ? headerIndex('sources') : headerIndex('source');

  for (const ep of movie.episodes) {
    const row = new Array(epHeaders.length).fill('');
    row[idxMovieId] = String(movieIdInSheet);
    row[idxName] = ep.name || ep.slug || '';
    if (idxSources >= 0) {
      const src = Array.isArray(ep.server_data) ? ep.server_data : [];
      row[idxSources] = JSON.stringify(src);
    }
    rows.push(row);
  }

  return rows;
}

async function main() {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!sheetId || !keyPath) {
    throw new Error('Cần GOOGLE_SHEETS_ID và GOOGLE_SERVICE_ACCOUNT_KEY trong env để ghi Google Sheets.');
  }
  if (!(await fs.pathExists(keyPath))) {
    throw new Error(`Không tìm thấy file service account: ${keyPath}`);
  }

  console.log('1. Đọc dữ liệu phim hiện có từ build (movies-light + batches)...');
  const movies = await loadLocalMovies();
  console.log('   Tổng số phim local:', movies.length);

  console.log('2. Kết nối Google Sheets và đọc sheet movies/episodes hiện tại...');
  const key = await fs.readJson(keyPath);
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: ['movies!A1:Z1000', 'episodes!A1:Z2000'],
  });
  const valueRanges = res.data.valueRanges || [];
  const moviesRows = valueRanges[0]?.values || [];
  const episodesRows = valueRanges[1]?.values || [];

  if (moviesRows.length === 0) {
    throw new Error('Sheet movies chưa có header (dòng 1). Hãy import template trước.');
  }

  const movieHeaders = moviesRows[0].map((h) => (h || '').toString().toLowerCase().trim());
  const existingMovieRows = moviesRows.slice(1);
  const epHeaders = episodesRows[0]?.map((h) => (h || '').toString().toLowerCase().trim()) || ['movie_id', 'name', 'sources'];

  const idxMovieId = movieHeaders.indexOf('id');
  const idxSlug = movieHeaders.indexOf('slug');
  const existingSlugs = new Set();
  let maxNumericId = 0;

  for (const row of existingMovieRows) {
    const idVal = idxMovieId >= 0 ? row[idxMovieId] : '';
    const slugVal = idxSlug >= 0 ? row[idxSlug] : '';
    if (slugVal) existingSlugs.add(String(slugVal).trim());
    const n = Number(idVal);
    if (!Number.isNaN(n) && n > maxNumericId) maxNumericId = n;
  }

  console.log('   Số dòng movies hiện có trong sheet:', existingMovieRows.length, ', max id =', maxNumericId);

  const moviesToAppend = [];
  const episodesToAppend = [];
  const sheetIdByLocalId = new Map();

  for (const m of movies) {
    const slug = (m.slug || '').toString().trim();
    if (!slug) continue;
    if (existingSlugs.has(slug)) continue;
    maxNumericId += 1;
    const row = buildMovieRow(m, movieHeaders, maxNumericId);
    moviesToAppend.push(row);
    sheetIdByLocalId.set(String(m.id), maxNumericId);
    const epRows = buildEpisodeRows(maxNumericId, m, epHeaders);
    episodesToAppend.push(...epRows);
  }

  if (!moviesToAppend.length) {
    console.log('3. Không có phim mới để append vào sheet (dựa trên slug). Kết thúc.');
    return;
  }

  console.log('3. Append', moviesToAppend.length, 'phim mới vào sheet movies và', episodesToAppend.length, 'tập vào sheet episodes...');

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'movies!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: moviesToAppend },
  });

  if (episodesToAppend.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'episodes!A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: episodesToAppend },
    });
  }

  console.log('   Hoàn tất export-to-sheets.');
}

main().catch((e) => {
  console.error('Export to sheets failed:', e?.message || e);
  process.exit(1);
});

