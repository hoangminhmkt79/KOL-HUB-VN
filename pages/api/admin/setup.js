// Tạo / nâng cấp bảng. Chạy lại an toàn.
import { query } from '../../../lib/db';
import { route } from '../../../lib/http';
import { SCHEMA_SQL } from '../../../lib/schema';
import { handleFromLink } from '../../../lib/constants';

async function setup() {
  await query(SCHEMA_SQL);
  // Backfill handle cho creator cũ (bỏ qua handle trùng)
  const r = await query(`SELECT id, tiktok_link FROM creators WHERE handle='' AND tiktok_link<>''`);
  let filled = 0;
  for (const c of r.rows) {
    const h = handleFromLink(c.tiktok_link);
    if (!h) continue;
    const u = await query(
      `UPDATE creators SET handle=$1 WHERE id=$2 AND NOT EXISTS (SELECT 1 FROM creators WHERE LOWER(handle)=$1)`,
      [h, c.id]
    );
    filled += u.rowCount;
  }
  return { ok: true, handles_backfilled: filled };
}

export default route({ POST: setup }, { admin: true });
