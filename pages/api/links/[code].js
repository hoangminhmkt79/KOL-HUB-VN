// Chi tiết 1 mã nguồn (link đa kênh HOẶC bài group FB): tuyển được ai, bao nhiêu, đến bước nào.
import { query } from '../../../lib/db';
import { route, bad, notFound, toInt } from '../../../lib/http';
import { getRules } from '../../../lib/settings';
import { buildContents, linksFor, originOf } from '../../../lib/links';
import { FUNNEL_SQL } from '../../../lib/attribution';

const codeOf = req => { const c = String(req.query.code || '').toUpperCase(); if (!/^[A-Z0-9]{4,16}$/.test(c)) bad('Mã không hợp lệ.'); return c; };

async function detail(req) {
  const code = codeOf(req);
  let src = (await query(`SELECT x.*, 'link' AS kind, ${FUNNEL_SQL} FROM track_links x WHERE x.code=$1`, [code])).rows[0];
  if (!src) src = (await query(`SELECT x.*, 'fb_post' AS kind, g.name AS source_name, 'fb_group' AS channel, ${FUNNEL_SQL} FROM fb_posts x JOIN fb_groups g ON g.id=x.group_id WHERE x.code=$1`, [code])).rows[0];
  if (!src) notFound();
  const recruits = await query(
    `SELECT c.id, c.name, c.handle, c.status, c.followers, c.avg_views, c.score, c.niche, c.applied_at, c.gmv, c.utm,
       rc.video_fee AS ask_fee, rc.videos_per_month AS ask_videos,
       EXISTS (SELECT 1 FROM videos v WHERE v.creator_id=c.id AND v.status<>'rejected') AS activated,
       EXISTS (SELECT 1 FROM deals d WHERE d.creator_id=c.id AND d.status IN ('booked','delivered','completed')) AS booked
     FROM creators c LEFT JOIN rate_cards rc ON rc.creator_id=c.id
     WHERE c.acq_code=$1 ORDER BY c.applied_at DESC LIMIT 500`, [code]);
  let content = null;
  if (src.kind === 'link') {
    const campaign = src.campaign_id ? (await query('SELECT * FROM campaigns WHERE id=$1', [src.campaign_id])).rows[0] : null;
    const utm = { utm_source: src.utm_source, utm_medium: src.utm_medium, utm_campaign: src.utm_campaign, utm_content: code };
    Object.assign(src, linksFor(originOf(req), code, utm));
    content = buildContents({ channel: src.channel, campaign, code, link: src.short, rules: await getRules(), angle: src.angle });
  }
  return { source: { ...src, gmv: Number(src.gmv), cost: Number(src.cost) || 0 }, recruits: recruits.rows, content };
}

async function update(req) {
  const code = codeOf(req);
  const b = req.body || {};
  const sets = []; const p = [];
  if (b.source_name !== undefined) { p.push(String(b.source_name).trim().slice(0, 200)); sets.push(`source_name=$${p.length}`); }
  if (b.cost !== undefined) { p.push(Math.max(0, toInt(b.cost))); sets.push(`cost=$${p.length}`); }
  if (b.note !== undefined) { p.push(String(b.note).slice(0, 500)); sets.push(`note=$${p.length}`); }
  if (!sets.length) bad('Không có gì để cập nhật.');
  p.push(code);
  const r = await query(`UPDATE track_links SET ${sets.join(',')} WHERE code=$${p.length} RETURNING *`, p);
  if (!r.rows.length) notFound();
  return { link: r.rows[0] };
}

async function remove(req) {
  await query('DELETE FROM track_links WHERE code=$1', [codeOf(req)]);
  return { success: true };
}

export default route({ GET: detail, PATCH: update, DELETE: remove }, { admin: true });
