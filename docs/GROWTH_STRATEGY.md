# Chiến lược Growth & Monetization — KOL Hub

Tài liệu này tổng hợp debate giữa 3 agent:

- **Growth Strategist**: kéo số lượng creator và brand.
- **Monetization (CMO + CFO)**: mô hình kiếm tiền.
- **Skeptic / Operator**: rủi ro vận hành, pháp lý, tiêu chí dừng.

Người điều phối chốt quyết định ở những chỗ ba bên bất đồng. Các con số tiền là **ước tính, chưa được kiểm chứng**. Các điểm pháp lý **cần luật sư và kế toán xác nhận**.

## 1. Kết luận một câu

> Chứng minh **n = 1** trước: app phải tiết kiệm giờ ops và ra ROI mẫu thật cho brand hiện tại. Sau đó bán **dịch vụ seeding kèm tool** cho 2–3 brand không cạnh tranh. Chỉ khi đã có multi-tenant, pháp nhân và sự chấp thuận của công ty mới chuyển sang SaaS self-serve. Marketplace nhiều brand là giai đoạn cuối, chỉ mở khi đạt đủ điều kiện thanh khoản.

## 2. Các điểm bất đồng và quyết định

| # | Chủ đề | Growth | Monetization | Skeptic | **Quyết định** |
|---|---|---|---|---|---|
| 1 | Làm gì trước | Mở loop thu hút: media kit, calculator, referral | Managed service làm cửa vào | Chưa có n=1; loop trên dữ liệu tự khai chỉ nhân lên dữ liệu rác | **Skeptic thắng về thứ tự.** 90 ngày đầu chỉ làm độ tin cậy dữ liệu và đo lường. Chỉ lấy 2 loop rẻ, không làm hỏng dữ liệu: media kit **chỉ hiện số liệu đã xác minh**, và calculator (không thu PII). |
| 2 | Bên nào trước | Brand trước, VN đang dư KOC | Brand trả tiền | Brand số 1 trước | **Thống nhất: phía brand trước.** Không chạy chiến dịch kéo creator. |
| 3 | Kiếm tiền bằng gì | SaaS 1,5–5tr, rồi take rate 8–12% | Managed service → SaaS + phí deal 3–5% qua escrow đối tác | Take rate/escrow khiến app thành trung gian thanh toán, rủi ro pháp lý cá nhân | **Không bao giờ cầm tiền.** Brand trả thẳng cho creator. Thu: phí dịch vụ/tháng → SaaS subscription. Phí deal chỉ thêm khi có đối tác escrow được cấp phép **và** có pháp nhân. |
| 4 | % GMV / performance fee | — | Là cái bẫy, attribution không minh bạch | — | **Không làm nguồn thu chính.** Tối đa là bonus khi vượt ngưỡng đã thoả thuận trước. |
| 5 | Thu tiền creator | Không | Không | — | **Không thu tiền creator.** Quyền lợi theo tier là quyền truy cập (slot sớm, nhận cọc, trả nhanh), không phải tiền. |
| 6 | Referral | Thưởng bằng ưu tiên slot, không trả tiền | — | Sẽ bị farm tài khoản | Chỉ bật referral có thưởng **sau khi** có xác minh kênh (mã trong bio). Thưởng = quyền truy cập. |
| 7 | SEO profile công khai | Loop mạnh nhưng chậm | — | Có thể vi phạm ToS TikTok, NĐ 13 | **Không làm trong 90 ngày.** Media kit chỉ hiển thị khi creator tự bật và số liệu đã xác minh. |
| 8 | Chỉ số North Star | Deal đã chốt + video xác minh đúng SLA | Giờ ops tiết kiệm, ROAS | Ngưỡng kill | **North Star = Qualified Creator-Deals / tháng** (deal đã chốt + video xác minh đúng SLA). Bảng chứng minh giá trị dùng 4 chỉ số ở mục 4. |

## 3. Lộ trình

### Giai đoạn 0 — 90 ngày: chứng minh n=1 (nội bộ, không thương mại hoá)

**Build (theo thứ tự)**
1. User riêng, role (owner / ops / approver), audit log có tên người thao tác. Nối vào các cấp duyệt trong DEBATE.md.
2. Xác minh kênh bằng mã đặt trong bio. Screening và health score ưu tiên số liệu đã xác minh.
3. Import CSV an toàn:
   - Báo cáo chênh lệch sau mỗi lần import.
   - Cảnh báo khi đổi tên cột.
   - Không auto-map theo tên khi độ tin cậy thấp.
4. Đo lường giá trị: giờ ops tiết kiệm, ROAS của deal đã chốt, tiền guardrail chặn được, chi phí trên mỗi video được duyệt, CPA theo nguồn tuyển.
5. Vận hành:
   - Backup đã thử restore.
   - Sentry và cảnh báo khi cron lỗi.
   - Rate limit login/signup/portal.
   - Tách migration khỏi request (hiện auto-migrate đã có cơ chế retry).

**Không build:** marketplace nhiều brand, SEO profile, data product, referral có thưởng tiền, ví/escrow, native app, AI pricing.

**Loop rẻ được phép:** calculator "KOC nhận bao nhiêu?" (dùng công thức giá hợp lý công khai sẵn có) và bài đăng group FB có link tracking (đã có).

