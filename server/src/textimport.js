// Nhập file văn bản: Markdown (.md) và LaTeX beamer (.tex) -> bản nháp HeyShow.
// Trả về cùng cấu trúc analysis như pptx.js để tái dùng buildReport + luồng client.
// Chỉ dùng JS thuần để chạy được trên Termux.

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'svg'];
const VIDEO_EXT = ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'mkv', 'avi'];

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}
function basename(p) { return String(p).split(/[\\/]/).pop().split('?')[0] || 'media'; }
function isExternal(src) { return /^(https?:)?\/\//i.test(String(src)); }
function extOf(name) { const m = String(name).match(/\.([a-zA-Z0-9]+)$/); return m ? m[1].toLowerCase() : ''; }

// Nhận loại file từ tên gốc
function detectKind(origName) {
    const m = String(origName || '').toLowerCase().match(/\.(md|markdown|mdown|mkd|tex)$/);
    if (!m) return null;
    return m[1] === 'tex' ? 'tex' : 'md';
}

function newSlide(index) {
    return { index, title: '', subtitle: '', blocks: [], images: [], videos: [], tables: 0, charts: 0, smartArts: 0, notes: '' };
}
function finalize(slide) {
    slide.bullets = slide.blocks.filter(b => b.type === 'bullet');
    return slide;
}
function plainTex(html) { return String(html).replace(/<[^>]+>/g, '').trim(); }
// Bỏ tag + giải mã entity để lấy văn bản thuần (dùng cho tiêu đề/ghi chú hiển thị trên report)
function toPlain(html) {
    return plainTex(html)
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

// ============================ MARKDOWN ============================

function analyzeMarkdown(text) {
    text = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const chunks = splitMd(text);
    const slides = chunks.map((c, i) => finalize(parseMdSlide(c, i + 1)));
    if (!slides.length) throw new Error('Không tìm thấy slide nào trong file Markdown');
    return { slides, kind: 'md' };
}

// Tách slide: ưu tiên phân cách ngang '---'/'***' (có dòng trống bao quanh);
// nếu không có thì tách theo mỗi heading cấp 1-2.
function splitMd(text) {
    const lines = text.split('\n');
    const seps = [];
    for (let i = 0; i < lines.length; i++) {
        if (/^\s{0,3}(-{3,}|\*{3,})\s*$/.test(lines[i])) {
            const pb = i === 0 || lines[i - 1].trim() === '';
            const nb = i === lines.length - 1 || lines[i + 1].trim() === '';
            if (pb && nb) seps.push(i);
        }
    }
    const ranges = [];
    if (seps.length) {
        let s = 0;
        for (const p of seps) { ranges.push([s, p]); s = p + 1; }
        ranges.push([s, lines.length]);
    } else {
        let s = 0;
        for (let i = 1; i < lines.length; i++) {
            if (/^#{1,2}\s/.test(lines[i])) { ranges.push([s, i]); s = i; }
        }
        ranges.push([s, lines.length]);
    }
    return ranges.map(([a, b]) => lines.slice(a, b).join('\n')).filter(c => c.trim() !== '');
}

function parseMdSlide(chunk, index) {
    const lines = chunk.split('\n');
    const slide = newSlide(index);
    let inCode = false, lang = '', buf = [];
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const fence = raw.match(/^\s*```(\S*)/);
        if (fence) {
            if (!inCode) { inCode = true; lang = fence[1]; buf = []; }
            else { inCode = false; if (buf.length) slide.blocks.push({ type: 'code', text: buf.join('\n'), lang }); }
            continue;
        }
        if (inCode) { buf.push(raw); continue; }
        const t = raw.trim();
        if (t === '') continue;
        if (/^\s{0,3}(-{3,}|\*{3,})\s*$/.test(raw)) continue;

        const h = raw.match(/^(#{1,6})\s+(.*)$/);
        if (h) {
            const txt = inlineMd(h[2].replace(/\s+#+\s*$/, ''), slide);
            if (!slide.title && h[1].length <= 2) slide.title = toPlain(txt);
            else if (txt) slide.blocks.push({ type: 'para', text: txt, heading: h[1].length });
            continue;
        }
        const li = raw.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (li) {
            const indent = li[1].replace(/\t/g, '  ').length;
            const lvl = Math.min(3, Math.floor(indent / 2));
            const txt = inlineMd(li[3], slide);
            if (txt) slide.blocks.push({ type: 'bullet', text: txt, lvl });
            continue;
        }
        if (/^>\s?/.test(t)) { slide.blocks.push({ type: 'quote', text: inlineMd(t.replace(/^>\s?/, ''), slide) }); continue; }
        if (t.includes('|') && i + 1 < lines.length && /^[\s|:-]+$/.test(lines[i + 1].trim()) && lines[i + 1].includes('-')) {
            slide.tables++;
            while (i < lines.length && lines[i].includes('|')) i++;
            i--;
            continue;
        }
        const para = inlineMd(t, slide);
        if (para) slide.blocks.push({ type: 'para', text: para });
    }
    if (inCode && buf.length) slide.blocks.push({ type: 'code', text: buf.join('\n'), lang });
    return slide;
}

function inlineMd(text, slide) {
    let s = String(text);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) => { addImage(slide, alt, src); return ''; });
    s = escapeHtml(s);
    s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
    s = s.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a || b}</strong>`);
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^\w])_([^_\n]+)_(?=[^\w]|$)/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, (_, tx, u) => `<a href="${u}">${tx}</a>`);
    return s.trim();
}

