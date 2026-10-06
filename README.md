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
- Khi hoàn tất, nhấn **Publish** → file được xuất bản thành link trình chiếu công khai dạng:
  ```
  https://heyshow.pedu.vn/show/<username>/<ten-file>.html
  ```
  Đường dẫn cũ `https://heyshow.pedu.vn/<username>/<ten-file>.html` vẫn chạy y hệt để không làm hỏng những link đã chia sẻ — hai đường dẫn đi qua cùng một hàm phục vụ nên **đều nhận CSP sandbox như nhau**. Slide mới vẫn nên dùng `/show/` vì đó là đường dẫn ứng dụng tự sinh và là vùng riêng, không nằm lẫn với route của app (xem §9, §14).
- **Phân cấp tài khoản** từ thấp tới cao: `user` (tối đa 10 bài) → `designer` (20) → `master` (50) → `admin` (không giới hạn). Hạn mức tính theo **số tên bài khác nhau** mà tài khoản sở hữu (nháp hoặc đã publish đều tính một lần) và được báo ngay trên editor/dashboard để người dùng biết trước khi bấm sai.
- **Lịch sử phiên bản bản nháp**: mỗi lần lưu, nội dung cũ được cất lại, giữ **5 bản gần nhất**; xem và khôi phục từng bản từ dashboard.
- **Bình luận theo luồng (thread) kiểu Facebook**: mỗi bình luận có thể nhận trả lời, trả lời hiển thị thụt lề dưới bình luận gốc; người dùng giới hạn **một cấp trả lời** để mạch hội thoại không bị thắt nút. Tác giả sửa/xóa bình luận của mình; chủ bài và admin xóa được bình luận của người khác.
- **Gallery công khai** tại `/gallery` trưng bày mọi bài đã publish dưới dạng card (thumbnail, tác giả, lượt xem, lượt thích, bình luận) kèm ô tìm kiếm theo tên/tác giả; bấm vào card mở trình xem hai khung kiểu mạng xã hội.
- **Trang hướng dẫn** tại `/help`: 9 mục (Giới thiệu HeyShow, Slide Master, viết slide, các mẫu Table/Image/Shapes/Chart/SmartArt, công thức Toán KaTeX, Dashboard, Gallery, tính năng Design, liên hệ & đóng góp). Mỗi ví dụ có nút **Copy** và **preview Reveal.js thật** (lazy-load bằng IntersectionObserver để không nạp cùng lúc nhiều iframe).
- **Thư viện mẫu** tại `/templates`: 6 **mẫu bài trình chiếu** (giáo án 5 bước, chuyên đề Toán, hướng dẫn sử dụng, đố vui, báo cáo dự án GitHub, tiểu luận) và 6 **mẫu slide** (thống kê, đồ thị hàm số có tham số, trắc nghiệm, ghép đôi, điền khuyết, puzzle — tương tác bằng HTML/CSS thuần). Mẫu có preview Reveal.js, nút Copy code, và riêng mẫu cả bài có nút **“Dùng mẫu này”** tạo thẳng bản nháp trong `/design`.
- Trang quản trị riêng tại `/admin_panel`, chia 3 tab: **Users** (bảng liệt kê mọi tài khoản theo thứ tự mới nhất trước — Avatar thật, role kèm **hạn mức bài `đã dùng/tối đa`**, URL slug, số nháp / bài public / lượt xem / lượt thích / ngày tạo, nút ⋮ để đặt lại mật khẩu, **chuyển giữa cả 4 bậc quyền**, xóa — kèm form tạo user mới), **AI** (cấu hình API Key Groq / DeepSeek) và **Admin** (đổi mật khẩu admin). Nhãn quyền và con số hạn mức trong form lấy từ `GET /api/admin/users` chứ không hardcode trong HTML, nên đổi hạn mức trong `server/src/access.js` là giao diện tự đúng. Đặt lại mật khẩu, đổi quyền, xóa tài khoản kèm toàn bộ bài vở và số liệu của họ (chặn tự đổi quyền / tự xóa chính mình; xóa phải gõ lại đúng tên để xác nhận).

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
├── server/                        # Node.js Backend (chạy trên Fold 4)
│   ├── src/
│   │   ├── app.js                 # Mọi route Express + xác thực + phân quyền
│   │   ├── access.js              # Bậc quyền user/designer/master/admin + hạn mức bài
│   │   ├── storage.js             # Cache JSON + hàng đợi ghi nguyên tử (atomicWrite)
│   │   ├── history.js             # Lịch sử 5 phiên bản bản nháp
│   │   ├── avatars.js             # Ảnh đại diện ghi ra file, không nhúng vào db.json
│   │   ├── pptx.js                # Import .pptx (jszip + fast-xml-parser)
│   │   └── textimport.js          # Import Markdown / LaTeX beamer (JS thuần)
│   ├── test/
│   │   ├── api.test.js            # Test tích hợp toàn bộ bề mặt API
│   │   ├── units.test.js          # access / history / storage
│   │   ├── import.test.js         # pptx / markdown / beamer
│   │   └── helpers/server.js      # Khởi động server trên kho dữ liệu tạm
│   └── package.json
├── client/                        # Frontend (Vite + Vanilla JS, nhiều entry)
│   ├── index.html                 # Trang soạn thảo tại /design (entry "main")
│   ├── landing.html               # Trang chủ giới thiệu tại / (entry "landing")
│   ├── dashboard.html             # Trang quản lý trình chiếu tại /dashboard (entry "dashboard")
│   ├── admin.html                 # Trang quản trị (entry "admin")
│   ├── gallery.html               # Trang Gallery công khai (entry "gallery")
│   ├── profile.html               # Trang cá nhân tác giả
│   ├── help.html                  # Trang hướng dẫn sử dụng tại /help (entry "help")
│   ├── templates.html             # Trang thư viện mẫu tại /templates (entry "templates")
│   ├── src/
│   │   ├── api.js                 # Tầng API/auth DÙNG CHUNG: token, fetch, lỗi 401/403
│   │   ├── main.js dashboard.js gallery.js admin.js profile.js ...
│   │   └── color-picker.js slides.js reveal-preview.js  # tiện ích editor
│   ├── public/                    # favicon + logo (Vite sao chép thẳng vào dist)
│   ├── dist/                      # Bản build, server phục vụ trực tiếp (không commit)
│   └── package.json
├── data/                          # Dữ liệu người dùng (KHÔNG commit, KHÔNG rsync)
│   ├── db.json                    # Users + config (mật khẩu hash, AI key) — quyền 0600
│   ├── social.json                # Gallery: views / likes / comments / title
│   ├── .jwt-secret                # Secret JWT tự sinh, giữ token sống qua restart
│   └── users/
│       └── <username>/
│           ├── drafts/            # Code HTML thô (chỉ chứa thẻ <section>)
│           ├── published/         # File HTML hoàn chỉnh (đã bọc Reveal.js)
│           ├── history/           # <tên-file>.d/<millis>-<ngẫu nhiên>.html
│           └── avatar/            # <file>.<png|jpg|gif|webp>
├── scripts/
│   └── backup-data.sh             # Sao lưu data/ từ Fold 4 (hoặc --local), giữ N bản
├── cf_setup.js                    # Tạo/cập nhật Cloudflare Tunnel + DNS (chỉ nhận secret qua env)
├── sync2fold4.sh                  # (KHÔNG commit) test + build + rsync + pm2 reload + hỏi /health
├── sync2fold4.example.sh          # Bản mẫu của script trên, chứa placeholder thay vì địa chỉ thật
├── eslint.config.js               # ESLint flat config (no-undef = error)
├── package.json                   # "npm run lint" / "npm test" cho toàn repo
├── .editorconfig                  # Thụt lề thống nhất (4 space, LF)
├── .gitignore                     # loại trừ data/, .env, node_modules, dist, log, sync2fold4.sh
└── README.md
```

Repo `https://github.com/phucdhh/HeyShow` (**đang ở chế độ private**) — **không bao giờ** chứa `data/`, `.env`, `client/dist/`, `node_modules/` hay `sync2fold4.sh` (file này giữ địa chỉ SSH nội mạng của điện thoại). Người clone repo về dùng thì copy `sync2fold4.example.sh` thành `sync2fold4.sh` và điền thông tin máy của mình; `scripts/backup-data.sh` tự đọc lại ba giá trị `DEPLOY_*` đó.

