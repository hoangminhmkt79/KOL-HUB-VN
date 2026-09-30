// Tuyển chủ động: dán danh sách @handle (từ Creator Marketplace / tự tìm) → tạo hồ sơ "Được mời" + link mời cá nhân hoá
import { query } from '../../../lib/db';
import { route, bad } from '../../../lib/http';
import { randomToken, randomCode } from '../../../lib/auth';
import { logEvent } from '../../../lib/events';
import { NICHES } from '../../../lib/constants';

async function invite(req) {
  const { handles = '', niche = '' } = req.body || {};
  const list = [...new Set(String(handles).split(/[\s,;]+/)
    .map(h => (h.match(/@([A-Za-z0-9._-]+)/)?.[1] || h.replace(/^@/, '')).toLowerCase().trim())
    .filter(h => /^[a-z0-9._-]{2,50}$/.test(h)))].slice(0, 200);
  if (!list.length) bad('Không có handle hợp lệ.');
  const nicheV = NICHES.some(n => n.v === niche) ? niche : 'other';
  const created = []; const existed = [];
  for (const h of list) {
    const r = await query(
      `INSERT INTO creators (name, tiktok_link, handle, niche, status, source, portal_token, ref_code)
       VALUES ($1,$2,$1,$3,'prospect','invite',$4,$5)
       ON CONFLICT (LOWER(handle)) WHERE handle <> '' DO NOTHING RETURNING id, handle`,
      [h, `https://www.tiktok.com/@${h}`, nicheV, randomToken(), randomCode()]
    );
    if (r.rows.length) {
      created.push(h);
      await logEvent(null, { type: 'creator_invited', creator_id: r.rows[0].id, actor: 'admin', message: `Mời @${h}` });
    } else existed.push(h);
  }
  const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  return {
    created: created.length,
    existed,
    links: created.map(h => ({ handle: h, url: `${origin}/?h=${encodeURIComponent(h)}&utm_source=invite` })),
  };
}

export default route({ POST: invite }, { admin: true });
