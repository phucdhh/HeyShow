// Trang Templates: thư viện mẫu sẵn (bài trình chiếu + slide đơn lẻ)
// Mỗi mẫu là code HeyShow thô, xem được preview thật và tạo bản nháp chỉ với một bấm.
import { previewHtml } from './reveal-preview.js';

const DECKS = [
    {
        id: 'giao-an',
        fileName: 'giao-an-dinh-ly-pythagore.html',
        title: 'Giáo án — Định lý Pythagore (Toán 8, tiết 3)',
        desc: 'Bài học 5 bước: Mở đầu · Hình thành kiến thức · Luyện tập · Vận dụng & mở rộng · Củng cố bài học.',
        note: 'Thay tên giáo viên, trường và nội dung bài học của bạn; cấu trúc 5 bước giữ nguyên cho mọi môn.',
        code: String.raw`<section-master>
  <style>
    .reveal .slides section { background:#10233a; border-radius:14px; padding:28px; }
    .reveal h1, .reveal h2, .reveal h3, .reveal h4 { color:#ffd479; }
    .giai-doan { display:inline-block; background:#f59e0b; color:#111111;
                 padding:4px 16px; border-radius:999px; font-size:0.45em;
                 font-weight:bold; margin-bottom:14px; }
    .reveal .muc-tieu { font-size:0.62em; text-align:left; max-width:720px; margin:0 auto; }
    .reveal .tinh-huat { font-size:0.65em; font-style:italic; color:#cfe3ff; }
  </style>
  <header style="position:absolute; top:10px; left:20px; font-size:0.36em; color:#8fa8c4;">
    Giáo án Toán 8 · Tiết 3
  </header>
  <footer style="position:absolute; bottom:10px; right:20px; font-size:0.34em; color:#8fa8c4;">
    GV: Nguyễn Văn A · Trường THCS ...
  </footer>
</section-master>

<section>
  <h1>ĐỊNH LÝ PYTHAGORE</h1>
  <p style="font-size:0.6em;">Hình học 8 — Quan hệ giữa ba cạnh của tam giác vuông</p>
</section>

<section>
  <span class="giai-doan">MỤC TIÊU</span>
  <ul class="muc-tieu">
    <li class="fragment">Phát biểu được định lý Pythagore.</li>
    <li class="fragment">Tính độ dài cạnh huyền / cạnh góc vuông của tam giác vuông.</li>
    <li class="fragment">Nhận biết một bộ ba độ dài là tam giác vuông.</li>
    <li class="fragment">Vận dụng vào tình huống thực tế (chiếc thang, màn hình tivi).</li>
  </ul>
</section>

<section data-background-color="#0c1c30">
  <span class="giai-doan">BƯỚC 1 · MỞ ĐẦU</span>
  <h2>Tình huống khởi động</h2>
  <p class="tinh-huat">“Một chiếc thang dài 2,5 m tựa vào tường, chân thang cách tường 0,7 m. Hỏi đầu thang chạm tường ở độ cao bao nhiêu?”</p>
  <p class="fragment" style="font-size:0.55em;">Lời giải sẽ xuất hiện sau khi ta học xong định lý hôm nay 👀</p>
</section>

<section>
  <span class="giai-doan">BƯỚC 2 · HÌNH THÀNH KIẾN THỨC</span>
  <h2>Định lý Pythagore</h2>
  <p style="font-size:0.7em;">Trong tam giác vuông, bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông:</p>
  <p>$$a^2 + b^2 = c^2$$</p>
  <p class="fragment" style="font-size:0.55em;">Ngược lại: nếu một tam giác có $a^2 + b^2 = c^2$ thì tam giác đó <b>vuông</b> (định lý đảo).</p>
</section>

<section>
  <span class="giai-doan">BƯỚC 3 · LUYỆN TẬP</span>
  <h2>Cùng tính nhanh</h2>
  <ul style="font-size:0.65em; text-align:left; max-width:640px; margin:0 auto;">
    <li>C1: Hai cạnh góc vuông 3 cm và 4 cm. Cạnh huyền = ?</li>
    <li class="fragment" style="color:#a6e3a1;">→ $c = \sqrt{3^2 + 4^2} = 5$ cm</li>
    <li style="margin-top:14px;">C2: Cạnh huyền 13 m, một cạnh góc vuông 5 m. Cạnh còn lại = ?</li>
    <li class="fragment" style="color:#a6e3a1;">→ $b = \sqrt{13^2 - 5^2} = 12$ m</li>
  </ul>
</section>

<section>
  <span class="giai-doan">BƯỚC 4 · VẬN DỤNG &amp; MỞ RỘNG</span>
  <h2>Quay lại chiếc thang</h2>
  <p style="font-size:0.65em;">Chiều cao đầu thang: $h = \sqrt{2{,}5^2 - 0{,}7^2} = \sqrt{6{,}25 - 0{,}49} \approx 2{,}4$ m</p>
  <p class="fragment" style="font-size:0.55em;">Mở rộng: đo màn hình tivi 16:9 — đường chéo 55 inch nghĩa là gì?</p>
</section>

<section data-background-gradient="linear-gradient(135deg, #123, #0c1c30)">
  <span class="giai-doan">BƯỚC 5 · CỦNG CỐ BÀI HỌC</span>
  <h2>Cần nhớ</h2>
  <ul style="font-size:0.65em; text-align:left; max-width:640px; margin:0 auto;">
    <li class="fragment">Chỉ dùng cho <b>tam giác vuông</b>.</li>
    <li class="fragment">$c$ luôn là cạnh huyền (cạnh lớn nhất, đối diện góc vuông).</li>
    <li class="fragment">Bài tập về nhà: sách giáo khoa trang 91, bài 56–58.</li>
  </ul>
</section>`
    },

    {
        id: 'chuyen-de',
        fileName: 'chuyen-de-bat-dang-thuc-am-gm.html',
        title: 'Chuyên đề — Bất đẳng thức AM–GM và ứng dụng (Toán 10)',
        desc: 'Trình bày một chuyên đề bồi dưỡng: tổng quan → lý thuyết → ví dụ có lời giải từng bước → bài tập → kết luận.',
        note: 'Thay chuyên đề khác bằng cách sửa tiêu đề và nội dung; giữ nguyên khung “lý thuyết + ví dụ dần từng bước”.',
        code: String.raw`<section-master>
  <style>
    .reveal .slides section { background:#1c1230; border-radius:14px; padding:28px; }
    .reveal h1, .reveal h2, .reveal h3 { color:#c4b5fd; }
    .chu-de { display:inline-block; border:2px solid #a78bfa; border-radius:8px;
              padding:2px 14px; font-size:0.42em; color:#a78bfa; margin-bottom:12px; }
    .reveal .loigiai { font-size:0.58em; text-align:left; max-width:740px; margin:10px auto 0; }
  </style>
</section-master>

<section>
  <h1>CHUYÊN ĐỀ</h1>
  <h2>BẤT ĐẲNG THỨC AM–GM<br>VÀ ỨNG DỤNG</h2>
  <p style="font-size:0.55em; color:#9ca3af;">Bồi dưỡng học sinh Toán 10 · 3 tiết</p>
</section>

<section>
  <span class="chu-de">TỔNG QUAN</span>
  <h2>Chuyên đề gồm 4 phần</h2>
  <div style="display:flex; gap:14px; justify-content:center; font-size:0.5em;">
    <div style="flex:1; background:#2e1f47; border-radius:10px; padding:14px;">1. Lý thuyết cốt lõi</div>
    <div style="flex:1; background:#2e1f47; border-radius:10px; padding:14px;">2. Kỹ thuật vận dụng</div>
    <div style="flex:1; background:#2e1f47; border-radius:10px; padding:14px;">3. Ví dụ minh hoạ</div>
    <div style="flex:1; background:#2e1f47; border-radius:10px; padding:14px;">4. Bài tập tự luyện</div>
  </div>
</section>

<section>
  <span class="chu-de">PHẦN 1 · LÝ THUYẾT</span>
  <h2>Bất đẳng thức AM–GM</h2>
  <p>Với mọi $a, b \ge 0$: trung bình cộng ≥ trung bình nhân</p>
  <p>$$\frac{a + b}{2} \ge \sqrt{ab}$$</p>
  <p class="fragment" style="font-size:0.55em;">Dấu "=" xảy ra khi và chỉ khi $a = b$. Mở rộng cho $n$ số dương.</p>
</section>

<section>
  <span class="chu-de">PHẦN 3 · VÍ DỤ</span>
  <h2>Ví dụ 1 — Tìm giá trị nhỏ nhất</h2>
  <p style="font-size:0.7em;">Cho $x > 0$. Tìm GTNN của $f(x) = x + \dfrac{4}{x}$.</p>
  <div class="loigiai">
    <p class="fragment">Áp dụng AM–GM: $x + \dfrac{4}{x} \ge 2\sqrt{x \cdot \dfrac{4}{x}} = 4$.</p>
    <p class="fragment">Dấu "=" khi $x = \dfrac{4}{x} \Leftrightarrow x = 2$ (thỏa $x>0$).</p>
    <p class="fragment" style="color:#a6e3a1;">Kết luận: $\min f = 4$ đạt tại $x = 2$. ∎</p>
  </div>
</section>

<section>
  <span class="chu-de">PHẦN 2 · KỸ THUẬT</span>
  <h2>Bí quyết "điểm rơi"</h2>
  <ul style="font-size:0.6em; text-align:left; max-width:700px; margin:0 auto;">
    <li class="fragment">Chọn cặp số AM–GM sao cho dấu "=" xảy ra <b>trong miền bài toán</b>.</li>
    <li class="fragment">Tổng cố định → tìm GTLN của tích; tích cố định → tìm GTNN của tổng.</li>
    <li class="fragment">Tách số hạng để cân bằng điều kiện bằng dấu "=".</li>
  </ul>
</section>

<section>
  <span class="chu-de">PHẦN 4 · LUYỆN TẬP</span>
  <h2>Bài tập tự luyện</h2>
  <ol style="font-size:0.6em; text-align:left; max-width:700px; margin:0 auto;">
    <li>Cho $a, b > 0$, $a + b = 5$. Tìm GTLN của $ab$.</li>
    <li>Cho $x > 1$. Tìm GTNN của $x + \dfrac{9}{x - 1}$.</li>
    <li>Chứng minh: với mọi $a, b, c > 0$, $\dfrac{a}{b} + \dfrac{b}{c} + \dfrac{c}{a} \ge 3$.</li>
  </ol>
</section>

<section data-background-gradient="linear-gradient(135deg, #2e1f47, #1c1230)">
  <h2>Kết luận &amp; tài liệu</h2>
  <p style="font-size:0.6em;">AM–GM là "công cụ đa năng" cho lớp bài toán cực trị — luyện thêm với các chuyên đề tiếp theo.</p>
  <p style="font-size:0.5em; color:#9ca3af;">Tài liệu: Chuyên đề bồi dưỡng Toán 10 · Đề kiểm tra cuối chuyên đề trên HeyShow Gallery.</p>
</section>`
    },

    {
        id: 'huong-dan',
        fileName: 'huong-dan-su-dung-heyshow.html',
        title: 'Hướng dẫn sử dụng — Tạo bài trình chiếu với HeyShow',
        desc: 'Mẫu "làm theo từng bước": giới thiệu → chuẩn bị → 3 bước thực hiện → tính năng nâng cao → mẹo & phím tắt.',
        note: 'Bản thân mẫu này hướng dẫn dùng HeyShow — đổi tên phần mềm và các bước để làm hướng dẫn cho sản phẩm khác.',
        code: String.raw`<section-master>
  <style>
    .reveal .slides section { background:#fdf6e3; color:#1f2937; border-radius:14px; padding:28px; }
    .reveal h1, .reveal h2, .reveal h3 { color:#b45309; }
    .reveal a { color:#d97706; }
    .nuoc { display:inline-block; background:#f59e0b; color:#111111; width:38px; height:38px;
            border-radius:50%; font-weight:bold; font-size:0.5em;
            line-height:38px; text-align:center; margin-bottom:8px; }
    .reveal pre { background:#1c1917; color:#f5f5f4; border-radius:10px;
                  font-size:0.5em; text-align:left; }
  </style>
</section-master>

<section>
  <h1>HƯỚNG DẪN SỬ DỤNG</h1>
  <h2>HeyShow — từ ý tưởng đến bài trình chiếu</h2>
  <p style="font-size:0.55em; color:#6b7280;">Dành cho người mới bắt đầu · 5 phút</p>
</section>

<section>
  <h2>HeyShow là gì?</h2>
  <ul style="font-size:0.65em; text-align:left; max-width:680px; margin:0 auto;">
    <li class="fragment">Soạn bài trình chiếu bằng HTML, xem trước <b>ngay bên cạnh</b> khi gõ.</li>
    <li class="fragment">Có <b>AI trợ giúp</b> sinh slide và thiết lập chung theo yêu cầu tiếng Việt.</li>
    <li class="fragment">Xuất bản thành <b>đường link chia sẻ</b>, bài đăng lên Gallery cộng đồng.</li>
  </ul>
</section>

<section>
  <span class="nuoc">0</span>
  <h2>Chuẩn bị</h2>
  <p style="font-size:0.65em;">Truy cập <a href="https://heyshow.pedu.vn/">heyshow.pedu.vn</a> → bấm <b>Design</b> → đăng ký tài khoản (chưa có tài khoản thì bỏ qua slide này và thay bằng bước cài đặt của phần mềm của bạn).</p>
</section>

<section>
  <span class="nuoc">1</span>
  <h2>Tạo file và soạn nội dung</h2>
  <p style="font-size:0.6em;">Nhập tên file → bấm <b>Tạo mới</b>. Mỗi slide là một thẻ <code>&lt;section&gt;</code>:</p>
  <pre><code data-trim>&lt;section&gt;
  &lt;h2&gt;Chào mừng&lt;/h2&gt;
  &lt;p&gt;Nội dung slide của bạn&lt;/p&gt;
&lt;/section&gt;</code></pre>
</section>

<section>
  <span class="nuoc">2</span>
  <h2>Tăng tốc với AI</h2>
  <ul style="font-size:0.6em; text-align:left; max-width:680px; margin:0 auto;">
    <li>Bấm nút ✨ mở khung chat, mô tả yêu cầu bằng tiếng Việt.</li>
    <li class="fragment">Chọn vị trí chèn: <b>Slide Master</b> (thiết lập chung), <b>slide tiếp theo</b>…</li>
    <li class="fragment">Gõ <code>section</code> rồi <code>Ctrl+Space</code> để chèn khung slide sẵn.</li>
  </ul>
</section>

<section>
  <span class="nuoc">3</span>
  <h2>Lưu &amp; xuất bản</h2>
  <p style="font-size:0.65em;"><code>Ctrl/Cmd + S</code> để lưu nháp · Bấm <b>Publish</b> để nhận đường dẫn công khai · Quản lý bài viết tại <b>Dashboard</b>.</p>
  <p class="fragment" style="font-size:0.55em; color:#6b7280;">Bài đã publish xuất hiện trong Gallery — bạn bè có thể xem, thích và bình luận.</p>
</section>

<section data-background-gradient="linear-gradient(135deg, #fff7ed, #fef3c7)">
  <h2>Mẹo &amp; phím tắt</h2>
  <table style="font-size:0.5em; margin:auto; border-collapse:collapse;">
    <tr><td style="padding:6px 14px; border-bottom:1px solid #e5e7eb;"><code>Ctrl/Cmd + F</code></td><td style="padding:6px 14px; border-bottom:1px solid #e5e7eb;">Tìm / thay thế trong editor</td></tr>
    <tr><td style="padding:6px 14px; border-bottom:1px solid #e5e7eb;"><code>Ctrl/Cmd + /</code></td><td style="padding:6px 14px; border-bottom:1px solid #e5e7eb;">Thêm / bỏ comment HTML</td></tr>
    <tr><td style="padding:6px 14px;">Bấm nhãn <b>S1, S2</b> bên trái</td><td style="padding:6px 14px;">Thu gọn / mở từng slide</td></tr>
  </table>
  <p style="font-size:0.5em; margin-top:14px;">Chi tiết tại <a href="https://heyshow.pedu.vn/help">trang Help</a> · <a href="https://heyshow.pedu.vn/templates">thêm mẫu tại Templates</a></p>
</section>`
    },

    {
        id: 'do-vui',
        fileName: 'do-vui-toan-hoc.html',
        desc: 'Game show 4 câu đố: mỗi câu hiện phương án → đáp án dần theo phím bấm, slide cuối tổng kết.',
        title: 'Đố vui Toán học — "Ai nhanh hơn bạn rùa?"',
        note: 'Đổi câu hỏi trong từng slide; giữ class="fragment" để đáp án chỉ hiện khi giáo viên bấm phím.',
        code: String.raw`<section-master>
  <style>
    .reveal .slides section { background:#101828; border-radius:14px; padding:28px; }
    .reveal h2 { color:#fbbf24; }
    .dapan { color:#a6e3a1; font-weight:bold; }
    .diem { position:absolute; top:12px; right:22px; font-size:0.4em; color:#fbbf24; }
  </style>
</section-master>

<section data-background-gradient="radial-gradient(circle at 30% 30%, #1d2b4a, #101828)">
  <h1>ĐỐ VUI TOÁN HỌC 🐢</h1>
  <p style="font-size:0.6em;">4 câu · 30 giây mỗi câu · đáp án bị giấu — ai nhanh hơn bạn rùa?</p>
  <p class="fragment" style="font-size:0.5em; color:#8fa8c4;">Cách chơi: suy nghĩ → bấm phím mũi tên để hiện đáp án</p>
</section>

<section>
  <div class="diem">Câu 1/4</div>
  <h2>🐢 Câu 1</h2>
  <p style="font-size:0.7em;">Bán kính một đường tròn tăng lên 2 lần. Diện tích tăng mấy lần?</p>
  <p class="fragment" style="font-size:0.6em; color:#8fa8c4;">A. 2 lần · B. 3 lần · C. 4 lần · D. 8 lần</p>
  <p class="fragment dapan">→ C. 4 lần, vì $S = \pi R^2$ và $(2R)^2 = 4R^2$.</p>
</section>

<section>
  <div class="diem">Câu 2/4</div>
  <h2>🐢 Câu 2</h2>
  <p style="font-size:0.7em;">Một cuốn sách dày 100 trang. Chữ số 9 xuất hiện bao nhiêu lần ở số trang?</p>
  <p class="fragment" style="font-size:0.6em; color:#8fa8c4;">A. 10 · B. 11 · C. 19 · D. 20</p>
  <p class="fragment dapan">→ D. 20 lần (hàng đơn vị: 10 lần, hàng chục: 10 lần).</p>
</section>

<section>
  <div class="diem">Câu 3/4</div>
  <h2>🐢 Câu 3</h2>
  <p style="font-size:0.7em;">Tam giác có hai góc 40° và 60°. Góc thứ ba là?</p>
  <p class="fragment" style="font-size:0.6em; color:#8fa8c4;">A. 70° · B. 80° · C. 90° · D. 100°</p>
  <p class="fragment dapan">→ B. 80° (tổng ba góc trong tam giác bằng 180°).</p>
</section>

<section>
  <div class="diem">Câu 4/4</div>
  <h2>🐢 Câu 4 — cân não</h2>
  <p style="font-size:0.65em;">Sên leo giếng sâu 10 m. Ngày leo 3 m, đêm tuột 2 m. Sên thoát khỏi giếng vào ngày thứ mấy?</p>
  <p class="fragment" style="font-size:0.6em; color:#8fa8c4;">A. Ngày 10 · B. Ngày 9 · C. Ngày 8 · D. Không bao giờ</p>
  <p class="fragment dapan">→ C. Ngày 8 — sáng ngày 8 sên lên được 7 + 3 = 10 m, thoát ra nên không tuột nữa!</p>
</section>

<section data-background-gradient="linear-gradient(135deg, #b45309, #f59e0b)">
  <h1>TỔNG KẾT 🏆</h1>
  <p style="font-size:0.65em; color:#1c1917;">4 đúng = Thiên tài · 3 đúng = Thông minh · 2 đúng = Cần cố gắng · 0–1 đúng =… bằng bạn rùa 🐢</p>
  <p class="fragment" style="font-size:0.5em; color:#fef3c7;">Bạn có câu đố hay? Tạo bài bằng HeyShow rồi đăng Gallery nhé!</p>
</section>`
    },

    {
        id: 'bao-cao-du-an',
        fileName: 'bao-cao-du-an-github.html',
        title: 'Báo cáo dự án — Chuẩn báo cáo repo GitHub',
        desc: 'Vấn đề → giải pháp → kiến trúc → kết quả → roadmap → cách đóng góp; có sơ đồ khối và thẻ số liệu.',
        note: 'Thay <tên dự án>, số liệu và liên kết repo của bạn; sơ đồ kiến trúc vẽ bằng CSS, không cần ảnh.',
        code: String.raw`<section-master>
  <style>
    .reveal .slides section { background:#0d1117; border-radius:14px; padding:26px; }
    .reveal h1, .reveal h2 { color:#58a6ff; }
    .tag { display:inline-block; background:#1f6feb33; border:1px solid #58a6ff; color:#79c0ff;
           border-radius:999px; padding:2px 14px; font-size:0.42em; margin-bottom:12px; }
    .card { background:#161b22; border:1px solid #30363d; border-radius:12px; padding:16px; }
    .so-lieu { font-size:1.5em; font-weight:bold; color:#f0883e; }
    .reveal pre { background:#161b22; border:1px solid #30363d; border-radius:10px;
                  font-size:0.5em; text-align:left; padding:14px; }
  </style>
</section-master>

<section>
  <span class="tag">github.com/&lt;owner&gt;/&lt;repo&gt;</span>
  <h1>&lt;TÊN DỰ ÁN&gt;</h1>
  <p style="font-size:0.6em;">Báo cáo tiến độ · Đợt 2 · Nhóm: An, Bình, Cường</p>
</section>

<section>
  <span class="tag">1 · VẤN ĐỀ</span>
  <h2>Chúng tôi giải quyết điều gì?</h2>
  <p style="font-size:0.65em; max-width:720px; margin:0 auto;">Giáo viên mất nhiều thời gian soạn slide Toán có công thức; các công cụ hiện nặng hoặc không hỗ trợ tiếng Việt.</p>
  <ul style="font-size:0.55em; text-align:left; max-width:640px; margin:14px auto 0;">
    <li class="fragment">Ý tưởng xuất phát từ: <i>đề bài thực tế HK1</i></li>
    <li class="fragment">Người dùng mục tiêu: GV & HS phổ thông</li>
  </ul>
</section>

<section>
  <span class="tag">2 · GIẢI PHÁP</span>
  <h2>Các điểm nhấn</h2>
  <div style="display:flex; gap:14px; max-width:780px; margin:0 auto;">
    <div class="card" style="flex:1;"><h4>Soạn nhanh</h4><p style="font-size:0.5em;">AI sinh slide theo yêu cầu tiếng Việt</p></div>
    <div class="card" style="flex:1;"><h4>Toán chuẩn</h4><p style="font-size:0.5em;">Công thức KaTeX trực tiếp trong slide</p></div>
    <div class="card" style="flex:1;"><h4>Chia sẻ dễ</h4><p style="font-size:0.5em;">Xuất bản thành link, có Gallery</p></div>
  </div>
</section>

<section>
  <span class="tag">3 · KIẾN TRÚC</span>
  <h2>Sơ đồ hệ thống</h2>
  <div style="display:flex; align-items:center; justify-content:center; gap:12px; font-size:0.6em;">
    <div class="card" style="border-color:#58a6ff;">Editor<br><span style="font-size:0.6em;">HTML + preview</span></div>
    <div style="color:#f0883e; font-size:1.6em;">→</div>
    <div class="card" style="border-color:#3fb950;">API<br><span style="font-size:0.6em;">Express + file store</span></div>
    <div style="color:#f0883e; font-size:1.6em;">→</div>
    <div class="card" style="border-color:#f0883e;">AI Provider<br><span style="font-size:0.6em;">Groq / DeepSeek</span></div>
    <div style="color:#f0883e; font-size:1.6em;">→</div>
    <div class="card" style="border-color:#bc8cff;">Trang xem<br><span style="font-size:0.6em;">Reveal.js công khai</span></div>
  </div>
  <p class="fragment" style="font-size:0.5em; color:#8b949e;">Tự host trên điện thoại + Cloudflare Tunnel — chi phí ~0đ 🎉</p>
</section>

<section>
  <span class="tag">4 · KẾT QUẢ</span>
  <h2>Số liệu đến hôm nay</h2>
  <div style="display:flex; gap:16px; justify-content:center;">
    <div class="card" style="width:170px;"><div class="so-lieu">128</div><div style="font-size:0.45em;">★ stars</div></div>
    <div class="card" style="width:170px;"><div class="so-lieu">37</div><div style="font-size:0.45em;">issues đóng</div></div>
    <div class="card" style="width:170px;"><div class="so-lieu">96%</div><div style="font-size:0.45em;">test pass</div></div>
    <div class="card" style="width:170px;"><div class="so-lieu">1.4k</div><div style="font-size:0.45em;">lượt xem bài</div></div>
  </div>
</section>

<section>
  <span class="tag">5 · ROADMAP</span>
  <h2>Đường hướng phát triển</h2>
  <ol style="font-size:0.6em; text-align:left; max-width:620px; margin:0 auto;">
    <li class="fragment">✔ Editor + AI + Gallery (đã xong)</li>
    <li class="fragment">🚧 Chủ đề slide (theme) chọn nhanh</li>
    <li class="fragment">📌 Xuất PDF / ghi hình thuyết trình</li>
    <li class="fragment">💡 Chế độ trình chiếu đồng thời (multi-screen)</li>
  </ol>
</section>

<section>
  <span class="tag">CONTRIBUTING</span>
  <h2>Cùng đóng góp nào!</h2>
  <pre><code data-trim>git clone https://github.com/&lt;owner&gt;/&lt;repo&gt;.git
cd &lt;repo&gt; && npm install
npm run dev   # mở http://localhost:3000</code></pre>
  <p class="fragment" style="font-size:0.55em;">Gửi PR theo hướng dẫn trong CONTRIBUTING.md · Discussion mở cho mọi ý tưởng.</p>
</section>`
    },

    {
        id: 'tieu-luan',
        fileName: 'tieu-luan-nghien-cuu.html',
        title: 'Tiểu luận — Trình bày kết quả nghiên cứu',
        desc: 'Bố cục học thuật: tóm tắt → đặt vấn đề → phương pháp → kết quả (biểu đồ) → bàn luận → tài liệu tham khảo.',
        note: 'Biểu đồ vẽ bằng CSS thuần — sửa chiều cao cột / tỉ lệ conic-gradient theo số liệu của bạn.',
        code: String.raw`<section-master>
  <style>
    .reveal .slides section { background:#f8fafc; color:#1f2937; border-radius:14px; padding:28px; }
    .reveal h1, .reveal h2 { color:#0f3d6e; }
    .phan { display:inline-block; background:#0f3d6e; color:#ffffff; padding:3px 14px;
            border-radius:6px; font-size:0.4em; font-weight:bold; margin-bottom:12px; }
    .reveal .tieu-muc { font-size:0.6em; text-align:left; max-width:740px; margin:0 auto; }
    .reveal figcaption { font-size:0.4em; color:#6b7280; }
  </style>
</section-master>

<section>
  <h2>TIỂU LUẬN</h2>
  <h1 style="font-size:1.3em;">Ứng dụng mô hình hồi quy dự báo<br> mức độ hài lòng người dùng</h1>
  <p style="font-size:0.55em; color:#6b7280;">Học phần: Phương pháp nghiên cứu khoa học<br>
  Sinh viên thực hiện: &lt;Họ tên&gt; — MSSV &lt;…&gt; · GVHD: &lt;PGS.TS …&gt;</p>
</section>

<section>
  <span class="phan">TÓM TẮT</span>
  <p class="tieu-muc">Nghiên cứu khảo sát 240 người dùng trong 3 tháng, xây dựng mô hình hồi quy tuyến tính dự báo mức độ hài lòng từ 5 biến số dịch vụ. Kết quả: mô hình giải thích 68% phương sai (R² = 0,68); biến <b>tốc độ phản hồi</b> tác động mạnh nhất.</p>
</section>

<section>
  <span class="phan">1 · ĐẶT VẤN ĐỀ</span>
  <h2>Tính cấp thiết &amp; mục tiêu</h2>
  <ul class="tieu-muc">
    <li class="fragment">Khoảng trống: chưa có nghiên cứu đo mức độ hài lòng cho nền tảng giáo dục Việt Nam.</li>
    <li class="fragment">Câu hỏi nghiên cứu: Yếu tố dịch vụ nào ảnh hưởng mạnh nhất?</li>
    <li class="fragment">Phạm vi: người dùng 18–25 tuổi tại 3 tỉnh miền Trung.</li>
  </ul>
</section>

<section>
  <span class="phan">2 · PHƯƠNG PHÁP</span>
  <h2>Quy trình nghiên cứu</h2>
  <div style="display:flex; gap:10px; justify-content:center; font-size:0.5em; max-width:820px; margin:0 auto;">
    <div style="flex:1; background:#0f3d6e; color:#fff; border-radius:10px; padding:12px;">Tổng quan tài liệu</div>
    <div style="align-self:center; color:#0f3d6e; font-size:1.5em;">→</div>
    <div style="flex:1; background:#155e93; color:#fff; border-radius:10px; padding:12px;">Khảo sát n=240</div>
    <div style="align-self:center; color:#0f3d6e; font-size:1.5em;">→</div>
    <div style="flex:1; background:#2d7fb3; color:#fff; border-radius:10px; padding:12px;">Hồi quy đa biến</div>
    <div style="align-self:center; color:#0f3d6e; font-size:1.5em;">→</div>
    <div style="flex:1; background:#5aa0cc; color:#11324f; border-radius:10px; padding:12px;">Kiểm định &amp; kết luận</div>
  </div>
</section>

<section>
  <span class="phan">3 · KẾT QUẢ</span>
  <h2>Mức ảnh hưởng các biến (chuẩn hóa)</h2>
  <div style="display:flex; align-items:flex-end; justify-content:center; gap:22px; height:240px; font-size:0.5em;">
    <div style="text-align:center;"><div class="fragment" style="background:#0f3d6e; width:64px; height:190px; border-radius:6px 6px 0 0; margin:0 auto;"></div>Tốc độ<br><b>0,42</b></div>
    <div style="text-align:center;"><div class="fragment" style="background:#155e93; width:64px; height:130px; border-radius:6px 6px 0 0; margin:0 auto;"></div>Giao diện<br><b>0,29</b></div>
    <div style="text-align:center;"><div class="fragment" style="background:#2d7fb3; width:64px; height:90px; border-radius:6px 6px 0 0; margin:0 auto;"></div>Giá cả<br><b>0,20</b></div>
    <div style="text-align:center;"><div class="fragment" style="background:#5aa0cc; width:64px; height:45px; border-radius:6px 6px 0 0; margin:0 auto;"></div>Hỗ trợ<br><b>0,10</b></div>
  </div>
  <p style="font-size:0.45em; color:#6b7280;">Hình 3. Hệ số hồi quy chuẩn hóa · R² = 0,68 · p &lt; 0,05</p>
</section>

<section>
  <span class="phan">4 · BÀN LUẬN</span>
  <ul class="tieu-muc" style="font-size:0.6em;">
    <li class="fragment">Phù hợp với kỳ vọng lý thuyết SERVQUAL, nhưng khác nghiên cứu trước ở biến "giá cả" (tác động yếu hơn).</li>
    <li class="fragment">Hạn chế: mẫu thuận tiện, khung 3 tháng — cần theo dõi dài hạn.</li>
  </ul>
</section>

<section>
  <span class="phan">5 · KẾT LUẬN</span>
  <h2>Kết luận &amp; kiến nghị</h2>
  <p class="tieu-muc">Ưu tiên đầu tư tốc độ phản hồi hệ thống sẽ cải thiện hài lòng nhiều nhất. Hướng nghiên cứu tiếp theo: mở rộng mẫu và thử nghiệm can thiệp A/B.</p>
  <p style="font-size:0.45em; color:#6b7280; text-align:left; max-width:740px; margin:14px auto 0;">
    Tài liệu tham khảo: Parasuraman &amp; ctv (1988)…; Trần &amp; Nguyễn (2023)… — trình bày theo APA 7.</p>
</section>`
    }
];

