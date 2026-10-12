// Một danh mục trên trang /templates: GROUP là mục trên sidebar (label + lời dẫn),
// SAMPLES là các mẫu của danh mục đó. Mỗi mẫu: id, group, title, desc, note,
// và fileName với mẫu cả bài (nút "Dùng mẫu này" cần tên file để tạo bản nháp).
// code là HeyShow thô — nền sáng là quy ước của cả kho, xem ghi chú ở templates/groups.js.

// Danh mục trên sidebar: Hiệu ứng Reveal.js
export const GROUP = {
    id: 'reveal', kind: 'deck', label: 'Hiệu ứng Reveal.js',
    lead: 'Những gì Reveal.js làm được mà mẫu thông thường không dùng tới: slide dọc lồng nhau, các kiểu hiện dần, nền màu/gradient/hoạ tiết và chuyển cảnh riêng từng slide. Vừa là mẫu, vừa là tài liệu để học theo.'
};

export const SAMPLES = [
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
