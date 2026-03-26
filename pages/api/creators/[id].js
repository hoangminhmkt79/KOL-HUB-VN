import { getPool } from '../../../lib/db';

const VALID_STATUS = ['applied','pending','approved','rejected','sample_sent','content_posted','scaling','inactive','in_campaign'];

export default async function handler(req, res) {
  const pool = getPool();
  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ.' });

  if (req.method === 'PATCH') {
    const { status, gmv, promo_code } = req.body;
    const fields = []; const params = []; let i = 1;
    if (status !== undefined) {
      if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: 'Status không hợp lệ.' });
      fields.push(`status=$${i++}`); params.push(status);
    }
    if (gmv !== undefined) { fields.push(`gmv=$${i++}`); params.push(Math.round(parseFloat(gmv)||0)); }
    if (promo_code !== undefined) { fields.push(`promo_code=$${i++}`); params.push(promo_code||null); }
    if (!fields.length) return res.status(400).json({ error: 'Không có gì để cập nhật.' });
    params.push(id);
    try {
      const r = await pool.query(`UPDATE creators SET ${fields.join(',')} WHERE id=$${i} RETURNING *`, params);
      if (!r.rows.length) return res.status(404).json({ error: 'Không tìm thấy.' });
      return res.status(200).json({ creator: r.rows[0] });
    } catch (e) { console.error(e); return res.status(500).json({ error: 'Lỗi database.' }); }
  }

  res.setHeader('Allow', ['PATCH']);
  return res.status(405).end();
}
