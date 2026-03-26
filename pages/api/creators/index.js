import { getPool } from '../../../lib/db';

const PAGE_SIZE = 20;

export default async function handler(req, res) {
  const pool = getPool();

  if (req.method === 'GET') {
    const { status, niche, ct, search, page = 1 } = req.query;
    let q = 'SELECT * FROM creators WHERE 1=1';
    const p = []; let i = 1;
    if (status && status !== 'all') { q += ` AND status=$${i++}`; p.push(status); }
    if (niche  && niche  !== 'all') { q += ` AND niche=$${i++}`; p.push(niche); }
    if (ct     && ct     !== 'all') { q += ` AND content_type=$${i++}`; p.push(ct); }
    if (search) {
      q += ` AND (LOWER(name) LIKE $${i} OR LOWER(email) LIKE $${i} OR phone LIKE $${i++})`;
      p.push(`%${search.toLowerCase()}%`);
    }
    const countQ = q.replace('SELECT *', 'SELECT COUNT(*)');
    q += ' ORDER BY applied_at DESC';
    const offset = (parseInt(page) - 1) * PAGE_SIZE;
    const dataQ = q + ` LIMIT ${PAGE_SIZE} OFFSET ${offset}`;
    try {
      const [countR, dataR] = await Promise.all([pool.query(countQ, p), pool.query(dataQ, p)]);
      return res.status(200).json({ creators: dataR.rows, total: parseInt(countR.rows[0].count), page: parseInt(page), pages: Math.ceil(countR.rows[0].count / PAGE_SIZE) });
    } catch (e) { console.error(e); return res.status(500).json({ error: 'Lỗi database.' }); }
  }

  if (req.method === 'POST') {
    const { name, email, phone, tiktok_link, followers, niche, avg_views, avg_viewers, platform, content_type, channel_gmv, address, score, potential } = req.body;
    if (!name?.trim() || !tiktok_link?.trim() || !followers || !niche || !content_type || !platform)
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc.' });
    if (!phone?.trim() && !email?.trim())
      return res.status(400).json({ error: 'Cần có SĐT hoặc Email.' });
    if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Email không hợp lệ.' });
    try {
      const r = await pool.query(
        `INSERT INTO creators (name,email,phone,tiktok_link,followers,niche,avg_views,avg_viewers,platform,content_type,channel_gmv,address,score,potential,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'applied') RETURNING id,name`,
        [name.trim(), email?.trim()||'', phone?.trim()||'', tiktok_link.trim(),
         Math.max(0,parseInt(followers)||0), niche,
         Math.max(0,parseInt(avg_views)||0), Math.max(0,parseInt(avg_viewers)||0),
         platform, content_type, channel_gmv||'', address||'',
         parseFloat(score)||0, potential||'low']
      );
      return res.status(201).json({ success: true, creator: r.rows[0] });
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'Email này đã đăng ký rồi.' });
      console.error(e); return res.status(500).json({ error: 'Lỗi database.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