## 4. Công nghệ sử dụng

- **Backend:** Node.js + Express 5, `jsonwebtoken` (JWT có `tv` — phiên bản token để thu hồi), `axios` (gọi Groq / DeepSeek), `jszip` + `fast-xml-parser` (import .pptx tại `server/src/pptx.js`), `dotenv`; module import .md/.tex tại `server/src/textimport.js` (JS thuần, không thêm dependency)
- **Frontend:** Vite (nhiều entry), CodeMirror 6 (editor), Reveal.js 5.1.0 + KaTeX (preview & trình chiếu, load từ CDN), `client/src/api.js` là tầng gọi API/auth dùng chung cho mọi trang
- **Kiểm tra chất lượng:** ESLint 9 flat config (`no-undef: error`, `eqeqeq: smart`) + `node --test` (bộ 51 test: API tích hợp, module, import) — chạy bằng `npm run lint` và `npm test` ở thư mục gốc
- **Lưu trữ:** file JSON + thư mục trên đĩa (không có database), có cache trong bộ nhớ và hàng đợi ghi nguyên tử
- **Quản lý tiến trình:** PM2 (giữ server luôn chạy trên Fold 4)
- **Kết nối mạng:** Cloudflare Tunnel (cloudflared)
- **Đồng bộ:** rsync qua SSH (port 8022 của Termux)

## 5. Workflow phát triển

1. Viết code và test trên máy Mac:
   ```bash
   cd client && npm run dev     # editor với hot reload
   cd server && npm run dev     # backend (nodemon)

   npm test                     # 51 test, chạy trên kho dữ liệu tạm (không đụng ./data)
   npm run lint                 # ESLint toàn repo
   ```
   Muốn test giao diện trên một kho dữ liệu riêng: `HEYSHOW_DATA_DIR=/tmp/du-lieu-thu node server/src/app.js`.
2. Deploy bằng `./sync2fold4.sh`. Script chạy theo thứ tự **test → build → rsync → `npm install --omit=dev` → `pm2 reload` → hỏi `/health`**, và dừng lại nếu một bước hỏng để không đưa code lỗi lên server. `data/`, `.env`, `node_modules` và `.git` nằm ngoài phạm vi rsync; **`client/dist/` thì được đưa lên** vì server phục vụ trực tiếp thư mục đó.
   Lần đầu (và mỗi lần clone repo từ GitHub về) tạo file deploy từ bản mẫu rồi điền địa chỉ máy — file thật bị gitignore nên không bao giờ bị commit:
   ```bash
   cp sync2fold4.example.sh sync2fold4.sh
   # sửa DEPLOY_USER / DEPLOY_HOST trong sync2fold4.sh, hoặc truyền lúc chạy:
   DEPLOY_HOST=<ip-cua-dien-thoai> DEPLOY_USER=<user-termux> ./sync2fold4.sh
   ```
   ```bash
   ./sync2fold4.sh --dry-run    # chỉ xem sẽ đồng bộ những gì, không ghi lên điện thoại
   ./sync2fold4.sh --skip-tests # deploy gấp
   ./sync2fold4.sh --no-build   # dùng bản dist/ có sẵn
   ```
