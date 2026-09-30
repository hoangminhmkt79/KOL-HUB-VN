// Chấm điểm + sàng lọc chạy ở SERVER (client không tự gửi score được nữa)

export function engagementScore(followers, avgViews) {
  const f = Number(followers) || 0;
  const v = Number(avgViews) || 0;
  return f > 0 ? Math.round((v / f) * 100) / 100 : 0;
}

export const potentialOf = s => (s >= 0.3 ? 'high' : s >= 0.15 ? 'medium' : 'low');

// → { decision: 'approve' | 'reject' | 'review', reason }
export function screen(c, rules) {
  const s = engagementScore(c.followers, c.avg_views);
  const f = Number(c.followers) || 0;
  if (s > rules.suspicious_score) return { decision: 'review', reason: `Số liệu bất thường: views gấp ${s} lần followers` };
  if (f < rules.reject_min_followers) return { decision: 'reject', reason: `Followers < ${rules.reject_min_followers}` };
  if (s < rules.reject_max_score) return { decision: 'reject', reason: `Engagement ${s} < ${rules.reject_max_score}` };
  if (s >= rules.approve_min_score && f >= rules.approve_min_followers)
    return { decision: 'approve', reason: `Engagement ${s} ≥ ${rules.approve_min_score}, followers ≥ ${rules.approve_min_followers}` };
  return { decision: 'review', reason: `Engagement ${s} — cần xem tay` };
}

// Trạng thái creator sau khi áp quyết định sàng lọc
export function statusFromScreen(decision, rules) {
  if (decision === 'approve') return 'approved';
  if (decision === 'reject' && rules.auto_reject) return 'rejected';
  return 'pending';
}