function addImage(slide, alt, src) {
    const ext = extOf(src);
    const name = basename(src) || alt || 'image';
    const url = isExternal(src) ? src : '';
    if (VIDEO_EXT.includes(ext)) slide.videos.push({ name, url });
    else slide.images.push({ name, url });
}

// ============================ LATEX BEAMER ============================

function analyzeTex(text) {
    text = stripTexComments(String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'));
    const slides = [];
    const meta = { title: braceArg(text, 'title'), author: braceArg(text, 'author'), date: braceArg(text, 'date'), institute: braceArg(text, 'institute') };
    if (meta.title && /\\maketitle\b/.test(text)) {
        const s = newSlide(1);
        s.title = toPlain(inlineTex(meta.title));
        if (meta.author) s.blocks.push({ type: 'para', text: inlineTex(meta.author) });
        if (meta.institute) s.blocks.push({ type: 'para', text: inlineTex(meta.institute) });
        if (meta.date) s.blocks.push({ type: 'para', text: inlineTex(meta.date) });
        finalize(s); slides.push(s);
    }
    const fre = /\\begin\{frame\}(?:\[[^\]]*\])?\s*(?:\{([^{}]*)\})?([\s\S]*?)\\end\{frame\}/g;
    let m;
    while ((m = fre.exec(text))) slides.push(finalize(parseTexFrame(m[1] || '', m[2], slides.length + 1)));
    if (!slides.length) throw new Error('Không tìm thấy \\begin{frame} nào — đây có phải slide beamer không?');
    return { slides, kind: 'tex' };
}

function stripTexComments(text) { return text.replace(/(^|[^\\])%[^\n]*/g, '$1'); }

function braceArg(s, name) {
    const idx = s.indexOf('\\' + name + '{');
    if (idx < 0) return '';
    let i = idx + name.length + 2, depth = 1, out = '';
    for (; i < s.length; i++) {
        const c = s[i];
        if (c === '{') { depth++; if (depth > 1) out += c; }
        else if (c === '}') { depth--; if (depth === 0) break; out += c; }
        else out += c;
    }
    return out.trim();
}

// Tách nội dung các môi trường cân bằng \begin{name}...\end{name}; trả về phần còn lại + mảng inner
function extractBalanced(str, name) {
    const b = '\\begin{' + name + '}', e = '\\end{' + name + '}';
    let depth = 0, buf = '', rest = '', i = 0;
    const blocks = [];
    while (i < str.length) {
        if (str.startsWith(b, i)) {
            depth++;
            if (depth === 1) { buf = ''; i += b.length; continue; }
        }
        if (str.startsWith(e, i)) {
            depth--;
            if (depth === 0) { blocks.push(buf); i += e.length; continue; }
        }
        if (depth > 0) buf += str[i]; else rest += str[i];
        i++;
    }
    return { rest, blocks };
}
function dropEnv(s, name) { return extractBalanced(s, name).rest; }

