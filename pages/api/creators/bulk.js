// Thao tác hàng loạt trên bảng KOL
import { query } from '../../../lib/db';
import { route, bad } from '../../../lib/http';
import { logEvent } from '../../../lib/events';
import { CREATOR_STATUS, CREATOR_STATUS_KEYS } from '../../../lib/constants';

async function bulk(req) {
  const { ids, status } = req.body || {};
  const list = (Array.isArray(ids) ? ids : []).map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 500);
  if (!list.length) bad('Chưa chọn creator.');
  if (!CREATOR_STATUS_KEYS.includes(status)) bad('Status không hợp lệ.');
  const r = await query('UPDATE creators SET status=$1, updated_at=NOW() WHERE id = ANY($2::int[]) AND status<>$1 RETURNING id', [status, list]);
  for (const { id } of r.rows) await logEvent(null, { type: 'creator_updated', creator_id: id, actor: 'admin', message: `Hàng loạt → ${CREATOR_STATUS[status].l}` });
  return { updated: r.rowCount };
}

export default route({ POST: bulk }, { admin: true });
