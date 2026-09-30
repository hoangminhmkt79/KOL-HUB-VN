// Deal / booking: state machine, snapshot kinh tế, side-effect khi chốt. Xem docs/CONTRACT.md + docs/DEBATE.md.
// Mọi chuyển trạng thái chạy trong tx với SELECT ... FOR UPDATE trên deal.
import { query, tx } from './db';
import { bad, notFound, HttpError, toId } from './http';
import { logEvent } from './events';
import { getRules } from './settings';
import { dealEconomics, approvalLevel, payoutSplit, fairPrice, creatorTier } from './pricing';
import { DEAL_ACTIVE, DEAL_OPEN, DEAL_TYPES, DEAL_STATUS } from './constants';

export const BOOKED_LIKE = ['booked', 'delivered', 'completed'];
const sqlList = arr => `(${arr.map(s => `'${s}'`).join(',')})`;
export const SQL_ACTIVE = sqlList(DEAL_ACTIVE);
export const SQL_OPEN = sqlList(DEAL_OPEN);
export const SQL_BOOKED = sqlList(BOOKED_LIKE);

const vnd = n => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')}đ`;
const conflict = msg => { throw new HttpError(409, msg); };

// ---------- Validate input ----------

function intIn(v, min, max, label) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) bad(`${label} không hợp lệ.`);
  return n;
}
function numIn(v, min, max, label) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) bad(`${label} không hợp lệ (${min}–${max}).`);
  return Math.round(n * 100) / 100;
}

// Chuẩn hoá điều khoản. partial = cho phép bỏ trống (dùng giá trị cũ `base`).
export function validateTerms(b, base = {}) {
  const pick = (k, d) => (b[k] === undefined || b[k] === null || b[k] === '' ? (base[k] ?? d) : b[k]);
  const deal_type = pick('deal_type', 'hybrid');
  if (!DEAL_TYPES.some(t => t.v === deal_type)) bad('Loại deal không hợp lệ.');
  let fee = intIn(Number(pick('fee', 0)), 0, 10_000_000_000, 'Phí (số nguyên ≥ 0)');
  const commission_pct = numIn(Number(pick('commission_pct', 0)), 0, 100, '% hoa hồng');
  let videos = intIn(Number(pick('videos', 1)), 1, 20, 'Số video (1–20)');
  if (deal_type === 'barter') {
    if (fee !== 0) bad('Deal barter không có phí cố định (fee = 0).');
    if (videos !== 1) bad('Deal barter tối đa 1 video.');
  } else if (fee <= 0) bad('Deal hybrid / flat fee cần phí > 0 (phí = 0 thì chọn barter).');
  return { deal_type, fee, commission_pct, videos };
}

const msgOf = b => String(b.message || '').trim().slice(0, 1000);

// ---------- Kinh tế ----------

export async function creatorHistory(db, creatorId) {
  const r = await db.query(
    `SELECT COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY views), 0) AS median_views,
            COALESCE(SUM(gmv),0) AS gmv, COALESCE(SUM(views),0) AS views
     FROM videos WHERE creator_id=$1 AND views>0 AND status<>'rejected'`,
    [creatorId]
  );
  const x = r.rows[0];
  return { median_views: Math.round(Number(x.median_views) || 0), gmv_per_view: Number(x.views) > 0 ? Number(x.gmv) / Number(x.views) : 0 };
}

export async function computeEcon(db, { creator, campaign, rules, fee, commission_pct, videos }) {
  const history = await creatorHistory(db, creator.id);
  return dealEconomics({ creator, rules, fee, commission_pct, videos, sample_cost: Number(campaign?.sample_cost) || 0, history });
}

