// Vercel Serverless: kích hoạt GitHub Actions (repository_dispatch hoặc workflow_dispatch)
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_REF = process.env.GITHUB_REF || 'main';

type ActionId = 'build-on-demand' | 'update-data';

const ACTIONS: { id: ActionId; name: string; description: string }[] = [
  { id: 'build-on-demand', name: 'Build on demand', description: 'Build incremental (config Supabase + category pages), commit & push.' },
  { id: 'update-data', name: 'Update data daily', description: 'Full build (OPhim, TMDB, Sheets…), commit & push.' },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, actions: ACTIONS });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    res.status(500).json({ error: 'Missing GITHUB_TOKEN or GITHUB_REPO' });
    return;
  }
  const action = (req.body?.action ?? req.query?.action) as string;
  if (!action || !ACTIONS.some((a) => a.id === action)) {
    res.status(400).json({ error: 'Invalid action. Use one of: ' + ACTIONS.map((a) => a.id).join(', ') });
    return;
  }

  const repo = GITHUB_REPO.trim();
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${GITHUB_TOKEN.trim()}`,
    'Content-Type': 'application/json',
  };

  try {
    if (action === 'build-on-demand') {
      const r = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ event_type: 'build-on-demand', client_payload: {} }),
      });
      if (!r.ok) {
        const t = await r.text();
        let errMsg = t;
        if (r.status === 401) {
          try {
            const j = JSON.parse(t);
            if (j.message === 'Bad credentials') {
              errMsg = 'GITHUB_TOKEN không hợp lệ hoặc hết hạn.';
            }
          } catch {
            // keep raw t
          }
        }
        res.status(r.status).json({ error: errMsg });
        return;
      }
      res.status(200).json({ ok: true, message: 'Build on demand triggered' });
      return;
    }

    if (action === 'update-data') {
      const startPage = req.body?.start_page != null ? String(req.body.start_page) : undefined;
      const endPage = req.body?.end_page != null ? String(req.body.end_page) : undefined;
      const inputs: Record<string, string> = {};
      if (startPage !== undefined) inputs.start_page = startPage;
      if (endPage !== undefined) inputs.end_page = endPage;
      const r = await fetch(
        `https://api.github.com/repos/${repo}/actions/workflows/update-data.yml/dispatches`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ ref: GITHUB_REF, inputs: Object.keys(inputs).length ? inputs : undefined }),
        }
      );
      if (!r.ok) {
        const t = await r.text();
        let errMsg = t;
        if (r.status === 404) {
          try {
            const j = JSON.parse(t);
            if (j.message?.includes('Not Found')) {
              errMsg = 'Workflow update-data.yml không tìm thấy hoặc repo chưa có Actions.';
            }
          } catch {
            // keep raw t
          }
        }
        if (r.status === 401) {
          try {
            const j = JSON.parse(t);
            if (j.message === 'Bad credentials') errMsg = 'GITHUB_TOKEN không hợp lệ hoặc hết hạn.';
          } catch {
            // keep raw t
          }
        }
        res.status(r.status).json({ error: errMsg });
        return;
      }
      res.status(200).json({ ok: true, message: 'Update data (full build) triggered' });
      return;
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Trigger failed' });
  }
}
