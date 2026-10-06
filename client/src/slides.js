import { StateField } from "@codemirror/state";
import { gutter, GutterMarker } from "@codemirror/view";
import { foldable, foldedRanges, foldEffect, unfoldEffect } from "@codemirror/language";
import { linter } from "@codemirror/lint";

// (?=[\s>]) cũ không bắt được <section-master>, nên dùng \b và xếp alternation dài hơn trước
const SECTION_TAG_RE = /<\s*(\/?)\s*(section-master|section)\b[^>]*>/gi;

function closeTag(stack, name, from, to, diagnostics) {
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === name) {
            for (let j = stack.length - 1; j > i; j--) {
                const open = stack[j];
                diagnostics.push({
                    from: open.from, to: open.to, severity: 'warning',
                    message: `Thiếu thẻ đóng </${open.name}>`
                });
            }
            const entry = stack[i];
            stack.length = i;
            return entry;
        }
    }
    diagnostics.push({ from, to, severity: 'error', message: `Thẻ </${name}> không có thẻ mở tương ứng` });
    return null;
}

// Quét toàn bộ document: số thứ tự slide, nhãn cho gutter, và lỗi đóng/mở thẻ section
export function scanSections(doc) {
    const text = doc.toString();
    const labels = new Map();
    const slides = [];
    const diagnostics = [];
    const stack = [];
    const master = { from: -1, to: null, closeFrom: -1 };
    let depth = 0, h = -1, v = 0, parentHadChild = false;

    SECTION_TAG_RE.lastIndex = 0;
    let m;
    while ((m = SECTION_TAG_RE.exec(text)) !== null) {
        const from = m.index;
        const to = from + m[0].length;
        const name = m[2].toLowerCase();

        if (m[1] === '/') {
            const open = closeTag(stack, name, from, to, diagnostics);
            if (open && open.name === 'section') depth = Math.max(0, depth - 1);
            if (open && open.name === 'section-master') { master.to = to; master.closeFrom = from; }
            continue;
        }

        const entry = { name, from, to };
        stack.push(entry);
        const line = doc.lineAt(from).number;

        if (name === 'section-master') {
            master.from = from;
            labels.set(line, { text: '★', kind: 'master', title: 'Slide master — nội dung dùng chung cho mọi slide. Nhấp để thu gọn/mở rộng' });
            continue;
        }

        depth++;
        if (depth === 1) {
            h++; v = 0; parentHadChild = false;
        } else if (depth === 2) {
            if (parentHadChild) v++; else parentHadChild = true;
        } else {
            continue;
        }
        slides.push({ from, h, v });
        labels.set(line, {
            text: depth === 1 ? `S${h + 1}` : `S${h + 1}.${v + 1}`,
            kind: depth === 1 ? 'slide' : 'sub',
            title: `Slide ${h + 1}${depth === 2 ? ` · khung dọc ${v + 1}` : ''}. Nhấp để thu gọn/mở rộng`
        });
    }

    for (const open of stack) {
        diagnostics.push({ from: open.from, to: open.to, severity: 'warning', message: `Thiếu thẻ đóng </${open.name}>` });
    }

    return { labels, slides, diagnostics, total: h + 1, master };
}

// Slide đang chứa con trỏ, dùng để preview nhảy đúng slide và hiển thị trạng thái
export function slideAt(scan, pos) {
    let cur = null;
    for (const s of scan.slides) {
        if (s.from <= pos) cur = s; else break;
    }
    return cur;
}

// Khung <section> cấp ngoài cùng chứa vị trí pos: {from, to}; null nếu con trỏ ngoài mọi slide
export function topSectionAt(doc, pos) {
    const text = doc.toString();
    SECTION_TAG_RE.lastIndex = 0;
    let m;
    let depth = 0;
    let start = -1;
    let result = null;
    while ((m = SECTION_TAG_RE.exec(text)) !== null) {
        if (m[2].toLowerCase() === 'section-master') continue;
        const tagTo = m.index + m[0].length;
        if (m[1] === '/') {
            if (depth === 1 && start >= 0 && start <= pos && pos <= tagTo) {
                result = { from: start, to: tagTo, closeFrom: m.index };
            }
            depth = Math.max(0, depth - 1);
        } else {
            depth++;
            if (depth === 1) start = m.index;
        }
    }
    // Thẻ mở chưa đóng (lỗi cân bằng thẻ): coi như kéo dài tới cuối file
    if (!result && depth >= 1 && start >= 0 && start <= pos) {
        result = { from: start, to: text.length, closeFrom: text.length };
    }
    return result;
}

export function inMaster(scan, pos) {
    const { master } = scan;
    return master.from >= 0 && pos >= master.from && (master.to === null || pos <= master.to);
}

export function slideStatus(scan, pos) {
    if (inMaster(scan, pos)) return 'Master';
    const cur = slideAt(scan, pos);
    if (!cur) return scan.total > 0 ? 'Ngoài slide' : 'Chưa có slide';
    return `Slide ${cur.h + 1}${cur.v > 0 ? '.' + (cur.v + 1) : ''} / ${scan.total}`;
}

export const slidesField = StateField.define({
    create: (state) => scanSections(state.doc),
    update: (value, tr) => (tr.docChanged ? scanSections(tr.newDoc) : value)
});

function toggleFoldLine(view, pos) {
    const clamped = Math.min(pos, view.state.doc.length);
    const line = view.lineBlockAt(clamped);
    const range = foldable(view.state, line.from, line.to);
    if (!range) return;
    let folded = false;
    foldedRanges(view.state).between(range.from, range.to, () => { folded = true; });
    view.dispatch({ effects: (folded ? unfoldEffect : foldEffect).of(range) });
}

class SlideBadgeMarker extends GutterMarker {
    constructor(info, pos) {
        super();
        this.info = info;
        this.pos = pos;
    }
    eq(other) {
        return other.info.text === this.info.text && other.info.kind === this.info.kind && other.pos === this.pos;
    }
    toDOM(view) {
        const dom = document.createElement('span');
        dom.className = `hs-badge hs-badge-${this.info.kind}`;
        dom.textContent = this.info.text;
        dom.title = this.info.title;
        dom.addEventListener('mousedown', (e) => {
            e.preventDefault();
            toggleFoldLine(view, this.pos);
        });
        return dom;
    }
}

// Cột nhãn slide nằm ngoài cùng bên trái: S1, S2, S2.1, ★ (master)
export const slideGutter = gutter({
    class: 'hs-slide-gutter',
    lineMarker(view, line) {
        // line là BlockInfo của view, không có số dòng nên phải tra từ document
        const info = view.state.field(slidesField).labels.get(view.state.doc.lineAt(line.from).number);
        if (!info) return null;
        return new SlideBadgeMarker(info, line.from);
    },
    lineMarkerChange: (update) => update.docChanged
        || update.startState.field(slidesField) !== update.state.field(slidesField)
});

export const sectionLinter = linter(
    (view) => scanSections(view.state.doc).diagnostics,
    { delay: 600 }
);
