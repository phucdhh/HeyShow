// Bảng Debug của trang /design: bắt những lỗi mà Reveal.js âm thầm bỏ qua, để người soạn
// không phải đoán mãi vì sao "slide không hiện". Code của bài chỉ là các <section>, còn
// <html>/<body> do HeyShow tự bọc — dóng được lỗi ở đây thì khỏi mò trong preview.

// \b và alternation dài đứng trước để <section-master> không bị hiểu thành <section>
const SECTION_TAG_RE = /<\s*(\/?)\s*(section-master|section)\b[^>]*>/gi;
const DOC_TAG_RE = /<(\/?)\s*(!doctype|html|head|body)\b[^>]*>/gi;
const MATH_RE = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g;
const SRC_ATTR_RE = /\bsrc\s*=\s*["']([^"']+)["']/i;

// Đổi một loại khối thành khoảng trắng. Giữ nguyên độ dài và ký tự xuống dòng nên
// vị trí vẫn tra được số dòng trong CodeMirror.
function blank(text, re) {
    return text.replace(re, (m) => m.replace(/[^\n]/g, ' '));
}

const blankComments = (text) => blank(text, /<!--[\s\S]*?(?:-->|$)/g);
const blankBlocks = (text) => blank(blankComments(text), /<(style|script|head|title)\b[\s\S]*?(?:<\/\1>|$)/gi);
// Thẻ khung của cả trang: đã có cảnh báo riêng ở trên nên không tính là "nội dung ngoài slide"
const DOC_FRAME_RE = /<!doctype[^>]*>|<\/?\s*(?:html|body|meta|link)\b[^>]*>/gi;

// Phạm vi từng khối <section>/<section-master> đóng đủ, và thẻ slide lồng quá 2 cấp
// (Reveal.js chỉ có slide ngang + slide dọc).
function sectionSpans(text) {
    const spans = [];
    const stack = [];
    let tooDeep = -1;

    SECTION_TAG_RE.lastIndex = 0;
    let m;
    while ((m = SECTION_TAG_RE.exec(text)) !== null) {
        const from = m.index;
        const name = m[2].toLowerCase();

        if (m[1] === '/') {
            for (let i = stack.length - 1; i >= 0; i--) {
                if (stack[i].name !== name) continue;
                spans.push({ from: stack[i].from, to: from + m[0].length });
                stack.length = i;
                break;
            }
            continue;
        }

        const slideDepth = stack.filter((s) => s.name === 'section').length + (name === 'section' ? 1 : 0);
        if (slideDepth > 2 && tooDeep < 0) tooDeep = from;
        stack.push({ name, from });
    }
    // Thẻ mở chưa đóng: coi như kéo tới cuối file để phần trong nó không bị báo là
    // "ngoài slide" — thiếu thẻ đóng đã có scanSections báo rồi.
    for (const open of stack) spans.push({ from: open.from, to: text.length });
    return { spans, tooDeep };
}

// Chỗ nằm ngoài mọi khối slide mà vẫn còn thẻ HTML hoặc chữ nhìn thấy được
function strayRanges(text, spans) {
    const merged = [];
    for (const span of spans.slice().sort((a, b) => a.from - b.from)) {
        const last = merged[merged.length - 1];
        if (last && span.from <= last.to) last.to = Math.max(last.to, span.to);
        else merged.push({ from: span.from, to: span.to });
    }

    const gaps = [];
    let pos = 0;
    for (const span of merged) {
        if (span.from > pos) gaps.push([pos, span.from]);
        pos = Math.max(pos, span.to);
    }
    gaps.push([pos, text.length]);

    return gaps.map(([from, to]) => {
        const body = blankBlocks(text.slice(from, to)).replace(SECTION_TAG_RE, ' ').replace(DOC_FRAME_RE, ' ');
        // Chỉ dòng có chữ/thẻ đầu tiên của khoảng trống, không phải dòng mà khối trước kết thúc
        const first = body.match(/<[a-z!/]/i) || body.match(/\S/);
        return first ? { from: from + first.index } : null;
    }).filter(Boolean);
}

