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
