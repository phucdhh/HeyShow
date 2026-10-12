// Một danh mục trên trang /templates: GROUP là mục trên sidebar (label + lời dẫn),
// SAMPLES là các mẫu của danh mục đó. Mỗi mẫu: id, group, title, desc, note,
// và fileName với mẫu cả bài (nút "Dùng mẫu này" cần tên file để tạo bản nháp).
// code là HeyShow thô — nền sáng là quy ước của cả kho, xem ghi chú ở templates/groups.js.

// Danh mục trên sidebar: Chuyên đề & bồi dưỡng
export const GROUP = {
    id: 'chuyen-de', kind: 'deck', label: 'Chuyên đề & bồi dưỡng',
    lead: 'Bài giảng sâu hơn sách giáo khoa: lý thuyết → ví dụ giải từng bước → bài tập → mở rộng. Dùng cho chuyên đề bồi dưỡng học sinh giỏi và ôn thi.'
};

export const SAMPLES = [
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
    }
];
