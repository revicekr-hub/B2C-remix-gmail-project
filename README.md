# 📬 B2Cmail — Trình tạo Email Marketing bằng AI

**B2Cmail** là nền tảng khởi tạo, cá nhân hóa, kiểm định độ an toàn hộp thư đến (Deliverability Audit) và mô phỏng chiến dịch Email Marketing bằng Trí tuệ Nhân tạo (AI), được thiết kế như một không gian làm việc chuẩn doanh nghiệp (Enterprise Email Marketing Suite).

---

## 1. 📋 Thông tin chung

| Hạng mục | Nội dung |
|---|---|
| Tên đội thi | **PK Coding** |
| Thành viên đội thi | 1. **Dương Quang Phúc** (MSSV: PH64240 — FPT Polytechnic · Khoa Kinh tế / Ngành Marketing & Sales / Lớp MS21202)[cite: 21]<br>2. **Phạm Chí Kiên** (MSSV: PH64302 — FPT Polytechnic · Khoa Kinh tế / Ngành Marketing & Sales / Lớp MS21202)[cite: 21] |
| Bảng thi | **Bảng B - Kinh tế** |
| Đề bài bốc thăm | **Đề số 06 — Trình tạo email marketing bằng AI** (Công cụ soạn email chiến dịch tự động) |
| Demo online | https://ai.studio/apps/691935ad-6059-438e-a8f3-b63ede800bb8 *(Hoặc chạy trực tiếp từ source theo Mục 5)* |
| Video demo (≤ 02 phút) | `<Điền URL link Google Drive / YouTube video demo 2 phút của đội trước khi nộp>` |
| Source ZIP | Nộp trực tiếp gói mã nguồn ZIP trên hệ thống dự thi |
| Minh chứng dùng AI | Xem trực tiếp tại **Mục 10** trong tệp README này |
| Bảng kiểm thử | Xem trực tiếp tại **Mục 11** trong tệp README này (Gồm 06 ca kiểm thử thực tế) |

---

## 2. 🎯 Tính năng chính & Mô tả Bài toán

Sản phẩm hoàn thành trọn vẹn 5 yêu cầu chức năng cốt lõi của Đề số 06 và tích hợp thêm bộ công cụ quản trị Email Marketing Doanh nghiệp:

- **Tính năng 1 (Form nhập chiến dịch thông minh & Brand Kit):** Cho phép chọn nhanh *Mục tiêu chiến dịch* (`🚀 Ra mắt sản phẩm` / `🎁 Khuyến mãi` / `💎 Chăm sóc khách hàng`), nhập *Tên thương hiệu*, *Ngành hàng* và *Nội dung ưu đãi & thông điệp chính*. Hỗ trợ nút nạp nhanh kịch bản mẫu (Demo Preset) và lưu lịch sử chiến dịch.
- **Tính năng 2 (AI phân tích và viết 03 mẫu email đa góc tiếp cận)[cite: 18]:** Tự động sinh đồng thời 03 mẫu email hoàn chỉnh theo 3 chiến lược tiếp thị (*Mẫu 1: Trực diện & Lợi ích cốt lõi; Mẫu 2: Kể chuyện & Khơi gợi cảm xúc; Mẫu 3: Khẩn cấp & Thúc đẩy chuyển đổi FOMO*). Mỗi mẫu gồm đầy đủ: Subject Line, Preheader, Nội dung (HTML & Text), Nút kêu gọi hành động (CTA) và cá nhân hóa động (`{{Ten_Khach_Hang}}`, `{{Ten_Cong_Ty}}`, `{{Ma_Uu_Dai}}`).
- **Tính năng 3 (Khung Preview hiển thị như hộp thư Gmail thật)[cite: 18]:** Mô phỏng trực quan giao diện hộp thư đến và khung đọc thư chi tiết của Gmail (Desktop & Mobile), tích hợp công cụ kiểm tra độ an toàn hộp thư đến (Spam Score Audit) và quản lý/lưu/xoá lịch sử chiến dịch.
- **Tính năng 4 (Nút Copy từng mẫu & "Viết lại theo tông khác")[cite: 18]:** Sao chép nhanh từng mẫu (Copy toàn bộ, Copy Subject, Copy mã HTML) hoặc xuất báo cáo; tích hợp thanh công cụ chuyển đổi tông giọng tức thì sang **Trang trọng (`formal`)**, **Hài hước (`witty`)**, **Khẩn cấp (`urgent`)**, hoặc **Chuyên nghiệp (`professional`)**.
- **Tính năng 5 (AI gợi ý thời điểm gửi tốt nhất theo ngành hàng)[cite: 18]:** Phân tích hành vi khách hàng theo từng ngành hàng đã nhập để đề xuất **Ngày gửi vàng**, **Khung giờ mở thư cao nhất**, lý do tâm lý học hành vi và ước tính tỷ lệ Open Rate / CTR (phân biệt rõ ràng với số liệu mô phỏng Tracking thực tế).

