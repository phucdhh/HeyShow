# HeyShow

**HeyShow** là công cụ soạn và trình chiếu slide: https://heyshow.pedu.vn

Bạn viết slide bằng HTML ngay trên trình duyệt, thấy kết quả hiện ra tức thì bên cạnh, có thể nhờ AI viết giúp khi bí ý, rồi bấm **Publish** để có một link trình chiếu công khai — gửi cho người xem, dán vào bài giảng, hoặc trình chiếu trực tiếp.

## HeyShow khác gì PowerPoint và Canva?

| So sánh| PowerPoint | Canva | **HeyShow** |
|---|---|---|---|
| Nơi lưu bài | máy cá nhân / OneDrive | tài khoản Canva | **máy chủ Samsung Galaxy Z Fold 4**, và tải được file HTML gốc về |
| Cần tài khoản & trả phí | có, nằm trong bộ Office của MS | không và có (nếu cần tính năng mạnh hơn) | **không** |
| Mẫu giáo án Việt Nam | không có | không có | **nhiều mẫu dựng sẵn**: giáo án 5 bước cho các môn học như Toán, Ngữ văn, Vật lí, Hoá học, Sinh học, Lịch sử, Địa lí, chuyên đề ôn thi, báo cáo – tiểu luận, đố vui, slide tương tác |
| Công thức Toán | phải cài thêm hoặc chụp ảnh | gõ thủ công, dễ lệch | **KaTeX tích hợp sẵn** — gõ LaTeX, thấy công thức thật |
| Hiệu ứng & tương tác trong slide | hạn chế | rất hạn chế | **đủ tính năng Reveal.js**: chuyển cảnh, fragment, slide dọc, và các mẫu trắc nghiệm/ghép đôi/điền khuyết làm bằng HTML thuần |
| Đưa bài có sẵn vào | — | — | **Power Point`.pptx`, Markdown `.md`, LaTeX beamer `.tex`** — có báo cáo trước để bạn xem được gì, mất gì |
| Hình vẽ trong file `.tex` | — | — | **dựng lại thành SVG** bằng bộ vẽ tính toạ độ theo đúng quy tắc pgfplots |
| Nhờ AI viết nội dung | Copilot (trả phí) | Magic Design (trả phí) | **có, miễn phí**, và bạn có thể chọn các mô hình AI mà hệ thống cung cấp |
| Link chia sẻ | phải export file | link của họ | **link của bạn**, mở là chiếu |
| Vài giáo viên dùng chung | bản quyền từng máy | cùng tài khoản, lẫn bài của nhau | **mỗi người một kho riêng**, hạn mức rõ theo bậc quyền |
| Quyền với mã nguồn | không | không | **toàn bộ, tự host, tự sửa** |

Nói ngắn gọn: PowerPoint và Canva bán cho bạn một định dạng và một đám mây. HeyShow đưa cho bạn **một link và một file HTML** — thứ mà nhiều năm sau vẫn biên tập dễ dàng.

## Bạn làm được gì

- **Soạn slide** trong trình soạn hai khung: bên trái là code, bên phải là bài thật đang chạy. Đặt con trỏ vào slide nào, khung xem nhảy tới slide đó.
- **Giữ thiết kế chung cho cả bài** bằng `<section-master>` — đặt nền, tiêu đầu, chân trang một lần, áp cho mọi slide.
- **Nhờ AI viết giúp**: chọn vị trí chèn (thiết lập dùng chung / slide hiện tại / slide tiếp theo / slide cuối cùng) rồi mô tả bằng tiếng Việt.
- **Dùng mẫu có sẵn** tại `/templates`: 33 mẫu chia 11 danh mục — giáo án lên lớp theo từng môn, chuyên đề bồi dưỡng, và các slide tương tác (kể cả mẫu Âm thanh & video: âm báo đúng/sai, luyện nghe, video tự dừng để hỏi bài). Bấm "Dùng mẫu này" là có ngay bản nháp trong trình soạn; tìm mẫu không cần gõ dấu (`giao an` vẫn ra "Giáo án").
- **Đưa bài đã có vào**: import PowerPoint, Markdown hoặc LaTeX beamer; xem báo cáo từng slide rồi mới quyết định import.
- **Quản lý bài** tại `/dashboard`: publish, xuất bản lại, in ra PDF, về nháp, tải HTML, đổi tên, xoá; xem ai vừa thích và bình luận bài của mình; sửa hồ sơ, ảnh đại diện, link cá nhân.
- **Quay lại bản cũ**: mỗi lần lưu, bản trước được cất lại — xem thử và khôi phục ~3 bản gần nhất.
- **Chia sẻ & tương tác**: bài lên `/gallery` kèm thumbnail thật, lượt xem, lượt thích, lượt chia sẻ và bình luận theo luồng có công thức Toán; nút Share đưa nhanh tới Gan Jing World, Facebook, X.
- **Trang cá nhân** `/<tên-bạn>/` liệt kê mọi bài bạn đã công khai.
- **Học cách làm** tại `/help`: 9 mục hướng dẫn, mỗi ví dụ chạy được ngay trên trang.

