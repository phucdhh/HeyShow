// Một danh mục trên trang /templates: GROUP là mục trên sidebar (label + lời dẫn),
// SAMPLES là các mẫu của danh mục đó. Mỗi mẫu: id, group, title, desc, note,
// và fileName với mẫu cả bài (nút "Dùng mẫu này" cần tên file để tạo bản nháp).
// code là HeyShow thô — nền sáng là quy ước của cả kho, xem ghi chú ở templates/groups.js.

// Danh mục trên sidebar: Số liệu & đồ thị
export const GROUP = {
    id: 'so-lieu', kind: 'slide', label: 'Số liệu & đồ thị',
    lead: 'Biểu đồ cột, biểu đồ tròn, ba con số lớn và đồ thị hàm số vẽ bằng SVG/CSS thuần — sửa số liệu là hình vẽ đổi theo, không cần thư viện.'
};

export const SAMPLES = [
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
    }
];
