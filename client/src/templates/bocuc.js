// Một danh mục trên trang /templates: GROUP là mục trên sidebar (label + lời dẫn),
// SAMPLES là các mẫu của danh mục đó. Mỗi mẫu: id, group, title, desc, note,
// và fileName với mẫu cả bài (nút "Dùng mẫu này" cần tên file để tạo bản nháp).
// code là HeyShow thô — nền sáng là quy ước của cả kho, xem ghi chú ở templates/groups.js.

// Danh mục trên sidebar: Bảng, sơ đồ & bố cục
export const GROUP = {
    id: 'bo-cuc', kind: 'slide', label: 'Bảng, sơ đồ & bố cục',
    lead: 'Những khung dựng sẵn để bài có nhịp: so sánh hai phương án, dòng thời gian dự án và bảng số liệu có dòng nhấn mạnh.'
};

export const SAMPLES = [
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