const SLIDES = [
    {
        id: 'thong-ke',
        title: 'Slide Thống kê — bảng + biểu đồ cột + biểu đồ tròn',
        desc: 'Một slide tổng hợp ba cách trình bày số liệu, các thành phần hiện dần theo phím bấm.',
        note: 'Sửa số liệu trong bảng, chiều cao cột (px tỉ lệ %) và các mốc phần trăm trong conic-gradient.',
        code: String.raw`<section>
  <h2>Kết quả khảo sát học kỳ I</h2>
  <div style="display:flex; gap:26px; justify-content:center; align-items:flex-start; font-size:0.5em;">
    <table style="border-collapse:collapse;">
      <tr style="background:#f59e0b; color:#111111;">
        <th style="padding:6px 12px; border:1px solid #666;">Lớp</th>
        <th style="padding:6px 12px; border:1px solid #666;">Số HS</th>
        <th style="padding:6px 12px; border:1px solid #666;">Đạt ≥ 8</th>
      </tr>
      <tr class="fragment"><td style="padding:6px 12px; border:1px solid #666;">12A1</td><td style="padding:6px 12px; border:1px solid #666;">42</td><td style="padding:6px 12px; border:1px solid #666;">31</td></tr>
      <tr class="fragment"><td style="padding:6px 12px; border:1px solid #666;">12A2</td><td style="padding:6px 12px; border:1px solid #666;">40</td><td style="padding:6px 12px; border:1px solid #666;">25</td></tr>
      <tr class="fragment"><td style="padding:6px 12px; border:1px solid #666;">12A3</td><td style="padding:6px 12px; border:1px solid #666;">38</td><td style="padding:6px 12px; border:1px solid #666;">28</td></tr>
    </table>
    <div style="display:flex; align-items:flex-end; gap:16px; height:190px;">
      <div style="text-align:center;"><div class="fragment" style="width:46px; height:155px; background:#f59e0b; border-radius:5px 5px 0 0; margin:0 auto;"></div>74%</div>
      <div style="text-align:center;"><div class="fragment" style="width:46px; height:125px; background:#38bdf8; border-radius:5px 5px 0 0; margin:0 auto;"></div>63%</div>
      <div style="text-align:center;"><div class="fragment" style="width:46px; height:140px; background:#a78bfa; border-radius:5px 5px 0 0; margin:0 auto;"></div>74%</div>
    </div>
    <div class="fragment" style="width:150px; height:150px; border-radius:50%;
         background:conic-gradient(#f59e0b 0 41%, #38bdf8 41% 78%, #a78bfa 78% 100%);"></div>
  </div>
  <p class="fragment" style="font-size:0.45em; color:#999999;">Hình 1. Tỉ lệ đạt điểm ≥ 8 theo lớp (n = 120)</p>
</section>`
    },

    {
        id: 'do-thi-tham-so',
        title: 'Slide Đồ thị hàm số có tham số',
        desc: 'Họ parabol y = (x − m)² vẽ bằng SVG (path Bézier, không cần thư viện), kèm quy luật tịnh tiến theo tham số m.',
        note: 'Mỗi đường cong là một <path d="M … Q …"> — sao chép path và đổi hoành độ đỉnh/đầu cuối để thêm đường ứng với m khác.',
        code: String.raw`<section>
  <h2>Đồ thị $y = (x - m)^2$ khi $m$ thay đổi</h2>
  <svg viewBox="0 0 420 300" style="width:420px; height:300px; background:#0b1220; border-radius:12px;">
    <line x1="10" y1="180" x2="410" y2="180" stroke="#64748b" stroke-width="1.5"/>
    <line x1="210" y1="10" x2="210" y2="290" stroke="#64748b" stroke-width="1.5"/>
    <path d="M 90 60 Q 210 300 330 60" fill="none" stroke="#f59e0b" stroke-width="3"/>
    <path class="fragment fade-in" d="M 130 60 Q 250 300 370 60" fill="none" stroke="#38bdf8" stroke-width="3"/>
    <path class="fragment fade-in" d="M 50 60 Q 170 300 290 60" fill="none" stroke="#a78bfa" stroke-width="3"/>
    <circle cx="210" cy="180" r="5" fill="#f59e0b"/>
    <circle class="fragment" cx="250" cy="180" r="5" fill="#38bdf8"/>
    <circle class="fragment" cx="170" cy="180" r="5" fill="#a78bfa"/>
  </svg>
  <div style="display:flex; gap:26px; justify-content:center; font-size:0.5em;">
    <span style="color:#f59e0b;">$m = 0$</span>
    <span class="fragment" style="color:#38bdf8;">$m = 1$</span>
    <span class="fragment" style="color:#a78bfa;">$m = -1$</span>
  </div>
  <p class="fragment" style="font-size:0.55em;">Quy luật: $m > 0$ → đồ thị tịnh tiến <b>sang phải</b>; $m < 0$ → tịnh tiến <b>sang trái</b>; dạng parabol không đổi.</p>
</section>`
    },

    {
        id: 'trac-nghiem',
        title: 'Slide Câu hỏi trắc nghiệm nhiều lựa chọn',
        desc: 'Bấm đáp án: đúng chuyển xanh, sai chuyển đỏ, giải thích hiện ra sau khi trả lời — thuần HTML/CSS.',
        note: 'Đổi các id (c1a…c1d) khi thêm câu khác trong cùng bài; đáp án đúng là input có class="ok".',
        code: String.raw`<section>
  <style>
    .mcq input { display:none; }
    .mcq label { display:block; text-align:left; max-width:560px; margin:8px auto;
                 padding:10px 16px; border:2px solid #555555; border-radius:10px;
                 cursor:pointer; font-size:0.6em; transition:all .15s; }
    .mcq label:hover { border-color:#f59e0b; }
    .mcq input:checked + label { border-color:#f87171; background:#7f1d1d; }
    .mcq input.ok:checked + label { border-color:#4ade80; background:#14532d; }
    .mcq:has(input:checked) ~ .giai { display:block; }
    .giai { display:none; max-width:560px; margin:12px auto 0; padding:10px 16px;
            border-left:4px solid #f59e0b; background:#1f2937; border-radius:8px;
            font-size:0.5em; text-align:left; }
  </style>
  <h2>Câu 3. Hàm số $y = x^3 - 3x$ có bao nhiêu điểm cực trị?</h2>
  <div class="mcq">
    <input type="radio" name="c3" id="c3a"><label for="c3a">A. 0</label>
    <input type="radio" name="c3" id="c3b"><label for="c3b">B. 1</label>
    <input type="radio" name="c3" id="c3c" class="ok"><label for="c3c">C. 2</label>
    <input type="radio" name="c3" id="c3d"><label for="c3d">D. 3</label>
  </div>
  <p class="giai"><b>Giải thích:</b> $y' = 3x^2 - 3$ đổi dấu hai lần tại $x = \pm 1$
  ⇒ hàm số có <b>2 điểm cực trị</b>. Bấm đáp án khác để thử lại!</p>
</section>`
    },

    {
        id: 'ghep-doi',
        title: 'Slide Câu hỏi ghép đôi',
        desc: 'Hai cột A–B cần nối; học sinh thảo luận rồi bấm "Xem đáp án" để kiểm tra.',
        note: 'Đổi số dòng: thêm mỗi cặp vào cả hai cột và cập nhật chuỗi đáp án trong phần chi tiết.',
        code: String.raw`<section>
  <h2>Ghép đôi: Công thức ↔ Tên gọi</h2>
  <p style="font-size:0.5em; color:#999999;">Nối mỗi ý cột A với một ý cột B (30 giây, làm theo cặp)</p>
  <div style="display:flex; gap:40px; justify-content:center; font-size:0.6em; max-width:720px; margin:0 auto;">
    <div style="flex:1;">
      <h4 style="color:#f59e0b;">CỘT A</h4>
      <ol style="text-align:left; line-height:2.2;">
        <li>Diện tích hình tròn</li>
        <li>Chu vi hình tròn</li>
        <li>Thể tích khối cầu</li>
        <li>Diện tích xung quanh hình trụ</li>
      </ol>
    </div>
    <div style="flex:1;">
      <h4 style="color:#38bdf8;">CỘT B</h4>
      <ul style="text-align:left; line-height:2.6; list-style:none;">
        <li>a. $2\pi R h$</li>
        <li>b. $\pi R^2$</li>
        <li>c. $2\pi R$</li>
        <li>d. $\dfrac{4}{3}\pi R^3$</li>
      </ul>
    </div>
  </div>
  <details style="font-size:0.55em; max-width:560px; margin:10px auto 0; text-align:left;
                 background:#1f2937; border-radius:10px; padding:10px 16px; cursor:pointer;">
    <summary style="font-weight:bold; color:#f59e0b;">Xem đáp án</summary>
    <p style="margin-top:8px;">1–b · 2–c · 3–d · 4–a</p>
  </details>
</section>`
    },

    {
        id: 'dien-khuyet',
        title: 'Slide Câu hỏi điền khuyết',
        desc: 'Chỗ trống là ô nhập được ngay trên slide (bấm/nhập trực tiếp khi thuyết trình), đáp án hiện dần bằng fragment.',
        note: 'Khi trình chiếu: bấm chuột vào ô rồi gõ — mũi tên trái/phải vẫn lật slide như thường.',
        code: String.raw`<section>
  <style>
    .dien-khuyet input {
      width:110px; background:#fffbe6; color:#111111; border:none;
      border-bottom:3px solid #f59e0b; border-radius:4px 4px 0 0;
      font-size:0.85em; text-align:center; font-family:inherit;
    }
  </style>
  <h2>Điền vào chỗ trống</h2>
  <div class="dien-khuyet" style="font-size:0.65em; text-align:left; max-width:680px; margin:0 auto;">
    <p style="margin-bottom:18px;">1) Trong tam giác vuông, bình phương cạnh huyền bằng
      <input aria-label="điền 1"> tổng bình phương hai <input aria-label="điền 2">.</p>
    <p style="margin-bottom:18px;">2) $$ (a + b)^2 = a^2 + \underline{\hspace{1.6cm}} + b^2 $$</p>
    <p>3) Số vô tỉ điển hình được ký hiệu là π, nó là tỉ số giữa chu vi và <input aria-label="điền 3"> của đường tròn.</p>
  </div>
  <p class="fragment" style="font-size:0.55em; color:#a6e3a1; margin-top:14px;">
    Đáp án: 1) <b>bằng</b> · <b>cạnh góc vuông</b> &nbsp; 2) <b>$2ab$</b> &nbsp; 3) <b>đường kính</b></p>
</section>`
    },

    {
        id: 'puzzle',
        title: 'Slide Trò chơi Puzzle — giải mã từ khóa',
        desc: 'Lưới 6 ô úp: trả lời đúng câu hỏi nào, bấm lật ô đó để lộ một chữ; ghép 6 chữ thành từ khóa.',
        note: 'Đổi chữ cái mặt sau và câu hỏi theo chủ đề; mỗi ô là một checkbox CSS — bấm lại để lật úp trở lại.',
        code: String.raw`<section>
  <style>
    .puzzle { display:grid; grid-template-columns:repeat(3, 170px); gap:16px; justify-content:center; }
    .puzzle input { display:none; }
    .puzzle label { position:relative; width:170px; height:120px; cursor:pointer;
                    transform-style:preserve-3d; transition:transform .45s; }
    .puzzle input:checked + label { transform:rotateY(180deg); }
    .puzzle .mat-truoc, .puzzle .mat-sau {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      border-radius:14px; backface-visibility:hidden; font-weight:bold;
    }
    .puzzle .mat-truoc { background:#1f2937; border:2px solid #f59e0b; color:#fbbf24; font-size:0.55em; }
    .puzzle .mat-sau { background:#f59e0b; color:#111111; font-size:1.6em; transform:rotateY(180deg); }
  </style>
  <h2>🧩 Giải mã từ khóa</h2>
  <p style="font-size:0.45em; color:#999999;">Trả lời đúng câu nào → lật ô đó. Ghép 6 chữ cái theo thứ tự ô để được từ khóa!</p>
  <div class="puzzle">
    <input type="checkbox" id="pz1"><label for="pz1"><span class="mat-truoc">Câu 1<br>$\sqrt{81} = ?$</span><span class="mat-sau">T</span></label>
    <input type="checkbox" id="pz2"><label for="pz2"><span class="mat-truoc">Câu 2<br>$2^{10} = ?$</span><span class="mat-sau">O</span></label>
    <input type="checkbox" id="pz3"><label for="pz3"><span class="mat-truoc">Câu 3<br>$15^2 = ?$</span><span class="mat-sau">A</span></label>
    <input type="checkbox" id="pz4"><label for="pz4"><span class="mat-truoc">Câu 4<br>Số 0 có chẵn không?</span><span class="mat-sau">N</span></label>
    <input type="checkbox" id="pz5"><label for="pz5"><span class="mat-truoc">Câu 5<br>$\pi \approx ?$</span><span class="mat-sau">Ọ</span></label>
    <input type="checkbox" id="pz6"><label for="pz6"><span class="mat-truoc">Câu 6<br>Tổng góc tam giác?</span><span class="mat-sau">C</span></label>
  </div>
  <p style="font-size:0.5em; color:#fbbf24; margin-top:12px;">Từ khóa: T-O-A-N-Ọ-C 🎉</p>
</section>`
    }
];

