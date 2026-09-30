import { query } from '../../../lib/db';
import { route, bad, notFound, toId } from '../../../lib/http';
import { logEvent } from '../../../lib/events';
import { normRateCard, RC_COLS } from '../../../lib/rateCard';
import { CREATOR_STATUS_KEYS, handleFromLink } from '../../../lib/constants';

async function detail(req) {
  const id = toId(req.query.id);
  const c = await query('SELECT * FROM creators WHERE id=$1', [id]);
  if (!c.rows.length) notFound();
  const [samples, videos, events, refs, rc] = await Promise.all([
    query('SELECT s.*, cp.name AS campaign_name FROM samples s LEFT JOIN campaigns cp ON cp.id=s.campaign_id WHERE s.creator_id=$1 ORDER BY s.requested_at DESC', [id]),
    query('SELECT * FROM videos WHERE creator_id=$1 ORDER BY created_at DESC', [id]),
    query('SELECT * FROM events WHERE creator_id=$1 ORDER BY created_at DESC LIMIT 50', [id]),
    query('SELECT COUNT(*)::int AS n FROM creators WHERE referred_by=$1', [id]),
    query(`SELECT ${RC_COLS} FROM rate_cards WHERE creator_id=$1`, [id]),
  ]);
  return { creator: c.rows[0], samples: samples.rows, videos: videos.rows, events: events.rows, referrals: refs.rows[0].n, rate_card: normRateCard(rc.rows[0]) };
}

async function update(req) {
  const id = toId(req.query.id);
  const b = req.body || {};
  const sets = []; const p = [];
  const put = (col, v) => { p.push(v); sets.push(`${col}=$${p.length}`); };
  if (b.status !== undefined) {
    if (!CREATOR_STATUS_KEYS.includes(b.status)) bad('Status không hợp lệ.');
    put('status', b.status);
  }
  if (b.gmv !== undefined) put('gmv', Math.max(0, Math.round(Number(b.gmv) || 0)));
  if (b.promo_code !== undefined) put('promo_code', String(b.promo_code || '').trim().slice(0, 100) || null);
  if (b.ship_address !== undefined) put('ship_address', String(b.ship_address || '').slice(0, 500));
  if (b.tiktok_link !== undefined) { put('tiktok_link', String(b.tiktok_link).slice(0, 512)); put('handle', handleFromLink(b.tiktok_link)); }
  if (!sets.length) bad('Không có gì để cập nhật.');
  p.push(id);
  const r = await query(`UPDATE creators SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${p.length} RETURNING *`, p);
  if (!r.rows.length) notFound();
  const changed = Object.keys(b).filter(k => b[k] !== undefined).join(', ');
  await logEvent(null, { type: 'creator_updated', creator_id: id, actor: 'admin', message: b.status ? `Admin đổi trạng thái → ${b.status}` : `Admin cập nhật: ${changed}` });
  return { creator: r.rows[0] };
}

async function remove(req) {
  const id = toId(req.query.id);
  await query('DELETE FROM creators WHERE id=$1', [id]);
  return { success: true };
}

export default route({ GET: detail, PATCH: update, DELETE: remove }, { admin: true });
