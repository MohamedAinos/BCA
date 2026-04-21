export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Non authentifié' });

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': authHeader, 'apikey': SUPABASE_ANON_KEY }
    });
    const user = await userRes.json();
    if (!user.id) return res.status(401).json({ error: 'Token invalide' });

    const isAdmin = user.email === ADMIN_EMAIL;

    // Vérifier l'accès dans la table access_list
    const accessRes = await fetch(
      `${SUPABASE_URL}/rest/v1/access_list?user_id=eq.${user.id}&select=access,admin`,
      { headers: { 'Authorization': authHeader, 'apikey': SUPABASE_ANON_KEY } }
    );
    const accessData = await accessRes.json();
    const record = accessData[0];

    return res.status(200).json({
      access: isAdmin || record?.access === true,
      admin: isAdmin || record?.admin === true,
      email: user.email,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
