# Capacitor – Đóng gói app Android / iOS / Android TV

1. Build website: đảm bảo thư mục `public/` đã có đầy đủ file (sau khi chạy `npm run build` ở root).
2. Cài Capacitor: `npm install @capacitor/core @capacitor/cli`, `npx cap init`.
3. Thêm platform: `npx cap add android`, `npx cap add ios`.
4. Cấu hình `capacitor.config.ts`: `webDir` trỏ tới `public` (hoặc copy nội dung `public/` vào `www/`).
5. Copy web: `npx cap copy` (hoặc copy thủ công `public/*` → `www/`).
6. Mở IDE: `npx cap open android` / `npx cap open ios`.
7. Android TV: thêm intent-filter và hỗ trợ điều khiển (D-pad, focus) trong layout; xử lý key event trong JS (player, navigation).
8. iOS: build và phân phối qua TestFlight (hướng dẫn trên developer.apple.com).