3. Sao lưu dữ liệu người dùng (việc này **phải làm định kỳ** — toàn bộ tài khoản và bài vở chỉ nằm trong `data/` trên một chiếc điện thoại):
   ```bash
   ./scripts/backup-data.sh              # kéo data/ từ Fold 4 về ~/HeyShowBackups
   KEEP=30 ./scripts/backup-data.sh      # giữ 30 bản thay vì 14
   ./scripts/backup-data.sh --local      # sao lưu data/ trên máy phát triển
   ```
   Mỗi bản là một `.tar.gz` có timestamp, được kiểm tra `tar -tzf` trước khi tính là hợp lệ, bản cũ tự xóa khi vượt `KEEP`. Script in ra lệnh khôi phục ở cuối output.
   **Bản sao chứa hash mật khẩu và API key AI**, nên để ở đĩa ngoài dự án (mặc định `$HOME/HeyShowBackups`), đừng đặt trong thư mục Google Drive.
4. PM2 trên Fold 4 chạy backend Node.js phục vụ cả frontend đã build lẫn slide đã publish. Trạng thái server: `pm2 logs heyshow`, `pm2 status`, hoặc `GET /health` (báo uptime, số lượt xem và số bản ghi còn chờ ghi xuống đĩa).

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
| `HEYSHOW_DATA_DIR` | Không | `./data` | Kho dữ liệu; dùng khi muốn chạy thử / test trên thư mục tạm |
| `CORS_ORIGIN` | Không | `*` | Danh sách origin được phép, phân tách bằng dấu phẩy |
| `REGISTER_ENABLED` | Không | bật | Đặt `false` (hoặc `0/no/off/closed`) để khóa tự đăng ký, chỉ admin tạo tài khoản |
| `AI_MAX_PER_MINUTE` | Không | `8` | Số request sinh slide AI / phút / người dùng (key AI là tài sản chung, tránh một người gọi liên tục làm nghẽn và tốn tiền) |
| `WRITE_MAX_PER_MINUTE` | Không | `20` | Số request like/bình luận / phút / người dùng |
| `AI_TIMEOUT_MS` | Không | `45000` | Thời gian chờ Groq/DeepSeek trả lời |
| `CF_ACCOUNT_ID` | Có (khi chạy `cf_setup.js`) | — | Cloudflare Account ID |
| `CF_ZONE_ID` | Có (khi chạy `cf_setup.js`) | — | Zone ID của domain |
| `CF_API_TOKEN` | Có (khi chạy `cf_setup.js`) | — | API token Cloudflare |
| `CF_TUNNEL_NAME` | Không | `heyshow-fold4-tunnel` | Tên tunnel |
| `CF_DOMAIN` | Không | `heyshow.pedu.vn` | Domain trỏ về tunnel |

Server đọc `.env` trong thư mục `server/` nếu có (file này bị `.gitignore` và loại khỏi rsync).

## 7. Tài khoản, phân quyền & bảo mật

### Tài khoản và hạn mức

- **Lần khởi chạy đầu tiên**, server tự tạo tài khoản `admin` với **mật khẩu ngẫu nhiên** in ra console log. Hãy đăng nhập `/admin_panel` và đổi mật khẩu ngay. Nếu tài khoản `admin` vẫn mang mật khẩu mặc định công khai của bản cũ (`admin123`), server in cảnh báo `[CẢNH BÁO]` lúc khởi động.
- **Bốn bậc quyền** khai báo tập trung trong `server/src/access.js`: `user` 10 bài, `designer` 20, `master` 50, `admin` không giới hạn. Muốn đổi hạn mức chỉ sửa một chỗ này — dashboard, editor và trang quản trị đều lấy số từ API, không tự gõ lại.
- Tài khoản tự đăng ký luôn nhận bậc thấp nhất `user`; bậc cao hơn do admin gán.
- **Hạn mức tính theo số tên bài khác nhau** mà tài khoản sở hữu (một bài vừa có nháp vừa có bản publish chỉ tính 1). Hết hạn mức thì API trả `403` kèm thông báo nêu rõ bậc quyền, con số và cách xử lý (xóa bớt bài hoặc xin nâng quyền); editor và dashboard hiện `đã dùng/tối đa` ngay trên thanh công cụ để người dùng biết trước.
- **Không cho chiếm dụng route của hệ thống.** `RESERVED_SLUGS` (`api`, `admin_panel`, `assets`, `src`, `gallery`, `dashboard`, `design`, `help`, `templates`, `show`, `health`, `favicon.svg`, `icons.svg`) được so sánh **không phân biệt hoa/thường** trong `isValidUsername` / `isValidSlug` / `resolveSlugDir`, vì Express cũng khớp đường dẫn không phân biệt hoa/thường — so đúng hoa thường thì tài khoản `Gallery` vẫn che mất trang `/gallery`. Cuối file có chốt chặn lúc khởi động: thêm route cấp một mà quên khai báo tên dự phòng thì server báo lỗi ngay thay vì âm thầm hở.
- **Không hai tài khoản tranh một URL.** `nameTaken` chặn tên đăng nhập và slug mới theo ba kiểu so sánh, tất cả bỏ qua hoa/thường: đúng tên đăng nhập của người khác, đúng **tên thư mục trên đĩa** của người khác (`userDir` lọc ký tự nên tài khoản cũ `Minh Nhật Phan` sống trong `users/MinhNhtPhan`), và đúng **slug suy ra từ tên** (`defaultSlug` bỏ dấu chấm nên `minhnht.phan` cũng trỏ về `minhnhtphan`). Lý do: trên điện thoại hệ tệp phân biệt hoa/thường nên `Phuc` và `PHUC` tạo được hai thư mục êm xuôi, nhưng `/Phuc/ten-bai.html` chỉ mở được bài của một trong hai người — và một tài khoản trùng tên thư mục thì đọc/ghi được thẳng vào tệp của tài khoản kia.

### Mật khẩu

- Băm bằng **scrypt có salt** (định dạng `scrypt$<salt>$<hash>`), so sánh bằng `timingSafeEqual`. Hash SHA-256 không salt của bản cũ vẫn đăng nhập được và **tự nâng cấp** lên scrypt ở lần đăng nhập thành công kế tiếp — không ai bị khóa tài khoản khi nâng cấp.
- Tự đặt mật khẩu (đăng ký, đổi mật khẩu của mình): **tối thiểu 8 ký tự**. Mật khẩu do admin tạo/đặt lại cho học trò: tối thiểu 3 ký tự, vì người dùng cần một mật khẩu ngắn để gõ ở phòng máy.

