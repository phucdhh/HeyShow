// Nguồn duy nhất của client về phiên bản Reveal nạp từ CDN. Phải khớp
// server/src/slide-parts.js — test 'nang cap Reveal...' so hai bên — để preview trong
// editor/Help và bản publish người dùng nhận được không chạy hai bản Reveal khác nhau.
// Từ 6.0 plugin math nằm ở plugin/math.js (bản 5.x là plugin/math/math.js).
export const REVEAL_VERSION = '6.0.2';
export const REVEAL_CDN = `https://cdnjs.cloudflare.com/ajax/libs/reveal.js/${REVEAL_VERSION}`;

export const REVEAL_CSS = [
    `<link rel="stylesheet" href="${REVEAL_CDN}/reset.min.css">`,
    `<link rel="stylesheet" href="${REVEAL_CDN}/reveal.min.css">`,
    `<link rel="stylesheet" href="${REVEAL_CDN}/theme/black.min.css">`
].join('\n    ');

export const REVEAL_JS = `<script src="${REVEAL_CDN}/reveal.js"></script>`;
export const REVEAL_MATH_JS = `<script src="${REVEAL_CDN}/plugin/math.js"></script>`;

// Phải khớp server/src/slide-parts.js: tắt riêng cảnh báo KaTeX "chữ Việt có dấu trong
// công thức" để preview trong editor và bản publish im lặng như nhau.
export const REVEAL_KATEX_OPTS = `katex: { strict: { unicodeTextInMathMode: 'ignore' } }`;

// Cũng phải khớp server/src/slide-parts.js. Reveal 6 bật chế độ cuộn mỗi khi khung chứa
// ≤435px, tức là mọi khung preview và mọi điện thoại dọc: slide bị đặt vào một trang cao
// theo kích thước THẬT của section, trên nền đen của theme black. Khung nào cũng phải co
// slide vừa trọn màn hình thay vì cuộn.
export const REVEAL_SCROLL_MODE_OFF = 'scrollActivationWidth: null';
