import { getPool } from '../../../lib/db';
import { calcEngagement, calcKocScore, calcPotential } from '../../../lib/score';

const PAGE_SIZE = 20;

export default async function handler(req, res) {
  const pool = getPool();

  // ── GET — list with pagination + filters ──────────────────
  if (req.method === 'GET') {
    const { status, niche, ct, search, page = 1, sort = 'applied_at', order = 'desc', gmv_min, gmv_max } = req.query;
    let q = 'SELECT * FROM creators WHERE 1=1';
    const p = []; let i = 1;
    if (status && status !== 'all') { q += ` AND status=$${i++}`; p.push(status); }
    if (niche  && niche  !== 'all') { q += ` AND niche=$${i++}`;  p.push(niche); }
    if (ct     && ct     !== 'all') { q += ` AND content_type=$${i++}`; p.push(ct); }
    if (gmv_min) { q += ` AND expected_monthly_gmv >= $${i++}`; p.push(parseInt(gmv_min)); }
    if (gmv_max) { q += ` AND expected_monthly_gmv <= $${i++}`; p.push(parseInt(gmv_max)); }
    if (search) {
      q += ` AND (LOWER(name) LIKE $${i} OR LOWER(email) LIKE $${i++})`;
      p.push(`%${search.toLowerCase()}%`);
    }
    // sort
    const SAFE_SORT = ['applied_at','koc_score','expected_monthly_gmv','revenue_generated','followers'];
    const sortCol = SAFE_SORT.includes(sort) ? sort : 'applied_at';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';
    q += ` ORDER BY ${sortCol} ${sortDir} NULLS LAST`;
    // pagination
    const offset = (parseInt(page) - 1) * PAGE_SIZE;
    const countQ = q.replace('SELECT *', 'SELECT COUNT(*)');
    const dataQ  = q + ` LIMIT ${PAGE_SIZE} OFFSET ${offset}`;
    try {
      const [countR, dataR] = await Promise.all([pool.query(countQ, p), pool.query(dataQ, p)]);
      return res.status(200).json({
        creators: dataR.rows,
        total: parseInt(countR.rows[0].count),
        page: parseInt(page),
        pages: Math.ceil(countR.rows[0].count / PAGE_SIZE),
      });
    } catch (e) { console.error(e); return res.status(500).json({ error: 'Lỗi database.' }); }
  }

  // ── POST — create creator ──────────────────────────────────
  if (req.method === 'POST') {
    const {
      name, email, tiktok_link, followers, niche, avg_views, avg_viewers,
      platform, content_type, expected_monthly_gmv, channel_gmv,
    } = req.body;

    // validate
    if (!name?.trim() || !email?.trim() || !tiktok_link?.trim() || !followers || !niche || !content_type || !platform)
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Email không hợp lệ.' });

    const fol  = Math.max(0, parseInt(followers) || 0);
    const views = Math.max(0, parseInt(avg_views) || 0);
    const gmv  = expected_monthly_gmv ? Math.max(0, parseInt(expected_monthly_gmv)) : null;
    const chanGmv = Math.max(0, parseInt(channel_gmv) || 0);
    const er   = calcEngagement(views, fol);
    const koc  = calcKocScore(views, fol, gmv);
    const pot  = calcPotential(er);

    try {
      const r = await pool.query(
        `INSERT INTO creators
         (name,email,tiktok_link,followers,niche,avg_views,avg_viewers,platform,content_type,
          expected_monthly_gmv,channel_gmv,score,koc_score,potential,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'applied')
         RETURNING id,name,email,koc_score,potential`,
        [name.trim(), email.trim().toLowerCase(), tiktok_link.trim(),
         fol, niche, views, Math.max(0, parseInt(avg_viewers)||0),
         platform, content_type, gmv, chanGmv,
         parseFloat(er.toFixed(4)), parseFloat(koc.toFixed(4)), pot]
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