### Token và thu hồi phiên đăng nhập

- JWT hết hạn sau 24h, ký bằng `data/.jwt-secret` (tự sinh, quyền 0600) nên token còn sống qua lần restart server.
- Mỗi tài khoản có `tokenVersion`; token mang claim `tv`. **Đổi mật khẩu của mình, admin đặt lại mật khẩu, admin đổi quyền, hoặc xóa tài khoản** sẽ tăng `tokenVersion` → mọi token cũ chết ngay, kể cả token đang dùng. Đổi mật khẩu vì vậy đá người dùng ra màn hình đăng nhập có chủ đích, và client báo rõ lý do.
- **Quy ước lỗi** để client phân biệt hai chuyện rất khác nhau:
  - `401` + `code: 'auth'` — phiên đăng nhập không còn dùng được (thiếu token, hết hạn, bị thu hồi, tài khoản không còn). Client xóa token và đưa về màn đăng nhập.
  - `403` — còn đăng nhập, nhưng bị từ chối vì quyền hạn (vượt hạn mức bài, không phải admin, không được gỡ bình luận). Client **giữ nguyên token**; nếu không, một lần bấm sai sẽ đá người dùng đang làm việc ra ngoài.
  - Sai mật khẩu khi đăng nhập trả `401` **không kèm** `code: 'auth'` — đó là chuyện đăng nhập thất bại, không phải hết phiên.

### Tầng lưu trữ

- `db.json` và `social.json` được đọc **một lần vào cache trong bộ nhớ**; mọi thay đổi áp dụng đồng bộ trên object đã cache (Node chạy mỗi callback trên một luồng nên không có xen kẽ), còn việc ghi đĩa được xếp hàng và gộp lại sau 250ms. Hai request like/view đồng thời không còn ghi đè mất dữ liệu như bản cũ.
- Ghi đĩa theo kiểu **file tạm + rename** (nguyên tử trên POSIX), quyền `0600`, không để lại `.tmp` và không hỏng file khi mất điện giữa chừng.
- Cache tự phát hiện file bị tiến trình khác ghi lên đĩa (rsync, script bảo trì) qua `mtime`/`size` và đọc lại bản mới.
- `db.json` **hỏng vẫn không làm sập API**: bản gốc được lưu sang `<file>.corrupt-<timestamp>` để cứu dữ liệu, server làm việc trên cấu trúc khởi tạo. JSON hợp lệ nhưng sai kiểu (mảng/chuỗi/null) cũng bị coi là hỏng — gán thuộc tính lên mảng rồi `JSON.stringify` sẽ âm thầm bỏ hết dữ liệu vừa ghi.
- Lượt xem gom trong RAM và ghi một lần mỗi 3 giây (một tiết học 40 em cùng mở link không còn tạo 40 lần ghi `social.json`).
- Avatar lưu thành **file riêng** trong `data/users/<user>/avatar/`, phục vụ qua `GET /api/avatar/:user`; db.json không còn chứa chuỗi base64 dài hàng MB. Server tự di chuyển avatar base64 cũ thành file ở lần khởi động.

### Giới hạn tần suất & header bảo mật

| Phạm vi | Mặc định | Lý do |
|---|---|---|
| Đăng nhập/đăng ký | 30 lần **thất bại** / 15 phút / IP | scrypt tốn CPU; lần đăng nhập thành công không bị đếm nên cả một lớp dùng chung IP trường vẫn không bị khóa |
| Sinh slide AI | 8 request / phút / user | API key là tài sản chung, một người gọi liên tục làm nghẽn và tốn tiền |
| Like / bình luận | 20 request / phút / user | chặn spam |
| Nội dung | nháp ≤ 2 MB, upload `.pptx` ≤ 10 MB, `.md`/`.tex` ≤ 5 MB, bình luận ≤ 2000 ký tự | `express.json({ limit: '5mb' })` |

- Mọi response mang `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` (gallery nhúng slide bằng iframe cùng origin nên không dùng `DENY`).
- **Slide đã publish phục vụ qua `/show/` mang CSP sandbox** — xem §9.
- Tên đăng nhập phải khớp `^[a-zA-Z0-9@._-]{3,64}$`, bị chặn `__proto__`/`constructor`/`prototype` (chống nhiễm prototype khi `Object.entries`), và không được chiếm slug hệ thống (`api`, `admin_panel`, `assets`, `show`, `gallery`, `dashboard`, `design`, `help`, `templates`...). Tên file đi vào URL được `path.basename` rồi kiểm tra `.`/`..`; tên file nháp phải khớp `^[\w@.\- ]{1,120}\.html$` và không chứa `..`.

### Việc cần làm sau khi nâng cấp bản vá

1. **Thu hồi (revoke) token Cloudflare cũ** từng bị hardcode trong `cf_setup.js` trên dashboard Cloudflare, rồi tạo token mới và truyền qua biến môi trường.
2. Nếu tài khoản `admin` trên Fold 4 vẫn đang dùng mật khẩu mặc định của bản cũ, server sẽ in cảnh báo `[CẢNH BÁO]` lúc khởi động — hãy đổi ngay.
3. Chạy một bản `./scripts/backup-data.sh` **trước** khi deploy, để có đường quay lại nếu cấu trúc dữ liệu đổi.

## 8. API

