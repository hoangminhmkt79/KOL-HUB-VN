// Link tracking đa kênh: tạo link rút gọn + UTM + content soạn sẵn; đo phễu theo từng link.
import { query } from '../../../lib/db';
import { route, bad, notFound, toId, toInt } from '../../../lib/http';
import { getRules } from '../../../lib/settings';
import { genCode } from '../../../lib/fb';
import { CHANNELS, channelOf, utmFor, linksFor, buildContents, originOf } from '../../../lib/links';
import { FUNNEL_SQL } from '../../../lib/attribution';
import { logEvent } from '../../../lib/events';
import { POST_ANGLES } from '../../../lib/constants';


async function list(req) {
  const origin = originOf(req);
  const r = await query(
    `SELECT x.*, cp.name AS campaign_name, ${FUNNEL_SQL}
     FROM track_links x LEFT JOIN campaigns cp ON cp.id=x.campaign_id
     ORDER BY x.created_at DESC LIMIT 300`);
  const links = r.rows.map(l => {
    const cost = Number(l.cost) || 0;
    const utm = { utm_source: l.utm_source, utm_medium: l.utm_medium, utm_campaign: l.utm_campaign, utm_content: l.code };
    return { ...l, cost, gmv: Number(l.gmv), ...linksFor(origin, l.code, utm, l.target), cpa: l.activated ? Math.round(cost / l.activated) : null, cr: l.clicks ? Math.round((l.signups / l.clicks) * 1000) / 10 : null };
  });
  const tot = links.reduce((a, l) => ({ clicks: a.clicks + l.clicks, signups: a.signups + l.signups, activated: a.activated + l.activated }), { clicks: 0, signups: 0, activated: 0 });
  return { links, totals: tot, channels: CHANNELS };
}

async function create(req, res) {
  const b = req.body || {};
  const channel = channelOf(b.channel).v;
  const source_name = String(b.source_name || '').trim().slice(0, 200);
  if (!source_name) bad('Đặt tên nguồn (vd: "Group Review Mỹ Phẩm HN – bài 01/10").');
  const angle = POST_ANGLES.some(a => a.v === b.angle) ? b.angle : 'fee';
  const cost = Math.max(0, toInt(b.cost));
  const target = b.target === 'brand' ? 'brand' : 'creator';
  let campaign = null; let slotsLeft = null;
  if (b.campaign_id) {
    const c = await query(
      `SELECT cp.*, GREATEST(cp.slots - (SELECT COUNT(*) FROM campaign_creators cc WHERE cc.campaign_id=cp.id), 0)::int AS slots_left
       FROM campaigns cp WHERE cp.id=$1`, [toId(b.campaign_id)]);
    if (!c.rows.length) notFound('Không tìm thấy chiến dịch.');
    campaign = c.rows[0]; slotsLeft = campaign.slots_left;
  }
  // Mã duy nhất trên cả 2 bảng (link + bài group)
  let code = '';
  for (let i = 0; i < 8 && !code; i++) {
    const cand = genCode(7);
    const ex = await query('SELECT 1 FROM fb_posts WHERE code=$1 UNION ALL SELECT 1 FROM track_links WHERE code=$1', [cand]);
    if (!ex.rows.length) code = cand;
  }
  if (!code) bad('Không tạo được mã, thử lại.');
  const utm = utmFor({ channel, source_name, campaign, code });
  await query(
    `INSERT INTO track_links (code, channel, source_name, campaign_id, angle, utm_source, utm_medium, utm_campaign, cost, note, target)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [code, channel, source_name, campaign?.id || null, angle, utm.utm_source, utm.utm_medium, utm.utm_campaign, cost, String(b.note || '').slice(0, 500), target]
  );
  const links = linksFor(originOf(req), code, utm, target);
  const content = buildContents({ channel, campaign, code, link: links.short, rules: await getRules(), slotsLeft, angle });
  await logEvent(null, { type: 'link_created', actor: 'admin', message: `Tạo link tracking ${code} · ${channelOf(channel).l} · ${source_name}` });
  return res.status(201).json({ link: { code, channel, source_name, campaign_id: campaign?.id || null, ...utm, ...links }, content });
}

export default route({ GET: list, POST: create }, { admin: true });
