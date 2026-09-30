import { query } from '../../../../lib/db';
import { route } from '../../../../lib/http';
import { getRules } from '../../../../lib/settings';
import { groupFields, groupScore, SCORE_FORMULA } from '../../../../lib/fb';
import { logEvent } from '../../../../lib/events';

const APPROVED = `('approved','in_campaign','sample_sent','content_posted','scaling','inactive')`;

// Phễu mỗi group: clicks → signup (creators.acq_code ∈ code các bài của group) → duyệt → chốt deal → kích hoạt (≥1 video không bị từ chối) → GMV
async function list() {
  const r = await query(`
    WITH p AS (
      SELECT group_id, COUNT(*)::int AS posts, COUNT(*) FILTER (WHERE status IN ('posted','removed'))::int AS posted,
             COALESCE(SUM(clicks),0)::int AS clicks, COALESCE(SUM(cost),0) AS post_cost
      FROM fb_posts GROUP BY group_id),
    s AS (
      SELECT fp.group_id,
        COUNT(*)::int AS signups,
        COUNT(*) FILTER (WHERE c.status IN ${APPROVED})::int AS approved,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM deals d WHERE d.creator_id=c.id AND d.status IN ('booked','delivered','completed')))::int AS booked,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM videos v WHERE v.creator_id=c.id AND v.status<>'rejected'))::int AS activated,
        COALESCE(SUM(c.gmv),0) AS gmv
      FROM creators c JOIN fb_posts fp ON fp.code=c.acq_code GROUP BY fp.group_id)
    SELECT g.*, COALESCE(p.posts,0) AS posts, COALESCE(p.posted,0) AS posted, COALESCE(p.clicks,0) AS clicks,
      COALESCE(s.signups,0) AS signups, COALESCE(s.approved,0) AS approved, COALESCE(s.booked,0) AS booked,
      COALESCE(s.activated,0) AS activated, COALESCE(s.gmv,0) AS gmv, g.cost + COALESCE(p.post_cost,0) AS cost_total,
      (SELECT COUNT(*)::int FROM fb_posts x WHERE x.group_id=g.id AND x.status='removed') AS removed
    FROM fb_groups g LEFT JOIN p ON p.group_id=g.id LEFT JOIN s ON s.group_id=g.id`);
  const now = Date.now();
  const groups = r.rows.map(g => {
    const cost_total = Number(g.cost_total) || 0;
    const cpa = g.activated ? Math.round(cost_total / g.activated) : null;
    const next = g.last_posted_at ? new Date(new Date(g.last_posted_at).getTime() + g.cooldown_days * 864e5) : null;
    return {
      ...g, gmv: Number(g.gmv), cost: Number(g.cost), cost_total, cpa,
      score: groupScore({ activated: g.activated, posted: g.posted, cpa }),
      next_post_at: next, ready: g.status === 'active' && (!next || next.getTime() <= now),
    };
  }).sort((a, b) => b.score - a.score || b.activated - a.activated || b.signups - a.signups || b.clicks - a.clicks);
  return { groups, score_formula: SCORE_FORMULA };
}

async function create(req, res) {
  const rules = await getRules();
  const f = groupFields(req.body || {}, true, rules);
  const keys = Object.keys(f);
  const r = await query(`INSERT INTO fb_groups (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`, keys.map(k => f[k]));
  await logEvent(null, { type: 'fb_group_added', actor: 'admin', message: `Thêm group FB "${r.rows[0].name}"` });
  return res.status(201).json({ group: r.rows[0] });
}

export default route({ GET: list, POST: create }, { admin: true });
