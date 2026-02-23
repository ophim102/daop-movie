// Kiểm tra nhanh kết nối Google Sheets với service account hiện tại
// Chạy: node scripts/test-sheets-connection.js
// ENV:
//   GOOGLE_SHEETS_ID (tùy chọn, nếu có sẽ gọi spreadsheets.get)
//   GOOGLE_SERVICE_ACCOUNT_KEY (tùy chọn, path tới file JSON; mặc định ./gotv-394615-89fa7961dcb3.json)

import fs from 'fs-extra';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

async function main() {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const keyPathEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const keyPath = keyPathEnv
    ? (path.isAbsolute(keyPathEnv) ? keyPathEnv : path.join(ROOT, keyPathEnv))
    : path.join(ROOT, 'gotv-394615-89fa7961dcb3.json');

  console.log('Sử dụng key file:', keyPath);
  if (!(await fs.pathExists(keyPath))) {
    console.error('KHÔNG tìm thấy file service account. Kiểm tra GOOGLE_SERVICE_ACCOUNT_KEY hoặc đường dẫn mặc định.');
    process.exit(1);
  }

  const key = await fs.readJson(keyPath);
  console.log('client_email:', key.client_email);
  console.log('private_key length:', key.private_key ? key.private_key.length : 0);

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    console.log('Lấy access token THÀNH CÔNG:', typeof token === 'string' ? token.slice(0, 20) + '...' : 'ok');

    if (sheetId) {
      console.log('Thử gọi spreadsheets.get cho sheet:', sheetId);
      const sheets = google.sheets({ version: 'v4', auth });
      const res = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      console.log('Đọc sheet OK. Tiêu đề:', res.data.properties?.title || '(không có)');
    } else {
      console.log('GOOGLE_SHEETS_ID chưa đặt, chỉ test auth (token) thôi.');
    }
  } catch (e) {
    console.error('LỖI khi auth / gọi Sheets:');
    console.error(e?.response?.data || e?.message || e);
    process.exit(1);
  }
}

main();

