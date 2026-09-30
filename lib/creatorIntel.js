// "Trí tuệ" cho bảng KOL: điểm sức khoẻ + việc tiếp theo. Hàm thuần, dùng chung server/client.
import { creatorTier } from './pricing';

// Điểm sức khoẻ 0–100 (công thức minh bạch, hiển thị trên UI):
//  30 engagement (score/0.3) · 25 đúng hạn (tỷ lệ video đúng hạn, chưa có dữ liệu = 50%)
//  25 hiệu quả bán (GMV/view so với 2× mặc định, chưa có = 30%) · 20 hoạt động (≤14 ngày = 100%, ≤30 ngày = 50%)
export const HEALTH_FORMULA = '30 × engagement + 25 × đúng hạn + 25 × GMV/view + 20 × hoạt động gần đây';

export function healthSql(defaultGpv) {
  const gpvRef = Math.max(1, Number(defaultGpv) || 60) * 2;
  return `ROUND(
    30 * LEAST(COALESCE(b.score,0) / 0.3, 1)
  + 25 * COALESCE(b.on_time_rate, 0.5)
  + 25 * CASE WHEN b.views_sum > 0 THEN LEAST((b.gmv_sum / b.views_sum) / ${gpvRef}, 1) ELSE 0.3 END
  + 20 * CASE WHEN b.last_activity > NOW() - INTERVAL '14 days' THEN 1 WHEN b.last_activity > NOW() - INTERVAL '30 days' THEN 0.5 ELSE 0 END
  )::int`;
}

// Việc tiếp theo cho 1 creator — thứ tự = độ ưu tiên
export function nextAction(c, rules = {}) {
  const tier = creatorTier(c, rules);
  if (['applied', 'pending'].includes(c.status)) return { key: 'review', l: 'Duyệt hồ sơ', tone: 'amber' };
  if (c.status === 'prospect') return { key: 'invite', l: 'Nhắc điền form', tone: 'slate' };
  if (c.status === 'rejected') return null;
  if (Number(c.overdue_count) > 0) return { key: 'nudge', l: 'Nhắc đăng video', tone: 'red', tab: 'samples' };
  if (Number(c.videos_pending) > 0) return { key: 'video', l: 'Duyệt video', tone: 'violet', tab: 'videos' };
  if (c.open_deal_status === 'countered') return { key: 'deal', l: 'Trả lời trả giá', tone: 'amber', tab: 'deals' };
  if (Number(c.to_ship) > 0 && !c.ship_address) return { key: 'address', l: 'Xin địa chỉ nhận', tone: 'amber' };
  if (Number(c.to_ship) > 0) return { key: 'ship', l: 'Gửi mẫu', tone: 'blue', tab: 'samples' };
  if (Number(c.active_deals) === 0 && Number(c.active_samples) === 0) {
    if (tier === 'partner') return { key: 'offer', l: 'Book định kỳ', tone: 'green', tab: 'deals' };
    if (tier === 'pro') return { key: 'offer', l: 'Offer deal Pro', tone: 'green', tab: 'deals' };
    if (['approved', 'content_posted', 'in_campaign'].includes(c.status)) return { key: 'offer', l: 'Gửi offer barter', tone: 'blue', tab: 'deals' };
  }
  return null;
}
