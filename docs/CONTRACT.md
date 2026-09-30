# Contract v3 — Deal/Booking + Tuyển qua group FB

Nguồn quyết định: `docs/DEBATE.md`. Nền tảng đã có sẵn (ĐỪNG sửa trừ khi contract nói): `lib/schema.js` (bảng mới đã thêm), `lib/pricing.js`, `lib/constants.js` (DEAL_*, TIERS, PAYOUT_STATUS, FB_*, POST_ANGLES), `lib/settings.js` (DEFAULT_RULES có key kinh tế).

Quy ước sẵn có: API dùng `route()` từ `lib/http.js` (`bad()`, `notFound()`, `toId()`, `toInt()`), DB `query/tx` từ `lib/db.js`, log bằng `logEvent()` (`lib/events.js`), rules bằng `getRules()`. UI dùng class trong `styles/globals.css` + primitives `components/ui.js` (`api`, `useLoad`, `Badge`, `Modal`, `Drawer`, `Field`, `Kpi`, `Avatar`, `useToast`, `copy`). Tiếng Việt cho mọi text UI.

## Deal lifecycle
```
offered (brand gửi, chờ creator ≤ creator_reply_hours)
  ⇄ countered (creator trả giá, chờ brand ≤ brand_reply_hours)   — tối đa deal_rounds_max vòng (round tăng mỗi lần đổi bên)
  → booked     (creator accept offer của brand  → tự chốt, vì brand đã duyệt mức đó)
               (brand accept counter của creator → cần approver nếu approval_level ≠ 'ops'; nếu econ.red → cần override_reason)
  → delivered  (admin nghiệm thu: video đã duyệt) → payout 'final' chuyển due, due_at = now + payment_days
  → completed  (mọi payout paid)
  declined / expired / cancelled
```
Khi **booked**: tạo payouts theo `payoutSplit(fee, deposit_pct, rules)`: `deposit` status `due` (due_at = now), `final` status `pending`. Tạo 1 dòng `samples` (status 'approved', source 'deal', campaign_id, product = campaign.product) và lưu `deals.sample_id`; set creator status `in_campaign` nếu đang approved/pending/applied; insert `campaign_creators` ON CONFLICT DO NOTHING.
Ràng buộc khi tạo offer / accept: creator có < `max_open_deals` deal trong DEAL_ACTIVE (trừ chính deal đó); campaign budget: `SUM(fee) của deals booked/delivered/completed cùng campaign + fee mới ≤ campaign.budget` (nếu budget > 0). Barter: `fee = 0` và `videos = 1`.
Mỗi thao tác → 1 dòng `deal_rounds` (action: offer|counter|accept|decline|cancel|deliver|note) + `logEvent` (type `deal_<action>`).
`econ` = snapshot `dealEconomics({creator, rules, fee, commission_pct, videos, sample_cost: campaign.sample_cost, history})` tính lại mỗi lần giá đổi. `history` = `{ median_views, gmv_per_view }` từ bảng videos của creator (views>0): median views, và SUM(gmv)/SUM(views).

