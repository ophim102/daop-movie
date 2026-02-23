// Đọc cài đặt OPhim (tự động) từ Supabase Admin và ghi vào GITHUB_ENV
// Ưu tiên các key auto: ophim_auto_*, fallback sang ophim_*

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.SUPABASE_ADMIN_URL;
  const key = process.env.SUPABASE_ADMIN_SERVICE_ROLE_KEY;
  const envFile = process.env.GITHUB_ENV;

  if (!url || !key) {
    console.log('SUPABASE_ADMIN_URL hoặc SUPABASE_ADMIN_SERVICE_ROLE_KEY chưa có, bỏ qua load-ophim-env.');
    return;
  }
  if (!envFile) {
    console.log('GITHUB_ENV không có trong env, bỏ qua load-ophim-env.');
    return;
  }

  const supabase = createClient(url, key);
  const wantedKeys = [
    'ophim_auto_max_pages',
    'ophim_auto_max_movies',
    'ophim_auto_start_page',
    'ophim_auto_end_page',
    'ophim_max_pages',
    'ophim_max_movies',
    'ophim_start_page',
    'ophim_end_page',
  ];

  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', wantedKeys);

  if (error) {
    console.log('Không đọc được site_settings từ Supabase:', error.message || error);
    return;
  }

  const map = {};
  (data || []).forEach((r) => {
    if (r && r.key != null) map[r.key] = r.value;
  });

  const numOr = (v, def) => {
    const n = Number(v);
    return Number.isNaN(n) ? def : n;
  };

  const maxPages = numOr(map.ophim_auto_max_pages ?? map.ophim_max_pages, 5);
  const maxMovies = numOr(map.ophim_auto_max_movies ?? map.ophim_max_movies, 500);
  const startPage = numOr(map.ophim_auto_start_page ?? map.ophim_start_page, 1);
  const endPage = numOr(map.ophim_auto_end_page ?? map.ophim_end_page, 0);

  const lines = [
    `OPHIM_MAX_PAGES=${maxPages}`,
    `OPHIM_MAX_MOVIES=${maxMovies}`,
    `OPHIM_START_PAGE=${startPage}`,
    `OPHIM_END_PAGE=${endPage}`,
  ];

  fs.appendFileSync(envFile, lines.join('\n') + '\n', 'utf8');
  console.log('Đã ghi OPHIM_* vào GITHUB_ENV từ Supabase (auto settings).');
}

main().catch((e) => {
  console.error('load-ophim-env-from-supabase failed:', e?.message || e);
  process.exit(0); // không làm fail build nếu lỗi
});

