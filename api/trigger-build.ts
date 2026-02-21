// Vercel Serverless: gọi GitHub API để trigger workflow build-on-demand
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const WEBHOOK_TOKEN = process.env.WEBHOOK_BUILD_TOKEN;

function normalize(s: string | undefined): string {
  if (s == null || typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim();
}

export const config = { api: { bodyParser: true } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const bodyToken = typeof req.body === 'object' && req.body && 'token' in req.body
    ? (req.body as { token?: string }).token
    : undefined;
  const auth = normalize(
    req.headers.authorization?.replace(/^Bearer\s+/i, '').trim() ||
    (req.headers['x-build-token'] as string) ||
    bodyToken ||
    ''
  );
  const expected = normalize(WEBHOOK_TOKEN || '');
  if (expected && auth !== expected) {
    res.status(401).json({
      error: 'Unauthorized',
      hint: `Token nhận được: ${auth.length} ký tự; token server: ${expected.length} ký tự. Nếu khác độ dài thì copy lại; nếu cùng độ dài thì có thể do ký tự ẩn — thử tạo token mới (chỉ chữ/số) trong Vercel.`,
    });
    return;
  }
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    res.status(500).json({ error: 'Missing GITHUB_TOKEN or GITHUB_REPO' });
    return;
  }
  try {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_type: 'build-on-demand', client_payload: {} }),
    });
    if (!r.ok) {
      const t = await r.text();
      res.status(r.status).json({ error: t });
      return;
    }
    res.status(200).json({ ok: true, message: 'Build triggered' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Trigger failed' });
  }
}
