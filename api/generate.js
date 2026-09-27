// AI 图片生成代理：密钥保存在 Vercel 环境变量，前端静态站跨域调用。
export const maxDuration = 60;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { prompt, size, model: modelReq } = req.body || {};
  const text = String(prompt || '').trim();
  if (!text || text.length > 600) return res.status(400).json({ error: 'invalid prompt' });
  const allowed = ['1024x1024', '1536x1024', '1024x1536'];
  const sz = allowed.includes(size) ? size : '1024x1024';

  const base = process.env.IMAGE_API_BASE;
  const key = process.env.IMAGE_API_KEY;
  const model = modelReq === 'fast' ? 'gpt-image-2' : (process.env.IMAGE_MODEL || 'gpt-image-2');
  if (!base || !key) return res.status(500).json({ error: 'server not configured' });

  try {
    const upstream = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text, size: sz, n: 1 })
    });
    const json = await upstream.json().catch(() => null);
    const item = json?.data?.[0];
    const imageUrl = item?.b64_json ? `data:image/png;base64,${item.b64_json}` : (item?.url || null);
    if (!imageUrl) return res.status(502).json({ error: 'upstream no image', detail: JSON.stringify(json).slice(0, 200) });
    return res.status(200).json({ imageUrl, revised: item.revised_prompt || null });
  } catch (e) {
    return res.status(502).json({ error: String(e).slice(0, 200) });
  }
}
