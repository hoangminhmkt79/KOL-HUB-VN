import { query } from '../../../lib/db';
import { route, bad, toId, toInt } from '../../../lib/http';

const CAMP_STATUS = ['active', 'paused', 'completed'];

async function update(req) {
  const id = toId(req.query.id);
  const { status, is_public, creator_id, camp_status, posts_done } = req.body || {};
  if (status !== undefined) {
    if (!CAMP_STATUS.includes(status)) bad('Status không hợp lệ.');
    await query('UPDATE campaigns SET status=$1 WHERE id=$2', [status, id]);
  }
  if (is_public !== undefined) await query('UPDATE campaigns SET is_public=$1 WHERE id=$2', [!!is_public, id]);
  if (creator_id !== undefined && camp_status !== undefined) {
    await query('UPDATE campaign_creators SET camp_status=$1 WHERE campaign_id=$2 AND creator_id=$3', [String(camp_status).slice(0, 100), id, toInt(creator_id)]);
  }
  if (creator_id !== undefined && posts_done !== undefined) {
    await query('UPDATE campaign_creators SET posts_done=$1 WHERE campaign_id=$2 AND creator_id=$3', [Math.max(0, toInt(posts_done)), id, toInt(creator_id)]);
  }
  return { success: true };
}

async function remove(req) {
  await query('DELETE FROM campaigns WHERE id=$1', [toId(req.query.id)]);
  return { success: true };
}

export default route({ PATCH: update, DELETE: remove }, { admin: true });
