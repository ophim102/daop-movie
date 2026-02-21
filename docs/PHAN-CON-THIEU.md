# Các phần còn thiếu cần bổ sung

Tài liệu này liệt kê các phần còn thiếu so với yêu cầu trong DA.txt và trạng thái triển khai.

## 1. Build Script (scripts/build.js)

- ✅ **Đọc player_settings từ Supabase** - Đã bổ sung
- ✅ **Xuất player-settings.json** - Đã bổ sung
- ✅ **Incremental build** - Khi chạy `node scripts/build.js --incremental` chỉ export config từ Supabase (bỏ qua fetch phim, batches, sitemap)

## 2. Admin Panel

### 2.1. Quản lý quảng cáo

- ✅ **Banner CRUD** - Form thêm/sửa/xóa, position, priority, start_date, end_date, is_active (ảnh nhập URL thủ công)
- ✅ **Banner upload R2** - API POST /api/upload-image (base64), nút "Upload R2" trong form Banner và Slider (ảnh ≤ 4MB)
- ✅ **Pre-roll ads** - Trang Admin /preroll (CRUD), build xuất preroll.json, player hiển thị pre-roll trước nội dung chính (có nút Bỏ qua sau Xs)

### 2.2. Quản lý giao diện

- ✅ **Homepage Sections** - Form thêm/sửa (title, source_type, source_value, limit_count, display_type, more_link), nút lên/xuống sort_order, bật/tắt
- ✅ **Slider** - Trang Admin /slider (CRUD slide), lưu trong site_settings `homepage_slider`; trang chủ carousel khi có slide
- ✅ **Theme Settings** - Trang Admin /theme: màu chủ đạo, nền, thẻ, nhấn; áp dụng biến CSS trên site

### 2.3. Quản lý nguồn server

- ✅ **Server Sources CRUD** - Thêm/sửa/xóa, tự tạo slug, bật/tắt

### 2.4. Cài đặt chung

- ✅ **Site Settings** - logo_url, favicon_url, social (Facebook, Twitter, Instagram, YouTube), footer_content (HTML), tmdb_attribution (Switch). Logo/favicon nhập URL, chưa upload file
- ⚠️ **Build từ Admin** - Có nút "Build website" gọi API; chưa có lịch sử build chi tiết

### 2.5. Quản lý nội dung tĩnh

- ✅ **Static Pages** - RichTextEditor (contentEditable) cho about, app_guide; form apk_link, testflight_link

### 2.6. Cài đặt Player

- ✅ **Player settings trong build** - Build đọc bảng player_settings, xuất player-settings.json
- ✅ **Trang Admin Player Settings** - /player-settings: available_players (JSON), default_player, warning_enabled_global, warning_text

## 3. Website Frontend (public/)

### 3.1. Player

- ✅ **Player engine selection** - Dropdown chọn player khi có >1 engine từ player-settings
- ✅ **Pre-roll video ads** - Đã tích hợp vào player (phát pre-roll trước, nút Bỏ qua)

### 3.2. Tìm kiếm

- ✅ **FlexSearch** - Đã tích hợp: trang /tim-kiem.html, search.js index title + origin_name, CDN FlexSearch

### 3.3. Trang chủ

- ✅ **Banner / Slider** - Load từ banners.json; nếu có homepage_slider thì hiển thị carousel
- ✅ **Section display_type** - Trang chủ hỗ trợ grid (mặc định), slider (horizontal scroll + prev/next), list (danh sách dòng)

## 4. Tài liệu và file mẫu

- ✅ **Schema SQL** - Đã có đầy đủ
- ✅ **custom_movies_template** - Script `node scripts/generate-custom-movies-template.js` tạo file mẫu; tài liệu `docs/custom-movies-template.md` liệt kê đủ cột (title, origin_name, status, showtimes, genre, country, ...)
- ✅ **config-json-examples/** - Đã có `docs/config-json-examples/` với README và file mẫu (site-settings, homepage-sections, banners, server-sources, player-settings, preroll)

## Đã bổ sung đủ theo DA

Các mục trước đây còn thiếu (Banner upload R2, custom_movies template) đã được triển khai. Có thể mở rộng thêm tùy nhu cầu (vd. lịch sử build, upload đa file, v.v.).
