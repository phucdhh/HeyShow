// Hai mảnh nội dung bắt buộc phải có trong mọi file slide, và cách vá chúng vào file
// đã nằm trên đĩa. Tách ra module riêng để buildFullHtml (bài publish mới), script
// repair-published-slides.cjs (bài đã publish từ trước) và test dùng chung một bản,
// không chỗ nào tự viết lại rồi lệch nhau.

// Phiên bản Reveal nạp từ CDN. Nâng cấp là sửa REVEAL_VERSION ở đây và ở
// client/src/reveal-cdn.js — test so hai bản phải khớp nhau.
// Từ 6.0 plugin math dời từ plugin/math/math.js sang plugin/math.js, nên đổi phiên
// bản mà quên đường dẫn thì KaTeX chết âm thầm (không lỗi gì ngoài công thức thô).
const REVEAL_VERSION = '6.0.2';
const REVEAL_CDN = `https://cdnjs.cloudflare.com/ajax/libs/reveal.js/${REVEAL_VERSION}`;
const REVEAL_CSS = [`<link rel="stylesheet" href="${REVEAL_CDN}/reset.min.css">`,
    `<link rel="stylesheet" href="${REVEAL_CDN}/reveal.min.css">`,
    `<link rel="stylesheet" href="${REVEAL_CDN}/theme/black.min.css">`].join('\n    ');
const REVEAL_JS = `<script src="${REVEAL_CDN}/reveal.js"></script>`;
const REVEAL_MATH_JS = `<script src="${REVEAL_CDN}/plugin/math.js"></script>`;

// Cấu hình nạp cho plugin math của Reveal. Reveal 6 đọc khoá "katex" ở cấp cao nhất của
// Reveal.initialize rồi truyền thẳng xuống KaTeX (xem plugin/math.js: getConfig().katex).
// Bài của AI và của người dùng viết chữ Việt ngay trong công thức, kiểu "$đường thẳng$",
// nên KaTeX bắn cảnh báo "Accented Unicode text character ... used in math mode" mỗi lần
// mở console. Tắt đúng loại cảnh báo đó, các loại khác (lỗi cú pháp LaTeX thật) vẫn giữ.
const REVEAL_KATEX_OPTS = `katex: { strict: { unicodeTextInMathMode: 'ignore' } }`;

// Mảnh CSS chèn vào đầu mọi file slide. Phải giống hệt bản client
// (client/src/reveal-preview.js, client/src/main.js) để preview và bản publish không lệch nhau.
const SLIDE_HEAD_GUARD = `
        /* Bài viết (đặc biệt bài do AI sinh) hay ghi đại .reveal .slides section {
           display:flex !important } để tô màu slide. !important của họ thắng quy tắc
           "ẩn slide chưa tới" của Reveal, thành ra mọi slide cùng hiện và chồng lên nhau:
           trên điện thoại vuốt không thấy gì chuyển. Rule này chỉ ẩn lại phần KHÔNG phải
           slide hiện tại, độ đặc hiệu cao hơn, còn chế độ tổng quan (Esc) và in/PDF
           (html.reveal-print) thì nhường lại cho Reveal. */
        @media screen {
            html:not(.reveal-print) .reveal:not(.overview) .slides>section:not(.present),
            html:not(.reveal-print) .reveal:not(.overview) .slides>section>section:not(.present) {
                display: none !important;
            }
        }`;

// Trang slide mang CSP "sandbox" mà không có "allow-same-origin", nên vừa chạm vào
// window.sessionStorage là trình ném SecurityError. Reveal gọi thẳng chỗ đó mỗi lần
// chuyển slide (store/restoreScrollPosition), lỗi làm chết luôn phần bắt động tác vuốt
// trên điện thoại. Mảng này thế sessionStorage bằng bộ nhớ trong để Reveal chạy tiếp,
// vẫn giữ nguyên origin mờ — KHÔNG thêm allow-same-origin, nếu không HTML của người dùng
// sẽ đọc được token trong localStorage của editor.
const SLIDE_STORAGE_SHIM = `
    <script>
        try {
            window.sessionStorage;
        } catch (err) {
            const mem = new Map();
            const store = {
                getItem: key => (mem.has(key) ? mem.get(key) : null),
                setItem: (key, value) => { mem.set(key, String(value)); },
                removeItem: key => { mem.delete(key); },
                clear: () => mem.clear(),
                key: index => Array.from(mem.keys())[index] ?? null,
                get length() { return mem.size; }
            };
            Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { return store; } });
        }
    </script>`;

