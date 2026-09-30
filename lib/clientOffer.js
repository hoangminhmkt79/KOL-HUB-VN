// Dịch vụ cho client (brand) + ước tính ngân sách booking. Hàm thuần, dùng cả client & server.

export const SERVICES = [
  { v: 'kol_booking',  l: 'Booking KOC/KOL', s: 'Tìm, duyệt, gửi mẫu, quản lý video & SLA', ic: '🎬' },
  { v: 'kol_strategy', l: 'Tư vấn chiến lược KOC/KOL', s: 'Chọn tier, ngách, kịch bản, ngân sách theo mục tiêu GMV', ic: '🧭' },
  { v: 'gmv_max',      l: 'Tối ưu GMV Max (Product & LIVE)', s: 'Audit cấu trúc, creative, ROI target, scale ngân sách', ic: '📈' },
  { v: 'livestream',   l: 'Livestream bán hàng', s: 'Kịch bản, host/KOL live, vận hành phiên live', ic: '🎥' },
  { v: 'ads_audit',    l: 'Audit tài khoản Ads', s: 'Shopee Ads / TikTok Ads / GMV Max — báo cáo + đề xuất', ic: '🔍' },
  { v: 'shop_ops',     l: 'Vận hành gian hàng', s: 'Listing, voucher, campaign sàn, CSKH, báo cáo P&L', ic: '🏪' },
  { v: 'google_fb',    l: 'Ads đa kênh Google / Facebook', s: 'Kéo traffic ngoài sàn về shop, remarketing', ic: '🌐' },
];
export const serviceLabel = v => SERVICES.find(s => s.v === v)?.l || v;

export const PLATFORMS_B2B = [
  { v: 'tiktok', l: 'TikTok Shop' }, { v: 'shopee', l: 'Shopee' }, { v: 'lazada', l: 'Lazada' },
  { v: 'website', l: 'Website' }, { v: 'google', l: 'Google' }, { v: 'facebook', l: 'Facebook' },
];

export const GMV_BANDS = [
  { v: 'lt100m', l: '< 100 triệu/tháng', w: 0 },
  { v: '100_500m', l: '100 – 500 triệu', w: 1 },
  { v: '500m_2b', l: '500 triệu – 2 tỷ', w: 2 },
  { v: '2b_10b', l: '2 – 10 tỷ', w: 3 },
  { v: 'gt10b', l: '> 10 tỷ', w: 3 },
];
export const AD_BANDS = [
  { v: 'none', l: 'Chưa chạy ads', w: 0 },
  { v: 'lt50m', l: '< 50 triệu/tháng', w: 1 },
  { v: '50_200m', l: '50 – 200 triệu', w: 2 },
  { v: '200m_1b', l: '200 triệu – 1 tỷ', w: 3 },
  { v: 'gt1b', l: '> 1 tỷ', w: 3 },
];

// Giá tham khảo / 1 video theo tier (VNĐ, ước tính thị trường VN — chỉnh theo thực tế)
export const KOL_TIERS = [
  { v: 'nano',  l: 'Nano',  s: '1k – 10k follower',   fee: 600000 },
  { v: 'micro', l: 'Micro', s: '10k – 100k follower', fee: 3000000 },
  { v: 'mid',   l: 'Mid',   s: '100k – 500k follower', fee: 12000000 },
  { v: 'macro', l: 'Macro', s: '> 500k follower',      fee: 40000000 },
];

export const PAIN_POINTS = [
  { v: 'gmv_stuck', l: 'GMV chững / giảm' },
  { v: 'roas_low', l: 'ROAS / ROI ads thấp' },
  { v: 'no_creative', l: 'Thiếu video / creative mới' },
  { v: 'koc_no_sales', l: 'KOC không ra đơn' },
  { v: 'no_team', l: 'Thiếu người vận hành' },
  { v: 'compliance', l: 'Sợ vi phạm quảng cáo / bị gỡ video' },
  { v: 'new_launch', l: 'Ra mắt sản phẩm mới' },
  { v: 'mega_sale', l: 'Chuẩn bị mega sale (9.9, 11.11, 12.12)' },
];
export const CURRENT_PARTNER = [
  { v: 'none', l: 'Tự làm, chưa có đội' }, { v: 'inhouse', l: 'Có team in-house' },
  { v: 'agency', l: 'Đang thuê agency' }, { v: 'freelancer', l: 'Thuê freelancer' },
];
export const TIMELINES = [
  { v: 'asap', l: 'Càng sớm càng tốt (≤ 2 tuần)' }, { v: '1m', l: 'Trong 1 tháng' },
  { v: '3m', l: 'Trong 3 tháng' }, { v: 'explore', l: 'Đang tìm hiểu' },
];
export const CONTACT_CHANNELS = [{ v: 'zalo', l: 'Zalo' }, { v: 'phone', l: 'Gọi điện' }, { v: 'email', l: 'Email' }];
export const HEARD_FROM = [
  { v: 'facebook', l: 'Facebook / group' }, { v: 'tiktok', l: 'TikTok' }, { v: 'google', l: 'Google' },
  { v: 'referral', l: 'Được giới thiệu' }, { v: 'event', l: 'Sự kiện / workshop' }, { v: 'other', l: 'Khác' },
];
export const optLabel = (arr, v) => arr.find(x => x.v === v)?.l || '';

