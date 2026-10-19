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
// - Video: thẻ <video> (.mp4 hoặc .m3u8 + hls.js) phát được trên CẢ trang publish, vì CSP sandbox
//   của /show chỉ siết script, không chạm quyền media. iframe YouTube thì khác — sandbox lan xuống
//   iframe con nên trang publish chỉ còn một ô đen đặc. Mẫu video vì thế nhận ra sandbox và ẩn khung
//   YouTube đi ngay, thà hiện hướng dẫn còn hơn để giáo viên đứng lớp thấy màn hình đen.
// - Không có file âm thanh nào đi kèm: tiếng chuông đúng/sai do Web Audio tổng hợp, còn mẫu
//   "nghe file" và mẫu "video" dùng nguồn công khai của MDN/W3Schools làm nguồn demo.
// - Script tự giới hạn trong section chứa nó nên giáo viên dán cùng một mẫu hai lần trong một bài
//   vẫn chạy đủ hai bộ; vì vậy các lớp đều nằm gọn dưới lớp cha riêng (.mbds, .bc, .tt, .fa, .vd,
//   .gsp). Hai mẫu video dùng chung một cơ chế nhưng đặt tên lớp khác nhau: dán cả hai vào cùng một
//   bài thì <style> của chúng là toàn cục, trùng tên là mẫu này ghi đè mẫu kia.

