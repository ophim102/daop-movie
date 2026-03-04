// Vercel Serverless: lấy danh sách GitHub Actions workflow runs gần đây
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;

type RunRow = {
  id: number;
  name: string;
  display_title?: string;
  event: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_attempt?: number;
  actor?: { login?: string };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    res.status(500).json({ error: 'Missing GITHUB_TOKEN or GITHUB_REPO' });
    return;
  }

  const perPageRaw = req.query?.per_page;
  const perPageNum = perPageRaw != null ? Number(perPageRaw) : 20;
  const per_page = Number.isFinite(perPageNum) ? Math.max(1, Math.min(50, perPageNum)) : 20;

  const pageRaw = req.query?.page;
  const pageNum = pageRaw != null ? Number(pageRaw) : 1;
  const page = Number.isFinite(pageNum) ? Math.max(1, Math.min(50, pageNum)) : 1;

  const repo = String(GITHUB_REPO).trim();

  try {
    const r = await fetch(
      `https://api.github.com/repos/${repo}/actions/runs?per_page=${per_page}&page=${page}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          Authorization: `Bearer ${String(GITHUB_TOKEN).trim()}`,
        },
      }
    );

    const text = await r.text();
    if (!r.ok) {
      res.status(r.status).json({ error: text || `GitHub API error ${r.status}` });
      return;
    }

    const j = JSON.parse(text || '{}');
    const runs = Array.isArray(j.workflow_runs) ? (j.workflow_runs as RunRow[]) : [];

    const out = runs.map((x) => ({
      id: x.id,
      name: x.name,
      display_title: x.display_title,
      event: x.event,
      status: x.status,
      conclusion: x.conclusion,
      html_url: x.html_url,
      created_at: x.created_at,
      updated_at: x.updated_at,
      run_attempt: x.run_attempt,
      actor: { login: x.actor?.login },
    }));

    res.status(200).json({ ok: true, runs: out, total_count: j.total_count ?? out.length });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch workflow runs' });
  }
}