// Mức đầy đủ hồ sơ (để biết cần hỏi thêm gì khi gọi)
export const PROFILE_FIELDS = [
  ['company', 'Tên brand'], ['contact_name', 'Người liên hệ'], ['phone', 'SĐT / Zalo'], ['role', 'Vai trò'],
  ['shop_links', 'Link shop'], ['niche', 'Ngành hàng'], ['gmv_band', 'GMV / tháng'], ['aov', 'Giá trị đơn TB (AOV)'],
  ['top_products', 'Sản phẩm chủ lực'], ['target_customer', 'Khách hàng mục tiêu'], ['pain_points', 'Vấn đề đang gặp'],
  ['goal', 'Mục tiêu'], ['timeline', 'Thời gian bắt đầu'], ['budget_any', 'Ngân sách'], ['current_partner', 'Đang làm với ai'],
];
export function profileCompleteness(r) {
  const has = k => (k === 'budget_any' ? (Number(r.budget_booking) || 0) + (Number(r.budget_ads) || 0) > 0
    : Array.isArray(r[k]) ? r[k].length > 0 : k === 'aov' ? Number(r.aov) > 0 : !!String(r[k] ?? '').trim());
  const missing = PROFILE_FIELDS.filter(([k]) => !has(k)).map(([, l]) => l);
  return { pct: Math.round(((PROFILE_FIELDS.length - missing.length) / PROFILE_FIELDS.length) * 100), missing };
}

export const REQUEST_STATUS = {
  new:        { l: 'Mới',          tone: 'amber' },
  qualified:  { l: 'Đủ điều kiện', tone: 'blue' },
  contacted:  { l: 'Đã liên hệ',   tone: 'blue' },
  audit_sent: { l: 'Đã gửi audit', tone: 'violet' },
  proposal:   { l: 'Đã báo giá',   tone: 'violet' },
  won:        { l: 'Chốt',         tone: 'green' },
  lost:       { l: 'Mất',          tone: 'red' },
};
export const REQUEST_STATUS_KEYS = Object.keys(REQUEST_STATUS);

const round100k = n => Math.round(n / 100000) * 100000;

// Ước tính: tổng video, chi phí booking theo tier (chia đều các tier đã chọn), mẫu, so với budget
export function estimateBooking({ creators_count, videos_per_creator, kol_tiers = [], sample_value = 0, budget_booking = 0 }) {
  const creators = Math.max(0, Number(creators_count) || 0);
  const vpc = Math.max(1, Number(videos_per_creator) || 1);
  const videos = creators * vpc;
  const tiers = KOL_TIERS.filter(t => kol_tiers.includes(t.v));
  const mix = tiers.length ? tiers : [KOL_TIERS[0], KOL_TIERS[1]];
  const avgFee = mix.reduce((a, t) => a + t.fee, 0) / mix.length;
  const fees = round100k(videos * avgFee);
  const samples = round100k(creators * (Number(sample_value) || 0));
  const total = fees + samples;
  const budget = Number(budget_booking) || 0;
  const fit = total > 0 && budget > 0 ? Math.round((budget / total) * 100) / 100 : null;
  // Với budget hiện có: book được bao nhiêu video mỗi tier
  const perTier = KOL_TIERS.map(t => ({ tier: t.v, l: t.l, videos: budget > 0 ? Math.floor(Math.max(0, budget - samples) / t.fee) : 0 }));
  const advice = [];
  if (!creators) advice.push('Chưa nhập số creator — team sẽ đề xuất số lượng theo mục tiêu GMV.');
  else if (fit !== null && fit < 0.7) advice.push(`Ngân sách đang thấp hơn ước tính (~${Math.round(fit * 100)}%). Gợi ý: chuyển sang nano/micro, giảm số video/creator, hoặc kết hợp barter + hoa hồng.`);
  else if (fit !== null && fit > 1.5) advice.push('Ngân sách dư so với số lượng — có thể thêm creator micro hoặc dành một phần để boost Spark Ads / GMV Max cho video tốt.');
  if (videos >= 20) advice.push('Nên chia 2–3 đợt: test 20–30% creator trước, giữ ngân sách scale cho nhóm ra đơn tốt.');
  return { creators, videos, avg_fee: Math.round(avgFee), fees, samples, total, budget, fit, per_tier: perTier, advice };
}

