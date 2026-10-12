// Một danh mục trên trang /templates: GROUP là mục trên sidebar (label + lời dẫn),
// SAMPLES là các mẫu của danh mục đó. Mỗi mẫu: id, group, title, desc, note,
// và fileName với mẫu cả bài (nút "Dùng mẫu này" cần tên file để tạo bản nháp).
// code là HeyShow thô — nền sáng là quy ước của cả kho, xem ghi chú ở templates/groups.js.

// Danh mục trên sidebar: Hướng dẫn & quy trình
export const GROUP = {
    id: 'quy-trinh', kind: 'deck', label: 'Hướng dẫn & quy trình',
    lead: 'Hướng dẫn người khác làm một việc: chuẩn bị → từng bước thực hiện → lỗi thường gặp → mẹo. Đổi tên phần mềm/quy trình là dùng được ngay.'
};

export const SAMPLES = [
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
    }
];
