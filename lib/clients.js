// Client (brand) requests: chuẩn hoá input, tính ước tính / audit / điểm, ghi DB.
import { HttpError } from './http';
import { SERVICES, PLATFORMS_B2B, GMV_BANDS, AD_BANDS, KOL_TIERS, estimateBooking, quickAudit, scoreRequest } from './clientOffer';
import { NICHES } from './constants';
import { randomCode } from './auth';

const bad = m => { throw new HttpError(400, m); };
const str = (v, n) => String(v ?? '').trim().slice(0, n);
const int = (v, min, max) => { const n = Math.round(Number(v) || 0); return Math.max(min, Math.min(max, n)); };
const bool = v => (v === true || v === 'true' || v === 'y' || v === 'yes' || v === 'có' ? true : v === false || v === 'false' || v === 'n' || v === 'no' || v === 'không' ? false : null);
const pick = (arr, allowed) => [...new Set((Array.isArray(arr) ? arr : String(arr || '').split(/[,|;]/)).map(x => String(x).trim()).filter(x => allowed.includes(x)))];

export function normalizeRequest(b, { strict = true } = {}) {
  const r = {
    company: str(b.company, 200), contact_name: str(b.contact_name, 120), role: str(b.role, 120),
    phone: str(b.phone, 20).replace(/\s/g, ''), email: str(b.email, 200).toLowerCase(),
    services: pick(b.services, SERVICES.map(s => s.v)), platforms: pick(b.platforms, PLATFORMS_B2B.map(p => p.v)),
    shop_links: str(b.shop_links, 1000), niche: NICHES.some(n => n.v === b.niche) ? b.niche : '',
    gmv_band: GMV_BANDS.some(x => x.v === b.gmv_band) ? b.gmv_band : '', ad_spend_band: AD_BANDS.some(x => x.v === b.ad_spend_band) ? b.ad_spend_band : '',
    sample_product: str(b.sample_product, 1000), sample_qty: int(b.sample_qty, 0, 10000), sample_value: int(b.sample_value, 0, 1e9),
    brief: str(b.brief, 5000), goal: str(b.goal, 1000),
    kol_tiers: pick(b.kol_tiers, KOL_TIERS.map(t => t.v)), kol_niches: pick(b.kol_niches, NICHES.map(n => n.v)), kol_requirements: str(b.kol_requirements, 2000),
    creators_count: int(b.creators_count, 0, 5000), videos_per_creator: int(b.videos_per_creator || 1, 1, 50), live_sessions: int(b.live_sessions, 0, 500),
    budget_booking: int(b.budget_booking, 0, 1e12), budget_ads: int(b.budget_ads, 0, 1e12),
    start_date: /^\d{4}-\d{2}-\d{2}$/.test(b.start_date || '') ? b.start_date : null,
    ads_active: bool(b.ads_active), gmv_max_active: bool(b.gmv_max_active), live_active: bool(b.live_active), koc_active: bool(b.koc_active),
    roas: Number(b.roas) > 0 && Number(b.roas) < 1000 ? Math.round(Number(b.roas) * 100) / 100 : null,
    is_decision_maker: bool(b.is_decision_maker),
  };
  if (strict) {
    if (!r.company) bad('Nhập tên brand / công ty.');
    if (!r.contact_name) bad('Nhập tên người liên hệ.');
    if (!r.phone && !r.email) bad('Cần SĐT hoặc email để team liên hệ.');
    if (r.phone && !/^(\+84|0)[0-9]{9,10}$/.test(r.phone)) bad('SĐT không hợp lệ.');
    if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) bad('Email không hợp lệ.');
    if (!r.services.length) bad('Chọn ít nhất 1 dịch vụ.');
  }
  return r;
}

export function computeRequest(r, rules) {
  const estimate = estimateBooking(r);
  const audit = quickAudit(r);
  const { score, reason, flags } = scoreRequest(r, estimate, rules);
  return { estimate, audit, score, score_reason: reason, flags };
}

export async function insertRequest(db, r, extra) {
  const row = { ...r, ...extra, ref: 'KH' + randomCode().slice(0, 6) };
  const cols = Object.keys(row);
  const vals = cols.map(k => (['estimate', 'audit', 'utm'].includes(k) ? JSON.stringify(row[k] ?? {}) : row[k]));
  const q = await db.query(`INSERT INTO client_requests (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`, vals);
  return q.rows[0];
}
