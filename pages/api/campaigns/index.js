import { query, tx } from '../../../lib/db';
import { route, bad, toInt } from '../../../lib/http';
import { logEvent } from '../../../lib/events';

async function list() {
  const camps = await query(`
    SELECT cp.*,
      (SELECT COUNT(*)::int FROM samples s WHERE s.campaign_id=cp.id AND s.status<>'cancelled') AS samples,
      (SELECT COUNT(*)::int FROM videos v WHERE v.campaign_id=cp.id AND v.status<>'rejected') AS videos,
      (SELECT COALESCE(SUM(v.gmv),0) FROM videos v WHERE v.campaign_id=cp.id AND v.status<>'rejected') AS gmv,
      (SELECT COALESCE(SUM(s.cost),0) FROM samples s WHERE s.campaign_id=cp.id AND s.status<>'cancelled') AS sample_spend
    FROM campaigns cp ORDER BY cp.created_at DESC`);
  const ccs = await query(`
    SELECT cc.*, c.name, c.niche, c.followers, c.promo_code, c.content_type, c.handle
    FROM campaign_creators cc JOIN creators c ON c.id = cc.creator_id`);
  return { campaigns: camps.rows.map(camp => ({ ...camp, creators: ccs.rows.filter(cc => cc.campaign_id === camp.id) })) };
}

async function create(req, res) {
  const b = req.body || {};
  if (!String(b.name || '').trim()) bad('Thiếu tên chiến dịch.');
  const ids = (Array.isArray(b.creator_ids) ? b.creator_ids : []).map(Number).filter(Number.isInteger);
  const camp = await tx(async db => {
    const r = await db.query(
      `INSERT INTO campaigns (name,product,start_date,end_date,budget,goal,brief,req,format,content_type,posts_per,slots,filled,note,niche,is_public,sample_cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [b.name.trim(), b.product || '', b.start_date || null, b.end_date || null, toInt(b.budget), b.goal || '', b.brief || '', b.req || '',
       b.format || '', b.content_type || 'video', toInt(b.posts_per, 2) || 1, toInt(b.slots, 10) || 1, ids.length, b.note || '',
       b.niche || '', b.is_public !== false, toInt(b.sample_cost)]
    );
    const c = r.rows[0];
    for (const cid of ids) {
      await db.query('INSERT INTO campaign_creators (campaign_id,creator_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [c.id, cid]);
      await db.query(`UPDATE creators SET status='in_campaign', updated_at=NOW() WHERE id=$1 AND status IN ('approved','pending','applied')`, [cid]);
      await logEvent(db, { type: 'campaign_joined', creator_id: cid, actor: 'admin', message: `Thêm vào chiến dịch "${c.name}"` });
    }
    return c;
  });
  return res.status(201).json({ campaign: camp });
}

export default route({ GET: list, POST: create }, { admin: true });
