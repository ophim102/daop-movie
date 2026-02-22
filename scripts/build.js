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

/** Fallback: 23 thể loại + 45 quốc gia (OPhim) khi API lỗi/timeout */
const OPHIM_GENRES_FALLBACK = {
  'hanh-dong': 'Hành Động', 'tinh-cam': 'Tình Cảm', 'hai-huoc': 'Hài Hước', 'co-trang': 'Cổ Trang',
  'tam-ly': 'Tâm Lý', 'hinh-su': 'Hình Sự', 'chien-tranh': 'Chiến Tranh', 'the-thao': 'Thể Thao',
  'vo-thuat': 'Võ Thuật', 'vien-tuong': 'Viễn Tưởng', 'phieu-luu': 'Phiêu Lưu', 'khoa-hoc': 'Khoa Học',
  'kinh-di': 'Kinh Dị', 'am-nhac': 'Âm Nhạc', 'than-thoai': 'Thần Thoại', 'tai-lieu': 'Tài Liệu',
  'gia-dinh': 'Gia Đình', 'chinh-kich': 'Chính kịch', 'bi-an': 'Bí ẩn', 'hoc-duong': 'Học Đường',
  'kinh-dien': 'Kinh Điển', 'phim-18': 'Phim 18+', 'short-drama': 'Short Drama',
};
const OPHIM_COUNTRIES_FALLBACK = {
  'trung-quoc': 'Trung Quốc', 'han-quoc': 'Hàn Quốc', 'nhat-ban': 'Nhật Bản', 'thai-lan': 'Thái Lan',
  'au-my': 'Âu Mỹ', 'dai-loan': 'Đài Loan', 'hong-kong': 'Hồng Kông', 'an-do': 'Ấn Độ', 'anh': 'Anh',
  'phap': 'Pháp', 'canada': 'Canada', 'quoc-gia-khac': 'Quốc Gia Khác', 'duc': 'Đức',
  'tay-ban-nha': 'Tây Ban Nha', 'tho-nhi-ky': 'Thổ Nhĩ Kỳ', 'ha-lan': 'Hà Lan', 'indonesia': 'Indonesia',
  'nga': 'Nga', 'mexico': 'Mexico', 'ba-lan': 'Ba lan', 'uc': 'Úc', 'thuy-dien': 'Thụy Điển',
  'malaysia': 'Malaysia', 'brazil': 'Brazil', 'philippines': 'Philippines', 'bo-dao-nha': 'Bồ Đào Nha',
  'y': 'Ý', 'dan-mach': 'Đan Mạch', 'uae': 'UAE', 'na-uy': 'Na Uy', 'thuy-si': 'Thụy Sĩ',
  'chau-phi': 'Châu Phi', 'nam-phi': 'Nam Phi', 'ukraina': 'Ukraina', 'a-rap-xe-ut': 'Ả Rập Xê Út',
  'bi': 'Bỉ', 'ireland': 'Ireland', 'colombia': 'Colombia', 'phan-lan': 'Phần Lan', 'viet-nam': 'Việt Nam',
  'chile': 'Chile', 'hy-lap': 'Hy Lạp', 'nigeria': 'Nigeria', 'argentina': 'Argentina', 'singapore': 'Singapore',
};

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
        const movie = detail?.data?.item || detail?.data?.movie || detail?.data;
        if (!movie) continue;
        const cdnBase = (detail?.data?.APP_DOMAIN_CDN_IMAGE || '').replace(/\/$/, '') || 'https://img.ophim.live';
        const m = normalizeOPhimMovie(movie, slug, cdnBase);
        list.push(m);
      } catch (e) {
        console.warn('OPhim detail skip:', slug, e.message);
      }
    }
    page++;
  }
  return list;
}

