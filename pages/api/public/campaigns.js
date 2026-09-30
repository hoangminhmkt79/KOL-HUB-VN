// Dữ liệu công khai cho landing: chiến dịch đang tuyển + số liệu thật
import { query } from '../../../lib/db';
import { route } from '../../../lib/http';

async function list(req, res) {
  const [camps, stats] = await Promise.all([
    query(`SELECT cp.id, cp.name, cp.product, cp.end_date, cp.format, cp.content_type, cp.niche, cp.slots, cp.posts_per, cp.brief,
             GREATEST(cp.slots - (SELECT COUNT(*) FROM campaign_creators cc WHERE cc.campaign_id=cp.id), 0)::int AS slots_left
           FROM campaigns cp WHERE cp.status='active' AND cp.is_public AND (cp.end_date IS NULL OR cp.end_date >= CURRENT_DATE)
           ORDER BY cp.created_at DESC LIMIT 6`),
    query(`SELECT
             (SELECT COUNT(*)::int FROM creators WHERE status IN ('approved','in_campaign','sample_sent','content_posted','scaling')) AS creators,
             (SELECT COUNT(*)::int FROM samples WHERE status IN ('shipped','delivered','posted','overdue')) AS samples,
             (SELECT COUNT(*)::int FROM videos WHERE status<>'rejected') AS videos`),
  ]);
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return { campaigns: camps.rows.map(c => ({ ...c, brief: (c.brief || '').slice(0, 220) })), stats: stats.rows[0] };
}

export default route({ GET: list });
