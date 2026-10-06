// Trang Help: render các ví dụ code kèm preview Reveal.js thật (lazy-load khi cuộn tới)
import { previewHtml } from './reveal-preview.js';

const EXAMPLES = {
    master: [
        {
            title: 'Master với header & footer chung',
            note: 'Toàn bộ nội dung trong <section-master> được chèn vào đầu mỗi slide lá — viết một lần, dùng cả bài.',
            code: String.raw`<section-master>
  <header style="position:absolute; top:12px; left:24px; font-size:0.45em; color:#999;">
    Bài giảng Vật lý 10 · GV Nguyễn Văn A
  </header>
  <footer style="position:absolute; bottom:12px; right:24px; font-size:0.4em; color:#777;">
    heyshow.pedu.vn
  </footer>
</section-master>

<section>
  <h2>Slide 1</h2>
  <p>Header và footer tự xuất hiện ở mọi slide.</p>
</section>

<section>
  <h2>Slide 2</h2>
  <p>Không cần chép lại phần khung chung.</p>
</section>`
        },
        {
            title: 'Master đặt nền & kiểu chữ chung',
            note: 'CSS đặt trong master nằm trong mỗi slide nên áp dụng cho toàn bài.',
            code: String.raw`<section-master>
  <style>
    .reveal .slides section {
      background: linear-gradient(135deg, #1e3a5f, #0f2027);
      border-radius: 14px;
      padding: 30px;
    }
    .reveal h2 { color: #ffd479; }
  </style>
</section-master>

<section>
  <h2>Nền dùng chung</h2>
  <p>Mọi slide thừa hưởng nền và màu tiêu đề từ master.</p>
</section>

<section>
  <h2>Slide thứ hai</h2>
  <p>Cùng nền đó, không khai báo lại.</p>
</section>`
        }
    ],

    slides: [
        {
            title: 'Slide ngang + nhóm slide dọc',
            note: 'Section con nằm trong section mẹ tạo thành cột trượt dọc.',
            code: String.raw`<section>
  <h2>Mở đầu</h2>
  <p>Slide ngang đầu tiên.</p>
</section>

<section>
  <section>
    <h2>Nhóm dọc 1</h2>
    <p>Bấm mũi tên xuống để đi trong nhóm.</p>
  </section>
  <section>
    <h2>Nhóm dọc 2</h2>
    <p>Vẫn thuộc cùng một cột ngang.</p>
  </section>
</section>

<section>
  <h2>Kết</h2>
  <p>Slide ngang cuối.</p>
</section>`
        },
        {
            title: 'Hiện dần từng phần (fragment)',
            note: 'Thêm class="fragment" — mỗi lần bấm mũi tên hiện thêm một phần tử.',
            code: String.raw`<section>
  <h2>Các bước giải</h2>
  <ul>
    <li class="fragment">Bước 1: đọc kỹ đề</li>
    <li class="fragment">Bước 2: tóm tắt giả thiết</li>
    <li class="fragment">Bước 3: trình bày lời giải</li>
  </ul>
  <p class="fragment fade-up">Bấm phím mũi tên để hiện từng dòng.</p>
</section>`
        },
        {
            title: 'Nền riêng cho từng slide',
            note: 'data-background-color / data-background-gradient / data-background-image đặt trên thẻ section.',
            code: String.raw`<section data-background-color="#0d3b2e">
  <h2>Nền màu đặc</h2>
</section>

<section data-background-gradient="linear-gradient(120deg, #833ab4, #fd1d1d)">
  <h2>Nền gradient</h2>
</section>

<section data-background-color="#ffffff" data-color="#222222">
  <h2>Nền sáng chữ tối</h2>
  <p>Đổi cả màu chữ bằng data-color.</p>
</section>`
        }
    ],

    'tpl-text': [
        {
            title: 'Tiêu đề + danh sách hai cột',
            note: 'Flexbox hai cột; text-align:left vì mặc định slide căn giữa.',
            code: String.raw`<section>
  <h2>Mục tiêu bài học</h2>
  <div style="display:flex; gap:1.5em; text-align:left; font-size:0.8em;">
    <div style="flex:1;">
      <h4>Kiến thức</h4>
      <ul>
        <li>Khái niệm đạo hàm</li>
        <li>Các quy tắc tính đạo hàm</li>
      </ul>
    </div>
    <div style="flex:1;">
      <h4>Kỹ năng</h4>
      <ul>
        <li>Tính đạo hàm hàm cơ bản</li>
        <li>Viết phương trình tiếp tuyến</li>
      </ul>
    </div>
  </div>
</section>`
        },
        {
            title: 'Slide tiêu chương chữ lớn',
            note: 'Dòng thứ hai đổi màu nhấn bằng span.',
            code: String.raw`<section>
  <h2 style="font-size:2.2em;">CHƯƠNG 3<br><span style="color:#f59e0b;">TÍCH PHÂN</span></h2>
  <p style="font-size:0.8em; color:#bbbbbb;">Toán 12 · Tiết 24–28</p>
</section>`
        }
    ],

    'tpl-table': [
        {
            title: 'Bảng so sánh hiện dần từng dòng',
            note: 'Bảng HTML thường; thêm class="fragment" vào từng <tr> để hiện dần.',
            code: String.raw`<section>
  <h2>Bảng so sánh</h2>
  <table style="font-size:0.6em; margin:auto; border-collapse:collapse;">
    <tr style="background:#f59e0b; color:#111111;">
      <th style="padding:8px 14px; border:1px solid #888888;">Tiêu chí</th>
      <th style="padding:8px 14px; border:1px solid #888888;">Phương án A</th>
      <th style="padding:8px 14px; border:1px solid #888888;">Phương án B</th>
    </tr>
    <tr class="fragment">
      <td style="padding:8px 14px; border:1px solid #888888;">Chi phí</td>
      <td style="padding:8px 14px; border:1px solid #888888;">Thấp</td>
      <td style="padding:8px 14px; border:1px solid #888888;">Cao</td>
    </tr>
    <tr class="fragment">
      <td style="padding:8px 14px; border:1px solid #888888;">Tốc độ</td>
      <td style="padding:8px 14px; border:1px solid #888888;">Chậm</td>
      <td style="padding:8px 14px; border:1px solid #888888;">Nhanh</td>
    </tr>
  </table>
</section>`
        }
    ],

    'tpl-image': [
        {
            title: 'Ảnh kèm chú thích',
            note: 'Thay link trong src bằng ảnh của bạn; giới hạn chiều cao bằng max-height.',
            code: String.raw`<section>
  <h2>Cấu tạo tế bào</h2>
  <figure style="margin:0;">
    <img src="https://picsum.photos/seed/heyshow/640/360" alt="Ảnh minh hoạ"
         style="max-height:340px; border-radius:10px;">
    <figcaption style="font-size:0.5em; color:#999999; margin-top:8px;">
      Hình 1. Ảnh minh hoạ — thay bằng link ảnh của bạn
    </figcaption>
  </figure>
</section>`
        },
        {
            title: 'Ảnh tràn nền slide',
            note: 'data-background-image + data-background-opacity làm mờ ảnh để chữ dễ đọc.',
            code: String.raw`<section data-background-image="https://picsum.photos/seed/heyshowbg/1280/720"
         data-background-opacity="0.35">
  <h2 style="text-shadow:0 2px 8px #000000;">Nền là hình ảnh</h2>
  <p>Chữ vẫn đọc tốt nhờ giảm độ mờ của ảnh nền.</p>
</section>`
        }
    ],

    'tpl-shapes': [
        {
            title: 'Hình tròn, chữ nhật bo góc, hình thoi',
            note: 'Mọi shape đều là <div> với width/height/background/border-radius/transform.',
            code: String.raw`<section>
  <h2>Hình khối bằng CSS</h2>
  <div style="display:flex; gap:28px; justify-content:center; align-items:center;">
    <div style="width:120px; height:120px; border-radius:50%; background:#f59e0b;
                display:flex; align-items:center; justify-content:center;
                color:#111111; font-weight:bold;">Tròn</div>
    <div style="width:160px; height:90px; border-radius:14px; background:#38bdf8;
                display:flex; align-items:center; justify-content:center;
                color:#06283d; font-weight:bold;">Chữ nhật bo góc</div>
    <div style="width:105px; height:105px; background:#a78bfa; transform:rotate(45deg);
                display:flex; align-items:center; justify-content:center;">
      <span style="transform:rotate(-45deg); color:#241640; font-weight:bold;">Thoi</span>
    </div>
  </div>
</section>`
        },
        {
            title: 'Mũi tên quy trình',
            note: 'Ký tự mũi tên &#8594; (→) đặt giữa các khối.',
            code: String.raw`<section>
  <div style="display:flex; align-items:center; justify-content:center; gap:12px; font-size:0.7em;">
    <div style="background:#f59e0b; color:#111111; padding:14px 24px; border-radius:8px; font-weight:bold;">Input</div>
    <div style="font-size:2em; color:#f59e0b;">&#8594;</div>
    <div style="background:#38bdf8; color:#06283d; padding:14px 24px; border-radius:8px; font-weight:bold;">Xử lý</div>
    <div style="font-size:2em; color:#f59e0b;">&#8594;</div>
    <div style="background:#a6e3a1; color:#123018; padding:14px 24px; border-radius:8px; font-weight:bold;">Output</div>
  </div>
</section>`
        }
    ],

    'tpl-chart': [
        {
            title: 'Biểu đồ cột bằng CSS',
            note: 'Chiều cao mỗi cột tỉ lệ với số liệu; align-items:flex-end để cột đứng trên cùng một đáy.',
            code: String.raw`<section>
  <h2>Kết quả khảo sát</h2>
  <div style="display:flex; align-items:flex-end; justify-content:center;
              gap:26px; height:280px; font-size:0.55em;">
    <div style="text-align:center;">
      <div style="background:#f59e0b; width:70px; height:180px; border-radius:6px 6px 0 0;"></div>
      <div>Lớp A<br><b>72%</b></div>
    </div>
    <div style="text-align:center;">
      <div style="background:#38bdf8; width:70px; height:230px; border-radius:6px 6px 0 0;"></div>
      <div>Lớp B<br><b>92%</b></div>
    </div>
    <div style="text-align:center;">
      <div style="background:#a78bfa; width:70px; height:120px; border-radius:6px 6px 0 0;"></div>
      <div>Lớp C<br><b>48%</b></div>
    </div>
  </div>
</section>`
        },
        {
            title: 'Biểu đồ tròn bằng conic-gradient',
            note: 'Đổi các mốc phần trăm trong conic-gradient là đổi tỉ lệ.',
            code: String.raw`<section>
  <h2>Tỷ lệ thời lượng</h2>
  <div style="display:flex; gap:34px; align-items:center; justify-content:center; font-size:0.6em;">
    <div style="width:220px; height:220px; border-radius:50%;
                background:conic-gradient(#f59e0b 0 45%, #38bdf8 45% 75%, #a78bfa 75% 100%);"></div>
    <ul style="list-style:none; text-align:left; line-height:2.1;">
      <li><span style="display:inline-block;width:14px;height:14px;background:#f59e0b;border-radius:3px;"></span> Lý thuyết 45%</li>
      <li><span style="display:inline-block;width:14px;height:14px;background:#38bdf8;border-radius:3px;"></span> Bài tập 30%</li>
      <li><span style="display:inline-block;width:14px;height:14px;background:#a78bfa;border-radius:3px;"></span> Ôn tập 25%</li>
    </ul>
  </div>
</section>`
        }
    ],

    'tpl-smartart': [
        {
            title: 'Sơ đồ quy trình 4 bước',
            note: 'Mỗi bước là một card flex; số thứ tự trong vòng tròn amber.',
            code: String.raw`<section>
  <h2>Quy trình nghiên cứu</h2>
  <div style="display:flex; gap:14px; justify-content:center; font-size:0.55em;">
    <div style="flex:1; max-width:190px; background:#1f2937; border:2px solid #f59e0b; border-radius:12px; padding:16px;">
      <div style="background:#f59e0b; color:#111111; width:34px; height:34px; border-radius:50%;
                  display:flex; align-items:center; justify-content:center;
                  font-weight:bold; margin:0 auto 10px;">1</div>
      <b>Đặt vấn đề</b>
      <p style="font-size:0.85em; color:#bbbbbb;">Xác định câu hỏi nghiên cứu</p>
    </div>
    <div style="flex:1; max-width:190px; background:#1f2937; border:2px solid #38bdf8; border-radius:12px; padding:16px;">
      <div style="background:#38bdf8; color:#06283d; width:34px; height:34px; border-radius:50%;
                  display:flex; align-items:center; justify-content:center;
                  font-weight:bold; margin:0 auto 10px;">2</div>
      <b>Thu thập dữ liệu</b>
      <p style="font-size:0.85em; color:#bbbbbb;">Khảo sát, đo đạc, ghi chép</p>
    </div>
    <div style="flex:1; max-width:190px; background:#1f2937; border:2px solid #a78bfa; border-radius:12px; padding:16px;">
      <div style="background:#a78bfa; color:#241640; width:34px; height:34px; border-radius:50%;
                  display:flex; align-items:center; justify-content:center;
                  font-weight:bold; margin:0 auto 10px;">3</div>
      <b>Phân tích</b>
      <p style="font-size:0.85em; color:#bbbbbb;">Xử lý số liệu, vẽ biểu đồ</p>
    </div>
    <div style="flex:1; max-width:190px; background:#1f2937; border:2px solid #a6e3a1; border-radius:12px; padding:16px;">
      <div style="background:#a6e3a1; color:#123018; width:34px; height:34px; border-radius:50%;
                  display:flex; align-items:center; justify-content:center;
                  font-weight:bold; margin:0 auto 10px;">4</div>
      <b>Kết luận</b>
      <p style="font-size:0.85em; color:#bbbbbb;">Trả lời câu hỏi ban đầu</p>
    </div>
  </div>
</section>`
        },
        {
            title: 'Sơ đồ phân cấp (cây tổ chức)',
            note: 'Các đường nối là <div> cao 2px / rộng 2px màu xám.',
            code: String.raw`<section>
  <h2>Sơ đồ tổ chức</h2>
  <div style="font-size:0.55em; text-align:center;">
    <div style="display:inline-block; background:#f59e0b; color:#111111;
                padding:12px 28px; border-radius:10px; font-weight:bold;">Hiệu trưởng</div>
    <div style="width:2px; height:26px; background:#888888; margin:auto;"></div>
    <div style="display:flex; justify-content:center; gap:44px;">
      <div>
        <div style="width:2px; height:20px; background:#888888; margin:auto;"></div>
        <div style="background:#38bdf8; color:#06283d; padding:10px 22px; border-radius:10px; font-weight:bold;">
          Phó HT chuyên môn
        </div>
      </div>
      <div>
        <div style="width:2px; height:20px; background:#888888; margin:auto;"></div>
        <div style="background:#a6e3a1; color:#123018; padding:10px 22px; border-radius:10px; font-weight:bold;">
          Phó HT phong trào
        </div>
      </div>
    </div>
  </div>
</section>`
        }
    ],

    'tpl-extras': [
        {
            title: 'Khối code có viền',
            note: 'Thẻ <pre><code data-trim> giữ nguyên xuống dòng và thụt lề.',
            code: String.raw`<section>
  <h2>Ví dụ code</h2>
  <pre style="background:#111111; border:1px solid #444444; border-radius:10px;
              padding:16px; font-size:0.55em; text-align:left;
              width:80%; margin:auto;"><code data-trim>
def tinh_tong(n):
    return n * (n + 1) // 2
  </code></pre>
</section>`
        },
        {
            title: 'Trích dẫn nổi bật + nút bấm',
            note: 'blockquote bo góc với viền trái amber; nút là thẻ <a> bo tròn.',
            code: String.raw`<section>
  <blockquote style="background:#1f2937; border-left:6px solid #f59e0b;
                     padding:18px 22px; border-radius:8px;
                     font-size:0.7em; width:80%; margin:0 auto 18px;">
    “Học thầy không tày học bạn.”
    <div style="color:#999999; font-size:0.8em; margin-top:8px;">— Tục ngữ Việt Nam</div>
  </blockquote>
  <a href="https://heyshow.pedu.vn/gallery" target="_blank"
     style="display:inline-block; background:#f59e0b; color:#111111;
            padding:10px 26px; border-radius:999px;
            font-weight:bold; font-size:0.7em;">Xem Gallery HeyShow</a>
</section>`
        }
    ],

    math: [
        {
            title: 'Công thức trong dòng và công thức khối',
            note: "Cặp $...$ nằm lẫn trong câu; cặp $$...$$ đứng riêng thành khối căn giữa.",
            code: String.raw`<section>
  <h2>Định lý Pythagore</h2>
  <p>Với tam giác vuông: $a^2 + b^2 = c^2$.</p>
  <p>Nghiệm phương trình bậc hai:</p>
  <p>$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$</p>
</section>`
        },
        {
            title: 'Tổng, tích phân, ma trận, hệ phương trình',
            note: 'Cú pháp LaTeX chuẩn của KaTeX.',
            code: String.raw`<section>
  <h2>Một số công thức thường gặp</h2>
  <p>$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$</p>
  <p>$$\int_{0}^{\infty} e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}$$</p>
  <p>$$\begin{pmatrix} a & b \\ c & d \end{pmatrix}$$</p>
  <p>$$\begin{cases} x + y = 5 \\ 2x - y = 1 \end{cases}$$</p>
</section>`
        }
    ]
};