function normalizeOPhimMovie(m, slug, cdnBase = 'https://img.ophim.live') {
  const rawId = m._id || m.id || `ophim_${slug}`;
  const id = String(rawId);
  const rawSlug = (m.slug || slug || '').toString().trim();
  const slugNorm = rawSlug ? rawSlug.toLowerCase() : '';
  const quality = (m.quality || '').toLowerCase();
  const is4k = /4k|uhd|2160p/.test(quality);
  const thumbRaw = m.thumb_url || m.poster_url || m.thumb || '';
  const posterRaw = m.poster_url || m.poster || m.thumb || '';
  const thumb = thumbRaw && !/^https?:\/\//i.test(thumbRaw)
    ? `${cdnBase}/uploads/movies/${thumbRaw.replace(/^\/+/, '')}`
    : thumbRaw;
  const poster = posterRaw && !/^https?:\/\//i.test(posterRaw)
    ? `${cdnBase}/uploads/movies/${posterRaw.replace(/^\/+/, '')}`
    : posterRaw;
  return {
    id,
    _id: id,
    title: m.name || m.title || '',
    origin_name: m.origin_name || m.original_title || '',
    slug: slugNorm || id,
    thumb,
    poster,
    year: m.year || '',
    type: m.type || 'single',
    genre: m.category?.map((c) => ({ id: c.id, name: c.name, slug: c.slug || slugify(c.name, { lower: true }) })) || [],
    country: m.country?.map((c) => ({ id: c.id, name: c.name, slug: c.slug || slugify(c.name, { lower: true }) })) || [],
    lang_key: m.lang || '',
    episode_current: m.episode_current || m.episodes?.length || '1',
    quality: m.quality || '',
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
    modified:
      (m.modified && typeof m.modified === 'object' && m.modified.time)
        ? m.modified.time
        : (m.modified || m.updated_at || new Date().toISOString()),
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
    const idValue = (row[idx('id')] ?? '').toString().trim();
    const movieId = idValue || extId;
    const slugFromSheet = (row[idx('slug')] ?? '').toString().trim();
    const baseSlug = slugFromSheet || slugify((row[idx('title')] || '').toString(), { lower: true }) || extId;
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
      id: movieId,
      title: title.toString(),
      origin_name: (row[idx('origin_name')] || '').toString(),
      slug: baseSlug,
      thumb: (row[idx('thumb_url')] || row[idx('thumb')] || '').toString(),
      poster: (row[idx('poster_url')] || row[idx('poster')] || row[idx('thumb_url')] || row[idx('thumb')] || '').toString(),
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
  // Đảm bảo slug không trùng (phim trùng tên → slug trùng): thêm hậu tố -2, -3...
  const usedSlugs = new Set();
  for (const m of movies) {
    let s = m.slug;
    let n = 1;
    while (usedSlugs.has(s)) {
      n++;
      s = m.slug + '-' + n;
    }
    m.slug = s;
    usedSlugs.add(s);
  }
  const epHeaders = episodesRows[0]?.map((h) => (h || '').toString().toLowerCase().trim()) || [];
  const epIdx = (name) => {
    const i = epHeaders.indexOf(name);
    return i >= 0 ? i : epHeaders.indexOf(name.replace('_', ' '));
  };
  const movieIdCol = epIdx('movie_id') >= 0 ? 'movie_id' : epHeaders.find((h) => h.includes('movie'));
  const movieBySlug = Object.fromEntries(movies.map((m) => [m.slug, m]));
  const movieByTitle = Object.fromEntries(movies.map((m) => [(m.title || '').toString().trim(), m]));
  for (let i = 1; i < episodesRows.length; i++) {
    const row = episodesRows[i];
    const mid = (row[epHeaders.indexOf(movieIdCol)] ?? row[0])?.toString()?.trim() || '';
    const movie = movies.find((m) => String(m.id) === String(mid) || m.slug === mid) || movieByTitle[mid] || (mid && movieBySlug[slugify(mid, { lower: true })]);
    const slug = movie?.slug;
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

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';

/** 3. Làm giàu TMDB (credits, keywords, poster khi thiếu) */
async function enrichTmdb(movies) {
  if (!TMDB_KEY) return;
  for (const m of movies) {
    const tid = m.tmdb?.id || m.tmdb_id;
    if (!tid) continue;
    const type = (m.type || 'movie') === 'single' ? 'movie' : 'tv';
    await sleep(150);
    try {
      const [detailRes, creditsRes, keywordsRes] = await Promise.all([
        fetchJson(`${TMDB_BASE}/${type}/${tid}?api_key=${TMDB_KEY}`).catch(() => null),
        fetchJson(`${TMDB_BASE}/${type}/${tid}/credits?api_key=${TMDB_KEY}`),
        fetchJson(`${TMDB_BASE}/${type}/${tid}/keywords?api_key=${TMDB_KEY}`).catch(() => ({ keywords: [] })),
      ]);
      const cast = (creditsRes.cast || []).slice(0, 15).map((c) => c.name);
      const director = (creditsRes.crew || []).filter((c) => c.job === 'Director').map((c) => c.name);
      const keywords = (keywordsRes.keywords || []).map((k) => k.name);
      m.cast = m.cast?.length ? m.cast : cast;
      m.director = m.director?.length ? m.director : director;
      m.keywords = m.keywords?.length ? m.keywords : keywords;
      if (!m.poster && detailRes?.poster_path) {
        m.poster = TMDB_IMG_BASE + detailRes.poster_path;
      }
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
  const merged = Array.from(bySlug.values());
  for (const m of merged) {
    if (!m.poster && m.thumb) m.poster = m.thumb;
  }
  return merged;
}

/** 5. Tạo movies-light.js (cùng thứ tự sắp xếp theo id như batch để getBatchPath tính đúng) */
function writeMoviesLight(movies) {
  const sorted = [...movies].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const light = sorted.map((m) => ({
    id: String(m.id),
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

/** 5b. Lấy danh sách thể loại (23) + quốc gia (45) từ OPhim API, fallback danh sách tĩnh nếu API lỗi */
async function fetchOPhimGenresAndCountries() {
  const base = process.env.OPHIM_BASE_URL || 'https://ophim1.com/v1/api';
  let genreNames = { ...OPHIM_GENRES_FALLBACK };
  let countryNames = { ...OPHIM_COUNTRIES_FALLBACK };
  try {
    const [genresRes, countriesRes] = await Promise.all([
      fetchJsonWithTimeout(`${base}/the-loai`).catch(() => null),
      fetchJsonWithTimeout(`${base}/quoc-gia`).catch(() => null),
    ]);
    const genres = genresRes?.data?.items || [];
    const countries = countriesRes?.data?.items || [];
    if (genres.length) {
      genreNames = {};
      for (const g of genres) {
        if (g.slug && g.name) genreNames[g.slug] = g.name;
      }
      genreNames = { ...OPHIM_GENRES_FALLBACK, ...genreNames };
    }
    if (countries.length) {
      countryNames = {};
      for (const c of countries) {
        if (c.slug && c.name) countryNames[c.slug] = c.name;
      }
      countryNames = { ...OPHIM_COUNTRIES_FALLBACK, ...countryNames };
    }
    console.log('   OPhim genres:', Object.keys(genreNames).length, ', countries:', Object.keys(countryNames).length);
  } catch (e) {
    console.warn('   OPhim genres/countries fetch failed, using fallback:', e.message);
  }
  return { genreNames, countryNames };
}

/** 6. Tạo filters.js */
function writeFilters(movies, genreNames = {}, countryNames = {}) {
  const genreMap = {};
  const countryMap = {};
  const yearMap = {};
  const typeMap = {};
  const statusMap = {};
  const quality4kIds = [];
  const exclusiveIds = [];
  const yearsSet = new Set();
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
      yearsSet.add(y);
      if (!yearMap[y]) yearMap[y] = [];
      yearMap[y].push(m.id);
    }
    for (const g of m.genre || []) {
      const s = g.slug || slugify(g.name, { lower: true });
      if (!genreMap[s]) genreMap[s] = [];
      genreMap[s].push(m.id);
      if (g.name && !genreNames[s]) genreNames[s] = g.name;
    }
    for (const c of m.country || []) {
      const s = c.slug || slugify(c.name, { lower: true });
      if (!countryMap[s]) countryMap[s] = [];
      countryMap[s].push(m.id);
      if (c.name && !countryNames[s]) countryNames[s] = c.name;
    }
  }
  const yearsArr = Array.from(yearsSet).map(Number).filter((y) => !Number.isNaN(y));
  const minYear = yearsArr.length ? Math.min(...yearsArr) : new Date().getFullYear();
  const maxYear = new Date().getFullYear();
  for (let y = minYear; y <= maxYear; y++) {
    const ys = String(y);
    if (!yearMap[ys]) yearMap[ys] = [];
  }
  const configDir = path.join(PUBLIC_DATA, 'config');
  const filterOrderPath = path.join(configDir, 'filter-order.json');
  let filterOrder = {
    rowOrder: ['year', 'genre', 'country', 'videoType', 'lang'],
    genreOrder: [],
    countryOrder: [],
    videoTypeOrder: ['tvshows', 'hoathinh', '4k', 'exclusive'],
    langOrder: ['vietsub', 'thuyetminh', 'longtieng', 'khac'],
  };
  if (fs.existsSync(filterOrderPath)) {
    try {
      const fo = JSON.parse(fs.readFileSync(filterOrderPath, 'utf8'));
      if (fo.rowOrder && Array.isArray(fo.rowOrder)) filterOrder.rowOrder = fo.rowOrder;
      if (fo.genreOrder && Array.isArray(fo.genreOrder)) filterOrder.genreOrder = fo.genreOrder;
      if (fo.countryOrder && Array.isArray(fo.countryOrder)) filterOrder.countryOrder = fo.countryOrder;
      if (fo.videoTypeOrder && Array.isArray(fo.videoTypeOrder)) filterOrder.videoTypeOrder = fo.videoTypeOrder;
      if (fo.langOrder && Array.isArray(fo.langOrder)) filterOrder.langOrder = fo.langOrder;
    } catch (_) {}
  }
  const content = `window.filtersData = ${JSON.stringify({
    genreMap,
    countryMap,
    yearMap,
    typeMap,
    statusMap,
    quality4kIds,
    exclusiveIds,
    genreNames,
    countryNames,
    filterOrder,
  })};`;
  fs.writeFileSync(path.join(PUBLIC_DATA, 'filters.js'), content, 'utf8');
  return { genreMap, countryMap, yearMap, genreNames, countryNames };
}

/** 5b. Inject site_name vào tất cả HTML (title, site-logo) để tên web đúng ngay khi load trang */
function injectSiteNameIntoHtml() {
  const configDir = path.join(PUBLIC_DATA, 'config');
  const siteSettingsPath = path.join(configDir, 'site-settings.json');
  if (!fs.existsSync(siteSettingsPath)) return;
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(siteSettingsPath, 'utf8'));
  } catch {
    return;
  }
  const siteName = settings.site_name || 'DAOP Phim';
  if (siteName === 'DAOP Phim') return;

  const publicDir = path.join(ROOT, 'public');
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.html')) {
        let content = fs.readFileSync(full, 'utf8');
        const orig = content;
        content = content.replace(/DAOP Phim/g, siteName);
        if (content !== orig) fs.writeFileSync(full, content, 'utf8');
      }
    }
  }
  walk(publicDir);
  console.log('   Injected site_name "' + siteName + '" into HTML files');
}

/** 5c. Cập nhật footer: hộp bo tròn 1 dòng, hàng 2 logo+links, hàng cuối copyright */
function injectFooterIntoHtml() {
  const publicDir = path.join(ROOT, 'public');
  const flagSvg = '<span class="footer-flag" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid meet"><rect width="30" height="20" fill="#DA251D"/><path fill="#FFFF00" d="M15 4l2.47 7.6H25l-6.23 4.5 2.36 7.3L15 16.2l-6.13 4.2 2.36-7.3L5 11.6h7.53z"/></svg></span>';
  const newFooterInner = [
    '<div class="footer-vietnam-wrap"><div class="footer-vietnam-banner">' + flagSvg + ' Trường Sa &amp; Hoàng Sa là của Việt Nam!</div></div>',
    '<div class="footer-bottom">',
    '  <div class="footer-bottom-inner">',
    '    <a href="/" class="footer-logo">GoTV</a>',
    '    <span class="footer-divider" aria-hidden="true"></span>',
    '    <div class="footer-links-col">',
    '      <a href="/hoi-dap.html">Hỏi - đáp</a>',
    '      <a href="/chinh-sach-bao-mat.html">Chính sách bảo mật</a>',
    '      <a href="/dieu-khoan-su-dung.html">Điều khoản sử dụng</a>',
    '    </div>',
    '  </div>',
    '</div>',
    '<p class="footer-copyright">Copyright 2018 <a href="https://gotv.top" target="_blank" rel="noopener">GoTV</a>. All rights reserved.</p>',
  ].join('\n    ');
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.html')) {
        let content = fs.readFileSync(full, 'utf8');
        const orig = content;
        content = content.replace(/Trường Sa,\s*Hoàng Sa/gi, 'Trường Sa & Hoàng Sa');
        content = content.replace(/<p>\s*<a[^>]*href="[^"]*donate[^"]*"[^>]*>Donate<\/a>\s*<\/p>\s*/gi, '');
        content = content.replace(/<p[^>]*class="footer-tmdb"[^>]*>[\s\S]*?<\/p>\s*/i, '');
        content = content.replace(/<p>[\s\S]*?Dữ liệu phim có thể từ TMDB[\s\S]*?<\/p>\s*/i, '');
        if (content.includes('footer-flag')) {
          content = content.replace(/<span class="footer-flag"[^>]*>[\s\S]*?<\/span>/gi, flagSvg);
        }
        if (content.includes('site-footer') && !content.includes('footer-vietnam-banner')) {
          content = content.replace(
            /<footer[^>]*class="site-footer"[^>]*>[\s\S]*?<\/footer>/i,
            '<footer class="site-footer">\n    ' + newFooterInner + '\n  </footer>'
          );
        }
        if (content.includes('footer-vietnam-banner') && !content.includes('footer-vietnam-wrap')) {
          content = content.replace(
            /<div class="footer-vietnam-banner">/i,
            '<div class="footer-vietnam-wrap"><div class="footer-vietnam-banner">'
          );
          content = content.replace(
            /(<div class="footer-vietnam-wrap"><div class="footer-vietnam-banner">[\s\S]*?)<\/div>\s*(<div class="footer-bottom">)/i,
            '$1</div></div>\n    $2'
          );
        }
        if (content.includes('footer-bottom') && !content.includes('footer-bottom-inner')) {
          const oldBottom = /<div class="footer-bottom">\s*<a href="[^"]*" class="footer-logo">[^<]*<\/a>\s*<div class="footer-links-col">[\s\S]*?<\/div>\s*<\/div>/i;
          const newBottom = [
            '<div class="footer-bottom">',
            '  <div class="footer-bottom-inner">',
            '    <a href="/" class="footer-logo">GoTV</a>',
            '    <span class="footer-divider" aria-hidden="true"></span>',
            '    <div class="footer-links-col">',
            '      <a href="/hoi-dap.html">Hỏi - đáp</a>',
            '      <a href="/chinh-sach-bao-mat.html">Chính sách bảo mật</a>',
            '      <a href="/dieu-khoan-su-dung.html">Điều khoản sử dụng</a>',
            '    </div>',
            '  </div>',
            '</div>',
          ].join('\n    ');
          content = content.replace(oldBottom, newBottom);
        }
        if (content.includes('site-footer') && !content.includes('footer-copyright')) {
          content = content.replace(
            /\s*<\/footer>/i,
            '\n    <p class="footer-copyright">Copyright 2018 <a href="https://gotv.top" target="_blank" rel="noopener">GoTV</a>. All rights reserved.</p>\n  </footer>'
          );
        }
        if (content !== orig) fs.writeFileSync(full, content, 'utf8');
      }
    }
  }
  walk(publicDir);
  console.log('   Injected footer into HTML files');
}

