// Một danh mục trên trang /templates: GROUP là mục trên sidebar (label + lời dẫn),
// SAMPLES là các mẫu của danh mục đó. Mỗi mẫu: id, group, title, desc, note,
// và fileName với mẫu cả bài (nút "Dùng mẫu này" cần tên file để tạo bản nháp).
// code là HeyShow thô — nền sáng là quy ước của cả kho, xem ghi chú ở templates/groups.js.

// Danh mục trên sidebar: Hoạt động & game
export const GROUP = {
    id: 'hoat-dong', kind: 'deck', label: 'Hoạt động & game',
    lead: 'Slide chơi trên lớp: đố vui có đáp án hiện dần, câu lạc bộ, trò chơi ôn chương. Hoàn toàn bằng HTML/CSS nên chạy ổn định khi chiếu.'
};

export const SAMPLES = [
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
    }
];