Mọi route `/api/*` (trừ auth, stats, gallery, profile, `/api/p/:user/:file`, avatar) yêu cầu header `Authorization: Bearer <token>`.

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/auth/login` | công khai | Đăng nhập, trả JWT (hạn 24h) + `me.{username, role, ...}` |
| POST | `/api/auth/register` | công khai | Tự đăng ký, luôn nhận role `user`; khóa bằng `REGISTER_ENABLED=false` |
| GET | `/api/user/profile` | user | username, urlSlug, **role**, fullName, email, phone, avatar, `quota` + `maxPresentations` |
| POST | `/api/user/profile` | user | Đổi urlSlug / fullName / email / phone / avatar / mật khẩu (mật khẩu ≥8 ký tự và **thu hồi mọi token cũ**) |
| GET | `/api/me/quota` | user | `{allowed, used, max}` hiện tại của chính mình |
| POST | `/api/me/password` | user | Đổi mật khẩu của mình (kể cả tài khoản không phải admin) |
| GET | `/api/files` | user | Danh sách bản nháp + `quota` |
| GET | `/api/files/:name` | user | Đọc nội dung nháp |
| POST | `/api/files/:name` | user | Tạo / lưu nháp (lưu lần hai trở đi sẽ cất nội dung cũ vào lịch sử). Chặn khi vượt hạn mức → `403` |
| DELETE | `/api/files/:name` | user | Xoá cả nháp lẫn bản đã publish + lịch sử phiên bản |
| POST | `/api/files/:name/publish` | user | Xuất bản, trả URL `/show/<slug>/<file>.html` |
| POST | `/api/files/:name/unpublish` | user | Gỡ bản publish, bài quay về nháp (giữ views/likes/comments) |
| POST | `/api/files/:name/rename` | user | Đổi tên file (nháp + bản publish + record gallery + lịch sử) |
| GET | `/api/files/:name/export` | user | Tải file HTML hoàn chỉnh chạy offline (`Content-Disposition: attachment`) |
| GET | `/api/files/:name/history` | user | `versions: [{name, at, size}]` (mới nhất trước) + `maxVersions` |
| GET | `/api/files/:name/history/:version` | user | Nội dung HTML của một bản lưu |
| POST | `/api/files/:name/history/:version/restore` | user | Khôi phục một bản: nội dung cũ được cất lại thành bản mới trước khi ghi đè |
| POST | `/api/import/pptx/analyze` | user | Nhận bytes thô file `.pptx` (≤10MB, `application/octet-stream`) → báo cáo: số slide, ảnh/video nhúng, bảng/biểu đồ/SmartArt không import được, ghi chú (server **không lưu file**, client gửi lại ở bước convert) |
| POST | `/api/import/pptx/convert?orig=<tên.pptx>` | user | Chuyển `.pptx` thành bản nháp HeyShow (title/bullets/notes giữ nguyên; ảnh/video → placeholder `<img src="">`/`<iframe src="">` kèm comment hướng dẫn link Google Drive / YouTube / Gan Jing World; bảng/biểu đồ/SmartArt → comment cảnh báo). Tự trùng tên thì thêm `-2`, `-3`. Cũng chịu hạn mức bài |
| POST | `/api/import/text/analyze` · `/api/import/text/convert` | user | Như trên cho Markdown `.md` và LaTeX beamer `.tex` (≤5MB), cùng định dạng report + draft |
| GET | `/api/dashboard` | user | `me` (kèm `role`), danh sách bài của tôi (views/likes/số bình luận **đang hiển thị**/số phiên bản/`url`), 20 hoạt động like-comment gần nhất (`isReply`), và `quota` |
| GET | `/api/stats` | công khai | Thống kê tổng: số bài publish, views, likes, comments, users |
| GET | `/api/ai/providers` | user | Nhà cung cấp AI đã cấu hình key (editor bật/tắt lựa chọn theo đây) |
| POST | `/api/ai/generate` | user | Sinh HTML slide bằng Groq hoặc DeepSeek (`provider` trong body) tại 1 trong 4 vị trí `mode` = `master`/`current`/`next`/`last`; giới hạn 8 request/phút/user |
| GET | `/api/gallery` | công khai (đã đăng nhập thì có `likedByMe`) | Bài đã publish, phân trang `?page=N` (12 bài/trang) + tìm kiếm `?q=` không phân biệt dấu; trả `page`, `totalPages`, `total` |
| GET | `/api/profile/:user` | công khai | Thông tin tác giả + danh sách bài đã publish của riêng user đó |
| GET | `/api/avatar/:user` | công khai | File ảnh đại diện (`Cache-Control: public, max-age=86400`), 404 nếu user chưa đặt ảnh |
| GET | `/api/p/:user/:file` | công khai | Chi tiết 1 bài + `comments` và `threads` (mỗi bình luận có `parentId`, `editedAt`, `deletedAt`) |
| POST | `/api/p/:user/:file/like` | user | Thích / bỏ thích (toggle) |
| POST | `/api/p/:user/:file/comments` | user | Thêm bình luận (≤2000 ký tự). Gửi kèm `parentId` để **trả lời trong thread**; chỉ nhận trả lời cấp 1 (bình luận đã là trả lời thì không trả lời tiếp), bình luận đã bị gỡ không trả lời được |
| PATCH | `/api/p/:user/:file/comments/:commentId` | user (tác giả) | Sửa bình luận của chính mình |
| DELETE | `/api/p/:user/:file/comments/:commentId` | user | Gỡ bình luận: **tác giả**, **chủ bài trình chiếu** hoặc **admin**. Bình luận bị gỡ đánh dấu `deletedAt` và giữ chỗ trong luồng để mạch trả lời không đứt |
| GET/POST | `/api/admin/config` | admin | Đọc / lưu API Key Groq & DeepSeek (`config.aiKeys`) |
| POST | `/api/admin/password` | admin | Đổi mật khẩu admin |
| GET | `/api/admin/users` | admin | `users[]`: role, slug, email, avatar, ngày tạo, số nháp/public/views/likes, **`presentations` / `maxPresentations` / `quotaReached`**; kèm `roles: [{name, label, maxPresentations}]` để giao diện vẽ nhãn quyền từ dữ liệu |
| POST | `/api/admin/users` | admin | Tạo tài khoản mới (`username`, `password`, `role` ∈ user/designer/master/admin) + thư mục drafts/published |
| POST | `/api/admin/users/:username/password` | admin | Đặt lại mật khẩu (thu hồi token của user đó) |
| POST | `/api/admin/users/:username/role` | admin | Đổi bậc quyền trong 4 bậc (chặn tự đổi quyền chính mình; đổi quyền làm thu hồi token) |
| DELETE | `/api/admin/users/:username` | admin | Xóa tài khoản + thư mục + số liệu gallery (chặn tự xóa) |
| GET | `/health` | công khai | Uptime, số lượt xem và số bản ghi còn chờ xuống đĩa — script deploy dùng để xác nhận server sống |
| GET | `/admin_panel` | công khai | Trang quản trị (nội dung bên trong chỉ hiện với role `admin`) |
| GET | `/` | công khai | Trang chủ giới thiệu HeyShow + thống kê |
| GET | `/design` | công khai | Trang biên tập slide (editor); `?file=<tên>` mở thẳng một file, `?redirect=<đường dẫn>` quay lại sau đăng nhập |
| GET | `/dashboard` | công khai | Trang quản lý trình chiếu của user (chưa đăng nhập sẽ được dẫn về màn đăng nhập rồi quay lại) |
| GET | `/gallery` | công khai | Trang Gallery |
| GET | `/help` | công khai | Trang hướng dẫn sử dụng HeyShow (9 mục, ví dụ code kèm preview Reveal.js) |
| GET | `/templates` | công khai | Thư viện 12 mẫu bài/slide, preview Reveal.js + nút "Dùng mẫu này" tạo bản nháp |
| GET | `/show/<slug>/` · `/<slug>/` | công khai | Trang cá nhân của user (các bài đã publish) |
| GET | `/show/<slug>/<file>.html` | công khai | **Slide đã publish, có CSP sandbox** (đường dẫn chính) |
| GET | `/<slug>/<file>.html` | công khai | Slide đã publish, cùng CSP sandbox — chỉ để tương thích link cũ |

Quy chuẩn dữ liệu hồ sơ: `fullName` ≤ 80 ký tự; `phone` chỉ nhận chữ số và `+ - . ( )` cách trắng, ≤ 20 ký tự; `urlSlug` khớp `^[a-zA-Z0-9_-]{3,40}$` và không trùng slug hệ thống.

## 9. Cách hoạt động của slide

- **Bản nháp** chỉ chứa các thẻ `<section>` (và `<section-master>`), không cần `<html>`, `<head>`.
- **`<section-master>`**: nội dung bên trong thẻ này được gỡ ra và chèn vào đầu **mỗi slide lá** (section không chứa section con) khi render. Dùng để đặt header/footer/nền chung cho toàn bài.
- **Publish**: server bọc nội dung nháp vào template HTML đầy đủ (Reveal.js + theme black + plugin KaTeX cho công thức toán) và ghi vào `published/`.
- **CSS của bài viết không được phép làm mất slide.** Bài do AI sinh hay người dùng tự tô màu thường ghi `.reveal .slides section { display:flex !important }`; `!important` đó thắng quy tắc "ẩn slide chưa tới" của Reveal nên mọi slide cùng hiện và chồng lên nhau — trên điện thoại vuốt tới/vuốt lui chỉ đổi class chứ không đổi hình. Cả ba bản template (`buildFullHtml` của server, `previewHtml` trong Help/Templates, preview của editor) cùng chèn một rule ẩn lại `section:not(.present)`, loại trừ chế độ tổng quan (`.overview`) và in/PDF (`html.reveal-print`) để hai chế độ đó vẫn hiển thị đủ mọi slide.
- **Cô lập origin khi trình chiếu**: đường dẫn chính là `/show/<slug>/<file>.html`. Mọi file HTML đi qua ngả này được gắn:
  ```
  Content-Security-Policy: sandbox allow-scripts allow-forms allow-popups allow-modals
  Cache-Control: no-cache          # republish có hiệu lực ngay, không chờ hết cache
  ```
  Chỉ định `sandbox` của CSP đưa trang slide vào **opaque origin**: script của người dùng trong slide không đọc được `localStorage`, cookie hay gọi API của HeyShow bằng token đang nằm trong `localStorage` của editor, dù tất cả chạy trên cùng `heyshow.pedu.vn`. Vì vậy **không cần tạo tên miền con riêng** (`slides.pedu.vn`) như dự tính ban đầu. Route `/<slug>/<file>.html` cũ vẫn phục vụ cho những link đã chia sẻ và nhận đúng bộ header này, vì cả hai đường dẫn cùng gọi `servePublishedSlide` (`server/src/app.js`).
  Giá phải trả của origin mờ: mọi lần chạm vào `window.sessionStorage` đều ném `SecurityError`, và Reveal 5.1 gọi đúng chỗ đó mỗi lần chuyển slide (`store/restoreScrollPosition`) — hệ quả là trên điện thoại **vuốt tới/vuốt lui chết hẳn**, chỉ mở được slide đầu. Bản publish vì thế có sẵn `SLIDE_STORAGE_SHIM` (`server/src/app.js`, nạp trước script Reveal.js): thử đọc `sessionStorage`, nếu bị chặn thì thay bằng bộ nhớ trong. **Không** dùng cách thêm `allow-same-origin` vào CSP — làm vậy là trả lại origin thật cho HTML người dùng tự viết, tức là phát cho họ chìa khóa `localStorage` chứa token của editor. Hai preview của client không cần shim vì iframe của chúng cùng origin (document.write / srcdoc không sandbox).
- **Lịch sử phiên bản bản nháp** (`server/src/history.js`): khi đã có nội dung trên đĩa mà người dùng lưu đè, bản cũ được chép vào `data/users/<loginId>/history/<tên-file>.d/<millis>-<ngẫu nhiên>.html` và **giữ 5 bản gần nhất** (bản thứ 6 tự xóa bản cũ nhất). Khôi phục một bản cũng cất bản hiện hành trước khi ghi đè, nên bấm nhầm không mất bài. Tên thư mục lịch sử đã làm sạch ký tự nên không thoát được khỏi thư mục user.
- **Preview**: editor dựng lại đúng template đó trong một iframe, debounce 500ms khi gõ và 50ms khi chỉ di chuyển con trỏ; khi chỉ đổi vị trí con trỏ thì gọi `Reveal.slide(h, v)` thay vì tải lại iframe.

## 10. Tính năng editor

Trang soạn thảo (`client/index.html` + `client/src/main.js`) dùng CodeMirror 6, ngoài gõ/sửa HTML còn có:

- **Một tầng gọi API chung** (`client/src/api.js`): editor, dashboard, gallery, trang cá nhân và admin đều dùng chung **một token** và một cách xử lý lỗi — `401 + code:'auth'` thì xóa token và đưa về màn đăng nhập, `403` thì chỉ báo lỗi còn người dùng vẫn đang đăng nhập. Trước đây mỗi trang tự đọc `localStorage` với ba tên key khác nhau nên đăng nhập ở editor vẫn phải đăng nhập lại ở dashboard.
- **Nhãn hạn mức bài** (`#quota-badge` trên thanh tiêu đề): hiển thị `đã dùng/tối đa` của bậc quyền hiện tại, chuyển màu cảnh báo khi còn ≤ 2 bài; hết hạn mức thì báo ngay bằng thông báo của server thay vì để người dùng bấm lưu rồi mới biết.
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
- **Dashboard — phần mới của bản nâng cấp**:
  - Header hiện **nhãn bậc quyền** (`user`/`designer`/`master`/`admin`) bên cạnh tên, và dưới hàng tab là dòng **hạn mức** `đã dùng/tối đa bài trình chiếu`, đổi màu khi sắp hết và nêu cách xử lý khi đã đầy.
  - **Lịch sử phiên bản**: mỗi bài có bản nháp hiện số phiên bản (`🕘 3 phiên bản`) trong danh sách, và menu ⋮ có **🕘 Lịch sử phiên bản**. Modal liệt kê 5 bản lưu gần nhất theo thứ tự mới nhất trước (bản đầu ghi "Bản lưu gần nhất", các bản sau ghi "Cách đây …" và dung lượng), xem thử nội dung từng bản và **Khôi phục** bản muốn quay lại; nội dung đang có được cất thành bản mới trước khi ghi đè nên khôi phục nhầm vẫn hoàn tác được.
  - **Kiểm duyệt bình luận**: tab Presentations và Activities dẫn tới cùng một luồng bình luận, nơi nút Gỡ hiện cho đúng người — tác giả bình luận, chủ bài trình chiếu và admin (xem quy tắc ở §8).
  - Số bình luận hiển thị cho mỗi bài là số **đang hiển thị**; bình luận đã gỡ không còn được đếm.
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
- **Bình luận theo thread kiểu Facebook**: mỗi bình luận có nút **Trả lời**; câu trả lời hiển thị thụt lề ngay dưới bình luận được trả lời và tự điền tên người được trả lời vào ô nhập. Giới hạn **một cấp trả lời** (không trả lời vào một trả lời) để mạch hội thoại không bị thắt nút trên màn hình dọc. Server lưu `parentId` trong chính danh sách bình luận nên thread giữ nguyên thứ tự thời gian.
- **Sửa / gỡ bình luận**: tác giả thấy nút "Sửa" dưới bình luận của mình, sửa inline rồi lưu qua `PATCH /api/p/:user/:file/comments/:commentId`; người khác gọi vào nhận `403`. Bình luận đã sửa gắn nhãn "đã sửa" (`editedAt`). Nút **Gỡ** hiện với ba đối tượng: tác giả bình luận, **chủ bài trình chiếu** (dọn rác trên bài của mình) và **admin** (dọn trên mọi bài). Bình luận bị gỡ đánh dấu `deletedAt` rồi giữ chỗ trong thread, nên câu trả lời của người khác không bị mồ côi; client hiển thị ô "Bình luận đã được gỡ" tại chỗ đó và không đếm vào tổng số.
- **Toán học trong bình luận và trong thread**: cùng một bộ renderer KaTeX áp cho cả bình luận gốc lẫn trả lời (công thức `$...$`, `$$...$$`, `\(...\)`, `\[...\]`). Khi đang gõ, rê chuột lên một công thức **đã đóng cặp dấu** sẽ hiện tooltip live-preview render bằng KaTeX — dùng một bản "mirror" của ô nhập (cùng font/bề rộng/xuống dòng) để suy ra công thức nằm dưới con trỏ chuột.
- **Đếm lượt xem:** chỉ cộng khi mở trang slide thật (`/show/<slug>/<file>.html` hoặc đường dẫn cũ `/<slug>/<file>.html`); các lượt tải thumbnail `?embed=1`, request `?print-pdf` và request không phải GET bị bỏ qua. Tên file lấy từ `req.path` được `decodeURIComponent` trước khi khớp với file trên đĩa, nên tên tiếng Việt / có dấu cách vẫn đếm đúng. Lượt xem gom trong RAM và ghi xuống `social.json` một lần mỗi 3 giây.
- **Dữ liệu:** lưu riêng trong `data/social.json`, key ổn định `<loginId>/<tenFile>.html` (không đổi khi user đổi urlSlug). Mỗi record gồm `title` (lấy từ heading đầu tiên của slide, fallback về tên file), `createdAt`, `views`, `likes[]`, `comments[]` (mỗi comment có `id`, `author`, `text`, `createdAt`, `editedAt`, `parentId`, `deletedAt`). Xoá bài sẽ dọn luôn record tương ứng; xoá tài khoản dọn cả thư mục lẫn số liệu gallery.

