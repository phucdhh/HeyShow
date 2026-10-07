// SVG do AI vẽ lại từ mã TikZ được nhúng thẳng vào bài, mà bài thì chạy cùng trang với
// editor (nơi đang giữ token đăng nhập). Một thẻ <script> hay onclick lọt qua là đủ để
// đọc trộm token, nên mọi hình trả về đều phải đi qua đây trước.
const MAX_SVG_LEN = 200000;

// Bỏ những thứ không thuộc về một hình vẽ tĩnh: script, HTML nhúng, style (kêu gọi
// @import), ảnh ngoài. Trả về null khi model không chịu xuất SVG.
function cleanSvg(raw) {
    const text = String(raw || '');
    const lower = text.toLowerCase();
    const start = lower.indexOf('<svg');
    const end = lower.lastIndexOf('</svg>');
    if (start < 0 || end < start) return null;
    let svg = text.slice(start, end + '</svg>'.length);
    svg = svg.replace(/<(script|foreignObject|style|iframe|object|embed)\b[\s\S]*?<\/\1>/gi, '');
    svg = svg.replace(/<image\b[^>]*>/gi, '');
    // on* = script nội tuyến; href trỏ ra ngoài = mạch gọi đi nơi khác. Chỉ href nội bộ "#id"
    // (đường viền, gradient, mặt nạ) là SVG cần giữ.
    svg = svg.replace(/<[^>]+>/g, tag => tag
        .replace(/\s+on[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/\s+(?:xlink:)?href\s*=\s*(?:"(?!#)[^"]*"|'(?!#)[^']*')/gi, ''));
    if (!/^<svg[\s>]/i.test(svg) || svg.length > MAX_SVG_LEN) return null;
    return svg.trim();
}

module.exports = { cleanSvg };
