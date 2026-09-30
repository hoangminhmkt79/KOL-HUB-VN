// Link tracking bài đăng group FB: đếm click, lưu cookie kol_acq 30 ngày, chuyển về landing.
import { query } from '../../lib/db';

const CODE_RE = /^[A-Z0-9]{4,16}$/;
const BOT_RE = /bot|crawl|spider|facebookexternalhit|facebookcatalog|preview|slurp|headless/i;

export async function getServerSideProps({ params, req, res }) {
  const code = String(params.code || '').toUpperCase();
  if (!CODE_RE.test(code)) return { redirect: { destination: '/', permanent: false } };
  let ok = false;
  try {
    const isBot = BOT_RE.test(req.headers['user-agent'] || '') || req.headers.purpose === 'prefetch';
    const r = isBot
      ? await query('SELECT code FROM fb_posts WHERE code=$1', [code])
      : await query('UPDATE fb_posts SET clicks=clicks+1 WHERE code=$1 RETURNING code', [code]);
    ok = r.rows.length > 0;
  } catch (e) {
    console.error(e);
  }
  if (!ok) return { redirect: { destination: '/', permanent: false } };
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `kol_acq=${code}; Path=/; Max-Age=${30 * 86400}; SameSite=Lax${secure}`);
  res.setHeader('Cache-Control', 'no-store');
  return { redirect: { destination: `/?src=fb&acq=${code}`, permanent: false } };
}

export default function Jump() { return null; }
