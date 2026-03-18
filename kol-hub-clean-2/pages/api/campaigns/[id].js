import { getPool } from '../../../lib/db';

export default async function handler(req, res) {
  const pool = getPool();
  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ.' });

  if (req.method === 'PATCH') {
    const { status, creator_id, camp_status, posts_done } = req.body;
    try {
      if (status !== undefined) {
        await pool.query('UPDATE campaigns SET status=$1 WHERE id=$2', [status, id]);
      }
      if (creator_id !== undefined && camp_status !== undefined) {
        await pool.query(
          'UPDATE campaign_creators SET camp_status=$1 WHERE campaign_id=$2 AND creator_id=$3',
          [camp_status, id, creator_id]
        );
      }
      if (creator_id !== undefined && posts_done !== undefined) {
        await pool.query(
          'UPDATE campaign_creators SET posts_done=$1 WHERE campaign_id=$2 AND creator_id=$3',
          [parseInt(posts_done), id, creator_id]
        );
      }
      return res.status(200).json({ success: true });
    } catch (e) { console.error(e); return res.status(500).json({ error: 'Lỗi database.' }); }
  }

  res.setHeader('Allow', ['PATCH']);
  return res.status(405).end();
}
