// Dùng chung client + server. Không import module server ở đây.

export const CREATOR_STATUS = {
  prospect:       { l: 'Được mời',     tone: 'slate' },
  applied:        { l: 'Mới đăng ký',  tone: 'amber' },
  pending:        { l: 'Chờ duyệt',    tone: 'amber' },
  approved:       { l: 'Đã duyệt',     tone: 'green' },
  rejected:       { l: 'Từ chối',      tone: 'red' },
  in_campaign:    { l: 'Trong CĐ',     tone: 'blue' },
  sample_sent:    { l: 'Đã gửi mẫu',   tone: 'blue' },
  content_posted: { l: 'Đã đăng',      tone: 'violet' },
  scaling:        { l: 'Scaling',      tone: 'green' },
  inactive:       { l: 'Tạm nghỉ',     tone: 'slate' },
};
export const CREATOR_STATUS_KEYS = Object.keys(CREATOR_STATUS);

// Vòng đời đơn sample
export const SAMPLE_STATUS = {
  requested: { l: 'Yêu cầu',       tone: 'slate',  step: 0 },
  approved:  { l: 'Chờ gửi',       tone: 'amber',  step: 1 },
  shipped:   { l: 'Đang giao',     tone: 'blue',   step: 2 },
  delivered: { l: 'Đã nhận',       tone: 'violet', step: 3 },
  overdue:   { l: 'Trễ content',   tone: 'red',    step: 3 },
  posted:    { l: 'Đã có video',   tone: 'green',  step: 4 },
  cancelled: { l: 'Huỷ',           tone: 'slate',  step: -1 },
};
export const SAMPLE_STATUS_KEYS = Object.keys(SAMPLE_STATUS);
export const SAMPLE_PIPELINE = ['approved', 'shipped', 'delivered', 'overdue', 'posted'];

export const VIDEO_STATUS = {
  submitted: { l: 'Chờ duyệt', tone: 'amber' },
  approved:  { l: 'Đã duyệt',  tone: 'green' },
  rejected:  { l: 'Từ chối',   tone: 'red' },
};

export const NICHES = [
  { v: 'lam_dep',    l: 'Làm đẹp',          s: 'Skincare, makeup' },
  { v: 'suc_khoe',   l: 'Sức khoẻ',         s: 'TPCN, vitamin, wellness' },
  { v: 'me_be',      l: 'Mẹ & bé',          s: 'Chăm con, gia đình' },
  { v: 'nha_cua',    l: 'Nhà cửa',          s: 'Đời sống, bếp núc' },
  { v: 'cong_nghe',  l: 'Công nghệ',        s: 'Review, unbox, tech' },
  { v: 'thoi_trang', l: 'Thời trang',       s: 'OOTD, styling' },
];
export const nicheLabel = v => NICHES.find(n => n.v === v)?.l || v || '—';

export const PLATFORMS = [
  { v: 'TikTok',   ic: 'TT', d: 'Video · Live' },
  { v: 'Facebook', ic: 'FB', d: 'Reels · Live' },
  { v: 'Shopee',   ic: 'SP', d: 'Video · Live' },
];

export const CTYPES = [
  { v: 'video',      l: 'Video',      s: 'Short video' },
  { v: 'livestream', l: 'Livestream', s: 'Live stream' },
  { v: 'both',       l: 'Cả hai',     s: 'Video + Live' },
];

export const GMV_OPTS = [
  { v: 'under_1M', l: 'Mới bắt đầu — dưới 1 triệu', s: '< 1M' },
  { v: '1_10M',    l: 'Đang lên — 1 đến 10 triệu', s: '1–10M' },
  { v: '10_50M',   l: 'Ổn định — 10 đến 50 triệu', s: '10–50M' },
  { v: '50_100M',  l: 'Tốt — 50 đến 100 triệu', s: '50–100M' },
  { v: '100_300M', l: 'Rất tốt — 100 đến 300 triệu', s: '100–300M' },
  { v: '300_1B',   l: 'Đỉnh — 300 triệu đến 1 tỷ', s: '300M–1B' },
  { v: 'over_1B',  l: 'Top creator — trên 1 tỷ', s: '> 1 tỷ' },
];
export const gmvLabel = v => GMV_OPTS.find(o => o.v === v)?.s || '—';

export const CITIES = ['TP. Hồ Chí Minh','Hà Nội','Đà Nẵng','Cần Thơ','Hải Phòng','Bình Dương','Đồng Nai','An Giang','Khánh Hoà','Huế','Quảng Ninh','Nghệ An','Thanh Hoá','Gia Lai','Lâm Đồng','Bà Rịa - Vũng Tàu','Long An','Tiền Giang','Kiên Giang','Bình Thuận','Khác'];

