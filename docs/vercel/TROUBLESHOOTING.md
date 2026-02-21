# Vercel build – Kiểm tra khi lỗi

## Các file liên quan đã kiểm tra

| File | Trạng thái |
|------|------------|
| **vercel.json** | Đúng: buildCommand, outputDirectory, installCommand; thêm rewrites SPA (mọi route không phải /api/* → index.html). |
| **admin/package.json** | Build script: `tsc --noEmit && vite build` (dùng `--noEmit` thay cho `-b` để tránh lỗi build mode trên Vercel). |
| **admin/tsconfig.json** | include "src", noEmit true, paths @/*. Không dùng @/ trong code → không cần alias Vite. |
| **admin/vite.config.ts** | Plugin React, server port 5174. Base mặc định '/' phù hợp deploy. |
| **admin/index.html** | Entry /src/main.tsx. |
| **api/trigger-build.ts** | Dùng @vercel/node (Vercel cung cấp). TypeScript hợp lệ. |
| **api/upload-image.ts** | Dùng @vercel/node, @aws-sdk/client-s3 (có ở root package.json). export config hợp lệ. |

## Nguyên nhân lỗi build thường gặp

1. **Thiếu biến môi trường**  
   Cần `VITE_SUPABASE_ADMIN_URL`, `VITE_SUPABASE_ADMIN_ANON_KEY` (Production). Nếu build Vite tham chiếu env khác, cũng cần khai báo trên Vercel.

2. **Lỗi TypeScript (tsc)**  
   Build dùng `tsc --noEmit` rồi `vite build`. Chạy local: `cd admin && npm run build`. Nếu báo lỗi type thì sửa trong `admin/src` rồi commit lại.

3. **Node version**  
   Vercel mặc định Node 18. Nếu cần Node 20: Project Settings → General → Node.js Version → 20.x.

4. **Cache build cũ**  
   Deployments → deployment lỗi → ⋮ → Redeploy → bỏ chọn "Use existing Build Cache".

5. **Cảnh báo "1 high severity vulnerability"**  
   Chỉ là cảnh báo npm audit, không làm fail build. Lỗi thực tế nằm ở bước **Build** (dòng đỏ trong log).

6. **Nút Build website trả 401 Unauthorized**  
   - Cần **`VITE_WEBHOOK_BUILD_TOKEN`** (cùng giá trị với `WEBHOOK_BUILD_TOKEN`) trong Vercel, chọn Production + Preview, rồi **Redeploy** (tắt Build Cache).  
   - Nếu đã khớp mà vẫn 401 (lỗi encoding/ky tự ẩn): API có **fallback same-origin** — request từ chính domain Admin (Origin/Referer trùng host) vẫn được chấp nhận. Đảm bảo bạn đang mở Admin trên cùng domain với API (vd. cùng `xxx.vercel.app`), không gọi từ domain khác.

## Sau khi sửa

Commit và push. Vercel build lại tự động. Xem log đầy đủ ở **Deployments** → bấm vào deployment → **Building** để thấy dòng báo lỗi cụ thể.