function renderExamples() {
    document.querySelectorAll('[data-examples]').forEach(holder => {
        const group = EXAMPLES[holder.dataset.examples] || [];
        group.forEach((ex, i) => {
            const card = document.createElement('div');
            card.className = 'example';
            card.dataset.index = String(i);

            const head = document.createElement('div');
            head.className = 'example-head';
            const title = document.createElement('span');
            title.className = 'ex-title';
            title.textContent = ex.title;
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.textContent = 'Copy';
            copyBtn.addEventListener('click', async () => {
                let ok = false;
                try {
                    await navigator.clipboard.writeText(ex.code);
                    ok = true;
                } catch (e) {
                    // Fallback cho trình duyệt chặn Clipboard API (http, iframe, quyền hạn chế)
                    const ta = document.createElement('textarea');
                    ta.value = ex.code;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
                    ta.remove();
                }
                if (ok) {
                    copyBtn.textContent = 'Đã copy ✓';
                } else {
                    // Dự phòng cuối: bôi đen khối code để người dùng tự Ctrl/Cmd+C
                    const range = document.createRange();
                    range.selectNodeContents(card.querySelector('pre code'));
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    copyBtn.textContent = 'Đã bôi đen — Ctrl+C';
                }
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1800);
            });
            head.append(title, copyBtn);

            const pre = document.createElement('pre');
            const codeEl = document.createElement('code');
            codeEl.textContent = ex.code;
            pre.appendChild(codeEl);

            card.append(head, pre);

            if (ex.note) {
                const note = document.createElement('div');
                note.className = 'note';
                note.textContent = ex.note;
                card.appendChild(note);
            }

            const preview = document.createElement('div');
            preview.className = 'preview';
            const label = document.createElement('span');
            label.className = 'preview-label';
            label.textContent = 'PREVIEW';
            const iframe = document.createElement('iframe');
            iframe.title = 'Preview: ' + ex.title;
            preview.append(label, iframe);
            card.appendChild(preview);

            holder.appendChild(card);
        });
    });
}

// Chỉ nạp Reveal vào iframe khi ví dụ cuộn tới gần màn hình, tránh tải dồn dập
function lazyPreviews() {
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const card = entry.target;
            const iframe = card.querySelector('iframe');
            const group = EXAMPLES[card.parentElement.dataset.examples] || [];
            const ex = group[Number(card.dataset.index)];
            if (iframe && ex && !iframe.srcdoc) {
                iframe.srcdoc = previewHtml(ex.code);
            }
            io.unobserve(card);
        });
    }, { rootMargin: '300px 0px' });
    document.querySelectorAll('.example').forEach(card => io.observe(card));
}

// Tô sáng mục lục theo vị trí cuộn
function tocHighlight() {
    const links = [...document.querySelectorAll('.toc a')];
    const targets = links
        .map(a => document.getElementById(a.getAttribute('href').slice(1)))
        .filter(Boolean);
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
        });
    }, { rootMargin: '-70px 0px -70% 0px' });
    targets.forEach(t => io.observe(t));
}

renderExamples();
lazyPreviews();
tocHighlight();
