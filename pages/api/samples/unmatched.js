// Đơn TikTok chưa map được creator → admin gán tay
import { query, tx } from '../../../lib/db';
import { route, bad, notFound, toId } from '../../../lib/http';
import { createSampleFromOrder } from '../../../lib/orders';
import { getRules } from '../../../lib/settings';

async function list() {
  const r = await query('SELECT order_id, payload, created_at FROM unmatched_orders ORDER BY created_at DESC LIMIT 200');
  return { orders: r.rows };
}

async function assign(req) {
  const { order_id, creator_id, dismiss } = req.body || {};
  if (!order_id) bad('Thiếu order_id.');
  if (dismiss) { await query('DELETE FROM unmatched_orders WHERE order_id=$1', [order_id]); return { success: true }; }
  const cid = toId(creator_id);
  const r = await query('SELECT payload FROM unmatched_orders WHERE order_id=$1', [order_id]);
  if (!r.rows.length) notFound('Đơn không còn trong danh sách.');
  const rules = await getRules();
  const o = r.rows[0].payload;
  const sample = await tx(db => createSampleFromOrder(db, cid, { ...o, time: o.time ? new Date(o.time) : null }, 'manual', rules, 'csv'));
  return { sample };
}

export default route({ GET: list, POST: assign }, { admin: true });