### Giai đoạn 1 — tháng 4–9: bán dịch vụ + tool (sau khi có văn bản chấp thuận của công ty)
- Pháp nhân / hộ kinh doanh, hoá đơn điện tử, DPA với brand.
- Multi-tenant: `brand_id` trên mọi bảng, Postgres RLS, test cách ly 2 tenant, môi trường staging.
- Mời 3–5 brand không cạnh tranh (loop brand mời brand: brand đưa KOC sẵn có của họ vào quản lý).
- Gói **Managed** 25–45tr/tháng (tool + ops bán thời gian).
- Media kit `/c/<handle>` do creator tự bật, chỉ số liệu đã xác minh.
- Zalo ZNS cho thông báo giao dịch, digest hằng tuần cho creator và brand.

### Giai đoạn 2 — tháng 10–18: SaaS self-serve

| Gói | Đối tượng | Giới hạn | Giá/tháng (ước tính) |
|---|---|---|---|
| Starter | SME Shopee/TikTok | 50 creator active, 2 campaign | 1,49tr |
| Growth | Brand vừa | 300 creator, API sync | 4,9tr |
| Agency | Agency/MCN | Nhiều brand, portal white-label | 12tr + 1,5tr/brand |
| Managed | Làm hộ | Tool + ops | 25–45tr |

- Đơn vị tính giá: **creator active/tháng**.
- Phí deal 3–5% chỉ áp dụng khi đi qua đối tác escrow được cấp phép.
- Mục tiêu:
  - CAC SME ≤ 3tr, payback ≤ 6 tháng
  - Gross margin SaaS ≥ 80%, blended ≥ 60%
  - Churn SME ≤ 5%/tháng

### Giai đoạn 3 — sau 18 tháng: marketplace + data
- Chỉ mở marketplace khi đạt **cả 3** điều kiện:
  - ≥ 10 brand active/tháng
  - ≥ 60% campaign công khai đủ slot trong 7 ngày
  - ≥ 30% creator nhận offer từ ≥ 2 brand/quý
- Data product: benchmark rate card theo ngành/tier, **tổng hợp ẩn danh k ≥ 10**, có consent.

## 4. Bảng chứng minh giá trị (đo từ giai đoạn 0)

| Chỉ số | Mức cần đạt sau 3 campaign | Kill / pivot nếu |
|---|---|---|
| Giờ ops mỗi campaign so với baseline Excel | −50% | giảm < 25% hoặc vẫn > 10h/campaign → quay về Sheet + Zalo |
| Tỷ lệ mẫu ra video đúng hạn | ≥ 60% | < 40% trong 2 campaign liên tiếp |
| ROI mẫu (GMV / chi phí mẫu) | ≥ 3× | < 1,5× trong 2 campaign liên tiếp → bỏ seeding đại trà |
| Tỷ lệ accept lời mời / offer | ≥ 30–40% | — |
| Tỷ lệ đơn tự map | ≥ 90% | — |
| Sự cố trả sai tiền | 0 | bất kỳ sự cố nào → dừng mở rộng payout |
| Creator gian lận | — | > 20% → tắt auto-approve |
| Brand ngoài trả phí sau 3 demo | ≥ 1 | 0 → không làm SaaS |
| **Chấp thuận bằng văn bản của công ty** | có | không có → dừng mọi hướng thương mại hoá |

## 5. Thí nghiệm 90 ngày (chỉ những thí nghiệm không làm hỏng dữ liệu)

| # | Giả thuyết | Chỉ số | Ngưỡng thành công |
|---|---|---|---|
| E1 | Công khai khoảng phí trên campaign tăng tỷ lệ nhận | offer → accept | ≥ 40% |
| E2 | Bước "Mức cast" giúp chốt deal nhanh hơn | Số vòng TB, thời gian offer → chốt | ≤ 1,5 vòng, ≤ 72h |
| E3 | Nhắc hạn (portal + tin nhắn copy sẵn; ZNS ở giai đoạn 1) giảm trễ hạn | % video đúng SLA | +15 điểm % |
| E4 | Trả nhanh T+3 cho Partner tăng tỷ lệ quay lại | Deal lần 2 trong 60 ngày | ≥ 35% |
| E5 | Calculator là lead magnet | visit → signup | ≥ 8% |
| E6 | Mã xác minh trong bio lọc gian lận | % hồ sơ lệch số khai > 50% | đo được baseline |

## 6. Lộ trình lên CMO: dùng app làm case nội bộ

**P&L 1 trang gửi sếp**
- (a) Giờ ops trước/sau, quy ra lương.
- (b) Ngân sách seeding đã chặn được: mẫu không ra video, phí vượt trần.
- (c) GMV từ creator và ROI mẫu.
- So sánh với chi phí thuê agency (15–20% ngân sách, hoặc 20–50tr/tháng).
- Chạy 1 quý có nhóm đối chứng (campaign làm tay).

**Trước khi bán ra ngoài**
- Làm rõ **quyền sở hữu code và dữ liệu** với công ty. Có thể chọn: spin-off, license, hoặc công ty làm khách hàng đầu tiên kiêm đồng sở hữu.
- Dữ liệu creator của brand hiện tại **không được mang sang** tenant khác.
