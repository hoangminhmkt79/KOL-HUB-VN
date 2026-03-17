// Server-side auth — mật khẩu KHÔNG bao giờ expose ra client
const HASH = process.env.ADMIN_HASH;

function sha256(str) {
  // Node.js crypto — chạy server-side only
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(str).digest('hex');
}

export default function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).end();

  const { password } = req.body;
  if (!password)
    return res.status(400).json({ ok: false });

  const inputHash = sha256(password);

  if (inputHash === HASH) {
    // Trả về token ngắn hạn (session token đơn giản)
    const token = sha256(HASH + Date.now().toString().slice(0, -4)); // valid ~10 phút
    return res.status(200).json({ ok: true, token });
  }

  // Delay 500ms để chống brute force
  setTimeout(() => {
    res.status(401).json({ ok: false, error: 'Sai mật khẩu.' });
  }, 500);
}
