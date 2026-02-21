# Supabase – Hai project riêng biệt

## 1. Supabase User

- Dùng cho **người dùng cuối**: đăng nhập, danh sách yêu thích, lịch sử xem.
- Bật Auth: Email/Password và (tùy chọn) Google OAuth.
- Chạy file `schema-user.sql` trong SQL Editor để tạo bảng: `profiles`, `favorites`, `watch_history`, `user_changes` và RLS.
- Website chính (frontend) kết nối bằng **anon key**; RLS đảm bảo user chỉ đọc/ghi dữ liệu của mình.

## 2. Supabase Admin

- Dùng cho **quản trị**: cấu hình banner, sections, server sources, site settings, donate, static pages, audit log.
- Chỉ **Admin Panel** và **script build** kết nối tới project này.
- Build script dùng **service_role key** để đọc toàn bộ và xuất file JSON.
- Admin Panel dùng **anon key** + RLS; chỉ user có claim `app_metadata.role = 'admin'` mới truy cập được.
- Chạy file `schema-admin.sql` trong SQL Editor.
- **Nếu đã chạy schema cũ:** chạy thêm `fix-admin-rls.sql` để sửa RLS (role nằm trong app_metadata, không phải top-level).

## Cấu hình role admin

1. Tạo user: Authentication → Users → Add user (email + mật khẩu).
2. Gán role admin (SQL Editor):  
   `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb where email = 'admin@example.com';`
3. Admin Panel có trang **Đăng nhập** (`/login`). Đăng nhập bằng email/mật khẩu trên → JWT chứa `app_metadata.role = 'admin'` → RLS cho phép đọc/ghi.
