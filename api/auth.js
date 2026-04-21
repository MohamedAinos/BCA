export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email, password } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase non configuré' });
  }

  try {
    let endpoint, body;

    if (action === 'signup') {
      endpoint = `${SUPABASE_URL}/auth/v1/signup`;
      body = { email, password };
    } else if (action === 'login') {
      endpoint = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
      body = { email, password };
    } else if (action === 'logout') {
      const { token } = req.body;
      const r = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY }
      });
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ error: 'Action invalide' });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (data.error || data.error_description || data.msg) {
      return res.status(400).json({ error: data.error_description || data.msg || data.error });
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
