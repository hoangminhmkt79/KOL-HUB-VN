import { query, tx } from '../../../lib/db';
import { route, bad, toInt, toId } from '../../../lib/http';
import { applyStatus } from '../../../lib/orders';
import { getRules } from '../../../lib/settings';
import { logEvent } from '../../../lib/events';
import { SAMPLE_STATUS_KEYS } from '../../../lib/constants';

async function list(req) {
  const { status, campaign, search } = req.query;
  const where = ['1=1']; const p = [];
  if (status && status !== 'all') { p.push(status); where.push(`s.status=$${p.length}`); }
  if (campaign && campaign !== 'all') { p.push(toInt(campaign)); where.push(`s.campaign_id=$${p.length}`); }
  if (search) {
    p.push(`%${String(search).toLowerCase()}%`);
    where.push(`(LOWER(c.name) LIKE $${p.length} OR LOWER(c.handle) LIKE $${p.length} OR s.tiktok_order_id LIKE $${p.length} OR LOWER(s.tracking_no) LIKE $${p.length})`);
  }
  const r = await query(
    `SELECT s.*, c.name AS creator_name, c.handle, c.phone, c.portal_token, cp.name AS campaign_name,
       (SELECT url FROM videos v WHERE v.sample_id=s.id ORDER BY v.created_at LIMIT 1) AS video_url
     FROM samples s JOIN creators c ON c.id=s.creator_id LEFT JOIN campaigns cp ON cp.id=s.campaign_id
     WHERE ${where.join(' AND ')} ORDER BY s.updated_at DESC LIMIT 500`,
    p
  );
  const un = await query('SELECT COUNT(*)::int AS n FROM unmatched_orders');
  return { samples: r.rows, unmatched: un.rows[0].n };
}

async function create(req, res) {
  const b = req.body || {};
  const creatorId = toId(b.creator_id);
  const status = SAMPLE_STATUS_KEYS.includes(b.status) ? b.status : 'approved';
  const rules = await getRules();
  const sample = await tx(async db => {
    const c = await db.query('SELECT id FROM creators WHERE id=$1', [creatorId]);
    if (!c.rows.length) bad('Creator không tồn tại.');
    const r = await db.query(
      `INSERT INTO samples (creator_id, campaign_id, tiktok_order_id, product, sku, cost, carrier, tracking_no, status, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'approved','manual') RETURNING *`,
      [creatorId, b.campaign_id ? toInt(b.campaign_id) : null, String(b.tiktok_order_id || '').trim() || null,
       String(b.product || '').slice(0, 255), String(b.sku || '').slice(0, 128), Math.max(0, toInt(b.cost)),
       String(b.carrier || '').slice(0, 100), String(b.tracking_no || '').trim().slice(0, 100)]
    );
    await logEvent(db, { type: 'sample_created', creator_id: creatorId, sample_id: r.rows[0].id, actor: 'admin', message: `Tạo đơn mẫu: ${b.product || 'sản phẩm'}` });
    if (status !== 'approved') await applyStatus(db, r.rows[0], status, { raw_status: 'manual' }, rules, true);
    return r.rows[0];
  });
  return res.status(201).json({ sample });
}

export default route({ GET: list, POST: create }, { admin: true });
