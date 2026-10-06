import { Decoration, MatchDecorator, ViewPlugin, WidgetType } from "@codemirror/view";

// ---------- Đổi định dạng màu ----------

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const clamp255 = (v) => Math.min(255, Math.max(0, Math.round(v)));

function sextantToRgb(h, c, x, m) {
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return { r: clamp255((r + m) * 255), g: clamp255((g + m) * 255), b: clamp255((b + m) * 255) };
}

function hsvToRgb(h, s, v) {
    const c = v * s;
    return sextantToRgb(h, c, c * (1 - Math.abs(((h / 60) % 2) - 1)), v - c);
}

function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    return sextantToRgb(h, c, c * (1 - Math.abs(((h / 60) % 2) - 1)), l - c / 2);
}

function rgbToHsv(r, g, b) {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min;
    let h = 0;
    if (d) {
        if (max === rn) h = ((gn - bn) / d) % 6;
        else if (max === gn) h = (bn - rn) / d + 2;
        else h = (rn - gn) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    return { h, s: max === 0 ? 0 : d / max, v: max };
}

function parseHex(text) {
    let h = text.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return null;
    return {
        r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255,
        a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    };
}

function splitArgs(text) {
    const inner = text.slice(text.indexOf('(') + 1, text.lastIndexOf(')'));
    return inner.split(/[\s,/]+/).filter(Boolean);
}

function parseAlpha(tok) {
    if (tok === undefined) return 1;
    const v = tok.endsWith('%') ? parseFloat(tok) / 100 : parseFloat(tok);
    return Number.isNaN(v) ? 1 : clamp(v);
}

function parseRgbFn(text) {
    const parts = splitArgs(text);
    if (parts.length < 3) return null;
    const comp = (tok, scale) => {
        const v = tok.endsWith('%') ? parseFloat(tok) / 100 * scale : parseFloat(tok);
        return Number.isNaN(v) ? NaN : v;
    };
    const r = comp(parts[0], 255), g = comp(parts[1], 255), b = comp(parts[2], 255);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r: clamp255(r), g: clamp255(g), b: clamp255(b), a: parseAlpha(parts[3]) };
}

function parseHslFn(text) {
    const parts = splitArgs(text);
    if (parts.length < 3) return null;
    const h = parseFloat(parts[0]), s = parseFloat(parts[1]), l = parseFloat(parts[2]);
    if ([h, s, l].some(Number.isNaN)) return null;
    const { r, g, b } = hslToRgb(((h % 360) + 360) % 360, clamp(s / 100), clamp(l / 100));
    return { r, g, b, a: parseAlpha(parts[3]) };
}

// Trình duyệt tự chuẩn hoá tên màu thành rgb() nên không cần bảng 148 màu CSS
let namedProbe = null;
function parseNamedColor(name) {
    if (!namedProbe) {
        namedProbe = document.createElement('span');
        namedProbe.style.display = 'none';
        document.body.appendChild(namedProbe);
    }
    namedProbe.style.color = '';
    namedProbe.style.color = name;
    const value = namedProbe.style.color;
    return /^rgba?\(/i.test(value) ? parseRgbFn(value) : null;
}

export function parseColor(text) {
    const t = text.trim();
    if (t.startsWith('#')) return parseHex(t);
    if (/^rgba?\(/i.test(t)) return parseRgbFn(t);
    if (/^hsla?\(/i.test(t)) return parseHslFn(t);
    if (/^[a-z]{3,24}$/i.test(t)) return parseNamedColor(t);
    return null;
}

const hex2 = (v) => clamp255(v).toString(16).padStart(2, '0');

export function formatColor({ r, g, b, a }) {
    if (a === undefined || a >= 1) return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
    return `rgba(${clamp255(r)}, ${clamp255(g)}, ${clamp255(b)}, ${+clamp(a).toFixed(3)})`;
}

function cssOf({ r, g, b, a }) {
    return `rgba(${clamp255(r)}, ${clamp255(g)}, ${clamp255(b)}, ${a === undefined ? 1 : +clamp(a).toFixed(3)})`;
}

// ---------- Ô màu nhỏ cạnh mã màu trong editor ----------

// Nhánh cuối chỉ bắt tên màu CSS khi đứng ngay sau thuộc tính liên quan tới màu,
// tránh chữ "gold" trong đoạn văn thường cũng bị gắn ô màu
const COLOR_RE = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)|([a-z-]*(?:color|background|border|outline|shadow|fill|stroke)[a-z-]*\s*:\s*)([a-zA-Z]{3,24})(?![\w(-])/gi;

class SwatchWidget extends WidgetType {
    constructor(color, css, from, to) {
        super();
        this.color = color;
        this.css = css;
        this.from = from;
        this.to = to;
    }
    eq(other) {
        return other.css === this.css && other.from === this.from && other.to === this.to;
    }
    toDOM(view) {
        const box = document.createElement('span');
        box.className = 'hs-swatch';
        box.title = `${this.css} — nhấp để đổi màu`;
        const fill = document.createElement('i');
        fill.style.background = this.css;
        box.appendChild(fill);
        const { from, to } = this;
        box.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openColorPicker(view, box, from, to, this.color);
        });
        return box;
    }
    ignoreEvent() { return false; }
}

const colorMatcher = new MatchDecorator({
    regexp: COLOR_RE,
    decorate(add, from, to, match) {
        let start = from, end = to;
        if (match[2]) {
            // Nhánh tên màu: from trỏ vào tên thuộc tính, ô màu phải đặt ở tên màu
            start = from + match[0].length - match[2].length;
            end = start + match[2].length;
        }
        const color = parseColor(match[2] ? match[2] : match[0]);
        if (!color) return;
        add(start, start, Decoration.widget({
            widget: new SwatchWidget(color, cssOf(color), start, end),
            side: -1
        }));
    }
});

export const colorSwatches = ViewPlugin.fromClass(class {
    constructor(view) { this.decorations = colorMatcher.createDeco(view); }
    update(update) { this.decorations = colorMatcher.updateDeco(update, this.decorations); }
}, { decorations: (v) => v.decorations });

// ---------- Bảng chọn màu ----------

const RECENT_KEY = 'heyshow_recent_colors';
let pickerEl = null, svPad = null, svHandle = null, hueInput = null, alphaInput = null;
let hexInput = null, previewEl = null, recentEl = null, outsideHandler = null, scrollHandler = null;
let active = null; // { view, from, to, original, hsv:{h,s,v}, a, applied }
let dragMode = null;

function loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { return []; }
}

