// Một danh mục trên trang /templates: GROUP là mục trên sidebar (label + lời dẫn),
// SAMPLES là các mẫu của danh mục đó. Mỗi mẫu: id, group, title, desc, note,
// và fileName với mẫu cả bài (nút "Dùng mẫu này" cần tên file để tạo bản nháp).
// code là HeyShow thô — nền sáng là quy ước của cả kho, xem ghi chú ở templates/groups.js.
//
// Ràng buộc riêng của danh mục này, đừng "dọn" khi thấy trùng lặp:
// - Script BẮT BUỘC nằm trong <section>, chuyển vào <section-master> là chết: nội dung master
//   được chèn bằng insertAdjacentHTML sau khi trang đã chạy, mà HTML chèn kiểu đó thì <script>
//   chỉ tồn tại trên giấy, không bao giờ được thực thi.
// - AudioContext và speechSynthesis chỉ được khởi tạo bên trong hàm xử lý bấm (user gesture).
//   Tạo sẵn lúc trang load thì trình duyệt chặn, bấm không ra tiếng.
// - Không có file âm thanh nào đi kèm: tiếng chuông đúng/sai do Web Audio tổng hợp, còn mẫu
//   "nghe file" và mẫu "video" dùng nguồn công khai của MDN/W3Schools làm nguồn demo.
// - Script tự giới hạn trong section chứa nó nên giáo viên dán cùng một mẫu hai lần trong một bài
//   vẫn chạy đủ hai bộ; vì vậy các lớp đều nằm gọn dưới lớp cha riêng (.mbds, .bc, .tt, .fa, .vd).

// Danh mục trên sidebar: Âm thanh & video
export const GROUP = {
    id: 'am-thanh-video', kind: 'slide', label: 'Âm thanh & video',
    lead: 'Slide có tiếng và hình động: âm báo đúng/sai khi làm trắc nghiệm, chuông điều khiển lớp học, luyện nghe tiếng Anh bằng giọng đọc của trình duyệt, và video tự dừng ở các mốc thời gian để học sinh trả lời câu hỏi.'
};