// Tách theo marker (vd \item) ở độ sâu môi trường 0
function splitTopLevel(str, marker) {
    const segs = []; let depth = 0, cur = '', i = 0;
    while (i < str.length) {
        if (str.startsWith('\\begin{', i)) { const m = /^\\begin\{[^}]*\}/.exec(str.slice(i)); depth++; cur += m[0]; i += m[0].length; continue; }
        if (str.startsWith('\\end{', i)) { const m = /^\\end\{[^}]*\}/.exec(str.slice(i)); depth = Math.max(0, depth - 1); cur += m[0]; i += m[0].length; continue; }
        if (depth === 0 && str.startsWith(marker, i)) {
            const after = str[i + marker.length];
            if (!/[a-zA-Z]/.test(after || '')) {
                segs.push(cur); cur = ''; i += marker.length;
                const om = /^\s*\[[^\]]*\]/.exec(str.slice(i)); if (om) i += om[0].length;
                continue;
            }
        }
        cur += str[i]; i++;
    }
    segs.push(cur);
    return segs;
}

function parseTexFrame(title, body, index) {
    const slide = newSlide(index);
    let s = body;
    const ft = /\\frametitle(?:<[^>]*>)?\s*\{([^{}]*)\}/.exec(s); if (ft) title = ft[1];
    s = s.replace(/\\frametitle(?:<[^>]*>)?\s*\{[^{}]*\}/g, '');
    const fs = /\\framesubtitle(?:<[^>]*>)?\s*\{([^{}]*)\}/.exec(s); if (fs) slide.subtitle = inlineTex(fs[1]);
    s = s.replace(/\\framesubtitle(?:<[^>]*>)?\s*\{[^{}]*\}/g, '');
    const notes = [];
    s = s.replace(/\\note(?:<[^>]*>)?\s*\{([\s\S]*?)\}/g, (_, n) => { notes.push(toPlain(inlineTex(n))); return ''; });
    slide.notes = notes.join(' ').slice(0, 2000);
    s = s.replace(/\\includegraphics(?:\[[^\]]*\])?\s*\{([^{}]*)\}/g, (_, p) => { addTexImage(slide, p); return ''; });
    slide.tables += (s.match(/\\begin\{(tabular|tabularx|longtable|array)\}/g) || []).length;
    for (const tn of ['tabular', 'tabularx', 'longtable', 'array', 'table']) s = dropEnv(s, tn);
    for (const b of collectBodies(s)) parseTexBody(b, slide);
    slide.title = title ? toPlain(inlineTex(title)) : '';
    return slide;
}

// Mở các môi trường cột để thân cột được parse như body thường
function collectBodies(s) {
    let out = [s];
    out = out.flatMap(x => { const r = extractBalanced(x, 'columns'); return r.blocks.length ? [r.rest, ...r.blocks] : [x]; });
    out = out.flatMap(x => { const r = extractBalanced(x, 'column'); return r.blocks.length ? [r.rest, ...r.blocks] : [x]; });
    return out;
}

function parseTexBody(s, slide) {
    s = s.replace(/^\s*\{[^{}]*\}/, ''); // bỏ {width} / {block-title} còn sót
    for (const bn of ['block', 'alertblock', 'exampleblock', 'theoremblock', 'definitionblock', 'example']) {
        const r = extractBalanced(s, bn);
        for (const inner of r.blocks) {
            let t = inner; const bt = /^\s*\{([^{}]*)\}/.exec(t);
            if (bt) { slide.blocks.push({ type: 'para', text: `<strong>${inlineTex(bt[1])}</strong>`, heading: 4 }); t = t.slice(bt[0].length); }
            parseTexBody(t, slide);
        }
        s = r.rest;
    }
    for (const en of ['itemize', 'enumerate']) {
        const r = extractBalanced(s, en);
        for (const inner of r.blocks) parseItems(inner, 0, slide);
        s = r.rest;
    }
    for (const dn of ['figure', 'center', 'quote', 'verbatim', 'columns', 'column']) s = dropEnv(s, dn);
    for (const p of s.split(/\n\s*\n/)) { const txt = inlineTex(p); if (txt) slide.blocks.push({ type: 'para', text: txt }); }
}

