# Cloudflare Pages – Deploy website chính

1. Kết nối repository GitHub với Cloudflare Pages.
2. Build settings:
   - **Build command:** `npm run build` (chạy script build; nếu chỉ deploy file tĩnh có sẵn thì để trống).
   - **Build output directory:** `public`
   - **Root directory:** (để trống hoặc `/`)
3. Nếu dùng GitHub Actions để build và push, thì trên Pages chọn "Direct Upload" và dùng workflow deploy với `cloudflare/pages-action` thay vì build trên Cloudflare.
4. Biến môi trường: thêm các biến cần cho build (TMDB, Supabase, R2...) nếu build chạy trên Cloudflare.
5. Redirect: file `public/_redirects` đã cấu hình `/phim/*` → `/phim/index.html` 200 để một trang chi tiết phim phục vụ mọi slug.
