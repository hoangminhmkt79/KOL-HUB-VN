const crypto = require('crypto');
export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { password } = req.body;
  if (!password) return res.status(400).json({ ok: false });
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash === process.env.ADMIN_HASH) {
    const token = crypto.createHash('sha256').update(hash + Math.floor(Date.now()/600000)).digest('hex');
    return res.status(200).json({ ok: true, token });
  }
  setTimeout(() => res.status(401).json({ ok: false, error: 'Sai mật khẩu.' }), 600);
}
