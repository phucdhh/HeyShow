# HeyShow

**HeyShow** là công cụ tạo và trình chiếu slide dựa trên HTML, tự host trên hạ tầng cá nhân (Samsung Fold 4 chạy Termux). Người dùng soạn từng slide bằng HTML (viết tay hoặc nhờ AI hỗ trợ), xem trước trực tiếp, rồi "publish" thành một link trình chiếu công khai.

## 1. Tổng quan

- Site gồm 5 khu vực chính: **trang chủ `/`** (giới thiệu + thống kê), **editor `/design`** (soạn slide), **dashboard `/dashboard`** (quản lý trình chiếu của tôi), **gallery `/gallery`** (trưng bày công khai) và **help `/help`** (hướng dẫn sử dụng kèm ví dụ chạy được). Thư viện mẫu sẵn tại **`/templates`**.
- Mỗi **file HTML** = một bài trình chiếu.
- Giao diện soạn thảo gồm **2 khung (frames)**:
  - Bên trái: code editor (CodeMirror) để gõ/sửa HTML.
  - Bên phải: preview hiển thị các slide theo thời gian thực (sử dụng **Reveal.js**).
- Con trỏ trong editor và slide trong preview **đồng bộ hai chiều**: đặt con trỏ vào `<section>` nào thì preview nhảy tới slide đó.
- Người dùng có thể tự gõ HTML hoặc dùng **AI (Groq mặc định, hoặc DeepSeek)** để sinh nội dung slide / thiết lập dùng chung; khung chat AI cho chọn nhà cung cấp và 4 vị trí chèn: Slide Master, Slide hiện tại, Slide tiếp theo, Slide cuối cùng.
- **Đa người dùng**: mỗi tài khoản có kho nháp riêng, hồ sơ riêng (avatar, email, username URL) và không đọc được file của người khác.
- Khi hoàn tất, nhấn **Publish** → file được xuất bản thành link công khai dạng:
  ```
  https://heyshow.pedu.vn/<username>/<ten-file>.html
  ```
- **Gallery công khai** tại `/gallery` trưng bày mọi bài đã publish dưới dạng card (thumbnail, tác giả, lượt xem, lượt thích, bình luận) kèm ô tìm kiếm theo tên/tác giả; bấm vào card mở trình xem hai khung kiểu mạng xã hội.
- **Trang hướng dẫn** tại `/help`: 9 mục (Giới thiệu HeyShow, Slide Master, viết slide, các mẫu Table/Image/Shapes/Chart/SmartArt, công thức Toán KaTeX, Dashboard, Gallery, tính năng Design, liên hệ & đóng góp). Mỗi ví dụ có nút **Copy** và **preview Reveal.js thật** (lazy-load bằng IntersectionObserver để không nạp cùng lúc nhiều iframe).
- **Thư viện mẫu** tại `/templates`: 6 **mẫu bài trình chiếu** (giáo án 5 bước, chuyên đề Toán, hướng dẫn sử dụng, đố vui, báo cáo dự án GitHub, tiểu luận) và 6 **mẫu slide** (thống kê, đồ thị hàm số có tham số, trắc nghiệm, ghép đôi, điền khuyết, puzzle — tương tác bằng HTML/CSS thuần). Mẫu có preview Reveal.js, nút Copy code, và riêng mẫu cả bài có nút **“Dùng mẫu này”** tạo thẳng bản nháp trong `/design`.
- Trang quản trị riêng tại `/admin_panel`, chia 3 tab: **Users** (bảng liệt kê mọi tài khoản theo thứ tự mới nhất trước — Avatar thật, URL slug, số nháp / bài public / lượt xem / lượt thích / ngày tạo, nút ⋮ để đổi mật khẩu, đổi quyền, xóa — kèm form tạo user mới), **AI** (cấu hình API Key Groq / DeepSeek) và **Admin** (đổi mật khẩu admin). Đặt lại mật khẩu, đổi quyền user ↔ admin, xóa tài khoản kèm toàn bộ bài vở và số liệu của họ (có chặn tự đổi quyền / tự xóa chính mình và xác nhận xóa bằng cách gõ lại tên).

## 2. Kiến trúc hệ thống

```
┌──────────────────┐    build & rsync     ┌────────────────────────────┐
│   Mac (dev máy)   │ ───── đồng bộ ────▶ │  Samsung Fold 4 (Termux)   │
│  thư mục HeyShow/ │                     │  Node.js Server (PM2)      │
└──────────────────┘                     └───────────────────────────┘
                                                    │
                                           Cloudflare Tunnel
                                                    │
                                                    ▼
                                           heyshow.pedu.vn
```

