import { query, tx } from '../../../lib/db';
import { route, bad, toInt } from '../../../lib/http';
import { randomToken, randomCode } from '../../../lib/auth';
import { engagementScore, potentialOf } from '../../../lib/scoring';
import { getRules } from '../../../lib/settings';
import { screenCreator } from '../../../lib/automation';
import { logEvent } from '../../../lib/events';
import { handleFromLink, NICHES, PLATFORMS, CTYPES } from '../../../lib/constants';

const PAGE_SIZE = 20;
const SORTS = { new: 'applied_at DESC', score: 'score DESC', gmv: 'gmv DESC', followers: 'followers DESC' };

async function list(req) {
  const { status, niche, ct, search, sort, potential } = req.query;
  const page = Math.max(1, toInt(req.query.page, 1));
  const where = ['1=1']; const p = [];
  const add = (sql, v) => { p.push(v); where.push(sql.replace('?', `$${p.length}`)); };
  if (status && status !== 'all') add('status=?', status);
  if (niche && niche !== 'all') add('niche=?', niche);
  if (ct && ct !== 'all') add('content_type=?', ct);
  if (potential && potential !== 'all') add('potential=?', potential);
  if (search) {
    p.push(`%${String(search).toLowerCase()}%`);
    const i = p.length;
    where.push(`(LOWER(name) LIKE $${i} OR LOWER(email) LIKE $${i} OR phone LIKE $${i} OR LOWER(handle) LIKE $${i})`);
  }
  const w = where.join(' AND ');
  const order = SORTS[sort] || SORTS.new;
  const [count, data] = await Promise.all([
    query(`SELECT COUNT(*)::int AS n FROM creators WHERE ${w}`, p),
    query(
      `SELECT c.*,
         (SELECT COUNT(*)::int FROM samples s WHERE s.creator_id=c.id AND s.status<>'cancelled') AS sample_count,
         (SELECT COUNT(*)::int FROM videos v WHERE v.creator_id=c.id AND v.status<>'rejected') AS video_count
       FROM creators c WHERE ${w} ORDER BY ${order}, id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
      p
    ),
  ]);
  const total = count.rows[0].n;
  return { creators: data.rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

async function create(req, res) {
  const b = req.body || {};
  if (b.website) return { success: true }; // honeypot chống bot
  const name = String(b.name || '').trim().slice(0, 255);
  const link = String(b.tiktok_link || '').trim().slice(0, 512);
  const email = String(b.email || '').trim().slice(0, 255);
  const phone = String(b.phone || '').replace(/\s/g, '').slice(0, 20);
  const followers = Math.max(0, toInt(b.followers));
  const avg_views = Math.max(0, toInt(b.avg_views));
  if (!name || !link || !followers) bad('Thiếu thông tin bắt buộc.');
  if (!phone && !email) bad('Cần có SĐT hoặc Email.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad('Email không hợp lệ.');
  if (phone && !/^(\+84|0)[0-9]{9,10}$/.test(phone)) bad('SĐT không hợp lệ.');
  if (!NICHES.some(n => n.v === b.niche)) bad('Lĩnh vực không hợp lệ.');
  if (!PLATFORMS.some(x => x.v === b.platform)) bad('Nền tảng không hợp lệ.');
  if (!CTYPES.some(x => x.v === b.content_type)) bad('Loại nội dung không hợp lệ.');
  if (b.consent !== true) bad('Cần đồng ý xử lý dữ liệu cá nhân để đăng ký.');

  const handle = handleFromLink(link);
  const dupe = await query(
    `SELECT id, status, source FROM creators
     WHERE (phone<>'' AND phone=$1) OR ($2<>'' AND LOWER(handle)=$2) OR ($3<>'' AND LOWER(email)=LOWER($3)) LIMIT 1`,
    [phone, handle, email]
  );
  const score = engagementScore(followers, avg_views);
  const fields = {
    name, email, phone, tiktok_link: link, handle, followers, avg_views,
    avg_viewers: Math.max(0, toInt(b.avg_viewers)), niche: b.niche, platform: b.platform, content_type: b.content_type,
    channel_gmv: String(b.channel_gmv || '').slice(0, 50), address: String(b.address || '').slice(0, 200),
    score, potential: potentialOf(score),
  };

  // Creator được mời (prospect) quay lại điền form → cập nhật hồ sơ thay vì báo trùng
  if (dupe.rows.length && dupe.rows[0].source !== 'invite') {
    return res.status(409).json({ error: 'Kênh / SĐT / email này đã đăng ký rồi. Kiểm tra link theo dõi đã nhận hoặc liên hệ team.' });
  }

  // Nguồn tuyển: mã bài đăng group FB (?acq= hoặc cookie kol_acq từ /j/[code])
  const acqRaw = String(b.acq || (req.headers.cookie || '').match(/(?:^|;\s*)kol_acq=([^;]+)/)?.[1] || '').toUpperCase().slice(0, 16);
  let acq = null;
  if (/^[A-Z0-9]{4,16}$/.test(acqRaw)) {
    const r = await query('SELECT code FROM fb_posts WHERE code=$1', [acqRaw]);
    acq = r.rows[0]?.code || null;
  }

  const rules = await getRules();
  const out = await tx(async db => {
    let referredBy = null;
    if (b.ref) {
      const r = await db.query('SELECT id FROM creators WHERE ref_code=$1', [String(b.ref).toUpperCase().slice(0, 16)]);
      referredBy = r.rows[0]?.id || null;
    }
    let row;
    const cols = Object.keys(fields);
    if (dupe.rows.length) {
      const r = await db.query(
        `UPDATE creators SET ${cols.map((k, i) => `${k}=$${i + 1}`).join(',')}, status='applied', source='invite_accepted',
           consent_at=NOW(), acq_code=COALESCE($${cols.length + 2}, acq_code), updated_at=NOW()
         WHERE id=$${cols.length + 1} RETURNING *`,
        [...cols.map(k => fields[k]), dupe.rows[0].id, acq]
      );
      row = r.rows[0];
    } else {
      const all = { ...fields, portal_token: randomToken(), ref_code: randomCode(), referred_by: referredBy,
        source: acq ? 'fb_group' : referredBy ? 'referral' : 'form', acq_code: acq, consent_at: new Date(), status: 'applied' };
      const keys = Object.keys(all);
      const r = await db.query(
        `INSERT INTO creators (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`,
        keys.map(k => all[k])
      );
      row = r.rows[0];
    }
    await logEvent(db, { type: 'creator_applied', creator_id: row.id, actor: 'creator', message: `Đăng ký mới · ${followers.toLocaleString('vi-VN')} followers · score ${score}${referredBy ? ' · qua giới thiệu' : ''}${acq ? ` · từ group FB (${acq})` : ''}` });
    row.status = await screenCreator(db, row, rules);
    return row;
  });

  return res.status(201).json({ success: true, portal_token: out.portal_token, ref_code: out.ref_code, status: out.status, score });
}

export default route({ GET: list, POST: create }, { admin: ['GET'] });
