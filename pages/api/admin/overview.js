import { query } from '../../../lib/db';
import { route } from '../../../lib/http';

const ACTIVE = `('approved','in_campaign','sample_sent','content_posted','scaling','inactive')`;

async function overview() {
  const [funnel, kpi, perf, overdue, dueSoon, top, events, trend, pending] = await Promise.all([
    query(`SELECT
      COUNT(*) FILTER (WHERE status<>'prospect')::int AS applied,
      COUNT(*) FILTER (WHERE status IN ${ACTIVE})::int AS approved,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM samples s WHERE s.creator_id=c.id AND s.status IN ('shipped','delivered','overdue','posted')))::int AS sampled,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM videos v WHERE v.creator_id=c.id AND v.status<>'rejected'))::int AS posted,
      COUNT(*) FILTER (WHERE gmv>0)::int AS converted,
      COUNT(*) FILTER (WHERE status='prospect')::int AS prospects
      FROM creators c`),
    query(`SELECT
      (SELECT COUNT(*)::int FROM creators WHERE status IN ('applied','pending')) AS to_review,
      (SELECT COUNT(*)::int FROM samples WHERE status='approved') AS to_ship,
      (SELECT COUNT(*)::int FROM samples WHERE status='shipped') AS in_transit,
      (SELECT COUNT(*)::int FROM samples WHERE status='overdue') AS overdue,
      (SELECT COUNT(*)::int FROM videos WHERE status='submitted') AS videos_to_review,
      (SELECT COUNT(*)::int FROM videos WHERE created_at > NOW() - INTERVAL '7 days') AS videos_7d,
      (SELECT COUNT(*)::int FROM unmatched_orders) AS unmatched,
      (SELECT COALESCE(SUM(gmv),0) FROM creators) AS gmv,
      (SELECT COALESCE(SUM(cost),0) FROM samples WHERE status<>'cancelled') AS sample_spend,
      (SELECT COALESCE(SUM(views),0) FROM videos WHERE status<>'rejected') AS views`),
    query(`SELECT
      COUNT(*) FILTER (WHERE status IN ('delivered','overdue','posted'))::int AS delivered,
      COUNT(*) FILTER (WHERE status='posted')::int AS posted,
      AVG(EXTRACT(EPOCH FROM (posted_at - delivered_at))/86400) FILTER (WHERE posted_at IS NOT NULL AND delivered_at IS NOT NULL) AS avg_days_to_post,
      AVG(EXTRACT(EPOCH FROM (delivered_at - shipped_at))/86400) FILTER (WHERE delivered_at IS NOT NULL AND shipped_at IS NOT NULL) AS avg_days_ship
      FROM samples`),
    query(`SELECT s.id, s.content_due_at, s.product, c.id AS creator_id, c.name, c.phone, c.handle
           FROM samples s JOIN creators c ON c.id=s.creator_id WHERE s.status='overdue' ORDER BY s.content_due_at LIMIT 8`),
    query(`SELECT s.id, s.content_due_at, s.product, c.id AS creator_id, c.name, c.handle
           FROM samples s JOIN creators c ON c.id=s.creator_id
           WHERE s.status='delivered' AND s.content_due_at < NOW() + INTERVAL '3 days' ORDER BY s.content_due_at LIMIT 8`),
    query(`SELECT c.id, c.name, c.handle, c.gmv, c.status,
             (SELECT COALESCE(SUM(views),0) FROM videos v WHERE v.creator_id=c.id) AS views,
             (SELECT COALESCE(SUM(cost),0) FROM samples s WHERE s.creator_id=c.id AND s.status<>'cancelled') AS spend
           FROM creators c WHERE c.gmv>0 ORDER BY c.gmv DESC LIMIT 6`),
    query(`SELECT e.*, c.name AS creator_name FROM events e LEFT JOIN creators c ON c.id=e.creator_id
           WHERE e.type<>'tick' ORDER BY e.created_at DESC LIMIT 14`),
    query(`SELECT to_char(d, 'DD/MM') AS day,
             (SELECT COUNT(*)::int FROM creators c WHERE c.applied_at::date = d::date AND c.status<>'prospect') AS applied,
             (SELECT COUNT(*)::int FROM videos v WHERE v.created_at::date = d::date) AS videos
           FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, INTERVAL '1 day') d ORDER BY d`),
    query(`SELECT id, name, handle, followers, score, screen_reason, applied_at FROM creators
           WHERE status IN ('applied','pending') ORDER BY score DESC NULLS LAST LIMIT 6`),
  ]);
  return {
    funnel: funnel.rows[0], kpi: kpi.rows[0], perf: perf.rows[0],
    overdue: overdue.rows, due_soon: dueSoon.rows, top: top.rows,
    events: events.rows, trend: trend.rows, pending: pending.rows,
  };
}

export default route({ GET: overview }, { admin: true });
