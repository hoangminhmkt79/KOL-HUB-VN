const { isAdmin } = require('./auth');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// route({ GET, POST, ... }, { admin: true | ['GET'] })
//  admin: true  → mọi method cần đăng nhập admin
//  admin: [...] → chỉ các method liệt kê cần admin
function route(handlers, opts = {}) {
  return async (req, res) => {
    const fn = handlers[req.method];
    if (!fn) {
      res.setHeader('Allow', Object.keys(handlers));
      return res.status(405).json({ error: 'Method không hỗ trợ.' });
    }
    const needAdmin = opts.admin === true || (Array.isArray(opts.admin) && opts.admin.includes(req.method));
    if (needAdmin && !isAdmin(req)) return res.status(401).json({ error: 'Chưa đăng nhập.' });
    try {
      const out = await fn(req, res);
      if (out !== undefined && !res.headersSent) res.status(200).json(out);
    } catch (e) {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
      if (e.code === '23505') return res.status(409).json({ error: 'Dữ liệu bị trùng.' });
      if (e.code === '42P01' || e.code === '42703') return res.status(500).json({ error: 'Database chưa được nâng cấp. Vào Automation → Khởi tạo DB.' });
      console.error(e);
      return res.status(500).json({ error: 'Lỗi server.' });
    }
  };
}

const bad = msg => { throw new HttpError(400, msg); };
const notFound = (msg = 'Không tìm thấy.') => { throw new HttpError(404, msg); };
const toInt = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
const toId = v => { const n = toInt(v, NaN); if (!Number.isFinite(n) || n <= 0) bad('ID không hợp lệ.'); return n; };

module.exports = { route, HttpError, bad, notFound, toInt, toId };
