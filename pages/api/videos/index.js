import { query } from '../../../lib/db';
import { route, bad, notFound, toId } from '../../../lib/http';
import { submitVideo } from '../../../lib/automation';

async function list(req) {
  const { status } = req.query;
  const p = []; let w = '1=1';
  if (status && status !== 'all') { p.push(status); w = 'v.status=$1'; }
  const r = await query(
    `SELECT v.*, c.name AS creator_name, c.handle, cp.name AS campaign_name, s.tiktok_order_id
     FROM videos v JOIN creators c ON c.id=v.creator_id
     LEFT JOIN campaigns cp ON cp.id=v.campaign_id LEFT JOIN samples s ON s.id=v.sample_id
     WHERE ${w} ORDER BY v.created_at DESC LIMIT 300`,
    p
  );
  return { videos: r.rows };
}

async function create(req, res) {
  const { creator_id, url, sample_id } = req.body || {};
  if (!url) bad('Thiếu link video.');
  const c = await query('SELECT * FROM creators WHERE id=$1', [toId(creator_id)]);
  if (!c.rows.length) notFound('Creator không tồn tại.');
  const video = await submitVideo({ creator: c.rows[0], url, actor: 'admin', sampleId: sample_id || null });
  return res.status(201).json({ video });
}

export default route({ GET: list, POST: create }, { admin: true });