## 13. Trang cá nhân (Profile)

Mỗi user có một trang công khai tại **`/<urlSlug>/`** (ví dụ `https://heyshow.pedu.vn/ndmphuc/`) liệt kê các bài trình chiếu đã publish của riêng họ (`client/profile.html` + `client/src/profile.js`).

- **Route:** `app.use('/:slug')` và `app.use('/show/:slug')` phục vụ `profile.html` khi đường dẫn là `/<slug>`, `/show/<slug>/` (không có tên file); khi có `/<slug>/<file>.html` thì vẫn phục vụ slide như cũ. Slug chấp nhận cả `urlSlug` lẫn `loginId`.
- **Dữ liệu:** `GET /api/profile/:user` (công khai) trả về `author` (username, urlSlug, avatar) và `items` là các bài đã publish của user đó — cùng shape với `/api/gallery` (title, url, views, likes, likedByMe, commentCount), sắp xếp theo `updatedAt` giảm dần. User không tồn tại → 404.
- **Giao diện:** banner tác giả (avatar + tên + số bài) và lưới card giống Gallery (thumbnail iframe `?embed=1`, tiêu đề, ngày, views/likes/comments). Bấm card mở bài trong viewer của Gallery (`/gallery#/p/<user>/<file>`) để giữ nguyên luồng thích/bình luận.
- **Điều hướng tới trang cá nhân:** trong Gallery, bấm vào **tên hoặc avatar** tác giả (trên card, trong header của viewer và trong từng bình luận) sẽ đi tới `/<urlSlug>/`. Trên card, link tác giả `stopPropagation` để không kích hoạt mở viewer.

