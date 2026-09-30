// Tuyển qua group Facebook: soạn bài (người thật tự đăng — KHÔNG auto-post), mã tracking, đo phễu theo group.
import crypto from 'crypto';
import { nicheLabel, POST_ANGLES, NICHES, FB_POST_POLICY, FB_GROUP_STATUS } from './constants';
import { bad as throwBad } from './http';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm (0/O, 1/I)
export function genCode(len = 7) {
  const buf = crypto.randomBytes(len);
  return Array.from(buf, b => ALPHA[b % ALPHA.length]).join('');
}
export const CODE_RE = /^[A-Z0-9]{4,16}$/;

// "1,5tr" / "800k" — cách viết quen thuộc trong group FB
export function money(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, '').replace('.', ',')}tr`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}k`;
  return `${v}đ`;
}

const pickBy = (code, arr, salt = 0) => {
  let h = salt;
  for (const ch of String(code)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
};

const OPENERS = {
  fee: [
    '🎬 [BOOKING CÓ PHÍ] {brand} tìm KOC review {product}',
    '📣 {brand} đang book creator — trả phí cố định, không chỉ gửi mẫu',
    '💼 Job có phí cho KOC: {brand} × {product}',
  ],
  commission: [
    '📈 Hoa hồng {commission}% — {brand} tìm KOC cho {product}',
    '🔥 {brand} mở chương trình affiliate hoa hồng cao ({commission}%)',
    '💸 KOC ra đơn đều thì vào đây: {brand} trả {commission}% hoa hồng',
  ],
  sample: [
    '🎁 {brand} gửi mẫu chính hãng {product} cho KOC review',
    '📦 Nhận mẫu {product} chính hãng từ {brand} — tuyển creator',
    '✨ {brand} tìm creator trải nghiệm thật {product}',
  ],
  fast_pay: [
    '⚡ Trả cọc ngay khi chốt, phần còn lại trong {days} ngày — {brand} tuyển KOC',
    '💳 Thanh toán rõ ràng: cọc {deposit}%, trả nốt trong {days} ngày — job {brand}',
    '✅ {brand} cam kết trả đúng hạn ({days} ngày sau khi duyệt video) — tuyển KOC',
  ],
};
const CLOSERS = [
  'Không cần nhiều follow, cần nội dung thật. Inbox hoặc đăng ký qua link nhé!',
  'Có thắc mắc cứ comment/inbox, team trả lời trong ngày.',
  'Đăng ký xong theo dõi tiến độ + thanh toán ngay trên link cá nhân.',
];

const tag = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-z0-9]/gi, '').toLowerCase();
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ''));
const fmtD = d => (d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

// Soạn bài đăng. campaign có thể null (bài tuyển chung).
export function buildPost({ angle, campaign, group, code, link, rules, slotsLeft = null }) {
  if (!POST_ANGLES.some(a => a.v === angle)) angle = 'fee';
  const c = campaign || {};
  const warnings = [];
  const brand = c.brand_name || c.name || 'Brand đối tác';
  const product = c.product || 'sản phẩm mới';
  const dealType = campaign ? c.deal_type : 'hybrid';
  const feeMin = Number(c.fee_min) || 0, feeMax = Number(c.fee_max) || 0;
  const commission = Number(c.commission_pct) || 0;
  const deposit = campaign ? Number(c.deposit_pct) : Number(rules.deposit_pct);
  const days = campaign ? Number(c.payment_days) : Number(rules.payment_days);
  const hasFee = dealType !== 'barter' && feeMax > 0;
  if (angle === 'fee' && !hasFee) { angle = 'sample'; warnings.push('Chiến dịch barter / chưa có khoảng phí → đổi góc "phí" sang "mẫu".'); }
  if (angle === 'commission' && !commission) { angle = 'sample'; warnings.push('Chưa có % hoa hồng → đổi góc sang "mẫu".'); }
  if (!campaign) warnings.push('Chưa chọn chiến dịch — bài chỉ có điều khoản chung.');
  if (campaign && !c.contact_name) warnings.push('Chiến dịch chưa có người liên hệ — creator tin bài có tên người thật hơn.');

  const vars = { brand, product, commission, deposit, days };
  const feeLine = hasFee
    ? `💰 Phí: ${feeMin && feeMin !== feeMax ? `${money(feeMin)}–${money(feeMax)}` : money(feeMax)}/deal (gross; khấu trừ TNCN ${rules.pit_rate_pct}% với lần trả ≥ ${money(rules.pit_threshold)})`
    : '💰 Deal barter: nhận mẫu + hoa hồng, không phí cố định, tối đa 1 video';
  const lines = {
    fee: feeLine,
    commission: commission ? `📈 Hoa hồng: ${commission}% trên mọi đơn ra từ video` : '',
    sample: `🎁 Mẫu: ${product} chính hãng, gửi miễn phí${Number(c.sample_cost) > 0 ? ` (trị giá ~${money(c.sample_cost)})` : ''}`,
    fast_pay: hasFee ? `💳 Thanh toán: cọc ${deposit}% ngay khi chốt, phần còn lại trong ${days} ngày sau khi video được duyệt` : '',
  };
  const order = [angle, ...['fee', 'commission', 'sample', 'fast_pay'].filter(a => a !== angle)];

  const niche = c.niche || group?.niche;
  const crit = [
    niche ? `lĩnh vực ${nicheLabel(niche)}` : '',
    slotsLeft != null ? `còn ${slotsLeft} slot` : (c.slots ? `${c.slots} slot` : ''),
    c.posts_per ? `${dealType === 'barter' ? 1 : c.posts_per} video/người` : '',
    campaign ? `sửa tối đa ${c.revisions} lần` : '',
  ].filter(Boolean).join(' · ');

  const body = [
    fill(pickBy(code, OPENERS[angle]), vars),
    '',
    `🏷 Brand: ${brand}${c.product ? ` — sản phẩm: ${c.product}` : ''}`,
    ...order.map(a => lines[a] || null),
    crit ? `🎯 Tìm: ${crit}` : null,
    `⏰ Hạn đăng ký: ${c.end_date ? fmtD(c.end_date) : 'đến khi đủ slot'}`,
    `👤 Liên hệ: ${c.contact_name || 'team tuyển creator (inbox người đăng bài)'}`,
    '',
    `👉 Xem brief đầy đủ (claim được/cấm, yêu cầu) & đăng ký: ${link}`,
    pickBy(code, CLOSERS, 7),
    '',
    `#tuyenKOC #reviewsanpham${niche ? ` #${tag(nicheLabel(niche))}` : ''}`,
  ].filter(l => l !== null).join('\n');

  return { body, angle, warnings };
}

// Điểm group: creator kích hoạt / bài đã đăng, phạt theo CPA
export const SCORE_FORMULA = 'score = 100 × (creator kích hoạt / số bài đã đăng) ÷ (1 + CPA / 500.000đ)';
export function groupScore({ activated, posted, cpa }) {
  if (!activated) return 0;
  const perPost = activated / Math.max(1, posted);
  return Math.round(100 * perPost / (1 + (Number(cpa) || 0) / 500000) * 10) / 10;
}

// Validate field group. create=true → name bắt buộc + mặc định.
export function groupFields(b, create, rules = {}) {
  const out = {};
  const str = (k, max) => { if (b[k] !== undefined) out[k] = String(b[k] ?? '').trim().slice(0, max); };
  const int = (k, label, max = 1e12) => {
    if (b[k] === undefined || b[k] === '' || b[k] === null) return;
    const n = Number(b[k]);
    if (!Number.isInteger(n) || n < 0 || n > max) throwBad(`${label} không hợp lệ.`);
    out[k] = n;
  };
  str('name', 255); str('url', 512); str('note', 2000);
  if (b.niche !== undefined) {
    if (b.niche && !NICHES.some(n => n.v === b.niche)) throwBad('Lĩnh vực không hợp lệ.');
    out.niche = b.niche || '';
  }
  if (out.url && !/^https?:\/\/([a-z0-9-]+\.)*(facebook\.com|fb\.com)\//i.test(out.url)) throwBad('Link group phải là link facebook.com.');
  int('members', 'Số thành viên'); int('cost', 'Chi phí'); int('cooldown_days', 'Số ngày nghỉ giữa 2 bài', 365);
  if (b.post_policy !== undefined) {
    if (!FB_POST_POLICY.some(x => x.v === b.post_policy)) throwBad('Quy định đăng bài không hợp lệ.');
    out.post_policy = b.post_policy;
  }
  if (b.status !== undefined) {
    if (!FB_GROUP_STATUS[b.status]) throwBad('Trạng thái không hợp lệ.');
    out.status = b.status;
  }
  if (create) {
    if (!out.name) throwBad('Thiếu tên group.');
    if (out.cooldown_days === undefined) out.cooldown_days = Number(rules.fb_default_cooldown_days) || 7;
  } else if (out.name === '') throwBad('Tên group không được trống.');
  return out;
}