const copyBtnFor = (get, title) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
        const text = get();
        let ok = false;
        try {
            await navigator.clipboard.writeText(text);
            ok = true;
        } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
            ta.remove();
        }
        btn.textContent = ok ? 'Đã copy ✓' : 'Ctrl+C nhé';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
    });
    btn.title = 'Copy code ' + title;
    return btn;
};

function buildCard(t, kind) {
    const card = document.createElement('div');
    card.className = 'tpl';
    card.id = 't-' + t.id;

    const head = document.createElement('div');
    head.className = 'tpl-head';
    const title = document.createElement('span');
    title.className = 'ex-title';
    title.textContent = t.title;
    const spacer = document.createElement('span');
    spacer.className = 'spacer';
    head.append(title, spacer);

    // Mẫu cả bài: thêm nút tạo bản nháp; mẫu slide đơn: chỉ Copy (dán vào file đang mở)
    if (kind === 'deck') {
        const useBtn = document.createElement('button');
        useBtn.type = 'button';
        useBtn.className = 'use';
        useBtn.textContent = 'Dùng mẫu này';
        useBtn.title = 'Tạo bản nháp mới trong Design với toàn bộ mẫu';
        useBtn.addEventListener('click', () => {
            localStorage.setItem('heyshow_pending_template', JSON.stringify({
                name: t.title, fileName: t.fileName, code: t.code
            }));
            location.href = '/design';
        });
        head.appendChild(useBtn);
    }
    head.appendChild(copyBtnFor(() => t.code, t.title));

    const desc = document.createElement('span');
    desc.className = 'desc';
    desc.textContent = t.desc;
    head.appendChild(desc);

    const preview = document.createElement('div');
    preview.className = 'preview';
    const label = document.createElement('span');
    label.className = 'preview-label';
    label.textContent = 'PREVIEW';
    const iframe = document.createElement('iframe');
    iframe.title = 'Preview: ' + t.title;
    preview.append(label, iframe);

    const details = document.createElement('details');
    details.className = 'code';
    const summary = document.createElement('summary');
    summary.textContent = 'Xem code HTML của mẫu';
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.textContent = t.code;
    pre.appendChild(codeEl);
    details.append(summary, pre);

    card.append(head, preview, details);

    if (t.note) {
        const note = document.createElement('div');
        note.className = 'note';
        note.textContent = t.note;
        card.appendChild(note);
    }
    return card;
}

const ALL = { decks: DECKS, slides: SLIDES };
document.querySelectorAll('[data-templates]').forEach(holder => {
    const list = ALL[holder.dataset.templates] || [];
    list.forEach(t => holder.appendChild(buildCard(t, holder.dataset.templates === 'decks' ? 'deck' : 'slide')));
});

// Nạp Reveal vào iframe preview khi cuộn tới gần, tránh tải 12 iframe một lúc
const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        const iframe = card.querySelector('iframe');
        const id = card.id.slice(2);
        const t = [...DECKS, ...SLIDES].find(x => x.id === id);
        if (iframe && t && !iframe.srcdoc) iframe.srcdoc = previewHtml(t.code);
        io.unobserve(card);
    });
}, { rootMargin: '300px 0px' });
document.querySelectorAll('.tpl').forEach(card => io.observe(card));
