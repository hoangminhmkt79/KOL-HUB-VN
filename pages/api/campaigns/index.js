import { query, tx } from '../../../lib/db';
import { route, bad, toInt } from '../../../lib/http';
import { logEvent } from '../../../lib/events';
import { getRules } from '../../../lib/settings';
import { DEAL_TYPES } from '../../../lib/constants';

// Điều khoản deal công khai của campaign (docs/DEBATE.md #1)
function dealTerms(b, rules) {
  const num = (k, d, min, max, label, int = true) => {
    const v = b[k] === undefined || b[k] === null || b[k] === '' ? d : Number(b[k]);
    if (!Number.isFinite(v) || v < min || v > max || (int && !Number.isInteger(v))) bad(`${label} không hợp lệ.`);
    return v;
  };
  const deal_type = b.deal_type || 'barter';
  if (!DEAL_TYPES.some(t => t.v === deal_type)) bad('Loại deal không hợp lệ.');
  const t = {
    brand_name: String(b.brand_name || '').trim().slice(0, 120),
    contact_name: String(b.contact_name || '').trim().slice(0, 120),
    deal_type,
    fee_min: num('fee_min', 0, 0, 1e10, 'Phí tối thiểu'),
    fee_max: num('fee_max', 0, 0, 1e10, 'Phí tối đa'),
    commission_pct: num('commission_pct', 0, 0, 100, '% hoa hồng', false),
    revisions: num('revisions', 1, 0, 10, 'Số lần sửa'),
    deposit_pct: num('deposit_pct', Number(rules.deposit_pct), 0, 100, '% cọc', false),
    payment_days: num('payment_days', Number(rules.payment_days), 0, 90, 'Số ngày thanh toán'),
    claims_allowed: String(b.claims_allowed || '').slice(0, 3000),
    claims_banned: String(b.claims_banned || '').slice(0, 3000),
  };
  if (deal_type === 'barter') { t.fee_min = 0; t.fee_max = 0; }
  else {
    if (!t.fee_max) bad('Deal có phí cần nhập khoảng phí (phí tối đa > 0).');
    if (t.fee_min > t.fee_max) bad('Phí tối thiểu lớn hơn phí tối đa.');
  }
  return t;
}

async function list() {
  const camps = await query(`
    SELECT cp.*,
      (SELECT COUNT(*)::int FROM samples s WHERE s.campaign_id=cp.id AND s.status<>'cancelled') AS samples,
      (SELECT COUNT(*)::int FROM videos v WHERE v.campaign_id=cp.id AND v.status<>'rejected') AS videos,
      (SELECT COALESCE(SUM(v.gmv),0) FROM videos v WHERE v.campaign_id=cp.id AND v.status<>'rejected') AS gmv,
      (SELECT COALESCE(SUM(s.cost),0) FROM samples s WHERE s.campaign_id=cp.id AND s.status<>'cancelled') AS sample_spend,
      (SELECT COALESCE(SUM(d.fee),0) FROM deals d WHERE d.campaign_id=cp.id AND d.status IN ('booked','delivered','completed')) AS committed,
      (SELECT COUNT(*)::int FROM deals d WHERE d.campaign_id=cp.id AND d.status IN ('offered','countered')) AS open_deals
    FROM campaigns cp ORDER BY cp.created_at DESC`);
  const ccs = await query(`
    SELECT cc.*, c.name, c.niche, c.followers, c.promo_code, c.content_type, c.handle
    FROM campaign_creators cc JOIN creators c ON c.id = cc.creator_id`);
  return { campaigns: camps.rows.map(camp => ({ ...camp, creators: ccs.rows.filter(cc => cc.campaign_id === camp.id) })) };
}

async function create(req, res) {
  const b = req.body || {};
  if (!String(b.name || '').trim()) bad('Thiếu tên chiến dịch.');
  const ids = (Array.isArray(b.creator_ids) ? b.creator_ids : []).map(Number).filter(Number.isInteger);
  const terms = dealTerms(b, await getRules());
  const budget = toInt(b.budget); const sampleCost = toInt(b.sample_cost);
  if (budget < 0 || sampleCost < 0) bad('Ngân sách / giá mẫu không hợp lệ.');
  const camp = await tx(async db => {
    const tk = Object.keys(terms);
    const r = await db.query(
      `INSERT INTO campaigns (name,product,start_date,end_date,budget,goal,brief,req,format,content_type,posts_per,slots,filled,note,niche,is_public,sample_cost,${tk.join(',')})
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,${tk.map((_, i) => `$${18 + i}`).join(',')}) RETURNING *`,
      [b.name.trim(), b.product || '', b.start_date || null, b.end_date || null, budget, b.goal || '', b.brief || '', b.req || '',
       b.format || '', b.content_type || 'video', toInt(b.posts_per, 2) || 1, toInt(b.slots, 10) || 1, ids.length, b.note || '',
       b.niche || '', b.is_public !== false, sampleCost, ...tk.map(k => terms[k])]
    );
    const c = r.rows[0];
    for (const cid of ids) {
      await db.query('INSERT INTO campaign_creators (campaign_id,creator_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [c.id, cid]);
      await db.query(`UPDATE creators SET status='in_campaign', updated_at=NOW() WHERE id=$1 AND status IN ('approved','pending','applied')`, [cid]);
      await logEvent(db, { type: 'campaign_joined', creator_id: cid, actor: 'admin', message: `Thêm vào chiến dịch "${c.name}"` });
    }
    return c;
  });
  return res.status(201).json({ campaign: camp });
}

export default route({ GET: list, POST: create }, { admin: true });
