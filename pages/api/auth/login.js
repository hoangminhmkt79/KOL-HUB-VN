import { checkPassword, setSessionCookie, adminHash } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!adminHash()) return res.status(500).json({ ok: false, error: 'Chưa cấu hình ADMIN_HASH hoặc ADMIN_PASSWORD.' });
  const { password } = req.body || {};
  if (checkPassword(password)) {
    setSessionCookie(res);
    return res.status(200).json({ ok: true });
  }
  // Chậm lại để chống dò mật khẩu
  await new Promise(r => setTimeout(r, 600));
  return res.status(401).json({ ok: false, error: 'Sai mật khẩu.' });
}
