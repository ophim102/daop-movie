# Google Sheets – Phim custom (đồng bộ với build)

Build đọc phim từ Google Sheets khi cấu hình `GOOGLE_SHEETS_ID` và `GOOGLE_SERVICE_ACCOUNT_KEY`. **Tên spreadsheet** (vd. "ophim data") tùy bạn đặt; **bắt buộc** là tên **hai sheet (tab)** phải đúng: **movies** và **episodes**.

---

## Đồng bộ với build (scripts/build.js)

Build gọi API với range cố định:

- **movies**: `movies!A1:Z1000` → sheet tab phải tên **movies**
- **episodes**: `episodes!A1:Z2000` → sheet tab phải tên **episodes**

Hàng đầu tiên mỗi sheet = **header** (không phân biệt hoa thường; dấu gạch dưới có thể thành space, vd. `origin name`).

### Đồng bộ movie_id giữa 2 sheet (dùng id dãy số)

| Sheet **movies** | Sheet **episodes** |
|------------------|---------------------|
| Cột **id** = dãy số duy nhất (1, 2, 3, ...) cho mỗi phim | Cột **movie_id** = điền **đúng số id** của phim tương ứng (vd. 1, 2, 3) |

- **id** trong movies là định danh chính để nối với episodes: **episodes.movie_id** = **movies.id** (cùng một số).
- Dùng id dãy số tránh trùng khi nhiều phim **trùng tên**: build tự xử lý slug trùng bằng cách thêm hậu tố `-2`, `-3`... (vd. `phim-abc`, `phim-abc-2`, `phim-abc-3`).
- Nếu không điền **id** trong movies, build vẫn chạy (tự sinh id); lúc đó episodes.movie_id có thể dùng **title** hoặc **slug** để khớp.

### Sheet `movies` – cột build đọc

| Cột (header) | Build dùng | Ghi chú |
|--------------|------------|--------|
| id | ✓ | **Dãy số duy nhất** (1, 2, 3...) – dùng làm movie_id trong sheet episodes. Nếu trống, build tự sinh id. |
| title | Bắt buộc | Hoặc cột `name` |
| slug | ✓ | Tùy chọn. Nếu trống, build tạo từ title; nếu trùng slug (phim trùng tên), build thêm -2, -3... |
| origin_name | ✓ | |
| type | ✓ | single / series / tvshows / hoathinh |
| year | ✓ | |
| genre | ✓ | Cách nhau bằng dấu phẩy |
| country | ✓ | Cách nhau bằng dấu phẩy |
| language | ✓ | |
| quality | ✓ | HD, 4K... |
| episode_current | ✓ | Mặc định "1" |
| thumb_url hoặc thumb | ✓ | URL ảnh |
| poster_url hoặc poster | ✓ | URL ảnh |
| description hoặc content | ✓ | Mô tả |
| status | ✓ | current / upcoming / theater |
| showtimes | ✓ | |
| is_exclusive | ✓ | 0/1 hoặc true/false |
| tmdb_id | ✓ | Số |

### Sheet `episodes` – cột build đọc

| Cột (header) | Build dùng | Ghi chú |
|--------------|------------|--------|
| movie_id | Bắt buộc | **Đồng bộ với movies**: điền **đúng số id** của phim (vd. 1, 2, 3). Có thể dùng **title** hoặc **slug** nếu movies không có cột id. |
| name | ✓ | Tên tập (vd. Tập 1) |
| sources hoặc source | ✓ | Chuỗi JSON mảng (link_embed, link_m3u8, name, slug...) |

---

## File mẫu (CSV import) – cùng cấu trúc trên

Trong thư mục `docs/google-sheets/`:

| File | Import vào sheet |
|------|-------------------|
| **movies-template.csv** | Tab tên **movies** |
| **episodes-template.csv** | Tab tên **episodes** |

**Cách tạo Sheet (vd. "ophim data") từ file mẫu:**

1. Vào [sheets.google.com](https://sheets.google.com) → tạo trang tính mới (đặt tên "ophim data" nếu muốn).
2. **File** → **Import** → **Upload** → chọn `movies-template.csv`.
   - Chọn **Replace spreadsheet** hoặc **Insert new sheet(s)**. Nếu insert, đặt tên sheet là **movies**.
3. Thêm sheet: tab **+** (Add sheet) → đặt tên **episodes**.
4. Vào sheet **episodes** → **File** → **Import** → **Upload** → chọn `episodes-template.csv` → **Replace current sheet** (hoặc chọn đúng sheet episodes).
5. Lấy **Spreadsheet ID** từ URL: `https://docs.google.com/spreadsheets/d/<ID>/edit` → trong `.env` đặt `GOOGLE_SHEETS_ID=<ID>`.

---

## Cấu hình env (build đọc Sheet)

1. **GOOGLE_SHEETS_ID**  
   ID trong URL (phần `/d/.../edit`), không phải tên spreadsheet.

2. **GOOGLE_SERVICE_ACCOUNT_KEY**  
   **Đường dẫn file** JSON của Service Account (vd. `./google-service-account.json`). Build dùng `fs.readJson(keyPath)` nên cần path, không phải nội dung JSON dán vào env.

3. **Chia sẻ Sheet**  
   Chia sẻ spreadsheet (vd. "ophim data") cho email Service Account (dạng `xxx@yyy.iam.gserviceaccount.com`) với quyền **Editor**.

Sau khi cấu hình, chạy `npm run build`; nếu đọc Sheet thành công, build sẽ merge phim từ Sheet với OPhim (và Excel fallback nếu không có Sheet).

---

## Không dùng Google Sheets

Dùng file Excel: chạy `node scripts/generate-custom-movies-template.js` → đổi tên file tạo ra thành `custom_movies.xlsx` và đặt ở **thư mục gốc** dự án. Build sẽ đọc khi không cấu hình hoặc khi Sheet lỗi.