## Backend API (agent Backend sở hữu)
Tất cả admin trừ khi ghi "public"/"portal".

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/api/deals` | `?status=all|open|booked|...&campaign=` | `{ deals: [ deal + creator_name, handle, campaign_name, econ ] , summary: { open, booked, committed, paid, due } }` |
| POST | `/api/deals` | `{ creator_id, campaign_id?, deal_type, fee, commission_pct, videos, spark_code, message }` | `201 { deal }` (status offered, expires_at = now + creator_reply_hours) |
| GET | `/api/deals/quote` | `?creator_id&campaign_id&fee&commission_pct&videos` | `{ econ, fair, formula, tier, approval_level }` (để UI xem trước) |
| GET | `/api/deals/[id]` | — | `{ deal, rounds, payouts, creator, campaign, rate_card }` |
| PATCH | `/api/deals/[id]` | `{ action: 'counter'|'accept'|'decline'|'cancel'|'deliver', fee?, commission_pct?, videos?, message?, approved_by?, override_reason? }` | `{ deal }` — brand side. `counter` chỉ khi status countered & round < max. `accept` chỉ khi countered. |
| PATCH | `/api/payouts/[id]` | `{ status: 'paid', ref? }` | `{ payout }` → nếu mọi payout paid → deal completed |
| GET/POST | `/api/fb/groups` | POST `{ name, url, niche, members, post_policy, cost, cooldown_days, note }` | GET `{ groups: [g + posts, clicks, signups, approved, booked, activated, gmv, cost_total, cpa (cost/activated), score, next_post_at, ready] }` |
| PATCH/DELETE | `/api/fb/groups/[id]` | fields + status | `{ group }` |
| POST | `/api/fb/posts` | `{ group_id, campaign_id?, angle }` | `201 { post }` — sinh `code` 7 ký tự, `body` = template theo angle + campaign terms + link `${origin}/j/${code}`. status draft |
| GET | `/api/fb/posts` | `?group_id` | `{ posts }` |
| PATCH | `/api/fb/posts/[id]` | `{ status: 'posted'|'removed', post_url?, poster?, cost? }` | posted → posted_at, group.last_posted_at; removed 2 lần trong 1 group → group banned |
| GET (page) | `/j/[code]` | — | `pages/j/[code].js` getServerSideProps: tăng clicks, set cookie `kol_acq=code` 30 ngày, redirect `/?src=fb&acq=code` (code sai → `/`) |
| GET | `/api/public/campaigns` | public | thêm vào mỗi campaign: `brand_name, deal_type, fee_min, fee_max, commission_pct, revisions, deposit_pct, payment_days, claims_allowed, claims_banned, contact_name, req, note, posts_per`; stats thêm `paid_on_time` (số payouts paid) |
| POST | `/api/creators` | public | nhận thêm `acq` (hoặc cookie `kol_acq`) → `acq_code`, `source='fb_group'` nếu code hợp lệ; `consent: true` bắt buộc → `consent_at` (thiếu → 400 "Cần đồng ý xử lý dữ liệu") |
| GET | `/api/portal/[token]` | portal | thêm `deals: [{ id, status, deal_type, fee, commission_pct, videos, spark_code, deposit_pct, round, last_by, expires_at, campaign_name, brand_name, rounds:[...], payouts:[{kind,gross,pit,net,status,due_at,paid_at}] }]`, `rate_card`, `tier`, `fair: { fee, live_hour, formula }`, `open_campaigns` (public campaigns còn slot) |
| POST | `/api/portal/[token]` | portal | thêm actions: `rate_card {video_fee, live_hour_fee, commission_pct, spark_fee_pct, accepts_barter, note}`; `deal_accept {deal_id}` (chỉ khi status offered → booked tự động); `deal_counter {deal_id, fee, commission_pct, videos, message}` (chỉ khi offered, round < max → countered, expires_at = now + brand_reply_hours); `deal_decline {deal_id, message}`; `apply_campaign {campaign_id, fee, commission_pct, message}` → tạo deal status `countered`, last_by creator, round 1 (creator đề xuất trên campaign công khai) |

Automation (`lib/automation.js` `runTick`): hết hạn deal quá `expires_at` (offered/countered → expired, logEvent, đưa vào thông báo team); payout pending/due quá hạn → đưa vào thông báo. Overview (`/api/admin/overview`) thêm `deals: { open, booked, committed, paid, due_payouts, accept_rate }` và `fb: { groups, clicks, signups, activated }`.
Video của creator có deal booked có fee > 0 → **không auto-approve** (status submitted) dù đúng kênh.
Settings UI dùng lại `/api/admin/settings` (sanitizeRules tự nhận key mới vì đã có trong DEFAULT_RULES).

## Frontend (agent Frontend sở hữu)
- `components/admin/Deals.js` (tab mới "Deals"): summary KPI (đang thương lượng, đã chốt, committed, đã trả, đến hạn trả), filter status, bảng deal; drawer/modal chi tiết: lịch sử vòng, **panel kinh tế** (giá hợp lý + công thức, tier, CM%, GMV kỳ vọng, trần phí, hoà vốn N đơn, tỷ số, cảnh báo đỏ), nút Counter / Accept (ô approved_by bắt buộc khi approval_level ≠ ops; ô override_reason bắt buộc khi econ.red) / Decline / Deliver; danh sách payouts (gross/TNCN/net, nút "Đã trả" + ref). Modal "Tạo offer": CreatorPicker (export từ `components/admin/Samples.js`), campaign, deal type, fee, %HH, số video, spark; gọi `/api/deals/quote` debounce để xem trước econ.
- `components/admin/Recruit.js` (tab mới "Tuyển FB"): bảng group + phễu (clicks → signup → duyệt → chốt deal → kích hoạt → GMV, CPA, score), badge status, "Sẵn sàng đăng" theo cooldown; form thêm group; **Composer**: chọn group + campaign + angle → POST `/api/fb/posts` → hiện body, nút Copy, nút "Mở group" (url), ô dán post_url + "Đã đăng"; danh sách post gần đây (clicks, status, nút "Bị gỡ"). Banner nhắc: *không dùng bot/tự động đăng — vi phạm điều khoản Facebook*.
- `pages/admin/dashboard.js`: thêm 2 nav item `deals` ('Deals','₫') và `recruit` ('Tuyển FB','✚').
- `components/admin/Campaigns.js`: form thêm brand_name, contact_name, deal_type, fee_min, fee_max, commission_pct, revisions, deposit_pct, payment_days, claims_allowed, claims_banned; card hiển thị các điều khoản này; POST `/api/campaigns` gửi các field này (Backend cập nhật insert).
- `components/admin/Automation.js`: thêm nhóm rule "Deal & kinh tế" cho các key mới.
- `components/admin/Overview.js`: thêm 1 hàng KPI deals/fb (từ overview.deals/fb, phòng khi undefined).
- `pages/index.js`: card campaign hiện brand, loại deal, khoảng phí, %HH, cọc/hạn trả, nút "Xem brief" mở modal đầy đủ (brief, yêu cầu, claim được/cấm, số lần sửa, người liên hệ) — **xem brief trước khi đăng ký**; khối "Cam kết thanh toán" (cọc %, trả trong N ngày, TNCN minh bạch); form: checkbox đồng ý dữ liệu (không tick sẵn) gửi `consent: true`, gửi `acq` từ query `acq`.
- `pages/portal/[token].js`: section **Offer** (card từng deal: điều khoản, lịch sử vòng, nút Nhận / Trả giá (form fee, %HH, số video, lời nhắn) / Từ chối, đếm ngược hết hạn), **Thanh toán** (payouts), **Bảng giá của tôi** (rate card form + giá hợp lý kèm công thức công khai + tier), **Chiến dịch đang mở** (apply_campaign với giá đề xuất).