// Preview cho UI (không ghi DB)
export async function quote(q) {
  const rules = await getRules();
  const cr = await query('SELECT * FROM creators WHERE id=$1', [toId(q.creator_id)]);
  if (!cr.rows.length) notFound('Không tìm thấy creator.');
  const creator = cr.rows[0];
  let campaign = null;
  if (q.campaign_id) {
    const r = await query('SELECT * FROM campaigns WHERE id=$1', [toId(q.campaign_id)]);
    campaign = r.rows[0] || null;
  }
  const fee = Math.max(0, Math.round(Number(q.fee) || 0));
  const commission_pct = Math.min(100, Math.max(0, Number(q.commission_pct) || 0));
  const videos = Math.min(20, Math.max(1, Math.round(Number(q.videos) || 1)));
  const econ = await computeEcon({ query }, { creator, campaign, rules, fee, commission_pct, videos });
  const fair = fairPrice(creator, rules);
  return { econ, fair: fair.fee, live_hour: fair.live_hour, formula: fair.formula, tier: creatorTier(creator, rules), approval_level: approvalLevel(fee, rules) };
}

// ---------- Guardrail ----------

async function lockCreator(db, id) {
  const r = await db.query('SELECT * FROM creators WHERE id=$1 FOR UPDATE', [id]);
  if (!r.rows.length) notFound('Không tìm thấy creator.');
  return r.rows[0];
}
async function lockCampaign(db, id) {
  if (!id) return null;
  const r = await db.query('SELECT * FROM campaigns WHERE id=$1 FOR UPDATE', [id]);
  if (!r.rows.length) notFound('Không tìm thấy chiến dịch.');
  return r.rows[0];
}
async function lockDeal(db, id, creatorId = null) {
  const r = await db.query('SELECT * FROM deals WHERE id=$1 FOR UPDATE', [id]);
  const d = r.rows[0];
  if (!d || (creatorId && d.creator_id !== creatorId)) notFound('Không tìm thấy deal.');
  return d;
}

async function checkOpenDeals(db, creatorId, rules, excludeId = 0) {
  const r = await db.query(`SELECT COUNT(*)::int AS n FROM deals WHERE creator_id=$1 AND status IN ${SQL_ACTIVE} AND id<>$2`, [creatorId, excludeId]);
  const max = Number(rules.max_open_deals) || 2;
  if (r.rows[0].n >= max) conflict(`Creator đã có ${r.rows[0].n} deal đang chạy (tối đa ${max}).`);
}

async function checkBudget(db, campaign, fee, excludeId = 0) {
  if (!campaign || !(Number(campaign.budget) > 0) || !fee) return;
  const r = await db.query(`SELECT COALESCE(SUM(fee),0) AS s FROM deals WHERE campaign_id=$1 AND status IN ${SQL_BOOKED} AND id<>$2`, [campaign.id, excludeId]);
  const committed = Number(r.rows[0].s);
  if (committed + fee > Number(campaign.budget)) {
    conflict(`Vượt ngân sách chiến dịch: đã cam kết ${vnd(committed)} + ${vnd(fee)} > ${vnd(campaign.budget)}.`);
  }
}

// Brand chốt / đề xuất một mức giá → cần đúng cấp duyệt; econ đỏ → cần lý do override
function checkApproval(b, level, econ) {
  const approved_by = String(b.approved_by || '').trim().slice(0, 120);
  const override_reason = String(b.override_reason || '').trim().slice(0, 1000);
  if (level !== 'ops' && !approved_by) bad(`Phí vượt mức ops tự duyệt — cần tên người duyệt (${level === 'cfo' ? 'CFO' : 'manager'}).`);
  if (econ.red && override_reason.length < 5) bad(`Deal báo đỏ (${econ.warnings.join('; ') || 'hoà vốn > GMV kỳ vọng'}) — cần nhập lý do override.`);
  return { approved_by, override_reason };
}

function checkSeedType(creator, rules, deal_type) {
  if (creatorTier(creator, rules) === 'seed' && deal_type === 'fee') bad('Creator Seed (chưa có GMV) chỉ nhận deal barter hoặc hybrid.');
}

function assertNotExpired(d) {
  if (d.expires_at && new Date(d.expires_at) < new Date()) conflict('Deal đã quá hạn phản hồi.');
}

