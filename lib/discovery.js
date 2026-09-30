// Bộ câu hỏi audit / tư vấn cho nhà bán hàng. `services` / `pains` = câu hỏi được ưu tiên khi lead chọn dịch vụ / vấn đề tương ứng.
// `why` = vì sao cần hỏi (giúp người gọi hiểu và diễn giải kết quả).

export const DISCOVERY_AREAS = [
  { v: 'business', l: 'Tổng quan kinh doanh', ic: '🏢' },
  { v: 'ads', l: 'Ads & GMV Max', ic: '📈' },
  { v: 'koc', l: 'KOC / Affiliate', ic: '🎬' },
  { v: 'live', l: 'Livestream', ic: '🎥' },
  { v: 'shop', l: 'Vận hành shop', ic: '🏪' },
  { v: 'product', l: 'Sản phẩm, giá & biên lợi nhuận', ic: '💰' },
  { v: 'compliance', l: 'Tuân thủ quảng cáo', ic: '⚖️' },
  { v: 'goal', l: 'Mục tiêu, ngân sách & quyết định', ic: '🎯' },
];

export const QUESTIONS = [
  // Tổng quan
  { key: 'b1', area: 'business', q: 'GMV 3 tháng gần nhất theo từng sàn (TikTok / Shopee / Lazada / web) là bao nhiêu? Xu hướng tăng hay giảm?', why: 'Baseline để đo tăng trưởng và chọn sàn ưu tiên.' },
  { key: 'b2', area: 'business', q: 'Tỷ trọng GMV đến từ ads, KOC/affiliate, livestream và tự nhiên (organic) là bao nhiêu %?', why: 'Biết shop đang phụ thuộc kênh nào, kênh nào còn dư địa.', pains: ['gmv_stuck'] },
  { key: 'b3', area: 'business', q: 'Ai đang vận hành shop, ads, KOC? Bao nhiêu người, full-time hay part-time?', why: 'Xác định năng lực nội bộ và phạm vi cần thuê ngoài.', pains: ['no_team'] },
  { key: 'b4', area: 'business', q: 'Đang dùng agency / freelancer nào? Điều gì chưa hài lòng?', why: 'Hiểu kỳ vọng và tránh lặp lại điểm yếu của bên cũ.' },
  { key: 'b5', area: 'business', q: 'Mùa cao điểm và các mega sale sắp tới shop muốn đánh (9.9, 11.11, 12.12, Tết)?', why: 'Lên timeline seeding trước sale 3–4 tuần.', pains: ['mega_sale'] },
  // Ads & GMV Max
  { key: 'a1', area: 'ads', q: 'Đang chạy loại ads nào: GMV Max Product, GMV Max LIVE, manual (VSA/LSA), Shopee Ads (khám phá/tìm kiếm)?', why: 'Xác định cấu trúc hiện tại.', services: ['gmv_max', 'ads_audit'] },
  { key: 'a2', area: 'ads', q: 'Chi phí ads / tháng, ROAS (hoặc ROI) trung bình 30 ngày và xu hướng?', why: 'Đánh giá hiệu quả, so với ngưỡng hoà vốn.', services: ['gmv_max', 'ads_audit'], pains: ['roas_low'] },
  { key: 'a3', area: 'ads', q: 'ROI target đang đặt cho GMV Max là bao nhiêu? Đặt dựa trên biên lợi nhuận hay cảm tính?', why: 'ROI target sai → hoặc lỗ, hoặc không scale được.', services: ['gmv_max'], pains: ['roas_low', 'gmv_stuck'] },
  { key: 'a4', area: 'ads', q: 'Mỗi tháng có bao nhiêu video/creative MỚI đưa vào GMV Max? Tỷ lệ video từ KOC vs video tự quay?', why: 'GMV Max chững thường do thiếu creative mới.', services: ['gmv_max'], pains: ['gmv_stuck', 'no_creative'] },
  { key: 'a5', area: 'ads', q: 'Top 5 SKU đang chiếm bao nhiêu % chi phí ads? Có SKU nào chạy lỗ nhưng vẫn giữ?', why: 'Loại SKU lỗ, dồn ngân sách vào SKU có biên tốt.', services: ['gmv_max', 'ads_audit'], pains: ['roas_low'] },
  { key: 'a6', area: 'ads', q: 'Đã từng tăng ngân sách mà ROI tụt chưa? Tăng bao nhiêu % mỗi lần?', why: 'Chẩn đoán cách scale (tăng sốc làm thuật toán học lại).', services: ['gmv_max'], pains: ['gmv_stuck'] },
  { key: 'a7', area: 'ads', q: 'Có chạy Google / Facebook đưa traffic về shop hoặc website không? Đo chuyển đổi bằng gì?', why: 'Đánh giá kênh ngoài sàn và attribution.', services: ['google_fb'] },
  { key: 'a8', area: 'ads', q: 'Có cấp quyền xem tài khoản ads (partner / sub-account, chỉ đọc) để audit không?', why: 'Audit chính xác cần số liệu thật; không nhận mật khẩu chính.', services: ['ads_audit', 'gmv_max'] },
  // KOC
  { key: 'k1', area: 'koc', q: 'Hiện có bao nhiêu KOC/affiliate đang ra đơn đều? Top 5 KOC đóng góp bao nhiêu % GMV affiliate?', why: 'Đánh giá độ phụ thuộc và chất lượng pool KOC.', services: ['kol_booking', 'kol_strategy'], pains: ['koc_no_sales'] },
  { key: 'k2', area: 'koc', q: 'Mỗi tháng gửi bao nhiêu mẫu? Bao nhiêu % mẫu ra được video? Chi phí mẫu + ship mỗi mẫu?', why: 'Tính ROI mẫu và tỷ lệ ra video — 2 chỉ số cốt lõi.', services: ['kol_booking'], pains: ['koc_no_sales'] },
  { key: 'k3', area: 'koc', q: 'Mức hoa hồng affiliate hiện tại (open collab / target collab)? Có trả phí booking cố định không, bao nhiêu/video?', why: 'So với mặt bằng thị trường để thiết kế offer hấp dẫn hơn.', services: ['kol_booking', 'kol_strategy'] },
  { key: 'k4', area: 'koc', q: 'Tier KOC nào đang hiệu quả nhất (nano / micro / mid)? Ngách nào ra đơn tốt?', why: 'Chọn mix tier tối ưu chi phí.', services: ['kol_strategy', 'kol_booking'] },
  { key: 'k5', area: 'koc', q: 'Có lấy được Spark Ads code / quyền authorize video KOC để chạy ads không?', why: 'Video KOC thắng cần được đẩy vào GMV Max.', services: ['gmv_max', 'kol_booking'], pains: ['no_creative'] },
  { key: 'k6', area: 'koc', q: 'Brief KOC hiện tại gồm gì? Có kịch bản hook 3 giây đầu, USP, CTA gắn giỏ không?', why: 'Brief yếu là nguyên nhân phổ biến khiến KOC không ra đơn.', services: ['kol_booking', 'kol_strategy'], pains: ['koc_no_sales'] },
  { key: 'k7', area: 'koc', q: 'Đang theo dõi KOC bằng gì (Excel, Zalo, tool)? Ai theo dõi hạn đăng video?', why: 'Đánh giá độ thất thoát mẫu và nhu cầu hệ thống hoá.', services: ['kol_booking'], pains: ['no_team'] },
  // Live
  { key: 'l1', area: 'live', q: 'Mỗi tuần live mấy phiên, khung giờ nào, mỗi phiên bao lâu? GMV trung bình / phiên?', why: 'Baseline livestream.', services: ['livestream'] },
  { key: 'l2', area: 'live', q: 'Host là nhân viên, KOL thuê hay chủ shop? Có kịch bản và deal riêng cho live không?', why: 'Chất lượng host và kịch bản quyết định tỷ lệ chốt.', services: ['livestream'] },
  { key: 'l3', area: 'live', q: 'Có chạy GMV Max LIVE / LSA cho phiên live không? Tỷ lệ view → đơn?', why: 'Live không có traffic trả phí thường khó scale.', services: ['livestream', 'gmv_max'] },
  // Shop
  { key: 's1', area: 'shop', q: 'Điểm shop, tỷ lệ phản hồi chat, tỷ lệ giao trễ / huỷ / hoàn hiện tại?', why: 'Chỉ số vận hành xấu làm giảm phân phối và ads.', services: ['shop_ops'] },
  { key: 's2', area: 'shop', q: 'Rating trung bình và số review của SKU chủ lực? Review 1–3★ phàn nàn gì nhiều nhất?', why: 'Social proof ảnh hưởng trực tiếp CVR.', services: ['shop_ops', 'kol_booking'] },
  { key: 's3', area: 'shop', q: 'Voucher / combo / flash sale đang dùng thế nào? Có tham gia campaign sàn không?', why: 'Cơ chế giá ảnh hưởng hiệu quả ads và KOC.', services: ['shop_ops'] },
  { key: 's4', area: 'shop', q: 'Tồn kho và năng lực đóng gói có đủ nếu GMV tăng 2–3×?', why: 'Tránh scale xong đứt hàng / giao trễ.', services: ['shop_ops', 'gmv_max'] },
  // Product & margin
  { key: 'p1', area: 'product', q: 'Giá bán, giá vốn, biên lợi nhuận gộp (%) của 3–5 SKU chủ lực?', why: 'Tính ROI hoà vốn và trần phí KOC — không có số này thì mọi đề xuất là đoán.' },
  { key: 'p2', area: 'product', q: 'AOV (giá trị đơn trung bình) và tỷ lệ mua lại?', why: 'AOV cao → chịu được CPA cao hơn.' },
  { key: 'p3', area: 'product', q: 'USP khác biệt so với đối thủ là gì? Khách hay hỏi / lo ngại điều gì trước khi mua?', why: 'Nguyên liệu cho brief KOC và creative.', pains: ['no_creative', 'koc_no_sales'] },
  { key: 'p4', area: 'product', q: 'Có SKU mới sắp ra mắt? Có chính sách giá riêng cho kênh KOC/live?', why: 'Lên kế hoạch seeding cho launch.', pains: ['new_launch'] },
  // Compliance
  { key: 'c1', area: 'compliance', q: 'Sản phẩm thuộc nhóm nào (mỹ phẩm, TPCN, thiết bị y tế…)? Đã có giấy công bố / xác nhận nội dung quảng cáo chưa?', why: 'TPCN cần xác nhận nội dung QC; sai claim dễ bị gỡ / phạt.', pains: ['compliance'] },
  { key: 'c2', area: 'compliance', q: 'Danh sách claim được phép và bị cấm? Đã từng bị gỡ video / vi phạm chính sách chưa?', why: 'Đưa vào brief và checklist duyệt video.', pains: ['compliance'] },
  // Goal & budget
  { key: 'g1', area: 'goal', q: 'Mục tiêu 3 tháng tới: GMV bao nhiêu, ROAS / lợi nhuận tối thiểu chấp nhận?', why: 'Chốt KPI và cách đo thành công.' },
  { key: 'g2', area: 'goal', q: 'Ngân sách marketing / tháng (ads + KOC + mẫu)? Có linh hoạt nếu kết quả tốt?', why: 'Thiết kế gói phù hợp.' },
  { key: 'g3', area: 'goal', q: 'Ai là người quyết định cuối? Quy trình duyệt hợp đồng và thời gian cần?', why: 'Rút ngắn chu kỳ chốt.' },
  { key: 'g4', area: 'goal', q: 'Muốn bắt đầu khi nào? Điều gì khiến anh/chị chọn một đối tác mới?', why: 'Tiêu chí ra quyết định → nhấn đúng điểm trong proposal.' },
];

// Câu hỏi ưu tiên theo dịch vụ + vấn đề của lead (các câu còn lại vẫn hiển thị, xếp sau)
export function questionsFor(r) {
  const svc = r.services || []; const pains = r.pain_points || [];
  return QUESTIONS.map(q => ({ ...q, priority: (q.services || []).some(s => svc.includes(s)) || (q.pains || []).some(p => pains.includes(p)) }))
    .sort((a, b) => Number(b.priority) - Number(a.priority));
}

// Bản gửi khách trước buổi gọi (Zalo / email) — chỉ câu ưu tiên, tối đa 10 câu
export function preCallText(r) {
  const qs = questionsFor(r).filter(q => q.priority).slice(0, 10);
  const list = (qs.length ? qs : QUESTIONS.filter(q => ['b1', 'a2', 'k2', 'p1', 'g1'].includes(q.key))).map((q, i) => `${i + 1}. ${q.q}`).join('\n');
  return `Chào ${r.contact_name || 'anh/chị'}, để buổi audit ${r.company ? `cho ${r.company} ` : ''}sát nhất, anh/chị trả lời giúp em các câu sau (không cần đủ hết, số ước lượng cũng được ạ):\n\n${list}\n\nEm cảm ơn ạ!`;
}
