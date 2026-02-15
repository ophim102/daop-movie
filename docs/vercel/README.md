# Vercel – Admin Panel + API

1. Import project, chọn thư mục **admin** (hoặc root nếu cấu hình root là admin).
2. Nếu repo có cả admin và api:
   - Root: đặt **Root Directory** là `admin` cho frontend.
   - Hoặc dùng monorepo: build command `cd admin && npm run build`, output `admin/dist`.
3. Thêm API (Serverless): tạo thư mục `api/` ở root với file `trigger-build.ts`. Vercel tự nhận các file trong `api/` thành serverless functions tại `/api/*`.
4. Biến môi trường (Vercel Dashboard):
   - `VITE_SUPABASE_ADMIN_URL`, `VITE_SUPABASE_ADMIN_ANON_KEY` cho frontend admin.
   - `GITHUB_TOKEN`, `GITHUB_REPO`, `WEBHOOK_BUILD_TOKEN` cho API trigger build.
5. Subdomain: cấu hình domain `admin.yourdomain.com` trỏ về project Vercel.