// Hai mảnh CSS + HTML + JS của nút toàn màn hình. Bài cũ trên đĩa không có nên script
// repair cũng phải chèn đúng ba mảnh này.

// Tách riêng quy tắc ẩn nút khi đang chiếu: 96 bài đã vá hôm nay kết thúc khối CSS ở dòng
// @media print, nên muốn nâng cấp chúng thì phải có đúng chuỗi này để chèn tiếp vào sau.
const FS_FULLSCREEN_HIDE_CSS = `
        /* Đang trình chiếu thì bỏ luôn nút: Chrome tự hiện dòng "press Esc to exit full
           screen" ngay lúc vào, nên cái nút góc phải chỉ còn là vật che mất tiêu đề slide.
           Hai selector đầu cho bài mở ở tab riêng; class heyshow-fs là cho bài mở trong
           khung xem của Gallery — đo bằng Chrome thì tài liệu trong iframe CSP sandbox
           KHÔNG hề fullscreen (fullscreenElement vẫn null, html:fullscreen không khớp),
           nên gallery phải báo xuống và bài tự ẩn nút theo class. */
        html:fullscreen .heyshow-fullscreen,
        html:-webkit-full-screen .heyshow-fullscreen,
        html.heyshow-fs .heyshow-fullscreen { display: none !important; }`;
const LEGACY_FS_CSS_TAIL = '        @media print { .heyshow-fullscreen { display: none !important; } }';

// 96 bài trên đĩa đang mang khối CSS này vì sáng nay chúng bị vá bằng một bản template
// trung gian (chưa kịp hoàn thiện) rồi mới vá tiếp bản_final. Khối cũ chỉ là tập con của
// FS_FULLSCREEN_HIDE_CSS nên không sai, nhưng nó để lại lời bình sai sự thật ("html:fullscreen
// khớp cả trường hợp trang cha fullscreen lấy iframe") và một quy tắc trùng lặp. Gõ bỏ nó.
const LEGACY_FS_HIDE_CSS_V0 = `
        /* Đang trình chiếu thì bỏ luôn nút: Chrome tự hiện dòng "press Esc to exit full
           screen" ngay lúc vào, nên cái nút góc phải chỉ còn là vật che mất tiêu đề slide.
           html:fullscreen khớp cả trường hợp trang cha fullscreen lấy cái iframe (bài mở
           trong khung xem của gallery) — tài liệu trong iframe khi đó cũng fullscreen theo
           nghĩa CSS. */
        html:fullscreen .heyshow-fullscreen,
        html:-webkit-full-screen .heyshow-fullscreen { display: none !important; }`;

const SLIDE_FULLSCREEN_CSS = `
        /* Nút toàn màn hình: bài mở ở tab vẫn còn thanh địa chỉ, người xem tưởng như
           chưa được "Full Screen". Trình duyệt không cho bỏ thanh đó bằng HTML, chỉ có
           Fullscreen API — mà API này buộc phải do người dùng bấm, nên cần một nút. */
        .heyshow-fullscreen {
            position: fixed !important;
            top: 10px !important; right: 12px !important;
            z-index: 9999 !important;
            display: inline-flex !important; align-items: center; gap: 6px;
            margin: 0; padding: 6px 12px;
            background: rgba(17, 24, 39, .55); color: #fff;
            border: 1px solid rgba(255, 255, 255, .35); border-radius: 999px;
            font: 12px/1.4 system-ui, -apple-system, sans-serif;
            cursor: pointer; -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
        }
        .heyshow-fullscreen:hover { background: rgba(17, 24, 39, .8); }
        /* thumbnail của gallery là iframe ?embed=1 — nút này chỉ tổ che mất góc ảnh */
        .heyshow-embed .heyshow-fullscreen { display: none !important; }
${LEGACY_FS_CSS_TAIL}${FS_FULLSCREEN_HIDE_CSS}`;

