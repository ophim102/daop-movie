# Google Sheets – Phim custom

1. Tạo Google Sheet với hai sheet: **movies** và **episodes**.
2. Sheet **movies**: các cột (có thể thêm bớt):
   - id, title, origin_name, type, year, genre, country, language, description, content
   - thumb_url, poster_url, tmdb_id, imdb_id, director, cast, tags, quality
   - status (current/upcoming/theater), showtimes, is_exclusive
3. Sheet **episodes**: movie_id (hoặc slug), name, sources (JSON string mảng nguồn).
4. Tạo Service Account trong Google Cloud Console, tải file JSON. Cấu hình biến env:
   - `GOOGLE_SHEETS_ID`: ID của sheet (trong URL).
   - `GOOGLE_SERVICE_ACCOUNT_KEY`: đường dẫn tới file JSON hoặc nội dung JSON (tùy cách đọc trong build).
5. Chia sẻ sheet cho email trong Service Account (editor).
6. File mẫu Excel: xem `docs/templates/custom_movies_template.xlsx` (tạo bằng Excel với các cột tương tự, lưu thành .xlsx). Nếu không dùng Sheets, đặt file `custom_movies.xlsx` ở thư mục gốc dự án để build đọc fallback.