// Link tra cứu vận đơn công khai. Hãng không có trong list → tìm Google.
const CARRIER_URLS = [
  [/ghn|giao hàng nhanh/i, c => `https://donhang.ghn.vn/?order_code=${c}`],
  [/ghtk|giao hàng tiết kiệm/i, c => `https://i.ghtk.vn/${c}`],
  [/j&t|j ?& ?t|jt express/i, c => `https://jtexpress.vn/vi/tracking?type=track&billcode=${c}`],
  [/spx|shopee express/i, c => `https://spx.vn/track?${c}`],
  [/ninja/i, c => `https://www.ninjavan.co/vi-vn/tracking?id=${c}`],
];
export function trackingUrl(carrier, code) {
  if (!code) return '';
  const hit = CARRIER_URLS.find(([re]) => re.test(carrier || ''));
  const c = encodeURIComponent(code);
  return hit ? hit[1](c) : `https://www.google.com/search?q=${encodeURIComponent(`${carrier || ''} ${code}`.trim())}`;
}

// Chuẩn hoá handle từ link profile
export function handleFromLink(link) {
  if (!link) return '';
  const m = String(link).match(/@([A-Za-z0-9._-]+)/);
  return m ? m[1].toLowerCase() : '';
}

export const fmtNum = n => Math.round(Number(n) || 0).toLocaleString('vi-VN');
export const fmtMoney = n => {
  const v = Math.round(Number(n) || 0);
  if (v >= 1e9) return (v / 1e9).toFixed(1).replace('.0', '') + ' tỷ';
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (v >= 1e3) return Math.round(v / 1e3) + 'K';
  return String(v);
};
export const fmtDate = d => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
export const fmtDateTime = d => (d ? new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—');
export const daysUntil = d => (d ? Math.ceil((new Date(d) - Date.now()) / 864e5) : null);

// Parse số từ file export: "12.500.000", "12,500,000", "₫250,000.50", "1 234" → number
export function parseNum(v) {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else s = s.replace(',', '.');
  return Number(s);
}

// ---------- v3: Deal / booking / tuyển qua group FB ----------
export const DEAL_STATUS = {
  offered:   { l: 'Brand đã offer',  tone: 'blue' },
  countered: { l: 'Creator trả giá', tone: 'amber' },
  booked:    { l: 'Đã chốt',         tone: 'green' },
  delivered: { l: 'Đã nghiệm thu',   tone: 'violet' },
  completed: { l: 'Hoàn tất',        tone: 'green' },
  declined:  { l: 'Từ chối',         tone: 'red' },
  expired:   { l: 'Hết hạn',         tone: 'slate' },
  cancelled: { l: 'Huỷ',             tone: 'slate' },
};
export const DEAL_OPEN = ['offered', 'countered'];
export const DEAL_ACTIVE = ['offered', 'countered', 'booked', 'delivered'];

export const DEAL_TYPES = [
  { v: 'barter', l: 'Barter', s: 'Nhận mẫu + hoa hồng, tối đa 1 video' },
  { v: 'hybrid', l: 'Hybrid', s: 'Phí cố định thấp + hoa hồng cao' },
  { v: 'fee',    l: 'Flat fee', s: 'Phí cố định + hoa hồng chuẩn' },
];
export const dealTypeLabel = v => DEAL_TYPES.find(d => d.v === v)?.l || v;

export const TIERS = {
  seed:    { l: 'Seed',    tone: 'slate',  s: 'Chưa có GMV — barter / hybrid phí thấp' },
  pro:     { l: 'Pro',     tone: 'blue',   s: 'Đã ra đơn — phí theo giá hợp lý' },
  partner: { l: 'Partner', tone: 'green',  s: 'GMV cao — ưu tiên booking định kỳ' },
};

export const PAYOUT_STATUS = {
  pending: { l: 'Chờ đến hạn', tone: 'slate' },
  due:     { l: 'Đến hạn trả', tone: 'amber' },
  paid:    { l: 'Đã trả',      tone: 'green' },
};

export const FB_GROUP_STATUS = {
  active:  { l: 'Đang dùng',  tone: 'green' },
  cooling: { l: 'Nghỉ đăng',  tone: 'amber' },
  paused:  { l: 'Tạm dừng',   tone: 'slate' },
  banned:  { l: 'Bị chặn',    tone: 'red' },
};
export const FB_POST_POLICY = [
  { v: 'free', l: 'Đăng tự do' },
  { v: 'admin_approve', l: 'Admin duyệt bài' },
  { v: 'weekday', l: 'Chỉ ngày quy định' },
  { v: 'paid', l: 'Trả phí' },
];
export const POST_ANGLES = [
  { v: 'fee',        l: 'Có phí booking' },
  { v: 'commission', l: 'Hoa hồng cao' },
  { v: 'sample',     l: 'Mẫu chính hãng' },
  { v: 'fast_pay',   l: 'Thanh toán nhanh' },
];
