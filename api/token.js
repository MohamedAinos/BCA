export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tenantId, clientId, clientSecret, scope } = req.body;
  if (!tenantId || !clientId || !clientSecret) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: scope || 'https://api.businesscentral.dynamics.com/.default',
        }),
      }
    );
    const data = await response.json();
    if (data.error) return res.status(401).json({ error: data.error_description || data.error });
    return res.status(200).json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