async function addRound(db, d, by, action, message = '', terms = d) {
  await db.query(
    `INSERT INTO deal_rounds (deal_id, round_no, by_party, action, fee, commission_pct, videos, message) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [d.id, d.round, by, action, terms.fee, terms.commission_pct, terms.videos, message]
  );
}

const ACTION_VI = { offer: 'Offer', counter: 'Trả giá', accept: 'Chốt', decline: 'Từ chối', cancel: 'Huỷ', deliver: 'Nghiệm thu', note: 'Ghi chú', expired: 'Hết hạn' };
async function log(db, d, action, actor, extra = '') {
  await logEvent(db, {
    type: `deal_${action}`, creator_id: d.creator_id, sample_id: d.sample_id || null, actor,
    message: `Deal #${d.id} · ${ACTION_VI[action] || action} · ${vnd(d.fee)} + ${Number(d.commission_pct)}% HH · ${d.videos} video${extra ? ' · ' + extra : ''}`,
  });
}

const hoursFromNow = h => new Date(Date.now() + (Number(h) || 0) * 3600e3);

// ---------- Booking side-effects ----------

async function book(db, d, creator, campaign, rules, actor) {
  await checkOpenDeals(db, d.creator_id, rules, d.id);
  await checkBudget(db, campaign, Number(d.fee), d.id);

  for (const p of payoutSplit(Number(d.fee), Number(d.deposit_pct), rules)) {
    await db.query(
      `INSERT INTO payouts (deal_id, kind, gross, pit, net, status, due_at) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (deal_id, kind) DO NOTHING`,
      [d.id, p.kind, p.gross, p.pit, p.net, p.kind === 'deposit' ? 'due' : 'pending', p.kind === 'deposit' ? new Date() : null]
    );
  }
  const s = await db.query(
    `INSERT INTO samples (creator_id, campaign_id, product, cost, status, source, match_method) VALUES ($1,$2,$3,$4,'approved','deal','deal') RETURNING id`,
    [d.creator_id, campaign?.id || null, campaign?.product || '', Number(campaign?.sample_cost) || 0]
  );
  await db.query(`UPDATE creators SET status='in_campaign', updated_at=NOW() WHERE id=$1 AND status IN ('approved','pending','applied')`, [d.creator_id]);
  if (campaign) {
    const cc = await db.query('INSERT INTO campaign_creators (campaign_id, creator_id, camp_status) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [campaign.id, d.creator_id, 'Đã chốt deal']);
    if (cc.rowCount) await db.query('UPDATE campaigns SET filled=filled+1 WHERE id=$1', [campaign.id]);
  }
  const r = await db.query(
    `UPDATE deals SET status='booked', booked_at=NOW(), expires_at=NULL, sample_id=$2, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [d.id, s.rows[0].id]
  );
  const out = r.rows[0];
  await logEvent(db, { type: 'sample_created', creator_id: d.creator_id, sample_id: out.sample_id, actor, message: `Mẫu cho deal #${d.id}${campaign ? ` · ${campaign.name}` : ''}` });
  return out;
}

async function loadCtx(db, d) {
  const creator = (await db.query('SELECT * FROM creators WHERE id=$1', [d.creator_id])).rows[0];
  const campaign = d.campaign_id ? (await db.query('SELECT * FROM campaigns WHERE id=$1', [d.campaign_id])).rows[0] || null : null;
  return { creator, campaign };
}

// ---------- Brand (admin) ----------

export async function createOffer(b) {
  const rules = await getRules();
  const creatorId = toId(b.creator_id);
  const terms = validateTerms(b);
  const message = msgOf(b);
  return tx(async db => {
    const creator = await lockCreator(db, creatorId);
    if (['rejected', 'prospect'].includes(creator.status)) bad('Creator chưa được duyệt / đã bị từ chối.');
    const campaign = b.campaign_id ? await lockCampaign(db, toId(b.campaign_id)) : null;
    if (campaign && campaign.status === 'completed') bad('Chiến dịch đã kết thúc.');
    checkSeedType(creator, rules, terms.deal_type);
    await checkOpenDeals(db, creatorId, rules);
    await checkBudget(db, campaign, terms.fee);
    const econ = await computeEcon(db, { creator, campaign, rules, ...terms });
    const level = approvalLevel(terms.fee, rules);
    const appr = checkApproval(b, level, econ);
    const deposit = campaign ? Number(campaign.deposit_pct) : Number(rules.deposit_pct);
    const r = await db.query(
      `INSERT INTO deals (creator_id, campaign_id, status, deal_type, fee, commission_pct, videos, spark_code, deposit_pct, round, last_by,
         expires_at, econ, approval_level, approved_by, override_reason)
       VALUES ($1,$2,'offered',$3,$4,$5,$6,$7,$8,1,'brand',$9,$10,$11,$12,$13) RETURNING *`,
      [creatorId, campaign?.id || null, terms.deal_type, terms.fee, terms.commission_pct, terms.videos, !!b.spark_code, deposit,
       hoursFromNow(rules.creator_reply_hours), JSON.stringify(econ), level, appr.approved_by, appr.override_reason]
    );
    const d = r.rows[0];
    await addRound(db, d, 'brand', 'offer', message);
    await log(db, d, 'offer', 'admin', appr.override_reason ? `override: ${appr.override_reason}` : '');
    return d;
  });
}

export async function brandAction(id, b) {
  const rules = await getRules();
  const action = b.action;
  if (!['counter', 'accept', 'decline', 'cancel', 'deliver', 'note'].includes(action)) bad('Hành động không hợp lệ.');
  const message = msgOf(b);
  return tx(async db => {
    const d = await lockDeal(db, id);
    const { creator, campaign } = await loadCtx(db, d);

    if (action === 'note') {
      if (!message) bad('Thiếu nội dung ghi chú.');
      await addRound(db, d, 'brand', 'note', message);
      return d;
    }

    if (action === 'counter') {
      if (d.status !== 'countered') conflict('Chỉ trả giá khi creator vừa trả giá.');
      if (d.round >= rules.deal_rounds_max) conflict(`Đã hết ${rules.deal_rounds_max} vòng thương lượng — chỉ còn chốt hoặc từ chối.`);
      assertNotExpired(d);
      const terms = validateTerms(b, d);
      checkSeedType(creator, rules, terms.deal_type);
      if (campaign) await lockCampaign(db, campaign.id);
      await checkBudget(db, campaign, terms.fee, d.id);
      const econ = await computeEcon(db, { creator, campaign, rules, ...terms });
      const level = approvalLevel(terms.fee, rules);
      const appr = checkApproval(b, level, econ);
      const r = await db.query(
        `UPDATE deals SET status='offered', deal_type=$2, fee=$3, commission_pct=$4, videos=$5, round=round+1, last_by='brand',
           expires_at=$6, econ=$7, approval_level=$8, approved_by=$9, override_reason=$10,
           spark_code=COALESCE($11, spark_code), updated_at=NOW() WHERE id=$1 RETURNING *`,
        [d.id, terms.deal_type, terms.fee, terms.commission_pct, terms.videos, hoursFromNow(rules.creator_reply_hours), JSON.stringify(econ),
         level, appr.approved_by, appr.override_reason, b.spark_code === undefined ? null : !!b.spark_code]
      );
      const nd = r.rows[0];
      await addRound(db, nd, 'brand', 'counter', message);
      await log(db, nd, 'counter', 'admin');
      return nd;
    }

    if (action === 'accept') {
      if (d.status !== 'countered') conflict('Chỉ chốt được khi creator đang trả giá (offer của brand do creator chốt).');
      assertNotExpired(d);
      await lockCreator(db, d.creator_id);
      const camp = campaign ? await lockCampaign(db, campaign.id) : null;
      checkSeedType(creator, rules, d.deal_type);
      // Tính lại econ theo dữ liệu mới nhất trước khi chốt
      const econ = await computeEcon(db, { creator, campaign: camp, rules, fee: Number(d.fee), commission_pct: Number(d.commission_pct), videos: d.videos });
      const level = approvalLevel(Number(d.fee), rules);
      const appr = checkApproval(b, level, econ);
      await db.query('UPDATE deals SET econ=$2, approval_level=$3, approved_by=$4, override_reason=$5 WHERE id=$1',
        [d.id, JSON.stringify(econ), level, appr.approved_by, appr.override_reason]);
      const nd = await book(db, d, creator, camp, rules, 'admin');
      await addRound(db, nd, 'brand', 'accept', message);
      await log(db, nd, 'accept', 'admin', [appr.approved_by && `duyệt: ${appr.approved_by}`, appr.override_reason && `override: ${appr.override_reason}`].filter(Boolean).join(' · '));
      return nd;
    }

    if (action === 'decline') {
      if (!DEAL_OPEN.includes(d.status)) conflict('Deal không còn đang thương lượng.');
      const r = await db.query(`UPDATE deals SET status='declined', expires_at=NULL, updated_at=NOW() WHERE id=$1 RETURNING *`, [d.id]);
      await addRound(db, r.rows[0], 'brand', 'decline', message);
      await log(db, r.rows[0], 'decline', 'admin', message);
      return r.rows[0];
    }

    if (action === 'cancel') {
      if (![...DEAL_OPEN, 'booked'].includes(d.status)) conflict(`Không huỷ được deal ở trạng thái "${DEAL_STATUS[d.status]?.l || d.status}".`);
      if (d.status === 'booked') {
        const paid = await db.query(`SELECT COUNT(*)::int AS n FROM payouts WHERE deal_id=$1 AND status='paid'`, [d.id]);
        if (paid.rows[0].n && !message) bad('Deal đã trả cọc — cần ghi lý do huỷ (xử lý thu hồi ngoài hệ thống).');
        await db.query(`DELETE FROM payouts WHERE deal_id=$1 AND status<>'paid'`, [d.id]);
        if (d.sample_id) await db.query(`UPDATE samples SET status='cancelled', updated_at=NOW() WHERE id=$1 AND status IN ('requested','approved')`, [d.sample_id]);
        if (d.campaign_id) {
          const other = await db.query(`SELECT 1 FROM deals WHERE creator_id=$1 AND campaign_id=$2 AND id<>$3 AND status IN ${SQL_BOOKED}`, [d.creator_id, d.campaign_id, d.id]);
          const cc = other.rows.length ? { rowCount: 0 } : await db.query(`DELETE FROM campaign_creators WHERE campaign_id=$1 AND creator_id=$2 AND posts_done=0`, [d.campaign_id, d.creator_id]);
          if (cc.rowCount) await db.query('UPDATE campaigns SET filled=GREATEST(filled-1,0) WHERE id=$1', [d.campaign_id]);
        }
      }
      const r = await db.query(`UPDATE deals SET status='cancelled', expires_at=NULL, updated_at=NOW() WHERE id=$1 RETURNING *`, [d.id]);
      await addRound(db, r.rows[0], 'brand', 'cancel', message);
      await log(db, r.rows[0], 'cancel', 'admin', message);
      return r.rows[0];
    }

    // deliver: nghiệm thu — cần đủ video đã duyệt kể từ lúc chốt
    if (d.status !== 'booked') conflict('Chỉ nghiệm thu deal đã chốt.');
    const v = await db.query(
      `SELECT COUNT(*)::int AS n FROM videos WHERE creator_id=$1 AND status='approved' AND created_at >= $2`,
      [d.creator_id, d.booked_at]
    );
    if (v.rows[0].n < d.videos) conflict(`Chưa đủ video đã duyệt (${v.rows[0].n}/${d.videos}) — duyệt video trước khi nghiệm thu.`);
    const days = campaign ? Number(campaign.payment_days) : Number(rules.payment_days);
    await db.query(
      `UPDATE payouts SET status='due', due_at=NOW() + ($2 || ' days')::interval WHERE deal_id=$1 AND kind='final' AND status='pending'`,
      [d.id, String(days)]
    );
    const left = await db.query(`SELECT COUNT(*)::int AS n FROM payouts WHERE deal_id=$1 AND status<>'paid'`, [d.id]);
    const status = left.rows[0].n ? 'delivered' : 'completed';
    const r = await db.query('UPDATE deals SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING *', [d.id, status]);
    await addRound(db, r.rows[0], 'brand', 'deliver', message);
    await log(db, r.rows[0], 'deliver', 'admin', status === 'completed' ? 'hoàn tất' : `trả phần còn lại trong ${days} ngày`);
    return r.rows[0];
  });
}

export async function markPayoutPaid(id, b) {
  if (b.status !== 'paid') bad('Chỉ hỗ trợ status "paid".');
  const ref = String(b.ref || '').trim().slice(0, 200);
  return tx(async db => {
    const p0 = await db.query('SELECT deal_id FROM payouts WHERE id=$1', [id]);
    if (!p0.rows.length) notFound('Không tìm thấy khoản thanh toán.');
    const d = await lockDeal(db, p0.rows[0].deal_id);
    const pr = await db.query('SELECT * FROM payouts WHERE id=$1 FOR UPDATE', [id]);
    const p = pr.rows[0];
    if (p.status === 'paid') conflict('Khoản này đã trả rồi.');
    if (p.status !== 'due') conflict('Khoản này chưa đến hạn trả (chờ nghiệm thu video).');
    if (!['booked', 'delivered'].includes(d.status)) conflict('Deal không ở trạng thái cần thanh toán.');
    const r = await db.query(`UPDATE payouts SET status='paid', paid_at=NOW(), ref=$2 WHERE id=$1 RETURNING *`, [id, ref]);
    await logEvent(db, { type: 'payout_paid', creator_id: d.creator_id, actor: 'admin', message: `Deal #${d.id} · trả ${p.kind === 'deposit' ? 'cọc' : 'phần còn lại'} ${vnd(p.net)} net (gross ${vnd(p.gross)}, TNCN ${vnd(p.pit)})${ref ? ` · ref ${ref}` : ''}` });
    let deal = d;
    const left = await db.query(`SELECT COUNT(*)::int AS n FROM payouts WHERE deal_id=$1 AND status<>'paid'`, [d.id]);
    if (!left.rows[0].n && d.status === 'delivered') {
      deal = (await db.query(`UPDATE deals SET status='completed', updated_at=NOW() WHERE id=$1 RETURNING *`, [d.id])).rows[0];
      await logEvent(db, { type: 'deal_completed', creator_id: d.creator_id, actor: 'system', message: `Deal #${d.id} hoàn tất — đã trả đủ` });
    }
    return { payout: r.rows[0], deal };
  });
}

// ---------- Creator (portal) ----------

export async function creatorAction(creator, b) {
  const rules = await getRules();
  const message = msgOf(b);

  if (b.action === 'apply_campaign') {
    const campaignId = toId(b.campaign_id);
    return tx(async db => {
      const c = await lockCreator(db, creator.id);
      const camp = await lockCampaign(db, campaignId);
      if (camp.status !== 'active' || !camp.is_public || (camp.end_date && new Date(camp.end_date) < new Date(new Date().toDateString()))) bad('Chiến dịch không còn nhận đăng ký.');
      const taken = await db.query('SELECT COUNT(*)::int AS n FROM campaign_creators WHERE campaign_id=$1', [camp.id]);
      if (taken.rows[0].n >= camp.slots) conflict('Chiến dịch đã đủ slot.');
      const dup = await db.query(`SELECT 1 FROM deals WHERE creator_id=$1 AND campaign_id=$2 AND status IN ${SQL_ACTIVE}`, [c.id, camp.id]);
      if (dup.rows.length) conflict('Bạn đã có deal với chiến dịch này.');
      let deal_type = camp.deal_type;
      const fee = Number(b.fee) || 0;
      if (deal_type !== 'barter' && fee <= 0) deal_type = 'barter';
      if (creatorTier(c, rules) === 'seed' && deal_type === 'fee') deal_type = 'hybrid';
      const terms = validateTerms({ deal_type, fee: deal_type === 'barter' ? 0 : b.fee, commission_pct: b.commission_pct ?? camp.commission_pct,
        videos: deal_type === 'barter' ? 1 : (b.videos ?? camp.posts_per) });
      await checkOpenDeals(db, c.id, rules);
      const econ = await computeEcon(db, { creator: c, campaign: camp, rules, ...terms });
      const r = await db.query(
        `INSERT INTO deals (creator_id, campaign_id, status, deal_type, fee, commission_pct, videos, deposit_pct, round, last_by, expires_at, econ, approval_level)
         VALUES ($1,$2,'countered',$3,$4,$5,$6,$7,1,'creator',$8,$9,$10) RETURNING *`,
        [c.id, camp.id, terms.deal_type, terms.fee, terms.commission_pct, terms.videos, Number(camp.deposit_pct),
         hoursFromNow(rules.brand_reply_hours), JSON.stringify(econ), approvalLevel(terms.fee, rules)]
      );
      const d = r.rows[0];
      await addRound(db, d, 'creator', 'counter', message || 'Ứng tuyển chiến dịch');
      await log(db, d, 'counter', 'creator', `ứng tuyển "${camp.name}"`);
      return d;
    });
  }

  const dealId = toId(b.deal_id);
  return tx(async db => {
    const d = await lockDeal(db, dealId, creator.id);

    if (b.action === 'deal_accept') {
      if (d.status !== 'offered' || d.last_by !== 'brand') conflict('Chỉ nhận được offer brand đang gửi.');
      assertNotExpired(d);
      const c = await lockCreator(db, creator.id);
      const camp = d.campaign_id ? await lockCampaign(db, d.campaign_id) : null;
      const nd = await book(db, d, c, camp, rules, 'creator');
      await addRound(db, nd, 'creator', 'accept', message);
      await log(db, nd, 'accept', 'creator', 'creator nhận offer → tự chốt');
      return nd;
    }

    if (b.action === 'deal_counter') {
      if (d.status !== 'offered') conflict('Chỉ trả giá khi brand đang gửi offer.');
      if (d.round >= rules.deal_rounds_max) conflict(`Đã hết ${rules.deal_rounds_max} vòng thương lượng — bạn có thể nhận hoặc từ chối.`);
      assertNotExpired(d);
      const { creator: c, campaign } = await loadCtx(db, d);
      const fee = Number(b.fee ?? d.fee) || 0;
      const deal_type = fee > 0 ? (d.deal_type === 'barter' ? 'hybrid' : d.deal_type) : 'barter';
      const terms = validateTerms({ ...b, deal_type, videos: deal_type === 'barter' ? 1 : b.videos }, d);
      const econ = await computeEcon(db, { creator: c, campaign, rules, ...terms });
      const r = await db.query(
        `UPDATE deals SET status='countered', fee=$2, commission_pct=$3, videos=$4, round=round+1, last_by='creator',
           expires_at=$5, econ=$6, approval_level=$7, approved_by='', override_reason='', deal_type=$8, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [d.id, terms.fee, terms.commission_pct, terms.videos, hoursFromNow(rules.brand_reply_hours), JSON.stringify(econ), approvalLevel(terms.fee, rules), terms.deal_type]
      );
      await addRound(db, r.rows[0], 'creator', 'counter', message);
      await log(db, r.rows[0], 'counter', 'creator');
      return r.rows[0];
    }

    if (b.action === 'deal_decline') {
      if (!DEAL_OPEN.includes(d.status)) conflict('Deal không còn đang thương lượng.');
      const r = await db.query(`UPDATE deals SET status='declined', expires_at=NULL, updated_at=NOW() WHERE id=$1 RETURNING *`, [d.id]);
      await addRound(db, r.rows[0], 'creator', 'decline', message);
      await log(db, r.rows[0], 'decline', 'creator', message);
      return r.rows[0];
    }
    bad('Hành động không hợp lệ.');
  });
}

// Deal cho creator xem: không lộ econ / trần phí / cấp duyệt
export function publicDeal(d) {
  return {
    id: d.id, status: d.status, deal_type: d.deal_type, fee: Number(d.fee), commission_pct: Number(d.commission_pct), videos: d.videos,
    spark_code: d.spark_code, deposit_pct: Number(d.deposit_pct), round: d.round, last_by: d.last_by, expires_at: d.expires_at,
    booked_at: d.booked_at, created_at: d.created_at,
  };
}

// Expire deal quá hạn (automation)
export async function expireDeals() {
  const r = await query(
    `UPDATE deals d SET status='expired', updated_at=NOW() FROM creators c
     WHERE c.id=d.creator_id AND d.status IN ${SQL_OPEN} AND d.expires_at < NOW()
     RETURNING d.*, c.name AS creator_name`
  );
  for (const d of r.rows) {
    await addRound({ query }, d, 'system', 'note', `Hết hạn — ${d.last_by === 'brand' ? 'creator' : 'brand'} không phản hồi kịp`);
    await log(null, d, 'expired', 'system', `${d.last_by === 'brand' ? 'creator' : 'brand'} không phản hồi`);
  }
  return r.rows;
}
