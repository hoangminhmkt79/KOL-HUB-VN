// Link tracking đa kênh + content tuyển soạn sẵn theo kênh.
import { buildPost } from './fb';
import { nicheLabel } from './constants';

export const CHANNELS = [
  { v: 'fb_group', l: 'Group Facebook', medium: 'group',   source: 'facebook' },
  { v: 'fanpage',  l: 'Fanpage',        medium: 'social',  source: 'facebook' },
  { v: 'zalo',     l: 'Zalo (nhóm / OA)', medium: 'chat',  source: 'zalo' },
  { v: 'tiktok',   l: 'TikTok (bio / caption)', medium: 'social', source: 'tiktok' },
  { v: 'threads',  l: 'Threads / Instagram', medium: 'social', source: 'threads' },
  { v: 'email',    l: 'Email / tin nhắn riêng', medium: 'direct', source: 'email' },
  { v: 'other',    l: 'Khác (KOL giới thiệu, sự kiện…)', medium: 'referral', source: 'other' },
];
export const channelOf = v => CHANNELS.find(c => c.v === v) || CHANNELS[CHANNELS.length - 1];

// "Group Review Mỹ Phẩm HN" → "group-review-my-pham-hn"
export const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export function utmFor({ channel, source_name, campaign, code }) {
  const ch = channelOf(channel);
  return {
    utm_source: ch.source,
    utm_medium: ch.medium,
    utm_campaign: slug(campaign?.name) || 'tuyen-koc',
    utm_content: [slug(source_name), code].filter(Boolean).join('_').slice(0, 100),
  };
}

export function linksFor(origin, code, utm, target = 'creator') {
  const q = new URLSearchParams({ ...utm, acq: code });
  return { short: `${origin}/j/${code}`, full: `${origin}/${target === 'brand' ? 'brands' : ''}?${q}` };
}

// Content theo kênh: bài dài (FB), bản ngắn (Zalo/Threads), caption + bio (TikTok), tin nhắn riêng
export function buildContents({ channel, campaign, code, link, rules, slotsLeft, angle = 'fee' }) {
  const long = buildPost({ angle, campaign, group: null, code, link, rules, slotsLeft });
  const c = campaign || {};
  const brand = c.brand_name || c.name || 'Brand đối tác';
  const product = c.product || 'sản phẩm mới';
  const feeMax = Number(c.fee_max) || 0, feeMin = Number(c.fee_min) || 0;
  const hasFee = c.deal_type !== 'barter' && feeMax > 0;
  const m = n => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.0', '')}tr` : `${Math.round(n / 1000)}k`);
  const fee = hasFee ? `phí ${feeMin && feeMin !== feeMax ? `${m(feeMin)}–${m(feeMax)}` : m(feeMax)}/deal` : 'nhận mẫu free';
  const com = Number(c.commission_pct) ? ` + ${Number(c.commission_pct)}% hoa hồng` : '';
  const niche = c.niche ? nicheLabel(c.niche) : 'mọi lĩnh vực';
  const short = [
    `📣 ${brand} tuyển KOC ${niche} review ${product}`,
    `💰 ${fee}${com}${hasFee ? ` · cọc ${Number(c.deposit_pct ?? rules.deposit_pct)}%` : ''}`,
    `👤 Liên hệ: ${c.contact_name || 'team tuyển creator'}`,
    `👉 Xem brief & đăng ký 3 phút: ${link}`,
  ].join('\n');
  const tiktok = [
    `Caption: ${brand} đang tuyển KOC ${niche} 🎬 ${fee}${com}. Đăng ký ở link bio nha! #tuyenKOC #reviewsanpham`,
    `Link bio: ${link}`,
    `Comment ghim: Bạn nào muốn nhận job ${product} thì đăng ký tại link bio, xem trước brief + mức phí nhé 👇`,
  ].join('\n\n');
  const dm = `Chào bạn 👋 Mình là ${c.contact_name || 'team tuyển creator'} bên ${brand}. Mình thấy kênh của bạn rất hợp với ${product} (${fee}${com}). Bạn xem brief và báo giá mong muốn tại đây nhé: ${link}`;
  const primary = { fb_group: long.body, fanpage: long.body, zalo: short, tiktok, threads: short, email: dm, other: short }[channel] || short;
  return {
    primary,
    variants: [
      { key: 'long', l: 'Bài dài (Facebook)', text: long.body },
      { key: 'short', l: 'Bản ngắn (Zalo / Threads)', text: short },
      { key: 'tiktok', l: 'TikTok (caption / bio / comment)', text: tiktok },
      { key: 'dm', l: 'Tin nhắn mời riêng', text: dm },
    ],
    warnings: long.warnings,
  };
}

export function originOf(req) {
  const proto = String(req.headers['x-forwarded-proto'] || (req.headers.host?.startsWith('localhost') ? 'http' : 'https')).split(',')[0];
  return `${proto}://${req.headers.host}`;
}