## 3. Cấu trúc thư mục

```text
HeyShow/
├── server/                    # Node.js Backend (chạy trên Fold 4)
│   ├── src/app.js             # TOÀN BỘ API nằm trong 1 file này
│   └── package.json
├── client/                    # Frontend Editor (Vite + Vanilla JS)
│   ├── index.html             # Trang soạn thảo tại /design (entry "main")
│   ├── landing.html           # Trang chủ giới thiệu tại / (entry "landing")
│   ├── dashboard.html         # Trang quản lý trình chiếu tại /dashboard (entry "dashboard")
│   ├── admin.html             # Trang quản trị (entry "admin")
│   ├── gallery.html           # Trang Gallery công khai (entry "gallery")
│   ├── help.html              # Trang hướng dẫn sử dụng tại /help (entry "help")
│   ├── templates.html         # Trang thư viện mẫu tại /templates (entry "templates")
│   ├── src/                   # Source code UI (CodeMirror, gallery.js, help.js, templates.js)
│   ├── dist/                  # Bản build, server phục vụ trực tiếp thư mục này
│   └── package.json
├── data/                      # Dữ liệu người dùng (KHÔNG bị ghi đè khi đồng bộ)
│   ├── db.json                # Users + config (mật khẩu dạng hash, AI key)
│   ├── social.json            # Dữ liệu Gallery: views / likes / comments / title
│   ├── .jwt-secret            # Secret JWT tự sinh, giữ token sống qua restart
│   └── users/
│       └── <username>/
│           ├── drafts/        # Code HTML dạng thô (chỉ chứa thẻ <section>)
│           └── published/     # File HTML hoàn chỉnh (đã bọc Reveal.js)
├── cf_setup.js                # Tạo/cập nhật Cloudflare Tunnel + DNS (cần biến môi trường)
├── sync2fold4.sh              # Build frontend + rsync lên Fold 4
└── README.md
```

> Thư mục `scripts/` hiện đang trống và không được dùng tới; script đồng bộ nằm ở thư mục gốc.

## 4. Công nghệ sử dụng

- **Backend:** Node.js + Express 5, `jsonwebtoken`, `axios` (gọi Groq / DeepSeek), `jszip` + `fast-xml-parser` (module import .pptx tại `server/src/pptx.js`); module import .md/.tex tại `server/src/textimport.js` (JS thuần, không thêm dependency)
- **Frontend:** Vite, CodeMirror 6 (editor), Reveal.js 5.1.0 (preview & trình chiếu, load từ CDN)
- **Lưu trữ:** file JSON + thư mục trên đĩa (không có database)
- **Quản lý tiến trình:** PM2 (giữ server luôn chạy trên Fold 4)
- **Kết nối mạng:** Cloudflare Tunnel (cloudflared)
- **Đồng bộ:** rsync qua SSH (port 8022 của Termux)

## 5. Workflow phát triển

1. Viết code và test trên máy Mac:
   ```bash
   cd client && npm run dev     # editor với hot reload
   cd server && npm run dev     # backend (nodemon)
   ```
2. Chạy `./sync2fold4.sh` để build frontend và đồng bộ toàn bộ code (trừ `node_modules`, `data/`, `.env`) lên Fold 4.
3. Trên Fold 4, PM2 chạy backend Node.js phục vụ cả frontend đã build lẫn các slide đã publish:
   ```bash
   ssh -p 8022 u0_a341@192.168.1.84 \
     "cd ~/HeyShow/server && npm install && pm2 restart heyshow || pm2 start src/app.js --name heyshow"
   ```

### Thiết lập Cloudflare Tunnel

`cf_setup.js` tạo tunnel, cấu hình ingress trỏ về `http://localhost:3000` và cập nhật bản ghi DNS CNAME cho domain. **Script này KHÔNG chứa secret**; phải truyền qua biến môi trường:

```bash
CF_ACCOUNT_ID="<account id>" \
CF_ZONE_ID="<zone id của pedu.vn>" \
CF_API_TOKEN="<token có quyền Account.Cloudflare Tunnel:Edit + Zone.DNS:Edit>" \
node cf_setup.js
```

Script in ra `TUNNEL_TOKEN=...` ở cuối; dùng giá trị đó để chạy `cloudflared` trên Fold 4.

> **Cảnh báo:** nếu tunnel cùng tên đã tồn tại, script sẽ **XOÁ và tạo lại** để lấy được tunnel secret. Đừng chạy khi tunnel đang phục vụ traffic thật trừ khi bạn chủ đích làm vậy.

