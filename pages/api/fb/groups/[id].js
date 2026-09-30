import { query } from '../../../../lib/db';
import { route, toId, notFound, bad } from '../../../../lib/http';
import { groupFields } from '../../../../lib/fb';

async function update(req) {
  const id = toId(req.query.id);
  const f = groupFields(req.body || {}, false);
  const keys = Object.keys(f);
  if (!keys.length) bad('Không có gì để cập nhật.');
  const r = await query(`UPDATE fb_groups SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(',')} WHERE id=$${keys.length + 1} RETURNING *`, [...keys.map(k => f[k]), id]);
  if (!r.rows.length) notFound();
  return { group: r.rows[0] };
}

async function remove(req) {
  const r = await query('DELETE FROM fb_groups WHERE id=$1', [toId(req.query.id)]);
  if (!r.rowCount) notFound();
  return { success: true };
}

export default route({ PATCH: update, DELETE: remove }, { admin: true });
