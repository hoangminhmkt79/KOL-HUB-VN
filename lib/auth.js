const crypto = require('crypto');

const COOKIE = 'kol_session';
const TTL_SEC = 12 * 3600;

const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');

// ADMIN_HASH = sha256(mật khẩu). ADMIN_PASSWORD (server-only) được chấp nhận cho tiện setup.
function adminHash() {
  if (process.env.ADMIN_HASH) return process.env.ADMIN_HASH.trim().toLowerCase();
  if (process.env.ADMIN_PASSWORD) return sha256(process.env.ADMIN_PASSWORD);
  return '';
}

function secret() {
  return process.env.SESSION_SECRET || adminHash();
}

const sign = v => crypto.createHmac('sha256', secret()).update(v).digest('hex');

function safeEqual(a, b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function checkPassword(pw) {
  const h = adminHash();
  return !!h && !!pw && safeEqual(sha256(pw), h);
}

function createSession() {
  const exp = String(Math.floor(Date.now() / 1000) + TTL_SEC);
  return `${exp}.${sign(exp)}`;
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function isAdmin(req) {
  if (!secret()) return false;
  const tok = parseCookies(req)[COOKIE];
  if (!tok) return false;
  const [exp, sig] = tok.split('.');
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return parseInt(exp, 10) > Date.now() / 1000;
}

function cookieHeader(value, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

const setSessionCookie = res => res.setHeader('Set-Cookie', cookieHeader(createSession(), TTL_SEC));
const clearSessionCookie = res => res.setHeader('Set-Cookie', cookieHeader('', 0));

const randomToken = (bytes = 18) => crypto.randomBytes(bytes).toString('base64url');
const randomCode = () => crypto.randomBytes(5).toString('hex').slice(0, 7).toUpperCase();

module.exports = { checkPassword, isAdmin, setSessionCookie, clearSessionCookie, randomToken, randomCode, adminHash, safeEqual };