---

## 3. 🛠️ Công nghệ sử dụng

| Lớp | Công nghệ (ghi đúng phiên bản đã dùng) |
|---|---|
| Giao diện | **React** (`^19.0.1`) + **TypeScript** (`^7.0.2`) + **Tailwind CSS** (`^4.3.3`) |
| Thư viện | `@google/genai` (`^2.4.0`), `lucide-react` (`^0.546.0`), `motion` (`^12.23.24`), `jspdf` (`^4.2.1`), `xlsx` (`^0.18.5`), `express` (`^4.21.2`) |
| Lưu trữ | **localStorage** (lưu lịch sử chiến dịch và Brand Kit phía trình duyệt) kết hợp **In-memory Store** trên Express Proxy (phục vụ mô phỏng Tracking Pixel & Suppression List) |
| Triển khai | **Vite** (`^8.3.0`) + **Node.js/Express (`tsx server.ts`)** / **Google AI Studio (Cloud Run)** |

---

## 4. 🤖 Tích hợp AI

- **Chế độ đang dùng**: **API thật kết hợp Fallback thông minh (Hybrid Real AI + Transparent Mock Fallback)**
  - **API thật**: Sử dụng Google Gemini API qua SDK `@google/genai` với cấu hình `responseSchema` (Structured Outputs) ép kiểu JSON chuẩn xác 100%[cite: 25].
  - **Cơ chế Fallback minh bạch**: Khi chạy ở môi trường chấm bài không cấu hình khóa `GEMINI_API_KEY` hoặc mất kết nối mạng, hệ thống tự động chuyển mượt mà sang bộ sinh dữ liệu mô phỏng theo quy tắc nghiệp vụ (`generateFallbackCampaign`) và hiển thị rõ nhãn phân biệt giữa **"Dự báo bởi AI (Benchmark ngành)"** và **"Dữ liệu mô phỏng thực tế (Simulation)"**.
- **Mục đích**: Phân tích mục tiêu chiến dịch, ngành hàng, ưu đãi của doanh nghiệp để biên soạn 03 mẫu email chuẩn cấu trúc AIDA/PAS, viết lại theo tông giọng yêu cầu, chấm điểm rủi ro Spam và gợi ý khung giờ gửi tối ưu.
- **Bảo mật khoá API**: Tuyệt đối không ghi khoá API trong mã nguồn phía client. Khóa được đặt trong tệp `.env` (đã chặn trong `.gitignore`) và chỉ gọi qua backend proxy `server.ts`[cite: 31].

Biến môi trường (cấu hình trong tệp `.env` dựa trên `.env.example`):

