// Public: brand đăng ký dịch vụ / campaign. Trả về ước tính ngân sách + mini-audit tức thì.
import { query } from '../../../lib/db';
import { route, bad } from '../../../lib/http';
import { getRules } from '../../../lib/settings';
import { normalizeRequest, computeRequest, insertRequest } from '../../../lib/clients';
import { resolveAcq } from '../../../lib/attribution';
import { serviceLabel } from '../../../lib/clientOffer';
import { notifyTeam } from '../../../lib/notify';

async function create(req, res) {
  const b = req.body || {};
  if (b.website) return { success: true }; // honeypot
  if (b.consent !== true) bad('Cần đồng ý xử lý dữ liệu để team liên hệ tư vấn.');
  const r = normalizeRequest(b);
  const rules = await getRules();
  const c = computeRequest(r, rules);
  const acqRaw = String(b.acq || (req.headers.cookie || '').match(/(?:^|;\s*)kol_acq=([^;]+)/)?.[1] || '').toUpperCase().slice(0, 16);
  const hit = await resolveAcq({ query }, acqRaw);
  const utm = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) if (b.utm?.[k]) utm[k] = String(b.utm[k]).slice(0, 100);
  const row = await insertRequest({ query }, r, { ...c, source: 'inbound', lawful_basis: 'consent', consent_at: new Date(), acq_code: hit?.code || null, utm, next_action_at: new Date(Date.now() + rules.lead_reply_hours * 3600e3) });
  await query(`INSERT INTO client_activities (request_id, type, actor, message) VALUES ($1,'created','client',$2)`, [row.id, `Đăng ký: ${r.services.map(serviceLabel).join(', ')} · điểm ${c.score}`]);
  notifyTeam(`🆕 Lead mới ${row.ref}: ${r.company} (${r.contact_name}) — ${r.services.map(serviceLabel).join(', ')} · budget ${(r.budget_booking + r.budget_ads).toLocaleString('vi-VN')}đ · điểm ${c.score}`).catch(() => {});
  return res.status(201).json({ ref: row.ref, estimate: c.estimate, audit: c.audit });
}

export default route({ POST: create });