// Mini-audit tức thì (lead magnet): 5 trục, mỗi trục 0–20 → điểm sức khoẻ shop 0–100 + việc nên làm
export function quickAudit(r) {
  const axes = [];
  // null = khách chưa trả lời → điểm trung tính + gợi ý hỏi khi gọi (không kết luận sai)
  const add = (key, l, known, score, tip, ask) => axes.push({ key, l, score: known ? score : 10, tip: known ? tip : ask, unknown: !known });
  const roas = Number(r.roas) || 0;
  add('ads', 'Ads hiệu quả', r.ads_active !== null && r.ads_active !== undefined,
    r.ads_active === false ? 4 : roas >= 6 ? 18 : roas >= 3 ? 12 : roas > 0 ? 7 : 10,
    r.ads_active === false ? 'Chưa chạy ads: bắt đầu GMV Max Product với ROI target theo biên lợi nhuận để lấy data.' : roas && roas < 3 ? `ROAS ${roas} thấp: rà cấu trúc campaign, loại SKU lỗ, đặt ROI target theo biên lợi nhuận.` : 'Giữ ROI target, tăng ngân sách 20%/lần khi ổn định 3 ngày.',
    'Cần hỏi: đang chạy loại ads nào, ROAS 30 ngày gần nhất?');
  add('gmvmax', 'GMV Max', r.gmv_max_active !== null && r.gmv_max_active !== undefined, r.gmv_max_active ? 16 : 6,
    r.gmv_max_active ? 'GMV Max chững thường do thiếu creative mới: cần 10–20 video KOC/tháng để nuôi thuật toán.' : 'Chưa bật GMV Max: thị phần đang chảy sang shop đối thủ đã bật.',
    'Cần hỏi: đã bật GMV Max Product / LIVE chưa, mỗi tháng thêm bao nhiêu video mới?');
  add('koc', 'Nguồn video KOC', r.koc_active !== null && r.koc_active !== undefined, r.koc_active ? 14 : 4,
    r.koc_active ? 'Đo ROI mẫu (GMV / chi phí mẫu) từng creator, cắt nhóm < 1,5×.' : 'Chưa có KOC: seeding 20–30 nano/micro để có creative + social proof.',
    'Cần hỏi: bao nhiêu KOC đang ra đơn, tỷ lệ mẫu ra video?');
  add('live', 'Livestream', r.live_active !== null && r.live_active !== undefined, r.live_active ? 15 : 6,
    r.live_active ? 'Tách ngân sách GMV Max LIVE, test khung giờ 20h–23h.' : 'Chưa live: bắt đầu 3 phiên/tuần với KOC có tỉ lệ chốt tốt.',
    'Cần hỏi: có livestream không, mấy phiên/tuần, GMV/phiên?');
  const briefOk = [r.shop_links, r.brief || r.top_products, r.sample_product].filter(Boolean).length;
  add('base', 'Nền tảng shop', true, 6 + briefOk * 4, briefOk < 3 ? 'Bổ sung brief + sản phẩm chủ lực để lên kế hoạch chính xác.' : 'Nền tảng đủ để lên kế hoạch scale.', '');
  // Vấn đề khách tự nêu → ưu tiên lời khuyên tương ứng
  if ((r.pain_points || []).includes('gmv_stuck') || (r.pain_points || []).includes('no_creative')) {
    const g = axes.find(x => x.key === 'gmvmax'); if (g && g.unknown) g.tip = 'Khách nêu GMV chững / thiếu creative → kiểm tra số video mới đưa vào GMV Max mỗi tháng (thường < 10 là nguyên nhân chính).';
  }
  const total = axes.reduce((a, x) => a + x.score, 0);
  const actions = [...axes].filter(x => x.tip).sort((a, b) => a.score - b.score).slice(0, 3).map(x => x.tip);
  return { total, axes, actions, unknown: axes.filter(x => x.unknown).length };
}

// Cờ: dịch vụ ngoài năng lực hiện tại, ngách xung đột lợi ích, thiếu liên hệ
export function flagsFor(r, rules = {}) {
  const accepted = String(rules.accepted_services || '').split(',').map(x => x.trim()).filter(Boolean);
  const coi = String(rules.coi_niches || '').split(',').map(x => x.trim()).filter(Boolean);
  const flags = [];
  const out = (r.services || []).filter(x => accepted.length && !accepted.includes(x));
  if (out.length) flags.push(`partner:${out.join('|')}`);
  if (r.niche && coi.includes(r.niche)) flags.push('coi');
  if (!r.phone && !r.email) flags.push('no_contact');
  return flags;
}
export const flagLabel = f => (f === 'coi' ? '⚠ Ngách có thể xung đột lợi ích — cần chấp thuận công ty'
  : f === 'no_contact' ? 'Thiếu SĐT / email'
  : f.startsWith('partner:') ? `Dịch vụ chưa nhận (chuyển đối tác): ${f.slice(8).split('|').map(serviceLabel).join(', ')}` : f);