// Nhãn tiếng Anh cho khớp với chữ "Full Screen" mà người dùng biết từ PowerPoint/Canva.
// 93 bài đã vá ngày 2026-10-10 đang mang nhãn tiếng Việt cũ, vì vậy patchSlideHtml có thêm
// bước đổi nhãn (LEGACY_LABELS) — nếu không thì bài mới publish chữ Anh, bài cũ chữ Việt.
const FS_LABEL = 'Full Screen';
const FS_LABEL_EXIT = 'Exit';
const FS_TITLE = 'Full Screen (F)';

const SLIDE_FULLSCREEN_BUTTON = `<button class="heyshow-fullscreen" type="button" title="${FS_TITLE}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5"></path><path d="M20 9V4h-5"></path><path d="M4 15v5h5"></path><path d="M20 15v5h-5"></path></svg><span>${FS_LABEL}</span></button>`;

// Reveal đã có sẵn phím "f" nhưng người xem trên điện thoại thì không có phím nào để bấm.
// webkit* là cho Android WebView/iOS cũ; requestFullscreen trả về Promise bị từ chối khi
// trang không có thao tác của người dùng, nên phải bắt lỗi ở đây.
//
// Nút phải nhờ tới trang cha khi bài nằm trong iframe: đo bằng Chrome cho thấy trang bài
// chịu CSP sandbox (origin "null") thì requestFullscreen bị từ chối hẳn, kể cả khi iframe
// có allow="fullscreen" — phần tử duy nhất fullscreen được lúc đó là cái iframe, mà chỉ
// trang cha mới gọi được. Gallery nghe 'heyshow-fs' ở client/src/gallery.js. Ai nhúng bài
// mà không nghe message thì sao? Thì hai dòng enter/leave bên dưới vẫn còn đó, cùng lắm là
// bị từ chối im lặng như trước.
const FS_CLICK_HANDLER = `            btn.addEventListener('click', () => {
                // Trang cha fullscreen lấy cái iframe thì tài liệu trong này không hề
                // fullscreen, nên bấm lần thứ hai phải nhờ gallery thoát; leave() ở đây chỉ
                // có tác dụng khi chính trang này vào fullscreen (bài mở ở tab riêng).
                if (window.top !== window.self) { try { parent.postMessage('heyshow-fs', '*'); } catch (err) { /* bị chặn thì thôi */ } }
                if (isFull()) { try { const r = leave(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* bỏ */ } return; }
                try { const r = enter(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* trình duyệt không cho */ }
            });

            // Nhãn "Exit" và class ẩn nút do trang cha gửi xuống khi bài mở trong khung xem
            // của Gallery: ở đó tài liệu này không hề fullscreen (fullscreenElement vẫn null,
            // html:fullscreen không khớp) nên fullscreenchange cũng không nổ.
            window.addEventListener('message', (e) => {
                if (e.data !== 'heyshow-fs-on' && e.data !== 'heyshow-fs-off') return;
                const on = e.data === 'heyshow-fs-on';
                document.documentElement.classList.toggle('heyshow-fs', on);
                if (label) label.textContent = on ? '${FS_LABEL_EXIT}' : '${FS_LABEL}';
            });`;

