# Cloudflare Pages – Deploy website chính (Direct Upload)

Dự án dùng một cách duy nhất: **Direct Upload + GitHub Actions** (không dùng Connect to Git).

1. Tạo project Pages theo kiểu **Direct Upload** trong Cloudflare.
2. Dùng workflow `.github/workflows/deploy.yml` để deploy thư mục `public/`.
3. Cấu hình GitHub Secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - (tùy chọn) variable `CLOUDFLARE_PAGES_PROJECT_NAME`
4. Build dữ liệu bằng workflow `update-data` hoặc `build-on-demand` để cập nhật `public/data`, rồi workflow deploy sẽ đẩy bản mới lên Pages.
5. Redirect: file `public/_redirects` đã cấu hình `/phim/*` → `/phim/index.html` 200 để một trang chi tiết phim phục vụ mọi slug.
