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

// Dấu nhận diện: thấy hai chuỗi này trong file là coi như mảnh đã có mặt, nhờ vậy
// vá nhiều lần vẫn ra cùng một kết quả.
const GUARD_MARKER = '.reveal:not(.overview) .slides>section:not(.present)';
const SHIM_MARKER = "Object.defineProperty(window, 'sessionStorage'";

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

    return { html: out, added };
}

module.exports = {
    REVEAL_VERSION, REVEAL_CDN, REVEAL_CSS, REVEAL_JS, REVEAL_MATH_JS,
    SLIDE_HEAD_GUARD, SLIDE_STORAGE_SHIM, GUARD_MARKER, SHIM_MARKER, patchSlideHtml
};
