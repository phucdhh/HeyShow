// Một danh mục trên trang /templates: GROUP là mục trên sidebar (label + lời dẫn),
// SAMPLES là các mẫu của danh mục đó. Mỗi mẫu: id, group, title, desc, note,
// và fileName với mẫu cả bài (nút "Dùng mẫu này" cần tên file để tạo bản nháp).
// code là HeyShow thô — nền sáng là quy ước của cả kho, xem ghi chú ở templates/groups.js.

// Danh mục trên sidebar: Giáo án lên lớp
export const GROUP = {
    id: 'giao-an', kind: 'deck', label: 'Giáo án lên lớp',
    lead: 'Bộ slide hỗ trợ dạy học: hoạt động khởi động → hình thành kiến thức → luyện tập → vận dụng → củng cố, có mục tiêu và tình huống mở đầu. Bảy môn: Toán, Ngữ văn, Vật lí, Hoá học, Sinh học, Lịch sử, Địa lí — mỗi mẫu giữ khung 5 bước và thêm phần đặc thù của môn (thí nghiệm, hoá chất và an toàn, kính hiển vi, nguồn sử liệu, Atlat).'
};

export const SAMPLES = [
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
    }
];