export const SAMPLES = [
    {
        id: 'am-bao-dung-sai',
        group: 'am-thanh-video',
        title: 'Âm báo Đúng / Sai cho câu hỏi trắc nghiệm',
        desc: 'Bấm đáp án: đúng phát ba nốt đi lên rồi hiện giải thích và khoá câu lại, sai phát hai nốt trầm và cho thử lại.',
        note: 'Không cần file âm thanh — tiếng do Web Audio API tổng hợp, mất mạng vẫn chạy. Muốn đổi âm thì sửa hai mảng DUNG và SAI, mỗi phần tử là [tần số Hz, độ trễ giây, độ dài giây, kiểu sóng]. Đáp án đúng là nút có data-dung="1".',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#f5f3ff,#eff6ff)" style="color:#1f2937">
  <style>
    .mbds .lua { display:block; width:560px; margin:8px auto; padding:10px 16px; text-align:left;
                 border:2px solid #cbd5e1; border-radius:10px; background:#ffffff; color:#1f2937;
                 cursor:pointer; font-family:inherit; font-size:0.6em; transition:border-color .15s; }
    .mbds .lua:hover { border-color:#f59e0b; }
    .mbds .lua.sai { border-color:#dc2626; background:#fee2e2; color:#7f1d1d; }
    .mbds .lua.dung { border-color:#16a34a; background:#dcfce7; color:#14532d; }
    .mbds .lua:disabled { cursor:default; }
    .mbds .giai { display:none; width:560px; margin:12px auto 0; padding:10px 16px; text-align:left;
                  border-left:4px solid #f59e0b; background:#ffffff; border-radius:8px; font-size:0.5em; }
    .mbds .thai { font-size:0.45em; color:#6b7280; }
  </style>
  <h2 style="color:#6d28d9;">Câu 3. Phương trình $x^2 - 5x + 6 = 0$ có hai nghiệm là</h2>
  <div class="mbds">
    <button type="button" class="lua">A. $x = 1$ và $x = 6$</button>
    <button type="button" class="lua" data-dung="1">B. $x = 2$ và $x = 3$</button>
    <button type="button" class="lua">C. $x = -2$ và $x = -3$</button>
    <button type="button" class="lua">D. Phương trình vô nghiệm</button>
    <p class="giai"><b>Giải thích:</b> $x^2 - 5x + 6 = (x-2)(x-3)$, tích bằng $0$ khi một trong hai nhân tử
      bằng $0$ ⇒ $x = 2$ hoặc $x = 3$. Kiểm tra lại theo Viète: tổng bằng $5$, tích bằng $6$.</p>
    <p class="thai">Bấm một đáp án, máy sẽ phát tiếng báo hiệu.</p>
  </div>
  <script>
    (function () {
      var sec = document.currentScript.closest('section');
      var box = sec.querySelector('.mbds');
      var ctx = null;
      function play(list) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!ctx) ctx = new AC();
        if (ctx.state === 'suspended') ctx.resume();
        list.forEach(function (n) {
          var t = ctx.currentTime + n[1];
          var o = ctx.createOscillator();
          var v = ctx.createGain();
          o.type = n[3];
          o.frequency.setValueAtTime(n[0], t);
          v.gain.setValueAtTime(0.0001, t);
          v.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
          v.gain.exponentialRampToValueAtTime(0.0001, t + n[2]);
          o.connect(v);
          v.connect(ctx.destination);
          o.start(t);
          o.stop(t + n[2] + 0.05);
        });
      }
      var DUNG = [[523.25, 0, 0.15, 'sine'], [659.25, 0.13, 0.15, 'sine'], [784.00, 0.26, 0.32, 'sine']];
      var SAI = [[311.13, 0, 0.16, 'square'], [233.08, 0.14, 0.30, 'square']];
      var xong = false;
      box.querySelectorAll('.lua').forEach(function (b) {
        b.addEventListener('click', function () {
          if (xong) return;
          if (b.getAttribute('data-dung') === '1') {
            xong = true;
            play(DUNG);
            b.classList.add('dung');
            box.querySelector('.giai').style.display = 'block';
            box.querySelector('.thai').textContent = 'Chính xác!';
            box.querySelectorAll('.lua').forEach(function (x) { x.disabled = true; });
          } else {
            play(SAI);
            b.classList.add('sai');
            box.querySelector('.thai').textContent = 'Chưa đúng — bấm đáp án khác để thử lại.';
            setTimeout(function () { b.classList.remove('sai'); }, 1200);
          }
        });
      });
    })();
  </script>
</section>`
    },

    {
        id: 'chuong-lop-hoc',
        group: 'am-thanh-video',
        title: 'Bảng chuông điều khiển lớp học',
        desc: 'Bốn tiếng chuông đặt trên một slide: bắt đầu giờ, nhắc trật tự, hết giờ và tuyên dương — bấm là nghe ngay.',
        note: 'Mỗi nút một motif riêng, khai trong mảng LIST: [tần số Hz, độ trễ giây, độ dài giây, kiểu sóng]. Muốn chuông to hơn thì tăng mức 0.25 ở dòng exponentialRampToValueAtTime trong hàm play().',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#fff7ed,#fefce8)" style="color:#1f2937">
  <style>
    .bc .bang { display:grid; grid-template-columns:repeat(2,300px); gap:18px; justify-content:center; }
    .bc button { height:140px; border:3px solid #fdba74; border-radius:16px; background:#ffffff;
                 color:#7c2d12; cursor:pointer; font-family:inherit; }
    .bc button:hover { border-color:#f59e0b; box-shadow:0 4px 14px rgba(245,158,11,.25); }
    .bc .to { display:block; font-size:1.6em; line-height:1.4; }
    .bc .nho { display:block; font-size:0.5em; color:#9a3412; }
    .bc .thai { font-size:0.45em; color:#9a3412; }
  </style>
  <h2 style="color:#b45309;">🔔 Bảng chuông lớp học</h2>
  <div class="bc">
    <div class="bang">
      <button type="button" data-dong="vao"><span class="to">🎵</span><span class="nho">Bắt đầu giờ</span></button>
      <button type="button" data-dong="trat"><span class="to">🤫</span><span class="nho">Nhắc trật tự</span></button>
      <button type="button" data-dong="het"><span class="to">⏰</span><span class="nho">Hết giờ</span></button>
      <button type="button" data-dong="khen"><span class="to">🏆</span><span class="nho">Tuyên dương</span></button>
    </div>
    <p class="thai">Bấm một ô để nghe thử.</p>
  </div>
  <script>
    (function () {
      var sec = document.currentScript.closest('section');
      var box = sec.querySelector('.bc');
      var ctx = null;
      function play(list) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!ctx) ctx = new AC();
        if (ctx.state === 'suspended') ctx.resume();
        list.forEach(function (n) {
          var t = ctx.currentTime + n[1];
          var o = ctx.createOscillator();
          var v = ctx.createGain();
          o.type = n[3];
          o.frequency.setValueAtTime(n[0], t);
          v.gain.setValueAtTime(0.0001, t);
          v.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
          v.gain.exponentialRampToValueAtTime(0.0001, t + n[2]);
          o.connect(v);
          v.connect(ctx.destination);
          o.start(t);
          o.stop(t + n[2] + 0.05);
        });
      }
      var LIST = {
        vao: [[523.25, 0, 0.18, 'triangle'], [659.25, 0.16, 0.18, 'triangle'],
              [783.99, 0.32, 0.18, 'triangle'], [1046.5, 0.48, 0.4, 'triangle']],
        trat: [[1200, 0, 0.06, 'square'], [1200, 0.2, 0.06, 'square'], [1500, 0.4, 0.09, 'square']],
        het: [[880, 0, 0.2, 'sine'], [659.25, 0.22, 0.2, 'sine'], [523.25, 0.44, 0.5, 'sine']],
        khen: [[523.25, 0, 0.12, 'triangle'], [659.25, 0.1, 0.12, 'triangle'],
               [783.99, 0.2, 0.12, 'triangle'], [1046.5, 0.3, 0.35, 'triangle'],
               [1318.5, 0.45, 0.5, 'triangle']]
      };
      box.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          play(LIST[b.getAttribute('data-dong')]);
          box.querySelector('.thai').textContent = b.querySelector('.nho').textContent + ' — đã phát.';
        });
      });
    })();
  </script>
</section>`
    },

    {
        id: 'luyen-nghe-tts',
        group: 'am-thanh-video',
        title: 'Luyện nghe – nói tiếng Anh không cần file',
        desc: 'Mỗi câu có hai nút: ▶ đọc chuẩn và 🐢 đọc chậm. Học sinh nghe rồi đọc lại, giáo viên có thể thêm bao nhiêu câu tùy bài.',
        note: 'Giọng đọc lấy từ trình duyệt (Web Speech API), không cần mạng và không cần file. Âm sắc tuỳ máy: Chrome/Edge có giọng en-GB, Safari dùng giọng của macOS/iOS. Máy chưa cài giọng tiếng Anh thì slide báo "máy chưa có giọng đọc" — trường hợp đó hãy dùng mẫu "Nghe từ file âm thanh".',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#ecfeff,#f0f9ff)" style="color:#1f2937">
  <style>
    .tt .row { display:flex; align-items:center; gap:12px; width:640px; margin:10px auto; padding:8px 14px;
               background:#ffffff; border:1px solid #a5f3fc; border-radius:12px; text-align:left; }
    .tt .cau { flex:1; }
    .tt .en { font-size:0.6em; color:#0e7490; }
    .tt .vi { font-size:0.42em; color:#6b7280; }
    .tt .noi { width:52px; height:52px; flex:0 0 52px; border-radius:50%; border:2px solid #06b6d4;
               background:#ecfeff; cursor:pointer; font-family:inherit; font-size:0.6em; }
    .tt .noi:hover { background:#cffafe; }
    .tt .dung { font-size:0.45em; padding:6px 16px; border-radius:10px; border:2px solid #0e7490;
                background:#ffffff; color:#0e7490; cursor:pointer; font-family:inherit; }
    .tt .thai { font-size:0.45em; color:#6b7280; }
  </style>
  <h2 style="color:#0e7490;">🎧 Listen and repeat</h2>
  <div class="tt">
    <div class="row" data-en="She sells seashells by the seashore.">
      <div class="cau"><div class="en">She sells seashells by the seashore.</div>
        <div class="vi">Cô ấy bán vỏ sò bên bờ biển.</div></div>
      <button type="button" class="noi" data-tocdo="1">▶</button>
      <button type="button" class="noi" data-tocdo="0.6">🐢</button>
    </div>
    <div class="row" data-en="Could you tell me the way to the museum?">
      <div class="cau"><div class="en">Could you tell me the way to the museum?</div>
        <div class="vi">Bạn chỉ giúp tôi đường tới bảo tàng được không?</div></div>
      <button type="button" class="noi" data-tocdo="1">▶</button>
      <button type="button" class="noi" data-tocdo="0.6">🐢</button>
    </div>
    <div class="row" data-en="I have been studying English for three years.">
      <div class="cau"><div class="en">I have been studying English for three years.</div>
        <div class="vi">Tôi đã học tiếng Anh được ba năm rồi.</div></div>
      <button type="button" class="noi" data-tocdo="1">▶</button>
      <button type="button" class="noi" data-tocdo="0.6">🐢</button>
    </div>
    <p><button type="button" class="dung">Dừng</button></p>
    <p class="thai">Bấm ▶ để nghe, 🐢 để nghe chậm, rồi đọc to theo.</p>
  </div>
  <script>
    (function () {
      var sec = document.currentScript.closest('section');
      var box = sec.querySelector('.tt');
      var thai = box.querySelector('.thai');
      var co = window.speechSynthesis && window.SpeechSynthesisUtterance;
      var giong = [];
      function timGiong() {
        if (!co) return;
        giong = speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
      }
      timGiong();
      if (co) speechSynthesis.addEventListener('voiceschanged', timGiong);
      function noi(row, tocDo) {
        if (!co) { thai.textContent = 'Máy này chưa có giọng đọc tiếng Anh — mở bằng Chrome hoặc Edge.'; return; }
        if (!giong.length) timGiong();
        var text = row.getAttribute('data-en');
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-GB';
        u.rate = tocDo;
        u.pitch = 1;
        var anh = giong.filter(function (v) { return /en[-_]GB/i.test(v.lang); })[0] || giong[0];
        if (anh) u.voice = anh;
        u.onend = function () { thai.textContent = 'Xong — đọc to lại một lần nữa theo.'; };
        thai.textContent = (tocDo < 1 ? 'Đọc chậm: ' : 'Đang đọc: ') + text;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      }
      box.querySelectorAll('.noi').forEach(function (b) {
        b.addEventListener('click', function () {
          noi(b.closest('.row'), parseFloat(b.getAttribute('data-tocdo')));
        });
      });
      box.querySelector('.dung').addEventListener('click', function () {
        if (co) speechSynthesis.cancel();
        thai.textContent = 'Đã dừng.';
      });
    })();
  </script>
</section>`
    },

    {
        id: 'nghe-ep-file',
        group: 'am-thanh-video',
        title: 'Slide nghe từ file âm thanh, có nút nghe lại và chỉnh tốc độ',
        desc: '<audio controls> kèm ba nút: ▶ Nghe lại, 🐢 0.75× và ▶ 1×; đáp án giấu trong mục Gợi ý để học sinh nghe xong mới mở.',
        note: 'src trong mẫu là tiếng minh hoạ của MDN, chỉ để thử cơ chế — thay bằng file của mình bằng cách dán đường dẫn TRỰC TIẾP tới .mp3/.ogg (chắc ăn nhất là chép file lên máy chủ trường; Google Drive phải để "Bất kỳ ai có link" và nhiều khi vẫn không phát được). File ngắn cũng nhúng thẳng được dưới dạng data URI: data:audio/mpeg;base64,…',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#f0fdf4,#ecfeff)" style="color:#1f2937">
  <style>
    .fa .may { width:620px; margin:0 auto; }
    .fa audio { width:100%; }
    .fa .hang { display:flex; gap:10px; justify-content:center; margin-top:10px; }
    .fa .hang button { font-family:inherit; font-size:0.45em; padding:8px 16px; border-radius:10px;
                       border:2px solid #16a34a; background:#ffffff; color:#14532d; cursor:pointer; }
    .fa .hang button:hover { background:#dcfce7; }
    .fa .goi { width:620px; margin:12px auto 0; text-align:left; font-size:0.5em;
               background:#ffffff; border:1px solid #86efac; border-radius:10px; padding:8px 16px; cursor:pointer; }
    .fa .thai { font-size:0.45em; color:#6b7280; }
  </style>
  <h2 style="color:#15803d;">🔊 Nghe và đoán</h2>
  <p style="font-size:0.5em; color:#4b5563;">Đây là âm thanh gì? Nghe hai lần rồi mới mở gợi ý.</p>
  <div class="fa">
    <div class="may">
      <audio controls preload="metadata">
        <source src="https://mdn.github.io/shared-assets/audio/t-rex-roar.mp3" type="audio/mpeg">
      </audio>
      <div class="hang">
        <button type="button" class="nlai">▶ Nghe lại</button>
        <button type="button" class="cham">🐢 0.75×</button>
        <button type="button" class="binh">▶ 1×</button>
      </div>
      <details class="goi">
        <summary style="font-weight:bold; color:#15803d;">Gợi ý đáp án</summary>
        <p>Tiếng khủng long bạo chúa — một âm thanh minh hoạ trong thư viện mẫu của MDN.</p>
      </details>
      <p class="thai">Đang tải file âm thanh…</p>
    </div>
  </div>
  <script>
    (function () {
      var sec = document.currentScript.closest('section');
      var box = sec.querySelector('.fa');
      var audio = box.querySelector('audio');
      var nguon = box.querySelector('source');
      var thai = box.querySelector('.thai');
      function giay(t) { return (Math.round(t * 10) / 10) + ' giây'; }
      audio.addEventListener('loadedmetadata', function () {
        thai.textContent = 'Độ dài ' + giay(audio.duration) + ' — bấm ▶ Nghe lại để cho cả lớp nghe.';
      });
      nguon.addEventListener('error', function () {
        thai.textContent = 'Không tải được file âm thanh. Kiểm tra đường dẫn và mạng, rồi dán link khác vào thẻ source.';
      });
      box.querySelector('.nlai').addEventListener('click', function () {
        audio.currentTime = 0;
        audio.play();
      });
      box.querySelector('.cham').addEventListener('click', function () {
        audio.playbackRate = 0.75;
        audio.play();
      });
      box.querySelector('.binh').addEventListener('click', function () {
        audio.playbackRate = 1;
        audio.play();
      });
    })();
  </script>
</section>`
    },

    {
        id: 'video-dung-moc',
        group: 'am-thanh-video',
        title: 'Video tự dừng ở các mốc, mỗi mốc một câu hỏi',
        desc: 'Khai các mốc giây trong data-moc; tới mốc là video tạm dừng và câu hỏi hiện ra, trả lời xong bấm Tiếp tục để chiếu tiếp.',
        note: 'data-moc="2,5,8" nghĩa là dừng ở 0:02, 0:05, 0:08; thêm mốc thì thêm một khối .ch với data-so tương ứng. src trong mẫu là video demo 10 giây của W3Schools (Big Buck Bunny), hãy thay bằng video bài học của bạn — mọi khối .lua có data-dung="1" là đáp án đúng. Nếu mạng chặn video, bấm "Chạy thử câu hỏi" để xem cơ chế dừng vẫn hoạt động.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#eef2ff,#f8fafc)" style="color:#1f2937">
  <style>
    .vd .man { width:600px; margin:0 auto; }
    .vd video { width:100%; max-height:290px; border-radius:12px; background:#0f172a; }
    .vd .moc { display:flex; gap:8px; justify-content:center; margin:8px 0; }
    .vd .moc span { font-size:0.42em; padding:4px 12px; border-radius:999px; border:1px solid #c7d2fe;
                    background:#ffffff; color:#3730a3; }
    .vd .moc span.hoi { border-color:#f59e0b; background:#fef3c7; color:#7c2d12; }
    .vd .moc span.xong { border-color:#16a34a; background:#dcfce7; color:#14532d; }
    .vd .ch { display:none; width:600px; margin:0 auto; padding:10px 16px; text-align:left;
              background:#ffffff; border:2px solid #c7d2fe; border-radius:12px; }
    .vd .ch.on { display:block; }
    .vd .ch .h { font-size:0.52em; color:#4338ca; margin:0 0 6px; }
    .vd .ch .lua { display:block; width:100%; margin:4px 0; padding:6px 12px; text-align:left;
                   font-family:inherit; font-size:0.45em; border:2px solid #cbd5e1; border-radius:10px;
                   background:#ffffff; color:#1f2937; cursor:pointer; }
    .vd .ch .lua.sai { border-color:#dc2626; background:#fee2e2; }
    .vd .ch .lua.dung { border-color:#16a34a; background:#dcfce7; }
    .vd .ch .giai { display:none; font-size:0.42em; color:#14532d; }
    .vd .ch .tiep { display:none; margin-top:6px; font-family:inherit; font-size:0.45em; padding:6px 16px;
                    border-radius:10px; border:2px solid #4f46e5; background:#4f46e5; color:#ffffff; cursor:pointer; }
    .vd .ch .tiep.on { display:inline-block; }
    .vd .len { text-align:center; margin-top:8px; }
    .vd .len button { font-family:inherit; font-size:0.42em; padding:6px 14px; border-radius:10px;
                      border:1px solid #c7d2fe; background:#ffffff; color:#4338ca; cursor:pointer; }
    .vd .thai { font-size:0.42em; color:#6b7280; }
  </style>
  <h2 style="color:#4338ca;">🎬 Xem video và trả lời ở từng mốc</h2>
  <div class="vd" data-moc="2,5,8">
    <div class="man">
      <video controls preload="metadata" playsinline>
        <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
      </video>
      <div class="moc"></div>
      <div class="ch" data-so="1">
        <p class="h"><b>Mốc 0:02 —</b> Nhân vật chính của đoạn video là con gì?</p>
        <button type="button" class="lua">A. Một con mèo</button>
        <button type="button" class="lua" data-dung="1">B. Một con thỏ</button>
        <button type="button" class="lua">C. Một chú gấu</button>
        <button type="button" class="lua">D. Một chú bé</button>
        <p class="giai">Nhân vật chính là chú thỏ to trong phim hoạt hình 3D "Big Buck Bunny" của Blender Foundation.</p>
        <button type="button" class="tiep">▶ Tiếp tục chiếu</button>
      </div>
      <div class="ch" data-so="2">
        <p class="h"><b>Mốc 0:05 —</b> Đoạn video này được tạo ra bằng cách nào?</p>
        <button type="button" class="lua">A. Quay bằng máy quay</button>
        <button type="button" class="lua" data-dung="1">B. Dựng hình 3D (hoạt hình máy tính)</button>
        <button type="button" class="lua">C. Vẽ tay rồi chụp lại</button>
        <button type="button" class="lua">D. Ảnh ghép</button>
        <p class="giai">Phim được làm bằng Blender, phần mềm mã nguồn mở.</p>
        <button type="button" class="tiep">▶ Tiếp tục chiếu</button>
      </div>
      <div class="ch" data-so="3">
        <p class="h"><b>Mốc 0:08 —</b> Bối cảnh mở đầu của đoạn video là?</p>
        <button type="button" class="lua">A. Một thành phố đông xe</button>
        <button type="button" class="lua">B. Trong một lớp học</button>
        <button type="button" class="lua" data-dung="1">C. Bãi cỏ ven hồ có nhiều hoa</button>
        <button type="button" class="lua">D. Khu rừng tuyết</button>
        <p class="giai">Thỏ tỉnh dậy giữa bãi cỏ đầy hoa, bên cạnh dòng suối nhỏ.</p>
        <button type="button" class="tiep">▶ Tiếp tục chiếu</button>
      </div>
      <div class="len"><button type="button" class="thu">Chạy thử câu hỏi (không cần video)</button></div>
      <p class="thai">Bấm ▶ trên video để bắt đầu; tới các mốc đã khai, video tự dừng và câu hỏi hiện ra.</p>
    </div>
  </div>
  <script>
    (function () {
      var sec = document.currentScript.closest('section');
      var box = sec.querySelector('.vd');
      var video = box.querySelector('video');
      var nguon = box.querySelector('source');
      var thai = box.querySelector('.thai');
      var danhSach = box.getAttribute('data-moc').split(',').map(function (x) { return parseFloat(x); });
      var khoi = {}, chip = {};
      box.querySelectorAll('.ch').forEach(function (c) { khoi[c.getAttribute('data-so')] = c; });
      danhSach.forEach(function (t, i) {
        var s = document.createElement('span');
        s.textContent = '0:' + (t < 10 ? '0' : '') + t;
        box.querySelector('.moc').appendChild(s);
        chip[i + 1] = s;
      });
      var ctx = null;
      function bam(dai, tran) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!ctx) ctx = new AC();
        if (ctx.state === 'suspended') ctx.resume();
        var o = ctx.createOscillator(), v = ctx.createGain(), t = ctx.currentTime;
        o.type = 'sine';
        o.frequency.setValueAtTime(tran ? 233.08 : 784, t);
        v.gain.setValueAtTime(0.0001, t);
        v.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        v.gain.exponentialRampToValueAtTime(0.0001, t + dai);
        o.connect(v);
        v.connect(ctx.destination);
        o.start(t);
        o.stop(t + dai + 0.05);
      }
      var mo = null;
      function hoi(so) {
        if (mo || !khoi[so]) return;
        video.pause();
        mo = so;
        chip[so].className = 'hoi';
        khoi[so].classList.add('on');
        thai.textContent = 'Video đang dừng ở mốc ' + chip[so].textContent + '.';
      }
      video.addEventListener('timeupdate', function () {
        if (mo) return;
        for (var i = 0; i < danhSach.length; i++) {
          var so = i + 1;
          if (chip[so].className === 'xong') continue;
          if (video.currentTime >= danhSach[i]) { hoi(so); break; }
        }
      });
      Object.keys(khoi).forEach(function (so) {
        var k = khoi[so];
        k.querySelectorAll('.lua').forEach(function (b) {
          b.addEventListener('click', function () {
            var dung = b.getAttribute('data-dung') === '1';
            bam(dung ? 0.18 : 0.3, !dung);
            if (dung) {
              k.querySelectorAll('.lua').forEach(function (x) { x.disabled = true; });
              b.classList.add('dung');
              k.querySelector('.giai').style.display = 'block';
              k.querySelector('.tiep').classList.add('on');
            } else {
              b.classList.add('sai');
              setTimeout(function () { b.classList.remove('sai'); }, 1000);
            }
          });
        });
        k.querySelector('.tiep').addEventListener('click', function () {
          chip[so].className = 'xong';
          k.classList.remove('on');
          mo = null;
          thai.textContent = 'Mốc ' + chip[so].textContent + ' đã hoàn thành — video chạy tiếp.';
          video.play();
        });
      });
      box.querySelector('.thu').addEventListener('click', function () {
        for (var so = 1; so <= danhSach.length; so++) {
          if (chip[so].className !== 'xong') { hoi(so); return; }
        }
        thai.textContent = 'Đã trả lời hết các mốc.';
      });
      nguon.addEventListener('error', function () {
        thai.textContent = 'Không tải được video demo. Thay src bằng video của bạn, hoặc bấm "Chạy thử câu hỏi".';
      });
    })();
  </script>
</section>`
    }
];
