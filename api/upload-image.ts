/**
 * Vercel Serverless: upload ảnh lên R2 (Banner, Slider...).
 * POST body JSON: { image: base64String, contentType?: "image/jpeg" | "image/png" | "image/webp" }
 * Trả về: { url: string } hoặc { error: string }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const key = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !key || !secret) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: key, secretAccessKey: secret },
  });
}

export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = req.body as { image?: string; contentType?: string };
  const base64 = body?.image;
  if (!base64 || typeof base64 !== 'string') {
    res.status(400).json({ error: 'Thiếu field image (base64)' });
    return;
  }
  let contentType = (body.contentType || 'image/jpeg').toLowerCase();
  if (!ALLOWED_TYPES.includes(contentType)) contentType = 'image/jpeg';
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : contentType === 'image/gif' ? 'gif' : 'jpg';
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    res.status(400).json({ error: 'Base64 không hợp lệ' });
    return;
  }
  if (buffer.length > MAX_SIZE) {
    res.status(400).json({ error: 'Ảnh tối đa 4MB' });
    return;
  }
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) {
    const missing = [];
    if (!process.env.R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
    if (!process.env.R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
    if (!process.env.R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
    if (!process.env.R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');
    if (!process.env.R2_PUBLIC_URL) missing.push('R2_PUBLIC_URL');
    const msg = missing.length
      ? `Chưa cấu hình R2. Thiếu biến môi trường: ${missing.join(', ')}. Vui lòng thêm vào Vercel Environment Variables.`
      : 'Chưa cấu hình R2. Vui lòng thêm các biến R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL vào Vercel Environment Variables.';
    res.status(503).json({ error: msg });
    return;
  }
  const key = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Upload R2 thất bại' });
    return;
  }
  const baseUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  const url = baseUrl ? `${baseUrl}/${key}` : '';
  res.status(200).json({ url });
}