```env
GEMINI_API_KEY=<khoá_gemini_api_của_bạn>
APP_URL=http://localhost:3000
**B2Cmail** là nền tảng khởi tạo, cá nhân hóa, kiểm định độ an toàn hộp thư đến (Deliverability Audit) và mô phỏng chiến dịch Email Marketing bằng Trí tuệ Nhân tạo (AI), được thiết kế như một không gian làm việc chuẩn doanh nghiệp (Enterprise Email Marketing Suite).

---

## 1. 🎯 Mô tả Bài toán & Giá trị Thực tiễn

### Thực trạng bài toán
Trong hoạt động Marketing và Chăm sóc khách hàng (B2C & B2B), các đội ngũ Marketer, Copywriter và Chủ doanh nghiệp thường xuyên đối mặt với 4 rào cản lớn khi triển khai chiến dịch Email:
1. **Tốn nhiều thời gian sáng tạo nội dung:** Phải viết đi viết lại nhiều phiên bản tiêu đề (Subject Line), dòng xem trước (Preheader) và nội dung thân bài (Body) cho từng mục tiêu (`Ra mắt sản phẩm`, `Khuyến mãi`, `Chăm sóc khách hàng`).
2. **Khó hình dung trải nghiệm người nhận thực tế:** Soạn thảo trên trình văn bản thuần túy không cho thấy email sẽ hiển thị ra sao ngoài danh sách Hộp thư đến (Inbox List) hay khi mở đọc trên Máy tính (Desktop) và Điện thoại (Mobile).
3. **Thiếu sự linh hoạt về tông giọng (Tone of Voice):** Khi cần điều chỉnh thông điệp sang giọng **🎩 Trang trọng**, **😄 Hài hước**, hay **🔥 Khẩn cấp (FOMO)**, người viết phải biên tập lại từ đầu.
4. **Gửi sai thời điểm & Dễ rơi vào hòm thư Rác (Spam):** Thiếu dữ liệu gợi ý khung giờ vàng theo đặc thù ngành hàng và thiếu công cụ kiểm tra định dạng HTML chuẩn Email.

### Giá trị thực tiễn của B2Cmail
- **Tăng tốc 10x quy trình sản xuất chiến dịch:** Chỉ từ vài thông tin đầu vào (hoặc 1 cú click chọn kịch bản mẫu), hệ thống sinh ngay **03 mẫu email hoàn chỉnh** theo 3 góc tiếp cận chiến lược: *Trực diện & Lợi ích*, *Kể chuyện & Cảm xúc*, và *Khẩn cấp (FOMO)*.
- **Mô phỏng Hộp thư đến Gmail chân thực 100%:** Xem trước song song cả dòng hiển thị ngoài danh sách Inbox lẫn giao diện mở đọc chi tiết kèm chế độ chuyển đổi **💻 Desktop / 📱 Mobile (375px)** và **Mã nguồn HTML chuẩn Table Layout**.
- **Hoạt động bền bỉ (Zero-Downtime AI Architecture):** Tự động gọi chuỗi mô hình `gemini-2.5-flash` ➔ fallback sang `gemini-2.0-flash` ➔ và cuối cùng là bộ sinh mẫu dự phòng thông minh (`generateFallbackCampaign`) phản hồi linh hoạt theo đúng **Tông giọng** và **Mục tiêu chiến dịch** ngay cả khi không có kết nối mạng hoặc hết hạn mức API.

---

## 2. ✨ Danh sách Tính năng Đã Triển khai

### A. 5 Tính năng Cốt lõi

1. **Biểu mẫu Nhập thông tin Chiến dịch (`Yêu cầu 1`):**
   - Cho phép chọn nhanh **Mục tiêu chiến dịch** (`🚀 Ra mắt sản phẩm` / `🎁 Khuyến mãi` / `💎 Chăm sóc khách hàng`), nhập **Tên thương hiệu**, **Ngành hàng** (kèm danh sách gợi ý ngành phổ biến) và **Nội dung ưu đãi & Thông điệp chính**.

2. **AI Tự động Sinh 03 Mẫu Email Đa Góc Tiếp cận (`Yêu cầu 2`):**
   - Sinh đồng thời 03 mẫu email có cấu trúc rõ ràng, tách bạch từng thành phần:
     - **Mẫu 1:** *Trực diện & Lợi ích* (Đi thẳng vào giá trị cốt lõi và ưu đãi).
     - **Mẫu 2:** *Kể chuyện & Cảm xúc* (Xây dựng sự đồng cảm theo đặc thù ngành hàng).
     - **Mẫu 3:** *Khẩn cấp & Thúc đẩy Hành động - FOMO* (Nhấn mạnh tính giới hạn để tăng chuyển đổi).
   - Mỗi mẫu hiển thị tách bạch: `Subject Line (Tiêu đề)`, `Preheader (Dòng mô tả xem trước)`, `Nội dung (Body HTML & Text)` và `Nút CTA (Call-To-Action)`.

3. **Giao diện Preview như Hộp thư thật kèm Chuyển đổi Desktop / Mobile (`Yêu cầu 3`):**
   - **Mô phỏng dòng hiển thị ngoài Danh sách Inbox:** Hiển thị trực quan cả 3 mẫu email giống hệt danh sách hộp thư đến Gmail (Checkbox, Ngôi sao, Tên thương hiệu gửi, **Subject Line** in đậm, **Preheader** chữ xám và thời gian nhận).
   - **Mô phỏng khung Mở đọc Email chi tiết:** Có đầy đủ Avatar thương hiệu, thông tin người gửi/người nhận, nhãn `Hộp thư đến`, chứng thực `SPF · DKIM ✓`, nội dung HTML hoàn chỉnh và nút CTA nổi bật.
   - **Bộ chuyển đổi thiết bị trực quan:** Chuyển đổi mượt mà giữa **💻 Desktop**, **📱 Mobile (khung điện thoại 375px)** và **Mã HTML**. Toàn bộ mã HTML sử dụng cấu trúc `<table>` chuẩn Email giúp không bị vỡ giao diện trên thiết bị di động.

4. **Nút "Copy từng mẫu" & Cụm nút "Viết lại theo tông khác" (`Yêu cầu 4`):**
   - **Copy từng mẫu đa định dạng:** Hỗ trợ các nút `Copy mẫu này` (toàn bộ nội dung), `Copy Subject` và `Copy HTML` ngay trên thanh công cụ Preview cũng như trên từng thẻ mẫu, có trạng thái phản hồi tức thì **`"✓ Đã sao chép!"`** kèm thông báo Toast.
   - **Viết lại theo tông khác (1-Click Tone Rewriter):** Cụm nút **`🎩 Trang trọng`** (`formal`) | **`😄 Hài hước`** (`witty`) | **`🔥 Khẩn cấp`** (`urgent`) | **`💼 Chuyên nghiệp`** (`professional`) đặt ngay trên thanh công cụ của khung Preview và bảng điều khiển, có hiệu ứng loading rõ ràng và làm thay đổi tức thì câu chào, từ vựng, emoji trên cả 3 mẫu email.

5. **Thẻ Gợi ý Thời điểm Gửi Tốt nhất (`Yêu cầu 5`):**
   - Hiển thị nổi bật **📅 Ngày tốt nhất trong tuần**, **⏰ Khung giờ vàng mở thư**, **📊 Lý giải hành vi khách hàng theo ngành hàng** và **💡 Mẹo tăng tỷ lệ chuyển đổi**.
   - Cho phép bấm 1 nút để áp dụng ngay khung giờ vàng vào bộ lập lịch hẹn giờ gửi tự động.

---

### B. Các Tính năng Mở rộng Nâng cao (Enterprise Suite)

- **🎨 Quản lý Hồ sơ Thương hiệu (Multi-Workspace Brand Kit):** Tạo và áp dụng màu sắc chủ đạo (`Primary Hex Color`), mã ưu đãi mặc định, tên miền gửi (`SPF/DKIM/DMARC`) và chữ ký chân trang vào cả 3 mẫu email.
- **🏷️ Cá nhân hóa Động (Merge Tags) & Xem trước theo Khách hàng:** Hỗ trợ chèn và trộn trực tiếp các biến `{{Ten_Khach_Hang}}`, `{{Ten_Cong_Ty}}`, `{{Ma_Uu_Dai}}` theo từng khách hàng trong danh bạ CRM; hỗ trợ nhập danh sách khách hàng từ CSV tự động nhận diện cột (`email`, `name`, `company`, `voucherCode`) bất kể thứ tự cột.
- **🛡️ Kiểm định Độ An Toàn Hộp Thư Đến (Spam & Deliverability Audit):** Chấm điểm `Spam Score (0–100)` và phân tích các tiêu chí của bộ lọc Gmail Postmaster (tỷ lệ Text-to-HTML, từ khóa nhạy cảm, liên kết hủy đăng ký).
- **📊 Phân hệ "Chiến dịch" (Campaign Management) & "Đã nhận" (Partner/Client Inbox):** Quản lý lịch sử chiến dịch, đối chiếu tỷ lệ phản hồi tự động, lọc thư đối tác/khách hàng và xuất báo cáo trực tiếp tại Client ra **CSV, Excel (.xlsx), PDF và JSON**.
- **🔒 Bảo mật & Kiểm tra Đầu vào Toàn diện:** Chống lỗ hổng XSS (`escapeHtml`) trên trang hủy đăng ký (`/api/unsubscribe`), chống Open Redirect (chỉ cho phép `http://` và `https://`) tại `/api/track/click`, và kiểm tra dữ liệu đầu vào chặt chẽ (HTTP 400 kèm thông báo tiếng Việt rõ ràng).

