import { query, tx } from '../../../lib/db';
import { route, bad, toInt } from '../../../lib/http';
import { randomToken, randomCode } from '../../../lib/auth';
import { engagementScore, potentialOf } from '../../../lib/scoring';
import { getRules } from '../../../lib/settings';
import { screenCreator } from '../../../lib/automation';
import { logEvent } from '../../../lib/events';
import { handleFromLink, NICHES, PLATFORMS, CTYPES } from '../../../lib/constants';
import { creatorTier } from '../../../lib/pricing';
import { healthSql, nextAction, HEALTH_FORMULA } from '../../../lib/creatorIntel';
import { parseRateCard, saveRateCard } from '../../../lib/rateCard';
import { resolveAcq } from '../../../lib/attribution';

const PAGE_SIZE = 20;
const SORTS = {
  new: 'b.applied_at DESC', score: 'b.score DESC', gmv: 'b.gmv DESC', followers: 'b.followers DESC',
  health: 'health DESC', gpv: 'gpv DESC NULLS LAST', activity: 'b.last_activity DESC NULLS LAST',
};
const ACTIVE_DEAL = `('offered','countered','booked','delivered')`;

// Mọi chỉ số hiệu quả tính trong 1 truy vấn (LATERAL aggregate, dùng index creator_id)
function baseSql(w) {
  return `
    SELECT c.*,
      COALESCE(s.sample_count,0) AS sample_count, COALESCE(s.active_samples,0) AS active_samples,
      COALESCE(s.to_ship,0) AS to_ship, COALESCE(s.overdue_count,0) AS overdue_count, s.on_time_rate,
      COALESCE(v.video_count,0) AS video_count, COALESCE(v.videos_pending,0) AS videos_pending,
      COALESCE(v.views_sum,0) AS views_sum, COALESCE(v.gmv_sum,0) AS gmv_sum,
      COALESCE(d.active_deals,0) AS active_deals, d.open_deal_status, COALESCE(d.booked_fee,0) AS booked_fee,
      GREATEST(c.applied_at, c.updated_at, e.last_event) AS last_activity,
      rc.video_fee AS ask_fee, rc.videos_per_month AS ask_videos, rc.deal_types AS ask_types
    FROM creators c
    LEFT JOIN rate_cards rc ON rc.creator_id=c.id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE status<>'cancelled')::int AS sample_count,
             COUNT(*) FILTER (WHERE status IN ('approved','shipped','delivered','overdue'))::int AS active_samples,
             COUNT(*) FILTER (WHERE status='approved')::int AS to_ship,
             COUNT(*) FILTER (WHERE status='overdue')::int AS overdue_count,
             (COUNT(*) FILTER (WHERE posted_at IS NOT NULL AND (content_due_at IS NULL OR posted_at <= content_due_at))::float
               / NULLIF(COUNT(*) FILTER (WHERE status IN ('posted','overdue')), 0)) AS on_time_rate
      FROM samples WHERE creator_id=c.id) s ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE status<>'rejected')::int AS video_count,
             COUNT(*) FILTER (WHERE status='submitted')::int AS videos_pending,
             COALESCE(SUM(views) FILTER (WHERE status<>'rejected'),0) AS views_sum,
             COALESCE(SUM(gmv) FILTER (WHERE status<>'rejected'),0) AS gmv_sum
      FROM videos WHERE creator_id=c.id) v ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE status IN ${ACTIVE_DEAL})::int AS active_deals,
             (ARRAY_AGG(status ORDER BY updated_at DESC) FILTER (WHERE status IN ('offered','countered')))[1] AS open_deal_status,
             COALESCE(SUM(fee) FILTER (WHERE status IN ('booked','delivered','completed')),0) AS booked_fee
      FROM deals WHERE creator_id=c.id) d ON TRUE
    LEFT JOIN LATERAL (SELECT MAX(created_at) AS last_event FROM events WHERE creator_id=c.id) e ON TRUE
    WHERE ${w}`;
}

// Phân khúc thông minh
const SEGMENTS = {
  todo: `(b.status IN ('applied','pending') OR b.overdue_count>0 OR b.videos_pending>0 OR b.open_deal_status='countered' OR b.to_ship>0)`,
  idle: `(b.status IN ('approved','content_posted','in_campaign') AND b.active_deals=0 AND b.active_samples=0)`,
  top: `(b.gmv > 0)`,
};

