import { getPool } from '../../../lib/db';
export default async function handler(req, res) {
  const pool = getPool();
  if (req.method === 'GET') {
    try {
      const camps = await pool.query('SELECT * FROM campaigns ORDER BY created_at DESC');
      const ccs   = await pool.query(`SELECT cc.*,c.name,c.niche,c.followers,c.promo_code,c.content_type FROM campaign_creators cc JOIN creators c ON c.id=cc.creator_id`);
      return res.status(200).json({ campaigns: camps.rows.map(c => ({ ...c, creators: ccs.rows.filter(cc => cc.campaign_id === c.id) })) });
    } catch (e) { return res.status(500).json({ error: 'Lỗi database.' }); }
  }
  if (req.method === 'POST') {
    const { name, product, start_date, end_date, budget, goal, brief, req: reqText, format, content_type, posts_per, slots, note, creator_ids } = req.body;
    if (!name) return res.status(400).json({ error: 'Thiếu tên chiến dịch.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(
        `INSERT INTO campaigns (name,product,start_date,end_date,budget,goal,brief,req,format,content_type,posts_per,slots,filled,note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [name,product,start_date,end_date,parseInt(budget)||0,goal,brief,reqText,format,content_type||'video',parseInt(posts_per)||2,parseInt(slots)||10,creator_ids?.length||0,note]
      );
      const camp = r.rows[0];
      if (creator_ids?.length) {
        for (const cid of creator_ids) {
          await client.query('INSERT INTO campaign_creators (campaign_id,creator_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',[camp.id,cid]);
          await client.query("UPDATE creators SET status='in_campaign' WHERE id=$1",[cid]);
        }
      }
      await client.query('COMMIT');
      return res.status(201).json({ campaign: camp });
    } catch (e) { await client.query('ROLLBACK'); return res.status(500).json({ error: 'Lỗi database.' }); }
    finally { client.release(); }
  }
  res.setHeader('Allow',['GET','POST']); return res.status(405).end();
}
