import { tx, query } from '../../../../lib/db';
import { route, toId, bad, notFound, HttpError } from '../../../../lib/http';
import { logEvent } from '../../../../lib/events';
import { fbPageConfigured, publishToPage } from '../../../../lib/fbpage';

// posted → ghi posted_at + group.last_posted_at; removed 2 lần trong 1 group → group bị chặn
// Đăng tự động — CHỈ cho "group" loại Fanpage của brand (post_policy = 'page')
async function publishPage(id, b, req) {
  if (!fbPageConfigured()) bad('Chưa cấu hình Fanpage (env FB_PAGE_ID, FB_PAGE_TOKEN).');
  const r = await query('SELECT p.*, g.post_policy, g.name AS group_name FROM fb_posts p JOIN fb_groups g ON g.id=p.group_id WHERE p.id=$1', [id]);
  if (!r.rows.length) notFound();
  const p = r.rows[0];
  if (p.post_policy !== 'page') bad('Chỉ tự đăng được lên Fanpage của brand. Group Facebook phải do người thật đăng.');
  if (p.status !== 'draft') bad('Bài này đã đăng rồi.');
  const message = String(b.message || p.body || '').slice(0, 5000);
  if (!message.trim()) bad('Nội dung trống.');
  const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  let out;
  try { out = await publishToPage(message, `${origin}/j/${p.code}`); } catch (e) { throw new HttpError(502, e.message); }
  const u = await query(`UPDATE fb_posts SET status='posted', posted_at=NOW(), post_url=$2, poster='Fanpage API', body=$3 WHERE id=$1 RETURNING *`, [id, out.url.slice(0, 512), message]);
  await query('UPDATE fb_groups SET last_posted_at=NOW() WHERE id=$1', [p.group_id]);
  await logEvent(null, { type: 'fb_posted', actor: 'system', message: `Tự đăng bài ${p.code} lên Fanpage "${p.group_name}"` });
  return { post: u.rows[0] };
}

async function update(req) {
  const id = toId(req.query.id);
  const b = req.body || {};
  if (b.action === 'publish_page') return publishPage(id, b, req);
  if (b.status !== undefined && !['posted', 'removed'].includes(b.status)) bad('Trạng thái không hợp lệ (posted | removed).');
  const postUrl = b.post_url !== undefined ? String(b.post_url || '').trim().slice(0, 512) : undefined;
  if (postUrl && !/^https?:\/\/([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.watch)\//i.test(postUrl)) bad('Link bài đăng phải là link Facebook.');
  let cost;
  if (b.cost !== undefined && b.cost !== '' && b.cost !== null) {
    cost = Number(b.cost);
    if (!Number.isInteger(cost) || cost < 0) bad('Chi phí không hợp lệ.');
  }
  return tx(async db => {
    const cur = await db.query('SELECT * FROM fb_posts WHERE id=$1 FOR UPDATE', [id]);
    if (!cur.rows.length) notFound();
    const p = cur.rows[0];
    const sets = []; const vals = [];
    const put = (col, v) => { vals.push(v); sets.push(`${col}=$${vals.length}`); };
    if (postUrl !== undefined) put('post_url', postUrl);
    if (b.poster !== undefined) put('poster', String(b.poster || '').trim().slice(0, 120));
    if (cost !== undefined) put('cost', cost);
    if (b.status && b.status !== p.status) {
      if (b.status === 'posted' && p.status !== 'draft') bad('Chỉ đánh dấu "đã đăng" cho bài nháp.');
      put('status', b.status);
      if (b.status === 'posted') sets.push('posted_at=NOW()');
    }
    if (!sets.length) bad('Không có gì để cập nhật.');
    vals.push(id);
    const r = await db.query(`UPDATE fb_posts SET ${sets.join(',')} WHERE id=$${vals.length} RETURNING *`, vals);
    const post = r.rows[0];
    let group = null;
    if (b.status === 'posted' && p.status !== 'posted') {
      group = (await db.query('UPDATE fb_groups SET last_posted_at=NOW() WHERE id=$1 RETURNING *', [post.group_id])).rows[0];
      await logEvent(db, { type: 'fb_posted', actor: 'admin', message: `Đăng bài ${post.code} vào "${group.name}"${post.poster ? ` · ${post.poster}` : ''}` });
    }
    if (b.status === 'removed' && p.status !== 'removed') {
      const n = await db.query(`SELECT COUNT(*)::int AS n FROM fb_posts WHERE group_id=$1 AND status='removed'`, [post.group_id]);
      if (n.rows[0].n >= 2) {
        group = (await db.query(`UPDATE fb_groups SET status='banned' WHERE id=$1 RETURNING *`, [post.group_id])).rows[0];
        await logEvent(db, { type: 'fb_group_banned', actor: 'system', message: `Group "${group.name}" bị gỡ bài ${n.rows[0].n} lần → chuyển "Bị chặn"` });
      } else {
        await logEvent(db, { type: 'fb_post_removed', actor: 'admin', message: `Bài ${post.code} bị gỡ khỏi group` });
      }
    }
    return { post, group };
  });
}

export default route({ PATCH: update }, { admin: true });
