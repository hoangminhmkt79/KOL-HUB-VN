import { getPool } from '../../../lib/db';
import { calcEngagement, calcKocScore, calcPotential } from '../../../lib/score';

const VALID_STATUS = ['applied','approved','rejected','sample_sent','content_posted','scaling','inactive'];

export default async function handler(req, res) {
  const pool = getPool();
  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ.' });

  if (req.method === 'PATCH') {
    const { status, gmv, promo_code, video_link, video_views, orders_generated, revenue_generated, address } = req.body;
    const fields = []; const params = []; let i = 1;

    if (status !== undefined) {
      if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: 'Status không hợp lệ.' });
      fields.push(`status=$${i++}`); params.push(status);
    }
    if (gmv !== undefined)              { fields.push(`gmv=$${i++}`);               params.push(Math.max(0, parseFloat(gmv)||0)); }
    if (promo_code !== undefined)       { fields.push(`promo_code=$${i++}`);        params.push(promo_code||null); }
    if (video_link !== undefined)       { fields.push(`video_link=$${i++}`);        params.push(video_link||null); }
    if (video_views !== undefined)      { fields.push(`video_views=$${i++}`);       params.push(Math.max(0,parseInt(video_views)||0)); }
    if (orders_generated !== undefined) { fields.push(`orders_generated=$${i++}`);  params.push(Math.max(0,parseInt(orders_generated)||0)); }
    if (revenue_generated !== undefined){ fields.push(`revenue_generated=$${i++}`); params.push(Math.max(0,parseInt(revenue_generated)||0)); }
    if (address !== undefined)          { fields.push(`address=$${i++}`);           params.push(address||null); }

    if (!fields.length) return res.status(400).json({ error: 'Không có gì để cập nhật.' });
    fields.push(`updated_at=NOW()`);
    params.push(id);

    try {
      const r = await pool.query(
        `UPDATE creators SET ${fields.join(',')} WHERE id=$${i} RETURNING *`, params
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Không tìm thấy creator.' });

      // recalc score after update
      const c = r.rows[0];
      const er  = calcEngagement(c.avg_views, c.followers);
      const koc = calcKocScore(c.avg_views, c.followers, c.expected_monthly_gmv);
      const pot = calcPotential(er);
      await pool.query(
        'UPDATE creators SET score=$1, koc_score=$2, potential=$3 WHERE id=$4',
        [parseFloat(er.toFixed(4)), parseFloat(koc.toFixed(4)), pot, id]
      );
      return res.status(200).json({ creator: { ...c, score: er, koc_score: koc, potential: pot } });
    } catch (e) { console.error(e); return res.status(500).json({ error: 'Lỗi database.' }); }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM creators WHERE id=$1', [id]);
      return res.status(200).json({ success: true });
    } catch (e) { return res.status(500).json({ error: 'Lỗi database.' }); }
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).end();
}