---

### C. 🔍 Minh bạch hóa Dữ liệu: Phân biệt Dự báo AI và Mô phỏng Tracking Thực tế

Để đảm bảo tính minh bạch tuyệt đối khi đánh giá và sử dụng, giao diện hệ thống gắn nhãn (Badge) phân tách rõ ràng 2 nhóm chỉ số:

| Nhãn hiển thị trên Giao diện | Ý nghĩa & Nguồn dữ liệu | Các chỉ số áp dụng |
| :--- | :--- | :--- |
| **🤖 Dự báo bởi AI (Benchmark ngành)** | Là chỉ số **ước tính kỳ vọng** do AI phân tích dựa trên tiêu chuẩn ngành hàng (Industry Benchmark), độ hấp dẫn của Subject Line và góc tiếp cận của từng mẫu email trước khi gửi. | • `Estimated Open Rate` (VD: `41.5%`)<br/>• `Estimated CTR` (VD: `10.8%`) |
| **🧪 Dữ liệu Mô phỏng Thực tế (Live Tracking Sandbox)** | Là bộ đếm **sự kiện kỹ thuật thực tế** được ghi nhận bởi Backend Server theo từng chiến dịch (`campaignId`) khi chạy mô phỏng gửi thư và kích hoạt các endpoint tracking thật. Khởi tạo từ `0`. | • `Đã gửi` (`POST /api/campaign/send-simulation`)<br/>• `Lượt mở` (`GET /api/track/open` - 1x1 GIF Pixel)<br/>• `Lượt click CTA` (`GET /api/track/click` - 302 Redirect)<br/>• `Hủy đăng ký` (`GET/POST /api/unsubscribe`) |

