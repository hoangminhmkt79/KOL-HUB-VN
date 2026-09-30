# KOL Hub — Creator Ops cho TikTok Shop

Tuyển KOC/KOL, gửi hàng mẫu, theo dõi vận chuyển, thu video và đo GMV trong một hệ thống. Phần lớn chạy tự động.

## Luồng tự động

```
Tuyển ──► Sàng lọc ──► Gửi mẫu ──► Theo dõi giao ──► Nộp video ──► Đo GMV ──► Scale / Inactive
 │           │            │              │                │             │
 landing     rule engine  CSV / API      SLA + nhắc hạn   xác minh kênh import số liệu
 + mời       (tự duyệt)   map đơn→creator (cron)          (oEmbed)      video
 + referral
```

| Bước | Tự động làm gì | Nguồn dữ liệu |
|---|---|---|
| **Tuyển** | Landing hiện chiến dịch công khai + số slot thật. Admin dán list @handle → link mời cá nhân hoá. Mỗi creator có link giới thiệu (`/?ref=`) | Form, Creator Marketplace |
| **Sàng lọc** | Chấm engagement (avg views / followers) ở server → tự duyệt / chờ duyệt / loại, phát hiện số liệu khai khống | Rule chỉnh trong tab Automation |
| **Map đơn mẫu** | Import file đơn hàng Seller Center hoặc sync API → chỉ lấy đơn 0đ → map creator theo SĐT / tên → cập nhật trạng thái giao | CSV hoặc TikTok Shop API |
| **Tracking** | Chờ gửi → Đang giao → Đã nhận → đặt hạn video (mặc định 7 ngày) → nhắc trước 2 ngày → trễ hạn → Inactive sau 14 ngày | Cron 8:00 hằng ngày |
| **Video** | Creator nộp link ở portal → kiểm tra video đúng kênh (TikTok oEmbed) → gắn vào đơn mẫu, đóng SLA, cộng tiến độ chiến dịch | Portal creator |
| **GMV** | Import số liệu video → cộng GMV creator → đủ ngưỡng thì chuyển **Scaling**. Tính ROI mẫu = GMV / chi phí mẫu | CSV Affiliate / Analytics |

## Các trang

| URL | Ai dùng | Nội dung |
|---|---|---|
| `/` | Creator | Landing, chiến dịch đang tuyển, form đăng ký 3 bước |
| `/portal/<token>` | Creator | Trạng thái, tiến độ giao mẫu + mã vận đơn, hạn video, nộp video, địa chỉ, brief, link giới thiệu |
| `/admin` | Team | Tổng quan (funnel, việc cần làm, trễ hạn, top GMV), Creators, Đơn mẫu (bảng tiến độ), Video, Chiến dịch, Automation |

## Setup

```bash
npm install
cp .env.example .env.local     # điền DATABASE_URL + ADMIN_PASSWORD
npm run dev                    # http://localhost:3000/admin
```

Lần đầu: vào **Admin → Automation → Khởi tạo / nâng cấp DB**. Nút này chạy lại an toàn và nâng cấp được DB cũ.
Hoặc chạy `npm run schema` rồi dán `database.sql` vào Neon SQL Editor.

### Deploy Vercel
1. Import repo và thêm env: `DATABASE_URL`, `ADMIN_PASSWORD` (hoặc `ADMIN_HASH`), `SESSION_SECRET`, `CRON_SECRET`.
2. Cron trong `vercel.json` gọi `/api/cron/tick` lúc 01:00 UTC (8:00 VN). Nếu có API thì cron sync TikTok trước, rồi chạy automation.

### Lấy file đơn TikTok để import
Seller Center → **Đơn hàng → Quản lý đơn → Xuất** → lưu **CSV UTF-8**. Tên cột được nhận diện cả tiếng Anh lẫn tiếng Việt
(`Order ID`/`Mã đơn hàng`, `Tracking ID`/`Mã vận đơn`, `Phone #`, `Recipient`, `Order Status`…).
Đơn không map được thì vào mục **“đơn chưa map”** để gán tay, hoặc creator tự khai mã đơn trong portal.

### TikTok Shop API (tuỳ chọn)
Cần app trên TikTok Shop Partner Center được duyệt scope Order, và OAuth với shop để lấy `access_token` + `shop_cipher`.
Client ký request theo chuẩn v2 và gọi `order/202309/orders/search` (xem `lib/tiktok.js`).
Lưu ý: access token hết hạn định kỳ, cần refresh. Luồng CSV hoạt động độc lập, không cần API.

## Bảo mật
- API admin có cookie phiên HttpOnly ký HMAC. Dữ liệu cá nhân (SĐT, địa chỉ) không còn lộ công khai.
- Portal creator dùng token ngẫu nhiên riêng cho từng người, SĐT hiển thị dạng che.
- Score tính ở server. Form có honeypot chặn bot, chặn đăng ký trùng SĐT / handle / email.

## Cấu trúc
```
lib/          schema, db, auth, scoring, orders (map đơn), tiktok, video, automation, settings
pages/api/    creators, campaigns, samples (import/sync/unmatched), videos, portal, admin, cron, public
components/   ui.js (design system) + admin/* (từng tab)
```
