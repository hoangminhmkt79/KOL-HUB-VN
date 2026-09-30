import { query } from '../../../lib/db';
import { route, toId } from '../../../lib/http';
import { createOffer, SQL_OPEN, SQL_BOOKED } from '../../../lib/deals';
import { DEAL_STATUS } from '../../../lib/constants';

async function list(req) {
  const { status, campaign } = req.query;
  const where = ['1=1']; const p = [];
  if (status === 'open') where.push(`d.status IN ${SQL_OPEN}`);
  else if (status === 'active') where.push(`d.status IN ('offered','countered','booked','delivered')`);
  else if (status && status !== 'all' && DEAL_STATUS[status]) { p.push(status); where.push(`d.status=$${p.length}`); }
  if (campaign && campaign !== 'all') { p.push(toId(campaign)); where.push(`d.campaign_id=$${p.length}`); }
  const [deals, sum] = await Promise.all([
    query(
      `SELECT d.*, c.name AS creator_name, c.handle, c.followers, c.avg_views, cp.name AS campaign_name, cp.brand_name,
         (SELECT COALESCE(SUM(gross),0) FROM payouts p WHERE p.deal_id=d.id AND p.status='paid') AS paid,
         (SELECT COALESCE(SUM(gross),0) FROM payouts p WHERE p.deal_id=d.id AND p.status='due') AS due
       FROM deals d JOIN creators c ON c.id=d.creator_id LEFT JOIN campaigns cp ON cp.id=d.campaign_id
       WHERE ${where.join(' AND ')} ORDER BY d.updated_at DESC, d.id DESC LIMIT 500`, p
    ),
    query(`SELECT
      (SELECT COUNT(*)::int FROM deals WHERE status IN ${SQL_OPEN}) AS open,
      (SELECT COUNT(*)::int FROM deals WHERE status='booked') AS booked,
      (SELECT COALESCE(SUM(fee),0)::bigint FROM deals WHERE status IN ${SQL_BOOKED}) AS committed,
      (SELECT COALESCE(SUM(gross),0)::bigint FROM payouts WHERE status='paid') AS paid,
      (SELECT COALESCE(SUM(gross),0)::bigint FROM payouts WHERE status='due') AS due`),
  ]);
  const s = sum.rows[0];
  return {
    deals: deals.rows,
    summary: { open: s.open, booked: s.booked, committed: Number(s.committed), paid: Number(s.paid), due: Number(s.due) },
  };
}

async function create(req, res) {
  const deal = await createOffer(req.body || {});
  return res.status(201).json({ deal });
}

export default route({ GET: list, POST: create }, { admin: true });
