// Soạn bài tuyển cho group FB. Hệ thống KHÔNG tự đăng — người thật copy và đăng (ToS Facebook).
import { query } from '../../../../lib/db';
import { route, toId, bad, notFound } from '../../../../lib/http';
import { getRules } from '../../../../lib/settings';
import { buildPost, genCode } from '../../../../lib/fb';
import { POST_ANGLES } from '../../../../lib/constants';

async function list(req) {
  const p = []; let where = '';
  if (req.query.group_id && req.query.group_id !== 'all') { p.push(toId(req.query.group_id)); where = 'WHERE fp.group_id=$1'; }
  const r = await query(
    `SELECT fp.*, g.name AS group_name, g.url AS group_url, cp.name AS campaign_name,
       (SELECT COUNT(*)::int FROM creators c WHERE c.acq_code=fp.code) AS signups,
       (SELECT COUNT(*)::int FROM creators c WHERE c.acq_code=fp.code
          AND EXISTS (SELECT 1 FROM videos v WHERE v.creator_id=c.id AND v.status<>'rejected')) AS activated
     FROM fb_posts fp JOIN fb_groups g ON g.id=fp.group_id LEFT JOIN campaigns cp ON cp.id=fp.campaign_id
     ${where} ORDER BY fp.created_at DESC, fp.id DESC LIMIT 200`, p);
  return { posts: r.rows };
}

function originOf(req) {
  const proto = String(req.headers['x-forwarded-proto'] || (req.headers.host?.startsWith('localhost') ? 'http' : 'https')).split(',')[0];
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
}

async function create(req, res) {
  const b = req.body || {};
  const rules = await getRules();
  const angle = b.angle || 'fee';
  if (!POST_ANGLES.some(a => a.v === angle)) bad('Góc bài viết không hợp lệ.');
  const g = await query('SELECT * FROM fb_groups WHERE id=$1', [toId(b.group_id)]);
  if (!g.rows.length) notFound('Không tìm thấy group.');
  const group = g.rows[0];
  if (group.status === 'banned' || group.status === 'paused') bad(`Group đang "${group.status === 'banned' ? 'bị chặn' : 'tạm dừng'}" — không soạn bài.`);
  let campaign = null; let slotsLeft = null;
  if (b.campaign_id) {
    const c = await query(
      `SELECT cp.*, GREATEST(cp.slots - (SELECT COUNT(*) FROM campaign_creators cc WHERE cc.campaign_id=cp.id), 0)::int AS slots_left
       FROM campaigns cp WHERE cp.id=$1`, [toId(b.campaign_id)]);
    if (!c.rows.length) notFound('Không tìm thấy chiến dịch.');
    campaign = c.rows[0]; slotsLeft = campaign.slots_left;
    if (campaign.status !== 'active') bad('Chiến dịch không còn hoạt động.');
  }
  const origin = originOf(req);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    const { body, angle: used, warnings } = buildPost({ angle, campaign, group, code, link: `${origin}/j/${code}`, rules, slotsLeft });
    const r = await query(
      `INSERT INTO fb_posts (group_id, campaign_id, angle, body, code, status) VALUES ($1,$2,$3,$4,$5,'draft')
       ON CONFLICT (code) DO NOTHING RETURNING *`,
      [group.id, campaign?.id || null, used, body, code]
    );
    if (r.rows.length) {
      const next = group.last_posted_at ? new Date(new Date(group.last_posted_at).getTime() + group.cooldown_days * 864e5) : null;
      if (next && next > new Date()) warnings.push(`Group đang trong thời gian nghỉ — nên đăng sau ${next.toLocaleDateString('vi-VN')}.`);
      return res.status(201).json({ post: r.rows[0], warnings, group_url: group.url });
    }
  }
  throw new Error('Không sinh được mã tracking');
}

export default route({ GET: list, POST: create }, { admin: true });
