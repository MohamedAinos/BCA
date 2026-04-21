export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Non authentifié' });

  try {
    // Vérifier que c'est bien l'admin
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': authHeader, 'apikey': SUPABASE_ANON_KEY }
    });
    const user = await userRes.json();
    if (!user.id || user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Accès réservé à l\'administrateur' });
    }

    const serviceKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

    if (req.method === 'GET') {
      // Lister tous les utilisateurs avec leur statut d'accès
      const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`, {
        headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }
      });
      const usersData = await usersRes.json();
      const users = usersData.users || [];

      // Récupérer la liste d'accès
      const accessRes = await fetch(`${SUPABASE_URL}/rest/v1/access_list?select=*`, {
        headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }
      });
      const accessList = await accessRes.json();
      const accessMap = {};
      (accessList || []).forEach(a => { accessMap[a.user_id] = a; });

      const result = users
        .filter(u => u.email !== ADMIN_EMAIL)
        .map(u => ({
          user_id: u.id,
          email: u.email,
          created_at: u.created_at,
          access: accessMap[u.id]?.access === true,
          admin: accessMap[u.id]?.admin === true,
        }));

      return res.status(200).json({ users: result });
    }

    if (req.method === 'POST') {
      const { action, user_id, email, access } = req.body;

      if (action === 'toggle_access') {
        // Upsert dans access_list
        await fetch(`${SUPABASE_URL}/rest/v1/access_list`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey,
            'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ user_id, access, updated_at: new Date().toISOString() })
        });
        return res.status(200).json({ success: true });
      }

      if (action === 'grant_by_email') {
        // Trouver l'utilisateur par email
        const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`, {
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey }
        });
        const usersData = await usersRes.json();
        const found = (usersData.users || []).find(u => u.email === email);
        if (!found) return res.status(404).json({ error: `Utilisateur ${email} non trouvé — il doit d'abord créer son compte` });

        await fetch(`${SUPABASE_URL}/rest/v1/access_list`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey,
            'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ user_id: found.id, access: true, updated_at: new Date().toISOString() })
        });
        return res.status(200).json({ success: true });
      }
    }

    return res.status(400).json({ error: 'Action invalide' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
