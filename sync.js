module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const redisUrl =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.REDIS_REST_API_URL;
  const redisToken =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.REDIS_REST_API_TOKEN;

  const vault = String(req.query.vault || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!vault) {
    return res.status(400).json({ error: 'Missing vault key' });
  }
  if (!redisUrl || !redisToken) {
    return res.status(503).json({
      error: 'Upstash Redis belum terhubung di menu Storage Vercel.'
    });
  }

  const key = `cv_tanih_amanah99:${vault}`;
  const base = redisUrl.replace(/\/+$/, '');

  try {
    if (req.method === 'GET') {
      const r = await fetch(base, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['GET', key])
      });
      const json = await r.json();
      if (!json || !json.result) {
        return res.status(200).json({ data: null });
      }
      const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
      return res.status(200).json({ data: parsed });
    }

    if (req.method === 'POST') {
      const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const r = await fetch(base, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['SET', key, bodyStr])
      });
      if (!r.ok) {
        return res.status(500).json({ error: 'Gagal menyimpan ke Redis' });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
