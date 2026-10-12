// Một danh mục trên trang /templates: GROUP là mục trên sidebar (label + lời dẫn),
// SAMPLES là các mẫu của danh mục đó. Mỗi mẫu: id, group, title, desc, note,
// và fileName với mẫu cả bài (nút "Dùng mẫu này" cần tên file để tạo bản nháp).
// code là HeyShow thô — nền sáng là quy ước của cả kho, xem ghi chú ở templates/groups.js.

// Danh mục trên sidebar: Mở đầu & kết bài
export const GROUP = {
    id: 'mo-dau', kind: 'slide', label: 'Mở đầu & kết bài',
    lead: 'Ba slide quyết định ấn tượng của cả bài: trang bìa, mục lục và trang cảm ơn — cùng một họ màu để dán vào bất kỳ bài nào.'
};

export const SAMPLES = [
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
    }
];