/** 5d. Thêm Tải app, Liên hệ vào nav mọi trang */
function injectNavIntoHtml() {
  const publicDir = path.join(ROOT, 'public');
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.html')) {
        let content = fs.readFileSync(full, 'utf8');
        if (content.includes('huong-dan-app')) continue;
        const prefix = content.includes('href="../') ? 'href="../' : 'href="/';
        const taiApp = '<a ' + prefix + 'huong-dan-app.html">Tải app</a>';
        const lienHe = '<a ' + prefix + 'lien-he.html">Liên hệ</a>';
        const added = taiApp + lienHe;
        if (content.includes('donate')) {
          content = content.replace(/(<a [^>]*donate[^"']*"[^>]*>Donate<\/a>)/i, '$1' + added);
        } else if (content.includes('gioi-thieu')) {
          content = content.replace(/(<a [^>]*gioi-thieu[^"']*"[^>]*>Giới thiệu<\/a>)/i, '$1' + added);
        }
        if (content.includes('huong-dan-app')) fs.writeFileSync(full, content, 'utf8');
      }
    }
  }
  walk(publicDir);
  console.log('   Injected nav (Tải app, Liên hệ) into HTML files');
}

/** 5e. Thêm màn hình Loading (logo + chữ Loading...) vào đầu body mọi trang */
function injectLoadingScreenIntoHtml() {
  const publicDir = path.join(ROOT, 'public');
  const loadingHtml = '<div id="loading-screen" class="loading-screen" aria-hidden="false"><div class="loading-screen-inner"><div class="loading-screen-logo">GoTV</div><p class="loading-screen-text">Loading...</p></div></div>';
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.html')) {
        let content = fs.readFileSync(full, 'utf8');
        if (content.includes('id="loading-screen"')) continue;
        content = content.replace(/<body(\s[^>]*)?>/i, '<body$1>\n  ' + loadingHtml);
        fs.writeFileSync(full, content, 'utf8');
      }
    }
  }
  walk(publicDir);
  console.log('   Injected loading screen into HTML files');
}