## 6. Biến môi trường

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `PORT` | Không | `3000` | Cổng HTTP của server |
| `JWT_SECRET` | Không | tự sinh, lưu vào `data/.jwt-secret` | Khóa ký token. Đặt biến này nếu muốn tự quản lý secret |
| `CF_ACCOUNT_ID` | Có (khi chạy `cf_setup.js`) | — | Cloudflare Account ID |
| `CF_ZONE_ID` | Có (khi chạy `cf_setup.js`) | — | Zone ID của domain |
| `CF_API_TOKEN` | Có (khi chạy `cf_setup.js`) | — | API token Cloudflare |
| `CF_TUNNEL_NAME` | Không | `heyshow-fold4-tunnel` | Tên tunnel |
| `CF_DOMAIN` | Không | `heyshow.pedu.vn` | Domain trỏ về tunnel |

Server đọc `.env` trong thư mục `server/` nếu có (file này được loại khỏi rsync).

## 7. Tài khoản & bảo mật

- **Lần khởi chạy đầu tiên**, server tự tạo tài khoản `admin` với **mật khẩu ngẫu nhiên** và in ra console log. Hãy đăng nhập `/admin_panel` và đổi mật khẩu ngay.
- Mật khẩu được băm bằng **scrypt có salt** (định dạng `scrypt$<salt>$<hash>`). Hash SHA-256 không salt của các bản cũ vẫn đăng nhập được và **tự động nâng cấp** lên scrypt ở lần đăng nhập thành công kế tiếp — không ai bị khoá tài khoản khi nâng cấp.
- `data/db.json` và `data/.jwt-secret` được tạo với quyền `0600` và ghi theo kiểu atomic (file tạm + rename) để không hỏng dữ liệu khi mất điện.
- Endpoint đăng nhập/đăng ký có **giới hạn tần suất**: 30 lần **thất bại** trong 15 phút cho mỗi IP. Lần đăng nhập thành công không bị đếm, nên người dùng bình thường (kể cả cả một lớp dùng chung IP trường) không bị khoá.
- Route `/api/admin/*` yêu cầu role `admin`; tài khoản thường gọi vào sẽ nhận `403`.
- Tên đăng nhập và tên file đều được kiểm duyệt để chặn path traversal và chiếm dụng slug hệ thống (`api`, `admin_panel`, `assets`, ...).

### Việc cần làm sau khi nâng cấp bản vá

1. **Thu hồi (revoke) token Cloudflare cũ** từng bị hardcode trong `cf_setup.js` trên dashboard Cloudflare, rồi tạo token mới và truyền qua biến môi trường.
2. Nếu tài khoản `admin` trên Fold 4 vẫn đang dùng mật khẩu mặc định của bản cũ, server sẽ in cảnh báo `[CẢNH BÁO]` lúc khởi động — hãy đổi ngay.

## 8. API

