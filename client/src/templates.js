// Trang Templates: thư viện mẫu sẵn (bài trình chiếu + slide đơn lẻ)
// Mỗi mẫu là code HeyShow thô, xem được preview thật và tạo bản nháp chỉ với một bấm.
import { previewHtml } from './reveal-preview.js';

// Danh mục cho sidebar. kind: 'deck' = cả bài (có nút "Dùng mẫu này" tạo bản nháp),
// 'slide' = slide đơn lẻ (chỉ Copy rồi dán vào bài đang soạn). Thứ tự mảng là thứ tự
// trên trang và trên sidebar — thêm mẫu thì chỉ cần khai báo group của nó ở đây.
const GROUPS = [
    {
        id: 'giao-an', kind: 'deck', label: 'Giáo án lên lớp',
        lead: 'Bộ slide hỗ trợ dạy học: hoạt động khởi động → hình thành kiến thức → luyện tập → vận dụng → củng cố, có mục tiêu và tình huống mở đầu. Bảy môn: Toán, Ngữ văn, Vật lí, Hoá học, Sinh học, Lịch sử, Địa lí — mỗi mẫu giữ khung 5 bước và thêm phần đặc thù của môn (thí nghiệm, hoá chất và an toàn, kính hiển vi, nguồn sử liệu, Atlat).'
    },
    {
        id: 'chuyen-de', kind: 'deck', label: 'Chuyên đề & bồi dưỡng',
        lead: 'Bài giảng sâu hơn sách giáo khoa: lý thuyết → ví dụ giải từng bước → bài tập → mở rộng. Dùng cho chuyên đề bồi dưỡng học sinh giỏi và ôn thi.'
    },
    {
        id: 'quy-trinh', kind: 'deck', label: 'Hướng dẫn & quy trình',
        lead: 'Hướng dẫn người khác làm một việc: chuẩn bị → từng bước thực hiện → lỗi thường gặp → mẹo. Đổi tên phần mềm/quy trình là dùng được ngay.'
    },
    {
        id: 'hoat-dong', kind: 'deck', label: 'Hoạt động & game',
        lead: 'Slide chơi trên lớp: đố vui có đáp án hiện dần, câu lạc bộ, trò chơi ôn chương. Hoàn toàn bằng HTML/CSS nên chạy ổn định khi chiếu.'
    },
    {
        id: 'bao-cao', kind: 'deck', label: 'Báo cáo & tiểu luận',
        lead: 'Trình bày kết quả làm việc: vấn đề → giải pháp → số liệu → kết luận. Phù hợp báo cáo dự án, tiểu luận, nghiệm thu đề tài.'
    },
    {
        id: 'reveal', kind: 'deck', label: 'Hiệu ứng Reveal.js',
        lead: 'Những gì Reveal.js làm được mà mẫu thông thường không dùng tới: slide dọc lồng nhau, các kiểu hiện dần, nền màu/gradient/hoạ tiết và chuyển cảnh riêng từng slide. Vừa là mẫu, vừa là tài liệu để học theo.'
    },
    {
        id: 'mo-dau', kind: 'slide', label: 'Mở đầu & kết bài',
        lead: 'Ba slide quyết định ấn tượng của cả bài: trang bìa, mục lục và trang cảm ơn — cùng một họ màu để dán vào bất kỳ bài nào.'
    },
    {
        id: 'so-lieu', kind: 'slide', label: 'Số liệu & đồ thị',
        lead: 'Biểu đồ cột, biểu đồ tròn, ba con số lớn và đồ thị hàm số vẽ bằng SVG/CSS thuần — sửa số liệu là hình vẽ đổi theo, không cần thư viện.'
    },
    {
        id: 'bo-cuc', kind: 'slide', label: 'Bảng, sơ đồ & bố cục',
        lead: 'Những khung dựng sẵn để bài có nhịp: so sánh hai phương án, dòng thời gian dự án và bảng số liệu có dòng nhấn mạnh.'
    },
    {
        id: 'tuong-tac', kind: 'slide', label: 'Slide tương tác',
        lead: 'Học sinh bấm trực tiếp trên slide khi trình chiếu: trắc nghiệm đổi màu đúng/sai, ghép đôi, điền khuyết, puzzle giải mã từ khóa.'
    }
];

