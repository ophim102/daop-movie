# Cloudflare — tất cả thứ cần tạo & chú thích

**Mục lục tổng:** [../README.md](../README.md).

Một tài khoản [Cloudflare](https://dash.cloudflare.com) có thể gồm nhiều dịch vụ DAOP dùng tới. Làm theo thứ tự: **bắt buộc cho site** → **Comment** (nếu bật D1/KV). Ảnh thumbnail/poster thường đi qua GitHub + jsDelivr (xem `IMAGE_CDN_BASE`, `IMAGES_*`). Chi tiết deploy: [../TRIEN-KHAI.md](../TRIEN-KHAI.md) (Bước 4), checklist GitHub: [../env/github.env.example](../env/github.env.example).

**Mục lục trang này (cuộn theo số mục):** §1 Tài khoản · §2 Pages · §3 Ảnh/CDN · §4 Comment · §5 Bảng tổng hợp · §6 Liên kết nhanh

---

## 1. Thông tin tài khoản (dùng mọi nơi)

| Cần lấy | Mô tả | Lưu ở đâu |
|--------|--------|-----------|
| **Account ID** | Chuỗi 32 ký tự hex (ví dụ trong sidebar Dashboard hoặc **Overview** domain). Xác định *tài khoản* Cloudflare của bạn. | GitHub Secret `CLOUDFLARE_ACCOUNT_ID` |
| **API Token (Account)** | Token do bạn tạo (**My Profile → API Tokens → Create Token**), cấp quyền theo bảng dưới. Không nhầm với **Global API Key** cũ. | GitHub Secret `CLOUDFLARE_API_TOKEN` |

**Gợi ý quyền token deploy (một token cho gọn):**

- **Account → Cloudflare Pages → Edit** — để GitHub Actions/Wangler đẩy thư mục `public/` lên Pages.

Có thể tách hai token (chỉ Pages) nếu muốn thu hẹp quyền.

---

## 2. Cloudflare Pages — website tĩnh (`public/`)

| Việc cần làm | Chú thích |
|--------------|-----------|
| **Tạo project** | **Workers & Pages → Create → Pages → Direct Upload**. **Không** chọn “Connect to Git” (repo deploy qua GitHub Actions + Wrangler). |
| **Đặt tên project** | Tên này là `project-name` trong lệnh `wrangler pages deploy … --project-name=…`. Nếu khác mặc định `daop` trong workflow, thêm GitHub **Variable** `CLOUDFLARE_PAGES_PROJECT_NAME`. |
| **Deployment đầu** | Workflow `deploy.yml` chạy khi push `main` (và một số trường hợp `workflow_run`). Cần đã có nội dung trong repo nhánh `main` sau build (`public/`). |
| **URL mặc định** | `https://<tên-project>.pages.dev` |
| **Routing phim** | Chi tiết slug/hash: [TRIEN-KHAI.md § routing](../TRIEN-KHAI.md) (404 → `404.html` → hash trên `phim/index.html`). |

**Biến môi trường trên chính project Pages** (Dashboard → project → **Settings → Environment variables**):

| Biến | Bắt buộc khi | Ý nghĩa |
|------|----------------|---------|
| `SUPABASE_JWT_SECRET` | Bật **comment nội bộ** | **JWT Secret** của project Supabase **User** (Settings → API → *JWT Secret*). Pages Functions verify Bearer token người xem. Không để lộ lên frontend ngoài cơ chế server. |
| `COMMENTS_ADMIN_SECRET` | Export/import comment từ **Admin** (tab Comment D1) | Chỉ thêm dạng **Secret (mã hóa)** trên Pages hoặc `wrangler pages secret put` — **không** dùng `[vars]` trong `wrangler.toml` cho giá trị này. Chi tiết: [comments/README.md](../comments/README.md) mục 6. |

Các secret khác (TMDB, Supabase Admin…) **không** cần trên Pages — chúng chạy trên GitHub Actions hoặc Vercel.

**Domain riêng (tùy chọn):** Pages → **Custom domains** → thêm tên miền; DNS/SSL theo hướng dẫn Cloudflare. Có thể dùng `SITE_URL` khi build nếu cần sitemap/robots đúng domain (xem TRIEN-KHAI).

---

## 3. Ảnh/CDN (GitHub + jsDelivr)

Ảnh thumbnail/poster thường được lưu trong **GitHub repo ảnh** (layout `public/thumbs/`, `public/posters/`) và được public qua jsDelivr theo `IMAGE_CDN_BASE`.

Cloudflare chỉ cần **Pages** để host website tĩnh; không cần storage riêng cho ảnh.

## 4. Comment nội bộ — D1 + KV + Pages Functions

Chỉ cần khi dùng hệ thống comment trong `functions/api/comment/`.

### Checklist nhanh (dễ làm nhất)

1. **Tạo D1 database** (lưu dữ liệu comment)
2. **Tạo 2 KV namespaces** (cache + rate limit)
3. **Điền ID vào `wrangler.toml`** (bindings: `DB`, `COMMENT_CACHE`, `COMMENT_RATE_LIMIT`)
4. **Chạy migrations** để tạo bảng trong D1
5. **Set Environment Variables trên Cloudflare Pages**:
   - `SUPABASE_JWT_SECRET` (bắt buộc)
   - `COMMENTS_ADMIN_SECRET` (tùy chọn, dạng Secret/encrypted)
6. **Deploy lại** (để Pages Functions nhận bindings + env)

### 4.1 Tạo D1 database + 2 KV namespaces

Bạn có 2 cách. **Khuyên dùng CLI** vì copy/paste ID nhanh và ít nhầm.

> Nếu bạn **giữ nguyên cấu hình có sẵn** trong `wrangler.toml` (D1 `database_name = "ophimcomment"` và đã có `database_id`/KV `id`), bạn có thể **bỏ qua bước tạo mới** ở mục này và chuyển thẳng tới:
> - **4.3 Chạy migrations**
> - **4.4 Set Environment Variables**

**Cách A — CLI (khuyến nghị):**

```bash
# 1) Login Wrangler (mở browser để authorize)
npx wrangler login

# 2) Tạo D1 (giữ nguyên tên như repo đang dùng)
npx wrangler d1 create ophimcomment

# 3) Tạo 2 KV namespaces
npx wrangler kv namespace create COMMENT_CACHE
npx wrangler kv namespace create COMMENT_RATE_LIMIT
```

Sau mỗi lệnh, Wrangler sẽ in ra **database_id** (D1) và **id** (KV). Copy các ID đó để điền vào `wrangler.toml`.

**Cách B — Dashboard (nếu không dùng CLI):**
- D1: **Workers & Pages → D1 → Create database**
- KV: **Workers & Pages → KV → Create namespace** (tạo 2 namespace theo đúng tên)
- Sau khi tạo, vào chi tiết từng resource để copy **ID**.

### 4.2 Điền bindings vào `wrangler.toml`

File `wrangler.toml` ở root repo đã có sẵn cấu trúc đúng. Bạn chỉ cần thay các giá trị sau cho đúng resource bạn vừa tạo:

- `[[d1_databases]]`
  - `binding = "DB"` (**giữ nguyên**)
  - `database_name = "<tên-db>"` (tên bạn tạo)
  - `database_id = "<database_id>"` (ID bạn copy)
- `[[kv_namespaces]]`
  - `binding = "COMMENT_CACHE"` + `id = "<id>"`
  - `binding = "COMMENT_RATE_LIMIT"` + `id = "<id>"`

### 4.3 Chạy migrations (tạo bảng trong D1)

Chạy 2 file migration có sẵn trong repo:

```bash
npx wrangler d1 execute ophimcomment --file=./migrations/001_comments.sql
npx wrangler d1 execute ophimcomment --file=./migrations/002_comment_reactions.sql
```

Lưu ý: `ophimcomment` ở trên là **database_name** trong `wrangler.toml`. Nếu bạn đặt tên khác thì thay lại cho đúng.

### 4.4 Set Environment Variables trên Cloudflare Pages (bắt buộc)

Vào **Cloudflare Dashboard → Workers & Pages → Pages → (project của bạn) → Settings → Variables and Secrets**.

- **`SUPABASE_JWT_SECRET` (bắt buộc)**:
  - Lấy ở **Supabase User project** → **Settings → API → JWT Secret**
  - Set cho đúng environment bạn deploy (thường **Production**; nếu bạn dùng Preview thì set cả Preview)

### 4.5 `COMMENTS_ADMIN_SECRET` (tùy chọn, chỉ khi muốn export/import từ Admin)

Nếu bạn muốn dùng tính năng export/import comment từ Admin, bạn cần thêm secret này (khuyên 16–32 ký tự).

**Cách A — Dashboard:**
- Cũng tại **Variables and Secrets** → **Add**
- Name: `COMMENTS_ADMIN_SECRET`
- Chọn **Secret / Encrypt**
- Dán giá trị

**Cách B — CLI (ổn định nhất khi UI hạn chế):**

```bash
npx wrangler pages secret put COMMENTS_ADMIN_SECRET --project-name=TÊN_PROJECT_PAGES
```

### 4.6 Deploy lại để nhận bindings + env

Sau khi đổi `wrangler.toml` hoặc set env/secrets, hãy deploy lại Pages (workflow `deploy.yml` / push `main`).

### 4.7 Test nhanh

- Mở 1 trang phim (`/phim/...`) hoặc xem phim (`/xem-phim/...`) và kéo tới khu vực comment.
- Nếu chưa đăng nhập: sẽ hiện nút đăng nhập.
- Nếu đã đăng nhập: thử gửi 1 comment.

Muốn xem hướng dẫn chi tiết hơn (API export/import, lỗi 401/503, rate limit…): xem `docs/comments/README.md`.

| Thành phần | Việc cần làm | Chú thích |
|------------|--------------|-----------|
| **D1** | `wrangler d1 create <tên-db>` (hoặc tạo trong Dashboard) | Lưu bảng comment. Copy `database_id` vào `wrangler.toml` (`[[d1_databases]]`). |
| **KV (cache)** | `wrangler kv namespace create COMMENT_CACHE` | Binding `COMMENT_CACHE` trong `wrangler.toml`. |
| **KV (rate limit)** | `wrangler kv namespace create COMMENT_RATE_LIMIT` | Binding `COMMENT_RATE_LIMIT`. |
| **Migration** | `wrangler d1 execute … --file=migrations/001_comments.sql` | Tạo schema bảng `comments`. |
| **JWT** | `SUPABASE_JWT_SECRET` trên **Pages → Environment variables** | Lấy từ Supabase User project; phải khớp secret ký token đăng nhập. |

**`wrangler.toml` ở root repo:** khai báo `pages_build_output_dir = "public"`, binding D1/KV; khi deploy bằng `wrangler pages deploy`, Cloudflare gắn Functions trong `functions/` với project Pages. **Không nên** commit giá trị bí mật thật vào `[vars]` trong Git — ưu tiên Dashboard.

Chi tiết file, API, frontend: [../comments/README.md](../comments/README.md).

---

## 5. Bảng tổng hợp “tạo trên Cloudflare”

| STT | Tạo trong Dashboard / CLI | Mục đích |
|-----|---------------------------|----------|
| 1 | Tài khoản Cloudflare | Truy cập mọi dịch vụ. |
| 2 | **API Token** (Pages) | Deploy Pages từ GitHub. |
| 3 | Ghi nhớ **Account ID** | `CLOUDFLARE_ACCOUNT_ID`. |
| 4 | **Pages project** (Direct Upload) | Host website; tên project khớp `CLOUDFLARE_PAGES_PROJECT_NAME` hoặc `daop`. |
| 5 | (Tùy chọn) **Repo ảnh + CDN** (`IMAGE_CDN_BASE`, `IMAGES_*`) | Ảnh build + hiển thị trên site. |
| 6 | (Tùy chọn) **D1** + **2 KV** + migration + `SUPABASE_JWT_SECRET` | Comment nội bộ. |
| 7 | (Tùy chọn) **Custom domain** Pages | Thương hiệu, URL đẹp. |

---

## 6. Liên kết nhanh tài liệu con

- Deploy Pages (ngắn): [../cloudflare-pages/README.md](../cloudflare-pages/README.md)
- Ảnh / CDN: xem [../vercel/README.md](../vercel/README.md) và [../github-actions/README.md](../github-actions/README.md)
- Comment: [../comments/README.md](../comments/README.md)
- GitHub (repo, deploy token): [../github/README.md](../github/README.md) — Secrets mẫu [../env/github.env.example](../env/github.env.example)
- Vercel (Admin + API): [../vercel/README.md](../vercel/README.md)
- Supabase (JWT `SUPABASE_JWT_SECRET`): [../supabase/README.md](../supabase/README.md)