// Trả về [{ severity: 'error' | 'warning' | 'info', line, message }], xếp theo dòng
export function runDiagnostics(doc, scan) {
    const raw = doc.toString();
    const text = blankComments(raw);
    const lineAt = (pos) => doc.lineAt(Math.max(0, Math.min(pos, doc.length))).number;

    const issues = [];
    const push = (severity, pos, message) => issues.push({ severity, line: lineAt(pos), message });

    if (!raw.trim()) {
        return [{ severity: 'info', line: 1, message: 'Bài trống — hãy tạo slide <section> đầu tiên hoặc lấy một mẫu ở /templates.' }];
    }

    // 1. Dán nguyên file HTML hoàn chỉnh thay vì chỉ các <section> — báo một dòng cho
    // mỗi loại thẻ, không tính cả thẻ đóng để đỡ lặp lại cùng một lời khuyên
    DOC_TAG_RE.lastIndex = 0;
    let m;
    const seenDocTags = new Set();
    while ((m = DOC_TAG_RE.exec(text)) !== null && seenDocTags.size < 4) {
        const tag = m[2].toLowerCase();
        if (m[1] === '/' || seenDocTags.has(tag)) continue;
        seenDocTags.add(tag);
        push('warning', m.index,
            `<${tag}> là thẻ của cả trang — HeyShow tự tạo khi xuất bản. `
            + 'Bài chỉ cần các thẻ <section>, hãy bỏ phần khung HTML này.');
    }

    // 2. Mở/đóng thẻ slide không cân (cùng nguồn với lint trong gutter, gom ra đây để đọc)
    for (const d of scan.diagnostics) {
        push(d.severity === 'error' ? 'error' : 'warning', d.from, `Thẻ slide: ${d.message}`);
    }

    // 3. Chưa có slide nào / chưa có master
    if (scan.total === 0) {
        push('error', 0, 'Chưa có slide nào. Mỗi slide là một khối <section>…</section>.');
    } else if (scan.master.from < 0) {
        push('info', 0, 'Chưa có <section-master> — nền, header, footer dùng chung đang phải viết ở từng slide.');
    }

    const { spans, tooDeep } = sectionSpans(text);

    if (tooDeep >= 0) {
        push('warning', tooDeep,
            'Slide lồng quá 2 cấp. Reveal.js chỉ hiển thị slide ngang và slide dọc — cấp thứ 3 sẽ bị bỏ.');
    }

    for (const stray of strayRanges(text, spans).slice(0, 4)) {
        push('warning', stray.from,
            'Có nội dung nằm ngoài <section>. HeyShow chỉ trình chiếu chữ trong slide nên phần này không hiện.');
    }

    // 4. Dấu < / > viết trần trong công thức: parser hiểu thành thẻ HTML, nuốt </section> sau đó
    MATH_RE.lastIndex = 0;
    let mathFlags = 0;
    while ((m = MATH_RE.exec(text)) !== null && mathFlags < 3) {
        if (!/[<>]/.test(m[0]) || /\\(lt|gt|le|ge|langle|rangle|middle|vert)/.test(m[0])) continue;

        mathFlags++;
        push('warning', m.index,
            `Công thức có < hoặc > viết trần (${m[0].trim().slice(0, 24)}…). `
            + 'Trình duyệt đọc thành thẻ HTML và làm hỏng slide — hãy dùng \\lt, \\gt.');
    }

    // 5. Link nhúng mà trang xuất bản không chạy được
    for (const check of [
        {
            tag: 'iframe',
            isBad: (src) => /youtube\.com|youtu\.be/i.test(src),
            message: 'Nhúng YouTube — HeyShow không hỗ trợ, video không chạy ở trang đã xuất bản.'
        },
        {
            tag: 'img',
            isBad: (src) => /drive\.google\.com/i.test(src) && !/(\/uc\?|hc=|thumbnail|lh3\.googleusercontent)/i.test(src),
            message: 'Ảnh Google Drive đang là link chia sẻ nên không hiện — đổi sang link trực tiếp (/uc?export=view&id=…).'
        }
    ]) {
        const re = new RegExp(`<${check.tag}\\b[^>]*>`, 'gi');
        let tag;
        while ((tag = re.exec(text)) !== null) {
            const src = (tag[0].match(SRC_ATTR_RE) || [])[1];
            if (src && check.isBad(src)) {
                push('warning', tag.index, check.message);
                break;
            }
        }
    }

    const rank = { error: 0, warning: 1, info: 2 };
    return issues
        .sort((a, b) => (a.line - b.line) || (rank[a.severity] - rank[b.severity]))
        .slice(0, 40);
}

export function countIssues(issues) {
    const counts = { errors: 0, warnings: 0 };
    for (const issue of issues) {
        if (issue.severity === 'error') counts.errors++;
        else if (issue.severity === 'warning') counts.warnings++;
    }
    return counts;
}
