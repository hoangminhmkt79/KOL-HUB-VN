import { query } from '../../../lib/db';
import { route, toId, notFound } from '../../../lib/http';
import { brandAction } from '../../../lib/deals';

async function detail(req) {
  const id = toId(req.query.id);
  const d = await query(
    `SELECT d.*, c.name AS creator_name, c.handle, cp.name AS campaign_name, cp.brand_name
     FROM deals d JOIN creators c ON c.id=d.creator_id LEFT JOIN campaigns cp ON cp.id=d.campaign_id WHERE d.id=$1`, [id]);
  if (!d.rows.length) notFound('Không tìm thấy deal.');
  const deal = d.rows[0];
  const [rounds, payouts, creator, campaign, rc] = await Promise.all([
    query('SELECT * FROM deal_rounds WHERE deal_id=$1 ORDER BY id', [id]),
    query(`SELECT * FROM payouts WHERE deal_id=$1 ORDER BY CASE kind WHEN 'deposit' THEN 0 ELSE 1 END`, [id]),
    query(`SELECT c.*, (SELECT COUNT(*)::int FROM videos v WHERE v.creator_id=c.id AND v.status<>'rejected') AS video_count
           FROM creators c WHERE c.id=$1`, [deal.creator_id]),
    deal.campaign_id ? query('SELECT * FROM campaigns WHERE id=$1', [deal.campaign_id]) : { rows: [] },
    query('SELECT * FROM rate_cards WHERE creator_id=$1', [deal.creator_id]),
  ]);
  const cr = creator.rows[0];
  if (cr) delete cr.portal_token;
  return { deal, rounds: rounds.rows, payouts: payouts.rows, creator: cr || null, campaign: campaign.rows[0] || null, rate_card: rc.rows[0] || null };
}

async function update(req) {
  const deal = await brandAction(toId(req.query.id), req.body || {});
  return { deal };
}

export default route({ GET: detail, PATCH: update }, { admin: true });
