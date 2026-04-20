export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, token } = req.body;
  if (!url || !token) return res.status(400).json({ error: 'Missing url or token' });

  // Sécurité : on n'autorise que les appels vers businesscentral.dynamics.com
  if (!url.startsWith('https://api.businesscentral.dynamics.com/')) {
    return res.status(403).json({ error: 'URL non autorisée' });
  }

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) return res.status(response.status).json({ error: `BC API ${response.status}` });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
