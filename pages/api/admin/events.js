import { query } from '../../../lib/db';
import { route, toInt } from '../../../lib/http';

async function list(req) {
  const limit = Math.min(200, Math.max(10, toInt(req.query.limit, 60)));
  const r = await query(
    `SELECT e.*, c.name AS creator_name FROM events e LEFT JOIN creators c ON c.id=e.creator_id
     ORDER BY e.created_at DESC LIMIT ${limit}`
  );
  return { events: r.rows };
}

export default route({ GET: list }, { admin: true });
