import { query, tx } from '../../../lib/db';
import { route, bad, notFound, toId } from '../../../lib/http';
import { getRules } from '../../../lib/settings';
import { REQUEST_STATUS, REQUEST_STATUS_KEYS, outreachDrafts, serviceLabel } from '../../../lib/clientOffer';
import { genCode } from '../../../lib/fb';
import { linksFor, originOf } from '../../../lib/links';
import { logEvent } from '../../../lib/events';

async function load(id) {
  const r = await query('SELECT * FROM client_requests WHERE id=$1', [id]);
  if (!r.rows.length) notFound();
  return r.rows[0];
}

// Mỗi lead có 1 link tracking riêng dẫn về trang /brands (đo ai mở link audit)
async function ensureTrackCode(lead) {
  if (lead.track_code) return lead.track_code;
  let code = '';
  for (let i = 0; i < 8 && !code; i++) {
    const c = genCode(7);
    const ex = await query('SELECT 1 FROM fb_posts WHERE code=$1 UNION ALL SELECT 1 FROM track_links WHERE code=$1', [c]);
    if (!ex.rows.length) code = c;
  }
  await query(`INSERT INTO track_links (code, channel, source_name, utm_source, utm_medium, utm_campaign, target) VALUES ($1,'other',$2,'outreach','direct','lead-audit','brand')`, [code, `Lead ${lead.ref} · ${lead.company || ''}`.slice(0, 200)]);
  await query('UPDATE client_requests SET track_code=$1 WHERE id=$2', [code, lead.id]);
  return code;
}

async function detail(req) {
  const lead = await load(toId(req.query.id));
  const code = await ensureTrackCode(lead);
  const link = linksFor(originOf(req), code, {}).short;
  const [acts, clicks] = await Promise.all([
    query('SELECT * FROM client_activities WHERE request_id=$1 ORDER BY created_at DESC LIMIT 100', [lead.id]),
    query('SELECT clicks FROM track_links WHERE code=$1', [code]),
  ]);
  return { request: { ...lead, track_code: code }, activities: acts.rows, link, link_clicks: clicks.rows[0]?.clicks || 0, drafts: outreachDrafts(lead, link) };
}

async function update(req) {
  const id = toId(req.query.id);
  const b = req.body || {};
  const lead = await load(id);
  const sets = []; const p = []; const notes = [];
  const put = (c, v) => { p.push(v); sets.push(`${c}=$${p.length}`); };
  if (b.status !== undefined) {
    if (!REQUEST_STATUS_KEYS.includes(b.status)) bad('Trạng thái không hợp lệ.');
    if (b.status === 'lost' && !String(b.lost_reason || lead.lost_reason || '').trim()) bad('Ghi lý do mất khách.');
    put('status', b.status); notes.push(`→ ${REQUEST_STATUS[b.status].l}`);
    if (['won', 'lost'].includes(b.status)) put('next_action_at', null);
  }
  if (b.lost_reason !== undefined) put('lost_reason', String(b.lost_reason).slice(0, 500));
  if (b.next_action_at !== undefined) { put('next_action_at', b.next_action_at ? new Date(b.next_action_at) : null); notes.push(`hẹn ${b.next_action_at ? new Date(b.next_action_at).toLocaleDateString('vi-VN') : '—'}`); }
  if (b.do_not_contact !== undefined) { put('do_not_contact', !!b.do_not_contact); notes.push(b.do_not_contact ? 'KHÔNG liên hệ nữa (opt-out)' : 'bỏ chặn liên hệ'); if (b.do_not_contact) put('next_action_at', null); }
  if (!sets.length) bad('Không có gì để cập nhật.');
  p.push(id);
  const r = await query(`UPDATE client_requests SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${p.length} RETURNING *`, p);
  await query(`INSERT INTO client_activities (request_id, type, message) VALUES ($1,'status',$2)`, [id, notes.join(' · ')]);
  return { request: r.rows[0] };
}

// POST: ghi 1 lần chạm (note/zalo/call/email/meeting) hoặc chuyển thành chiến dịch
async function act(req, res) {
  const id = toId(req.query.id);
  const b = req.body || {};
  const lead = await load(id);
  const rules = await getRules();
  if (b.action === 'convert') {
    if (lead.campaign_id) bad('Đã tạo chiến dịch từ yêu cầu này.');
    const camp = await tx(async db => {
      const c = await db.query(
        `INSERT INTO campaigns (name, product, budget, brief, req, niche, slots, posts_per, brand_name, contact_name, deal_type, fee_min, fee_max, sample_cost, is_public, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,FALSE,'active') RETURNING *`,
        [`${lead.company} — ${lead.ref}`.slice(0, 255), (lead.sample_product || '').slice(0, 255), Number(lead.budget_booking) || 0, lead.brief, lead.kol_requirements,
         (lead.kol_niches || [])[0] || lead.niche || '', Math.max(1, lead.creators_count || 10), Math.max(1, lead.videos_per_creator || 1),
         (lead.company || '').slice(0, 120), '', Number(lead.budget_booking) > 0 ? 'hybrid' : 'barter', 0, 0, Number(lead.sample_value) || 0]
      );
      await db.query(`UPDATE client_requests SET campaign_id=$1, status='won', next_action_at=NULL, updated_at=NOW() WHERE id=$2`, [c.rows[0].id, id]);
      await db.query(`INSERT INTO client_activities (request_id, type, message) VALUES ($1,'status',$2)`, [id, `Chốt → tạo chiến dịch #${c.rows[0].id} (ẩn khỏi landing đến khi bật công khai)`]);
      return c.rows[0];
    });
    await logEvent(null, { type: 'client_won', actor: 'admin', message: `Khách ${lead.company} chốt → chiến dịch "${camp.name}"` });
    return res.status(201).json({ campaign: camp });
  }
  const type = ['note', 'zalo', 'call', 'email', 'meeting', 'audit', 'proposal'].includes(b.type) ? b.type : 'note';
  const msg = String(b.message || '').trim().slice(0, 2000);
  if (!msg) bad('Nhập nội dung.');
  if (lead.do_not_contact && type !== 'note') bad('Lead đã yêu cầu không liên hệ.');
  await query(`INSERT INTO client_activities (request_id, type, message) VALUES ($1,$2,$3)`, [id, type, msg]);
  if (type !== 'note') {
    // Lần chạm tiếp theo theo nhịp outbound (mặc định D0/D3/D7/D14); inbound: hẹn lại sau 2 ngày
    const cad = String(rules.outbound_cadence_days).split(',').map(Number).filter(Number.isFinite);
    const n = lead.touch_count + 1;
    const nextDays = lead.source === 'outbound' ? (cad[n] !== undefined ? cad[n] - (cad[n - 1] || 0) : null) : 2;
    const next = nextDays === null ? null : new Date(Date.now() + nextDays * 864e5);
    const statusAuto = lead.status === 'new' ? 'contacted' : type === 'audit' ? 'audit_sent' : type === 'proposal' ? 'proposal' : lead.status;
    await query(`UPDATE client_requests SET touch_count=$2, next_action_at=$3, status=$4, updated_at=NOW() WHERE id=$1`, [id, n, next, statusAuto]);
  }
  return res.status(201).json({ ok: true });
}

export default route({ GET: detail, PATCH: update, POST: act }, { admin: true });