Trong trình soạn còn có: ô chọn màu kiểu VS Code, nhãn và thu gọn từng slide, tìm kiếm/thay thế, snippet, kiểm tra thẻ `<section>` chưa đóng, và chống mất dữ liệu khi tắt tab.

## Ai đang dùng

Giáo viên trung học, sinh viên và giảng viên dùng để soạn giáo án lên lớp, chuyên đề ôn thi, báo cáo — và cho học sinh làm bài thuyết trình. HeyShow phân quyền từ thấp tới cao: `user` (10 bài) → `designer` (20) → `master` (50) → `admin`. Ai tự đăng ký cũng bắt đầu ở bậc thấp nhất; admin giúp nâng bậc và mở "phiên hỗ trợ" để sửa giúp bài của người dùng khi cần.

## Bắt đầu nhanh

1. Mở https://heyshow.pedu.vn → **Đăng ký** (tên đăng nhập + mật khẩu, kèm họ tên và email nếu muốn đăng nhập bằng email).
2. Vào `/design`, gõ `<section>` đầu tiên, hoặc mở `/templates` chọn một mẫu.
3. Bấm **Publish**, lấy link `/show/<tên-bạn>/<tên-bài>.html` mà dùng: chiếu, gửi, nhúng.

Chưa muốn đăng ký? Vào `/gallery` xem bài của người khác và bấm nút Full Screen để thử trình chiếu sản phẩm của người khác.

## Chạy dự án trên máy của bạn

```bash
npm install && (cd client && npm install) && (cd server && npm install)
npm run lint              # ESLint toàn repo
npm test                  # 107 test, chạy trên kho dữ liệu tạm, không đụng bài của ai
cd client && npm run dev  # trình soạn + hot reload
cd server && npm run dev  # backend
```

Deploy sang máy chủ của riêng bạn: copy `sync2fold4.example.sh` thành `sync2fold4.sh`, điền địa chỉ máy, chạy `./sync2fold4.sh` (test → build → rsync → reload → kiểm tra `/health`). Sao lưu dữ liệu: `./scripts/backup-data.sh`.

Công nghệ: Node.js + Express 5, Vite + Vanilla JS, CodeMirror 6, Reveal.js 6.0.2 + KaTeX, PM2, Cloudflare Tunnel; lưu trữ bằng file, không dùng database.

## Tài liệu

- `ARCHITECTURE.md` — kiến trúc hệ thống, API, cách slide hoạt động, phân quyền & bảo mật, mô tả kỹ thuật từng khu vực.
- `CHANGELOG.md` — lịch sử phiên bản, khớp với mục Changelog trong `/help`.
- `PLAN.md` — kế hoạch phát triển và quy trình làm việc.
- `ROADMAP.md` — đã làm gì, sẽ làm gì, hạn chế đã biết.

Bốn file trên là tài liệu nội bộ nên nằm ngoài git (xem `.gitignore`); `README.md` là tài liệu duy nhất có trong repo.

## Tác giả

**Nguyễn Đăng Minh Phúc** · [ganjingworld.com/@ndmphuc](https://www.ganjingworld.com/@ndmphuc)

HeyShow là dự án cá nhân, phi lợi nhuận, tự host. Bạn có thể góp ý tính năng hay báo lỗi bằng cách để lại bình luận dưới bất kỳ bài nào trong Gallery. Nếu bạn dựng được một mẫu đẹp, hãy publish nó — tác giả có thể đưa vào thư viện mẫu kèm tên bạn.
