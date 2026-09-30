// Import hiệu quả video từ file export (TikTok Shop Affiliate / Analytics): khớp theo Video ID hoặc link
import { query } from '../../../lib/db';
import { route, bad } from '../../../lib/http';
import { rollupCreator } from '../../../lib/automation';
import { getRules } from '../../../lib/settings';
import { logEvent } from '../../../lib/events';
import { parseNum } from '../../../lib/constants';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

const COLS = {
  id:     ['video id', 'id video', 'video_id', 'content id'],
  link:   ['video link', 'link video', 'url', 'video url'],
  views:  ['video views', 'views', 'lượt xem', 'luot xem', 'vv'],
  likes:  ['likes', 'lượt thích', 'luot thich'],
  orders: ['orders', 'đơn hàng', 'don hang', 'affiliate orders', 'sku orders'],
  gmv:    ['gmv', 'affiliate gmv', 'video gmv', 'doanh thu'],
};
const num = v => Math.max(0, Math.round(parseNum(v) || 0));

async function importStats(req) {
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || !rows.length) bad('File rỗng.');
  const headers = Object.keys(rows[0]);
  const col = {};
  for (const [k, al] of Object.entries(COLS)) col[k] = headers.find(h => al.includes(h.trim().toLowerCase()));
  if (!col.id && !col.link) bad('File cần cột "Video ID" hoặc "Video link".');
  const rules = await getRules();
  let matched = 0; const touched = new Set();
  for (const r of rows) {
    const vid = col.id ? String(r[col.id] || '').replace(/\D/g, '') : (String(r[col.link] || '').match(/video\/(\d+)/)?.[1] || '');
    if (!vid) continue;
    const sets = []; const p = [];
    for (const k of ['views', 'likes', 'orders', 'gmv']) if (col[k]) { p.push(num(r[col[k]])); sets.push(`${k}=$${p.length}`); }
    if (!sets.length) continue;
    p.push(vid);
    const u = await query(`UPDATE videos SET ${sets.join(',')}, updated_at=NOW() WHERE video_id=$${p.length} RETURNING creator_id`, p);
    if (u.rows.length) { matched++; touched.add(u.rows[0].creator_id); }
  }
  for (const cid of touched) await rollupCreator({ query }, cid, rules);
  await logEvent(null, { type: 'video_stats_imported', actor: 'admin', message: `Import số liệu video: ${matched}/${rows.length} dòng khớp` });
  return { rows: rows.length, matched };
}

export default route({ POST: importStats }, { admin: true });