async function list(req) {
  const { status, niche, ct, search, sort, potential, source, tier, segment } = req.query;
  const exporting = req.query.export === '1';
  const page = Math.max(1, toInt(req.query.page, 1));
  const rules = await getRules();
  const where = ['1=1']; const p = [];
  const add = (sql, v) => { p.push(v); where.push(sql.replace('?', `$${p.length}`)); };
  if (status && status !== 'all') add('c.status=?', status);
  if (niche && niche !== 'all') add('c.niche=?', niche);
  if (ct && ct !== 'all') add('c.content_type=?', ct);
  if (potential && potential !== 'all') add('c.potential=?', potential);
  if (source && source !== 'all') add('c.source=?', source);
  if (tier === 'seed') where.push('c.gmv <= 0');
  if (tier === 'pro') { p.push(rules.scale_min_gmv); where.push(`c.gmv > 0 AND c.gmv < $${p.length}`); }
  if (tier === 'partner') { p.push(rules.scale_min_gmv); where.push(`c.gmv >= $${p.length}`); }
  if (search) {
    p.push(`%${String(search).toLowerCase()}%`);
    const i = p.length;
    where.push(`(LOWER(c.name) LIKE $${i} OR LOWER(c.email) LIKE $${i} OR c.phone LIKE $${i} OR LOWER(c.handle) LIKE $${i})`);
  }
  const seg = SEGMENTS[segment] ? `WHERE ${SEGMENTS[segment]}` : '';
  const order = SORTS[sort] || SORTS.new;
  const body = `WITH b AS (${baseSql(where.join(' AND '))})
    SELECT b.*, ${healthSql(rules.default_gmv_per_view)} AS health,
      CASE WHEN b.views_sum > 0 THEN ROUND(b.gmv_sum / b.views_sum, 1) END AS gpv
    FROM b ${seg}`;
  const limit = exporting ? 'LIMIT 5000' : `LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`;
  const [count, data] = await Promise.all([
    query(`SELECT COUNT(*)::int AS n FROM (${body}) x`, p),
    query(`${body} ORDER BY ${order}, b.id DESC ${limit}`, p),
  ]);
  const creators = data.rows.map(c => ({ ...c, tier: creatorTier(c, rules), next_action: nextAction(c, rules) }));
  const total = count.rows[0].n;
  return { creators, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), health_formula: HEALTH_FORMULA };
}