function saveRecent(css) {
    const list = [css, ...loadRecent().filter(c => c !== css)].slice(0, 10);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) { /* localStorage bị chặn thì bỏ qua */ }
}

function currentRgb() {
    return hsvToRgb(active.hsv.h, active.hsv.s, active.hsv.v);
}

function currentCss() {
    const { r, g, b } = currentRgb();
    return cssOf({ r, g, b, a: active.a });
}

function applyToDoc() {
    const text = formatColor({ ...currentRgb(), a: active.a });
    if (text === active.applied) return;
    active.applied = text;
    // userEvent giống nhau để lịch sử gộp cả chuỗi kéo-thả thành một lần undo
    active.view.dispatch({ changes: { from: active.from, to: active.to, insert: text }, userEvent: 'input.color' });
    active.to = active.from + text.length;
}

function render() {
    const { h, s, v } = active.hsv;
    svPad.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
    svHandle.style.left = `${s * 100}%`;
    svHandle.style.top = `${(1 - v) * 100}%`;
    hueInput.value = String(Math.round(h));
    alphaInput.value = String(Math.round(active.a * 100));
    const { r, g, b } = currentRgb();
    alphaInput.style.background =
        `linear-gradient(to right, rgba(${r},${g},${b},0), rgba(${r},${g},${b},1)),` +
        `linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%),` +
        `linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%)`;
    alphaInput.style.backgroundSize = 'auto, 8px 8px, 8px 8px';
    alphaInput.style.backgroundPosition = '0 0, 0 0, 4px 4px';
    previewEl.style.background = currentCss();
    if (document.activeElement !== hexInput) hexInput.value = formatColor({ r, g, b, a: active.a });
}

function renderRecent() {
    recentEl.innerHTML = '';
    for (const css of loadRecent()) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'hs-recent';
        b.title = css;
        b.style.background = css;
        b.addEventListener('click', () => {
            const color = parseColor(css);
            if (!color) return;
            const { h, s, v } = rgbToHsv(color.r, color.g, color.b);
            active.hsv = { h, s, v };
            active.a = color.a;
            render();
            applyToDoc();
        });
        recentEl.appendChild(b);
    }
}