Mọi route `/api/*` (trừ auth) yêu cầu header `Authorization: Bearer <token>`.

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/auth/login` | công khai | Đăng nhập, trả JWT (hạn 24h) |
| POST | `/api/auth/register` | công khai | Đăng ký tài khoản thường |
| GET | `/api/user/profile` | user | Đọc username, urlSlug, fullName, email, phone, avatar |
| POST | `/api/user/profile` | user | Đổi urlSlug / fullName / email / phone / avatar / mật khẩu (phone chỉ số, `+ - . ( )`, cách trắng ≤20 ký tự; fullName ≤80) |
| GET | `/api/files` | user | Danh sách bản nháp |
| GET | `/api/files/:name` | user | Đọc nội dung nháp |
| POST | `/api/files/:name` | user | Tạo / lưu nháp |
| DELETE | `/api/files/:name` | user | Xoá cả nháp lẫn bản đã publish |
| POST | `/api/files/:name/publish` | user | Xuất bản, trả về URL công khai |
| POST | `/api/files/:name/unpublish` | user | Gỡ bản publish, bài quay về nháp (giữ views/likes/comments) |
| POST | `/api/files/:name/rename` | user | Đổi tên file (nháp + bản publish + record gallery) |
| GET | `/api/files/:name/export` | user | Tải file HTML hoàn chỉnh chạy offline (`Content-Disposition: attachment`) |
| POST | `/api/import/pptx/analyze` | user | Nhận bytes thô file `.pptx` (≤10MB, `application/octet-stream`) → báo cáo: số slide, ảnh/video nhúng, bảng/biểu đồ/SmartArt không import được, ghi chú (server **không lưu file**, client gửi lại ở bước convert) |
| POST | `/api/import/pptx/convert?orig=<tên.pptx>` | user | Chuyển `.pptx` thành bản nháp HeyShow (title/bullets/notes giữ nguyên; ảnh/video → placeholder `<img src="">`/`<iframe src="">` kèm comment hướng dẫn link Google Drive / YouTube / Gan Jing World; bảng/biểu đồ/SmartArt → comment cảnh báo). Tự trùng tên thì thêm `-2`, `-3` |
| GET | `/api/dashboard` | user | Danh sách bài của tôi (nháp + publish, kèm views/likes/comments) và 20 hoạt động (like/comment) gần nhất |
| GET | `/api/stats` | công khai | Thống kê tổng: số bài publish, views, likes, comments, users |
| GET | `/api/gallery` | công khai | Danh sách bài đã publish (kèm views/likes/likedByMe), phân trang `?page=N` (12 bài/trang) và tìm kiếm `?q=`; trả thêm `page`, `totalPages`, `total` |
| GET | `/api/profile/:user` | công khai | Thông tin tác giả + danh sách bài đã publish của riêng user đó |
| GET | `/api/p/:user/:file` | công khai | Chi tiết 1 bài + danh sách bình luận |
| POST | `/api/p/:user/:file/like` | user | Thích / bỏ thích (toggle) |
| POST | `/api/p/:user/:file/comments` | user | Thêm bình luận (tối đa 2000 ký tự) |
| PATCH | `/api/p/:user/:file/comments/:commentId` | user (tác giả) | Sửa bình luận của chính mình |
| POST | `/api/ai/generate` | user | Sinh HTML slide bằng Groq hoặc DeepSeek (theo `provider` trong body) tại 1 trong 4 vị trí `mode` = `master`/`current`/`next`/`last` |
| GET | `/api/ai/providers` | user | Danh sách nhà cung cấp AI đã cấu hình key (để editor bật/tắt lựa chọn) |
| GET/POST | `/api/admin/config` | admin | Đọc / lưu API Key Groq & DeepSeek (`config.aiKeys`) |
| POST | `/api/admin/password` | admin | Đổi mật khẩu admin |
| GET | `/api/admin/users` | admin | Danh sách user: role, slug, email, avatar, ngày tạo, số nháp/public/views/likes (không lộ passwordHash) |
| POST | `/api/admin/users` | admin | Tạo tài khoản mới (`username`, `password`, `role` = user/admin) + thư mục drafts/published |
| POST | `/api/admin/users/:username/password` | admin | Đặt lại mật khẩu cho một user |
| POST | `/api/admin/users/:username/role` | admin | Đổi quyền user ↔ admin (chặn tự đổi quyền chính mình) |
| DELETE | `/api/admin/users/:username` | admin | Xóa tài khoản + thư mục + số liệu gallery (chặn tự xóa) |
| GET | `/admin_panel` | công khai | Trang quản trị |
| GET | `/` | công khai | Trang chủ giới thiệu HeyShow + thống kê |
| GET | `/design` | công khai | Trang biên tập slide (editor); hỗ trợ `?file=<tên>` để mở thẳng một file, `?redirect=<đường dẫn>` để quay lại sau đăng nhập |
| GET | `/dashboard` | công khai | Trang quản lý trình chiếu của user (chưa đăng nhập sẽ được dẫn về màn đăng nhập rồi quay lại) |
| GET | `/gallery` | công khai | Trang Gallery |
| GET | `/help` | công khai | Trang hướng dẫn sử dụng HeyShow (9 mục, ví dụ code kèm preview Reveal.js) |
| GET | `/templates` | công khai | Thư viện 12 mẫu bài/slide, preview Reveal.js + nút "Dùng mẫu này" tạo bản nháp |
| GET | `/<slug>/` | công khai | Trang cá nhân của user (các bài đã publish) |
| GET | `/<slug>/<file>.html` | công khai | Slide đã publish |

## 9. Cách hoạt động của slide

- **Bản nháp** chỉ chứa các thẻ `<section>` (và `<section-master>`), không cần `<html>`, `<head>`.
- **`<section-master>`**: nội dung bên trong thẻ này được gỡ ra và chèn vào đầu **mỗi slide lá** (section không chứa section con) khi render. Dùng để đặt header/footer/nền chung cho toàn bài.
- **Publish**: server bọc nội dung nháp vào template HTML đầy đủ (Reveal.js + theme black + plugin KaTeX cho công thức toán) và ghi vào `published/`.
- **Preview**: editor dựng lại đúng template đó trong một iframe, debounce 500ms khi gõ và 50ms khi chỉ di chuyển con trỏ; khi chỉ đổi vị trí con trỏ thì gọi `Reveal.slide(h, v)` thay vì tải lại iframe.

## 10. Tính năng editor

Trang soạn thảo (`client/index.html` + `client/src/main.js`) dùng CodeMirror 6, ngoài gõ/sửa HTML còn có:

- **Color picker kiểu VS Code** (`client/src/color-picker.js`): mọi mã màu trong code (hex 3/4/6/8 số, `rgb()/rgba()`, `hsl()/hsla()`, tên màu CSS trong thuộc tính liên quan màu) đều hiện một **ô vuông màu nhỏ** ngay trước nó. Bấm vào ô vuông mở bảng chọn màu gồm vùng sáng–đậm (SV), thanh hue, thanh alpha (kèm nền caro để thấy độ trong suốt), ô nhập hex và **10 màu dùng gần đây** (lưu trong localStorage). Kéo thả các thanh sẽ **sửa trực tiếp mã màu trong code** theo thời gian thực (preview cũng cập nhật theo); nút "Hoàn tác" khôi phục màu ban đầu của cả lần chỉnh, "Xong" đóng bảng và lưu màu vào danh sách gần đây.
- **Nhãn slide + thu gọn từng slide** (`client/src/slides.js`): gutter bên trái số dòng gắn nhãn `★` (section-master), `S1`, `S2`, `S2.1`… cho từng thẻ `<section>`. **Bấm vào nhãn** để thu gọn / mở rộng đoạn code của slide đó; hai nút "Thu gọn" / "Mở hết" trên thanh tiêu đề editor thu gọn / mở toàn bộ cùng lúc. Thanh tiêu đề còn hiện trạng thái con trỏ (`Master`, `Slide 2.1 / 5`, `Chưa lưu ●`…).
- **Linter thẻ section**: thẻ `<section>`/`<section-master>` mở mà không đóng (hoặc đóng thừa) bị đánh dấu cảnh báo/lỗi ngay ở gutter, cập nhật sau 600ms.
- **Tìm kiếm / thay thế**: nút 🔍 Tìm hoặc `Cmd/Ctrl+F` mở panel tìm kiếm của CodeMirror ngay trong editor, hỗ trợ phân biệt hoa thường, khớp cả từ, regex, tô sáng mọi kết quả trùng và thay thế từng cái / tất cả. Ngoài ra từ nào đang được bôi đen sẽ tự tô sáng mọi chỗ trùng khác (`highlightSelectionMatches`).
- **Snippets**: gõ `section`, `fragment`, `math`, `columns`, `image`, `highlight`… rồi chọn từ danh sách autocomplete (`Ctrl+Space`) để chèn khung HTML slide tương ứng; có snippet cho cả slide dọc và `section-master`.
- **Nền tảng soạn thảo**: undo/redo (`Cmd/Ctrl+Z` / `Shift+Cmd+Z`), `Cmd/Ctrl+S` lưu nháp ở bất cứ đâu trong trang, tự đóng ngoặc/khớp ngoặc, comment dòng (`Cmd+/`), di chuyển dòng lên/xuống (`Alt+↑/↓`), tô sáng dòng đang đứng, tab để thụt lề.
- **Chống mất dữ liệu**: khi file đang mở có thay đổi chưa lưu, chuyển file / tạo file mới / đăng xuất sẽ hỏi xác nhận; đóng tab trình duyệt cũng hiện cảnh báo của hệ thống.
- **Khung chat AI (Groq mặc định / DeepSeek)**: nút ✨ góc trái dưới mở panel chat; chọn **nhà cung cấp** (Groq mặc định, DeepSeek tuỳ chọn — lựa chọn chưa được admin cấu hình key sẽ bị khoá) và một trong 4 **vị trí chèn** rồi gửi yêu cầu tiếng Việt — (1) **Slide Master**: chèn thiết lập dùng chung (`<style>`, header, footer…) vào bên trong `<section-master>`, tự tạo master mới ở đầu file nếu chưa có; (2) **Slide hiện tại**: chèn nội dung vào cuối thẻ `<section>` chứa con trỏ; (3) **Slide tiếp theo**: chèn slide mới hoàn chỉnh ngay sau slide hiện tại; (4) **Slide cuối cùng**: thêm slide mới vào cuối file. Client gửi code toàn file kèm ngữ cảnh (`targetCode` = khối `<section-master>` hoặc slide chứa con trỏ); server dùng system prompt mô tả cấu trúc HeyShow và quy định dạng output theo từng vị trí (fragment không bọc `<section>` cho master/current, thẻ `<section>` đầy đủ cho next/last). Code chèn vào luôn được đệm dòng mới để không dính vào code cũ.

## 11. Trang chủ & Dashboard

- **Trang chủ `/`** (`client/landing.html` + `src/landing.js`): giới thiệu HeyShow (hero, lưới tính năng, 3 bước sử dụng) và dãy số liệu **thống kê sống** lấy từ `GET /api/stats` (số bài trình chiếu, lượt xem, lượt thích, bình luận, người dùng) với hiệu ứng đếm tăng dần; các nút dẫn tới `/design`, `/dashboard`, `/gallery`.
- **Editor chuyển về `/design`** (route `/` cũ). Màn đăng nhập vẫn nằm ở đây; các trang công khai dẫn link đăng nhập kèm `?redirect=` để quay lại đúng chỗ cũ.
- **Dashboard `/dashboard`** (`client/dashboard.html` + `src/dashboard.js`): chưa có token thì tự chuyển về `/design?redirect=/dashboard` để đăng nhập rồi quay lại. Trang chia **4 tab** (tab được nhớ qua localStorage): **Presentations** — mọi trình chiếu của user (bản nháp lẫn đã publish) kèm trạng thái, lượt xem/thích/bình luận và ngày cập nhật; tên file xám có phần mở rộng `.html` là **link trực tiếp mở bài đã publish** (bài nháp hiển thị chữ thường), còn **toàn bộ thao tác** (Sửa bài, Publish / Xuất bản lại, In ra PDF, Về nháp, Tải HTML, Đổi tên, Xoá) nằm trong dropdown **⋮** đặt cùng hàng tên file — xoá luôn hỏi xác nhận bằng modal nêu rõ hậu quả; **Activities** — ai vừa thích / bình luận vào bài của tôi (kèm trích bình luận), deep-link về viewer của Gallery; **Profile** — đổi ảnh đại diện (PNG/JPG/GIF/WebP < 1MB), **Full Name**, Email, **Số điện thoại**, URL slug (tự bỏ dấu) và mật khẩu mới qua `POST /api/user/profile`; header hiển thị Full Name khi đã có; **Import** — kéo thả / chọn file **.pptx ≤ 10MB**, **Markdown `.md`** hoặc **LaTeX beamer `.tex` ≤ 5MB** (dùng `XMLHttpRequest` để có event `upload.onprogress`: thanh tiến trình báo % dung lượng đã tải lên, rồi chuyển sang chế độ chạy bất định khi server phân tích / chuyển đổi), server phân tích và báo cáo từng slide (tiêu đề, số dòng, ảnh/video nhúng, bảng/biểu đồ/SmartArt không import được, ghi chú) **để người dùng xem xét rồi mới bấm "Import thành bản nháp"** (hoặc Huỷ — file không lưu trên server); bản nháp tạo giữ nguyên chữ và ghi chú, còn media thành placeholder `<img src="">` / `<iframe src="">` kèm comment hướng dẫn: ảnh → Google Drive (link `https://lh3.googleusercontent.com/d/<ID>`), video → YouTube hoặc Gan Jing World (link nhúng), bảng/biểu đồ/SmartArt → gõ lại hoặc dùng ✨ AI trong Design. Với file text, module `server/src/textimport.js` (JS thuần, không thêm dependency) phụ trách: `detectKind` theo phần mở rộng, `analyze` tách Markdown (heading/`---` thành slide, list lồng nhau theo indent, in đậm/nghiêng/code/link, bảng GFM đếm là không import được) và beamer (`\begin{frame}` → slide, `\frametitle`/`\framesubtitle`/`\itemize`/`\enumerate`/`\alert`/`\note`, `columns`, `tabular` đếm, `\includegraphics` → placeholder); **công thức toán `$...$`, `\[...\]` được giữ nguyên** để KaTeX hiển thị. Hai endpoint `POST /api/import/text/analyze` và `/convert` dùng lại cùng định dạng report + draft của pptx nên client không cần đổi logic hiển thị.
- **Help `/help`** (`client/help.html` + `src/help.js`): trang hướng dẫn công khai, bố cục hai cột (mục lục dính bên trái + nội dung bên phải) với 9 mục: (1) Giới thiệu HeyShow, tác giả, so sánh với PowerPoint/Canva và changelog; (2) Làm việc với Slide Master; (3) Viết code trong `<section>`; (4) Một số mẫu (văn bản, bảng, ảnh, hình khối/shapes, biểu đồ, SmartArt, các đối tượng khác); (5) Công thức Toán (KaTeX); (6) Quản lý trong Dashboard; (7) Sử dụng Gallery; (8) Các tính năng Design (tìm kiếm, color picker, phím tắt); (9) Liên hệ & đóng góp. Mỗi ví dụ gồm mã nguồn + nút **Copy** (có fallback `execCommand` rồi fallback bôi đen cho trình duyệt không cấp quyền clipboard) + **preview thật** trong iframe `srcdoc` dựng đúng template publish (Reveal.js 5.1 + KaTeX); iframe chỉ được nạp khi cuộn tới gần (IntersectionObserver, `rootMargin 300px`) để tránh nạp hàng loạt iframe nặng.
- Lượt mở trang ở chế độ `?print-pdf` và `?embed=1` **không bị đếm là lượt xem**.