async function create(req, res) {
  const b = req.body || {};
  if (b.website) return { success: true }; // honeypot chống bot
  const name = String(b.name || '').trim().slice(0, 255);
  const link = String(b.tiktok_link || '').trim().slice(0, 512);
  const email = String(b.email || '').trim().slice(0, 255);
  const phone = String(b.phone || '').replace(/\s/g, '').slice(0, 20);
  const followers = Math.max(0, toInt(b.followers));
  const avg_views = Math.max(0, toInt(b.avg_views));
  if (!name || !link || !followers) bad('Thiếu thông tin bắt buộc.');
  if (!phone && !email) bad('Cần có SĐT hoặc Email.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad('Email không hợp lệ.');
  if (phone && !/^(\+84|0)[0-9]{9,10}$/.test(phone)) bad('SĐT không hợp lệ.');
  if (!NICHES.some(n => n.v === b.niche)) bad('Lĩnh vực không hợp lệ.');
  if (!PLATFORMS.some(x => x.v === b.platform)) bad('Nền tảng không hợp lệ.');
  if (!CTYPES.some(x => x.v === b.content_type)) bad('Loại nội dung không hợp lệ.');
  if (b.consent !== true) bad('Cần đồng ý xử lý dữ liệu cá nhân để đăng ký.');

  const handle = handleFromLink(link);
  const dupe = await query(
    `SELECT id, status, source FROM creators
     WHERE (phone<>'' AND phone=$1) OR ($2<>'' AND LOWER(handle)=$2) OR ($3<>'' AND LOWER(email)=LOWER($3)) LIMIT 1`,
    [phone, handle, email]
  );
  const score = engagementScore(followers, avg_views);
  const fields = {
    name, email, phone, tiktok_link: link, handle, followers, avg_views,
    avg_viewers: Math.max(0, toInt(b.avg_viewers)), niche: b.niche, platform: b.platform, content_type: b.content_type,
    channel_gmv: String(b.channel_gmv || '').slice(0, 50), address: String(b.address || '').slice(0, 200),
    score, potential: potentialOf(score),
  };

  // Creator được mời (prospect) quay lại điền form → cập nhật hồ sơ thay vì báo trùng
  if (dupe.rows.length && dupe.rows[0].source !== 'invite') {
    return res.status(409).json({ error: 'Kênh / SĐT / email này đã đăng ký rồi. Kiểm tra link theo dõi đã nhận hoặc liên hệ team.' });
  }

  // Nguồn tuyển: mã bài đăng group FB (?acq= hoặc cookie kol_acq từ /j/[code])
  const acqRaw = String(b.acq || (req.headers.cookie || '').match(/(?:^|;\s*)kol_acq=([^;]+)/)?.[1] || '').toUpperCase().slice(0, 16);
  // UTM (từ link tracking hoặc link UTM tự dựng) — lưu nguyên để đối soát GA / Meta
  const utm = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const v = b.utm && typeof b.utm === 'object' ? b.utm[k] : undefined;
    if (v) utm[k] = String(v).slice(0, 100);
  }
  let acq = null; let acqSource = null;
  {
    const hit = await resolveAcq({ query }, acqRaw);
    acq = hit?.code || null; acqSource = hit?.source || null;
  }

  const rules = await getRules();
  // Bước "Mức cast": creator tự khai giá + số video mong muốn (validate trước khi ghi)
  const rateCard = b.rate_card && typeof b.rate_card === 'object' ? parseRateCard(b.rate_card) : null;
  const out = await tx(async db => {
    let referredBy = null;
    if (b.ref) {
      const r = await db.query('SELECT id FROM creators WHERE ref_code=$1', [String(b.ref).toUpperCase().slice(0, 16)]);
      referredBy = r.rows[0]?.id || null;
    }
    let row;
    const cols = Object.keys(fields);
    if (dupe.rows.length) {
      const r = await db.query(
        `UPDATE creators SET ${cols.map((k, i) => `${k}=$${i + 1}`).join(',')}, status='applied', source='invite_accepted',
           consent_at=NOW(), acq_code=COALESCE($${cols.length + 2}, acq_code), updated_at=NOW()
         WHERE id=$${cols.length + 1} RETURNING *`,
        [...cols.map(k => fields[k]), dupe.rows[0].id, acq]
      );
      row = r.rows[0];
    } else {
      const all = { ...fields, portal_token: randomToken(), ref_code: randomCode(), referred_by: referredBy,
        source: acqSource || (referredBy ? 'referral' : 'form'), acq_code: acq, utm: JSON.stringify(utm), consent_at: new Date(), status: 'applied' };
      const keys = Object.keys(all);
      const r = await db.query(
        `INSERT INTO creators (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`,
        keys.map(k => all[k])
      );
      row = r.rows[0];
    }
    await logEvent(db, { type: 'creator_applied', creator_id: row.id, actor: 'creator', message: `Đăng ký mới · ${followers.toLocaleString('vi-VN')} followers · score ${score}${referredBy ? ' · qua giới thiệu' : ''}${acq ? ` · nguồn ${acqSource} (${acq})` : utm.utm_source ? ` · UTM ${utm.utm_source}/${utm.utm_medium || '-'}` : ''}` });
    if (rateCard) {
      await saveRateCard(db, row.id, rateCard);
      const fee = rateCard.video_fee ? `${rateCard.video_fee.toLocaleString('vi-VN')}đ/video` : 'barter';
      await logEvent(db, { type: 'rate_card_updated', creator_id: row.id, actor: 'creator', message: `Mức cast mong muốn: ${fee}${rateCard.videos_per_month ? ` · ${rateCard.videos_per_month} video/tháng` : ''} · ${rateCard.deal_types}` });
    }
    row.status = await screenCreator(db, row, rules);
    return row;
  });

  return res.status(201).json({ success: true, portal_token: out.portal_token, ref_code: out.ref_code, status: out.status, score });
}

export default route({ GET: list, POST: create }, { admin: ['GET'] });
