// Link tracking bài đăng group FB: đếm click, lưu cookie kol_acq 30 ngày, chuyển về landing.
import { query } from '../../lib/db';

const CODE_RE = /^[A-Z0-9]{4,16}$/;
const BOT_RE = /bot|crawl|spider|facebookexternalhit|facebookcatalog|preview|slurp|headless/i;

export async function getServerSideProps({ params, req, res }) {
  const code = String(params.code || '').toUpperCase();
  if (!CODE_RE.test(code)) return { redirect: { destination: '/', permanent: false } };
  let ok = false;
  let dest = `/?src=fb&acq=${code}`;
  try {
    const isBot = BOT_RE.test(req.headers['user-agent'] || '') || req.headers.purpose === 'prefetch';
    const r = isBot
      ? await query('SELECT code FROM fb_posts WHERE code=$1', [code])
      : await query('UPDATE fb_posts SET clicks=clicks+1 WHERE code=$1 RETURNING code', [code]);
    ok = r.rows.length > 0;
    if (!ok) {
      // Link tracking đa kênh (Zalo, TikTok, Fanpage…): chuyển kèm UTM để đo cả trên GA / Meta Pixel
      const t = isBot
        ? await query('SELECT * FROM track_links WHERE code=$1', [code])
        : await query('UPDATE track_links SET clicks=clicks+1 WHERE code=$1 RETURNING *', [code]);
      if (t.rows.length) {
        const l = t.rows[0];
        ok = true;
        dest = `/?${new URLSearchParams({ utm_source: l.utm_source, utm_medium: l.utm_medium, utm_campaign: l.utm_campaign, utm_content: code, acq: code })}`;
      }
    }
  } catch (e) {
    console.error(e);
  }
  if (!ok) return { redirect: { destination: '/', permanent: false } };
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `kol_acq=${code}; Path=/; Max-Age=${30 * 86400}; SameSite=Lax${secure}`);
  res.setHeader('Cache-Control', 'no-store');
  return { redirect: { destination: dest, permanent: false } };
}

export default function Jump() { return null; }
