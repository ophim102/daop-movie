// Vercel Serverless: gọi GitHub API để trigger workflow build-on-demand
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const WEBHOOK_TOKEN = process.env.WEBHOOK_BUILD_TOKEN;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const auth =
    req.headers.authorization?.replace(/^Bearer\s+/i, '').trim() ||
    (req.headers['x-build-token'] as string) ||
    req.body?.token;
  if (WEBHOOK_TOKEN && auth !== WEBHOOK_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
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