// Danh mục trên sidebar: Âm thanh & video
export const GROUP = {
    id: 'am-thanh-video', kind: 'slide', label: 'Âm thanh & video',
    lead: 'Slide có tiếng và hình động: âm báo đúng/sai khi làm trắc nghiệm, chuông điều khiển lớp học, luyện nghe tiếng Anh bằng giọng đọc của trình duyệt, và video tự dừng ở các mốc thời gian để học sinh trả lời câu hỏi. Với video, chỉ cần dán link Gan Jing World vào data-gjw — HeyShow tự tìm nguồn phát. HeyShow không hỗ trợ chèn video từ YouTube.'
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
        desc: 'Dán link video Gan Jing World vào data-gjw là clip tự phát và tự dừng ở các mốc để hỏi bài; cũng nhận link trực tiếp .mp4 và .m3u8. Bấm một nút mốc dưới clip để nhảy thẳng tới cảnh đó.',
        note: 'Nguồn clip, chọn một trong ba: data-gjw="link" — dán link video trên Gan Jing World (ganjingworld.com/video/<ID> hoặc link chia sẻ /s/<code>), HeyShow tự tìm nguồn phát nên khỏi phải dò file .m3u8; data-src="*.mp4" hoặc thẻ <source> — link trực tiếp tới file .mp4; data-m3u8="*.m3u8" — link HLS, nhớ xóa thẻ <source>. HeyShow không hỗ trợ chèn video từ YouTube, và Google Drive cũng không dùng được: muốn chiếu clip trên YouTube thì tải nó lên Gan Jing World rồi dán link vào data-gjw. Dãy mốc: data-moc="2,5,8" là dừng ở 0:02, 0:05, 0:08; thêm mốc thì thêm một khối .ch với data-so tăng dần, đáp án đúng là nút có data-dung="1". Bấm một nút mốc dưới clip để nhảy thẳng tới cảnh đó, khỏi tua tay clip hàng chục phút. Bố cục hai cột: clip và dải mốc bên trái, câu hỏi bên phải nên cả bốn đáp án lẫn dòng giải thích luôn nằm trong màn hình. Nếu mạng chặn clip, bấm "Chạy thử câu hỏi" để phần hỏi đáp vẫn chạy được.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#eef2ff,#f8fafc)" style="color:#1f2937">
  <style>
    .vd .man { display:flex; flex-wrap:wrap; gap:6px 20px; width:920px; margin:0 auto; }
    .vd .trai { flex:0 0 520px; }
    .vd .phai { flex:1 1 360px; min-width:0; }
    .vd video { display:block; width:100%; max-width:100%; max-height:none; border-radius:12px;
                 background:#0f172a; }
    .vd iframe { display:block; width:100%; max-width:100%; height:293px; border:0; border-radius:12px;
                  background:#0f172a; }
    .vd .bao { display:none; margin:8px 0 0; padding:8px 14px; text-align:left; font-size:0.4em;
                color:#7c2d12; background:#fef3c7; border:1px solid #f59e0b; border-radius:10px; }
    .vd .moc { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-start; margin:8px 0 0; }
    .vd .moc span { font-size:0.42em; padding:4px 12px; border-radius:999px; border:1px solid #c7d2fe;
                     background:#ffffff; color:#3730a3; cursor:pointer; }
    .vd .moc span.hoi { border-color:#f59e0b; background:#fef3c7; color:#7c2d12; }
    .vd .moc span.xong { border-color:#16a34a; background:#dcfce7; color:#14532d; }
    .vd .cho { margin:0; padding:12px 16px; font-size:0.44em; color:#6b7280; background:#ffffff;
                border:2px dashed #c7d2fe; border-radius:12px; }
    .vd .phai.co .cho { display:none; }
    .vd .ch { display:none; margin:0; padding:12px 16px; text-align:left; background:#ffffff;
               border:2px solid #c7d2fe; border-radius:12px; }
    .vd .ch.on { display:block; }
    .vd .ch .h { font-size:0.5em; color:#4338ca; margin:0 0 6px; }
    .vd .ch .lua { display:block; width:100%; margin:4px 0; padding:5px 12px; text-align:left;
                    font-family:inherit; font-size:0.44em; border:2px solid #cbd5e1; border-radius:10px;
                    background:#ffffff; color:#1f2937; cursor:pointer; }
    .vd .ch .lua.sai { border-color:#dc2626; background:#fee2e2; }
    .vd .ch .lua.dung { border-color:#16a34a; background:#dcfce7; }
    .vd .ch .giai { display:none; font-size:0.4em; color:#14532d; }
    .vd .ch .tiep { display:none; margin-top:6px; font-family:inherit; font-size:0.44em; padding:5px 16px;
                     border-radius:10px; border:2px solid #4f46e5; background:#4f46e5; color:#ffffff;
                     cursor:pointer; }
    .vd .ch .tiep.on { display:inline-block; }
    .vd .len { flex:0 0 100%; margin:0; }
    .vd .len button { font-family:inherit; font-size:0.42em; padding:5px 14px; border-radius:10px;
                       border:1px solid #c7d2fe; background:#ffffff; color:#4338ca; cursor:pointer; }
    .vd .thai { flex:0 0 100%; margin:0; font-size:0.4em; color:#6b7280; }
  </style>
  <h2 style="color:#4338ca; font-size: 0.6em;">🎬 Xem video và trả lời ở từng mốc</h2>
  <div class="vd" data-moc="2,5,8">
    <div class="man">
      <div class="trai">
        <video controls preload="metadata" playsinline>
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
        </video>
        <p class="bao">Clip này không phát được trên trang đang mở — kiểm tra lại mạng hoặc nguồn clip.
          Muốn làm phần hỏi đáp ngay, bấm "Chạy thử câu hỏi".</p>
        <div class="moc"></div>
      </div>
      <div class="phai">
        <p class="cho">Câu hỏi của từng mốc hiện ra ở cột này — bấm ▶ để bắt đầu, clip sẽ tự dừng ở mỗi mốc.</p>
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
      </div>
      <div class="len"><button type="button" class="thu">Chạy thử câu hỏi (không cần video)</button></div>
      <p class="thai">Bấm ▶ trên video để bắt đầu; tới các mốc đã khai, video tự dừng và câu hỏi hiện ra.</p>
    </div>
  </div>
  <script>
    (function () {
      var sec = document.currentScript.closest('section');
      var box = sec.querySelector('.vd');
      var phai = box.querySelector('.phai');
      var thai = box.querySelector('.thai');
      var bao = box.querySelector('.bao');
      var video = box.querySelector('video');
      var nguon = box.querySelector('source');
      var khung = box.querySelector('iframe');
      var m3u8 = box.getAttribute('data-m3u8');
      var danhSach = (box.getAttribute('data-moc') || '').split(',').map(parseFloat).filter(isFinite);
      var khoi = {}, chip = {}, mo = null, gio = -1, chay = false, san = false, lan = -1;
      box.querySelectorAll('.ch').forEach(function (c) { khoi[c.getAttribute('data-so')] = c; });
      function giay(t) {
        var p = Math.floor(t / 60), g = Math.round(t % 60);
        return p + ':' + (g < 10 ? '0' : '') + g;
      }
      danhSach.forEach(function (t, i) {
        var s = document.createElement('span');
        s.textContent = giay(t);
        s.title = 'Nhảy tới ' + giay(t) + ' và xem tiếp';
        s.addEventListener('click', function () { tim(i + 1, t); });
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
      function gui(tk) {
        if (khung && khung.contentWindow) khung.contentWindow.postMessage(JSON.stringify(tk), '*');
      }
      // Một bộ điều khiển cho cả ba nguồn: thẻ <video> thì gọi thẳng, YouTube thì nhắn qua widget.
      var may = {
        dung: function () {
          if (video) video.pause();
          else gui({ event: 'command', func: 'pauseVideo', args: [], id: 'heyshow', channel: 'widget' });
        },
        chay: function () {
          if (video) { var h = video.play(); if (h && h.catch) h.catch(function () {}); return; }
          gui({ event: 'command', func: 'playVideo', args: [], id: 'heyshow', channel: 'widget' });
        }
      };
      // Clip bài học thường dài hàng chục phút nên bấm mốc là nhảy tới đó, khỏi tua tay.
      // lan = điểm bắt đầu xem: chỉ mốc nào video chạy ngang qua mới hỏi, nên nhảy tới 5:01
      // không làm câu 1:58 bật lại. Mốc vừa nhảy tới cũng không hỏi (cả lớp đang xem cảnh của
      // nó) — câu hỏi của mốc đó vẫn mở được bằng "Chạy thử câu hỏi".
      function doiCho() { phai.classList.toggle('co', !!mo); }
      function tim(so, t) {
        may.dung();
        // Nhảy sang cảnh khác khi đang mở câu hỏi: đóng câu hỏi đó lại, coi như chưa trả lời.
        if (mo) { chip[mo].className = ''; khoi[mo].classList.remove('on'); mo = null; }
        doiCho();
        lan = gio = t; // gio phải đúng ngay, nếu không thì bấm "Chạy thử" lập tức sẽ hỏi lại mốc cũ
        if (video) video.currentTime = t;
        else gui({ event: 'command', func: 'seekTo', args: [t, true], id: 'heyshow', channel: 'widget' });
        may.chay();
        thai.textContent = 'Nhảy tới ' + giay(t) + ' — cả lớp xem tiếp.';
      }
      function hoi(so) {
        if (mo || !khoi[so]) return;
        may.dung();
        mo = so;
        doiCho();
        chip[so].className = 'hoi';
        khoi[so].classList.add('on');
        thai.textContent = 'Clip dừng ở mốc ' + chip[so].textContent + ' — cả lớp trả lời.';
      }
      function kiemTra() {
        if (mo || !chay) return;
        // Nhảy mốc hay tua tay giữa clip: coi điểm đang đứng là điểm bắt đầu xem,
        // mốc đã nằm phía sau không bật câu hỏi nữa.
        if (gio < lan || gio > lan + 3) lan = gio;
        for (var i = 0; i < danhSach.length; i++) {
          if (chip[i + 1].className === 'xong') continue;
          if (danhSach[i] > lan && gio >= danhSach[i]) { hoi(i + 1); break; }
        }
        lan = gio;
      }
      setInterval(kiemTra, 250);
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
          doiCho();
          thai.textContent = 'Mốc ' + chip[so].textContent + ' đã xong — clip chạy tiếp.';
          may.chay();
        });
      });
      box.querySelector('.thu').addEventListener('click', function () {
        // Mốc gần nhất tính từ chỗ đang xem: nhảy tới 5:01 rồi bấm nút này thì hỏi câu 5:01,
        // không quay lại câu 0:15. Chưa xem tới mốc nào thì lấy mốc đầu tiên còn trống.
        var gan = null;
        for (var i = 0; i < danhSach.length; i++) {
          if (gio >= danhSach[i] && chip[i + 1].className !== 'xong') gan = i + 1;
        }
        for (var so = 1; gan === null && so <= danhSach.length; so++) {
          if (chip[so].className !== 'xong') gan = so;
        }
        if (gan) hoi(gan); else thai.textContent = 'Đã trả lời hết các mốc.';
      });
      function hong(ly) {
        if (bao) bao.style.display = 'block';
        thai.textContent = ly + ' — bấm "Chạy thử câu hỏi" để xem cơ chế dừng vẫn chạy.';
      }
      function sauKhiTai() {
        if (window.Hls && window.Hls.isSupported && window.Hls.isSupported()) {
          // capLevelToPlayerSize: lấy rendition vừa khung hình thôi. Chọn theo băng thông thì ô
          // video 420px vẫn kéo về 1080p, nhảy tới phút 5 là buffer dễ vỡ; hls.js chữa lỗi bằng cách
          // nạp lại MSE và playhead bị kéo về 0:00 — cả lớp đang xem dở quay lại đầu clip.
          var h = new window.Hls({ capLevelToPlayerSize: true });
          h.loadSource(m3u8);
          h.attachMedia(video);
          h.on(window.Hls.Events.ERROR, function (e, d) { if (d.fatal) hong('Clip HLS lỗi ' + d.details); });
          return;
        }
        // Chrome để canPlayType HLS trả "maybe" rồi báo lỗi khi phát, nên nhánh này chỉ dùng sau cùng.
        if (video.canPlayType('application/vnd.apple.mpegurl')) video.src = m3u8;
        else hong('Trình duyệt này không phát được HLS');
      }
      function taiHls() {
        if (window.Hls) { sauKhiTai(); return; } // mẫu khác trên cùng trang đã tải hls.js rồi
        var co = document.getElementById('hls-js');
        if (co) { co.addEventListener('load', sauKhiTai); return; }
        var s = document.createElement('script');
        s.id = 'hls-js';
        s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1';
        s.onload = sauKhiTai;
        s.onerror = function () { hong('Không tải được bộ phát HLS'); };
        document.head.appendChild(s);
      }
      // data-gjw="link video trên Gan Jing World" — giáo viên chỉ cần dán link, HeyShow tự tìm
      // nguồn phát. API công khai gw.ganjingworld.com/v1.1/content/query?ids=<ID> trả video_url
      // (master.m3u8) kèm access-control-allow-origin:*, nên gọi được cả từ trang /show bị CSP
      // sandbox (Origin gửi đi là 'null' nhưng bên kia cho hết). Link chia sẻ dạng /s/<code> thì
      // theo bước nhảy 301 và đọc id từ địa chỉ cuối.
      function layTuGJW(id) {
        thai.textContent = 'Đang lấy nguồn clip từ Gan Jing World…';
        fetch('https://gw.ganjingworld.com/v1.1/content/query?ids=' + encodeURIComponent(id) +
              '&lang=en-US&query=basic,full&include_unlisted=true')
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function (j) {
            var v = ((j.data && j.data.list) || [])[0];
            if (!v || !v.video_url) throw new Error('không thấy video với id đó');
            m3u8 = v.video_url;
            taiHls();
          })
          .catch(function (e) { hong('Gan Jing World không trả nguồn clip (' + e.message + ')'); });
      }
      function tuGJW(link) {
        var m = String(link).match(/\/video\/([A-Za-z0-9_-]{8,})/) || String(link).match(/^([A-Za-z0-9_-]{10,})$/);
        if (m) { layTuGJW(m[1]); return; }
        m = String(link).match(/\/s\/([A-Za-z0-9_-]{4,})/);
        if (m) {
          thai.textContent = 'Đang mở link chia sẻ Gan Jing World…';
          fetch('https://www.ganjingworld.com/s/' + encodeURIComponent(m[1]))
            .then(function (r) {
              var k = String(r.url).match(/\/video\/([A-Za-z0-9_-]{8,})/);
              if (!k) throw new Error('link chia sẻ không trỏ tới video nào');
              layTuGJW(k[1]);
            })
            .catch(function (e) { hong('Không đọc được link chia sẻ (' + e.message + ')'); });
          return;
        }
        hong('Đó không phải link Gan Jing World. HeyShow không hỗ trợ chèn video từ YouTube — '
          + 'hãy tải clip lên Gan Jing World rồi dán link '
          + 'ganjingworld.com/video/<ID> vào data-gjw.');
      }
      if (video) {
        video.addEventListener('timeupdate', function () { gio = video.currentTime; });
        video.addEventListener('play', function () { chay = true; san = true; });
        video.addEventListener('waiting', function () { thai.textContent = 'Clip đang tải…'; });
        video.addEventListener('playing', function () {
          if (!mo) thai.textContent = 'Clip đang chiếu — tới mốc là tự dừng.';
        });
        video.addEventListener('canplay', function () {
          if (mo || san) return; // chỉ báo "sẵn sàng" một lần, trước khi cả lớp bắt đầu xem
          san = true;
          thai.textContent = 'Clip đã sẵn sàng — bấm ▶ trên video, tới mốc là clip tự dừng.';
        });
        video.addEventListener('error', function () { hong('Không tải được clip (link hết hạn hoặc mạng chặn).'); });
        if (nguon) nguon.addEventListener('error', function () {
          hong('Không tải được clip (link hết hạn hoặc mạng chặn).');
        });
        if (m3u8) taiHls();
        else if (box.getAttribute('data-src')) video.src = box.getAttribute('data-src');
        else if (box.getAttribute('data-gjw')) tuGJW(box.getAttribute('data-gjw'));
        else if (!nguon) hong('Chưa khai nguồn clip: dán link .mp4 vào thẻ <source> hoặc data-src, '
          + 'link .m3u8 vào data-m3u8, hoặc link video Gan Jing World vào data-gjw.');
        return;
      }
      if (!khung) return;
      // Trang publish chạy slide trong CSP sandbox: YouTube vẫn hiện (khung đen) nhưng không bao giờ
      // báo được giờ. window.origin mới là 'null', còn location.origin vẫn trả origin của URL.
      if (window.origin === 'null' && /^https?:$/.test(location.protocol)) {
        khung.style.display = 'none';
        if (bao) bao.style.display = 'block';
        thai.textContent = 'Trang này không đọc được giờ của clip YouTube — xem dòng chữ vàng.';
        return;
      }
      window.addEventListener('message', function (e) {
        if (!khung || e.source !== khung.contentWindow) return;
        var d = e.data;
        if (typeof d !== 'string') return;
        try { d = JSON.parse(d); } catch (err) { return; }
        var i = d && d.info;
        if (!i) return;
        if (typeof i.currentTime === 'number') gio = i.currentTime;
        if ('playerState' in i) chay = i.playerState === 1;
        if (!san) {
          san = true;
          thai.textContent = 'Clip đã sẵn sàng — bấm ▶ trên video, tới mốc là clip tự dừng.';
        }
      });
      function langNghe() { gui({ event: 'listening', id: 'heyshow', channel: 'widget' }); }
      khung.addEventListener('load', langNghe);
      langNghe();
      setTimeout(langNghe, 1500);
      setTimeout(langNghe, 4000);
      setTimeout(function () { if (!san) hong('YouTube không báo được giờ của clip'); }, 10000);
    })();
  </script>
</section>`
    },

    {
        id: 'video-moc-sketchpad',
        group: 'am-thanh-video',
        title: 'Ví dụ bài học: clip Sketchpad dừng ở 5 mốc, mỗi mốc một câu hỏi',
        desc: 'Clip "Vẽ đồ thị hàm số trên The Geometer’s Sketchpad" (3:41) tự dừng ở 0:12, 1:08, 2:02, 2:32 và 3:30; mỗi mốc một câu hỏi về đúng thao tác vừa xem, trả lời xong mới chiếu tiếp.',
        note: 'Mẫu dựng sẵn cho một clip bài học thật (3:41) để thấy cơ chế chạy với video dài. Muốn đổi sang clip của mình, chỉ sửa ba chỗ: thay link ở data-gjw, đổi dãy mốc ở data-moc (tính bằng giây, phải tăng dần và nhỏ hơn độ dài clip), viết lại năm câu hỏi — mỗi mốc một khối .ch có data-so đúng thứ tự, đáp án đúng mang data-dung="1"; phần còn lại giữ nguyên. data-gjw nhận link trang Gan Jing World, kể cả link chia sẻ /s/...: HeyShow tự lấy nguồn phát và tự chọn độ phân giải cho vừa khung hình. Câu hỏi chỉ bật khi clip chạy ngang qua mốc, nên bấm nút mốc để nhảy tới cảnh bất kỳ sẽ không bị hỏi lại mấy mốc đã qua; nút "Chạy thử câu hỏi" mở câu của mốc gần nhất, dùng được cả khi mạng chặn clip. Bố cục hai cột: clip và dải mốc bên trái, hộp câu hỏi bên phải nên không bao giờ tràn khỏi màn hình — .man rộng 920px, đổi cỡ chữ thì chỉnh .trai/.phai. Mẫu này chỉ nhận link Gan Jing World; cần file .mp4/.m3u8 trực tiếp thì dùng mẫu "Video tự dừng ở các mốc, mỗi mốc một câu hỏi" ở trên.',
        code: String.raw`<section data-background-gradient="linear-gradient(135deg,#eef2ff,#f8fafc)" style="color:#1f2937">
  <style>
    .gsp .man { display:flex; flex-wrap:wrap; gap:6px 20px; width:920px; margin:0 auto; }
    .gsp .trai { flex:0 0 520px; }
    .gsp .phai { flex:1 1 360px; min-width:0; }
    .gsp video { display:block; width:100%; max-width:100%; max-height:none; border-radius:12px;
                 background:#0f172a; }
    .gsp iframe { display:block; width:100%; max-width:100%; height:293px; border:0; border-radius:12px;
                  background:#0f172a; }
    .gsp .bao { display:none; margin:8px 0 0; padding:8px 14px; text-align:left; font-size:0.4em;
                color:#7c2d12; background:#fef3c7; border:1px solid #f59e0b; border-radius:10px; }
    .gsp .moc { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-start; margin:8px 0 0; }
    .gsp .moc span { font-size:0.42em; padding:4px 12px; border-radius:999px; border:1px solid #c7d2fe;
                     background:#ffffff; color:#3730a3; cursor:pointer; }
    .gsp .moc span.hoi { border-color:#f59e0b; background:#fef3c7; color:#7c2d12; }
    .gsp .moc span.xong { border-color:#16a34a; background:#dcfce7; color:#14532d; }
    .gsp .cho { margin:0; padding:12px 16px; font-size:0.44em; color:#6b7280; background:#ffffff;
                border:2px dashed #c7d2fe; border-radius:12px; }
    .gsp .phai.co .cho { display:none; }
    .gsp .ch { display:none; margin:0; padding:12px 16px; text-align:left; background:#ffffff;
               border:2px solid #c7d2fe; border-radius:12px; }
    .gsp .ch.on { display:block; }
    .gsp .ch .h { font-size:0.5em; color:#4338ca; margin:0 0 6px; }
    .gsp .ch .lua { display:block; width:100%; margin:4px 0; padding:5px 12px; text-align:left;
                    font-family:inherit; font-size:0.44em; border:2px solid #cbd5e1; border-radius:10px;
                    background:#ffffff; color:#1f2937; cursor:pointer; }
    .gsp .ch .lua.sai { border-color:#dc2626; background:#fee2e2; }
    .gsp .ch .lua.dung { border-color:#16a34a; background:#dcfce7; }
    .gsp .ch .giai { display:none; font-size:0.4em; color:#14532d; }
    .gsp .ch .tiep { display:none; margin-top:6px; font-family:inherit; font-size:0.44em; padding:5px 16px;
                     border-radius:10px; border:2px solid #4f46e5; background:#4f46e5; color:#ffffff;
                     cursor:pointer; }
    .gsp .ch .tiep.on { display:inline-block; }
    .gsp .len { flex:0 0 100%; margin:0; }
    .gsp .len button { font-family:inherit; font-size:0.42em; padding:5px 14px; border-radius:10px;
                       border:1px solid #c7d2fe; background:#ffffff; color:#4338ca; cursor:pointer; }
    .gsp .thai { flex:0 0 100%; margin:0; font-size:0.4em; color:#6b7280; }
  </style>
  <h2 style="color:#4338ca; font-size:0.58em;">📐 Vẽ đồ thị hàm số bằng Sketchpad</h2>
  <div class="gsp" data-gjw="https://www.ganjingworld.com/s/YK8W9vYRXX" data-moc="12,68,122,152,210">
    <div class="man">
      <div class="trai">
        <video controls preload="metadata" playsinline></video>
        <p class="bao">Clip không phát được trên trang này — kiểm tra lại mạng hoặc link ở data-gjw.
          Muốn làm phần hỏi đáp ngay, bấm "Chạy thử câu hỏi".</p>
        <div class="moc"></div>
      </div>
      <div class="phai">
        <p class="cho">Câu hỏi của từng mốc hiện ra ở cột này — bấm ▶ để bắt đầu, clip sẽ tự dừng ở mỗi mốc.</p>
        <div class="ch" data-so="1">
          <p class="h"><b>Mốc 0:12 —</b> Trên màn hình đang có sẵn những gì?</p>
          <button type="button" class="lua" data-dung="1">A. Hệ trục tọa độ, các điểm O, 1, a, b, M, N và bảng số đo</button>
          <button type="button" class="lua">B. Một parabol vẽ sẵn</button>
          <button type="button" class="lua">C. Một bảng giá trị x; y</button>
          <button type="button" class="lua">D. Mặt phẳng trắng, chưa có gì</button>
          <p class="giai">Bảng số góc trái là kết quả Measure: x_M = 2,22; y_M = 2,94; khoảng cách
            MN = √((x_N−x_M)² + (y_N−y_M)²) = 2,85. Điểm M dựng được là nhờ hạ hai đường vuông góc từ a
            (trục hoành) và b (trục tung) — đúng cách xác định tọa độ một điểm.</p>
          <button type="button" class="tiep">▶ Tiếp tục chiếu</button>
        </div>
        <div class="ch" data-so="2">
          <p class="h"><b>Mốc 1:08 —</b> Dòng "2·x + 1 = 9,59" vừa xuất hiện. Nó ở đâu ra?</p>
          <button type="button" class="lua">A. Người dùng gõ số 9,59 vào</button>
          <button type="button" class="lua" data-dung="1">B. Máy tính ra từ x: Number ▸ New Calculation, gõ 2·x + 1</button>
          <button type="button" class="lua">C. Đo được bằng công cụ Length</button>
          <button type="button" class="lua">D. Lấy từ tọa độ điểm M</button>
          <p class="giai">x là một số tự do (dòng "x = 4,29" phía dưới). Biểu thức 2·x + 1 tham chiếu
            thẳng tới x nên lúc x = 4,29 máy ra 9,59; đây là cách Sketchpad tạo ra một đại lượng biến
            thiên phụ thuộc vào đại lượng khác.</p>
          <button type="button" class="tiep">▶ Tiếp tục chiếu</button>
        </div>
        <div class="ch" data-so="3">
          <p class="h"><b>Mốc 2:02 —</b> Đang có x = −1,60 và 2·x + 1 = −2,20. Kéo điểm x trên trục hoành
            sang chỗ khác thì gì đổi?</p>
          <button type="button" class="lua">A. Chỉ x đổi, còn 2·x + 1 giữ nguyên −2,20</button>
          <button type="button" class="lua">B. Cả hai cùng đứng yên</button>
          <button type="button" class="lua" data-dung="1">C. x đổi và 2·x + 1 tự tính lại theo x</button>
          <button type="button" class="lua">D. Sketchpad báo lỗi vì số âm</button>
          <p class="giai">Bởi 2·x + 1 là công thức chứ không phải một con số gõ vào. Kéo x tới −1,94 thì
            máy báo −2,09; tới −0,22 thì báo 0,55 — đúng như bảng giá trị sống.</p>
          <button type="button" class="tiep">▶ Tiếp tục chiếu</button>
        </div>
        <div class="ch" data-so="4">
          <p class="h"><b>Mốc 2:32 —</b> Các điểm (x; 2·x + 1) vừa được vẽ liên tục nằm thành hình gì?</p>
          <button type="button" class="lua">A. Một parabol</button>
          <button type="button" class="lua">B. Một hypebol</button>
          <button type="button" class="lua" data-dung="1">C. Một đường thẳng</button>
          <button type="button" class="lua">D. Một đám điểm ngẫu nhiên</button>
          <p class="giai">y = 2x + 1 là hàm bậc nhất: x thêm bao nhiêu thì y thêm gấp đôi, nên mọi điểm
            đều rơi trên cùng một đường thẳng. Người dùng đang vẽ đồ thị theo cách thủ công — lấy từng
            điểm rồi ghép lại.</p>
          <button type="button" class="tiep">▶ Tiếp tục chiếu</button>
        </div>
        <div class="ch" data-so="5">
          <p class="h"><b>Mốc 3:30 —</b> Sau khi khai báo f(x) = x³ − x², Graph ▸ Plot Function được chọn.
            Kết quả sẽ là gì?</p>
          <button type="button" class="lua">A. Bảng giá trị của f(x)</button>
          <button type="button" class="lua" data-dung="1">B. Máy vẽ luôn cả đường cong của f(x) = x³ − x²</button>
          <button type="button" class="lua">C. Tiếp tuyến của đồ thị tại gốc O</button>
          <button type="button" class="lua">D. Đổi màu cho parabol đang có</button>
          <p class="giai">New Function khai báo hàm, Plot Function vẽ đồ thị của nó trên hệ trục đang có —
            không cần điểm x tự do, không cần lấy từng điểm. So với cách thủ công ở mốc 2:32 thì đây là
            con đường ngắn nhất từ công thức tới đồ thị. Chú ý parabol x² − x (sửa từ 2·x + 1) vẫn còn
            trên màn hình nên hai đồ thị nằm cạnh nhau để so sánh.</p>
          <button type="button" class="tiep">▶ Tiếp tục chiếu</button>
        </div>
      </div>
      <div class="len"><button type="button" class="thu">Chạy thử câu hỏi (không cần video)</button></div>
      <p class="thai">Bấm ▶ trên video để bắt đầu; tới các mốc đã khai, clip tự dừng và câu hỏi hiện ra.</p>
    </div>
  </div>
  <script>
    (function () {
      var sec = document.currentScript.closest('section');
      var box = sec.querySelector('.gsp');
      var phai = box.querySelector('.phai');
      var video = box.querySelector('video');
      var thai = box.querySelector('.thai');
      var bao = box.querySelector('.bao');
      var danhSach = (box.getAttribute('data-moc') || '').split(',').map(parseFloat).filter(isFinite);
      var m3u8 = '';
      var khoi = {}, chip = {}, mo = null, gio = -1, chay = false, san = false, lan = -1;
      box.querySelectorAll('.ch').forEach(function (c) { khoi[c.getAttribute('data-so')] = c; });
      function giay(t) {
        var p = Math.floor(t / 60), g = Math.round(t % 60);
        return p + ':' + (g < 10 ? '0' : '') + g;
      }
      danhSach.forEach(function (t, i) {
        var s = document.createElement('span');
        s.textContent = giay(t);
        s.title = 'Nhảy tới ' + giay(t) + ' và xem tiếp';
        s.addEventListener('click', function () { tim(i + 1, t); });
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
      // Clip bài học dài hàng chục phút nên bấm chip là nhảy tới mốc, khỏi tua tay. Chỉ mốc nào
      // clip chạy ngang qua mới hỏi, nên nhảy tới 3:30 không làm câu 2:32 bật lại.
      function doiCho() { phai.classList.toggle('co', !!mo); }
      function tim(so, t) {
        video.pause();
        if (mo) { chip[mo].className = ''; khoi[mo].classList.remove('on'); mo = null; }
        doiCho();
        lan = gio = t; // gio phải đúng ngay, nếu không thì bấm "Chạy thử" sẽ hỏi lại mốc vừa nhảy tới
        video.currentTime = t;
        var h = video.play();
        if (h && h.catch) h.catch(function () {});
        thai.textContent = 'Nhảy tới ' + giay(t) + ' — cả lớp xem tiếp.';
      }
      function hoi(so) {
        if (mo || !khoi[so]) return;
        video.pause();
        mo = so;
        doiCho();
        chip[so].className = 'hoi';
        khoi[so].classList.add('on');
        thai.textContent = 'Clip dừng ở mốc ' + chip[so].textContent + ' — cả lớp trả lời.';
      }
      function kiemTra() {
        if (mo || !chay) return;
        // Nhảy mốc hay tua tay giữa clip: coi điểm đang đứng là điểm bắt đầu xem.
        if (gio < lan || gio > lan + 3) lan = gio;
        for (var i = 0; i < danhSach.length; i++) {
          if (chip[i + 1].className === 'xong') continue;
          if (danhSach[i] > lan && gio >= danhSach[i]) { hoi(i + 1); break; }
        }
        lan = gio;
      }
      setInterval(kiemTra, 250);
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
          doiCho();
          thai.textContent = 'Mốc ' + chip[so].textContent + ' đã xong — clip chạy tiếp.';
          var h = video.play();
          if (h && h.catch) h.catch(function () {});
        });
      });
      box.querySelector('.thu').addEventListener('click', function () {
        var gan = null;
        for (var i = 0; i < danhSach.length; i++) {
          if (gio >= danhSach[i] && chip[i + 1].className !== 'xong') gan = i + 1;
        }
        for (var so = 1; gan === null && so <= danhSach.length; so++) {
          if (chip[so].className !== 'xong') gan = so;
        }
        if (gan) hoi(gan); else thai.textContent = 'Đã trả lời hết các mốc.';
      });
      function hong(ly) {
        if (bao) bao.style.display = 'block';
        thai.textContent = ly + ' — bấm "Chạy thử câu hỏi" để xem cơ chế dừng vẫn chạy.';
      }
      function sauKhiTai() {
        if (window.Hls && window.Hls.isSupported && window.Hls.isSupported()) {
          // capLevelToPlayerSize: rendition vừa khung hình thôi. Chọn theo băng thông thì ô video
          // 600px vẫn kéo về 1080p, nhảy tới phút 3 là buffer dễ vỡ; hls.js chữa lỗi bằng cách nạp
          // lại MSE và playhead bị kéo về 0:00 — cả lớp đang xem dở quay lại đầu clip.
          var h = new window.Hls({ capLevelToPlayerSize: true });
          h.loadSource(m3u8);
          h.attachMedia(video);
          h.on(window.Hls.Events.ERROR, function (e, d) { if (d.fatal) hong('Clip HLS lỗi ' + d.details); });
          return;
        }
        if (video.canPlayType('application/vnd.apple.mpegurl')) video.src = m3u8;
        else hong('Trình duyệt này không phát được HLS');
      }
      function taiHls() {
        if (window.Hls) { sauKhiTai(); return; } // mẫu khác trên cùng trang đã tải hls.js rồi
        var co = document.getElementById('hls-js');
        if (co) { co.addEventListener('load', sauKhiTai); return; }
        var s = document.createElement('script');
        s.id = 'hls-js';
        s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1';
        s.onload = sauKhiTai;
        s.onerror = function () { hong('Không tải được bộ phát HLS'); };
        document.head.appendChild(s);
      }
      // data-gjw="link video trên Gan Jing World" — giáo viên chỉ dán link, HeyShow tự tìm nguồn.
      // API công khai gw.ganjingworld.com/v1.1/content/query?ids=<ID> trả video_url (master.m3u8)
      // kèm access-control-allow-origin:*, nên gọi được cả từ trang /show bị CSP sandbox.
      function layTuGJW(id) {
        thai.textContent = 'Đang lấy nguồn clip từ Gan Jing World…';
        fetch('https://gw.ganjingworld.com/v1.1/content/query?ids=' + encodeURIComponent(id) +
              '&lang=en-US&query=basic,full&include_unlisted=true')
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function (j) {
            var v = ((j.data && j.data.list) || [])[0];
            if (!v || !v.video_url) throw new Error('không thấy video với id đó');
            m3u8 = v.video_url;
            taiHls();
          })
          .catch(function (e) { hong('Gan Jing World không trả nguồn clip (' + e.message + ')'); });
      }
      function tuGJW(link) {
        var m = String(link).match(/\/video\/([A-Za-z0-9_-]{8,})/) || String(link).match(/^([A-Za-z0-9_-]{10,})$/);
        if (m) { layTuGJW(m[1]); return; }
        m = String(link).match(/\/s\/([A-Za-z0-9_-]{4,})/);
        if (m) {
          thai.textContent = 'Đang mở link chia sẻ Gan Jing World…';
          fetch('https://www.ganjingworld.com/s/' + encodeURIComponent(m[1]))
            .then(function (r) {
              var k = String(r.url).match(/\/video\/([A-Za-z0-9_-]{8,})/);
              if (!k) throw new Error('link chia sẻ không trỏ tới video nào');
              layTuGJW(k[1]);
            })
            .catch(function (e) { hong('Không đọc được link chia sẻ (' + e.message + ')'); });
          return;
        }
        hong('Đó không phải link Gan Jing World. HeyShow không hỗ trợ chèn video từ YouTube — '
          + 'hãy tải clip lên Gan Jing World rồi dán link '
          + 'ganjingworld.com/video/<ID> vào data-gjw.');
      }
      tuGJW(box.getAttribute('data-gjw'));
      video.addEventListener('timeupdate', function () { gio = video.currentTime; });
      video.addEventListener('play', function () { chay = true; san = true; });
      video.addEventListener('waiting', function () { thai.textContent = 'Clip đang tải…'; });
      video.addEventListener('playing', function () {
        if (!mo) thai.textContent = 'Clip đang chiếu — tới mốc là tự dừng.';
      });
      video.addEventListener('canplay', function () {
        if (mo || san) return; // chỉ báo "sẵn sàng" một lần, trước khi cả lớp bắt đầu xem
        san = true;
        thai.textContent = 'Clip đã sẵn sàng — bấm ▶ trên video, tới mốc là clip tự dừng.';
      });
      video.addEventListener('error', function () { hong('Không tải được clip (link hết hạn hoặc mạng chặn).'); });
    })();
  </script>
</section>`
    }
]
