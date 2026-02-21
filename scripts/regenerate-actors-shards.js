/**
 * Script độc lập: đọc actors.js + movies-light.js, tạo lại actors shards có trường movies.
 * Chạy: node scripts/regenerate-actors-shards.js
 * Giúp trang diễn viên hiển thị danh sách phim mà không cần phụ thuộc movies-light.js load động.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DATA = path.join(__dirname, '..', 'public', 'data');

function main() {
  const actorsPath = path.join(PUBLIC_DATA, 'actors.js');
  const mlPath = path.join(PUBLIC_DATA, 'movies-light.js');

  if (!fs.existsSync(actorsPath)) {
    console.error('actors.js không tồn tại. Chạy npm run build trước.');
    process.exit(1);
  }
  if (!fs.existsSync(mlPath)) {
    console.error('movies-light.js không tồn tại. Chạy npm run build trước.');
    process.exit(1);
  }

  const actorsRaw = fs.readFileSync(actorsPath, 'utf8');
  const actorsStr = actorsRaw.replace(/^window\.actorsData\s*=\s*/, '').replace(/;\s*$/, '');
  const actorsData = JSON.parse(actorsStr);
  const { map: m = {}, names: n = {} } = actorsData;

  const mlRaw = fs.readFileSync(mlPath, 'utf8');
  const mlStr = mlRaw.replace(/^window\.moviesLight\s*=\s*/, '').replace(/;\s*$/, '');
  const light = JSON.parse(mlStr);
  const movieById = new Map();
  for (const mv of light || []) movieById.set(String(mv.id), mv);

  const slugs = Object.keys(n);
  const byFirst = {};
  for (const slug of slugs) {
    const c = (slug[0] || '').toLowerCase();
    const key = c >= 'a' && c <= 'z' ? c : 'other';
    if (!byFirst[key]) byFirst[key] = { map: {}, names: {}, movies: {} };
    byFirst[key].map[slug] = m[slug] || [];
    byFirst[key].names[slug] = n[slug];
    byFirst[key].movies[slug] = (m[slug] || [])
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
  console.log('Đã tạo lại', shardCount, 'actors shards với trường movies.');
}

main();
