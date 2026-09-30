// Cổng creator: xem tiến độ mẫu, nộp video, cập nhật địa chỉ, khai mã đơn TikTok. Xác thực bằng token riêng.
import { query, tx } from '../../../lib/db';
import { route, bad, notFound, HttpError } from '../../../lib/http';
import { submitVideo } from '../../../lib/automation';
import { createSampleFromOrder } from '../../../lib/orders';
import { getRules } from '../../../lib/settings';
import { logEvent } from '../../../lib/events';
import { creatorAction, publicDeal } from '../../../lib/deals';
import { fairPrice, creatorTier } from '../../../lib/pricing';

async function loadCreator(token) {
  if (!token || String(token).length < 16) notFound('Link không hợp lệ.');
  const r = await query('SELECT * FROM creators WHERE portal_token=$1', [String(token)]);
  if (!r.rows.length) notFound('Link không hợp lệ.');
  return r.rows[0];
}

async function view(req) {
  const c = await loadCreator(req.query.token);
  const [samples, videos, camps, refs] = await Promise.all([
    query(`SELECT s.id, s.product, s.status, s.carrier, s.tracking_no, s.tiktok_order_id, s.requested_at, s.shipped_at,
             s.delivered_at, s.content_due_at, s.posted_at, cp.name AS campaign_name
           FROM samples s LEFT JOIN campaigns cp ON cp.id=s.campaign_id
           WHERE s.creator_id=$1 AND s.status<>'cancelled' ORDER BY s.requested_at DESC`, [c.id]),
    query('SELECT id, url, platform, status, views, verified, thumbnail, title, created_at FROM videos WHERE creator_id=$1 ORDER BY created_at DESC', [c.id]),
    query(`SELECT cp.name, cp.product, cp.brief, cp.req, cp.note, cp.end_date, cp.posts_per, cc.posts_done
           FROM campaign_creators cc JOIN campaigns cp ON cp.id=cc.campaign_id WHERE cc.creator_id=$1 AND cp.status<>'completed'`, [c.id]),
    query('SELECT COUNT(*)::int AS n FROM creators WHERE referred_by=$1', [c.id]),
  ]);
  const rules = await getRules();
  const [deals, rounds, payouts, rc, open] = await Promise.all([
    query(`SELECT d.*, cp.name AS campaign_name, cp.brand_name FROM deals d LEFT JOIN campaigns cp ON cp.id=d.campaign_id
           WHERE d.creator_id=$1 ORDER BY d.created_at DESC LIMIT 50`, [c.id]),
    query(`SELECT r.deal_id, r.round_no, r.by_party, r.action, r.fee, r.commission_pct, r.videos, r.message, r.created_at
           FROM deal_rounds r JOIN deals d ON d.id=r.deal_id WHERE d.creator_id=$1 ORDER BY r.id`, [c.id]),
    query(`SELECT p.deal_id, p.kind, p.gross, p.pit, p.net, p.status, p.due_at, p.paid_at
           FROM payouts p JOIN deals d ON d.id=p.deal_id WHERE d.creator_id=$1
           ORDER BY p.deal_id, CASE p.kind WHEN 'deposit' THEN 0 ELSE 1 END`, [c.id]),
    query('SELECT video_fee, live_hour_fee, commission_pct, spark_fee_pct, accepts_barter, note, updated_at FROM rate_cards WHERE creator_id=$1', [c.id]),
    query(`SELECT cp.id, cp.name, cp.product, cp.brand_name, cp.niche, cp.deal_type, cp.fee_min, cp.fee_max, cp.commission_pct, cp.posts_per,
             cp.revisions, cp.deposit_pct, cp.payment_days, cp.end_date, cp.brief, cp.req, cp.claims_allowed, cp.claims_banned, cp.contact_name,
             GREATEST(cp.slots - (SELECT COUNT(*) FROM campaign_creators cc WHERE cc.campaign_id=cp.id), 0)::int AS slots_left,
             EXISTS (SELECT 1 FROM deals d WHERE d.campaign_id=cp.id AND d.creator_id=$1 AND d.status IN ('offered','countered','booked','delivered')) AS has_deal
           FROM campaigns cp WHERE cp.status='active' AND cp.is_public AND (cp.end_date IS NULL OR cp.end_date >= CURRENT_DATE)
             AND cp.slots > (SELECT COUNT(*) FROM campaign_creators cc WHERE cc.campaign_id=cp.id)
           ORDER BY cp.created_at DESC LIMIT 20`, [c.id]),
  ]);
  const num = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, ['gross', 'pit', 'net', 'fee', 'commission_pct', 'video_fee', 'live_hour_fee', 'spark_fee_pct', 'fee_min', 'fee_max', 'deposit_pct'].includes(k) && v !== null ? Number(v) : v]));
  const dealList = deals.rows.map(d => ({
    ...publicDeal(d), campaign_name: d.campaign_name, brand_name: d.brand_name,
    rounds: rounds.rows.filter(r => r.deal_id === d.id).map(({ deal_id, ...r }) => num(r)),
    payouts: payouts.rows.filter(p => p.deal_id === d.id).map(({ deal_id, ...p }) => num(p)),
  }));
  const fair = fairPrice(c, rules);
  return {
    creator: {
      name: c.name, handle: c.handle, status: c.status, address: c.address, ship_address: c.ship_address,
      phone: c.phone ? c.phone.replace(/^(.{3}).*(.{3})$/, '$1****$2') : '', score: Number(c.score) || 0,
      ref_code: c.ref_code, promo_code: c.promo_code, followers: c.followers, applied_at: c.applied_at,
    },
    samples: samples.rows, videos: videos.rows, campaigns: camps.rows, referrals: refs.rows[0].n,
    deals: dealList,
    rate_card: rc.rows[0] ? num(rc.rows[0]) : null,
    tier: creatorTier(c, rules),
    fair: { fee: fair.fee, live_hour: fair.live_hour, formula: fair.formula },
    open_campaigns: open.rows.map(num),
    deal_rules: {
      rounds_max: rules.deal_rounds_max, creator_reply_hours: rules.creator_reply_hours, brand_reply_hours: rules.brand_reply_hours,
      pit_threshold: rules.pit_threshold, pit_rate_pct: rules.pit_rate_pct, max_open_deals: rules.max_open_deals,
    },
  };
}

