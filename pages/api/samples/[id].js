import { query, tx } from '../../../lib/db';
import { route, bad, notFound, toId, toInt } from '../../../lib/http';
import { applyStatus } from '../../../lib/orders';
import { getRules } from '../../../lib/settings';
import { SAMPLE_STATUS_KEYS } from '../../../lib/constants';

async function update(req) {
  const id = toId(req.query.id);
  const b = req.body || {};
  const rules = await getRules();
  return tx(async db => {
    const r = await db.query('SELECT * FROM samples WHERE id=$1 FOR UPDATE', [id]);
    if (!r.rows.length) notFound();
    const sets = []; const p = [];
    const put = (col, v) => { p.push(v); sets.push(`${col}=$${p.length}`); };
    if (b.tracking_no !== undefined) put('tracking_no', String(b.tracking_no).trim().slice(0, 100));
    if (b.carrier !== undefined) put('carrier', String(b.carrier).slice(0, 100));
    if (b.cost !== undefined) put('cost', Math.max(0, toInt(b.cost)));
    if (b.product !== undefined) put('product', String(b.product).slice(0, 255));
    if (b.campaign_id !== undefined) put('campaign_id', b.campaign_id ? toInt(b.campaign_id) : null);
    if (b.content_due_at !== undefined) put('content_due_at', b.content_due_at ? new Date(b.content_due_at) : null);
    if (b.tiktok_order_id !== undefined) put('tiktok_order_id', String(b.tiktok_order_id).trim() || null);
    if (sets.length) {
      p.push(id);
      await db.query(`UPDATE samples SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${p.length}`, p);
    }
    if (b.status !== undefined) {
      if (!SAMPLE_STATUS_KEYS.includes(b.status)) bad('Status không hợp lệ.');
      await applyStatus(db, r.rows[0], b.status, { raw_status: 'manual' }, rules, true);
    }
    const out = await db.query('SELECT * FROM samples WHERE id=$1', [id]);
    return { sample: out.rows[0] };
  });
}

async function remove(req) {
  await query('DELETE FROM samples WHERE id=$1', [toId(req.query.id)]);
  return { success: true };
}

export default route({ PATCH: update, DELETE: remove }, { admin: true });
