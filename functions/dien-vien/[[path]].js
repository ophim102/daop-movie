/**
 * Cloudflare Pages Function: phục vụ /dien-vien/index.html cho mọi URL /dien-vien/* (giữ nguyên URL).
 * Tránh tạo hàng trăm file HTML theo từng diễn viên; một function xử lý tất cả.
 * LƯU Ý: Thư mục functions/ phải ở root dự án (cùng cấp public/), không nằm trong public/.
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const indexUrl = new URL('/dien-vien.html', url.origin);
  const res = await env.ASSETS.fetch(new Request(indexUrl, { headers: request.headers }));
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
