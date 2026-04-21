export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Non authentifié' });

  try {
    if (req.method === 'GET') {
      // Récupérer le profil (identifiants BC sauvegardés)
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { 'Authorization': authHeader, 'apikey': SUPABASE_ANON_KEY }
      });
      const user = await userRes.json();
      if (!user.id) return res.status(401).json({ error: 'Token invalide' });

      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}&select=*`,
        { headers: { 'Authorization': authHeader, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' } }
      );
      const profiles = await profileRes.json();
      return res.status(200).json({ user, profile: profiles[0] || null });

    } else if (req.method === 'POST') {
      // Sauvegarder le profil (identifiants BC chiffrés)
      const { tenantId, clientId, clientSecret, envName, companyName } = req.body;
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { 'Authorization': authHeader, 'apikey': SUPABASE_ANON_KEY }
      });
      const user = await userRes.json();
      if (!user.id) return res.status(401).json({ error: 'Token invalide' });

      // Upsert profil
      const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader, 'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ user_id: user.id, tenant_id: tenantId, client_id: clientId, client_secret: clientSecret, env_name: envName, company_name: companyName, updated_at: new Date().toISOString() })
      });
      return res.status(200).json({ success: true });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
