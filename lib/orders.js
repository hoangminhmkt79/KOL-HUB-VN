// Map đơn TikTok Shop (từ API hoặc file CSV export) → đơn sample của creator.
import { query, tx } from './db';
import { logEvent } from './events';
import { SAMPLE_STATUS, parseNum } from './constants';

// ---------- Chuẩn hoá ----------

// Trạng thái đơn TikTok (API 202309 + chữ trong file export EN/VI) → trạng thái sample
export function mapOrderStatus(raw) {
  const s = String(raw || '').toLowerCase().replace(/[_-]/g, ' ');
  if (!s) return 'approved';
  if (/cancel|huỷ|hủy|return|refund|hoàn tiền/.test(s)) return 'cancelled';
  if (/deliver|complete|đã giao|hoàn thành|đã nhận/.test(s)) return 'delivered';
  if (/transit|shipping|shipped|đang giao|đang vận chuyển|partially/.test(s)) return 'shipped';
  return 'approved'; // unpaid / on hold / awaiting shipment / awaiting collection / chờ lấy hàng
}

// Bỏ dấu tiếng Việt + khoảng trắng thừa, để so khớp tên người nhận
export const normName = s => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd')
  .toLowerCase().replace(/\s+/g, ' ').trim();

// SĐT về dạng 0xxxxxxxxx. SĐT bị che (***) → '' (không dùng để map)
export function normPhone(p) {
  const raw = String(p || '');
  if (!raw || raw.includes('*')) return '';
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('84') && d.length >= 11) d = '0' + d.slice(2);
  return d.length >= 9 ? d : '';
}

const HEADER_ALIASES = {
  order_id:  ['order id', 'mã đơn hàng', 'ma don hang', 'order_id', 'id đơn hàng'],
  status:    ['order status', 'trạng thái đơn hàng', 'trang thai don hang', 'status', 'order substatus'],
  tracking:  ['tracking id', 'tracking number', 'mã vận đơn', 'ma van don', 'tracking_number'],
  carrier:   ['shipping provider name', 'shipping provider', 'đơn vị vận chuyển', 'don vi van chuyen', 'carrier'],
  phone:     ['phone #', 'phone', 'số điện thoại', 'so dien thoai', 'recipient phone'],
  recipient: ['recipient', 'người nhận', 'nguoi nhan', 'buyer username', 'recipient name'],
  product:   ['product name', 'tên sản phẩm', 'ten san pham'],
  sku:       ['seller sku', 'sku id', 'sku', 'variation'],
  amount:    ['order amount', 'total amount', 'tổng tiền', 'tong tien', 'order total', 'sku subtotal after discount'],
  sample:    ['is sample order', 'sample order', 'đơn mẫu'],
  time:      ['update time', 'delivered time', 'created time', 'thời gian tạo đơn'],
};

// rows: mảng object {header: value} lấy từ CSV
export function normalizeCsvRows(rows) {
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);
  const pick = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    pick[field] = headers.find(h => aliases.includes(h.trim().toLowerCase()));
  }
  if (!pick.order_id) throw new Error('File thiếu cột "Order ID" / "Mã đơn hàng".');
  const byId = new Map();
  for (const r of rows) {
    const id = String(r[pick.order_id] || '').trim().replace(/^'/, '');
    if (!id || byId.has(id)) continue; // file export lặp 1 dòng / SKU → lấy dòng đầu
    const amountNum = pick.amount ? parseNum(r[pick.amount]) : NaN;
    const sampleRaw = pick.sample ? String(r[pick.sample] || '').toLowerCase() : '';
    byId.set(id, {
      order_id: id,
      raw_status: String(r[pick.status] || ''),
      tracking_no: String(r[pick.tracking] || '').trim(),
      carrier: String(r[pick.carrier] || '').trim(),
      phone: String(r[pick.phone] || ''),
      recipient: String(r[pick.recipient] || ''),
      product: String(r[pick.product] || ''),
      sku: String(r[pick.sku] || ''),
      amount: Number.isFinite(amountNum) ? amountNum : null,
      is_sample: /^(yes|true|1|có|co)$/.test(sampleRaw) ? true : null,
      time: r[pick.time] ? new Date(r[pick.time]) : null,
    });
  }
  return [...byId.values()];
}

// Đơn từ TikTok Shop Open API (orders/search 202309)
export function normalizeApiOrder(o) {
  const li = (o.line_items || [])[0] || {};
  const addr = o.recipient_address || {};
  const amount = o.payment?.total_amount !== undefined ? Number(o.payment.total_amount) : null;
  return {
    order_id: String(o.id),
    raw_status: o.status || '',
    tracking_no: o.tracking_number || li.tracking_number || '',
    carrier: o.shipping_provider || li.shipping_provider_name || '',
    phone: addr.phone_number || '',
    recipient: addr.name || '',
    product: li.product_name || '',
    sku: li.sku_name || li.seller_sku || '',
    amount,
    is_sample: typeof o.is_sample_order === 'boolean' ? o.is_sample_order : null,
    time: o.update_time ? new Date(o.update_time * 1000) : null,
  };
}

// ---------- Ghép đơn ↔ creator ----------