## 12. Gallery

Trang công khai tại **`/gallery`** (`client/gallery.html` + `client/src/gallery.js`) trưng bày toàn bộ bài trình chiếu đã publish của mọi người dùng.

- **Card:** mỗi bài là một card gồm thumbnail, tiêu đề, avatar + tên tác giả hiển thị đầy đủ (xuống dòng khi dài, không cắt bằng dấu ba chấm), và hàng dưới cùng gồm số lượt xem 👁, số lượt thích ♡, số bình luận 💬 cùng ngày đăng căn lề phải.
- **Tìm kiếm:** ô search ngay đầu trang lọc theo **tiêu đề** hoặc **tên tác giả**, phủ toàn bộ gallery (kể cả các bài nằm ngoài trang đang xem). Khớp **không phân biệt dấu** (gõ `dao ham` vẫn ra `ĐẠO HÀM`) nhờ server chuẩn hoá NFD rồi bỏ dấu trước khi so; client debounce 300ms để không bắn request liên tục khi gõ. Không có kết quả thì hiện thông báo; nút ✖ xoá từ khoá.
- **Phân trang:** mỗi trang chỉ hiển thị **12 card mới nhất** (server cắt trang nên payload và số iframe thumbnail luôn giới hạn). Cuối trang có nav `‹ 1 … n ›`: trang hiện tại tô đậm, nút ‹ › tự vô hiệu ở hai đầu, dãy số trang rút gọn kiểu cửa sổ (luôn giữ trang đầu/cuối và các trang kề trang hiện tại). Đổi trang sẽ cuộn về đầu trang; kết quả tìm kiếm cũng được phân trang tương tự.
- **Thumbnail "sống":** card nhúng chính slide đã publish vào một `<iframe>` thu nhỏ bằng CSS (`transform: scale(...)`) chứ không sinh file ảnh — server điện thoại không chạy được headless Chrome. iframe chỉ tải khi card sắp lọt vào màn hình (IntersectionObserver) và dùng tham số `?embed=1` để **ẩn điều khiển Reveal.js** và **không bị đếm lượt xem**.
- **Trình xem hai khung:** bấm vào card mở overlay gồm khung trái là bài trình chiếu (iframe toàn màn hình, điều khiển được) và khung phải (380px) là thông tin bài, nút thích, liên kết mở toàn màn hình và luồng bình luận kiểu mạng xã hội. Dưới 900px hai khung xếp dọc.
- **Deep-link:** mỗi bài có hash riêng `#/p/<user>/<file>.html` để chia sẻ / quay lại đúng bài.
- **Tương tác:** khách chỉ xem; người dùng đã đăng nhập mới thích và bình luận được. Thích là **toggle** (bấm lại để bỏ). Bình luận và tiêu đề được escape phía client (`textContent`) nên HTML người dùng gõ không thực thi.
- **Toán học trong bình luận:** trang Gallery nạp KaTeX (cdnjs) để render công thức `$...$`, `$$...$$`, `\(...\)`, `\[...\]` ngay trong bình luận đã đăng. Khi đang gõ, rê chuột lên một công thức **đã đóng cặp dấu** sẽ hiện tooltip live-preview render bằng KaTeX — dùng một bản "mirror" của ô nhập (cùng font/bề rộng/xuống dòng) để suy ra công thức nằm dưới con trỏ chuột.
- **Sửa bình luận:** tác giả thấy nút "Sửa" dưới bình luận của mình, sửa inline rồi lưu qua `PATCH /api/p/:user/:file/comments/:commentId` (server chỉ cho chính tác giả, người khác nhận 403). Bình luận đã sửa gắn nhãn "đã sửa" (`editedAt`).
- **Đếm lượt xem:** chỉ cộng khi mở trang slide thật (`/<slug>/<file>.html`); các lượt tải thumbnail `?embed=1` và request không phải GET bị bỏ qua. Tên file lấy từ `req.path` được `decodeURIComponent` trước khi khớp với file trên đĩa, nên tên tiếng Việt / có dấu cách vẫn đếm đúng.
- **Dữ liệu:** lưu riêng trong `data/social.json`, key ổn định `<loginId>/<tenFile>.html>` (không đổi khi user đổi urlSlug). Mỗi record gồm `title` (lấy từ heading đầu tiên của slide, fallback về tên file), `createdAt`, `views`, `likes[]`, `comments[]`. Xoá bài sẽ dọn luôn record tương ứng.