// Nguyên văn handler mà bản vá chiều 2026-10-10 để lại trên 96 bài (có postMessage nhưng
// message listener chỉ đổi nhãn). Bài đã publish là file tĩnh, muốn nâng cấp tiếp thì phải
// giữ đúng chuỗi cũ này.
const LEGACY_FS_CLICK_HANDLER_V1 = `            btn.addEventListener('click', () => {
                // isFull() của tài liệu trong iframe cũng báo true khi trang cha fullscreen
                // lấy cái iframe, nên phải báo cho cha TRƯỚC khi rẽ nhánh — không thì bấm
                // lần thứ hai chỉ gọi leave(), cái đó bị từ chối, tức là không thoát được.
                if (window.top !== window.self) { try { parent.postMessage('heyshow-fs', '*'); } catch (err) { /* bị chặn thì thôi */ } }
                if (isFull()) { try { const r = leave(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* bỏ */ } return; }
                try { const r = enter(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* trình duyệt không cho */ }
            });

            // Trang cha fullscreen lấy cái iframe: tài liệu trong này không hề có
            // fullscreenchange (phần tử fullscreen nằm ở trang cha), nên nhãn "Exit"
            // phải do trang cha gửi xuống.
            window.addEventListener('message', (e) => {
                if (e.data !== 'heyshow-fs-on' && e.data !== 'heyshow-fs-off') return;
                if (label) label.textContent = e.data === 'heyshow-fs-on' ? '${FS_LABEL_EXIT}' : '${FS_LABEL}';
            });`;

// Nguyên văn handler của bản vá 2026-10-10 đợt đầu (chưa biết nhờ trang cha). V0 -> V1 ->
// hiện tại chạy nối tiếp trong patchSlideHtml, nên bài nào còn sót ở V0 vẫn về được bản
// mới nhất chỉ sau một lần vá.
const LEGACY_FS_CLICK_HANDLER_V0 = `            btn.addEventListener('click', () => {
                if (isFull()) leave();
                else { try { const r = enter(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* trình duyệt không cho */ } }
            });`;

const SLIDE_FULLSCREEN_JS = `
    <script>
        (() => {
            const btn = document.querySelector('.heyshow-fullscreen');
            if (!btn) return;
            const label = btn.querySelector('span');

            const enter = () => (document.documentElement.requestFullscreen
                || document.documentElement.webkitRequestFullscreen || (() => Promise.reject())).call(document.documentElement);
            const leave = () => (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
            const isFull = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);

${FS_CLICK_HANDLER}

            const sync = () => {
                // Bài mở ở tab riêng thì html:fullscreen tự ẩn nút, còn trong Gallery thì
                // class heyshow-fs làm việc đó — nhãn vẫn đổi để phòng khi bài bị nhúng vào
                // một trang không có quy tắc CSS.
                if (label) label.textContent = isFull() ? '${FS_LABEL_EXIT}' : '${FS_LABEL}';
            };
            document.addEventListener('fullscreenchange', sync);
            document.addEventListener('webkitfullscreenchange', sync);

            // ?fs=1 cho link tự phát (thầy cô dán vào bài giảng, muốn mở ra là chiếu luôn).
            // Trình duyệt có thể từ chối vì lúc đó chưa có thao tác của người dùng — khi đó
            // vẫn còn nút trên màn hình để bấm.
            if (new URLSearchParams(location.search).has('fs')) {
                try { const r = enter(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* bỏ */ }
            }
        })();
    </script>`;

// Dấu nhận diện: thấy hai chuỗi này trong file là coi như mảnh đã có mặt, nhờ vậy
// vá nhiều lần vẫn ra cùng một kết quả.
const GUARD_MARKER = '.reveal:not(.overview) .slides>section:not(.present)';
const SHIM_MARKER = "Object.defineProperty(window, 'sessionStorage'";
const FULLSCREEN_MARKER = 'heyshow-fullscreen';

// Nguyên văn ba chuỗi nhãn tiếng Việt mà bản vá ngày 2026-10-10 để lại trên 93 bài.
// Phải giữ ở đây chứ không xóa đi cùng lần đổi nhãn: bài trên đĩa là file tĩnh, chỉ
// có đúng hai chuỗi này mới tìm thấy chúng mà đổi sang tiếng Anh.
const LEGACY_FULLSCREEN_LABELS = [
    ['title="Toàn màn hình (phím F)"', `title="${FS_TITLE}"`],
    ['<span>Toàn màn hình</span>', `<span>${FS_LABEL}</span>`],
    ["isFull() ? 'Thoát' : 'Toàn màn hình'", `isFull() ? '${FS_LABEL_EXIT}' : '${FS_LABEL}'`]
];

function firstMatch(haystack, patterns) {
    for (const re of patterns) {
        const at = haystack.search(re);
        if (at >= 0) return at;
    }
    return -1;
}