async function findCreator(db, order) {
  const phone = normPhone(order.phone);
  if (phone) {
    const r = await db.query(
      `SELECT id FROM creators
       WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 9) = $1 AND status <> 'rejected'
       ORDER BY applied_at DESC LIMIT 2`,
      [phone.slice(-9)]
    );
    if (r.rows.length === 1) return { id: r.rows[0].id, method: 'phone' };
  }
  const nm = normName(order.recipient);
  if (nm.length >= 4) {
    // Chỉ map theo tên khi đúng 1 creator đang hoạt động trùng tên
    const r = await db.query(
      `SELECT id, name FROM creators WHERE status IN ('approved','in_campaign','sample_sent','content_posted','scaling')`
    );
    const hits = r.rows.filter(c => normName(c.name) === nm);
    if (hits.length === 1) return { id: hits[0].id, method: 'name' };
  }
  return null;
}

const rank = s => SAMPLE_STATUS[s]?.step ?? 0;

// Cập nhật sample theo trạng thái mới, chỉ đi tiến (không lùi posted → delivered)
export async function applyStatus(db, sample, next, order, rules, force = false) {
  const cur = sample.status;
  if (cur === next) return false;
  if (force) {
    // admin sửa tay: cho phép mọi hướng
  } else if (cur === 'posted') {
    return false;
  } else if (next === 'cancelled') {
    if (cur === 'cancelled') return false;
  } else if (cur !== 'cancelled' && rank(next) <= rank(cur)) {
    return false;
  }
  const at = order.time && !isNaN(order.time) ? order.time : new Date();
  const sets = ['status=$1', 'raw_status=$2', 'updated_at=NOW()'];
  const params = [next, order.raw_status || ''];
  if (next === 'shipped' || next === 'delivered') sets.push('shipped_at=COALESCE(shipped_at, $3)'), params.push(at);
  if (next === 'delivered') {
    sets.push(`delivered_at=COALESCE(delivered_at, $${params.length + 1})`); params.push(at);
    sets.push(`content_due_at=COALESCE(content_due_at, $${params.length + 1})`);
    params.push(new Date(at.getTime() + rules.content_sla_days * 864e5));
  }
  if (next === 'posted') { sets.push(`posted_at=COALESCE(posted_at, $${params.length + 1})`); params.push(at); }
  params.push(sample.id);
  await db.query(`UPDATE samples SET ${sets.join(',')} WHERE id=$${params.length}`, params);
  await logEvent(db, { type: `sample_${next}`, creator_id: sample.creator_id, sample_id: sample.id, actor: force ? 'admin' : 'system', message: `Đơn ${sample.tiktok_order_id || '#' + sample.id}: ${SAMPLE_STATUS[cur]?.l} → ${SAMPLE_STATUS[next].l}` });
  if (next === 'shipped' || next === 'delivered') {
    await db.query(
      `UPDATE creators SET status='sample_sent', updated_at=NOW()
       WHERE id=$1 AND status IN ('applied','pending','approved','in_campaign')`,
      [sample.creator_id]
    );
  }
  return true;
}

export async function createSampleFromOrder(db, creatorId, order, method, rules, source) {
  const r = await db.query(
    `INSERT INTO samples (creator_id, tiktok_order_id, product, sku, carrier, tracking_no, status, source, match_method, raw_status)
     VALUES ($1,$2,$3,$4,$5,$6,'approved',$7,$8,$9) RETURNING *`,
    [creatorId, order.order_id, order.product.slice(0, 255), order.sku.slice(0, 128), order.carrier.slice(0, 100), order.tracking_no.slice(0, 100), source, method, order.raw_status || '']
  );
  const sample = r.rows[0];
  await logEvent(db, { type: 'sample_created', creator_id: creatorId, sample_id: sample.id, message: `Map đơn ${order.order_id} (${method}) — ${order.product || 'sản phẩm'}` });
  await applyStatus(db, sample, mapOrderStatus(order.raw_status), order, rules);
  await db.query('DELETE FROM unmatched_orders WHERE order_id=$1', [order.order_id]);
  return sample;
}

// orders: đã normalize. → { created, updated, unmatched, skipped }
export async function upsertOrders(orders, rules, source) {
  const out = { created: 0, updated: 0, unmatched: 0, skipped: 0, unchanged: 0 };
  for (const o of orders) {
    const isSample = o.is_sample === true || (o.is_sample === null && o.amount === 0);
    const existing = await query('SELECT * FROM samples WHERE tiktok_order_id=$1', [o.order_id]);
    if (!existing.rows.length && rules.only_zero_value_orders && o.amount !== null && !isSample) { out.skipped++; continue; }

    await tx(async db => {
      if (existing.rows.length) {
        const s = existing.rows[0];
        const extra = [];
        if (o.tracking_no && o.tracking_no !== s.tracking_no) extra.push(['tracking_no', o.tracking_no.slice(0, 100)]);
        if (o.carrier && o.carrier !== s.carrier) extra.push(['carrier', o.carrier.slice(0, 100)]);
        if (extra.length) {
          await db.query(`UPDATE samples SET ${extra.map(([k], i) => `${k}=$${i + 1}`).join(',')}, updated_at=NOW() WHERE id=$${extra.length + 1}`, [...extra.map(x => x[1]), s.id]);
        }
        const moved = await applyStatus(db, s, mapOrderStatus(o.raw_status), o, rules);
        if (moved || extra.length) out.updated++; else out.unchanged++;
        return;
      }
      const hit = await findCreator(db, o);
      if (hit) {
        await createSampleFromOrder(db, hit.id, o, hit.method, rules, source);
        out.created++;
      } else {
        await db.query(
          `INSERT INTO unmatched_orders (order_id, payload) VALUES ($1,$2)
           ON CONFLICT (order_id) DO UPDATE SET payload=EXCLUDED.payload`,
          [o.order_id, JSON.stringify(o)]
        );
        out.unmatched++;
      }
    });
  }
  return out;
}