// Nền sáng là quy ước của cả kho mẫu, dù theme Reveal nạp kèm là black: section-master
// phải phủ .reveal background bằng gradient nhạt, và màu đề mục phải !important vì theme
// ép #222 cho mọi section có data-background-* sáng (rule section.has-light-background).
const DECKS = [
    {
        id: 'giao-an',
        group: 'giao-an',
        fileName: 'giao-an-dinh-ly-pythagore.html',
        title: 'Giáo án — Định lý Pythagore (Toán 8, tiết 3)',
        desc: 'Bài học 5 bước: Mở đầu · Hình thành kiến thức · Luyện tập · Vận dụng & mở rộng · Củng cố bài học.',
        note: 'Thay tên giáo viên, trường và nội dung bài học của bạn; cấu trúc 5 bước giữ nguyên cho mọi môn.',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#fffbeb linear-gradient(135deg,#fef3c7,#fffbeb) !important; }
    .reveal .slides section { box-sizing:border-box; color:#1f2937; border-radius:14px; padding:28px; }
    .reveal h1, .reveal h2, .reveal h3, .reveal h4 { color:#b45309 !important; }
    .giai-doan { display:inline-block; background:#f59e0b; color:#111111;
                 padding:4px 16px; border-radius:999px; font-size:0.45em;
                 font-weight:bold; margin-bottom:14px; }
    .reveal .muc-tieu { font-size:0.62em; text-align:left; max-width:720px; margin:0 auto; }
    .reveal .tinh-huat { font-size:0.65em; font-style:italic; color:#92400e; }
  </style>
  <header style="position:absolute; top:10px; left:20px; font-size:0.36em; color:#a16207;">
    Giáo án Toán 8 · Tiết 3
  </header>
  <footer style="position:absolute; bottom:10px; right:20px; font-size:0.34em; color:#a16207;">
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

<section data-background-color="#fef3c7">
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
    <li class="fragment" style="color:#15803d;">→ $c = \sqrt{3^2 + 4^2} = 5$ cm</li>
    <li style="margin-top:14px;">C2: Cạnh huyền 13 m, một cạnh góc vuông 5 m. Cạnh còn lại = ?</li>
    <li class="fragment" style="color:#15803d;">→ $b = \sqrt{13^2 - 5^2} = 12$ m</li>
  </ul>
</section>

<section>
  <span class="giai-doan">BƯỚC 4 · VẬN DỤNG &amp; MỞ RỘNG</span>
  <h2>Quay lại chiếc thang</h2>
  <p style="font-size:0.65em;">Chiều cao đầu thang: $h = \sqrt{2{,}5^2 - 0{,}7^2} = \sqrt{6{,}25 - 0{,}49} \approx 2{,}4$ m</p>
  <p class="fragment" style="font-size:0.55em;">Mở rộng: đo màn hình tivi 16:9 — đường chéo 55 inch nghĩa là gì?</p>
</section>

<section data-background-gradient="linear-gradient(135deg, #fde68a, #fffbeb)">
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
        group: 'chuyen-de',
        fileName: 'chuyen-de-bat-dang-thuc-am-gm.html',
        title: 'Chuyên đề — Bất đẳng thức AM–GM và ứng dụng (Toán 10)',
        desc: 'Trình bày một chuyên đề bồi dưỡng: tổng quan → lý thuyết → ví dụ có lời giải từng bước → bài tập → kết luận.',
        note: 'Thay chuyên đề khác bằng cách sửa tiêu đề và nội dung; giữ nguyên khung “lý thuyết + ví dụ dần từng bước”.',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#f5f3ff linear-gradient(135deg,#ede9fe,#faf5ff) !important; }
    .reveal .slides section { box-sizing:border-box; color:#1f2937; border-radius:14px; padding:28px; }
    .reveal h1, .reveal h2, .reveal h3 { color:#6d28d9 !important; }
    .chu-de { display:inline-block; border:2px solid #7c3aed; border-radius:8px;
              padding:2px 14px; font-size:0.42em; color:#6d28d9; margin-bottom:12px; }
    .reveal .loigiai { font-size:0.58em; text-align:left; max-width:740px; margin:10px auto 0; }
  </style>
</section-master>

<section>
  <h1>CHUYÊN ĐỀ</h1>
  <h2>BẤT ĐẲNG THỨC AM–GM<br>VÀ ỨNG DỤNG</h2>
  <p style="font-size:0.55em; color:#6b7280;">Bồi dưỡng học sinh Toán 10 · 3 tiết</p>
</section>

<section>
  <span class="chu-de">TỔNG QUAN</span>
  <h2>Chuyên đề gồm 4 phần</h2>
  <div style="display:flex; gap:14px; justify-content:center; font-size:0.5em;">
    <div style="flex:1; background:#ffffff; border:1px solid #ddd6fe; border-radius:10px; padding:14px;">1. Lý thuyết cốt lõi</div>
    <div style="flex:1; background:#ffffff; border:1px solid #ddd6fe; border-radius:10px; padding:14px;">2. Kỹ thuật vận dụng</div>
    <div style="flex:1; background:#ffffff; border:1px solid #ddd6fe; border-radius:10px; padding:14px;">3. Ví dụ minh hoạ</div>
    <div style="flex:1; background:#ffffff; border:1px solid #ddd6fe; border-radius:10px; padding:14px;">4. Bài tập tự luyện</div>
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
    <p class="fragment" style="color:#15803d;">Kết luận: $\min f = 4$ đạt tại $x = 2$. ∎</p>
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

<section data-background-gradient="linear-gradient(135deg, #ddd6fe, #f5f3ff)">
  <h2>Kết luận &amp; tài liệu</h2>
  <p style="font-size:0.6em;">AM–GM là "công cụ đa năng" cho lớp bài toán cực trị — luyện thêm với các chuyên đề tiếp theo.</p>
  <p style="font-size:0.5em; color:#6b7280;">Tài liệu: Chuyên đề bồi dưỡng Toán 10 · Đề kiểm tra cuối chuyên đề trên HeyShow Gallery.</p>
</section>`
    },

    {
        id: 'huong-dan',
        group: 'quy-trinh',
        fileName: 'huong-dan-su-dung-heyshow.html',
        title: 'Hướng dẫn sử dụng — Tạo bài trình chiếu với HeyShow',
        desc: 'Mẫu "làm theo từng bước": giới thiệu → chuẩn bị → 3 bước thực hiện → tính năng nâng cao → mẹo & phím tắt.',
        note: 'Bản thân mẫu này hướng dẫn dùng HeyShow — đổi tên phần mềm và các bước để làm hướng dẫn cho sản phẩm khác.',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#fdf6e3 linear-gradient(135deg,#fef3c7,#fdf6e3) !important; }
    .reveal .slides section { box-sizing:border-box; color:#1f2937; border-radius:14px; padding:28px; }
    .reveal h1, .reveal h2, .reveal h3 { color:#b45309 !important; }
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
        group: 'hoat-dong',
        fileName: 'do-vui-toan-hoc.html',
        desc: 'Game show 4 câu đố: mỗi câu hiện phương án → đáp án dần theo phím bấm, slide cuối tổng kết.',
        title: 'Đố vui Toán học — "Ai nhanh hơn bạn rùa?"',
        note: 'Đổi câu hỏi trong từng slide; giữ class="fragment" để đáp án chỉ hiện khi giáo viên bấm phím.',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#fff7ed linear-gradient(135deg,#ffedd5,#fef3c7) !important; }
    .reveal .slides section { box-sizing:border-box; color:#1f2937; border-radius:14px; padding:28px; }
    .reveal h1, .reveal h2 { color:#c2410c !important; }
    .dapan { color:#15803d; font-weight:bold; }
    .diem { position:absolute; top:12px; right:22px; font-size:0.4em; color:#c2410c; }
  </style>
</section-master>

<section data-background-gradient="radial-gradient(circle at 30% 30%, #fed7aa, #fff7ed)">
  <h1>ĐỐ VUI TOÁN HỌC 🐢</h1>
  <p style="font-size:0.6em;">4 câu · 30 giây mỗi câu · đáp án bị giấu — ai nhanh hơn bạn rùa?</p>
  <p class="fragment" style="font-size:0.5em; color:#92400e;">Cách chơi: suy nghĩ → bấm phím mũi tên để hiện đáp án</p>
</section>

<section>
  <div class="diem">Câu 1/4</div>
  <h2>🐢 Câu 1</h2>
  <p style="font-size:0.7em;">Bán kính một đường tròn tăng lên 2 lần. Diện tích tăng mấy lần?</p>
  <p class="fragment" style="font-size:0.6em; color:#92400e;">A. 2 lần · B. 3 lần · C. 4 lần · D. 8 lần</p>
  <p class="fragment dapan">→ C. 4 lần, vì $S = \pi R^2$ và $(2R)^2 = 4R^2$.</p>
</section>

<section>
  <div class="diem">Câu 2/4</div>
  <h2>🐢 Câu 2</h2>
  <p style="font-size:0.7em;">Một cuốn sách dày 100 trang. Chữ số 9 xuất hiện bao nhiêu lần ở số trang?</p>
  <p class="fragment" style="font-size:0.6em; color:#92400e;">A. 10 · B. 11 · C. 19 · D. 20</p>
  <p class="fragment dapan">→ D. 20 lần (hàng đơn vị: 10 lần, hàng chục: 10 lần).</p>
</section>

<section>
  <div class="diem">Câu 3/4</div>
  <h2>🐢 Câu 3</h2>
  <p style="font-size:0.7em;">Tam giác có hai góc 40° và 60°. Góc thứ ba là?</p>
  <p class="fragment" style="font-size:0.6em; color:#92400e;">A. 70° · B. 80° · C. 90° · D. 100°</p>
  <p class="fragment dapan">→ B. 80° (tổng ba góc trong tam giác bằng 180°).</p>
</section>

<section>
  <div class="diem">Câu 4/4</div>
  <h2>🐢 Câu 4 — cân não</h2>
  <p style="font-size:0.65em;">Sên leo giếng sâu 10 m. Ngày leo 3 m, đêm tuột 2 m. Sên thoát khỏi giếng vào ngày thứ mấy?</p>
  <p class="fragment" style="font-size:0.6em; color:#92400e;">A. Ngày 10 · B. Ngày 9 · C. Ngày 8 · D. Không bao giờ</p>
  <p class="fragment dapan">→ C. Ngày 8 — sáng ngày 8 sên lên được 7 + 3 = 10 m, thoát ra nên không tuột nữa!</p>
</section>

<section data-background-gradient="linear-gradient(135deg, #fbbf24, #fde68a)">
  <h1>TỔNG KẾT 🏆</h1>
  <p style="font-size:0.65em; color:#431407;">4 đúng = Thiên tài · 3 đúng = Thông minh · 2 đúng = Cần cố gắng · 0–1 đúng =… bằng bạn rùa 🐢</p>
  <p class="fragment" style="font-size:0.5em; color:#7c2d12;">Bạn có câu đố hay? Tạo bài bằng HeyShow rồi đăng Gallery nhé!</p>
</section>`
    },

    {
        id: 'bao-cao-du-an',
        group: 'bao-cao',
        fileName: 'bao-cao-du-an-github.html',
        title: 'Báo cáo dự án — Chuẩn báo cáo repo GitHub',
        desc: 'Vấn đề → giải pháp → kiến trúc → kết quả → roadmap → cách đóng góp; có sơ đồ khối và thẻ số liệu.',
        note: 'Thay <tên dự án>, số liệu và liên kết repo của bạn; sơ đồ kiến trúc vẽ bằng CSS, không cần ảnh.',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#f6f8fa linear-gradient(135deg,#e9eef2,#f6f8fa) !important; }
    .reveal .slides section { box-sizing:border-box; color:#1f2937; border-radius:14px; padding:26px; }
    .reveal h1, .reveal h2, .reveal h4 { color:#0969da !important; }
    .tag { display:inline-block; background:#ddf4ff; border:1px solid #54aeff; color:#0969da;
           border-radius:999px; padding:2px 14px; font-size:0.42em; margin-bottom:12px; }
    .card { background:#ffffff; border:1px solid #d0d7de; border-radius:12px; padding:16px; }
    .so-lieu { font-size:1.5em; font-weight:bold; color:#bc4c00; }
    .reveal pre { background:#ffffff; border:1px solid #d0d7de; color:#24292f; border-radius:10px;
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
    <div class="card" style="border-color:#0969da;">Editor<br><span style="font-size:0.6em;">HTML + preview</span></div>
    <div style="color:#bc4c00; font-size:1.6em;">→</div>
    <div class="card" style="border-color:#1a7f37;">API<br><span style="font-size:0.6em;">Express + file store</span></div>
    <div style="color:#bc4c00; font-size:1.6em;">→</div>
    <div class="card" style="border-color:#bc4c00;">AI Provider<br><span style="font-size:0.6em;">Groq / DeepSeek</span></div>
    <div style="color:#bc4c00; font-size:1.6em;">→</div>
    <div class="card" style="border-color:#8250df;">Trang xem<br><span style="font-size:0.6em;">Reveal.js công khai</span></div>
  </div>
  <p class="fragment" style="font-size:0.5em; color:#59626e;">Tự host trên điện thoại + Cloudflare Tunnel — chi phí ~0đ 🎉</p>
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
        group: 'bao-cao',
        fileName: 'tieu-luan-nghien-cuu.html',
        title: 'Tiểu luận — Trình bày kết quả nghiên cứu',
        desc: 'Bố cục học thuật: tóm tắt → đặt vấn đề → phương pháp → kết quả (biểu đồ) → bàn luận → tài liệu tham khảo.',
        note: 'Biểu đồ vẽ bằng CSS thuần — sửa chiều cao cột / tỉ lệ conic-gradient theo số liệu của bạn.',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#f8fafc linear-gradient(135deg,#e8eef5,#f8fafc) !important; }
    .reveal .slides section { box-sizing:border-box; color:#1f2937; border-radius:14px; padding:28px; }
    .reveal h1, .reveal h2 { color:#0f3d6e !important; }
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
    },

    {
        id: 'giao-an-ngu-van',
        fileName: 'giao-an-ngu-van-dat-nuoc.html',
        title: 'Giáo án — Đất Nước (Ngữ văn 12, 2 tiết)',
        desc: 'Giáo án Ngữ văn theo 5 bước: mục tiêu phát triển năng lực → khởi động → đọc hiểu theo hệ thống câu hỏi → luyện tập → vận dụng sáng tạo.',
        note: 'Đổi bài khác: giữ nguyên khung câu hỏi đọc hiểu (nội dung + nghệ thuật), thay ngữ liệu và đáp án. Các câu trả lời đặt trong fragment để HS nói trước, GV chốt sau.',
        group: 'giao-an',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#f4f7f2 linear-gradient(135deg,#e6efe4,#faf6ec) !important; }
    .reveal .slides section { box-sizing:border-box; color:#26302a; border-radius:14px; padding:28px; }
    .reveal h1, .reveal h2, .reveal h3, .reveal h4 { color:#1f5130 !important; }
    .reveal .chu-de { color:#3f6b46; }
    .giai-doan { display:inline-block; background:#1f5130; color:#f4f7f2;
                 padding:4px 16px; border-radius:999px; font-size:0.45em;
                 font-weight:bold; margin-bottom:14px; }
    .reveal .noi-dung { font-size:0.56em; text-align:left; max-width:800px; margin:0 auto; }
    .reveal .khieu-van { font-style:italic; color:#7c5a2e; font-size:0.6em; }
    .reveal .dap-an { color:#166534; }
    .reveal blockquote { background:#e9f0e6; border-left:4px solid #1f5130;
                         padding:12px 18px; font-size:0.6em; text-align:left;
                         max-width:760px; margin:0 auto; }
  </style>
  <header style="position:absolute; top:10px; left:20px; font-size:0.36em; color:#5b7c60;">
    Giáo án Ngữ văn 12 · Tiết 57–58
  </header>
  <footer style="position:absolute; bottom:10px; right:20px; font-size:0.34em; color:#5b7c60;">
    GV: … · Trường THPT …
  </footer>
</section-master>

<section>
  <h1>ĐẤT NƯỚC</h1>
  <p style="font-size:0.6em;">Nguyễn Đình Thi · Trích trường ca "Mặt đường khát vọng" (1948–1955)</p>
  <p class="chu-de" style="font-size:0.48em;">Đọc hiểu văn bản — 2 tiết</p>
</section>

<section>
  <span class="giai-doan">MỤC TIÊU</span>
  <ul class="noi-dung">
    <li class="fragment">Cảm nhận được tư tưởng Đất Nước của nhân dân và giọng thơ trữ tình pha chính luận của Nguyễn Đình Thi.</li>
    <li class="fragment">Phân tích được hình ảnh thơ, nhịp điệu, sự kết tự sự trong đoạn trích.</li>
    <li class="fragment">Viết được đoạn văn nghị luận 150 chữ về một ý thơ trong bài.</li>
  </ul>
</section>

<section data-background-color="#e6efe4">
  <span class="giai-doan">BƯỚC 1 · KHỞI ĐỘNG</span>
  <h2>Sự kiện nào gợi cho anh/chị về hai chữ "Đất Nước"?</h2>
  <p class="khieu-van">Chiếu 5 hình ảnh: mùa gặt, biên giới, biển đảo, phố cổ, lễ hội — yêu cầu HS viết 1 từ khoá vào phiếu học tập.</p>
  <p class="fragment" style="font-size:0.5em;">→ Kết nối vào bài: mỗi thời đại có một cách định nghĩa Đất Nước của riêng mình.</p>
</section>

<section>
  <span class="giai-doan">BƯỚC 2 · HÌNH THÀNH KIẾN THỨC</span>
  <h2>Tác giả — tác phẩm</h2>
  <ul class="noi-dung">
    <li class="fragment">Nguyễn Đình Thi (1924–2003): nhạc sĩ, nhà văn, nhà thơ — nghệ sĩ đa tài.</li>
    <li class="fragment">"Mặt đường khát vọng" sáng tác 1948–1955; đoạn trích nằm ở giữa trường ca.</li>
    <li class="fragment">Bố cục đoạn trích: Đất Nước mùa thu — Đất Nước gian khổ — Đất Nước của nhân dân.</li>
  </ul>
</section>

<section data-background-gradient="linear-gradient(135deg,#e6efe4,#faf6ec)">
  <span class="giai-doan">ĐỌC HIỂU · PHẦN 1</span>
  <h2>Đất Nước mùa thu</h2>
  <blockquote>"Mùa thu nay khác rồi<br>Tôi đứng vui nghe giữa núi đồi<br>Gió thổi rừng tre phấp phới<br>Trời thu thay áo mới<br>Trong biếc nói cười thiết tha"</blockquote>
  <p class="noi-dung fragment" style="margin-top:16px;"><b>Câu hỏi:</b> Đại từ "tôi" trong khổ thơ là ai? So với "tôi" của thơ mới 1932–1945 thì có gì khác?</p>
  <p class="noi-dung dap-an fragment"><b>Chốt:</b> "tôi" của người chiến sĩ trong niềm vui chiến thắng — cái tôi đã hoà vào cái ta của cộng đồng.</p>
</section>

<section>
  <span class="giai-doan">ĐỌC HIỂU · PHẦN 2</span>
  <h2>Đất Nước gian lao mà anh hùng</h2>
  <ul class="noi-dung">
    <li class="fragment">Hình ảnh buổi đầu kháng chiến, "những đêm dài cơ cực", lời ca dao "giặc đến nhà đàn bà cũng đánh" → chất liệu của lịch sử và dân tộc.</li>
    <li class="fragment">Nhịp thơ đổi: câu dài kể, câu ngắn đúc kết → âm hưởng sử thi.</li>
    <li class="fragment">Nghệ thuật: kết hợp tự sự với trữ tình, dẫn ca dao, dùng thành ngữ.</li>
  </ul>
</section>

<section data-background-color="#dfeadb">
  <span class="giai-doan">ĐỌC HIỂU · PHẦN 3</span>
  <h2>Đất Nước của nhân dân</h2>
  <blockquote>"Nước chúng ta<br>Nước những người chưa bao giờ khuất<br>Đêm đêm rì rầm trong tiếng đất<br>Những buổi ngày xưa vọng nói về"</blockquote>
  <ul class="noi-dung">
    <li class="fragment">Liệt kê những người vô danh: làm ra hạt lúa, truyền ngọn lửa, dạy tiếng nói, làm ra Đất Nước.</li>
    <li class="fragment">Tư tưởng cốt lõi: nhân dân là người làm nên Đất Nước.</li>
    <li class="fragment fragment highlight-current-green">Chú ý: đây là điểm gặp gỡ với tư tưởng "Khoan thư sức dân" của Nguyễn Trãi.</li>
  </ul>
</section>

<section>
  <span class="giai-doan">BƯỚC 3 · LUYỆN TẬP</span>
  <h2>Đọc diễn cảm và hồi đáp</h2>
  <ul class="noi-dung" style="text-align:left; max-width:720px; margin:0 auto;">
    <li>Hai nhóm đọc diễn cảm phần 1 và phần 3; nêu cách nhấn giọng.</li>
    <li class="fragment" style="color:#166534;">→ Gợi ý: phần 1 rộn ràng, hơi nhanh; phần 3 chậm, trang trọng.</li>
    <li>Trả lời 3 câu hỏi cuối bài vào vở.</li>
    <li class="fragment" style="color:#166534;">→ Gợi ý: ngắn gọn theo ý 2 của mỗi mục bài học.</li>
  </ul>
</section>

<section>
  <span class="giai-doan">BƯỚC 4 · VẬN DỤNG</span>
  <h2>Viết đoạn văn 150 chữ</h2>
  <p class="noi-dung">"Đất Nước là những gì gần gũi và thiêng liêng nhất." Anh/chị hiểu ý kiến trên như thế nào? Hãy viết đoạn văn nghị luận.</p>
  <ul class="noi-dung">
    <li class="fragment">Dàn ý nhanh: giải thích → biểu hiện → dẫn chứng từ bài thơ → phản đề → bài học.</li>
    <li class="fragment">Chấm 2 bài bằng rubric 4 mức; nhận xét chung.</li>
  </ul>
</section>

<section data-background-gradient="linear-gradient(135deg,#faf6ec,#dfeadb)">
  <span class="giai-doan">BƯỚC 5 · CỦNG CỐ</span>
  <h2>Cần nhớ</h2>
  <ul class="noi-dung">
    <li class="fragment">Tư tưởng Đất Nước của nhân dân.</li>
    <li class="fragment">Chất sử thi: kết tự sự trong trữ tình, nhịp thơ thay đổi.</li>
    <li class="fragment">Về nhà: soạn phần tiếp theo, học thuộc 10 câu thơ hay nhất.</li>
  </ul>
</section>`
    },

    {
        id: 'giao-an-vat-ly',
        group: 'giao-an',
        fileName: 'giao-an-vat-ly-dinh-luat-ii-newton.html',
        title: 'Giáo án — Định luật II Newton (Vật lí 10, tiết 16)',
        desc: 'Giáo án Vật lí có thực hành: mục tiêu → tình huống hai xe đẩy → phát biểu F = ma → bảng số liệu thí nghiệm kèm đồ thị a(F) → luyện tập → vận dụng vào quãng đường phanh của xe tải.',
        note: 'Thay số liệu bằng kết quả lớp bạn đo; giữ bảng a(F) để học sinh tự vẽ đồ thị. Thiết bị: xe lăn, dây nhẹ, bộ quả nặng, lực kế hoặc cổng quang điện.',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#eff6ff linear-gradient(135deg,#dbeafe,#f8fafc) !important; }
    .reveal .slides section { box-sizing:border-box; color:#1f2937; border-radius:14px; padding:28px; }
    .reveal h1, .reveal h2, .reveal h3, .reveal h4 { color:#1d4ed8 !important; }
    .giai-doan { display:inline-block; background:#1d4ed8; color:#eff6ff;
                 padding:4px 16px; border-radius:999px; font-size:0.45em;
                 font-weight:bold; margin-bottom:14px; }
    .reveal .noi-dung { font-size:0.58em; text-align:left; max-width:800px; margin:0 auto; }
    .reveal .thiet-bi { font-size:0.42em; color:#475569; }
    .reveal table { border-collapse:collapse; font-size:0.5em; margin:8px auto 0; }
    .reveal th, .reveal td { border:1px solid #93c5fd; padding:6px 18px; text-align:center; }
    .reveal th { background:#dbeafe; color:#1e3a8a; }
    .ket-luan { color:#15803d; }
  </style>
  <header style="position:absolute; top:10px; left:20px; font-size:0.36em; color:#5b7ba0;">
    Giáo án Vật lí 10 · Tiết 16 · Động lực học chất điểm
  </header>
  <footer style="position:absolute; bottom:10px; right:20px; font-size:0.34em; color:#5b7ba0;">
    GV: … · Trường THPT …
  </footer>
</section-master>

<section>
  <h1>ĐỊNH LUẬT II NEWTON</h1>
  <p style="font-size:0.6em;">Lực gây ra gia tốc: $\vec{a}$ cùng phương, cùng chiều với hợp lực $\vec{F}$</p>
  <p class="thiet-bi">Thiết bị: xe lăn, dây nhẹ không giãn, bộ quả nặng, lực kế hoặc cổng quang điện nối đồng hồ đo thời gian hiện số</p>
</section>

<section>
  <span class="giai-doan">MỤC TIÊU</span>
  <ul class="noi-dung">
    <li class="fragment">Phát biểu được định luật II Newton, viết được $\vec{F} = m\vec{a}$.</li>
    <li class="fragment">Nêu được ví dụ chứng tỏ gia tốc phụ thuộc vào lực tác dụng và khối lượng.</li>
    <li class="fragment">Tính được gia tốc hoặc hợp lực trong các tình huống đơn giản, vẽ được đồ thị $a(F)$.</li>
    <li class="fragment">Giải thích được vì sao xe tải chở đầy cần quãng đường phanh dài hơn.</li>
  </ul>
</section>

<section data-background-color="#dbeafe">
  <span class="giai-doan">BƯỚC 1 · KHỞI ĐỘNG</span>
  <h2>Đẩy hai xe đẩy</h2>
  <p style="font-size:0.62em;">Hai xe như nhau, một xe chở đầy sách. Đẩy mạnh như nhau thì xe nào nhanh lên rõ hơn? Vì sao?</p>
  <p class="noi-dung fragment">Các nhóm ghi dự đoán vào bảng phụ: <i>“xe nhẹ đi nhanh hơn, chắc tại nó ít cản”</i></p>
  <p class="noi-dung fragment ket-luan">→ Cái “ít cản” ấy hôm nay có tên: <b>quán tính</b>, độ lớn đo bằng khối lượng $m$.</p>
</section>

<section>
  <span class="giai-doan">BƯỚC 2 · HÌNH THÀNH KIẾN THỨC</span>
  <h2>Phát biểu định luật</h2>
  <ul class="noi-dung">
    <li>Gia tốc <b>cùng phương, cùng chiều</b> với hợp lực tác dụng lên vật.</li>
    <li>Độ lớn gia tốc <b>tỉ lệ thuận</b> với hợp lực và <b>tỉ lệ nghịch</b> với khối lượng:</li>
  </ul>
  <p>$$\vec{F} = m\vec{a} \qquad\Leftrightarrow\qquad a = \dfrac{F}{m}$$</p>
  <p class="noi-dung fragment">Vật chịu nhiều lực thì $\vec{F}$ là <b>hợp lực</b> $\vec{F} = \vec{F}_1 + \vec{F}_2 + \vec{F}_3$ (nguyên lí chồng chất lực).</p>
  <p class="noi-dung fragment ket-luan">Đơn vị: 1 N = 1 kg·m/s².</p>
</section>

<section>
  <span class="giai-doan">THÍ NGHIỆM KIỂM CHỨNG</span>
  <h2>Số liệu đo với xe $m = 0{,}5$ kg</h2>
  <div style="display:flex; gap:28px; justify-content:center; align-items:flex-start;">
    <table>
      <tr><th>$F$ (N)</th><th>$a$ đo được</th><th>$F/a$</th></tr>
      <tr><td>1,0</td><td>2,0 m/s²</td><td>0,50</td></tr>
      <tr><td>2,0</td><td>4,1 m/s²</td><td>0,49</td></tr>
      <tr><td>3,0</td><td>5,9 m/s²</td><td>0,51</td></tr>
    </table>
    <svg viewBox="0 0 260 200" style="width:260px; height:200px; background:#ffffff; border-radius:10px;">
      <line x1="30" y1="170" x2="250" y2="170" stroke="#64748b" stroke-width="1.5"/>
      <line x1="30" y1="170" x2="30" y2="15" stroke="#64748b" stroke-width="1.5"/>
      <path class="fragment" d="M 30 170 L 210 40" stroke="#1d4ed8" stroke-width="2.5" fill="none"/>
      <circle class="fragment" cx="90" cy="127" r="5" fill="#d97706"/>
      <circle class="fragment" cx="150" cy="83" r="5" fill="#d97706"/>
      <circle class="fragment" cx="210" cy="40" r="5" fill="#d97706"/>
      <text x="236" y="188" fill="#475569" font-size="14" fill="#475569">F</text>
      <text x="10" y="28" fill="#475569" font-size="14">a</text>
    </svg>
  </div>
  <p class="noi-dung fragment ket-luan">$F/a$ luôn xấp xỉ $m$ ⇒ $a$ tỉ lệ thuận với $F$. Phần sai lệch nhỏ là do ma sát trượt của bánh xe.</p>
</section>

<section>
  <span class="giai-doan">BƯỚC 3 · LUYỆN TẬP</span>
  <h2>Tính nhanh</h2>
  <ul class="noi-dung">
    <li>C1: Hợp lực 12 N tác dụng lên xe 3 kg trên mặt phẳng ngang, bỏ qua ma sát. Gia tốc bằng bao nhiêu?</li>
    <li class="fragment ket-luan">→ $a = \dfrac{12}{3} = 4$ m/s².</li>
    <li style="margin-top:12px;">C2: Muốn xe 8 kg thu được gia tốc 2 m/s² thì hợp lực phải bằng bao nhiêu?</li>
    <li class="fragment ket-luan">→ $F = 8 \times 2 = 16$ N.</li>
    <li style="margin-top:12px;">C3: Vật 5 kg chịu hai lực vuông góc $F_1 = 6$ N và $F_2 = 8$ N.</li>
    <li class="fragment ket-luan">→ $F = \sqrt{6^2 + 8^2} = 10$ N ⇒ $a = 2$ m/s².</li>
  </ul>
</section>

<section>
  <span class="giai-doan">BƯỚC 4 · VẬN DỤNG &amp; MỞ RỘNG</span>
  <h2>Vì sao xe tải chở đầy phanh lâu dừng hơn?</h2>
  <p style="font-size:0.6em;">Lực hãm của phanh gần như không đổi, mà $m$ tăng ⇒ $a = \dfrac{F}{m}$ nhỏ đi ⇒ xe giảm tốc chậm hơn.</p>
  <p class="noi-dung fragment">Quãng đường phanh $s = \dfrac{v^2}{2a}$ dài ra — vì vậy xe tải cần khoảng cách an toàn lớn hơn xe con.</p>
  <p class="noi-dung fragment ket-luan">Mở rộng: trên trạm vũ trụ không cân được bằng cân thông thường; người ta tạo một lực đã biết, đo gia tốc rồi suy ra khối lượng theo đúng định luật II.</p>
</section>

<section data-background-gradient="linear-gradient(135deg,#dbeafe,#f8fafc)">
  <span class="giai-doan">BƯỚC 5 · CỦNG CỐ</span>
  <h2>Cần nhớ</h2>
  <ul class="noi-dung">
    <li class="fragment">$\vec{F} = m\vec{a}$ là hệ thức <b>vec-tơ</b>: gia tốc cùng chiều hợp lực.</li>
    <li class="fragment">$a$ phụ thuộc cả lực và khối lượng; khối lượng là số đo quán tính.</li>
    <li class="fragment">Muốn vật nhanh lên hơn: tăng hợp lực hoặc giảm khối lượng.</li>
    <li class="fragment">Về nhà: bài tập 15.1–15.5 trong Sách bài tập Vật lí 10 và vẽ lại đồ thị $a(F)$ vào vở.</li>
  </ul>
</section>`
    },

    {
        id: 'giao-an-hoa-hoc',
        group: 'giao-an',
        fileName: 'giao-an-hoa-hoc-toc-do-phan-ung.html',
        title: 'Giáo án — Tốc độ phản ứng hoá học (Hoá học 10, 2 tiết)',
        desc: 'Giáo án có thí nghiệm theo nhóm: biểu thức tính tốc độ trung bình → bốn yếu tố ảnh hưởng (bề mặt, nồng độ, nhiệt độ, chất xúc tác) kèm bảng hoá chất và slide an toàn → bài tập → vận dụng đời sống.',
        note: 'Trường thiếu hoá chất có thể thay bằng giấm – baking soda, đường viên – đường bột, nước nóng – nước lạnh; vẫn giữ nguyên bảng thí nghiệm bốn yếu tố.',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#ecfeff linear-gradient(135deg,#cffafe,#f0fdfa) !important; }
    .reveal .slides section { box-sizing:border-box; color:#1f2937; border-radius:14px; padding:26px; }
    .reveal h1, .reveal h2, .reveal h3, .reveal h4 { color:#0f766e !important; }
    .giai-doan { display:inline-block; background:#0f766e; color:#ecfeff; padding:4px 16px;
                 border-radius:999px; font-size:0.45em; font-weight:bold; margin-bottom:14px; }
    .reveal .noi-dung { font-size:0.55em; text-align:left; max-width:860px; margin:0 auto; }
    .reveal .thiet-bi { font-size:0.42em; color:#475569; }
    .reveal table { border-collapse:collapse; font-size:0.42em; margin:8px auto 0; }
    .reveal th, .reveal td { border:1px solid #99e2d0; padding:6px 12px; text-align:left; vertical-align:top; }
    .reveal th { background:#ccfbf1; color:#115e59; }
    .hs { color:#15803d; }
    .an-toan { background:#fef2f2; border-left:4px solid #dc2626; color:#991b1b;
               padding:10px 16px; font-size:0.48em; text-align:left;
               max-width:780px; margin:12px auto 0; border-radius:8px; }
  </style>
  <header style="position:absolute; top:10px; left:20px; font-size:0.36em; color:#3f7d76;">
    Giáo án Hoá học 10 · Tiết 18–19
  </header>
  <footer style="position:absolute; bottom:10px; right:20px; font-size:0.34em; color:#3f7d76;">
    GV: … · Trường THPT …
  </footer>
</section-master>

<section>
  <h1>TỐC ĐỘ PHẢN ỨNG HOÁ HỌC</h1>
  <p style="font-size:0.58em;">Làm cho phản ứng xảy ra nhanh hơn — hoặc chậm lại — bằng cách nào?</p>
  <p class="thiet-bi">Hoá chất &amp; dụng cụ: Zn hạt và Zn bột, dung dịch HCl 0,1 M và 0,2 M, $H_2O_2$, bột $MnO_2$; ống nghiệm, giá đỡ, nhiệt kế, cốc nước nóng 60 °C, đóm/tàn đóm</p>
</section>

<section>
  <span class="giai-doan">MỤC TIÊU</span>
  <ul class="noi-dung">
    <li class="fragment">Viết được biểu thức tốc độ phản ứng trung bình $v = \dfrac{|\Delta C|}{\Delta t}$ và nêu được đơn vị.</li>
    <li class="fragment">Tiến hành được 4 thí nghiệm, quan sát và rút ra kết luận về các yếu tố ảnh hưởng.</li>
    <li class="fragment">Giải thích được hiện tượng thực tế và đề xuất biện pháp làm nhanh/chậm phản ứng.</li>
    <li class="fragment">Chấp hành quy tắc an toàn hoá chất khi thực hành theo nhóm.</li>
  </ul>
</section>

<section data-background-color="#cffafe">
  <span class="giai-doan">BƯỚC 1 · KHỞI ĐỘNG</span>
  <h2>Ba hiện tượng, một câu hỏi</h2>
  <ul class="noi-dung">
    <li>Thức ăn để trong tủ lạnh lâu hỏng hơn để ngoài trời.</li>
    <li>Than tổ ong được khoét nhiều lỗ nhỏ; củi phải chẻ và quạt gió.</li>
    <li>Ninh xương bằng nồi áp suất nhanh nhừ hơn nồi thường.</li>
    <li class="fragment hs">→ Mỗi hiện tượng giấu một <b>điều kiện làm phản ứng nhanh hoặc chậm</b>. Hôm nay ta gọi tên và kiểm chứng từng điều kiện.</li>
  </ul>
</section>

<section>
  <span class="giai-doan">BƯỚC 2 · HÌNH THÀNH KIẾN THỨC</span>
  <h2>Tốc độ phản ứng trung bình</h2>
  <p style="font-size:0.58em;">Cho phản ứng $Zn + 2HCl \rightarrow ZnCl_2 + H_2\uparrow$. Nồng độ HCl giảm từ 0,10 M xuống 0,06 M trong 20 giây:</p>
  <p>$$v = \dfrac{|\Delta C|}{\Delta t} = \dfrac{0{,}10 - 0{,}06}{20} = 0{,}002\ \text{mol}\cdot\text{L}^{-1}\cdot\text{s}^{-1}$$</p>
  <ul class="noi-dung">
    <li class="fragment">Có thể tính theo chất tham gia (nồng độ giảm) hoặc chất sản phẩm (nồng độ tăng, kết tủa, thể tích khí thoát ra).</li>
    <li class="fragment">$v$ chỉ cho biết phản ứng <b>nhanh hay chậm</b>, không cho biết phản ứng xảy ra đến đâu.</li>
  </ul>
</section>

<section>
  <span class="giai-doan">THÍ NGHIỆM THEO NHÓM</span>
  <h2>Bốn yếu tố ảnh hưởng</h2>
  <table>
    <tr><th>Nhóm</th><th>Thí nghiệm</th><th>Hiện tượng</th><th>Kết luận</th></tr>
    <tr><td>1</td><td>Zn hạt / Zn bột + 5 ml HCl 0,1 M</td><td class="fragment hs">Ống dùng Zn bột sủi bọt mạnh hơn</td><td class="fragment hs">Tăng diện tích tiếp xúc → nhanh hơn</td></tr>
    <tr><td>2</td><td>Zn hạt + HCl 0,1 M / 0,2 M</td><td class="fragment hs">Ống 0,2 M sủi bọt dữ dội hơn</td><td class="fragment hs">Tăng nồng độ → nhanh hơn</td></tr>
    <tr><td>3</td><td>Hai ống như nhau, một ngâm nước nóng 60 °C</td><td class="fragment hs">Ống nóng sủi bọt nhanh hơn</td><td class="fragment hs">Tăng nhiệt độ → nhanh hơn</td></tr>
    <tr><td>4</td><td>5 ml $H_2O_2$, ống thứ hai thêm ít bột $MnO_2$; đưa tàn đóm vào</td><td class="fragment hs">Ống có $MnO_2$ sủi bọt mạnh, tàn đóm bùng lại</td><td class="fragment hs">Chất xúc tác → nhanh hơn, không bị tiêu hao</td></tr>
  </table>
  <div class="an-toan"><b>An toàn thực hành:</b> đeo kính bảo hộ; chỉ dùng HCl 0,1–0,2 M; lấy hoá chất lỏng bằng ống nhỏ giọt; $H_2O_2$ và $MnO_2$ dùng lượng nhỏ; chất thải cho vào bình quy định, không đổ ra bồn rửa.</div>
</section>

<section>
  <span class="giai-doan">BƯỚC 3 · LUYỆN TẬP</span>
  <h2>Tính tốc độ và giải thích</h2>
  <ul class="noi-dung">
    <li>Bài 1: Nồng độ chất A theo thời gian: 0 s — 0,80 M; 10 s — 0,50 M; 20 s — 0,30 M. Tính $v$ trung bình trong hai khoảng thời gian.</li>
    <li class="fragment hs">→ 10 s đầu: $v = 0{,}03$; 10 s sau: $v = 0{,}02\ \text{mol}\cdot\text{L}^{-1}\cdot\text{s}^{-1}$ — tốc độ giảm vì nồng độ giảm.</li>
    <li style="margin-top:12px;">Bài 2: Vì sao phản ứng tổng hợp $NH_3$ trong công nghiệp được thực hiện ở áp suất cao và có bột sắt?</li>
    <li class="fragment hs">→ Tăng nồng độ khí (áp suất cao) và dùng chất xúc tác Fe.</li>
    <li style="margin-top:12px;">Bài 3: Pha loãng dung dịch HCl bằng nước thì lượng khí $H_2$ thoát ra nhanh lên hay chậm lại?</li>
    <li class="fragment hs">→ Chậm lại: nồng độ HCl giảm.</li>
  </ul>
</section>

<section>
  <span class="giai-doan">BƯỚC 4 · VẬN DỤNG</span>
  <h2>Đề xuất cho ba tình huống</h2>
  <ul class="noi-dung">
    <li>(a) Muốn ninh thịt nhanh nhừ.</li>
    <li class="fragment">→ Tăng nhiệt độ (nồi áp suất), cắt nhỏ miếng thịt — nhiệt độ và diện tích tiếp xúc.</li>
    <li style="margin-top:10px;">(b) Muốn sữa tươi để được lâu hơn.</li>
    <li class="fragment">→ Hạ nhiệt độ (tủ lạnh), giảm nồng độ ôxi (đậy nắp hộp).</li>
    <li style="margin-top:10px;">(c) Rửa chảo dầu mỡ.</li>
    <li class="fragment">→ Nước nóng cộng nước rửa bát: tăng nhiệt độ và diện tích tiếp xúc giữa chất béo và chất tẩy.</li>
  </ul>
  <p class="noi-dung fragment hs">Mở rộng: vì sao trong nhà máy người ta nghiền nguyên liệu thật mịn trước khi cho vào lò?</p>
</section>

<section data-background-gradient="linear-gradient(135deg,#cffafe,#f0fdfa)">
  <span class="giai-doan">BƯỚC 5 · CỦNG CỐ</span>
  <h2>Bốn yếu tố — một biểu thức</h2>
  <ul class="noi-dung">
    <li class="fragment">$v = \dfrac{|\Delta C|}{\Delta t}$, đơn vị $\text{mol}\cdot\text{L}^{-1}\cdot\text{s}^{-1}$.</li>
    <li class="fragment">Bề mặt tiếp xúc · nồng độ · nhiệt độ · chất xúc tác.</li>
    <li class="fragment">Ánh sáng và bản chất chất tham gia cũng làm tốc độ thay đổi (hương mở rộng).</li>
    <li class="fragment">Về nhà: bài 1–4 sách giáo khoa trang “Tốc độ phản ứng”; chuẩn bị mẫu báo cáo thực hành tiết sau.</li>
  </ul>
</section>`
    },

    {
        id: 'giao-an-sinh-hoc',
        group: 'giao-an',
        fileName: 'giao-an-sinh-hoc-van-chuyen-qua-mang.html',
        title: 'Giáo án — Vận chuyển các chất qua màng sinh chất (Sinh học 10, tiết 12)',
        desc: 'Giáo án Sinh học: bảng so sánh vận chuyển thụ động / chủ động / nhập bào, thí nghiệm co nguyên sinh trên biểu bì lá hành, phiếu bài tập và liên hệ muối dưa, truyền dịch, bón phân.',
        note: 'Cần: kính hiển vi, củ hành ta, lam kính và lamen, nước cất, dung dịch NaCl 8%. Thiếu kính hiển vi thì thay bằng video quan sát, vẫn giữ nguyên phiếu bài tập.',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#f2f7f0 linear-gradient(135deg,#e6f0e6,#f7fbf5) !important; }
    .reveal .slides section { box-sizing:border-box; color:#1e2a22; border-radius:14px; padding:26px; }
    .reveal h1, .reveal h2, .reveal h3 { color:#2f6d3a !important; }
    .giai-doan { display:inline-block; background:#2f6d3a; color:#ffffff; padding:4px 16px;
                 border-radius:999px; font-size:0.45em; font-weight:bold; margin-bottom:14px; }
    .reveal .noi-dung { font-size:0.55em; text-align:left; max-width:860px; margin:0 auto; }
    .reveal .thiet-bi { font-size:0.42em; color:#5b7c60; }
    .reveal table { border-collapse:collapse; font-size:0.44em; margin:8px auto 0; }
    .reveal th, .reveal td { border:1px solid #b9d3bd; padding:6px 13px; vertical-align:top; }
    .reveal th { background:#e2efe3; color:#24512c; }
    .dap-an { color:#1c7c3c; font-weight:bold; }
    .reveal blockquote { background:#e6f0e6; border-left:4px solid #2f6d3a; padding:10px 16px;
                         font-size:0.55em; text-align:left; max-width:780px; margin:0 auto; }
  </style>
  <header style="position:absolute; top:10px; left:20px; font-size:0.36em; color:#5b7c60;">
    Giáo án Sinh học 10 · Tiết 12 · Cấu trúc và chức năng của màng sinh chất
  </header>
  <footer style="position:absolute; bottom:10px; right:20px; font-size:0.34em; color:#5b7c60;">
    GV: … · Trường THPT …
  </footer>
</section-master>

<section>
  <h1>VẬN CHUYỂN CÁC CHẤT QUA MÀNG SINH CHẤT</h1>
  <p style="font-size:0.58em;">Màng bán thấm chọn lọc: cái gì đi qua, cái gì phải “trả phí” bằng năng lượng?</p>
  <p class="thiet-bi">Thiết bị: kính hiển vi, củ hành ta, lam kính + lamen, nước cất, dung dịch NaCl 8%, đường cô đặc; video tế bào hồng cầu trong dung dịch ưu trương</p>
</section>

<section>
  <span class="giai-doan">MỤC TIÊU</span>
  <ul class="noi-dung">
    <li class="fragment">Phân biệt được vận chuyển thụ động và vận chuyển chủ động theo các tiêu chí: chiều gradient, năng lượng, chất trung gian.</li>
    <li class="fragment">Giải thích được hiện tượng co nguyên sinh và phản co nguyên sinh.</li>
    <li class="fragment">Tiến hành được thí nghiệm quan sát trên biểu bì lá hành dưới kính hiển vi.</li>
    <li class="fragment">Vận dụng giải thích muối dưa cà, bón phân, truyền dịch ưu trương/đẳng trương.</li>
  </ul>
</section>

<section data-background-color="#e6f0e6">
  <span class="giai-doan">BƯỚC 1 · KHỞI ĐỘNG</span>
  <h2>Quan sát ba hiện tượng</h2>
  <ul class="noi-dung">
    <li>Cà rốt ngâm nước muối mềm và co lại.</li>
    <li>Cây héo rũ khi bón quá nhiều phân.</li>
    <li>Tế bào hồng cầu đặt trong nước cất thì trương lên, vỡ ra.</li>
  </ul>
  <p class="noi-dung fragment dap-an">→ Cả ba đều là nước đi qua màng: từ nơi có nồng độ chất tan <b>thấp</b> đến nơi có nồng độ <b>cao</b>. Tên gọi: <b>thẩm thấu</b>.</p>
</section>

<section>
  <span class="giai-doan">BƯỚC 2 · HÌNH THÀNH KIẾN THỨC</span>
  <h2>Ba phương thức vận chuyển</h2>
  <table>
    <tr><th>Phương thức</th><th>Chiều vận chuyển</th><th>Năng lượng</th><th>Ví dụ</th></tr>
    <tr class="fragment"><td>Thụ động (khuếch tán trực tiếp, qua kênh protein)</td><td>Thuận chiều gradient nồng độ</td><td>Không tiêu tốn ATP</td><td>$O_2$, $CO_2$, nước (kênh aquaporin), glucose vào hồng cầu</td></tr>
    <tr class="fragment"><td>Chủ động (bơm protein)</td><td>Ngược gradient nồng độ</td><td>Cần ATP</td><td>Bơm $Na^+/K^+$, rễ cây hấp thụ ion khoáng</td></tr>
    <tr class="fragment"><td>Nhập bào / xuất bào</td><td>Vận chuyển đại phân tử</td><td>Cần ATP</td><td>Bạch cầu nuốt vi khuẩn; tế bào tuyến tiết enzyme</td></tr>
  </table>
  <p class="noi-dung fragment dap-an">Màng có tính <b>chọn lọc bán thấm</b>: kích thước phân tử, độ tan trong lipid và kênh protein quyết định chất nào được qua.</p>
</section>

<section>
  <span class="giai-doan">THÍ NGHIỆM · CO NGUYÊN SINH</span>
  <h2>Quan sát trên biểu bì lá hành</h2>
  <ol class="noi-dung">
    <li>Bóc biểu bì màu tím mặt dưới lá hành, đặt lên lam kính nhỏ nước cất → quan sát ở vật kính 10× rồi 40×.</li>
    <li class="fragment">Nhỏ dung dịch NaCl 8% vào một đầu lamen, dùng giấy thấm hút nước ở đầu kia để thay thế dung dịch.</li>
    <li class="fragment">Hiện tượng: túi nguyên sinh co lại, màu tím đậm hơn, tế bào chất rút khỏi thành.</li>
    <li class="fragment">Nhỏ tiếp nước cất → tế bào phản co nguyên sinh, trở lại như ban đầu.</li>
  </ol>
  <p class="noi-dung fragment dap-an">Kết luận: NaCl 8% là môi trường <b>ưu trương</b> — nước ra khỏi tế bào; nếu kéo dài tế bào chết vì mất nước.</p>
</section>

<section>
  <span class="giai-doan">BƯỚC 3 · LUYỆN TẬP</span>
  <h2>Trả lời nhanh</h2>
  <ul class="noi-dung">
    <li>C1: Vì sao nói vận chuyển thụ động không cần năng lượng?</li>
    <li class="fragment dap-an">→ Chất đi <i>thuận</i> chiều gradient nồng độ, động lực là chính sự chênh lệch đó.</li>
    <li style="margin-top:10px;">C2: Rễ cây hấp thụ ion khoáng từ đất nơi có nồng độ loãng hơn dịch tế bào rễ — bằng phương thức nào?</li>
    <li class="fragment dap-an">→ Vận chuyển chủ động, phải tiêu tốn ATP.</li>
    <li style="margin-top:10px;">C3: Vì sao không nên uống nước ngọt cô đặc quá đậm?</li>
    <li class="fragment dap-an">→ Môi trường ưu trương kéo nước ra khỏi tế bào niêm mạc và tế bào máu.</li>
  </ul>
</section>

<section>
  <span class="giai-doan">BƯỚC 4 · VẬN DỤNG</span>
  <h2>Giải thích và đề xuất</h2>
  <ul class="noi-dung">
    <li>Muối dưa, làm cà pháo: đường và muối tạo môi trường ưu trương → nước trong tế bào rau ra ngoài, rau héo mềm và lên men.</li>
    <li class="fragment">Bón phân đậm đặc cây bị héo (“cháy lá”) → nguyên tắc: <b>pha loãng, bón sau khi tưới đủ ẩm</b>.</li>
    <li class="fragment">Bệnh nhân truyền dịch NaCl 0,9% (đẳng trương) để hồng cầu không trương hay vỡ.</li>
    <li class="fragment">Bảo quản thực phẩm bằng ướp muối/đường: vi sinh vật mất nước nên không hoạt động.</li>
  </ul>
  <p class="noi-dung fragment dap-an">Nhóm nào nêu thêm được một hiện tượng ở gia đình mình?</p>
</section>

<section data-background-color="#e6f0e6">
  <span class="giai-doan">BƯỚC 5 · CỦNG CỐ</span>
  <h2>Sơ kết bài học</h2>
  <ul class="noi-dung">
    <li class="fragment">Thụ động: thuận gradient, không cần ATP. Chủ động: ngược gradient, cần ATP.</li>
    <li class="fragment">Nhập bào/xuất bào: màng biến dạng, dùng cho chất kích thước lớn.</li>
    <li class="fragment">Ưu trương — tế bào mất nước; nhược trương — tế bào trương; đẳng trương — cân bằng.</li>
    <li class="fragment">Về nhà: hoàn thành báo cáo thí nghiệm co nguyên sinh và trả lời câu hỏi 1–4 sách giáo khoa.</li>
  </ul>
</section>`
    },

    {
        id: 'giao-an-lich-su',
        group: 'giao-an',
        fileName: 'giao-an-lich-su-van-minh-ai-cap.html',
        title: 'Giáo án — Văn minh Ai Cập cổ đại (Lịch sử 10, tiết 9)',
        desc: 'Giáo án khai thác nguồn sử liệu: câu nói của Hérodote → điều kiện tự nhiên và kinh tế → bảng thành tựu (chữ viết, toán, lịch, kiến trúc, y học) → phiếu học tập nhóm → liên hệ hiện tại.',
        note: 'Chèn ảnh bản đồ và ảnh di sản do trường cho phép dùng, luôn ghi nguồn ảnh ở góc slide — đây là cách rèn học sinh ý thức về sử liệu và bản quyền.',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#fdf6e9 linear-gradient(135deg,#f5e6cc,#fdf9f0) !important; }
    .reveal .slides section { box-sizing:border-box; color:#3b2a17; border-radius:14px; padding:26px; }
    .reveal h1, .reveal h2, .reveal h3, .reveal h4 { color:#92400e !important; }
    .giai-doan { display:inline-block; background:#92400e; color:#fdf6e9; padding:4px 16px;
                 border-radius:999px; font-size:0.45em; font-weight:bold; margin-bottom:14px; }
    .reveal .noi-dung { font-size:0.55em; text-align:left; max-width:840px; margin:0 auto; }
    .reveal .thiet-bi { font-size:0.42em; color:#8a6a4a; }
    .reveal table { border-collapse:collapse; font-size:0.44em; margin:8px auto 0; }
    .reveal th, .reveal td { border:1px solid #e0c9a6; padding:6px 13px; vertical-align:top; text-align:left; }
    .reveal th { background:#f3e3c8; color:#7c4a03; }
    .dich { color:#166534; }
    .reveal blockquote { background:#f7ead3; border-left:4px solid #b45309; padding:12px 18px;
                         font-size:0.6em; font-style:italic; color:#5c3a1a; text-align:left;
                         max-width:760px; margin:0 auto; }
    .nguon { font-size:0.36em; color:#8a6a4a; }
  </style>
  <header style="position:absolute; top:10px; left:20px; font-size:0.36em; color:#8a6a4a;">
    Giáo án Lịch sử 10 · Tiết 9 · Một số nền văn minh thế giới thời cổ – trung đại
  </header>
  <footer style="position:absolute; bottom:10px; right:20px; font-size:0.34em; color:#8a6a4a;">
    GV: … · Trường THPT …
  </footer>
</section-master>

<section>
  <h1>VĂN MINH AI CẬP CỔ ĐẠI</h1>
  <p style="font-size:0.6em;">Lưu vực sông Nile · khoảng 3150 TCN đến năm 30 TCN</p>
  <p class="thiet-bi">Thiết bị: bản đồ châu Phi và lưu vực sông Nile, ảnh Kim tự tháp Giza và bia đá chữ tượng hình, phiếu học tập, video 2 phút về tục ướp xác</p>
</section>

<section>
  <span class="giai-doan">MỤC TIÊU</span>
  <ul class="noi-dung">
    <li class="fragment">Trình bày được điều kiện tự nhiên và hoạt động kinh tế chủ yếu của cư dân Ai Cập cổ đại.</li>
    <li class="fragment">Nêu được một số thành tựu tiêu biểu: chữ viết, toán học, lịch, kiến trúc, y học.</li>
    <li class="fragment">Khai thác thông tin từ tư liệu hình ảnh và văn tự để lập bảng so sánh.</li>
    <li class="fragment">Chỉ ra được ảnh hưởng của các thành tựu đó tới đời sống hôm nay.</li>
  </ul>
</section>

<section data-background-color="#f5e6cc">
  <span class="giai-doan">BƯỚC 1 · KHỞI ĐỘNG</span>
  <h2>Một câu nói cần giải thích</h2>
  <blockquote>“Ai Cập là quà tặng của sông Nile.” — Hérodote, thế kỷ V TCN</blockquote>
  <p class="noi-dung fragment">Quan sát bản đồ: vì sao con sông này lại quyết định sự sống của cả nền văn minh?</p>
  <p class="noi-dung fragment dich">→ Giữ lại câu trả lời của học sinh, cuối bài sẽ quay lại kiểm tra.</p>
</section>

<section>
  <span class="giai-doan">BƯỚC 2 · HÌNH THÀNH KIẾN THỨC</span>
  <h2>Từ điều kiện tự nhiên đến đời sống</h2>
  <ul class="noi-dung">
    <li>Sông Nile dâng nước hằng năm, bồi phù sa màu mỡ hai bên bờ ⇒ trồng lúa mì, lúa mạch, lanh.</li>
    <li class="fragment">Muốn trị thuỷ và chia lại ruộng sau mỗi mùa lũ, cư dân phải đo đạc ⇒ <b>toán học và thiên văn</b> phát triển sớm.</li>
    <li class="fragment">Nghề nông cần theo dõi mùa nước ⇒ quan sát mặt trời, mặt trăng, sao Thiên Lang (Sirius) ⇒ <b>làm lịch</b>.</li>
    <li class="fragment">Sản xuất thặng dư, cần trị thuỷ quy mô lớn ⇒ xuất hiện nhà nước quân chủ, đứng đầu là <b>Pha-ra-ông</b>.</li>
  </ul>
  <p class="noi-dung fragment dich">Sơ đồ: Tự nhiên → Nhu cầu sản xuất → Thành tựu văn minh.</p>
</section>

<section>
  <span class="giai-doan">THÀNH TỰU VĂN MINH</span>
  <h2>Bảng tra cứu nhanh</h2>
  <table>
    <tr><th>Lĩnh vực</th><th>Thành tựu tiêu biểu</th><th>Ảnh hưởng tới hôm nay</th></tr>
    <tr class="fragment"><td>Chữ viết</td><td>Chữ tượng hình, viết trên giấy papyrus; chữ thầy tu</td><td class="dich">Ý nghĩa “bảng chữ cái”, nghề làm giấy</td></tr>
    <tr class="fragment"><td>Toán học</td><td>Hệ thập phân, tính diện tích, thể tích, số π sơ khai</td><td class="dich">Hình học đo đạc, kiến trúc</td></tr>
    <tr class="fragment"><td>Lịch</td><td>Một năm 365 ngày, 12 tháng, mỗi tháng 30 ngày + 5 ngày dư</td><td class="dich">Dương lịch chúng ta dùng</td></tr>
    <tr class="fragment"><td>Kiến trúc</td><td>Kim tự tháp Giza, đền Karnak, tượng Nhân sư</td><td class="dich">Kỹ thuật xây dựng, di sản thế giới</td></tr>
    <tr class="fragment"><td>Y học &amp; khoa học</td><td>Phẫu thuật, dùng thảo dược, giải phẫu nhờ tục ướp xác</td><td class="dich">Y học thực hành</td></tr>
  </table>
</section>

<section data-background-color="#f3e3c8">
  <span class="giai-doan">HOẠT ĐỘNG NHÓM</span>
  <h2>Phiếu học tập · 6 phút</h2>
  <ol class="noi-dung">
    <li>Chọn 2 thành tựu mà nhóm em cho rằng còn ảnh hưởng rõ nhất tới hôm nay.</li>
    <li>Tìm 2 dẫn chứng cho mỗi thành tựu (một vật dụng, một thói quen, một con số).</li>
    <li>Đại diện trình bày 1 phút; nhóm khác bổ sung hoặc phản biện.</li>
  </ol>
  <p class="noi-dung fragment dich">Gợi ý: 12 tháng và 24 giờ mỗi ngày; cách viết tắt, chữ cái; lịch nông nghiệp.</p>
</section>

<section>
  <span class="giai-doan">BƯỚC 3 · LUYỆN TẬP</span>
  <h2>Củng cố từng ý</h2>
  <ul class="noi-dung">
    <li>C1: Nghề nào là nền tảng của văn minh Ai Cập? bằng chứng nào cho điều đó?</li>
    <li class="fragment dich">→ Nông nghiệp lúa nước ven sông Nile; lịch, toán, trị thuỷ đều sinh ra từ nông nghiệp.</li>
    <li style="margin-top:10px;">C2: Thành tựu nào giúp chúng ta biết nhiều về Ai Cập nhờ được giải mã?</li>
    <li class="fragment dich">→ Chữ viết và bia đá (đá Rosetta là ví dụ kinh điển).</li>
    <li style="margin-top:10px;">C3: Đúng hay sai: “Toàn bộ thành tựu Ai Cập phục vụ giai cấp thống trị.”</li>
    <li class="fragment dich">→ Sai — nhiều thành tựu xuất phát từ nhu cầu sản xuất và đời sống của cộng đồng.</li>
  </ul>
</section>

<section>
  <span class="giai-doan">BƯỚC 4 · VẬN DỤNG</span>
  <h2>Quay lại câu nói của Hérodote</h2>
  <p class="noi-dung">Bây giờ, hãy giải thích câu “Ai Cập là quà tặng của sông Nile” bằng 3 ý, mỗi ý một dẫn chứng từ bài học.</p>
  <ul class="noi-dung">
    <li class="fragment dich">Phù sa ⇒ nông nghiệp ⇒ thặng dư lương thực.</li>
    <li class="fragment dich">Mùa lũ ⇒ trị thuỷ, đo ruộng ⇒ toán học và lịch.</li>
    <li class="fragment dich">Giao thương trên sông ⇒ nhà nước thống nhất và các công trình lớn.</li>
  </ul>
  <p class="noi-dung fragment">Mở rộng: vị trí của sông Nile hôm nay còn là vấn đề an ninh nguồn nước của nhiều quốc gia.</p>
</section>

<section data-background-gradient="linear-gradient(135deg,#f5e6cc,#fdf9f0)">
  <span class="giai-doan">BƯỚC 5 · CỦNG CỐ</span>
  <h2>Cần nhớ</h2>
  <ul class="noi-dung">
    <li class="fragment">Văn minh Ai Cập gắn với sông Nile và nền nông nghiệp lúa nước.</li>
    <li class="fragment">Năm thành tựu lớn: chữ viết, toán, lịch, kiến trúc, y học.</li>
    <li class="fragment">Bài học: thành tựu văn minh bắt nguồn từ nhu cầu thực tiễn.</li>
    <li class="fragment">Về nhà: lập bảng so sánh văn minh Ai Cập và văn minh Lưỡng Hà (kinh tế, chữ viết, lịch, luật).</li>
  </ul>
  <p class="nguon">Ảnh trong bài: nguồn tư liệu do giáo viên cung cấp · Bản đồ lưu vực sông Nile.</p>
</section>`
    },

    {
        id: 'giao-an-dia-li',
        group: 'giao-an',
        fileName: 'giao-an-dia-li-vi-tri-lanh-tho.html',
        title: 'Giáo án — Vị trí địa lí và phạm vi lãnh thổ Việt Nam (Địa lí, tiết 1)',
        desc: 'Giáo án có thực hành bản đồ: bốn điểm cực và hệ toạ độ → lãnh thổ đất liền và vùng biển → bốn nhóm ý nghĩa → khai thác Atlat bằng phiếu học tập → viết đoạn văn vận dụng.',
        note: 'Số liệu diện tích, toạ độ và tên đơn vị hành chính hãy đối chiếu lại với sách giáo khoa và Atlat bản đang dùng — địa danh cấp huyện, cấp tỉnh đã đổi do sáp nhập.',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#eff8fb linear-gradient(135deg,#d5eef5,#f4fbfd) !important; }
    .reveal .slides section { box-sizing:border-box; color:#1f2937; border-radius:14px; padding:26px; }
    .reveal h1, .reveal h2, .reveal h3, .reveal h4 { color:#0e7490 !important; }
    .giai-doan { display:inline-block; background:#0e7490; color:#ecfeff; padding:4px 16px;
                 border-radius:999px; font-size:0.45em; font-weight:bold; margin-bottom:14px; }
    .reveal .noi-dung { font-size:0.55em; text-align:left; max-width:860px; margin:0 auto; }
    .reveal .thiet-bi { font-size:0.42em; color:#4b6b7a; }
    .reveal table { border-collapse:collapse; font-size:0.46em; margin:8px auto 0; }
    .reveal th, .reveal td { border:1px solid #a5d8e6; padding:6px 16px; text-align:center; }
    .reveal th { background:#d5eef5; color:#0c4a6e; }
    .hs { color:#15803d; }
    .y-nghia { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; font-size:0.44em; max-width:900px; margin:0 auto; }
    .y-nghia > div { flex:1; min-width:210px; background:#ffffff; border:1px solid #a5d8e6;
                     border-radius:10px; padding:12px; text-align:left; }
  </style>
  <header style="position:absolute; top:10px; left:20px; font-size:0.36em; color:#4b6b7a;">
    Giáo án Địa lí · Tiết 1 · Vị trí địa lí và phạm vi lãnh thổ Việt Nam
  </header>
  <footer style="position:absolute; bottom:10px; right:20px; font-size:0.34em; color:#4b6b7a;">
    GV: … · Trường THPT …
  </footer>
</section-master>

<section>
  <h1>VỊ TRÍ ĐỊA LÍ VÀ PHẠM VI LÃNH THỔ</h1>
  <p style="font-size:0.6em;">Việt Nam nằm ở đâu, rộng bao nhiêu — và điều đó mang lại gì?</p>
  <p class="thiet-bi">Thiết bị: Atlat Địa lí Việt Nam, bản đồ hành chính Việt Nam, bản đồ vùng biển và các điểm cực, phiếu học tập</p>
</section>

<section>
  <span class="giai-doan">MỤC TIÊU</span>
  <ul class="noi-dung">
    <li class="fragment">Trình bày được vị trí địa lí và phạm vi lãnh thổ (đất liền, vùng biển, trên không) của nước ta.</li>
    <li class="fragment">Sử dụng Atlat/bản đồ để xác định các điểm cực và hệ toạ độ địa lí.</li>
    <li class="fragment">Phân tích được ý nghĩa của vị trí địa lí tới tự nhiên, kinh tế, văn hoá – xã hội và quốc phòng.</li>
    <li class="fragment">Viết được đoạn văn ngắn liên hệ vị trí địa lí với một ngành kinh tế của địa phương.</li>
  </ul>
</section>

<section data-background-color="#d5eef5">
  <span class="giai-doan">BƯỚC 1 · KHỞI ĐỘNG</span>
  <h2>“Đắc địa” nghĩa là gì?</h2>
  <p style="font-size:0.6em;">Có ý kiến cho rằng vị trí địa lí nước ta là <b>đắc địa</b>. Hãy nhìn bản đồ và nêu 3 dấu hiệu chứng minh ý kiến đó.</p>
  <ul class="noi-dung">
    <li class="fragment hs">Gần đường hàng hải quốc tế, có vịnh làm nơi neo đậu tàu.</li>
    <li class="fragment hs">Tiếp giáp Trung Quốc, Lào, Campuchia — vừa giao thương thuận lợi, vừa phải giữ chủ quyền.</li>
    <li class="fragment hs">Nằm trong vùng khí hậu nhiệt đới ẩm, nhiều ánh sáng và mưa.</li>
  </ul>
</section>

<section>
  <span class="giai-doan">BƯỚC 2 · HÌNH THÀNH KIẾN THỨC</span>
  <h2>Hệ toạ độ và bốn điểm cực</h2>
  <table>
    <tr><th></th><th>Địa danh</th><th>Toạ độ</th></tr>
    <tr class="fragment"><td>Cực Bắc</td><td>Lũng Cú, Đồng Văn</td><td>23°23′B</td></tr>
    <tr class="fragment"><td>Cực Nam</td><td>Đất Mũi, Ngọc Hiển</td><td>8°34′B</td></tr>
    <tr class="fragment"><td>Cực Đông</td><td>Vạn Thạnh, Vạn Ninh</td><td>109°24′Đ</td></tr>
    <tr class="fragment"><td>Cực Tây</td><td>Sín Thầu, Mường Nhé</td><td>102°09′Đ</td></tr>
  </table>
  <p class="noi-dung fragment hs">Kéo dài Bắc – Nam khoảng 1 650 km; nơi hẹp nhất chưa tới 50 km; diện tích đất liền hơn 331 nghìn km².</p>
</section>

<section>
  <span class="giai-doan">BƯỚC 2 · HÌNH THÀNH KIẾN THỨC</span>
  <h2>Phạm vi lãnh thổ</h2>
  <ul class="noi-dung">
    <li>Không chỉ là phần đất liền: nước ta còn có <b>vùng biển</b> rộng khoảng 1 triệu km² — nội thủy, lãnh hải, vùng tiếp giáp lãnh hải, vùng đặc quyền kinh tế và thềm lục địa.</li>
    <li class="fragment">Hai quần đảo <b>Hoàng Sa</b> và <b>Trường Sa</b> là bộ phận lãnh thổ không thể tách rời.</li>
    <li class="fragment">Vùng trời bao trùm toàn bộ không gian lãnh thổ phía trên.</li>
    <li class="fragment">Trên đất liền tiếp giáp Trung Quốc, Lào, Campuchia; bán đảo Đông Dương nằm gần trung tâm khu vực Đông Nam Á.</li>
  </ul>
  <p class="noi-dung fragment hs">→ Trên Atlat, xác định ranh giới các vùng biển và hai quần đảo (trang tổng quan tự nhiên).</p>
</section>

<section>
  <span class="giai-doan">Ý NGHĨA CỦA VỊ TRÍ ĐỊA LÍ</span>
  <h2>Bốn nhóm hệ quả</h2>
  <div class="y-nghia">
    <div class="fragment"><b>Tự nhiên</b><br>Nhiệt đới ẩm gió mùa, sinh vật phong phú; nhiều thiên tai: bão, lũ, hạn hán.</div>
    <div class="fragment"><b>Kinh tế</b><br>Giao lưu đường bộ, biển, hàng không với khu vực; cảng nước sâu và khu kinh tế ven biển phát triển.</div>
    <div class="fragment"><b>Văn hoá – xã hội</b><br>Giao lưu văn hoá, hợp tác giáo dục và y tế; chung đường biên giới nên cần quản lí dân cư.</div>
    <div class="fragment"><b>Quốc phòng – an ninh</b><br>Vị trí chiến lược ở Biển Đông; bảo vệ chủ quyền biển đảo là nhiệm vụ thường xuyên.</div>
  </div>
  <p class="noi-dung fragment hs">Mỗi thẻ có mặt lợi và mặt thách thức — hãy nêu một cặp cho thẻ “Kinh tế”.</p>
</section>

<section data-background-color="#d5eef5">
  <span class="giai-doan">BƯỚC 3 · THỰC HÀNH ATLAT</span>
  <h2>Phiếu học tập · 8 phút theo cặp</h2>
  <ol class="noi-dung">
    <li>Liệt kê các tỉnh, thành phố trực tiếp giáp biển.</li>
    <li>Tìm 4 cửa khẩu quốc tế đường bộ và nước láng giềng tương ứng.</li>
    <li>Tìm 3 cảng biển lớn và 3 sân bay quốc tế.</li>
    <li>Xác định vị trí hai quần đảo Hoàng Sa, Trường Sa trên Atlat.</li>
  </ol>
  <p class="noi-dung fragment hs">Gợi ý đáp án: Hữu Nghị và Lào Cai (Trung Quốc), Lao Bảo và Cha Lo (Lào), Mộc Bài và Xa Mát (Campuchia); cảng Hải Phòng, Đà Nẵng, Cam Ranh, Vũng Áng; sân bay Nội Bài, Đà Nẵng, Tân Sơn Nhất.</p>
</section>

<section>
  <span class="giai-doan">BƯỚC 4 · LUYỆN TẬP</span>
  <h2>Kiểm tra nhanh</h2>
  <ul class="noi-dung">
    <li>C1: Nước ta tiếp giáp trên đất liền với ba quốc gia nào?</li>
    <li class="fragment hs">→ Trung Quốc, Lào, Campuchia.</li>
    <li style="margin-top:10px;">C2: Ý nào <b>không phải</b> hệ quả của vị trí địa lí? A. Khí hậu nhiệt đới ẩm gió mùa · B. Nguồn khoáng sản dồi dào · C. Giao thương đường biển thuận lợi · D. Nguy cơ bão, lũ.</li>
    <li class="fragment hs">→ B — khoáng sản do lịch sử địa chất quyết định, không do vị trí.</li>
    <li style="margin-top:10px;">C3: Vì sao nói nước ta ở vị trí “ngã tư” của các tuyến hàng hải?</li>
    <li class="fragment hs">→ Biển Đông là tuyến hàng hải quốc tế sầm uất; lãnh thổ nước ta nằm ngay trên tuyến và có nhiều vịnh, cảng.</li>
  </ul>
</section>

<section>
  <span class="giai-doan">BƯỚC 5 · VẬN DỤNG</span>
  <h2>Viết đoạn 150 chữ</h2>
  <p class="noi-dung">“Vị trí địa lí ảnh hưởng thế nào đến một ngành kinh tế của tỉnh/thành nơi em đang sống?”</p>
  <ul class="noi-dung">
    <li class="fragment">Chọn một ngành: kinh tế biển và cảng, du lịch, nông nghiệp nhiệt đới, hay kinh tế cửa khẩu.</li>
    <li class="fragment">Dàn ý: lợi thế vị trí → biểu hiện cụ thể ở địa phương → một thách thức → đề xuất.</li>
    <li class="fragment hs">Ví dụ: một cảng nước sâu gần thành phố + tuyến hàng hải quốc tế ⇒ lợi thế logistics và du lịch cruise, nhưng dễ tổn thương khi giá nhiên liệu biến động.</li>
  </ul>
</section>

<section data-background-gradient="linear-gradient(135deg,#d5eef5,#f4fbfd)">
  <span class="giai-doan">BƯỚC 6 · CỦNG CỐ</span>
  <h2>Cần nhớ</h2>
  <ul class="noi-dung">
    <li class="fragment">Toạ độ: 8°34′B – 23°23′B; 102°09′Đ – 109°24′Đ.</li>
    <li class="fragment">Lãnh thổ = đất liền + vùng biển + vùng trời; có Hoàng Sa, Trường Sa.</li>
    <li class="fragment">Vị trí địa lí tạo thuận lợi về giao thương và khí hậu, đồng thời nhiều thiên tai và yêu cầu bảo vệ chủ quyền.</li>
    <li class="fragment">Về nhà: vẽ lược đồ nước ta, ghi bốn điểm cực và ba nước tiếp giáp.</li>
  </ul>
</section>`
    },

    {
        id: 'chuyen-de-on-thi',
        fileName: 'chuyen-de-on-thi-ham-so.html',
        title: 'Chuyên đề ôn thi — Ứng dụng đạo hàm khảo sát hàm số',
        desc: 'Chuyên đề ôn thi tốt nghiệp: ma trận đề theo 4 mức độ → kiến thức phải thuộc → bài tập tăng dần độ khó → mẹo bấm máy và lỗi hay gặp.',
        note: 'Giữ khung "nhận biết → thông hiểu → vận dụng → vận dụng cao" khi đổi chuyên đề khác; bảng ma trận chỉ cần đổi số câu/điểm.',
        group: 'chuyen-de',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#eef2ff linear-gradient(135deg,#e0e7ff,#f8fafc) !important; }
    .reveal .slides section { box-sizing:border-box; color:#1f2937; border-radius:14px; padding:26px; }
    .reveal h1, .reveal h2, .reveal h3 { color:#3730a3 !important; }
    .cap { display:inline-block; padding:3px 14px; border-radius:6px; font-size:0.42em;
           font-weight:bold; margin-bottom:12px; background:#3730a3; color:#eef2ff; }
    .cap.t2 { background:#047857; color:#ecfdf5; }
    .cap.t3 { background:#c2410c; color:#fff7ed; }
    .cap.t4 { background:#be185d; color:#fdf2f8; }
    .reveal .nb { font-size:0.55em; text-align:left; max-width:800px; margin:0 auto; }
    .reveal table { border-collapse:collapse; font-size:0.5em; margin:0 auto; }
    .reveal th, .reveal td { border:1px solid #c7d2fe; padding:7px 14px; }
    .reveal th { background:#e0e7ff; color:#312e81; }
    .reveal .loixuong { color:#be185d; }
    .reveal .diem { color:#047857; }
  </style>
  <header style="position:absolute; top:10px; left:20px; font-size:0.36em; color:#5b6b9a;">
    Chuyên đề ôn thi TN THPT · Toán
  </header>
</section-master>

<section>
  <h1>KHẢO SÁT HÀM SỐ</h1>
  <p style="font-size:0.58em;">Ứng dụng đạo hàm · 8 tiết · Mục tiêu: không mất điểm câu nào dưới 8 điểm</p>
</section>

<section>
  <span class="cap">MA TRẬN ĐỀ</span>
  <h2>Hàm số trong đề thi những năm gần đây</h2>
  <table>
    <tr><th>Mức độ</th><th>Số câu</th><th>Điểm</th><th>Dạng thường gặp</th></tr>
    <tr class="fragment"><td>Nhận biết</td><td>3</td><td>1,5</td><td>Đọc BBT, tìm cực trị</td></tr>
    <tr class="fragment"><td>Thông hiểu</td><td>3</td><td>1,5</td><td>Tính đơn điệu, GTLN–GTNN</td></tr>
    <tr class="fragment"><td>Vận dụng</td><td>2</td><td>1,0</td><td>Biện luận số giao điểm</td></tr>
    <tr class="fragment"><td>V. dụng cao</td><td>1</td><td>0,5</td><td>Tham số, tiếp tuyến qua điểm</td></tr>
  </table>
  <p class="fragment" style="font-size:0.48em;">→ 3 câu đầu chắc chắn làm được trong 5 phút nếu thuộc bảng dưới đây.</p>
</section>

<section data-background-color="#e0e7ff">
  <span class="cap">NHẬN BIẾT</span>
  <h2>Bốn điều phải thuộc</h2>
  <ul class="nb">
    <li class="fragment">$y' = 0$ tại $x_0$ và $y'$ đổi dấu từ $+$ sang $-$ ⇒ $x_0$ là điểm <b>max</b>.</li>
    <li class="fragment">Hàm trùng phương $y = ax^4 + bx^2 + c$ có 3 cực trị ⇔ $ab &lt; 0$.</li>
    <li class="fragment">Hàm nhất biến $y = \dfrac{ax + b}{cx + d}$ luôn đơn điệu trên từng khoảng xác định.</li>
    <li class="fragment">Tiệm cận đứng của $\dfrac{ax+b}{cx+d}$ là $x = -\dfrac{d}{c}$.</li>
  </ul>
</section>

<section>
  <span class="cap t2">THÔNG HIỂU</span>
  <h2>Bài 1 — Đọc bảng biến thiên</h2>
  <p class="nb">Cho đồ thị $y = f(x)$ như hình; tìm số nghiệm của $f(x) = m$.</p>
  <ul class="nb">
    <li class="fragment">Bước 1: xác định GTLN, GTNN trên từng khoảng ⇒ vẽ đường thẳng $y = m$.</li>
    <li class="fragment">Bước 2: đếm giao điểm; $m$ nằm giữa 2 giá trị cực trị thì có 3 nghiệm.</li>
    <li class="fragment diem">Đáp án: $-1 &lt; m &lt; 3$ có 3 nghiệm.</li>
  </ul>
</section>

<section>
  <span class="cap t3">VẬN DỤNG</span>
  <h2>Bài 2 — Biện luận bằng đồ thị</h2>
  <p class="nb">Tìm $m$ để $x^3 - 3x^2 - m = 0$ có đúng hai nghiệm phân biệt.</p>
  <ul class="nb">
    <li class="fragment">Đưa về $f(x) = x^3 - 3x^2$ cắt $y = m$.</li>
    <li class="fragment">BBT: max $= 0$ tại $x = 0$, min $= -4$ tại $x = 2$.</li>
    <li class="fragment diem">Hai nghiệm ⇔ $m = 0$ hoặc $m = -4$ (đường thẳng đi qua điểm cực trị).</li>
    <li class="fragment loixuong">Lỗi hay gặp: quên trường hợp tiếp xúc, chỉ viết khoảng $-4 &lt; m &lt; 0$.</li>
  </ul>
</section>

<section>
  <span class="cap t4">VẬN DỤNG CAO</span>
  <h2>Bài 3 — Tham số trong hàm trùng phương</h2>
  <p class="nb">Có bao nhiêu giá trị nguyên của $m \in [0;10]$ để $y = x^4 - 2mx^2 + 3$ có ba cực trị tạo thành tam giác có bán kính đường tròn ngoại tiếp bằng 1?</p>
  <ul class="nb">
    <li class="fragment">Ba cực trị: $A(0;3)$, $B\left(-\sqrt{m};\,3 - m^2\right)$, $C\left(\sqrt{m};\,3 - m^2\right)$.</li>
    <li class="fragment">$R = 1$ ⇒ lập phương trình theo $m$, đặt $t = \sqrt{m}$ để hạ bậc.</li>
    <li class="fragment diem">Kết quả: $m = 1$ ⇒ <b>1</b> giá trị nguyên thoả mãn.</li>
  </ul>
</section>

<section data-background-gradient="linear-gradient(135deg,#e0e7ff,#f8fafc)">
  <span class="cap">MÈO &amp; TỔNG KẾT</span>
  <h2>Chiến trường 45 phút phần hàm số</h2>
  <ul class="nb">
    <li class="fragment">Câu nhận biết: dùng máy tính cầm tay đạo hàm nhanh, không trình bày dài.</li>
    <li class="fragment">Câu biện luận: luôn vẽ phác đồ thị trước khi viết khoảng $m$.</li>
    <li class="fragment">Bẫy kinh điển: điều kiện $ab &lt; 0$ của hàm trùng phương, nghiệm kép.</li>
    <li class="fragment">Bài về nhà: đề minh hoạ 2025, phần hàm số — tự bấm giờ 12 phút.</li>
  </ul>
</section>`
    },

    {
        id: 'reveal-chuyen-canh',
        fileName: 'reveal-chuyen-canh-va-nen.html',
        title: 'Reveal.js — Chuyển cảnh và nền slide',
        desc: 'Bộ mẫu trình diễn đúng các tính năng Reveal.js: chuyển cảnh riêng từng slide (fade, convex, concave, zoom), đổi tốc độ, nền gradient và nền hoạ tiết bằng CSS.',
        note: 'Đây là mẫu "học bằng cách xem": mỗi slide chú thích ngay tính năng nó dùng. Bấm → để cảm nhận sự khác nhau giữa các kiểu transition.',
        group: 'reveal',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#f8fafc linear-gradient(135deg,#e0f2fe,#f1f5f9) !important; }
    .reveal .slides section { background:transparent; color:#1f2937; }
    .reveal h1, .reveal h2, .reveal h3 { color:#b45309 !important; }
    .tag { display:inline-block; background:rgba(180,83,9,0.10); border:1px solid rgba(180,83,9,0.35);
           color:#92400e; padding:3px 14px; border-radius:999px; font-size:0.4em;
           font-family:ui-monospace,monospace; margin-bottom:16px; }
    .reveal .ghi { font-size:0.46em; color:#475569; }
    .nen-hoat-tiet { background:radial-gradient(circle at 20% 20%, rgba(217,119,6,0.35) 0 2px, transparent 3px),
                    radial-gradient(circle at 70% 60%, rgba(37,99,235,0.30) 0 2px, transparent 3px),
                    radial-gradient(circle at 40% 85%, rgba(217,119,6,0.22) 0 2px, transparent 3px), #f8fafc;
                    background-size:120px 120px, 160px 160px, 90px 90px, auto; }
  </style>
</section-master>

<section data-background-color="#e0f2fe">
  <h1>CHUYỂN CẢNH &amp; NỀN</h1>
  <p style="font-size:0.55em;">Những gì Reveal.js làm được — demo ngay trên slide</p>
  <p class="ghi">Bấm phím phải để xem từng kiểu transition</p>
</section>

<section data-transition="fade">
  <span class="tag">data-transition="fade"</span>
  <h2>Fade</h2>
  <p class="ghi">Slide cũ mờ dần, slide mới hiện dần — kiểu dịu nhất, hợp khi đổi chủ đề.</p>
</section>

<section data-transition="convex">
  <span class="tag">data-transition="convex"</span>
  <h2>Convex</h2>
  <p class="ghi">Slide lồi ra phía trước như đang lật khỏi mặt cầu — chữ mặc định của Reveal.</p>
</section>

<section data-transition="concave">
  <span class="tag">data-transition="concave"</span>
  <h2>Concave</h2>
  <p class="ghi">Ngược lại với convex: mặt phẳng bị "hút" vào trong khi rời đi.</p>
</section>

<section data-transition="zoom" data-transition-speed="slow">
  <span class="tag">data-transition="zoom" data-transition-speed="slow"</span>
  <h2>Zoom chậm</h2>
  <p class="ghi">Phóng to toàn bộ slide; thêm <code>fast</code> hoặc <code>slow</code> để đổi tốc độ.</p>
</section>

<section data-background-gradient="linear-gradient(135deg, #bfdbfe, #fbcfe8)" data-background-transition="fade">
  <span class="tag">data-background-gradient + data-background-transition</span>
  <h2>Nền gradient đổi mềm</h2>
  <p class="ghi">Không cần ảnh: <code>linear-gradient()</code> hay <code>radial-gradient()</code> đều dùng được, và nền chuyển mờ thay vì trượt.</p>
</section>

<section class="nen-hoat-tiet">
  <span class="tag">CSS thuần trong section-master</span>
  <h2>Nền hoạ tiết</h2>
  <p class="ghi">Nhiều lớp <code>radial-gradient</code> lặp lại tạo chấm màu; <code>background-size</code> quyết định mật độ.</p>
</section>

<section>
  <span class="tag">stack dọc — nested &lt;section&gt;</span>
  <h2>Slide lồng nhau</h2>
  <p class="ghi">Ba slide này nằm trong cùng một ô: xuống dưới để đi hết, rồi mới sang phải.</p>
  <section data-transition="slide">
    <h3>Dọc · 1</h3>
    <p class="ghi">Mục lục → bấm ↓</p>
  </section>
  <section data-transition="slide">
    <h3>Dọc · 2</h3>
    <p class="ghi">Nội dung → bấm ↓</p>
  </section>
  <section data-transition="slide">
    <h3>Dọc · 3</h3>
    <p class="ghi">Kết luận → bấm ↓ để sang slide ngang tiếp theo</p>
  </section>
</section>

<section data-background-color="#e0f2fe">
  <span class="tag">data-transition-speed="fast"</span>
  <h2>Vẫn còn nhiều thứ để thử</h2>
  <ul style="font-size:0.5em; text-align:left; max-width:660px; margin:0 auto;">
    <li class="fragment"><code>data-background-image="đường-dẫn-ảnh"</code> — nền bằng ảnh, đi kèm <code>data-background-size="cover"</code>.</li>
    <li class="fragment"><code>data-background-video</code> — nền bằng video, có <code>data-background-video-loop</code>.</li>
    <li class="fragment"><code>data-preload</code> — tải trước slide tiếp theo khi mạng chậm.</li>
    <li class="fragment">Khai báo một lần cho cả bài: <code>transition</code>, <code>transitionSpeed</code>, <code>backgroundTransition</code> trong <code>Reveal.initialize</code>.</li>
  </ul>
</section>`
    },

    {
        id: 'reveal-fragment-stack',
        fileName: 'reveal-fragment-hieu-ung.html',
        title: 'Reveal.js — Hiện dần: mọi kiểu fragment',
        desc: 'Toàn bộ các lớp fragment của Reveal.js trên một bộ slide: fade-up/left/right, current-visible, grow, shrink, strike, highlight và thứ tự hiện bằng data-fragment-index.',
        note: 'Dùng làm "bảng tra" khi soạn bài: cần hiệu ứng nào thì chép đúng class đó. Mọi fragment đều chạy bằng HTML/CSS, không cần viết script.',
        group: 'reveal',
        code: String.raw`<section-master>
  <style>
    .reveal { background:#ecfdf5 linear-gradient(135deg,#d1fae5,#f0fdf4) !important; }
    .reveal .slides section { background:transparent; color:#1f2937; border-radius:14px; }
    .reveal h1, .reveal h2, .reveal h3 { color:#047857 !important; }
    .ten { display:inline-block; background:rgba(4,120,87,0.10); color:#065f46;
           padding:2px 12px; border-radius:6px; font-size:0.42em; font-family:ui-monospace,monospace; }
    .reveal .ghi { font-size:0.44em; color:#475569; }
    .reveal .demo { font-size:0.62em; }
  </style>
</section-master>

<section data-background-color="#d1fae5">
  <h1>FRAGMENT</h1>
  <p style="font-size:0.55em;">Một nút bấm — một nội dung hiện ra</p>
  <p class="ghi">Bấm → để đi qua từng kiểu</p>
</section>

<section>
  <span class="ten">fade-up · fade-down · fade-left · fade-right</span>
  <h2>Vừa hiện vừa trượt</h2>
  <div class="demo">
    <p class="fragment fade-up">fade-up ↑</p>
    <p class="fragment fade-down">fade-down ↓</p>
    <p class="fragment fade-left">fade-left ←</p>
    <p class="fragment fade-right">fade-right →</p>
  </div>
</section>

<section>
  <span class="ten">current-visible</span>
  <h2>Chỉ một dòng sáng tại một thời điểm</h2>
  <div class="demo">
    <p class="fragment current-visible">Bước 1: đọc đề, gạch chân dữ kiện</p>
    <p class="fragment current-visible">Bước 2: chọn công thức</p>
    <p class="fragment current-visible">Bước 3: tính và thử lại</p>
  </div>
  <p class="ghi">Dòng trước tự ẩn khi dòng sau hiện — hợp với các bước hướng dẫn.</p>
</section>

<section>
  <span class="ten">fade-in-then-semi-out</span>
  <h2>Hiện rồi mờ đi một nửa</h2>
  <div class="demo">
    <p class="fragment fade-in-then-semi-out">Ý chính 1</p>
    <p class="fragment fade-in-then-semi-out">Ý chính 2</p>
    <p class="fragment fade-in-then-semi-out">Ý chính 3</p>
  </div>
  <p class="ghi">Vẫn nhìn thấy ý cũ nhưng mắt học sinh dồn vào ý mới.</p>
</section>

<section>
  <span class="ten">grow · shrink · semi-fade-out</span>
  <h2>To lên, thu nhỏ, hoặc nhoà</h2>
  <div class="demo">
    <p class="fragment grow">grow — phóng to</p>
    <p class="fragment shrink">shrink — thu nhỏ</p>
    <p class="fragment semi-fade-out">semi-fade-out — mờ dần khi có cái mới</p>
  </div>
</section>

<section>
  <span class="ten">strike · highlight-*</span>
  <h2>Gạch nối và tô màu</h2>
  <div class="demo">
    <p class="fragment strike">Đáp án sai bị gạch</p>
    <p class="fragment highlight-red">highlight-red</p>
    <p class="fragment highlight-green">highlight-green</p>
    <p class="fragment highlight-blue">highlight-blue</p>
    <p class="fragment highlight-current-yellow">highlight-current-* chỉ tô khi đang ở fragment đó</p>
  </div>
</section>

<section>
  <span class="ten">data-fragment-index</span>
  <h2>Đổi thứ tự hiện mà không đổi vị trí trong HTML</h2>
  <div class="demo">
    <p class="fragment" data-fragment-index="3">index 3 — hiện cuối</p>
    <p class="fragment" data-fragment-index="1">index 1 — hiện đầu</p>
    <p class="fragment" data-fragment-index="2">index 2</p>
  </div>
  <p class="ghi">Nhóm cùng chỉ số sẽ hiện cùng lúc — dùng khi muốn hai cột xuất hiện đồng thời.</p>
</section>

<section data-background-gradient="linear-gradient(135deg,#d1fae5,#ecfdf5)">
  <span class="ten">fragment + bài kiểm tra nhanh</span>
  <h2>Ứng dụng: đáp án hiện sau câu hỏi</h2>
  <p style="font-size:0.62em;">Hỏi: Tích của hai nghiệm phương trình $x^2 - 5x + 6 = 0$ bằng bao nhiêu?</p>
  <p class="fragment" style="color:#047857;">→ $S = a + b = 5$, $P = a \cdot b = 6$.</p>
  <p class="fragment" style="font-size:0.44em; color:#475569;">Theo định lý Viète: $P = \dfrac{c}{a}$.</p>
</section>`
    }
];

const SLIDES = [
    {
        id: 'thong-ke',
        group: 'so-lieu',
        title: 'Slide Thống kê — bảng + biểu đồ cột + biểu đồ tròn',
        desc: 'Một slide tổng hợp ba cách trình bày số liệu, các thành phần hiện dần theo phím bấm.',
        note: 'Sửa số liệu trong bảng, chiều cao cột (px tỉ lệ %) và các mốc phần trăm trong conic-gradient.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#fff7ed,#fef3c7)" style="color:#1f2937">
  <h2 style="color:#b45309;">Kết quả khảo sát học kỳ I</h2>
  <div style="display:flex; gap:26px; justify-content:center; align-items:flex-start; font-size:0.5em;">
    <table style="border-collapse:collapse;">
      <tr style="background:#f59e0b; color:#111111;">
        <th style="padding:6px 12px; border:1px solid #d6c3a8;">Lớp</th>
        <th style="padding:6px 12px; border:1px solid #d6c3a8;">Số HS</th>
        <th style="padding:6px 12px; border:1px solid #d6c3a8;">Đạt ≥ 8</th>
      </tr>
      <tr class="fragment"><td style="padding:6px 12px; border:1px solid #d6c3a8;">12A1</td><td style="padding:6px 12px; border:1px solid #d6c3a8;">42</td><td style="padding:6px 12px; border:1px solid #d6c3a8;">31</td></tr>
      <tr class="fragment"><td style="padding:6px 12px; border:1px solid #d6c3a8;">12A2</td><td style="padding:6px 12px; border:1px solid #d6c3a8;">40</td><td style="padding:6px 12px; border:1px solid #d6c3a8;">25</td></tr>
      <tr class="fragment"><td style="padding:6px 12px; border:1px solid #d6c3a8;">12A3</td><td style="padding:6px 12px; border:1px solid #d6c3a8;">38</td><td style="padding:6px 12px; border:1px solid #d6c3a8;">28</td></tr>
    </table>
    <div style="display:flex; align-items:flex-end; gap:16px; height:190px;">
      <div style="text-align:center;"><div class="fragment" style="width:46px; height:155px; background:#f59e0b; border-radius:5px 5px 0 0; margin:0 auto;"></div>74%</div>
      <div style="text-align:center;"><div class="fragment" style="width:46px; height:125px; background:#38bdf8; border-radius:5px 5px 0 0; margin:0 auto;"></div>63%</div>
      <div style="text-align:center;"><div class="fragment" style="width:46px; height:140px; background:#a78bfa; border-radius:5px 5px 0 0; margin:0 auto;"></div>74%</div>
    </div>
    <div class="fragment" style="width:150px; height:150px; border-radius:50%;
         background:conic-gradient(#f59e0b 0 41%, #38bdf8 41% 78%, #a78bfa 78% 100%);"></div>
  </div>
  <p class="fragment" style="font-size:0.45em; color:#6b7280;">Hình 1. Tỉ lệ đạt điểm ≥ 8 theo lớp (n = 120)</p>
</section>`
    },

    {
        id: 'do-thi-tham-so',
        group: 'so-lieu',
        title: 'Slide Đồ thị hàm số có tham số',
        desc: 'Họ parabol y = (x − m)² vẽ bằng SVG (path Bézier, không cần thư viện), kèm quy luật tịnh tiến theo tham số m.',
        note: 'Mỗi đường cong là một <path d="M … Q …"> — sao chép path và đổi hoành độ đỉnh/đầu cuối để thêm đường ứng với m khác.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#eff6ff,#f8fafc)" style="color:#1f2937">
  <h2 style="color:#1d4ed8;">Đồ thị $y = (x - m)^2$ khi $m$ thay đổi</h2>
  <svg viewBox="0 0 420 300" style="width:420px; height:300px; background:#ffffff; border:1px solid #dbeafe; border-radius:12px;">
    <line x1="10" y1="180" x2="410" y2="180" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="210" y1="10" x2="210" y2="290" stroke="#94a3b8" stroke-width="1.5"/>
    <path d="M 90 60 Q 210 300 330 60" fill="none" stroke="#f59e0b" stroke-width="3"/>
    <path class="fragment fade-in" d="M 130 60 Q 250 300 370 60" fill="none" stroke="#2563eb" stroke-width="3"/>
    <path class="fragment fade-in" d="M 50 60 Q 170 300 290 60" fill="none" stroke="#7c3aed" stroke-width="3"/>
    <circle cx="210" cy="180" r="5" fill="#f59e0b"/>
    <circle class="fragment" cx="250" cy="180" r="5" fill="#2563eb"/>
    <circle class="fragment" cx="170" cy="180" r="5" fill="#7c3aed"/>
  </svg>
  <div style="display:flex; gap:26px; justify-content:center; font-size:0.5em;">
    <span style="color:#b45309;">$m = 0$</span>
    <span class="fragment" style="color:#2563eb;">$m = 1$</span>
    <span class="fragment" style="color:#7c3aed;">$m = -1$</span>
  </div>
  <p class="fragment" style="font-size:0.55em;">Quy luật: $m > 0$ → đồ thị tịnh tiến <b>sang phải</b>; $m < 0$ → tịnh tiến <b>sang trái</b>; dạng parabol không đổi.</p>
</section>`
    },

    {
        id: 'trac-nghiem',
        group: 'tuong-tac',
        title: 'Slide Câu hỏi trắc nghiệm nhiều lựa chọn',
        desc: 'Bấm đáp án: đúng chuyển xanh, sai chuyển đỏ, giải thích hiện ra sau khi trả lời — thuần HTML/CSS.',
        note: 'Đổi các id (c1a…c1d) khi thêm câu khác trong cùng bài; đáp án đúng là input có class="ok".',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#f5f3ff,#eff6ff)" style="color:#1f2937">
  <style>
    .mcq input { display:none; }
    .mcq label { display:block; text-align:left; max-width:560px; margin:8px auto;
                 padding:10px 16px; border:2px solid #cbd5e1; border-radius:10px;
                 cursor:pointer; font-size:0.6em; transition:all .15s; }
    .mcq label:hover { border-color:#f59e0b; }
    .mcq input:checked + label { border-color:#dc2626; background:#fee2e2; color:#7f1d1d; }
    .mcq input.ok:checked + label { border-color:#16a34a; background:#dcfce7; color:#14532d; }
    .mcq:has(input:checked) ~ .giai { display:block; }
    .giai { display:none; max-width:560px; margin:12px auto 0; padding:10px 16px;
            border-left:4px solid #f59e0b; background:#ffffff; border-radius:8px;
            font-size:0.5em; text-align:left; }
  </style>
  <h2 style="color:#6d28d9;">Câu 3. Hàm số $y = x^3 - 3x$ có bao nhiêu điểm cực trị?</h2>
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
        group: 'tuong-tac',
        title: 'Slide Câu hỏi ghép đôi',
        desc: 'Hai cột A–B cần nối; học sinh thảo luận rồi bấm "Xem đáp án" để kiểm tra.',
        note: 'Đổi số dòng: thêm mỗi cặp vào cả hai cột và cập nhật chuỗi đáp án trong phần chi tiết.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#ecfdf5,#f0fdfa)" style="color:#1f2937">
  <h2 style="color:#047857;">Ghép đôi: Công thức ↔ Tên gọi</h2>
  <p style="font-size:0.5em; color:#6b7280;">Nối mỗi ý cột A với một ý cột B (30 giây, làm theo cặp)</p>
  <div style="display:flex; gap:40px; justify-content:center; font-size:0.6em; max-width:720px; margin:0 auto;">
    <div style="flex:1;">
      <h4 style="color:#b45309;">CỘT A</h4>
      <ol style="text-align:left; line-height:2.2;">
        <li>Diện tích hình tròn</li>
        <li>Chu vi hình tròn</li>
        <li>Thể tích khối cầu</li>
        <li>Diện tích xung quanh hình trụ</li>
      </ol>
    </div>
    <div style="flex:1;">
      <h4 style="color:#2563eb;">CỘT B</h4>
      <ul style="text-align:left; line-height:2.6; list-style:none;">
        <li>a. $2\pi R h$</li>
        <li>b. $\pi R^2$</li>
        <li>c. $2\pi R$</li>
        <li>d. $\dfrac{4}{3}\pi R^3$</li>
      </ul>
    </div>
  </div>
  <details style="font-size:0.55em; max-width:560px; margin:10px auto 0; text-align:left;
                 background:#ffffff; border:1px solid #a7f3d0; border-radius:10px; padding:10px 16px; cursor:pointer;">
    <summary style="font-weight:bold; color:#b45309;">Xem đáp án</summary>
    <p style="margin-top:8px;">1–b · 2–c · 3–d · 4–a</p>
  </details>
</section>`
    },

    {
        id: 'dien-khuyet',
        group: 'tuong-tac',
        title: 'Slide Câu hỏi điền khuyết',
        desc: 'Chỗ trống là ô nhập được ngay trên slide (bấm/nhập trực tiếp khi thuyết trình), đáp án hiện dần bằng fragment.',
        note: 'Khi trình chiếu: bấm chuột vào ô rồi gõ — mũi tên trái/phải vẫn lật slide như thường.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#fefce8,#fff7ed)" style="color:#1f2937">
  <style>
    .dien-khuyet input {
      width:110px; background:#fffbe6; color:#111111; border:none;
      border-bottom:3px solid #f59e0b; border-radius:4px 4px 0 0;
      font-size:0.85em; text-align:center; font-family:inherit;
    }
  </style>
  <h2 style="color:#a16207;">Điền vào chỗ trống</h2>
  <div class="dien-khuyet" style="font-size:0.65em; text-align:left; max-width:680px; margin:0 auto;">
    <p style="margin-bottom:18px;">1) Trong tam giác vuông, bình phương cạnh huyền bằng
      <input aria-label="điền 1"> tổng bình phương hai <input aria-label="điền 2">.</p>
    <p style="margin-bottom:18px;">2) $$ (a + b)^2 = a^2 + \underline{\hspace{1.6cm}} + b^2 $$</p>
    <p>3) Số vô tỉ điển hình được ký hiệu là π, nó là tỉ số giữa chu vi và <input aria-label="điền 3"> của đường tròn.</p>
  </div>
  <p class="fragment" style="font-size:0.55em; color:#15803d; margin-top:14px;">
    Đáp án: 1) <b>bằng</b> · <b>cạnh góc vuông</b> &nbsp; 2) <b>$2ab$</b> &nbsp; 3) <b>đường kính</b></p>
</section>`
    },

    {
        id: 'puzzle',
        group: 'tuong-tac',
        title: 'Slide Trò chơi Puzzle — giải mã từ khóa',
        desc: 'Lưới 6 ô úp: trả lời đúng câu hỏi nào, bấm lật ô đó để lộ một chữ; ghép 6 chữ thành từ khóa.',
        note: 'Đổi chữ cái mặt sau và câu hỏi theo chủ đề; mỗi ô là một checkbox CSS — bấm lại để lật úp trở lại.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#fdf4ff,#eff6ff)" style="color:#1f2937">
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
    .puzzle .mat-truoc { background:#ffffff; border:2px solid #f0abfc; color:#a21caf; font-size:0.55em; }
    .puzzle .mat-sau { background:#f59e0b; color:#111111; font-size:1.6em; transform:rotateY(180deg); }
  </style>
  <h2 style="color:#a21caf;">🧩 Giải mã từ khóa</h2>
  <p style="font-size:0.45em; color:#6b7280;">Trả lời đúng câu nào → lật ô đó. Ghép 6 chữ cái theo thứ tự ô để được từ khóa!</p>
  <div class="puzzle">
    <input type="checkbox" id="pz1"><label for="pz1"><span class="mat-truoc">Câu 1<br>$\sqrt{81} = ?$</span><span class="mat-sau">T</span></label>
    <input type="checkbox" id="pz2"><label for="pz2"><span class="mat-truoc">Câu 2<br>$2^{10} = ?$</span><span class="mat-sau">O</span></label>
    <input type="checkbox" id="pz3"><label for="pz3"><span class="mat-truoc">Câu 3<br>$15^2 = ?$</span><span class="mat-sau">A</span></label>
    <input type="checkbox" id="pz4"><label for="pz4"><span class="mat-truoc">Câu 4<br>Số 0 có chẵn không?</span><span class="mat-sau">N</span></label>
    <input type="checkbox" id="pz5"><label for="pz5"><span class="mat-truoc">Câu 5<br>$\pi \approx ?$</span><span class="mat-sau">Ọ</span></label>
    <input type="checkbox" id="pz6"><label for="pz6"><span class="mat-truoc">Câu 6<br>Tổng góc tam giác?</span><span class="mat-sau">C</span></label>
  </div>
  <p style="font-size:0.5em; color:#a21caf; margin-top:12px;">Từ khóa: T-O-A-N-Ọ-C 🎉</p>
</section>`
    },

    {
        id: 'slide-title-hero',
        group: 'mo-dau',
        title: 'Slide Trang bìa kiểu lớn',
        desc: 'Bìa mở đầu: nhãn nhỏ phía trên, tiêu đề cỡ lớn, một dòng định nghĩa, tên người trình bày và ngày tháng ở cuối.',
        note: 'Chỉ đổi chữ, không cần sửa style. Muốn chắc màu trên mọi theme thì bỏ các thuộc tính color đi để theme của bài quyết định.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg, #fef3c7, #fde68a)" style="color:#1f2937">
  <p style="font-size:0.4em; letter-spacing:0.28em; text-transform:uppercase; color:#b45309;">
    Báo cáo chuyên đề · 2026
  </p>
  <h1 style="font-size:1.15em; margin:18px 0 10px; color:#7c2d12;">Tiêu đề bài trình chiếu</h1>
  <p style="font-size:0.55em; color:#78350f; max-width:780px; margin:0 auto;">
    Một câu định nghĩa nội dung sẽ nói trong 15 phút tới.
  </p>
  <div style="width:90px; height:3px; background:#f59e0b; margin:26px auto;"></div>
  <p style="font-size:0.42em; color:#92400e;">Nguyễn Văn A · Trường THCS … · 15/10/2026</p>
</section>`
    },

    {
        id: 'slide-muc-luc',
        group: 'mo-dau',
        title: 'Slide Mục lục hai cột có số thứ tự',
        desc: 'Nội dung bài học hiện dần từng mục, số thứ tự trong ô tròn, chia hai cột để không tràn slide.',
        note: 'Sao chép cặp div "muc" để thêm ý; mỗi mục là một fragment nên học sinh đi theo đúng tiến trình.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#f8fafc,#eff6ff)" style="color:#1f2937">
  <h2 style="color:#0f172a;">Nội dung chính</h2>
  <div style="display:flex; gap:34px; justify-content:center; font-size:0.55em; text-align:left;">
    <div style="flex:1; max-width:420px;">
      <div class="fragment muc" style="display:flex; gap:12px; align-items:center; margin-bottom:14px;">
        <span style="flex:0 0 34px; height:34px; border-radius:50%; background:#f59e0b; color:#111;
                     display:flex; align-items:center; justify-content:center; font-weight:bold;">1</span>
        <span>Mở đầu: tình huống thực tế</span>
      </div>
      <div class="fragment muc" style="display:flex; gap:12px; align-items:center; margin-bottom:14px;">
        <span style="flex:0 0 34px; height:34px; border-radius:50%; background:#f59e0b; color:#111;
                     display:flex; align-items:center; justify-content:center; font-weight:bold;">2</span>
        <span>Định lý và cách chứng minh</span>
      </div>
      <div class="fragment muc" style="display:flex; gap:12px; align-items:center;">
        <span style="flex:0 0 34px; height:34px; border-radius:50%; background:#f59e0b; color:#111;
                     display:flex; align-items:center; justify-content:center; font-weight:bold;">3</span>
        <span>Luyện tập</span>
      </div>
    </div>
    <div style="flex:1; max-width:420px;">
      <div class="fragment muc" style="display:flex; gap:12px; align-items:center; margin-bottom:14px;">
        <span style="flex:0 0 34px; height:34px; border-radius:50%; background:#38bdf8; color:#111;
                     display:flex; align-items:center; justify-content:center; font-weight:bold;">4</span>
        <span>Vận dụng vào tình huống chiếc thang</span>
      </div>
      <div class="fragment muc" style="display:flex; gap:12px; align-items:center; margin-bottom:14px;">
        <span style="flex:0 0 34px; height:34px; border-radius:50%; background:#38bdf8; color:#111;
                     display:flex; align-items:center; justify-content:center; font-weight:bold;">5</span>
        <span>Mở rộng: màn hình tivi 16:9</span>
      </div>
      <div class="fragment muc" style="display:flex; gap:12px; align-items:center;">
        <span style="flex:0 0 34px; height:34px; border-radius:50%; background:#38bdf8; color:#111;
                     display:flex; align-items:center; justify-content:center; font-weight:bold;">6</span>
        <span>Củng cố và bài tập về nhà</span>
      </div>
    </div>
  </div>
</section>`
    },

    {
        id: 'slide-cam-on',
        group: 'mo-dau',
        title: 'Slide Kết bài — Cảm ơn & liên hệ',
        desc: 'Trang cuối: lời cảm ơn, một câu hỏi để mở discussion, khối thông tin liên hệ và tài liệu tham khảo.',
        note: 'Thêm link tài liệu bằng thẻ a bình thường; khi export PDF nhớ kiểm tra link còn đọc được.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#e0f2fe,#f0f9ff)" style="color:#1f2937">
  <h2 style="font-size:0.95em; color:#0c4a6e;">Cảm ơn đã theo dõi</h2>
  <p style="font-size:0.6em; color:#334155; max-width:680px; margin:14px auto;">
    Câu hỏi còn lại? Hãy nêu một tình huống thực tế mà bạn muốn dùng định lý này.
  </p>
  <div style="display:flex; gap:40px; justify-content:center; margin-top:28px; font-size:0.42em; color:#475569;">
    <div>
      <div style="color:#0369a1; font-weight:bold; margin-bottom:4px;">LIÊN HỆ</div>
      <div>Nguyễn Văn A</div>
      <div>email@truong.edu.vn</div>
    </div>
    <div>
      <div style="color:#0369a1; font-weight:bold; margin-bottom:4px;">TÀI LIỆU</div>
      <div>SGK Toán 8, trang 89–94</div>
      <div>Bộ đề minh hoạ 2026</div>
    </div>
  </div>
</section>`
    },

    {
        id: 'slide-big-number',
        group: 'so-lieu',
        title: 'Slide Ba con số lớn (KPI)',
        desc: 'Ba chỉ số nổi bật cỡ chữ rất lớn, kèm nhãn giải thích và xu hướng tăng/giảm — dạng hay dùng trong báo cáo.',
        note: 'Mỗi khối là một fragment nên có thể bấm từng số. Đổi mũi tên ↑ ↓ và màu xanh/đỏ theo chiều tốt/xấu của chỉ số.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#f0fdf4,#fefce8)" style="color:#1f2937">
  <h2 style="color:#14532d;">Kết quả sau một học kỳ</h2>
  <div style="display:flex; gap:30px; justify-content:center; margin-top:20px;">
    <div class="fragment" style="width:280px; text-align:center;">
      <div style="font-size:1.5em; font-weight:bold; color:#15803d; line-height:1.1;">92%</div>
      <div style="font-size:0.45em; margin-top:8px;">Học sinh đạt mức Hoàn thành tốt</div>
      <div style="font-size:0.38em; color:#15803d;">↑ 14 điểm so với học kỳ trước</div>
    </div>
    <div class="fragment" style="width:280px; text-align:center;">
      <div style="font-size:1.5em; font-weight:bold; color:#b45309; line-height:1.1;">3,4×</div>
      <div style="font-size:0.45em; margin-top:8px;">Số lượt tự học trên nền tảng</div>
      <div style="font-size:0.38em; color:#15803d;">↑ 2,1×</div>
    </div>
    <div class="fragment" style="width:280px; text-align:center;">
      <div style="font-size:1.5em; font-weight:bold; color:#b91c1c; line-height:1.1;">8</div>
      <div style="font-size:0.45em; margin-top:8px;">Học sinh cần hỗ trợ thêm</div>
      <div style="font-size:0.38em; color:#15803d;">↓ từ 17</div>
    </div>
  </div>
  <p style="font-size:0.36em; color:#6b7280; margin-top:26px;">Nguồn: cơ sở dữ liệu điểm trường, trích xuất ngày 12/05/2026 (n = 118).</p>
</section>`
    },

    {
        id: 'slide-so-sanh',
        group: 'bo-cuc',
        title: 'Slide So sánh hai phương án',
        desc: 'Hai cột đối xứng với dấu ✓ / ✗, hợp khi chọn công cụ, so hai phương pháp hoặc hai quan điểm.',
        note: 'Cột trái nền xanh, cột phải nền đỏ; muốn so nhiều hơn hai thì nhân đôi cụm div và giảm width xuống 300px.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#fafafa,#f1f5f9)" style="color:#1f2937">
  <h2 style="color:#0f172a;">Học theo bài hay học theo chuyên đề?</h2>
  <div style="display:flex; gap:22px; justify-content:center; font-size:0.48em; margin-top:16px;">
    <div style="flex:1; max-width:430px; background:#f0fdf4; border:1px solid #86efac;
                border-radius:12px; padding:16px 18px; text-align:left;">
      <div style="color:#15803d; font-weight:bold; margin-bottom:10px;">Theo bài</div>
      <ul style="margin:0; padding-left:22px;">
        <li>Đúng tiến độ chương trình, dễ đối chiếu đề kiểm tra</li>
        <li class="fragment">Kiến thức liền mạch, ít phải nhảy chương</li>
        <li class="fragment">Học sinh yếu theo được từng bước</li>
      </ul>
      <div class="fragment" style="color:#b91c1c; margin-top:10px;">✗ Khó đào sâu một chủ đề xuyên suốt</div>
    </div>
    <div style="flex:1; max-width:430px; background:#fef2f2; border:1px solid #fecaca;
                border-radius:12px; padding:16px 18px; text-align:left;">
      <div style="color:#b91c1c; font-weight:bold; margin-bottom:10px;">Theo chuyên đề</div>
      <ul style="margin:0; padding-left:22px;">
        <li>Đào sâu, phù hợp học sinh giỏi và ôn thi</li>
        <li class="fragment">Kết nối được nhiều chương trong một chủ đề</li>
        <li class="fragment">Có tài liệu dùng lại được nhiều năm</li>
      </ul>
      <div class="fragment" style="color:#b91c1c; margin-top:10px;">✗ Dễ lệch tiến độ, học sinh yếu hụt kiến thức</div>
    </div>
  </div>
</section>`
    },

    {
        id: 'slide-timeline',
        group: 'bo-cuc',
        title: 'Slide Dòng thời gian 4 mốc',
        desc: 'Trục ngang với các mốc tròn, mỗi mốc có nhãn và mô tả ngắn — kể tiến trình một dự án hoặc một giai đoạn lịch sử.',
        note: 'Trục là một div cao 3px; thêm mốc thì sao chép khối "moc" và chia đều left theo phần trăm. Muốn 5–6 mốc thì hạ font-size xuống 0.3em.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#f8fafc,#eef2ff)" style="color:#1f2937">
  <h2 style="color:#3730a3;">Tiến trình dự án 4 tuần</h2>
  <div style="position:relative; margin:40px auto 0; max-width:820px; height:120px; font-size:0.42em;">
    <div style="position:absolute; left:6%; right:6%; top:16px; height:3px; background:#cbd5e1;"></div>
    <div class="fragment moc" style="position:absolute; left:6%; width:21%; text-align:center;">
      <div style="width:20px; height:20px; border-radius:50%; background:#f59e0b; margin:8px auto;"></div>
      <div style="font-weight:bold; color:#b45309;">Tuần 1</div>
      <div>Khảo sát nhu cầu, chọn chủ đề</div>
    </div>
    <div class="fragment moc" style="position:absolute; left:27%; width:21%; text-align:center;">
      <div style="width:20px; height:20px; border-radius:50%; background:#38bdf8; margin:8px auto;"></div>
      <div style="font-weight:bold; color:#2563eb;">Tuần 2</div>
      <div>Xây nguyên mẫu, thử nội bộ</div>
    </div>
    <div class="fragment moc" style="position:absolute; left:48%; width:21%; text-align:center;">
      <div style="width:20px; height:20px; border-radius:50%; background:#a78bfa; margin:8px auto;"></div>
      <div style="font-weight:bold; color:#7c3aed;">Tuần 3</div>
      <div>Chạy thử với 2 lớp thực nghiệm</div>
    </div>
    <div class="fragment moc" style="position:absolute; left:69%; width:21%; text-align:center;">
      <div style="width:20px; height:20px; border-radius:50%; background:#4ade80; margin:8px auto;"></div>
      <div style="font-weight:bold; color:#15803d;">Tuần 4</div>
      <div>Đo kết quả, viết báo cáo</div>
    </div>
  </div>
  <p style="font-size:0.36em; color:#6b7280; margin-top:24px;">Mốc hiện dần theo từng phím bấm — vừa kể vừa chỉ.</p>
</section>`
    },

    {
        id: 'slide-bang',
        group: 'bo-cuc',
        title: 'Slide Bảng dữ liệu có dòng nhấn mạnh',
        desc: 'Bảng nhiều cột, kẻ sọc, một dòng được tô để hướng mắt vào số liệu cần bàn; từng hàng hiện dần.',
        note: 'Hàng đang so sánh thì thêm class "dang-xem" (viền vàng). Bảng dài quá 8 hàng nên chia thành hai slide thay vì thu nhỏ chữ.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#eef2ff,#f8fafc)" style="color:#1f2937">
  <h2 style="color:#3730a3;">So sánh ba phương án dạy học</h2>
  <table style="border-collapse:collapse; font-size:0.46em; margin:16px auto 0;">
    <tr style="background:#e0e7ff; color:#312e81;">
      <th style="border:1px solid #c7d2fe; padding:8px 18px;">Phương án</th>
      <th style="border:1px solid #c7d2fe; padding:8px 18px;">Thời lượng</th>
      <th style="border:1px solid #c7d2fe; padding:8px 18px;">Điểm trung bình</th>
      <th style="border:1px solid #c7d2fe; padding:8px 18px;">HS chủ động</th>
    </tr>
    <tr class="fragment" style="background:rgba(15,23,42,0.03);">
      <td style="border:1px solid #c7d2fe; padding:8px 18px;">Thuyết trình</td>
      <td style="border:1px solid #c7d2fe; padding:8px 18px;">45 phút</td>
      <td style="border:1px solid #c7d2fe; padding:8px 18px;">6,4</td>
      <td style="border:1px solid #c7d2fe; padding:8px 18px;">22%</td>
    </tr>
    <tr class="fragment dang-xem" style="outline:2px solid #d97706;">
      <td style="border:1px solid #c7d2fe; padding:8px 18px;">Kết hợp hoạt động nhóm</td>
      <td style="border:1px solid #c7d2fe; padding:8px 18px;">45 phút</td>
      <td style="border:1px solid #c7d2fe; padding:8px 18px; color:#15803d; font-weight:bold;">8,1</td>
      <td style="border:1px solid #c7d2fe; padding:8px 18px; color:#15803d;">68%</td>
    </tr>
    <tr class="fragment" style="background:rgba(15,23,42,0.03);">
      <td style="border:1px solid #c7d2fe; padding:8px 18px;">Học trên nền tảng số</td>
      <td style="border:1px solid #c7d2fe; padding:8px 18px;">60 phút</td>
      <td style="border:1px solid #c7d2fe; padding:8px 18px;">7,6</td>
      <td style="border:1px solid #c7d2fe; padding:8px 18px;">55%</td>
    </tr>
  </table>
  <p class="fragment" style="font-size:0.4em; color:#1e3a8a; margin-top:20px;">
    → Cùng thời lượng, phương án có hoạt động nhóm cho kết quả cao nhất.
  </p>
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

// Sidebar dựa vào GROUPS nên cùng một đoạn render sinh ra cả hai: thêm mẫu chỉ việc
// khai báo, khỏi phải sửa templates.html.
function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
}

const ALL = [...DECKS, ...SLIDES];
const content = document.getElementById('tpl-content');
const nav = document.getElementById('tpl-nav');
const emptyMsg = document.getElementById('tpl-empty');
const KINDS = {
    deck: { title: 'Mẫu bài trình chiếu', hint: 'Cả một bộ slide hoàn chỉnh. Bấm “Dùng mẫu này” (cần đăng nhập) để HeyShow tạo ngay một file nháp mới với toàn bộ nội dung mẫu.' },
    slide: { title: 'Mẫu slide', hint: 'Slide đơn lẻ dùng chung được cho mọi bài. Bấm “Copy” rồi dán vào file đang soạn, đặt con trỏ ở nơi muốn chèn.' },
};

// emptyMsg nằm sẵn trong markup nên phải chèn phía trước nó, nếu không thông báo
// "không tìm thấy" bị đẩy xuống cuối trang và người đọc phải cuộn tới đó mới thấy.
function addToContent(node) {
    content.insertBefore(node, emptyMsg);
}

const sections = [];   // { group, sec, live, navItem, cards: [{ card, hay }] } — tìm kiếm lọc theo cards
const kindHeads = {};
let lastKind = null;

GROUPS.forEach((g, i) => {
    if (g.kind !== lastKind) {
        lastKind = g.kind;
        const head = el('div', 'kind-head');
        head.dataset.kind = g.kind;
        head.append(el('h2', null, KINDS[g.kind].title), el('p', null, KINDS[g.kind].hint));
        addToContent(head);
        kindHeads[g.kind] = head;
        nav.appendChild(el('div', 'side-kind', KINDS[g.kind].title));
    }
    const sec = el('section', 'block');
    sec.id = 'g-' + g.id;
    const live = el('span', 'live');
    const h2 = el('h2');
    h2.append(el('span', 'num', String(i + 1)), el('span', 'g-label', g.label), live);
    sec.appendChild(h2);
    if (g.lead) sec.appendChild(el('p', 'lead', g.lead));
    const holder = el('div', 'g-cards');
    sec.appendChild(holder);
    addToContent(sec);

    const cards = ALL.filter(t => t.group === g.id).map(t => {
        const card = buildCard(t, g.kind);
        const hay = fold([t.title, t.desc, t.note, t.id].join(' '));
        holder.appendChild(card);
        return { card, hay };
    });
    const link = el('a', 'nav-item');
    link.href = '#g-' + g.id;
    link.append(el('span', 'nav-label', g.label), el('span', 'nav-cnt', String(cards.length)));
    link.addEventListener('click', e => { e.preventDefault(); selectGroup(g.id); });
    nav.appendChild(link);

    sections.push({ group: g, sec, live, navItem: link, cards });
});

// Tìm kiếm: bỏ dấu để gõ "giao an" vẫn ra "Giáo án", tiếng Việt có dấu vẫn khớp.
function fold(s) {
    return (s || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

const search = document.getElementById('tpl-search');
const layout = document.querySelector('.layout');

// Sidebar hoạt động như tab: mỗi lần chỉ một danh mục hiện ra. Nhờ vậy các iframe preview
// của danh mục khác không được nạp, trang nhẹ hơn nhiều so với tải cả kho một lúc.
let activeGroup = groupFromHash() || GROUPS[0].id;

function groupFromHash() {
    const id = (location.hash || '').replace('#g-', '');
    return GROUPS.some(g => g.id === id) ? id : null;
}

function selectGroup(id) {
    activeGroup = id;
    search.value = '';   // chọn danh mục = thoát chế độ tìm kiếm
    history.replaceState(null, '', '#g-' + id);
    applyView();
    // Đang cuộn sâu thì kéo đầu nội dung lên lại, để thấy ngay danh mục vừa chọn
    if (window.scrollY > 200) {
        const y = layout.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: Math.max(0, y) });
    }
}

function applyView() {
    const q = fold(search.value.trim());
    let shown = 0;
    sections.forEach(({ group, sec, live, navItem, cards }) => {
        let visible = 0;
        cards.forEach(({ card, hay }) => {
            const ok = !q || hay.includes(q);
            card.hidden = !ok;
            if (ok) visible++;
        });
        // Có từ khoá: tìm trong mọi danh mục. Không có từ khoá: chỉ mở tab đang chọn.
        sec.hidden = (q ? false : group.id !== activeGroup) || visible === 0;
        live.textContent = q && visible !== cards.length ? visible + '/' + cards.length : String(cards.length);
        navItem.classList.toggle('active', q ? visible > 0 : group.id === activeGroup);
        navItem.classList.toggle('muted', visible === 0);
        if (!sec.hidden) shown += visible;
    });
    Object.values(kindHeads).forEach(head => {
        head.hidden = !sections.some(s => s.group.kind === head.dataset.kind && !s.sec.hidden);
    });
    emptyMsg.hidden = shown > 0;
}
search.addEventListener('input', applyView);

// Link #g-<id> dán từ nơi khác gửi tới, hoặc nút back của trình duyệt
window.addEventListener('hashchange', () => {
    const id = groupFromHash();
    if (id && id !== activeGroup) selectGroup(id);
});

applyView();

// Nạp Reveal vào iframe preview khi cuộn tới gần, tránh tải hàng chục iframe một lúc
const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        const iframe = card.querySelector('iframe');
        const t = ALL.find(x => x.id === card.id.slice(2));
        if (iframe && t && !iframe.srcdoc) iframe.srcdoc = previewHtml(t.code);
        io.unobserve(card);
    });
}, { rootMargin: '300px 0px' });
document.querySelectorAll('.tpl').forEach(card => io.observe(card));
