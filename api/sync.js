function findRedisCredentials() {
  const directPairs = [
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    ['REDIS_REST_API_URL', 'REDIS_REST_API_TOKEN']
  ];
  for (const [uKey, tKey] of directPairs) {
    if (process.env[uKey] && process.env[tKey]) {
      return { url: process.env[uKey], token: process.env[tKey] };
    }
  }
  const keys = Object.keys(process.env);
  for (const k of keys) {
    if (k.endsWith('_REST_API_URL') || k.endsWith('_REDIS_REST_URL')) {
      const tokenKey = k.replace(/_URL$/, '_TOKEN');
      if (process.env[k] && process.env[tokenKey]) {
        return { url: process.env[k], token: process.env[tokenKey] };
      }
    }
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const creds = findRedisCredentials();
  const vault = String(req.query.vault || '').replace(/[^a-zA-Z0-9_-]/g, '');

  if (!vault) return res.status(400).json({ error: 'Missing vault key' });
  if (!creds) {
    return res.status(503).json({
      error: 'Database Upstash Redis belum dihubungkan di tab Storage Vercel (atau belum Redeploy).'
    });
  }

  const key = `cv_tanih_amanah99:${vault}`;
  const base = creds.url.replace(/\/+$/, '');

  try {
    if (req.method === 'GET') {
      const r = await fetch(base, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['GET', key])
      });
      if (!r.ok) return res.status(500).json({ error: `Redis GET gagal (HTTP ${r.status})` });
      const json = await r.json();
      if (!json || !json.result) return res.status(200).json({ data: null });
      const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
      return res.status(200).json({ data: parsed });
    }

    if (req.method === 'POST') {
      const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const r = await fetch(base, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['SET', key, bodyStr])
      });
      if (!r.ok) return res.status(500).json({ error: `Redis SET gagal (HTTP ${r.status})` });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
