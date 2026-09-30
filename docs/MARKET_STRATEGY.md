# White space & chiến lược tấn công thị trường B2B

Tài liệu tổng hợp debate của 3 agent:

- **Market / White-space Analyst**
- **Lead-gen & Sales Automation Strategist**
- **Skeptic: năng lực giao hàng (delivery), P&L & rủi ro**

Người điều phối chốt ở các điểm bất đồng. Số liệu thị trường và giá là **ước tính (UT)**, cần kiểm chứng bằng Metric.vn, Kalodata, FastMoss. Mọi điểm pháp lý cần luật sư và kế toán xác nhận.

## 1. Bản đồ cạnh tranh và khe hở

| Nhóm | Điểm yếu = cơ hội |
|---|---|
| Network agency | Chậm, thiên về brand/awareness, không nắm sâu GMV Max, LIVE và vận hành shop. Tối thiểu ~100tr/tháng. |
| Agency TMĐT / TSP / TAP | Thu phí theo %GMV nên đẩy GMV mà bỏ qua biên lợi nhuận. KOC chỉ là một dòng trong báo cáo. Không có kiến thức pháp chế ngành sức khoẻ. |
| Nền tảng KOC / MCN | Hộp đen: brand không sở hữu dữ liệu creator. Tối ưu số video, không tối ưu ROI mẫu. |
| Freelancer / "cò" KOC | Không đo lường, không SLA, dễ gian lận. |
| SaaS analytics | Chỉ phân tích, không làm thực thi seeding, không có guardrail. |
| In-house | Làm bằng Excel + Zalo, người nghỉ là mất dữ liệu creator. |

**Khe hở chung:** chưa bên nào vừa **làm hộ**, vừa **chịu trách nhiệm unit economics** (trần phí theo điểm hoà vốn, ROI mẫu), vừa **đảm bảo tuân thủ quảng cáo**.

**Insight định vị:** GMV Max bị kẹt thường vì **thiếu creative KOC mới** để nuôi thuật toán, không phải vì cài đặt. Đây là bài toán seeding, và KOL Hub sinh ra để giải bài toán đó.

## 2. Các điểm bất đồng và quyết định

| # | Chủ đề | Market | Lead-gen | Skeptic | **Quyết định** |
|---|---|---|---|---|---|
| 1 | Ngách tấn công đầu tiên (beachhead) | TPCN / dược mỹ phẩm, GMV Max chững | Shop GMV 200tr–5 tỷ | Health/beauty **trùng ngành với công ty chủ quản** → xung đột lợi ích | **Beachhead = shop TikTok Shop GMV 200tr–3 tỷ/tháng có GMV Max chững**, ưu tiên các ngành **không cạnh tranh với công ty** (mẹ bé, nhà cửa, thời trang, làm đẹp không dược). Ngách sức khoẻ chỉ mở khi có **văn bản chấp thuận**. App tự gắn cờ ngách xung đột (`coi_niches`). |
| 2 | Dịch vụ bán | Không bán vận hành shop ở giai đoạn đầu | Audit làm cửa vào | Từ chối vận hành shop và livestream (bẫy phải thuê thêm người) | Form **nhận mọi dịch vụ** để đo nhu cầu thật. **Chỉ nhận:** booking KOC, tư vấn KOC, audit ads, GMV Max. Livestream, vận hành shop, Google/FB → gắn cờ **"chuyển đối tác"** (có thể lấy phí giới thiệu). Chỉnh trong `accepted_services`. |
| 3 | Mức tự động hoá lead | Chưa bàn | App soạn nháp và nhắc việc, người thật bấm gửi | Không outreach hàng loạt, không scrape | **Người thật gửi 100%.** App lo: chấm điểm, soạn nháp theo insight của shop, link tracking riêng cho từng lead, lịch D0/D3/D7/D14, danh sách chặn (opt-out), cảnh báo quá SLA. |
| 4 | Số lead cần có | Chưa bàn | Nhiều lead, chuyển đổi qua audit | Trần 3–4 client; lead thừa là tự sát | Chạy lead-gen ở mức **đủ lấp 3–4 slot**. Mở rộng khi đạt ≤15h/client và có freelancer đã đào tạo. |
| 5 | Giá | Audit 9,9–15tr, retainer 30–45tr | Audit miễn phí làm lead magnet | Audit 3–5tr, được trừ 100% vào phí retainer | **Mini-audit tự động miễn phí** (đã có trong app) → **Audit sâu 5–10tr**, trừ vào phí retainer nếu ký trong 30 ngày → **Retainer seeding 15–35tr/tháng**. Phí KOC và mẫu **brand trả thẳng** cho creator. %GMV chỉ là bonus khi vượt ngưỡng, có trần. |

## 3. Định vị và bậc thang sản phẩm (offer ladder)

> **"Nhiên liệu creative cho GMV Max."** Chúng tôi xây nguồn video KOC có trần phí theo điểm hoà vốn, đo ROI từng mẫu, content đúng luật, rồi đẩy video thắng vào GMV Max Product & LIVE. Báo cáo lợi nhuận đóng góp, không báo cáo view.