---

## 3. 🛠️ Hướng dẫn Cài đặt & Chạy Ứng dụng

### Yêu cầu hệ thống
- **Node.js** phiên bản `>= 18.x` (khuyến nghị Node 20+).
- **npm** (đi kèm Node.js).

### Bước 1: Cài đặt Dependencies
```bash
npm install
```

### Bước 2: Cấu hình Biến môi trường (`.env`)
Tạo tệp `.env` tại thư mục gốc của dự án (có thể sao chép từ `.env.example`) và điền khóa API Gemini của bạn:
```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```
> **Lưu ý:** Ngay cả khi chưa cấu hình `GEMINI_API_KEY` hoặc khi mất kết nối mạng, hệ thống vẫn hoạt động bình thường nhờ cơ chế Fallback thông minh (`generateFallbackCampaign`) phản hồi đầy đủ theo từng Tông giọng và Mục tiêu chiến dịch.

### Bước 3: Chạy ở môi trường Development (Cổng `3000`)
```bash
npm run dev
```
Sau khi khởi chạy, mở trình duyệt tại địa chỉ: **`http://localhost:3000`**

### Bước 4: Kiểm tra TypeScript (Lint), Build & Chạy bản Production
```bash
npm run lint && npm run build && npm run start
```

### Bước 5: Chạy Kiểm thử Đơn vị (Unit Tests)
```bash
npx tsx --test src/utils/serverHelpers.test.ts src/services/userDatabase.test.ts src/utils/campaignAndInboxLogic.test.ts src/utils/enterpriseLogic.test.ts src/utils/schedulerLogic.test.ts
```

---

## 4. 🚀 Hướng dẫn Demo 5 Bước (End-to-End)

Bạn có thể bấm nút **"📖 Hướng dẫn sử dụng & Kịch bản Demo"** ngay trên thanh Header của ứng dụng bất kỳ lúc nào, hoặc thực hiện theo 5 bước chuẩn dưới đây:

