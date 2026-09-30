// Dữ liệu công khai cho landing: chiến dịch đang tuyển + số liệu thật
import { query } from '../../../lib/db';
import { route } from '../../../lib/http';
import { getRules } from '../../../lib/settings';

async function list(req, res) {
  const [camps, stats, rules] = await Promise.all([
    query(`SELECT cp.id, cp.name, cp.product, cp.end_date, cp.format, cp.content_type, cp.niche, cp.slots, cp.posts_per, cp.brief,
             cp.brand_name, cp.deal_type, cp.fee_min, cp.fee_max, cp.commission_pct, cp.revisions, cp.deposit_pct, cp.payment_days,
             cp.claims_allowed, cp.claims_banned, cp.contact_name, cp.req, cp.note,
             GREATEST(cp.slots - (SELECT COUNT(*) FROM campaign_creators cc WHERE cc.campaign_id=cp.id), 0)::int AS slots_left
           FROM campaigns cp WHERE cp.status='active' AND cp.is_public AND (cp.end_date IS NULL OR cp.end_date >= CURRENT_DATE)
           ORDER BY cp.created_at DESC LIMIT 6`),
    query(`SELECT
             (SELECT COUNT(*)::int FROM creators WHERE status IN ('approved','in_campaign','sample_sent','content_posted','scaling')) AS creators,
             (SELECT COUNT(*)::int FROM samples WHERE status IN ('shipped','delivered','posted','overdue')) AS samples,
             (SELECT COUNT(*)::int FROM videos WHERE status<>'rejected') AS videos,
             (SELECT COUNT(*)::int FROM payouts WHERE status='paid' AND (due_at IS NULL OR paid_at <= due_at + INTERVAL '1 day')) AS paid_on_time`),
    getRules(),
  ]);
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return {
    campaigns: camps.rows.map(c => ({
      ...c, fee_min: Number(c.fee_min), fee_max: Number(c.fee_max), commission_pct: Number(c.commission_pct),
      deposit_pct: Number(c.deposit_pct), brief_short: (c.brief || '').slice(0, 220),
    })),
    stats: stats.rows[0],
    terms: { pit_threshold: rules.pit_threshold, pit_rate_pct: rules.pit_rate_pct, cpm_vnd: rules.cpm_vnd, deposit_pct: rules.deposit_pct, payment_days: rules.payment_days },
  };
}

export default route({ GET: list });
