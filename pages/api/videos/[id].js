import { query, tx } from '../../../lib/db';
import { route, bad, notFound, toId, toInt } from '../../../lib/http';
import { rollupCreator } from '../../../lib/automation';
import { getRules } from '../../../lib/settings';
import { logEvent } from '../../../lib/events';
import { VIDEO_STATUS } from '../../../lib/constants';

async function update(req) {
  const id = toId(req.query.id);
  const b = req.body || {};
  const rules = await getRules();
  return tx(async db => {
    const sets = []; const p = [];
    const put = (col, v) => { p.push(v); sets.push(`${col}=$${p.length}`); };
    if (b.status !== undefined) {
      if (!VIDEO_STATUS[b.status]) bad('Status không hợp lệ.');
      put('status', b.status);
    }
    for (const k of ['views', 'likes', 'orders', 'gmv']) if (b[k] !== undefined) put(k, Math.max(0, toInt(b[k])));
    if (!sets.length) bad('Không có gì để cập nhật.');
    p.push(id);
    const r = await db.query(`UPDATE videos SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${p.length} RETURNING *`, p);
    if (!r.rows.length) notFound();
    const v = r.rows[0];
    if (b.status) await logEvent(db, { type: `video_${b.status}`, creator_id: v.creator_id, video_id: id, actor: 'admin', message: `Video → ${VIDEO_STATUS[b.status].l}` });
    await rollupCreator(db, v.creator_id, rules);
    return { video: v };
  });
}

async function remove(req) {
  await query('DELETE FROM videos WHERE id=$1', [toId(req.query.id)]);
  return { success: true };
}

export default route({ PATCH: update, DELETE: remove }, { admin: true });