function parseItems(inner, lvl, slide) {
    for (const seg of splitTopLevel(inner, '\\item')) {
        if (!seg.trim()) continue;
        const ni = extractBalanced(seg, 'itemize');
        const ne = extractBalanced(ni.rest, 'enumerate');
        const bullet = inlineTex(ne.rest);
        if (bullet) slide.blocks.push({ type: 'bullet', text: bullet, lvl });
        for (const nb of [...ni.blocks, ...ne.blocks]) parseItems(nb, Math.min(3, lvl + 1), slide);
    }
}

function addTexImage(slide, path) {
    const p = String(path).trim();
    const ext = extOf(p);
    const known = IMAGE_EXT.includes(ext) || VIDEO_EXT.includes(ext);
    const name = known ? basename(p) : basename(p) + '.png';
    const url = isExternal(p) ? p : '';
    if (VIDEO_EXT.includes(ext)) slide.videos.push({ name, url });
    else slide.images.push({ name, url });
}

const TEX_FMT = { textbf: 'strong', textit: 'em', emph: 'em', texttt: 'code', underline: 'u', alert: 'strong', textsf: 'span', textrm: 'span', textsc: 'span' };

function inlineTex(str) {
    let s = escapeHtml(String(str));
    const math = [];
    s = s.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\([\s\S]+?\\\)|\\\[([\s\S]+?)\\\]/g, mm => { math.push(mm); return `\u0001${math.length - 1}\u0001`; });
    let prev;
    do {
        prev = s;
        for (const c in TEX_FMT) s = s.replace(new RegExp('\\\\' + c + '\\s*\\{([^{}]*)\\}', 'g'), (_, inner) => `<${TEX_FMT[c]}>${inner}</${TEX_FMT[c]}>`);
    } while (s !== prev);
    s = s.replace(/\\\\/g, '<br>');
    s = s.replace(/\\%/g, '%').replace(/\\#/g, '#').replace(/\\_/g, '_').replace(/\\&amp;/g, '&amp;').replace(/\\[,;:]/g, ' ').replace(/~/g, ' ');
    s = s.replace(/\\LaTeX/g, 'LaTeX').replace(/\\TeX/g, 'TeX');
    s = s.replace(/\\[a-zA-Z]+\*?\s*(\[[^\]]*\])?\s*\{([^{}]*)\}/g, '$2');
    s = s.replace(/\\[a-zA-Z]+\*?/g, '');
    s = s.replace(/[{}]/g, '');
    s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => math[+i]);
    return s.replace(/\s+/g, ' ').trim();
}

// ============================ SINH BẢN NHÁP ============================

function textBullets(bullets) {
    if (!bullets.length) return '';
    let out = '', open = 0;
    for (const b of bullets) {
        const lvl = Math.max(0, Math.min(b.lvl, 3));
        while (open < lvl + 1) { out += '<ul>\n'; open++; }
        while (open > lvl + 1) { out += '</ul>\n'; open--; }
        out += `  <li class="fragment">${b.text}</li>\n`;
    }
    while (open > 0) { out += '</ul>\n'; open--; }
    return out;
}

function renderBlocks(slide) {
    let out = '', run = [];
    const flush = () => { if (run.length) { out += textBullets(run); run = []; } };
    for (const b of slide.blocks) {
        if (b.type === 'bullet') { run.push(b); continue; }
        flush();
        if (b.type === 'para') {
            if (b.heading) { const lv = Math.min(6, b.heading + 1); out += `<h${lv}>${b.text}</h${lv}>\n`; }
            else out += `<p>${b.text}</p>\n`;
        } else if (b.type === 'code') out += `<pre><code${b.lang ? ` class="language-${b.lang}"` : ''}>${escapeHtml(b.text)}</code></pre>\n`;
        else if (b.type === 'quote') out += `<blockquote>${b.text}</blockquote>\n`;
    }
    flush();
    return out;
}