/** 6b. Tạo HTML cho từng thể loại, quốc gia, năm (để /the-loai/hanh-dong.html, /quoc-gia/trung-quoc.html... tồn tại) */
function writeCategoryPages(filters) {
  const publicDir = path.join(ROOT, 'public');
  fs.ensureDirSync(path.join(publicDir, 'the-loai'));
  fs.ensureDirSync(path.join(publicDir, 'quoc-gia'));
  fs.ensureDirSync(path.join(publicDir, 'nam-phat-hanh'));
  const theLoaiIndex = fs.readFileSync(path.join(publicDir, 'the-loai', 'index.html'), 'utf8');
  const quocGiaIndex = fs.readFileSync(path.join(publicDir, 'quoc-gia', 'index.html'), 'utf8');
  const namPhatHanhIndex = fs.readFileSync(path.join(publicDir, 'nam-phat-hanh', 'index.html'), 'utf8');
  const genres = Object.keys(filters.genreNames || filters.genreMap || {});
  const countries = Object.keys(filters.countryNames || filters.countryMap || {});
  const years = Object.keys(filters.yearMap || {});
  for (const slug of genres) {
    const safe = slug.replace(/[/\\?*:|"<>]/g, '_');
    fs.writeFileSync(path.join(publicDir, 'the-loai', safe + '.html'), theLoaiIndex, 'utf8');
  }
  for (const slug of countries) {
    const safe = slug.replace(/[/\\?*:|"<>]/g, '_');
    fs.writeFileSync(path.join(publicDir, 'quoc-gia', safe + '.html'), quocGiaIndex, 'utf8');
  }
  for (const y of years) {
    const safe = String(y).replace(/[/\\?*:|"<>]/g, '_');
    fs.writeFileSync(path.join(publicDir, 'nam-phat-hanh', safe + '.html'), namPhatHanhIndex, 'utf8');
  }
  console.log('   Category pages: the-loai', genres.length, ', quoc-gia', countries.length, ', nam-phat-hanh', years.length);
}

/** Helper: tạo light object cho renderMovieCard */
function toLightMovie(m) {
  return {
    id: String(m.id),
    title: m.title,
    origin_name: m.origin_name || '',
    slug: m.slug,
    thumb: m.thumb,
    poster: m.poster,
    year: m.year,
    type: m.type,
    episode_current: m.episode_current,
  };
}

/** 7. Tạo actors: index (names only) + shard theo ký tự đầu, mỗi shard có thêm movies (light) để trang diễn viên không cần movies-light.js */
function writeActors(movies) {
  const map = {};
  const names = {};
  const movieById = new Map();
  for (const m of movies) {
    movieById.set(String(m.id), toLightMovie(m));
    for (const name of m.cast || []) {
      const s = slugify(name, { lower: true });
      if (!s) continue;
      if (!map[s]) map[s] = [];
      map[s].push(String(m.id));
      names[s] = name;
    }
  }
  const slugs = Object.keys(names);
  // Legacy: một file đầy đủ (fallback + dùng cho incremental sau này)
  fs.writeFileSync(path.join(PUBLIC_DATA, 'actors.js'), `window.actorsData = ${JSON.stringify({ map, names })};`, 'utf8');
  // Index: chỉ names (cho trang danh sách "Chọn diễn viên")
  fs.writeFileSync(
    path.join(PUBLIC_DATA, 'actors-index.js'),
    `window.actorsIndex = ${JSON.stringify({ names })};`,
    'utf8'
  );
  // Shard theo ký tự đầu (a-z, other), mỗi shard có thêm movies: { slug: [light objects] }
  const byFirst = {};
  for (const slug of slugs) {
    const c = (slug[0] || '').toLowerCase();
    const key = c >= 'a' && c <= 'z' ? c : 'other';
    if (!byFirst[key]) byFirst[key] = { map: {}, names: {}, movies: {} };
    byFirst[key].map[slug] = map[slug];
    byFirst[key].names[slug] = names[slug];
    byFirst[key].movies[slug] = (map[slug] || [])
      .map((id) => movieById.get(String(id)))
      .filter(Boolean);
  }
  const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'other'];
  for (const key of keys) {
    const data = byFirst[key] || { map: {}, names: {}, movies: {} };
    fs.writeFileSync(
      path.join(PUBLIC_DATA, `actors-${key}.js`),
      `window.actorsData = ${JSON.stringify(data)};`,
      'utf8'
    );
  }
  const shardCount = keys.filter((k) => byFirst[k] && Object.keys(byFirst[k].map).length > 0).length;
  console.log('   Actors: index +', shardCount, 'shards (a-z, other) + movies per shard');
}

/** 7b. Tạo actors-index.js + shards từ object { map, names }, thêm movies nếu có movies-light.js (incremental) */
function writeActorsShardsFromData(map = {}, names = {}, movieById = null) {
  const slugs = Object.keys(names);
  fs.writeFileSync(
    path.join(PUBLIC_DATA, 'actors-index.js'),
    `window.actorsIndex = ${JSON.stringify({ names })};`,
    'utf8'
  );
  const byFirst = {};
  for (const slug of slugs) {
    const c = (slug[0] || '').toLowerCase();
    const key = c >= 'a' && c <= 'z' ? c : 'other';
    if (!byFirst[key]) byFirst[key] = { map: {}, names: {}, movies: {} };
    byFirst[key].map[slug] = map[slug] || [];
    byFirst[key].names[slug] = names[slug];
    if (movieById) {
      byFirst[key].movies[slug] = (map[slug] || [])
        .map((id) => movieById.get(String(id)))
        .filter(Boolean);
    }
  }
  const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'other'];
  for (const key of keys) {
    const data = byFirst[key] || { map: {}, names: {}, movies: {} };
    fs.writeFileSync(
      path.join(PUBLIC_DATA, `actors-${key}.js`),
      `window.actorsData = ${JSON.stringify(data)};`,
      'utf8'
    );
  }
  const shardCount = keys.filter((k) => byFirst[k] && Object.keys(byFirst[k].map).length > 0).length;
  console.log('   Actors (từ actors.js): index +', shardCount, 'shards', movieById ? '+ movies' : '');
}

/** 8. Tạo batch files */
function writeBatches(movies) {
  const sorted = [...movies].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const batchDir = path.join(PUBLIC_DATA, 'batches');
  fs.ensureDirSync(batchDir);
  for (let start = 0; start < sorted.length; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, sorted.length);
    const batch = sorted.slice(start, end).map((m) => ({ ...m, id: String(m.id) }));
    const content = `window.moviesBatch = ${JSON.stringify(batch)};`;
    fs.writeFileSync(path.join(batchDir, `batch_${start}_${end}.js`), content, 'utf8');
  }
}

/** 9. Đọc Supabase Admin và xuất config JSON */
async function exportConfigFromSupabase() {
  const url = process.env.SUPABASE_ADMIN_URL;
  const key = process.env.SUPABASE_ADMIN_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('SUPABASE_ADMIN_URL hoặc SUPABASE_ADMIN_SERVICE_ROLE_KEY chưa đặt — dùng config mặc định. Cập nhật trên Admin sẽ không xuất ra website. Thêm 2 secret này vào GitHub Actions (build-on-demand) để export đúng từ Supabase.');
    await writeDefaultConfig();
    return;
  }
  const supabase = createClient(url, key);
  const configDir = path.join(PUBLIC_DATA, 'config');
  fs.ensureDirSync(configDir);

  const today = new Date().toISOString().slice(0, 10);
  const [sources, bannersRes, sections, settings, staticPages, donate, playerSettingsRes, prerollRes] = await Promise.all([
    supabase.from('server_sources').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('ad_banners').select('*').eq('is_active', true),
    supabase.from('homepage_sections').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('site_settings').select('key, value'),
    supabase.from('static_pages').select('*'),
    supabase.from('donate_settings').select('*').limit(1).maybeSingle(),
    supabase.from('player_settings').select('key, value'),
    supabase.from('ad_preroll').select('*').eq('is_active', true).order('weight', { ascending: false }),
  ]);

  const errors = [
    [sources, 'server_sources'],
    [bannersRes, 'ad_banners'],
    [sections, 'homepage_sections'],
    [settings, 'site_settings'],
    [staticPages, 'static_pages'],
    [donate, 'donate_settings'],
    [playerSettingsRes, 'player_settings'],
    [prerollRes, 'ad_preroll'],
  ].filter(([r]) => r && r.error).map(([r, name]) => `${name}: ${r.error?.message || r.error}`);
  if (errors.length) {
    console.error('Supabase lỗi (kiểm tra SUPABASE_ADMIN_URL và SUPABASE_ADMIN_SERVICE_ROLE_KEY trong GitHub Secrets):', errors);
    throw new Error('Export config từ Supabase thất bại: ' + errors.join('; '));
  }
  console.log('Export config từ Supabase OK (sections:', (sections.data || []).length, ', settings:', (settings.data || []).length, ')');

  const banners = (bannersRes.data || []).filter((b) => {
    if (b.start_date && b.start_date > today) return false;
    if (b.end_date && b.end_date < today) return false;
    return true;
  });
  const defaultSections = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'config', 'default-sections.json'), 'utf-8')
  );
  fs.writeFileSync(path.join(configDir, 'server-sources.json'), JSON.stringify(sources.data || [], null, 2));
  fs.writeFileSync(path.join(configDir, 'banners.json'), JSON.stringify(banners, null, 2));
  const sectionsOut = (sections.data && sections.data.length)
    ? sections.data.map((s) => {
        const fc = s.filter_config && typeof s.filter_config === 'object' ? s.filter_config : {};
        return { ...s, ...fc };
      })
    : defaultSections;
  fs.writeFileSync(path.join(configDir, 'homepage-sections.json'), JSON.stringify(sectionsOut, null, 2));
  const settingsObj = Object.fromEntries((settings.data || []).map((r) => [r.key, r.value]));
  const defaultSettings = {
    site_name: 'DAOP Phim',
    logo_url: '',
    favicon_url: '',
    google_analytics_id: '',
    simple_analytics_script: '',
    twikoo_env_id: '',
    supabase_user_url: '',
    supabase_user_anon_key: '',
    player_warning_enabled: 'true',
    player_warning_text: 'Cảnh báo: Phim chứa hình ảnh đường lưỡi bò phi pháp xâm phạm chủ quyền biển đảo Việt Nam.',
    player_visible: 'true',
    social_facebook: '',
    social_twitter: '',
    social_instagram: '',
    social_youtube: '',
    footer_content: '',
    tmdb_attribution: 'true',
    loading_screen_enabled: 'true',
    loading_screen_min_seconds: '0',
    homepage_slider: '[]',
    ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`menu_bg_${i + 1}`, ''])),
    movies_data_url: '',
    filter_row_order: JSON.stringify(['year', 'genre', 'country', 'videoType', 'lang']),
    filter_genre_order: '[]',
    filter_country_order: '[]',
    filter_video_type_order: JSON.stringify(['tvshows', 'hoathinh', '4k', 'exclusive']),
    filter_lang_order: JSON.stringify(['vietsub', 'thuyetminh', 'longtieng', 'khac']),
    theme_primary: '#58a6ff',
    theme_bg: '#0d1117',
    theme_card: '#161b22',
    theme_accent: '#58a6ff',
    theme_text: '#e6edf3',
    theme_muted: '#8b949e',
    theme_slider_title: '#ffffff',
    theme_slider_meta: 'rgba(255,255,255,0.75)',
    theme_slider_desc: 'rgba(255,255,255,0.7)',
    theme_movie_card_title: '#f85149',
    theme_movie_card_meta: '#8b949e',
    theme_header_logo: '#e6edf3',
    theme_header_link: '#e6edf3',
    theme_footer_text: '#8b949e',
    theme_section_title: '#e6edf3',
    theme_filter_label: '#8b949e',
    theme_pagination: '#e6edf3',
    theme_link: '#58a6ff',
    default_grid_cols_xs: '2',
    default_grid_cols_sm: '3',
    default_grid_cols_md: '4',
    default_grid_cols_lg: '6',
    grid_columns_extra: '8',
    default_use_poster: 'thumb',
    category_grid_cols_xs: '2',
    category_grid_cols_sm: '3',
    category_grid_cols_md: '4',
    category_grid_cols_lg: '6',
    category_grid_columns_extra: '8',
    category_use_poster: 'thumb',
  };
  const mergedSettings = { ...defaultSettings, ...settingsObj };
  fs.writeFileSync(path.join(configDir, 'site-settings.json'), JSON.stringify(mergedSettings, null, 2));

  const defaultRowOrder = ['year', 'genre', 'country', 'videoType', 'lang'];
  const filterRowOrder = (() => {
    try {
      const v = mergedSettings.filter_row_order;
      if (!v) return defaultRowOrder;
      const a = typeof v === 'string' ? JSON.parse(v) : v;
      return Array.isArray(a) && a.length ? a : defaultRowOrder;
    } catch {
      return defaultRowOrder;
    }
  })();
  const filterGenreOrder = (() => {
    try {
      const v = mergedSettings.filter_genre_order;
      if (!v) return [];
      const a = typeof v === 'string' ? JSON.parse(v) : v;
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  })();
  const filterCountryOrder = (() => {
    try {
      const v = mergedSettings.filter_country_order;
      if (!v) return [];
      const a = typeof v === 'string' ? JSON.parse(v) : v;
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  })();
  const defaultVideoTypeOrder = ['tvshows', 'hoathinh', '4k', 'exclusive'];
  const filterVideoTypeOrder = (() => {
    try {
      const v = mergedSettings.filter_video_type_order;
      if (!v) return defaultVideoTypeOrder;
      const a = typeof v === 'string' ? JSON.parse(v) : v;
      return Array.isArray(a) && a.length ? a : defaultVideoTypeOrder;
    } catch {
      return defaultVideoTypeOrder;
    }
  })();
  const defaultLangOrder = ['vietsub', 'thuyetminh', 'longtieng', 'khac'];
  const filterLangOrder = (() => {
    try {
      const v = mergedSettings.filter_lang_order;
      if (!v) return defaultLangOrder;
      const a = typeof v === 'string' ? JSON.parse(v) : v;
      return Array.isArray(a) && a.length ? a : defaultLangOrder;
    } catch {
      return defaultLangOrder;
    }
  })();
  const defaultListOrder = ['phim-4k', 'shows', 'hoat-hinh', 'phim-vietsub', 'phim-thuyet-minh', 'phim-long-tieng', 'phim-doc-quyen', 'phim-dang-chieu', 'phim-sap-chieu', 'phim-chieu-rap', 'the-loai', 'quoc-gia', 'nam-phat-hanh', 'dien-vien'];
  const filterListOrder = (() => {
    try {
      const v = mergedSettings.filter_list_order;
      if (!v) return defaultListOrder;
      const a = typeof v === 'string' ? JSON.parse(v) : v;
      return Array.isArray(a) && a.length ? a : defaultListOrder;
    } catch {
      return defaultListOrder;
    }
  })();
  const listOptionsMap = {
    'phim-4k': { label: 'Phim 4K', href: '/danh-sach/phim-4k.html', icon: '📺' },
    'shows': { label: 'TV Shows', href: '/shows.html', icon: '📺' },
    'hoat-hinh': { label: 'Hoạt hình', href: '/hoat-hinh.html', icon: '🎬' },
    'phim-vietsub': { label: 'Phim Vietsub', href: '/danh-sach/phim-vietsub.html', icon: '🇻🇳' },
    'phim-thuyet-minh': { label: 'Phim Thuyết minh', href: '/danh-sach/phim-thuyet-minh.html', icon: '🎙️' },
    'phim-long-tieng': { label: 'Phim Lồng tiếng', href: '/danh-sach/phim-long-tieng.html', icon: '🔊' },
    'phim-doc-quyen': { label: 'Phim Độc quyền', href: '/danh-sach/phim-doc-quyen.html', icon: '⭐' },
    'phim-dang-chieu': { label: 'Phim đang chiếu', href: '/danh-sach/phim-dang-chieu.html', icon: '🎞️' },
    'phim-sap-chieu': { label: 'Phim sắp chiếu', href: '/danh-sach/phim-sap-chieu.html', icon: '📅' },
    'phim-chieu-rap': { label: 'Phim chiếu rạp', href: '/danh-sach/phim-chieu-rap.html', icon: '🎭' },
    'the-loai': { label: 'Thể loại', href: '/the-loai/', icon: '🎬' },
    'quoc-gia': { label: 'Quốc gia', href: '/quoc-gia/', icon: '🌐' },
    'nam-phat-hanh': { label: 'Năm phát hành', href: '/nam-phat-hanh/', icon: '📅' },
    'dien-vien': { label: 'Diễn viên', href: '/dien-vien/', icon: '👤' },
  };
  const listOrderItems = filterListOrder
    .filter(id => listOptionsMap[id])
    .map(id => ({ id, ...listOptionsMap[id] }));
  const missingListIds = Object.keys(listOptionsMap).filter(id => !filterListOrder.includes(id));
  missingListIds.forEach(id => listOrderItems.push({ id, ...listOptionsMap[id] }));

  fs.writeFileSync(
    path.join(configDir, 'filter-order.json'),
    JSON.stringify({
      rowOrder: filterRowOrder,
      genreOrder: filterGenreOrder,
      countryOrder: filterCountryOrder,
      videoTypeOrder: filterVideoTypeOrder,
      langOrder: filterLangOrder,
      listOrder: filterListOrder,
    }, null, 2)
  );
  fs.writeFileSync(path.join(configDir, 'list-order.json'), JSON.stringify(listOrderItems, null, 2));

  fs.writeFileSync(path.join(configDir, 'static-pages.json'), JSON.stringify(staticPages.data || [], null, 2));
  fs.writeFileSync(path.join(configDir, 'donate.json'), JSON.stringify(donate.data || {}, null, 2));
  
  // Player settings: merge từ player_settings table
  const playerSettingsData = playerSettingsRes.data || [];
  const playerSettingsObj = {};
  for (const row of playerSettingsData) {
    try {
      playerSettingsObj[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    } catch {
      playerSettingsObj[row.key] = row.value;
    }
  }
  const defaultPlayerSettings = {
    available_players: { 'plyr': 'Plyr', 'videojs': 'Video.js', 'jwplayer': 'JWPlayer' },
    default_player: 'plyr',
    warning_enabled_global: true,
    warning_text: 'Cảnh báo: Phim chứa hình ảnh đường lưỡi bò phi pháp xâm phạm chủ quyền biển đảo Việt Nam.',
  };
  const mergedPlayerSettings = { ...defaultPlayerSettings, ...playerSettingsObj };
  fs.writeFileSync(path.join(configDir, 'player-settings.json'), JSON.stringify(mergedPlayerSettings, null, 2));

  const prerollList = (prerollRes.data || []).map((p) => ({
    id: p.id,
    name: p.name,
    video_url: p.video_url,
    image_url: p.image_url,
    duration: p.duration,
    skip_after: p.skip_after,
    weight: p.weight,
  }));
  fs.writeFileSync(path.join(configDir, 'preroll.json'), JSON.stringify(prerollList, null, 2));
}

async function writeDefaultConfig() {
  const configDir = path.join(PUBLIC_DATA, 'config');
  fs.ensureDirSync(configDir);
  const defaults = {
    'server-sources.json': [],
    'banners.json': [],
    'homepage-sections.json': JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config', 'default-sections.json'), 'utf-8')
    ),
    'site-settings.json': {
      site_name: 'DAOP Phim',
      logo_url: '',
      favicon_url: '',
      google_analytics_id: '',
      simple_analytics_script: '',
      twikoo_env_id: '',
      supabase_user_url: '',
      supabase_user_anon_key: '',
      player_warning_enabled: 'true',
      player_warning_text: 'Cảnh báo: Phim chứa hình ảnh đường lưỡi bò phi pháp xâm phạm chủ quyền biển đảo Việt Nam.',
      social_facebook: '',
      social_twitter: '',
      social_instagram: '',
      social_youtube: '',
      footer_content: '',
      tmdb_attribution: 'true',
      loading_screen_enabled: 'true',
      loading_screen_min_seconds: '0',
    },
    'static-pages.json': [],
    'donate.json': { target_amount: 0, target_currency: 'VND', current_amount: 0 },
    'player-settings.json': {
      available_players: { 'plyr': 'Plyr', 'videojs': 'Video.js', 'jwplayer': 'JWPlayer' },
      default_player: 'plyr',
      warning_enabled_global: true,
      warning_text: 'Cảnh báo: Phim chứa hình ảnh đường lưỡi bò phi pháp xâm phạm chủ quyền biển đảo Việt Nam.',
    },
    'preroll.json': [],
    'filter-order.json': {
      rowOrder: ['year', 'genre', 'country', 'videoType', 'lang'],
      genreOrder: [],
      countryOrder: [],
      videoTypeOrder: ['tvshows', 'hoathinh', '4k', 'exclusive'],
      langOrder: ['vietsub', 'thuyetminh', 'longtieng', 'khac'],
      listOrder: ['phim-4k', 'shows', 'hoat-hinh', 'phim-vietsub', 'phim-thuyet-minh', 'phim-long-tieng', 'phim-doc-quyen', 'phim-dang-chieu', 'phim-sap-chieu', 'phim-chieu-rap', 'the-loai', 'quoc-gia', 'nam-phat-hanh', 'dien-vien'],
    },
    'list-order.json': [
      { id: 'phim-4k', label: 'Phim 4K', href: '/danh-sach/phim-4k.html', icon: '📺' },
      { id: 'shows', label: 'TV Shows', href: '/shows.html', icon: '📺' },
      { id: 'hoat-hinh', label: 'Hoạt hình', href: '/hoat-hinh.html', icon: '🎬' },
      { id: 'phim-vietsub', label: 'Phim Vietsub', href: '/danh-sach/phim-vietsub.html', icon: '🇻🇳' },
      { id: 'phim-thuyet-minh', label: 'Phim Thuyết minh', href: '/danh-sach/phim-thuyet-minh.html', icon: '🎙️' },
      { id: 'phim-long-tieng', label: 'Phim Lồng tiếng', href: '/danh-sach/phim-long-tieng.html', icon: '🔊' },
      { id: 'phim-doc-quyen', label: 'Phim Độc quyền', href: '/danh-sach/phim-doc-quyen.html', icon: '⭐' },
      { id: 'phim-dang-chieu', label: 'Phim đang chiếu', href: '/danh-sach/phim-dang-chieu.html', icon: '🎞️' },
      { id: 'phim-sap-chieu', label: 'Phim sắp chiếu', href: '/danh-sach/phim-sap-chieu.html', icon: '📅' },
      { id: 'phim-chieu-rap', label: 'Phim chiếu rạp', href: '/danh-sach/phim-chieu-rap.html', icon: '🎭' },
      { id: 'the-loai', label: 'Thể loại', href: '/the-loai/', icon: '🎬' },
      { id: 'quoc-gia', label: 'Quốc gia', href: '/quoc-gia/', icon: '🌐' },
      { id: 'nam-phat-hanh', label: 'Năm phát hành', href: '/nam-phat-hanh/', icon: '📅' },
      { id: 'dien-vien', label: 'Diễn viên', href: '/dien-vien/', icon: '👤' },
    ],
  };
  for (const [file, data] of Object.entries(defaults)) {
    fs.writeFileSync(path.join(configDir, file), JSON.stringify(data, null, 2));
  }
}

/** 10. Sitemap & robots */
function writeSitemap(movies) {
  const base = process.env.SITE_URL || 'https://yourdomain.com';
  let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  const pages = ['', '/phim-bo', '/phim-le', '/tim-kiem', '/gioi-thieu', '/donate', '/huong-dan-app', '/lien-he', '/hoi-dap', '/chinh-sach-bao-mat', '/dieu-khoan-su-dung'];
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

  if (incremental) {
    await fs.ensureDir(PUBLIC_DATA);
    await fs.ensureDir(path.join(PUBLIC_DATA, 'config'));
    console.log('Incremental: export config từ Supabase + tạo lại trang thể loại/quốc gia/năm.');
    await exportConfigFromSupabase();
    injectSiteNameIntoHtml();
    injectFooterIntoHtml();
    injectNavIntoHtml();
    injectLoadingScreenIntoHtml();
    const filtersPath = path.join(PUBLIC_DATA, 'filters.js');
    const filterOrderPath = path.join(PUBLIC_DATA, 'config', 'filter-order.json');
    if (await fs.pathExists(filtersPath)) {
      const raw = fs.readFileSync(filtersPath, 'utf8');
      const jsonStr = raw.replace(/^window\.filtersData\s*=\s*/, '').replace(/;\s*$/, '');
      try {
        const filters = JSON.parse(jsonStr);
        if (fs.existsSync(filterOrderPath)) {
          const fo = JSON.parse(fs.readFileSync(filterOrderPath, 'utf8'));
          filters.filterOrder = {
            rowOrder: fo.rowOrder && Array.isArray(fo.rowOrder) ? fo.rowOrder : (filters.filterOrder && filters.filterOrder.rowOrder) || ['year', 'genre', 'country', 'videoType', 'lang'],
            genreOrder: fo.genreOrder && Array.isArray(fo.genreOrder) ? fo.genreOrder : (filters.filterOrder && filters.filterOrder.genreOrder) || [],
            countryOrder: fo.countryOrder && Array.isArray(fo.countryOrder) ? fo.countryOrder : (filters.filterOrder && filters.filterOrder.countryOrder) || [],
            videoTypeOrder: fo.videoTypeOrder && Array.isArray(fo.videoTypeOrder) ? fo.videoTypeOrder : (filters.filterOrder && filters.filterOrder.videoTypeOrder) || ['tvshows', 'hoathinh', '4k', 'exclusive'],
            langOrder: fo.langOrder && Array.isArray(fo.langOrder) ? fo.langOrder : (filters.filterOrder && filters.filterOrder.langOrder) || ['vietsub', 'thuyetminh', 'longtieng', 'khac'],
          };
          fs.writeFileSync(filtersPath, `window.filtersData = ${JSON.stringify(filters)};`, 'utf8');
        }
        writeCategoryPages(filters);
      } catch (e) {
        console.warn('   Không parse được filters.js, bỏ qua writeCategoryPages:', e.message);
      }
    }
    const actorsPath = path.join(PUBLIC_DATA, 'actors.js');
    if (await fs.pathExists(actorsPath)) {
      const raw = fs.readFileSync(actorsPath, 'utf8');
      const jsonStr = raw.replace(/^window\.actorsData\s*=\s*/, '').replace(/;\s*$/, '');
      try {
        const actorsData = JSON.parse(jsonStr);
        const { map: m, names: n } = actorsData;
        let movieById = null;
        const mlPath = path.join(PUBLIC_DATA, 'movies-light.js');
        if (await fs.pathExists(mlPath)) {
          const mlRaw = fs.readFileSync(mlPath, 'utf8');
          const mlStr = mlRaw.replace(/^window\.moviesLight\s*=\s*/, '').replace(/;\s*$/, '');
          try {
            const light = JSON.parse(mlStr);
            movieById = new Map();
            for (const mv of light || []) movieById.set(String(mv.id), mv);
          } catch (ee) {
            console.warn('   Không parse được movies-light.js:', ee.message);
          }
        }
        writeActorsShardsFromData(m || {}, n || {}, movieById);
      } catch (e) {
        console.warn('   Không parse được actors.js, bỏ qua writeActorsShardsFromData:', e.message);
      }
    }
    const buildVersion = { builtAt: new Date().toISOString() };
    fs.writeFileSync(path.join(PUBLIC_DATA, 'build_version.json'), JSON.stringify(buildVersion, null, 2));
    console.log('Incremental build xong.');
    return;
  }

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

  console.log('4b. Fetching OPhim genres & countries...');
  const { genreNames, countryNames } = await fetchOPhimGenresAndCountries();

  console.log('5. Exporting config from Supabase Admin (để có filter-order, site-settings...)...');
  await exportConfigFromSupabase();

  console.log('5b. Injecting site_name into HTML files...');
  injectSiteNameIntoHtml();
  console.log('5c. Injecting footer into HTML files...');
  injectFooterIntoHtml();
  console.log('5d. Injecting nav into HTML files...');
  injectNavIntoHtml();
  console.log('5e. Injecting loading screen into HTML files...');
  injectLoadingScreenIntoHtml();

  console.log('6. Writing movies-light.js, filters.js, actors (index + shards), batches...');
  writeMoviesLight(allMovies);
  const filters = writeFilters(allMovies, genreNames, countryNames);
  writeCategoryPages(filters);
  writeActors(allMovies);
  writeBatches(allMovies);

  const buildVersion = { builtAt: new Date().toISOString() };
  fs.writeFileSync(path.join(PUBLIC_DATA, 'build_version.json'), JSON.stringify(buildVersion, null, 2));

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
