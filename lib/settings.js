import { query } from './db';

export const DEFAULT_RULES = {
  auto_screen: true,            // tự duyệt đơn đăng ký mới
  auto_reject: false,           // tự từ chối (tắt = chuyển "Chờ duyệt" kèm lý do)
  approve_min_score: 0.2,       // avg_views / followers
  approve_min_followers: 1000,
  reject_max_score: 0.02,
  reject_min_followers: 200,
  suspicious_score: 5,          // views gấp >5 lần followers → nghi khai khống
  content_sla_days: 7,          // số ngày từ lúc nhận mẫu đến hạn đăng video
  remind_before_days: 2,
  inactive_after_overdue_days: 14,
  scale_min_gmv: 10000000,
  scale_min_views: 100000,
  auto_approve_verified_video: true,
  only_zero_value_orders: true, // khi import/sync: chỉ lấy đơn 0đ (đơn sample)

  // --- Deal & kinh tế (docs/DEBATE.md) ---
  cpm_vnd: 50000,               // giá hợp lý công khai = views/1000 × CPM × hệ số ngành
  gross_margin_pct: 60,
  platform_fee_pct: 8,
  payment_fee_pct: 5,
  return_rate_pct: 12,
  default_gmv_per_view: 20,     // GMV/view mặc định ngành (VNĐ) khi creator chưa có lịch sử
  safety_factor: 0.6,
  aov_vnd: 250000,
  seed_fee_cap: 1500000,        // trần phí cho creator chưa có GMV
  approve_ops_max: 3000000,
  approve_manager_max: 10000000,
  max_open_deals: 2,
  deal_rounds_max: 3,
  brand_reply_hours: 48,
  creator_reply_hours: 72,
  deposit_pct: 30,
  payment_days: 7,
  pit_threshold: 2000000,       // khấu trừ TNCN khi mỗi lần trả ≥ ngưỡng (cần kế toán xác minh)
  pit_rate_pct: 10,
  fb_default_cooldown_days: 7,
};

export async function getSetting(key, fallback) {
  const r = await query('SELECT value FROM settings WHERE key=$1', [key]);
  return r.rows.length ? r.rows[0].value : fallback;
}

export async function setSetting(key, value) {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
    [key, JSON.stringify(value)]
  );
}

export async function getRules() {
  const saved = await getSetting('rules', {});
  return { ...DEFAULT_RULES, ...(saved || {}) };
}

export function sanitizeRules(input) {
  const out = {};
  for (const [k, def] of Object.entries(DEFAULT_RULES)) {
    if (input[k] === undefined) continue;
    if (typeof def === 'boolean') out[k] = !!input[k];
    else {
      const n = Number(input[k]);
      if (Number.isFinite(n) && n >= 0) out[k] = n;
    }
  }
  return out;
}