## 13. Trang cá nhân (Profile)

Mỗi user có một trang công khai tại **`/<urlSlug>/`** (ví dụ `https://heyshow.pedu.vn/ndmphuc/`) liệt kê các bài trình chiếu đã publish của riêng họ (`client/profile.html` + `client/src/profile.js`).

- **Route:** `app.use('/:slug')` phục vụ `profile.html` khi đường dẫn là `/<slug>` hoặc `/<slug>/` (không có tên file); khi có `/<slug>/<file>.html` thì vẫn phục vụ slide như cũ. Slug chấp nhận cả `urlSlug` lẫn `loginId`.
- **Dữ liệu:** `GET /api/profile/:user` (công khai) trả về `author` (username, urlSlug, avatar) và `items` là các bài đã publish của user đó — cùng shape với `/api/gallery` (title, url, views, likes, likedByMe, commentCount), sắp xếp theo `updatedAt` giảm dần. User không tồn tại → 404.
- **Giao diện:** banner tác giả (avatar + tên + số bài) và lưới card giống Gallery (thumbnail iframe `?embed=1`, tiêu đề, ngày, views/likes/comments). Bấm card mở bài trong viewer của Gallery (`/gallery#/p/<user>/<file>`) để giữ nguyên luồng thích/bình luận.
- **Điều hướng tới trang cá nhân:** trong Gallery, bấm vào **tên hoặc avatar** tác giả (trên card, trong header của viewer và trong từng bình luận) sẽ đi tới `/<urlSlug>/`. Trên card, link tác giả `stopPropagation` để không kích hoạt mở viewer.

