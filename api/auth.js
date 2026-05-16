// POST /api/auth
// Prüft das Admin-Passwort gegen die ADMIN_PASSWORD Env-Var.
// Kein Passwort gesetzt = immer ok (offener Zugang).

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { password } = req.body || {};
  const expected = process.env.ADMIN_PASSWORD;

  // Kein Passwort konfiguriert → immer erlaubt
  if (!expected) return res.status(200).json({ ok: true });

  if (password === expected) return res.status(200).json({ ok: true });

  return res.status(401).json({ ok: false, error: "Falsches Passwort" });
}
