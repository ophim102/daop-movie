# Vercel – Admin Panel + API

Trong repo đã có **vercel.json** (ở root) với cấu hình:
- **Install:** `npm install && cd admin && npm install`
- **Build:** `cd admin && npm run build`
- **Output:** `admin/dist`
- **Root Directory:** để trống (root repo) để thư mục `api/` được nhận.

1. Import project từ GitHub, **Root Directory** để trống (hoặc `.`).
2. Build và output sẽ lấy từ `vercel.json`; không cần chỉnh tay trừ khi bạn override trong Dashboard.
3. Thư mục `api/` ở root (trigger-build.ts, upload-image.ts) tự deploy thành `/api/trigger-build`, `/api/upload-image`.
4. Biến môi trường (Vercel Dashboard):
   - `VITE_SUPABASE_ADMIN_URL`, `VITE_SUPABASE_ADMIN_ANON_KEY` cho frontend admin.
   - `GITHUB_TOKEN`, `GITHUB_REPO` cho API trigger build.
   - (Upload ảnh R2) `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` cho `/api/upload-image`.
5. Subdomain: cấu hình domain `admin.yourdomain.com` trỏ về project Vercel.

## Build lỗi trên Vercel

- **Install xong nhưng bước Build báo lỗi:** Mở **Deployments** → bấm deployment lỗi → xem **Building** log đầy đủ. Thường gặp:
  - Thiếu env: cần `VITE_SUPABASE_ADMIN_URL`, `VITE_SUPABASE_ADMIN_ANON_KEY` (nếu build Vite tham chiếu).
  - Lỗi TypeScript: chạy local `cd admin && npm run build` để xem lỗi tương tự.
  - Node version: Vercel mặc định Node 18; nếu cần 20, trong Dashboard → Settings → General → **Node.js Version** chọn 20.x.
- **"removed 2 packages"** hoặc **"added 198 packages"** khi install: bình thường. Tiếp theo log sẽ chạy `cd admin && npm install` rồi **Build**.
- **"1 high severity vulnerability"** (npm audit): Thường chỉ là **cảnh báo**, không tự làm fail build. Nếu build vẫn đỏ, lỗi thường nằm ở **bước Build** (dòng chữ đỏ), không phải ở dòng vulnerability.
  - Để giảm cảnh báo: trên máy chạy `npm audit` (ở root và trong `admin/`), rồi `npm audit fix` (hoặc `npm audit fix --force` cẩn thận), commit `package-lock.json` và push.
  - Cảnh báo **deprecated node-domexception**: đến từ dependency (vd. node-fetch), có thể bỏ qua hoặc cập nhật package khi có bản mới.
- Nếu bạn đã chỉnh **Build/Install/Output** trong Dashboard, có thể bỏ override để dùng **vercel.json** trong repo.