## 14. Hạn chế đã biết

- **Nội dung publish chạy cùng origin với editor.** Slide là HTML/JS do người dùng tự viết và được phục vụ trên cùng domain `heyshow.pedu.vn`, nên về mặt thiết kế nó có thể truy cập `localStorage` của editor. Muốn cách ly thật sự cần phục vụ slide từ một domain riêng (ví dụ `slides.pedu.vn`) hoặc thêm CSP `sandbox`.
- **Mỗi request đều đọc lại `data/db.json` từ đĩa** (route `/:slug` và các route API). Đủ dùng ở quy mô cá nhân nhưng sẽ chậm nếu có nhiều người truy cập đồng thời.
- **Mật khẩu tối thiểu 3 ký tự** khi đăng ký — nên cân nhắc nâng lên nếu mở cho người dùng lạ.
- `client/src/style.css` và `client/src/counter.js` là file thừa từ template Vite, không được import ở đâu.

## 15. Lộ trình (Roadmap)

- [x] Hoàn thiện API Backend (CRUD file nháp, Publish, đa người dùng, JWT).
- [x] Hoàn thiện Frontend (giao diện 2 khung, preview Reveal.js đồng bộ con trỏ).
- [x] Tích hợp AI sinh nội dung slide (Groq mặc định, DeepSeek tuỳ chọn).
- [x] Hồ sơ người dùng: avatar, email, username URL.
- [x] Trang quản trị: cấu hình AI Key, đổi mật khẩu, quản lý người dùng (tạo / đặt lại mật khẩu / đổi quyền / xóa, kèm số liệu từng user).
- [x] Gallery công khai: card thumbnail, lượt xem, thích, bình luận, trình xem hai khung.
- [x] Trang cá nhân `/<urlSlug>/` liệt kê bài của từng user.
- [x] Editor nâng cao: color picker, nhãn/thu gọn slide, tìm kiếm, snippets, linter section, chống mất dữ liệu.
- [x] Trang chủ giới thiệu + thống kê; Dashboard quản lý trình chiếu (publish/nháp/đổi tên/xoá/export, hoạt động reactions).
- [ ] Chế độ điều khiển từ xa (Remote control).
- [ ] Phục vụ slide đã publish từ domain riêng để cách ly origin.
