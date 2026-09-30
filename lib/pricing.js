// Định giá deal + guardrail tài chính. Hàm thuần, dùng được cả client (portal hiển thị công thức) và server.
// Quyết định thiết kế: docs/DEBATE.md

export const NICHE_MULT = { suc_khoe: 1.2, me_be: 1.15, lam_dep: 1.1, nha_cua: 1.0, cong_nghe: 1.0, thoi_trang: 1.0 };

// Tier creator: Seed = chưa có GMV; Pro = có GMV; Partner = GMV ≥ ngưỡng scale
export function creatorTier(creator, rules) {
  const gmv = Number(creator.gmv) || 0;
  if (gmv >= (rules.scale_min_gmv || 10000000)) return 'partner';
  if (gmv > 0) return 'pro';
  return 'seed';
}

const round1k = n => Math.round(n / 1000) * 1000;

// Giá hợp lý công khai: views TB / 1000 × CPM × hệ số ngành
export function fairPrice(creator, rules) {
  const views = Number(creator.avg_views) || 0;
  const mult = NICHE_MULT[creator.niche] || 1;
  const cpm = Number(rules.cpm_vnd) || 50000;
  const fee = round1k((views / 1000) * cpm * mult);
  return {
    fee,
    live_hour: round1k(fee * 0.8),
    formula: `${views.toLocaleString('vi-VN')} views TB / 1000 × ${cpm.toLocaleString('vi-VN')}đ CPM × ${mult} (hệ số ngành)`,
  };
}

// Biên đóng góp (sau phí sàn, thanh toán, hoa hồng deal, hoàn huỷ)
export function contributionMargin(rules, commissionPct) {
  const gm = rules.gross_margin_pct / 100;
  const cm = gm - rules.platform_fee_pct / 100 - rules.payment_fee_pct / 100
    - (Number(commissionPct) || 0) / 100 - (rules.return_rate_pct / 100) * gm;
  return Math.max(0, cm);
}

// GMV kỳ vọng / video: dùng GMV/view lịch sử của creator nếu có, không thì mặc định ngành × 50%
export function expectedGmv(creator, rules, history = {}) {
  const views = Number(history.median_views) || Number(creator.avg_views) || 0;
  const gpv = Number(history.gmv_per_view) > 0 ? Number(history.gmv_per_view) : (Number(rules.default_gmv_per_view) || 0) * 0.5;
  return Math.round(views * gpv);
}

// Tất cả số liệu kinh tế của 1 deal (snapshot lưu vào deals.econ)
export function dealEconomics({ creator, rules, fee, commission_pct, videos = 1, sample_cost = 0, history = {} }) {
  sample_cost = Number(sample_cost) || 0;
  const cm = contributionMargin(rules, commission_pct);
  const eGmv = expectedGmv(creator, rules, history) * Math.max(1, videos);
  const cost = (Number(fee) || 0) + (Number(sample_cost) || 0);
  const maxFee = Math.max(0, round1k(eGmv * cm * rules.safety_factor - sample_cost));
  const breakevenGmv = cm > 0 ? Math.round(cost / cm) : Infinity;
  const ratio = eGmv > 0 ? breakevenGmv / eGmv : (cost > 0 ? Infinity : 0);
  const tier = creatorTier(creator, rules);
  const warnings = [];
  if (ratio > 1) warnings.push('Hoà vốn cần GMV cao hơn kỳ vọng');
  if (tier === 'seed' && Number(fee) > rules.seed_fee_cap) warnings.push(`Creator Seed (chưa có GMV): phí vượt trần ${rules.seed_fee_cap.toLocaleString('vi-VN')}đ`);
  return {
    cm_pct: Math.round(cm * 1000) / 10,
    expected_gmv: eGmv,
    max_fee: tier === 'seed' ? Math.min(maxFee, rules.seed_fee_cap) : maxFee,
    breakeven_gmv: Number.isFinite(breakevenGmv) ? breakevenGmv : null,
    breakeven_orders: Number.isFinite(breakevenGmv) ? Math.ceil(breakevenGmv / (rules.aov_vnd || 250000)) : null,
    breakeven_ratio: Number.isFinite(ratio) ? Math.round(ratio * 100) / 100 : null,
    fair: fairPrice(creator, rules).fee,
    tier,
    warnings,
    red: ratio > 1 || (tier === 'seed' && Number(fee) > rules.seed_fee_cap),
  };
}

export function approvalLevel(fee, rules) {
  if (fee > rules.approve_manager_max) return 'cfo';
  if (fee > rules.approve_ops_max) return 'manager';
  return 'ops';
}

// Chia tiền: cọc + phần còn lại, khấu trừ TNCN 10% cho mỗi lần trả ≥ ngưỡng
export function payoutSplit(fee, depositPct, rules) {
  const dep = Math.round((Number(fee) || 0) * (Number(depositPct) || 0) / 100);
  const parts = [['deposit', dep], ['final', (Number(fee) || 0) - dep]].filter(([, g]) => g > 0);
  return parts.map(([kind, gross]) => {
    const pit = gross >= rules.pit_threshold ? Math.round(gross * rules.pit_rate_pct / 100) : 0;
    return { kind, gross, pit, net: gross - pit };
  });
}