function textMedia(slide) {
    let out = '';
    for (const img of slide.images) {
        if (img.url) out += `<!-- Ảnh liên kết ngoài: -->\n<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.name)}" style="max-width: 70%;">\n`;
        else out += `<!-- ⚠ ẢNH "${escapeHtml(img.name)}" (Slide ${slide.index}) được tham chiếu bằng đường dẫn cục bộ nên không tải lên được.\n`
            + `     Tải ảnh lên Google Drive → Chia sẻ "Bất kỳ ai có đường dẫn" → copy ID giữa /d/ và dấu ? → thay vào src:\n`
            + `     https://lh3.googleusercontent.com/d/<FILE_ID> -->\n`
            + `<img src="" alt="${escapeHtml(img.name)}" style="max-width: 70%;">\n`;
    }
    for (const vid of slide.videos) {
        if (vid.url) out += `<!-- Video liên kết ngoài: -->\n<iframe width="720" height="405" src="${escapeHtml(vid.url)}" title="${escapeHtml(vid.name)}" frameborder="0" allowfullscreen></iframe>\n`;
        else out += `<!-- ⚡ VIDEO "${escapeHtml(vid.name)}" (Slide ${slide.index}) tham chiếu cục bộ, không tải lên được.\n`
            + `     Tải lên YouTube hoặc Gan Jing World → dán link nhúng (embed) vào src: -->\n`
            + `<iframe width="720" height="405" src="" title="Video" frameborder="0" allowfullscreen></iframe>\n`;
    }
    if (slide.tables) out += `<!-- ⚠ Slide này có ${slide.tables} BẢNG — không import được. Gõ lại bằng <table> HTML hoặc dùng ✨ AI trong Design. -->\n`;
    return out;
}

function buildDraftHtml(analysis, origName) {
    const kindLabel = analysis.kind === 'tex' ? 'LaTeX beamer' : 'Markdown';
    const header =
        `<!-- Nhập từ file "${escapeHtml(origName)}" (${kindLabel}) bằng HeyShow Import.\n`
        + `     Công thức toán ($...$) giữ nguyên để KaTeX hiển thị.\n`
        + `     Các mục có ⚠ cần bổ sung thủ công:\n`
        + `     - ẢNH: tải lên Google Drive → Chia sẻ "Bất kỳ ai có đường dẫn" → src="https://lh3.googleusercontent.com/d/<FILE_ID>"\n`
        + `     - VIDEO: tải lên YouTube hoặc Gan Jing World → dán link nhúng (embed) vào src của iframe\n`
        + `     - Bảng: gõ lại bằng <table> HTML hoặc nhờ ✨ AI trong Design\n`
        + `     Mở /design để hoàn thiện — preview hiện ngay khi sửa. -->\n`;

    const sections = analysis.slides.map((s, i) => {
        const lines = ['<section>\n'];
        const titleText = s.title || `Slide ${s.index}`;
        lines.push(i === 0 ? `<h1>${escapeHtml(titleText)}</h1>\n` : `<h2>${escapeHtml(titleText)}</h2>\n`);
        if (s.subtitle) lines.push(`<p>${s.subtitle}</p>\n`);
        lines.push(renderBlocks(s));
        const media = textMedia(s);
        if (media) lines.push(media);
        if (s.notes) lines.push(`<!-- 📝 Ghi chú: ${escapeHtml(s.notes).replace(/--/g, '- -')} -->\n`);
        lines.push('</section>\n');
        return lines.join('');
    });
    return header + sections.join('\n');
}

function analyze(text, kind) {
    if (kind === 'tex') return analyzeTex(text);
    return analyzeMarkdown(text);
}

module.exports = { analyze, buildDraftHtml, detectKind };