function ensurePicker() {
    if (pickerEl) return;
    pickerEl = document.createElement('div');
    pickerEl.className = 'hs-picker hidden';
    pickerEl.innerHTML = `
        <div class="hs-sv"><span class="hs-sv-handle"></span></div>
        <input class="hs-hue" type="range" min="0" max="360" step="1" title="Tông màu" />
        <input class="hs-alpha" type="range" min="0" max="100" step="1" title="Độ trong suốt" />
        <div class="hs-row">
            <span class="hs-current"></span>
            <input class="hs-hex" type="text" spellcheck="false" autocomplete="off" />
        </div>
        <div class="hs-recents"></div>
        <div class="hs-btns">
            <button type="button" class="hs-undo">Hoàn tác</button>
            <button type="button" class="hs-ok primary">Xong</button>
        </div>`;
    document.body.appendChild(pickerEl);

    svPad = pickerEl.querySelector('.hs-sv');
    svHandle = pickerEl.querySelector('.hs-sv-handle');
    hueInput = pickerEl.querySelector('.hs-hue');
    alphaInput = pickerEl.querySelector('.hs-alpha');
    hexInput = pickerEl.querySelector('.hs-hex');
    previewEl = pickerEl.querySelector('.hs-current');
    recentEl = pickerEl.querySelector('.hs-recents');

    const svFromEvent = (e) => {
        const r = svPad.getBoundingClientRect();
        active.hsv.s = clamp((e.clientX - r.left) / r.width);
        active.hsv.v = 1 - clamp((e.clientY - r.top) / r.height);
        render();
        applyToDoc();
    };
    svPad.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        dragMode = 'sv';
        svFromEvent(e);
        // Con trỏ tổng hợp (test tự động) không có pointer đang hoạt động nên capture có thể ném lỗi
        try { svPad.setPointerCapture(e.pointerId); } catch (err) { /* kéo vẫn chạy nhờ pointermove trên pad */ }
    });
    svPad.addEventListener('pointermove', (e) => { if (dragMode === 'sv') svFromEvent(e); });
    svPad.addEventListener('pointerup', () => { dragMode = null; });
    svPad.addEventListener('pointercancel', () => { dragMode = null; });

    hueInput.addEventListener('input', () => {
        active.hsv.h = Number(hueInput.value);
        render();
        applyToDoc();
    });
    alphaInput.addEventListener('input', () => {
        active.a = Number(alphaInput.value) / 100;
        render();
        applyToDoc();
    });
    hexInput.addEventListener('input', () => {
        const color = parseColor(hexInput.value.trim());
        if (!color) { hexInput.classList.add('bad'); return; }
        hexInput.classList.remove('bad');
        const { h, s, v } = rgbToHsv(color.r, color.g, color.b);
        active.hsv = { h, s, v };
        active.a = color.a;
        render();
        applyToDoc();
    });
    hexInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); closeColorPicker(); }
    });

    pickerEl.querySelector('.hs-undo').addEventListener('click', () => {
        active.view.dispatch({
            changes: { from: active.from, to: active.to, insert: active.original },
            userEvent: 'input.color'
        });
        closeColorPicker(false);
    });
    pickerEl.querySelector('.hs-ok').addEventListener('click', () => closeColorPicker());

    pickerEl.addEventListener('mousedown', (e) => e.stopPropagation());
}

function placePicker(rect) {
    pickerEl.style.left = '-9999px';
    pickerEl.style.top = '0';
    const w = pickerEl.offsetWidth, h = pickerEl.offsetHeight;
    let left = rect.left, top = rect.bottom + 6;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (top + h > window.innerHeight - 8) top = rect.top - h - 6;
    pickerEl.style.left = `${Math.max(8, left)}px`;
    pickerEl.style.top = `${Math.max(8, top)}px`;
}

export function openColorPicker(view, anchorEl, from, to, color) {
    ensurePicker();
    closeColorPicker(false);

    const { h, s, v } = rgbToHsv(color.r, color.g, color.b);
    active = {
        view, from, to,
        original: view.state.sliceDoc(from, to),
        hsv: { h, s, v },
        a: color.a === undefined ? 1 : color.a,
        applied: null
    };

    render();
    renderRecent();
    hexInput.classList.remove('bad');
    pickerEl.classList.remove('hidden');
    placePicker(anchorEl.getBoundingClientRect());

    outsideHandler = (e) => {
        if (pickerEl.contains(e.target)) return;
        if (e.target.closest && e.target.closest('.hs-swatch')) return;
        closeColorPicker();
    };
    scrollHandler = () => closeColorPicker();
    document.addEventListener('pointerdown', outsideHandler, true);
    document.addEventListener('keydown', onEsc, true);
    view.scrollDOM.addEventListener('scroll', scrollHandler, true);
}

function onEsc(e) {
    if (e.key === 'Escape') closeColorPicker();
}

export function closeColorPicker(commit = true) {
    if (outsideHandler) {
        document.removeEventListener('pointerdown', outsideHandler, true);
        document.removeEventListener('keydown', onEsc, true);
        outsideHandler = null;
    }
    if (!active) {
        if (pickerEl) pickerEl.classList.add('hidden');
        return;
    }
    const { view, original, applied } = active;
    if (scrollHandler) {
        view.scrollDOM.removeEventListener('scroll', scrollHandler, true);
        scrollHandler = null;
    }
    if (commit && applied && applied !== original) saveRecent(applied);
    active = null;
    pickerEl.classList.add('hidden');
}