## 14. Hạn chế đã biết

- **Hai đường dẫn cùng một vùng chứa.** `/show/<slug>/<file>.html` và `/<slug>/<file>.html` đi qua cùng `servePublishedSlide` nên cùng nhận CSP sandbox — link ngắn không kém an toàn hơn. Cái `/show/` mang lại là **tách namespace**: nội dung người dùng nằm ở một nhánh riêng, không lẫn với `/design`, `/gallery`, `/api`, `/assets`, nên không phải dựa vào danh sách `RESERVED_SLUGS` mỗi lần thêm route mới, và về sau có thể siết thêm (COOP/COEP, tên miền riêng không cookie) chỉ trên một mount duy nhất. Muốn hợp nhất link thì 301 route cũ sang `/show/` rồi bỏ route cũ.
- **Slide là HTML/JS người dùng tự viết.** Sandbox cách ly khỏi dữ liệu của HeyShow nhưng không ngăn được nội dung độc hại *bên trong* slide (script tự chạy, link lừa đảo); bài publish là công khai nên vẫn cần kiểm duyệt bằng tay (admin gỡ bình luận, gỡ bài).
- **Toàn bộ dữ liệu nằm trên một chiếc điện thoại**, không có database và không có bản sao tự động. `./scripts/backup-data.sh` mới là lệnh chạy tay — nên đặt vào cron/Shortcuts tự động trước khi có nhiều người dùng.
- **Giới hạn tần suất đếm trong RAM của một tiến trình**: khởi động lại server là bộ đếm về 0, và nếu PM2 chạy nhiều instance thì mỗi instance đếm riêng. Đủ cho quy mô một trường, chưa đủ để chống tấn công trải đều.
- **Import `.pptx` không lấy được media nhúng**: ảnh/video nằm trong file zip chỉ tạo được placeholder `<img src="">`/`<iframe src="">` kèm hướng dẫn tải lên Google Drive / YouTube; bảng, biểu đồ, SmartArt không chuyển được (server báo rõ số lượng để người dùng biết chỗ nào phải làm lại).
- **Reveal.js 5.1.0 và KaTeX nạp từ CDN**, nên trình chiếu offline hoặc mạng trường chặn CDN sẽ mất hiệu ứng; bản `export` cũng dùng CDN. Muốn offline thật phải đóng gói thư viện vào file xuất.
- **scrypt tốn CPU** — trên điện thoại mỗi lần đăng nhập/đổi mật khẩu mất đáng kể thời gian. Đây là đánh đổi có chủ đích (đừng giảm `N` xuống để đổi lấy tốc độ); đăng nhập hàng loạt cùng lúc (cả lớp 40 em) có thể chậm.
- **Lượt xem đếm theo request**, không theo người truy cập riêng, và một người bấm F5 nhiều lần vẫn tính nhiều lượt.
- **Trang cá nhân/gallery render nhiều iframe thumbnail** cho card; đã lazy-load nhưng vẫn nặng trên máy yếu.

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
- [x] Import `.pptx`, Markdown và LaTeX beamer thành bản nháp.
- [x] **Phân cấp 4 bậc quyền + hạn mức bài** (user/designer/master/admin), báo hạn mức ngay trên editor và dashboard.
- [x] **Lịch sử 5 phiên bản bản nháp** kèm xem thử và khôi phục.
- [x] **Bình luận trả lời theo thread** + kiểm duyệt (tác giả / chủ bài / admin gỡ).
- [x] **Phục vụ slide qua `/show/` có CSP sandbox** — cách ly origin mà không cần tên miền con riêng.
- [x] **Tầng lưu trữ an toàn**: cache + hàng đợi ghi nguyên tử, chống mất dữ liệu khi hỏng `db.json`, gom lượt xem.
- [x] **Thu hồi token khi đổi mật khẩu/đổi quyền** và quy ước lỗi `401 code:'auth'` vs `403` rõ ràng cho client.
- [x] Avatar ra file riêng, không nhúng base64 vào db.json.
- [x] Một token + một tầng API chung (`client/src/api.js`) cho mọi trang.
- [x] Giới hạn tần suất cho AI và like/comment, security headers toàn cục.
- [x] Bộ test (`node --test`, 51 test) + ESLint chạy được bằng `npm test` / `npm run lint`.
- [x] Script deploy có kiểm tra `/health` và script sao lưu `data/`.
- [ ] Chế độ điều khiển từ xa (Remote control).
- [ ] Backup tự động có lịch (cron trên Mac hoặc Termux) + một bản copy off-device.
- [ ] 301 đường dẫn cũ `/<slug>/<file>.html` sang `/show/...` cho link hội tụ về một dạng, kiểm thử lại rồi bỏ route cũ.
- [ ] Đóng gói Reveal.js/KaTeX vào bản export để trình chiếu offline thật sự.
