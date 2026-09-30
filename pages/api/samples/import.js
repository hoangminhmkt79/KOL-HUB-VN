// Nhận các dòng CSV (đã parse ở trình duyệt) từ file export đơn hàng TikTok Shop Seller Center
import { route, bad } from '../../../lib/http';
import { normalizeCsvRows, upsertOrders } from '../../../lib/orders';
import { getRules } from '../../../lib/settings';
import { logEvent } from '../../../lib/events';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

async function importRows(req) {
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || !rows.length) bad('File rỗng.');
  if (rows.length > 20000) bad('Tối đa 20.000 dòng mỗi lần.');
  let orders;
  try { orders = normalizeCsvRows(rows); } catch (e) { bad(e.message); }
  const rules = await getRules();
  if (req.body.include_paid) rules.only_zero_value_orders = false;
  const out = await upsertOrders(orders, rules, 'csv');
  await logEvent(null, { type: 'orders_imported', actor: 'admin', message: `Import CSV ${orders.length} đơn: +${out.created} mới, ${out.updated} cập nhật, ${out.unmatched} chưa map, ${out.skipped} bỏ qua (không phải đơn mẫu)` });
  return { total: orders.length, ...out };
}

export default route({ POST: importRows }, { admin: true });
