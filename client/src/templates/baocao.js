// Một danh mục trên trang /templates: GROUP là mục trên sidebar (label + lời dẫn),
// SAMPLES là các mẫu của danh mục đó. Mỗi mẫu: id, group, title, desc, note,
// và fileName với mẫu cả bài (nút "Dùng mẫu này" cần tên file để tạo bản nháp).
// code là HeyShow thô — nền sáng là quy ước của cả kho, xem ghi chú ở templates/groups.js.

// Danh mục trên sidebar: Báo cáo & tiểu luận
export const GROUP = {
    id: 'bao-cao', kind: 'deck', label: 'Báo cáo & tiểu luận',
    lead: 'Trình bày kết quả làm việc: vấn đề → giải pháp → số liệu → kết luận. Phù hợp báo cáo dự án, tiểu luận, nghiệm thu đề tài.'
};

export const SAMPLES = [
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
    }
];
