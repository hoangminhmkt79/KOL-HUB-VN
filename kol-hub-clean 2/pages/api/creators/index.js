import { getPool } from '../../../lib/db';

export default async function handler(req, res) {
  const pool = getPool();

  if (req.method === 'GET') {
    const { status, niche, ct, search } = req.query;
    let q = 'SELECT * FROM creators WHERE 1=1';
    const p = []; let i = 1;
    if (status && status !== 'all') { q += ` AND status=$${i++}`; p.push(status); }
    if (niche  && niche  !== 'all') { q += ` AND niche=$${i++}`;  p.push(niche); }
    if (ct     && ct     !== 'all') { q += ` AND content_type=$${i++}`; p.push(ct); }
    if (search) { q += ` AND (LOWER(name) LIKE $${i} OR LOWER(email) LIKE $${i++})`; p.push(`%${search.toLowerCase()}%`); }
    q += ' ORDER BY applied_at DESC';
    try {
      const r = await pool.query(q, p);
      return res.status(200).json({ creators: r.rows });
    } catch (e) { console.error(e); return res.status(500).json({ error: 'Lỗi database.' }); }
  }

  if (req.method === 'POST') {
    const { name, email, link, followers, niche, avg_views, avg_viewers, platform, ct, address, score, potential, expected_gmv, channel_gmv } = req.body;
    if (!name || !email || !link || !followers || !niche || !ct || !platform || !avg_views)
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Email không hợp lệ.' });
    try {
      const r = await pool.query(
        `INSERT INTO creators (name,email,tiktok_link,followers,niche,avg_views,avg_viewers,platform,content_type,address,score,potential,expected_gmv,channel_gmv)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id,name,email`,
        [name, email, link, parseInt(followers)||0, niche, parseInt(avg_views)||0, parseInt(avg_viewers)||0,
         platform, ct, address||'', parseFloat(score)||0, potential||'low', expected_gmv||'', channel_gmv||'']
      );
      return res.status(201).json({ success: true, creator: r.rows[0] });
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'Email này đã đăng ký rồi.' });
      console.error(e);
      return res.status(500).json({ error: 'Lỗi database.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
