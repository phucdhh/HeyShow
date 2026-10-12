// Một danh mục trên trang /templates: GROUP là mục trên sidebar (label + lời dẫn),
// SAMPLES là các mẫu của danh mục đó. Mỗi mẫu: id, group, title, desc, note,
// và fileName với mẫu cả bài (nút "Dùng mẫu này" cần tên file để tạo bản nháp).
// code là HeyShow thô — nền sáng là quy ước của cả kho, xem ghi chú ở templates/groups.js.

// Danh mục trên sidebar: Slide tương tác
export const GROUP = {
    id: 'tuong-tac', kind: 'slide', label: 'Slide tương tác',
    lead: 'Học sinh bấm trực tiếp trên slide khi trình chiếu: trắc nghiệm đổi màu đúng/sai, ghép đôi, điền khuyết, puzzle giải mã từ khóa.'
};

export const SAMPLES = [
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
    }
];