// Chèn thiếu gì thì chèn đúng cái đó, không đụng nội dung bài. Trả về { html, added }
// hoặc { html, error } khi file không phải một trang Reveal hoàn chỉnh.
function patchSlideHtml(html) {
    const added = [];
    let out = html;

    if (!out.includes(GUARD_MARKER)) {
        const at = out.search(/<\/head>/i);
        if (at < 0) return { html, error: 'không tìm thấy </head>' };
        out = out.slice(0, at) + `    <style>${SLIDE_HEAD_GUARD}\n    </style>\n` + out.slice(at);
        added.push('guard');
    }

    if (!out.includes(SHIM_MARKER)) {
        const at = firstMatch(out, [
            /<script[^>]+src=["'][^"']*reveal[^"']*["']/i,
            /<script\b/i
        ]);
        if (at < 0) return { html, error: 'không có <script> nào để chèn shim trước' };
        out = out.slice(0, at) + SLIDE_STORAGE_SHIM.trimStart() + '\n    ' + out.slice(at);
        added.push('shim');
    }

    if (!out.includes(FULLSCREEN_MARKER)) {
        const cssAt = out.search(/<\/head>/i);
        // lastIndexOf chứ không search: bài của AI có thể dán nguyên một trang HTML khác
        // vào slide, và khi đó </body> đầu tiên nằm giữa chừng nội dung bài.
        const bodyAt = out.toLowerCase().lastIndexOf('</body>');
        if (cssAt < 0 || bodyAt < 0) return { html, error: 'không tìm thấy </head> hoặc </body> để chèn nút toàn màn hình' };
        out = out.slice(0, cssAt) + `    <style>${SLIDE_FULLSCREEN_CSS}\n    </style>\n` + out.slice(cssAt);
        // Nút và script đi cặp với nhau: chèn sát trước </body> cuối cùng để button chắc chắn
        // đã có trong DOM lúc script chạy, bất kể bài của người dùng đóng thẻ div kiểu gì.
        const at = out.toLowerCase().lastIndexOf('</body>');
        out = out.slice(0, at) + `    ${SLIDE_FULLSCREEN_BUTTON}\n${SLIDE_FULLSCREEN_JS}\n    ` + out.slice(at);
        added.push('fullscreen');
    }

    // Nhãn cũ bằng tiếng Việt trên bài đã vá: đổi nguyên văn ba chuỗi ở trên, không đụng
    // gì khác. Bài nào tình cờ mang đúng chuỗi đó trong nội dung thì script vá sẽ thấy
    // "phần bài viết thay đổi" và bỏ qua — đó là cách nó tự giữ an toàn.
    let renamed = false;
    for (const [from, to] of LEGACY_FULLSCREEN_LABELS) {
        if (out.includes(from)) { out = out.split(from).join(to); renamed = true; }
    }
    if (renamed) added.push('label');

    // Bài đã có nút nhưng mang bản CSS chưa có quy tắc ẩn nút khi đang chiếu (96 bài vá
    // sáng 2026-10-10): khối CSS của chúng kết thúc đúng ở dòng @media print nên nối tiếp
    // vào sau đó được, không phải đụng lại nội dung bài.
    if (out.includes(FULLSCREEN_MARKER) && !out.includes(FS_FULLSCREEN_HIDE_CSS) && out.includes(LEGACY_FS_CSS_TAIL)) {
        out = out.split(LEGACY_FS_CSS_TAIL).join(LEGACY_FS_CSS_TAIL + FS_FULLSCREEN_HIDE_CSS);
        added.push('css');
    }

    // ...rồi xóa khối cũ: bản vá trung gian sáng 2026-10-10 chèn quy tắc ẩn nút chưa có
    // selector theo class, còn nằm lại dưới khối mới như một bản trùng lặp. Chỉ xóa khi
    // khối mới đã có mặt, nếu không thì bài bị mất luôn tính năng ẩn nút.
    if (out.includes(FS_FULLSCREEN_HIDE_CSS) && out.includes(LEGACY_FS_HIDE_CSS_V0)) {
        out = out.split(LEGACY_FS_HIDE_CSS_V0).join('');
        if (!added.includes('css')) added.push('css');
    }

    // Handler trên bài đã vá: V0 (chưa nhờ trang cha) -> V1 (có postMessage, message listener
    // chỉ đổi nhãn) -> bản hiện tại (listener còn dán/nhả class ẩn nút). Hai phép thế chạy
    // nối tiếp nên bài còn sót ở V0 cũng về được bản mới nhất sau đúng một lần vá.
    if (out.includes(LEGACY_FS_CLICK_HANDLER_V0)) {
        out = out.split(LEGACY_FS_CLICK_HANDLER_V0).join(LEGACY_FS_CLICK_HANDLER_V1);
        if (!added.includes('handler')) added.push('handler');
    }
    if (out.includes(LEGACY_FS_CLICK_HANDLER_V1)) {
        out = out.split(LEGACY_FS_CLICK_HANDLER_V1).join(FS_CLICK_HANDLER);
        if (!added.includes('handler')) added.push('handler');
    }

    return { html: out, added };
}

// Khuôn mà buildFullHtml dùng để viết thẻ asset Reveal ở một phiên bản cụ thể.
// So khớp cả thẻ chứ không chỉ chuỗi URL: bài của người dùng thỉnh thoảng tự nhúng
// Reveal (4.5 dạng .min.js, theme dracula/white), so cả thẻ để không đụng nội dung đó.
function revealAssetTags(version) {
    const cdn = `https://cdnjs.cloudflare.com/ajax/libs/reveal.js/${version}`;
    // 4.x/5.x để plugin math ở plugin/math/math.js, từ 6.0 rút lên plugin/math.js.
    const major = Number(String(version).split('.')[0]);
    const math = major >= 6 ? 'plugin/math.js' : 'plugin/math/math.js';
    return [
        `<link rel="stylesheet" href="${cdn}/reset.min.css">`,
        `<link rel="stylesheet" href="${cdn}/reveal.min.css">`,
        `<link rel="stylesheet" href="${cdn}/theme/black.min.css">`,
        `<script src="${cdn}/reveal.js"></script>`,
        `<script src="${cdn}/${math}"></script>`
    ];
}

// Đổi phiên bản Reveal của một bài đã publish. Chỉ ghi khi tìm thấy đủ cả năm thẻ
// của bản cũ: thiếu một thẻ là bài đó không theo khuôn (theme khác, bản cũ hơn), và
// ghi nửa vời sẽ để lại CSS của bản này chạy cùng JS của bản kia.
function bumpRevealVersion(html, { from, to }) {
    if (from === to) return { html, missing: [], changed: false };
    const oldTags = revealAssetTags(from);
    const newTags = revealAssetTags(to);
    const missing = oldTags.filter(tag => !html.includes(tag));
    if (missing.length > 0) return { html, missing, changed: false };

    let out = html;
    oldTags.forEach((tag, i) => { out = out.split(tag).join(newTags[i]); });
    return { html: out, missing: [], changed: true };
}

module.exports = {
    REVEAL_VERSION, REVEAL_CDN, REVEAL_CSS, REVEAL_JS, REVEAL_MATH_JS, REVEAL_KATEX_OPTS,
    SLIDE_HEAD_GUARD, SLIDE_STORAGE_SHIM, GUARD_MARKER, SHIM_MARKER,
    SLIDE_FULLSCREEN_CSS, SLIDE_FULLSCREEN_BUTTON, SLIDE_FULLSCREEN_JS, FULLSCREEN_MARKER,
    FS_LABEL, FS_LABEL_EXIT, LEGACY_FULLSCREEN_LABELS,
    LEGACY_FS_CLICK_HANDLER_V0, LEGACY_FS_CLICK_HANDLER_V1, FS_CLICK_HANDLER,
    FS_FULLSCREEN_HIDE_CSS, LEGACY_FS_CSS_TAIL, LEGACY_FS_HIDE_CSS_V0,
    patchSlideHtml, revealAssetTags, bumpRevealVersion
};