async function act(req, res) {
  const c = await loadCreator(req.query.token);
  if (['rejected', 'prospect'].includes(c.status)) throw new HttpError(403, 'Hồ sơ chưa được duyệt.');
  const b = req.body || {};

  if (b.action === 'video') {
    const video = await submitVideo({ creator: c, url: String(b.url || ''), actor: 'creator', sampleId: b.sample_id || null });
    return res.status(201).json({ video: { id: video.id, status: video.status, verified: video.verified } });
  }

  if (b.action === 'address') {
    const addr = String(b.ship_address || '').trim();
    if (addr.length < 10) bad('Địa chỉ quá ngắn — ghi rõ số nhà, đường, phường, quận, tỉnh.');
    await query('UPDATE creators SET ship_address=$1, updated_at=NOW() WHERE id=$2', [addr.slice(0, 500), c.id]);
    await logEvent(null, { type: 'address_updated', creator_id: c.id, actor: 'creator', message: 'Creator cập nhật địa chỉ nhận mẫu' });
    return { success: true };
  }

  if (b.action === 'order') {
    const orderId = String(b.order_id || '').replace(/\D/g, '');
    if (orderId.length < 10) bad('Mã đơn TikTok không hợp lệ.');
    const rules = await getRules();
    return tx(async db => {
      const ex = await db.query('SELECT creator_id FROM samples WHERE tiktok_order_id=$1', [orderId]);
      if (ex.rows.length) {
        if (ex.rows[0].creator_id === c.id) return { success: true, already: true };
        bad('Mã đơn này đã được gán cho người khác.');
      }
      const cnt = await db.query(`SELECT COUNT(*)::int AS n FROM samples WHERE creator_id=$1 AND source='creator' AND status<>'cancelled'`, [c.id]);
      if (cnt.rows[0].n >= 10) bad('Bạn đã khai quá nhiều đơn, liên hệ team để được hỗ trợ.');
      const un = await db.query('SELECT payload FROM unmatched_orders WHERE order_id=$1', [orderId]);
      if (un.rows.length) {
        const o = un.rows[0].payload;
        await createSampleFromOrder(db, c.id, { ...o, time: o.time ? new Date(o.time) : null }, 'creator', rules, 'creator');
      } else {
        // Chưa có trong hệ thống: tạo trước, lần sync/import sau sẽ cập nhật trạng thái vận chuyển
        const r = await db.query(
          `INSERT INTO samples (creator_id, tiktok_order_id, status, source, match_method) VALUES ($1,$2,'approved','creator','creator') RETURNING id`,
          [c.id, orderId]
        );
        await logEvent(db, { type: 'sample_created', creator_id: c.id, sample_id: r.rows[0].id, actor: 'creator', message: `Creator khai mã đơn ${orderId}` });
      }
      return { success: true };
    });
  }

  if (b.action === 'rate_card') {
    const money = (k, label) => {
      if (b[k] === undefined || b[k] === null || b[k] === '') return null;
      const n = Number(b[k]);
      if (!Number.isInteger(n) || n < 0 || n > 1e10) bad(`${label} không hợp lệ (số nguyên ≥ 0).`);
      return n;
    };
    const pct = (k, label) => {
      if (b[k] === undefined || b[k] === null || b[k] === '') return null;
      const n = Number(b[k]);
      if (!Number.isFinite(n) || n < 0 || n > 100) bad(`${label} không hợp lệ (0–100).`);
      return Math.round(n * 100) / 100;
    };
    const vals = [c.id, money('video_fee', 'Giá / video'), money('live_hour_fee', 'Giá / giờ live'), pct('commission_pct', '% hoa hồng'),
      pct('spark_fee_pct', '% phí spark code'), b.accepts_barter !== false, String(b.note || '').trim().slice(0, 1000)];
    const r = await query(
      `INSERT INTO rate_cards (creator_id, video_fee, live_hour_fee, commission_pct, spark_fee_pct, accepts_barter, note, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (creator_id) DO UPDATE SET video_fee=EXCLUDED.video_fee, live_hour_fee=EXCLUDED.live_hour_fee, commission_pct=EXCLUDED.commission_pct,
         spark_fee_pct=EXCLUDED.spark_fee_pct, accepts_barter=EXCLUDED.accepts_barter, note=EXCLUDED.note, updated_at=NOW()
       RETURNING video_fee, live_hour_fee, commission_pct, spark_fee_pct, accepts_barter, note, updated_at`, vals);
    await logEvent(null, { type: 'rate_card_updated', creator_id: c.id, actor: 'creator', message: 'Creator cập nhật bảng giá' });
    const rc = r.rows[0];
    for (const k of ['video_fee', 'live_hour_fee', 'commission_pct', 'spark_fee_pct']) if (rc[k] !== null) rc[k] = Number(rc[k]);
    return { rate_card: rc };
  }

  if (['deal_accept', 'deal_counter', 'deal_decline', 'apply_campaign'].includes(b.action)) {
    const d = await creatorAction(c, b);
    const out = { deal: publicDeal(d) };
    return b.action === 'apply_campaign' ? res.status(201).json(out) : out;
  }

  bad('Hành động không hợp lệ.');
}

export default route({ GET: view, POST: act });