// Điểm lead 0–100 = Fit (60) + Intent (40). Công thức hiển thị trên UI.
export const SCORE_FORMULA = 'Fit 60 (quy mô GMV, ads, cơ hội GMV Max/KOC, ngành) + Intent 40 (inbound/outbound, ngân sách, người quyết định, brief đầy đủ, thời gian bắt đầu, vấn đề nêu rõ)';
export function scoreRequest(r, est, rules = {}) {
  const parts = [];
  const gmvPts = { lt100m: 5, '100_500m': 20, '500m_2b': 20, '2b_10b': 12, gt10b: 8 }[r.gmv_band] ?? 5;
  const adsPts = r.ads_active ? 8 : 3;
  const opp = (r.gmv_max_active === false || r.live_active === false ? 7 : 0) + (r.koc_active ? 5 : 0);
  const nichePts = ['suc_khoe', 'lam_dep', 'me_be'].includes(r.niche) ? 15 : r.niche ? 8 : 4;
  const fit = Math.min(60, gmvPts + adsPts + opp + nichePts);
  parts.push(`Fit ${fit}/60`);
  const budget = (Number(r.budget_booking) || 0) + (Number(r.budget_ads) || 0);
  let intent = (r.source === 'outbound' ? 3 : 15) + (budget >= 30e6 ? 10 : budget >= 10e6 ? 6 : budget > 0 ? 3 : 0)
    + (r.is_decision_maker ? 8 : 0) + Math.round(([r.shop_links, r.brief, r.sample_product].filter(Boolean).length / 3) * 7);
  intent += r.timeline === 'asap' ? 5 : r.timeline === '1m' ? 3 : 0;
  intent += Math.min(4, (r.pain_points?.length || 0) * 2);
  if (est?.fit != null && est.fit < 0.5) intent -= 5;
  intent = Math.max(0, Math.min(40, intent));
  parts.push(`Intent ${intent}/40`);
  let score = fit + intent;
  const flags = flagsFor(r, rules);
  if (flags.includes('no_contact')) { score -= 20; parts.push('−20 thiếu liên hệ'); }
  return { score: Math.max(0, Math.min(100, score)), reason: parts.join(' · '), flags };
}

// Mẫu tin outreach (người thật gửi) — chèn insight + link audit tracking
export function outreachDrafts(r, link) {
  const shop = r.company || 'shop';
  const nm = String(r.contact_name || '').trim();
  const who = !nm ? 'anh/chị' : /^(anh|chị|chi|em|a|c)\s/i.test(nm) ? nm : `anh/chị ${nm}`;
  const insight = r.gmv_max_active === false ? 'shop chưa bật GMV Max' : r.koc_active === false ? 'shop đang ít video KOC mới để nuôi GMV Max' : r.live_active === false ? 'shop chưa khai thác livestream' : 'shop có thể tăng GMV bằng nguồn creative KOC ổn định';
  return [
    { key: 'd0', day: 0, ch: 'Zalo / LinkedIn', text: `Chào ${who}, em là … bên KOL Hub. Em có xem ${shop} và thấy ${insight}. Bên em đang làm audit miễn phí (GMV Max + KOC, trả kết quả trong 24h). ${who[0].toUpperCase() + who.slice(1)} xem thử tại: ${link} — nếu không phù hợp, ${who} cứ nhắn "không" để em không làm phiền nữa ạ.` },
    { key: 'd3', day: 3, ch: 'Gọi điện', text: `Kịch bản gọi (2 phút): giới thiệu → 1 insight về ${shop} (${insight}) → hỏi mục tiêu GMV quý này + ai phụ trách ads/KOC → đề xuất audit 30 phút. Ghi kết quả vào lịch sử.` },
    { key: 'd7', day: 7, ch: 'Email (chỉ khi có đồng ý / cơ sở B2B hợp lệ)', text: `Tiêu đề: ${shop} — 3 việc tăng GMV từ KOC + GMV Max\n\nChào ${who},\nEm gửi 3 gợi ý nhanh cho ${shop}: (1) … (2) … (3) …\nNếu muốn bản audit đầy đủ (miễn phí): ${link}\n\nĐể ngừng nhận email, trả lời "HUỶ".` },
    { key: 'd14', day: 14, ch: 'Zalo', text: `Chào ${who}, em xin phép nhắn lần cuối về audit miễn phí cho ${shop}. Nếu sau này cần, link vẫn dùng được: ${link}. Chúc shop tháng này bùng nổ ạ!` },
  ];
}