| Bậc | Gói | Giá (UT) | Mục đích |
|---|---|---|---|
| 0 | Mini-audit 5 trục (tự động trên `/brands`) | Miễn phí | Lead magnet, đồng thời là nửa proposal |
| 1 | Audit sâu GMV Max + KOC (5–7 ngày) | 5–10tr, trừ vào phí retainer | Lọc khách có trả tiền thật |
| 2 | Retainer "Creator-Fuel" (20–40 KOC/tháng, SLA video, duyệt compliance, đẩy video thắng vào GMV Max) | 15–35tr/tháng, tối thiểu 3 tháng | Doanh thu lõi |
| 3 | Bonus hiệu quả | 3–5% GMV tăng thêm so với baseline, có trần, chỉ tính khi CM% ≥ ngưỡng | Chia phần lợi ích tăng thêm |
| — | Livestream / vận hành shop / Google-FB | Chuyển đối tác | Không tự làm giai đoạn đầu |

## 4. Hệ thống tìm lead (đã build trong app)

**Inbound**
- Trang `/brands`: USP, 7 dịch vụ, form 4 bước gồm:
  - Dịch vụ
  - Link shop, sản phẩm mẫu, brief
  - Yêu cầu KOL: tier, ngách, số KOL, số video/KOL, budget
  - Thông tin liên hệ, có checkbox đồng ý xử lý dữ liệu
- Sau khi gửi, khách nhận **mini-audit 5 trục + 3 việc nên làm** và **ước tính ngân sách booking** ngay.

**Link tracking đích "Brand"**
- Tạo ở tab *Tuyển & Link*, dẫn về `/brands`.
- Đo được số click, số lead, số lead chốt của từng bài / group / kênh.

**Outbound (không scrape)**
- Import CSV **bắt buộc có cột `lawful_basis`** (consent / legitimate_b2b / referral).
- Tự lọc trùng theo link shop và chặn người đã opt-out.
- Mỗi lead có **link audit riêng** và **4 tin nhắn soạn sẵn**:
  - D0: Zalo/LinkedIn kèm insight về shop
  - D3: kịch bản gọi điện
  - D7: email có cách huỷ nhận
  - D14: tin chào kết thúc

**Pipeline**
- Trạng thái: Mới → Đủ điều kiện → Đã liên hệ → Đã gửi audit → Đã báo giá → Chốt / Mất (bắt buộc ghi lý do).
- Mỗi lần ghi nhận liên hệ, app tự hẹn lần tiếp theo theo nhịp D0/D3/D7/D14.
- Cron hằng ngày nhắc lead đến hạn và lead inbound quá SLA 2h.
- Khi **Chốt**, một nút bấm tạo luôn chiến dịch từ yêu cầu (ẩn khỏi landing).

**Điểm lead (0–100)** = Fit 60 + Intent 40, hiển thị công thức trên UI.
- **Fit:** quy mô GMV, có chạy ads, cơ hội GMV Max/KOC, ngành.
- **Intent:** inbound/outbound, ngân sách, là người quyết định, brief đầy đủ.

## 5. Vận hành chuẩn: bộ SOP tối thiểu

1. **Onboarding:** ký SOW, thanh toán trước, form brief (dùng chính yêu cầu trong app), ghi KPI baseline.
2. **Bàn giao quyền truy cập:** chỉ dùng Business Manager / partner access / sub-account. Thẻ ads của **client**. Không giữ mật khẩu chính.
3. **Báo cáo tuần:** thứ Hai, gồm KPI, việc đã làm, việc tuần sau. Số liệu lấy từ app (ROI mẫu, video đúng hạn, GMV).
4. **SLA:** phản hồi trong 24h làm việc, báo sự cố trong 4h.
5. **Change log:** mọi thay đổi ngân sách, target, creative đều ghi lại (app có audit log).
6. **Offboarding:** thu hồi quyền, bàn giao dữ liệu creator cho brand, xoá PII.

## 6. Điều kiện tiên quyết, Go / Kill sau 90 ngày

**Trước khi bán cho khách nào:**
- Văn bản chấp thuận của công ty chủ quản (HĐLĐ, không cạnh tranh, IP).
- Pháp nhân / hộ kinh doanh và hoá đơn điện tử.
- Template hợp đồng dịch vụ.
- Multi-tenant trước khi nhận client thứ 2.

**GO nếu đạt đủ:**
- ≥ 3 client trả tiền, trong đó ≥ 1 gia hạn.
- Biên lợi nhuận gộp ≥ 40%.
- ≤ 20h/client/tháng.
- Tỷ lệ audit → retainer ≥ 30%.
- Không ảnh hưởng công việc chính.

**KILL / PIVOT nếu xảy ra một trong các điều sau:**
- < 2 client.
- > 25h/tuần.
- Có khoản nợ quá hạn > 30 ngày.
- Có bất kỳ tín hiệu xung đột nào với công ty.

## 7. Moat còn thiếu (roadmap)

1. **Ingest báo cáo GMV Max / LIVE:** nối được chuỗi video KOC → ROI ads. Đây là USP cốt lõi.
2. **Thư viện claim/disclaimer theo nhóm sản phẩm:** tự kiểm tra trước khi đến người duyệt.
3. **Case study n=1 có nhóm đối chứng** (lấy từ brand nội bộ, đã ẩn danh).
4. **Multi-tenant + phân quyền + audit theo người thao tác:** điều kiện để có client thứ 2.
5. **Báo cáo tuần tự sinh gửi cho client.**
