# Twikoo – Hệ thống bình luận

Twikoo được nhúng vào **trang chi tiết phim** để người xem bình luận. Twikoo deploy riêng trên Vercel, kết nối MongoDB.

## Các bước cài đặt

1. **Fork / clone Twikoo**  
   Repository: [twikoo/twikoo](https://github.com/twikoo/twikoo). Deploy lên Vercel (Import Git Repository, chọn repo Twikoo).

2. **MongoDB**  
   Tạo cluster tại [mongodb.com](https://www.mongodb.com/). Lấy connection string (URI). Trong Vercel, thêm biến môi trường cho project Twikoo (ví dụ: `MONGODB_URI` theo đúng tên mà Twikoo yêu cầu).

3. **Lấy Twikoo Env ID**  
   Sau khi deploy Twikoo trên Vercel, bạn có URL dạng `https://xxx.vercel.app`. Đây chính là **envId** (hoặc base URL) dùng cho client. Xem tài liệu Twikoo để xác nhận format (có thể là full URL hoặc một id ngắn).

4. **Cấu hình trên website**  
   - **Admin Panel:** Vào Cài đặt chung (Site Settings), thêm key `twikoo_env_id` với value là URL hoặc env id của Twikoo (ví dụ: `https://twikoo-xxx.vercel.app`).  
   - **Build:** Script build đọc `site_settings` và ghi ra `site-settings.json`. Trên website, `main.js` / trang chi tiết load `site-settings.json` và truyền `twikoo_env_id` vào lời gọi `twikoo.init({ envId: ... })`.

5. **Trang chi tiết phim**  
   File `public/phim/index.html` đã có:
   - Thẻ `<div id="twikoo-comments"></div>`.
   - Script Twikoo CDN và `twikoo.init({ envId: window.DAOP.twikooEnvId, el: '#twikoo-comments', path: window.location.pathname })`.

Chỉ cần điền đúng `twikoo_env_id` trong Admin (và chạy lại build nếu cấu hình lưu trong Supabase) là bình luận sẽ hoạt động theo path từng phim.

## Lưu ý

- Nếu không điền `twikoo_env_id`, Twikoo sẽ không khởi tạo (không báo lỗi).
- Path dùng để nhóm bình luận theo từng phim (mỗi URL phim một path).
