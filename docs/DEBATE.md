# Debate: Tuyển qua group Facebook + Deal/Booking

Ba agent tranh luận độc lập, mỗi agent một góc nhìn:

- **Growth PM**: tăng pool creator và tỷ lệ chốt.
- **Creator Advocate**: đứng về phía KOC/KOL nano–micro tại Việt Nam.
- **CFO / Risk**: bảo vệ unit economics, ngăn gian lận, đảm bảo tuân thủ.

Người điều phối chốt quyết định ở những điểm các bên bất đồng.

## Vấn đề gốc

Creator điền form nhưng **không nhận lời mời trên TikTok Shop**. Lý do: lời mời chỉ có "mẫu free + hoa hồng". Mức đó không bù được 2–5 giờ quay dựng (hoa hồng dược mỹ phẩm 5–15%, nano ~3k view ra 0–3 đơn). Creator cũng không biết brand là ai, trả bao nhiêu, trả khi nào.

## Các điểm bất đồng và quyết định

| # | Chủ đề | PM | Creator | CFO | **Quyết định** |
|---|---|---|---|---|---|
| 1 | Ai ra giá trước | Creator khai rate card | **Brand công khai brief + khoảng ngân sách trước**, creator báo giá sau | — | Theo Creator. Campaign công khai phải có: brand, sản phẩm, loại deal, khoảng phí, % hoa hồng, số video, số lần sửa, cọc, hạn trả. Rate card chỉ để tham khảo, không bắt buộc. |
| 2 | Tự chốt deal | Auto-accept khi lệch ±15% so với giá hợp lý | — | **Không tự động chấp nhận hay thanh toán** | Chỉ tự chốt khi creator **nhận đúng offer brand đã công bố**, vì brand đã duyệt mức đó từ trước. Mọi counter đều do người duyệt; hệ thống chỉ gợi ý. |
| 3 | Trả phí cố định cho creator chưa có dữ liệu | Không, Seed chỉ nhận mẫu + hoa hồng | Barter tối đa 1 video, không phạt | Trần 1,5tr cho creator chưa có GMV | **Tier**: Seed (chưa có GMV) chỉ được barter hoặc hybrid, phí ≤ 1,5tr (chỉnh được). Pro trở lên dùng giá hợp lý. Barter tối đa 1 video. Trễ hạn thì đổi nhãn "Inactive" thành **"Tạm nghỉ"**. |
| 4 | Số vòng thương lượng / SLA | 3 vòng, hết hạn sau 72h | 2 vòng, brand phải trả lời trong 48h | — | Tối đa **3 vòng**. Brand trả lời trong **48h**, creator trong **72h**. Quá hạn thì deal hết hạn **và báo cho cả hai bên**, không im lặng. |
| 5 | "Giá hợp lý" | Mô hình CPM × hệ số ngành | Thuật toán mờ bị xem là xúc phạm | Trần phí theo GMV kỳ vọng | **Công khai công thức** ngay trên portal: `views TB / 1000 × CPM × hệ số ngành`. Trần phí nội bộ dùng công thức hoà vốn của CFO. |
| 6 | Thanh toán | Tạm ứng + nghiệm thu | Cọc 50%, trả trong 7 ngày | Cọc ≤ 30% sau khi xác minh kênh, 70% trả T+7 | Mặc định **cọc 30%**, phần còn lại trả **trong 7 ngày sau khi video được duyệt**. Hiển thị công khai. Khấu trừ **thuế TNCN 10% với mỗi lần trả ≥ 2tr** (cần kế toán xác minh). Phí hiển thị là **gross**. |
| 7 | Đăng bài group Facebook | Bán tự động, có hàng chờ | Bài phải có con số cụ thể + người liên hệ có tên | **Cấm bot hay auto-post** (vi phạm ToS) | Hệ thống **soạn bài + cấp link tracking + gợi ý lịch đăng + đo phễu**. **Người thật tự đăng.** Đo mỗi group bằng *creator kích hoạt* (có video được duyệt) và GMV, không bằng số signup. |

## Guardrail tài chính (mặc định, chỉnh trong tab Automation)

- **Biên đóng góp:** `CM% = biên gộp 60% − phí sàn 8% − phí thanh toán 5% − hoa hồng deal − hoàn/huỷ 12% × biên gộp`
- **GMV kỳ vọng:** `views TB × GMV/view` (dùng lịch sử của creator nếu có, không thì dùng mặc định ngành × 50%)
- **Trần phí:** `E[GMV] × CM% × 0,6 − chi phí mẫu`
- **Hoà vốn:** `(phí + mẫu) / CM%`
  - Tỷ số hoà vốn / E[GMV] > 1 thì **báo đỏ**. Muốn chấp nhận phải nhập lý do override (có ghi log).
- **Cấp duyệt:** ≤ 3tr ops tự duyệt · 3–10tr cần manager · > 10tr cần CFO. Deal vượt mức ops phải ghi tên người duyệt.
- **Trần ngân sách campaign:** tổng phí đã cam kết (committed) + deal mới không được vượt budget.
- Mỗi creator tối đa **2 deal đang chạy** cùng lúc.

## Tuân thủ

- Checkbox đồng ý xử lý dữ liệu cá nhân (NĐ 13/2023), **không tick sẵn**. CCCD / số tài khoản chỉ hỏi khi đã có deal trả phí; phiên bản này **chưa thu**.
- Brief campaign có mục **claim được phép / bị cấm**. Với TPCN bắt buộc câu "Thực phẩm này không phải là thuốc…".
- Video của deal trả phí **luôn cần người duyệt**, kèm checklist: có disclaimer, có nhãn quảng cáo, không claim chữa bệnh. Video barter vẫn tự duyệt nếu đúng kênh.

## Để sau (ghi nhận, chưa build)

- Clawback khi video bị xoá, kèm cron kiểm tra link còn sống.
- Theo dõi tốc độ tăng view (view velocity).
- Mã xác minh đặt trong bio.
- Hợp đồng điện tử.
- Nhắc qua Zalo ZNS.
- Hồ sơ brand kèm đánh giá từ creator.
