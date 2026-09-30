// Pipeline khách hàng (brand): inbound từ /brands + outbound import CSV (không scrape).
import { query } from '../../../lib/db';
import { route, bad } from '../../../lib/http';
import { getRules } from '../../../lib/settings';
import { normalizeRequest, computeRequest, insertRequest } from '../../../lib/clients';
import { REQUEST_STATUS_KEYS, SCORE_FORMULA } from '../../../lib/clientOffer';
import { logEvent } from '../../../lib/events';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

async function list(req) {
  const { status, service, source, search, flag } = req.query;
  const w = ['1=1']; const p = [];
  if (status && status !== 'all') { if (status === 'open') w.push(`status NOT IN ('won','lost')`); else { p.push(status); w.push(`status=$${p.length}`); } }
  if (service && service !== 'all') { p.push(service); w.push(`$${p.length} = ANY(services)`); }
  if (source && source !== 'all') { p.push(source); w.push(`source=$${p.length}`); }
  if (flag === 'due') w.push(`next_action_at <= NOW() AND status NOT IN ('won','lost') AND NOT do_not_contact`);
  if (search) { p.push(`%${String(search).toLowerCase()}%`); w.push(`(LOWER(company) LIKE $${p.length} OR LOWER(contact_name) LIKE $${p.length} OR phone LIKE $${p.length} OR LOWER(shop_links) LIKE $${p.length})`); }
  const [rows, sum] = await Promise.all([
    query(`SELECT id, ref, company, contact_name, phone, email, services, platforms, niche, gmv_band, budget_booking, budget_ads, creators_count, videos_per_creator,
             score, score_reason, flags, status, source, next_action_at, touch_count, do_not_contact, created_at, estimate->>'total' AS est_total
           FROM client_requests WHERE ${w.join(' AND ')} ORDER BY (status IN ('won','lost')), score DESC, created_at DESC LIMIT 300`, p),
    query(`SELECT
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS new_7d,
             COUNT(*) FILTER (WHERE status NOT IN ('won','lost'))::int AS open,
             COUNT(*) FILTER (WHERE next_action_at <= NOW() AND status NOT IN ('won','lost') AND NOT do_not_contact)::int AS due,
             COUNT(*) FILTER (WHERE status='won')::int AS won,
             COUNT(*) FILTER (WHERE status IN ('won','lost'))::int AS decided,
             COALESCE(SUM(budget_booking + budget_ads) FILTER (WHERE status NOT IN ('won','lost')),0) AS pipeline,
             COALESCE(SUM(budget_booking + budget_ads) FILTER (WHERE status='won'),0) AS won_value
           FROM client_requests`),
  ]);
  const s = sum.rows[0];
  return { requests: rows.rows, summary: { ...s, pipeline: Number(s.pipeline), won_value: Number(s.won_value), win_rate: s.decided ? Math.round((s.won / s.decided) * 100) : null }, score_formula: SCORE_FORMULA };
}

// Import lead outbound: cần cột nguồn hợp lệ (lawful_basis) — không nhận dữ liệu scrape
const COLS = {
  company: ['shop_name', 'tên shop', 'brand', 'company', 'công ty'], shop_links: ['shop_url', 'link shop', 'shop link', 'url'],
  platforms: ['platform', 'sàn'], niche: ['category', 'ngành', 'niche'], gmv_band: ['gmv_band'], contact_name: ['contact_name', 'người liên hệ'],
  role: ['role', 'chức vụ'], phone: ['phone', 'sđt', 'zalo'], email: ['email'], ads_active: ['ads_active'], gmv_max_active: ['gmv_max_active'],
  live_active: ['live_active'], koc_active: ['koc_active'], lawful_basis: ['lawful_basis', 'cơ sở pháp lý'], source_detail: ['source', 'source_detail', 'nguồn'],
};
async function importLeads(req) {
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || !rows.length) bad('File rỗng.');
  if (rows.length > 2000) bad('Tối đa 2.000 dòng / lần.');
  const heads = Object.keys(rows[0]);
  const col = {};
  for (const [k, al] of Object.entries(COLS)) col[k] = heads.find(h => al.includes(h.trim().toLowerCase()));
  if (!col.company && !col.shop_links) bad('File cần cột shop_name hoặc shop_url.');
  if (!col.lawful_basis) bad('File cần cột lawful_basis (consent | legitimate_b2b | referral) — không import dữ liệu không rõ nguồn.');
  const rules = await getRules();
  const cadence = String(rules.outbound_cadence_days).split(',').map(Number).filter(Number.isFinite);
  const out = { created: 0, duplicate: 0, suppressed: 0, invalid: 0 };
  for (const row of rows) {
    const g = k => (col[k] ? row[col[k]] : undefined);
    const basis = String(g('lawful_basis') || '').trim().toLowerCase();
    if (!['consent', 'legitimate_b2b', 'referral'].includes(basis)) { out.invalid++; continue; }
    const r = normalizeRequest({ company: g('company') || g('shop_links'), shop_links: g('shop_links'), platforms: g('platforms'), niche: g('niche'), gmv_band: g('gmv_band'),
      contact_name: g('contact_name'), role: g('role'), phone: g('phone'), email: g('email'), ads_active: g('ads_active'), gmv_max_active: g('gmv_max_active'),
      live_active: g('live_active'), koc_active: g('koc_active'), services: ['kol_booking', 'gmv_max'] }, { strict: false });
    if (r.phone || r.email) {
      const sup = await query(`SELECT 1 FROM client_requests WHERE do_not_contact AND ((phone<>'' AND phone=$1) OR (email<>'' AND email=$2)) LIMIT 1`, [r.phone, r.email]);
      if (sup.rows.length) { out.suppressed++; continue; }
    }
    if (r.shop_links) {
      const dup = await query(`SELECT 1 FROM client_requests WHERE LOWER(shop_links)=LOWER($1) LIMIT 1`, [r.shop_links]);
      if (dup.rows.length) { out.duplicate++; continue; }
    }
    const c = computeRequest({ ...r, source: 'outbound' }, rules);
    const srcDetail = String(g('source_detail') || '').trim().slice(0, 300);
    const lead = await insertRequest({ query }, r, { ...c, source: 'outbound', lawful_basis: basis, next_action_at: new Date(Date.now() + (cadence[0] || 0) * 864e5), brief: srcDetail ? `Nguồn: ${srcDetail}` : '' });
    await query(`INSERT INTO client_activities (request_id, type, actor, message) VALUES ($1,'created','admin',$2)`, [lead.id, `Import outbound (${basis})${srcDetail ? ` · ${srcDetail}` : ''}`]);
    out.created++;
  }
  await logEvent(null, { type: 'leads_imported', actor: 'admin', message: `Import lead: +${out.created} · trùng ${out.duplicate} · chặn ${out.suppressed} · thiếu cơ sở pháp lý ${out.invalid}` });
  return out;
}

export default route({ GET: list, POST: importLeads }, { admin: true });