### Bước 1: Nhập Thông tin Chiến dịch
- Tại bảng điều khiển bên phải, chọn *Mục tiêu chiến dịch*, nhập *Tên thương hiệu*, *Ngành hàng* và *Nội dung ưu đãi*.

### Bước 2: Sinh 03 Mẫu Email AI & So sánh
- Bấm nút **"Sinh 03 Mẫu Email Chiến Dịch (AI)"**, hệ thống sẽ sinh ngay 3 mẫu email:
  - **Mẫu 1:** Trực diện & Lợi ích
  - **Mẫu 2:** Kể chuyện & Cảm xúc
  - **Mẫu 3:** Khẩn cấp & Thúc đẩy Hành động (FOMO)
- Quan sát danh sách 3 thẻ mẫu ở cột phải với đầy đủ `Subject Line`, `Preheader`, `Body`, `Nút CTA` cùng nhãn **`🤖 Dự báo bởi AI (Benchmark ngành)`**.

### Bước 3: Xem Preview dạng Hộp thư thật (Chuyển đổi 💻 Desktop / 📱 Mobile)
- Tại khung **Preview Hộp Thư Thật** ở trung tâm:
  - Quan sát bảng **"📥 Mô phỏng hiển thị ngoài Danh sách Hộp thư đến Gmail"** để so sánh trực tiếp Subject Line + Preheader của cả 3 mẫu. Bấm vào bất kỳ dòng nào (hoặc các tab `Mẫu 1`, `Mẫu 2`, `Mẫu 3`) để mở đọc chi tiết mẫu đó.
  - Bấm nút chuyển đổi **`💻 Desktop`** / **`📱 Mobile`** / **`Mã HTML`** ở góc trên bên phải khung Preview để kiểm tra khả năng tương thích giao diện trên màn hình điện thoại (375px).
  - Tại mục **"Xem trộn biến"**, chọn thử tên khách hàng (VD: *Nguyễn Thị Minh Anh*) để thấy các biến `{{Ten_Khach_Hang}}`, `{{Ten_Cong_Ty}}`, `{{Ma_Uu_Dai}}` được thay thế trực tiếp theo thời gian thực.

### Bước 4: Thử nghiệm "Viết lại theo tông khác" & "Copy từng mẫu"
- Ngay trên thanh công cụ phía trên khung Preview, bấm lần lượt vào các nút **`🎩 Trang trọng`**, **`😄 Hài hước`**, hoặc **`🔥 Khẩn cấp`**.
- Quan sát trạng thái loading `"Đang viết lại..."` và sự thay đổi tức thì của lời chào, từ vựng, biểu tượng cảm xúc cũng như nút CTA trên cả 3 mẫu email.
- Bấm các nút **`Copy mẫu này`**, **`Copy Subject`**, hoặc **`Copy HTML`** để kiểm tra phản hồi **`"✓ Đã sao chép!"`**.

### Bước 5: Xem "Gợi ý thời điểm gửi tốt nhất" & Chạy thử "Mô phỏng gửi & Tracking Pixel"
- Quan sát thẻ **"⏰ Gợi ý thời điểm gửi tốt nhất (Best Send Time)"** ở cột bên phải để xem *Ngày tốt nhất*, *Khung giờ vàng*, *Lý giải hành vi khách hàng* và *Mẹo tăng tỷ lệ chuyển đổi*.
- Tại dải **"🧪 Dữ liệu Mô phỏng Thực tế (Live Tracking Sandbox)"** ngay bên dưới khung Preview:
  1. Bấm **`🚀 Chạy Gửi Mô Phỏng`** để gọi API `POST /api/campaign/send-simulation` (trộn biến Merge Tags và nhúng Tracking Pixel 1x1 GIF).
  2. Bấm **`+ Mở thư (Open Pixel)`**, **`+ Click CTA`**, và **`+ Unsubscribe`** để kiểm chứng các bộ đếm sự kiện thực tế tăng lên theo thời gian thực.
#   B 2 C - r e m i x - g m a i l - p r o j e c t  
 #   B 2 C - r e m i x - g m a i l - p r o j e c t  
 #   B 2 C - r e m i x - g m a i l - p r o j e c t  
 