// Bộ vẽ TikZ/pgfplots → SVG KHÔNG cần TeX và KHÔNG cần AI.
//
// Lý do tồn tại: nhờ AI dựng lại hình cho giáo án toán chỉ đúng khoảng 60%, mà "sai một
// toạ độ" với học sinh là sai kiến thức. Các hình phổ biến (hệ trục, đường cong, vùng tô
// giữa hai đường) thực chất chỉ là phép biến đổi affine từ toạ độ dữ liệu sang điểm ảnh,
// nên máy tính làm đúng tuyệt đối: đọc domain/samples rồi lấy nghiệm, đọc coordinates{}
// rồi nối điểm, đọc xmin/xmax rồi chia khoảng.
//
// Phạm vi có chủ đích: chỉ nhận tập cú pháp mà nó chắc chắn vẽ ĐÚNG. Gặp cú pháp lạ thì
// trả { unsupported: [...] } để nơi gọi fallback (AI hoặc giữ nguyên khối hs-tikz).
// Thà không vẽ còn hơn vẽ sai.

const { NAMED, splitMix, mix, hex } = require('./beamertheme');

// 1cm = 28.3465pt, 1pt = 96/72 px → 37.8 px/cm, đúng tỉ lệ pgfplots dùng khi đo width/height
const PX_PER_CM = 96 / 72 * 28.3465;
const TEXTWIDTH_CM = 12.8;      // \textwidth của beamer khung 4:3
const DEFAULT_SAMPLES = 25;     // mặc định pgfplots
const DEFAULT_DOMAIN = [0, 1];  // mặc định pgfplots cho \addplot {hàm}
// Vòng màu pgfplots khi \addplot không ghi màu (plot thứ i trong trục)
const CYCLE = ['blue!75!black', 'red!75!black', 'black!75!gray', 'teal', 'olive'];

const NUM = '-?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?';

// ============================ MÀU theo xcolor ============================

function colorOf(token) {
    const parts = splitMix(String(token || ''));
    if (!parts.length) return null;
    let cur = NAMED[parts[0].toLowerCase()];
    if (!cur) return null;
    for (let i = 1; i < parts.length; i++) {
        const pct = parseFloat(parts[i]);
        if (Number.isNaN(pct)) return null;
        const next = i + 1 < parts.length ? NAMED[parts[i + 1].toLowerCase()] : NAMED.white;
        if (!next) return null;
        cur = mix(cur, next, Math.max(0, Math.min(100, pct)) / 100);
        i++;
    }
    return hex(cur);
}

// "blue!20" → #BFBFBF dạng hex; "none" → 'none'; thiếu/không hiểu → null
function styleColor(token) {
    if (token === undefined || token === null) return null;
    const t = String(token).trim();
    if (!t) return null;
    if (t === 'none') return 'none';
    return colorOf(t);
}

// ============================ TOÁN: biểu thức → số ============================

// pgfplots viết {1+0.25*(x-0.5)*(3.5-x)*2+0.3*x}, {sin(deg(x))}, TikZ thuần viết {\x*\x/2}.
// Dàn phẳng chữ LaTeX rồi tự phân tích cú pháp — KHÔNG dùng eval() vì biểu thức đến từ
// file người dùng tải lên.
const FUNCS = {
    sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp, ln: Math.log, log: v => Math.log10(v), log2: Math.log2,
    // pgfplots/TikZ tính sin/cos/tan theo ĐỘ — vì vậy người ta mới viết sin(deg(x))
    sin: v => Math.sin(v * Math.PI / 180), cos: v => Math.cos(v * Math.PI / 180), tan: v => Math.tan(v * Math.PI / 180),
    asin: v => Math.asin(v) * 180 / Math.PI, acos: v => Math.acos(v) * 180 / Math.PI, atan: v => Math.atan(v) * 180 / Math.PI,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, floor: Math.floor, ceil: Math.ceil,
    round: Math.round, int: v => Math.trunc(v), sign: Math.sign, pow: Math.pow,
    min: Math.min, max: Math.max, mod: (a, b) => a - b * Math.floor(a / b),
    deg: v => v * 180 / Math.PI, rad: v => v * Math.PI / 180
};
const CONSTS = { pi: Math.PI, e: Math.E };

function normalizeExpr(src) {
    return String(src)
        .replace(/\\left|\\right/g, '')
        .replace(/\\cdot|\\times/g, '*')
        .replace(/\\div/g, '/')
        .replace(/\\pi/g, 'pi')
        .replace(/\\(sqrt|ln|log|log2|exp|sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|min|max|mod|floor|ceil|round|int|deg|rad|sign|pow|abs)\b/g, '$1')
        .replace(/\\x\b/g, 'x')
        .replace(/\\[a-zA-Z]+/g, m => m)      // mọi lệnh lạ còn sót sẽ làm fail ở bước tokenize
        .replace(/[{}]/g, '');
}

function tokenizeExpr(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
        const c = s[i];
        if (/\s/.test(c)) { i++; continue; }
        if (/[0-9.]/.test(c)) {
            const m = new RegExp(`^${NUM}`).exec(s.slice(i));
            if (!m) throw new Error('không đọc được số: ' + s.slice(i, i + 6));
            out.push({ k: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue;
        }
        if (/[a-zA-Z_]/.test(c)) {
            const m = /^[a-zA-Z_][a-zA-Z_0-9]*/.exec(s.slice(i));
            out.push({ k: 'id', v: m[0] }); i += m[0].length; continue;
        }
        if ('+-*/^(),'.includes(c)) { out.push({ k: 'op', v: c }); i++; continue; }
        throw new Error('ký tự không hỗ trợ trong biểu thức: "' + c + '"');
    }
    return out;
}

function parseExpr(src, env) {
    const toks = tokenizeExpr(normalizeExpr(src));
    let p = 0;
    const at = () => toks[p];

    function primary() {
        const t = at();
        if (!t) throw new Error('biểu thức bị cụt');
        if (t.k === 'num') { p++; return t.v; }
        if (t.k === 'op' && t.v === '(') { p++; const v = sum(); expect(')'); return v; }
        if (t.k === 'id') {
            p++;
            if (at() && at().k === 'op' && at().v === '(') {
                const f = FUNCS[t.v];
                if (!f) throw new Error('hàm không rõ: ' + t.v);
                p++;
                const args = [sum()];
                while (at() && at().k === 'op' && at().v === ',') { p++; args.push(sum()); }
                expect(')');
                return f(...args);
            }
            if (t.v in env) return env[t.v];
            if (t.v in CONSTS) return CONSTS[t.v];
            throw new Error('biến không rõ: ' + t.v);
        }
        throw new Error('không đọc được "' + t.v + '"');
    }
    function expect(op) {
        if (!at() || !(at().k === 'op' && at().v === op)) throw new Error('thiếu ' + op);
        p++;
    }
    function unary() {
        const t = at();
        if (t && t.k === 'op' && (t.v === '-' || t.v === '+')) { p++; const v = unary(); return t.v === '-' ? -v : v; }
        return power();
    }
    function power() {
        const base = primary();
        if (at() && at().k === 'op' && at().v === '^') { p++; return Math.pow(base, unary()); }
        return base;
    }
    function term() {
        let v = unary();
        for (;;) {
            const t = at();
            if (!t) break;
            if (t.k === 'op' && (t.v === '*' || t.v === '/')) { p++; const r = unary(); v = t.v === '*' ? v * r : v / r; continue; }
            // phép nhân viết sát kiểu LaTeX: 2x, 0.25(x+1), (x+1)(x-1)
            if (t.k === 'num' || t.k === 'id' || (t.k === 'op' && t.v === '(')) { v *= unary(); continue; }
            break;
        }
        return v;
    }
    function sum() {
        let v = term();
        for (;;) {
            const t = at();
            if (t && t.k === 'op' && (t.v === '+' || t.v === '-')) { p++; const r = term(); v = t.v === '+' ? v + r : v - r; continue; }
            break;
        }
        return v;
    }
    const val = sum();
    if (p !== toks.length) throw new Error('còn dư: "' + toks.slice(p).map(x => x.v).join('') + '"');
    return val;
}

// ============================ ĐỌC THAM SỐ ============================

// Tách theo dấu phẩy ngoài cùng, tôn trọng {...} [...] (...)
function splitTop(str, sep = ',') {
    const out = [];
    let depth = 0, cur = '';
    for (const c of String(str || '')) {
        if (c === '{' || c === '[' || c === '(') depth++;
        else if (c === '}' || c === ']' || c === ')') depth--;
        if (c === sep && depth === 0) { out.push(cur); cur = ''; continue; }
        cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim()).filter(s => s !== '');
}

function parseOptions(str) {
    const map = new Map();
    for (const part of splitTop(str)) {
        const eq = part.indexOf('=');
        if (eq < 0) map.set(part, '');
        else map.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim().replace(/^\{|\}$/g, ''));
    }
    return map;
}

function stripBraces(s) { return String(s == null ? '' : s).trim().replace(/^\{/, '').replace(/\}$/, ''); }

// "4.6cm" | "28mm" | "10pt" | "\textwidth" | số thô (pgfplots tính bằng pt) → px
function toPx(str) {
    const s = String(str).trim();
    if (s === '\\textwidth') return TEXTWIDTH_CM * PX_PER_CM;
    if (s === '\\textheight') return 8.75 * PX_PER_CM;
    const m = new RegExp(`^(${NUM})\\s*(cm|mm|pt|px|em)?$`).exec(s);
    if (!m) return null;
    const unit = m[2] || 'pt';
    const perCm = { cm: 1, mm: 0.1, pt: 1 / 28.3465, px: 72 / 96 / 28.3465, em: 0.35 };
    return parseFloat(m[1]) * PX_PER_CM * perCm[unit];
}

function toFloat(str) {
    const m = new RegExp(`^(${NUM})$`).exec(String(str).trim());
    return m ? parseFloat(m[1]) : null;
}

// "axis cs:0,0" | "-0.5,0" | "2,-2" → {x,y}; toạ độ chứa phép tính thì tự tính
function parseCoord(str) {
    const s = String(str).trim().replace(/^[a-zA-Z ]*cs:/, '');
    const parts = splitTop(s, ',');
    if (parts.length !== 2) return null;
    const x = numberOrExpr(parts[0]);
    const y = numberOrExpr(parts[1]);
    if (x === null || y === null) return null;
    return { x, y };
}

function numberOrExpr(str) {
    const direct = toFloat(str);
    if (direct !== null) return direct;
    try { return parseExpr(str, {}); } catch (e) { return null; }
}

// "(-0.5,0)--(9,0)--(3,2)" → [{x,y},...]
function parsePoints(str) {
    const out = [];
    const re = /\(([^()]*)\)/g;
    let m;
    while ((m = re.exec(str))) {
        const c = parseCoord(m[1]);
        if (c) out.push(c);
    }
    return out;
}

// ============================ CHỮ: LaTeX → Unicode phẳng ============================

function xmlEscape(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SUP = { '-': '⁻', '+': '⁺', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', 'n': 'ⁿ', 'i': 'ⁱ' };
const SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', 'x': 'ₓ', 'i': 'ᵢ', 'n': 'ₙ' };
const GREEK = {
    pi: 'π', Gamma: 'Γ', gamma: 'γ', Delta: 'Δ', delta: 'δ', theta: 'θ', Lambda: 'Λ', lambda: 'λ',
    mu: 'μ', sigma: 'σ', Sigma: 'Σ', phi: 'φ', omega: 'ω', Omega: 'Ω', alpha: 'α', beta: 'β', epsilon: 'ε'
};
const SYMBOLS = {
    times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠',
    infty: '∞', sqrt: '√', int: '∫', ioint: '∮', sum: '∑', prod: '∏', rightarrow: '→', to: '→', approx: '≈',
    partial: '∂', in: '∈', notin: '∉', subset: '⊂', cup: '∪', cap: '∩', ldots: '…', dots: '…', ell: 'ℓ',
    R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ', circ: '∘', degree: '°'
};

// "$t$ (s)" → [{t:'t',italic:true},{t:' (s)',italic:false}] — in nghiêng đúng phần công thức
function labelRuns(str) {
    const s = String(str == null ? '' : str).trim();
    const run = (raw, italic) => {
        const t = texToText(raw);
        // texToText cắt khoảng trắng thừa, nhưng chỗ nối giữa công thức và chữ thì phải giữ:
        // "$v$ (m/s)" mà mất khoảng thì thành "v(m/s)"
        if (t && /^\s/.test(raw) && !/^\s/.test(t)) return { t: ' ' + t, italic };
        return { t, italic };
    };
    const runs = [];
    let i = 0;
    for (;;) {
        const open = s.indexOf('$', i);
        if (open < 0) { runs.push(run(s.slice(i), false)); break; }
        if (open > i) runs.push(run(s.slice(i, open), false));
        const close = s.indexOf('$', open + 1);
        if (close < 0) { runs.push(run(s.slice(open), true)); break; }
        runs.push(run(s.slice(open + 1, close), true));
        i = close + 1;
    }
    return runs.filter(r => r.t !== '');
}

function texToText(s) {
    return String(s)
        .replace(/\\(?:mathrm|mathit|mathbf|mathsf|text|textrm|textit|textbf|mbox|operatorname|boldsymbol)\s*\{([^{}]*)\}/g, '$1')
        .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
        .replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)')
        .replace(/\\sqrt\s*/g, '√')
        .replace(/\\(?:,|;|:|!|quad|qquad|hspace|space)\s*(?:\{[^{}]*\})?/g, ' ')
        .replace(/\\[a-zA-Z]+/g, m => {
            const name = m.slice(1);
            if (GREEK[name]) return GREEK[name];
            if (SYMBOLS[name]) return SYMBOLS[name];
            return name;
        })
        .replace(/\^\s*\{([^{}]*)\}/g, (m, g) => [...g].map(c => SUP[c] || c).join(''))
        .replace(/\^\s*(\d|[-+nix])/g, (m, c) => SUP[c] || c)
        .replace(/_\s*\{([A-Za-z0-9])\}/g, (m, c) => SUB[c] || c)
        .replace(/_\s*([A-Za-z0-9])/g, (m, c) => SUB[c] || c)
        .replace(/[{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================ SCENE → SVG ============================

// Scene giữ các nguyên tố đã ở toạ độ ảnh (px, gốc trên trái, y hướng xuống).
function newScene() { return { fills: [], strokes: [], dots: [], texts: [] }; }

function poly(points) {
    return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

function emitScene(scene, w, h) {
    const out = [];
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}" width="${Math.round(w)}" height="${Math.round(h)}" font-family="'Times New Roman', Georgia, serif" style="max-width:100%;height:auto">`);
    out.push('<defs><marker id="hs-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#000"/></marker></defs>');
    for (const f of scene.fills) out.push(`<polygon points="${poly(f.pts)}" fill="${f.color}" stroke="none"/>`);
    for (const s of scene.strokes) {
        const dash = s.dash ? ` stroke-dasharray="${s.dash === 'dashed' ? '7,5' : s.dash === 'dotted' ? '2,3' : s.dash}"` : '';
        const arrow = s.arrow ? ' marker-end="url(#hs-arrow)"' : '';
        out.push(`<${s.close ? 'polygon' : 'polyline'} points="${poly(s.pts)}" fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linejoin="round" stroke-linecap="round"${dash}${arrow}/>`);
    }
    for (const d of scene.dots) out.push(`<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r.toFixed(1)}" fill="${d.color}"/>`);
    for (const t of scene.texts) {
        const body = (t.runs || []).map(r => r.italic ? `<tspan font-style="italic">${xmlEscape(r.t)}</tspan>` : xmlEscape(r.t)).join('');
        const rot = t.rotate ? ` transform="rotate(${t.rotate} ${t.x.toFixed(1)} ${t.y.toFixed(1)})"` : '';
        out.push(`<text x="${t.x.toFixed(1)}" y="${t.y.toFixed(1)}" font-size="${t.size}" text-anchor="${t.anchor}" fill="${t.color}"${rot}>${body}</text>`);
    }
    out.push('</svg>');
    return out.join('\n');
}

// ============================ ĐƯỜNG CONG / VÙNG TÔ ============================

// Lấy nghiệm một hàm theo biến x: {x^2} với domain=0:2, samples=50
function sampleFunction(expr, domain, samples, ctx) {
    const [a, b] = domain;
    const n = Math.max(2, samples);
    const pts = [];
    for (let i = 0; i < n; i++) {
        const x = a + (b - a) * i / (n - 1);
        let y;
        try { y = parseExpr(expr, { x }); } catch (err) { ctx.bad(`biểu thức "${expr.trim()}": ${err.message}`); return null; }
        if (!Number.isFinite(y)) { ctx.bad(`hàm "${expr.trim()}" cho kết quả vô hạn tại x=${x}`); return null; }
        pts.push({ x, y });
    }
    return pts;
}

// Plot tham số của TikZ thuần: plot[domain=-2:4,samples=40]({\x*\x/2},{\x})
function sampleParametric(exprX, exprY, domain, samples, ctx) {
    const [a, b] = domain;
    const n = Math.max(2, samples);
    const pts = [];
    for (let i = 0; i < n; i++) {
        const t = a + (b - a) * i / (n - 1);
        try {
            const x = parseExpr(exprX, { x: t });
            const y = parseExpr(exprY, { x: t });
            if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('kết quả vô hạn');
            pts.push({ x, y });
        } catch (err) { ctx.bad(`plot tham số ({${exprX}},{${exprY}}): ${err.message}`); return null; }
    }
    return pts;
}

// \closedcycle trong pgfplots: đóng vùng tô xuống trục hoành (y = 0)
function closeToAxis(pts) {
    if (pts.length < 2) return pts;
    return pts.concat([{ x: pts[pts.length - 1].x, y: 0 }, { x: pts[0].x, y: 0 }]);
}

// pgfplots che phần vượt khung: kẹp điểm vào hộp trục (đường kẻ vẫn khớp vì hàm liên tục)
function clampToBox(pts, x0, y0, x1, y1) {
    return pts.map(p => ({ x: Math.max(x0, Math.min(x1, p.x)), y: Math.max(y0, Math.min(y1, p.y)) }));
}

// ============================ PHÂN TÍCH CÂU LỆNH ============================

const CMD_RE = /\\(addplot|draw|filldraw|fill|path|node|clip|shade|shade|foreach|scope|tikzset|coordinate|legend|addlegendentry|onlymarks)\b(?!\w)/g;

// Cắt thân picture/axis thành từng câu lệnh tới dấu ';' ngoài ngoặc
function scanStatements(s) {
    const out = [];
    CMD_RE.lastIndex = 0;
    let m;
    while ((m = CMD_RE.exec(s))) {
        const from = m.index + m[0].length;
        let i = from; let depth = 0;
        while (i < s.length) {
            const c = s[i];
            if (c === '{' || c === '[' || c === '(') depth++;
            else if (c === '}' || c === ']' || c === ')') depth--;
            else if (c === ';' && depth <= 0) break;
            i++;
        }
        const src = s.slice(from, i);
        const opt = /^\s*(?:\*|=\s*\*)?\s*\[([\s\S]*?)\]/.exec(src);
        out.push({
            cmd: m[1],
            src,
            opts: opt ? opt[1] : '',
            body: (opt ? src.slice(opt[0].length) : src).trim()
        });
        CMD_RE.lastIndex = i;
    }
    return out;
}

// Đọc kiểu nét/tô từ options. area='between' (fill between), 'closed' (\closedcycle),
// 'bar' (ybar) nghĩa là đường trở thành vùng tô: khi đó một màu viết trần ("[blue!25]")
// là MÀU TÔ, còn "draw=none" nghĩa là chỉ tô, không viền.
function firstColorToken(o) {
    for (const key of o.keys()) {
        if (key.includes('=')) continue;
        if (colorOf(key)) return key;
    }
    return null;
}

function resolveToken(v) {
    if (v === undefined || v === null || v === '') return undefined;
    if (String(v).trim() === 'none') return 'none';
    return colorOf(v) || undefined;
}

function lineStyle(o, cmd, cycleColor, area) {
    const cyc = cycleColor ? colorOf(cycleColor) : null;
    const lone = firstColorToken(o);
    const drawT = o.has('draw') ? resolveToken(o.get('draw'))
        : o.has('color') ? resolveToken(o.get('color')) : resolveToken(lone);
    const asArea = cmd === 'fill' || area !== undefined;
    // pgfplots chỉ tô khi plot là vùng (ybar/closedcycle/fill between) — "\addplot[fill=..]{x}"
    // không tô gì cả. TikZ thuần thì \draw[fill=..] vẫn tô.
    let fillT;
    if (o.has('fill') && (asArea || cmd !== 'addplot')) fillT = resolveToken(o.get('fill'));
    // Mã giáo án hay viết "[blue!25,draw=none] ... \closedcycle": pgfplots bản gốc không tô
    // (cần fill=), nhưng ba dấu hiệu đó chỉ có nghĩa là tô vùng, nên ở đây tô theo ý đồ.
    else if (asArea) fillT = resolveToken(lone);
    else fillT = undefined;
    let stroke = null;
    if (cmd !== 'fill') {
        if (drawT === 'none') stroke = null;
        else if (o.has('draw') || o.has('color')) stroke = drawT || '#000000';
        else if (area === 'between') stroke = null;           // vùng giữa hai path: tô thôi, không viền
        else if (area) stroke = drawT;                        // closedcycle/ybar: viền cùng màu tô khi mã có gọi màu
        else stroke = drawT || cyc || '#000000';
    }
    const fill = fillT === 'none' || fillT === undefined ? null : fillT;
    const width = o.has('very thick') ? 3 : o.has('ultra thick') ? 4 : o.has('semithick') ? 1.6 : o.has('thick') ? 2 : 1.2;
    const dash = o.has('dashed') ? 'dashed' : o.has('dotted') ? 'dotted' : o.has('densely dashed') ? '4,3' : null;
    const arrow = [...o.keys()].some(k => k.includes('->') || k.includes('latex') || k.includes('stealth'));
    return { stroke, fill, width, dash, arrow };
}

// ============================ MÔI TRƯỜNG AXIS (pgfplots) ============================

function renderAxis(optStr, body, scene, ctx) {
    const opts = parseOptions(optStr);
    const xmin = toFloat(opts.get('xmin'));
    const xmax = toFloat(opts.get('xmax'));
    if (xmin === null || xmax === null || !(xmax > xmin)) { ctx.bad('môi trường axis cần xmin/xmax (số) để dựng trục'); return null; }
    const ymin = toFloat(opts.get('ymin'));
    const ymax = toFloat(opts.get('ymax'));
    if (ymin === null || ymax === null || !(ymax > ymin)) { ctx.bad('môi trường axis cần ymin/ymax (số) để dựng trục'); return null; }

    const W = opts.has('width') ? toPx(opts.get('width')) : 0.8 * TEXTWIDTH_CM * PX_PER_CM;
    const H = opts.has('height') ? toPx(opts.get('height')) : W * 0.5;
    if (!W || !H) { ctx.bad('không đọc được width/height của axis'); return null; }

    const padL = 44, padR = 18, padT = 16, padB = 34;
    const X = x => padL + (x - xmin) / (xmax - xmin) * W;
    const Y = y => padT + H - (y - ymin) / (ymax - ymin) * H;
    ctx.box = { w: W + padL + padR, h: H + padT + padB };
    const black = '#000000';
    const kind = (opts.get('axis lines') || 'left').replace(/\s/g, '');

    const centred = kind.includes('middle') || kind.includes('center');
    // axis lines=middle: hai trục đi qua gốc; gốc nằm ngoài khoảng thì pgfplots đẩy trục về mép.
    const axisY = centred && ymin < 0 && ymax > 0 ? Y(0) : padT + H;          // đường trục hoành
    const axisX = centred && xmin < 0 && xmax > 0 ? X(0) : padL;             // đường trục tung
    if (kind.includes('box')) {
        scene.strokes.push({ pts: [{ x: padL, y: padT }, { x: padL + W, y: padT }, { x: padL + W, y: padT + H }, { x: padL, y: padT + H }, { x: padL, y: padT }], color: black, width: 1.2, close: false });
    } else if (!kind.includes('none')) {
        scene.strokes.push({ pts: [{ x: padL, y: axisY }, { x: padL + W, y: axisY }], color: black, width: 1.2 });
        scene.strokes.push({ pts: [{ x: axisX, y: padT }, { x: axisX, y: padT + H }], color: black, width: 1.2 });
    }

    const ticksOf = (valuesKey, labelsKey) => {
        if (!opts.has(valuesKey)) return null;                 // null = pgfplots tự chọn, bộ này không bắt chước
        const raw = stripBraces(opts.get(valuesKey));
        if (/\\empty/.test(raw)) return [];
        const vals = splitTop(raw, ',').map(toFloat).filter(v => v !== null);
        const labels = opts.has(labelsKey) ? splitTop(stripBraces(opts.get(labelsKey)), ',') : null;
        return vals.map((v, i) => ({ v, label: labels && labels[i] !== undefined ? labels[i] : fmtTick(v) }));
    };
    const xt = ticksOf('xtick', 'xticklabels');
    const yt = ticksOf('ytick', 'yticklabels');
    if (opts.has('xtick') === false || opts.has('ytick') === false) {
        ctx.note('pgfplots sẽ tự chọn vạch khắc, bản SVG chỉ vẽ những vạch ghi rõ trong mã');
    }
    for (const t of xt || []) {
        if (t.v < xmin || t.v > xmax) continue;
        const px = X(t.v);
        scene.strokes.push({ pts: [{ x: px, y: axisY - 3 }, { x: px, y: axisY + 3 }], color: black, width: 1 });
        scene.texts.push({ x: px, y: axisY + 15, runs: labelRuns(t.label), size: 11, anchor: 'middle', color: black });
    }
    for (const t of yt || []) {
        if (t.v < ymin || t.v > ymax) continue;
        const py = Y(t.v);
        scene.strokes.push({ pts: [{ x: axisX - 3, y: py }, { x: axisX + 3, y: py }], color: black, width: 1 });
        scene.texts.push({ x: axisX - 7, y: py + 4, runs: labelRuns(t.label), size: 11, anchor: 'end', color: black });
    }
    if (opts.has('xlabel')) {
        scene.texts.push(centred
            ? { x: padL + W - 3, y: axisY + 18, runs: labelRuns(opts.get('xlabel')), size: 12, anchor: 'end', color: black }
            : { x: padL + W / 2, y: padT + H + 31, runs: labelRuns(opts.get('xlabel')), size: 12, anchor: 'middle', color: black });
    }
    if (opts.has('ylabel')) {
        scene.texts.push(centred
            ? { x: axisX + 7, y: padT + 10, runs: labelRuns(opts.get('ylabel')), size: 12, anchor: 'start', color: black }
            : { x: 13, y: padT + H / 2, runs: labelRuns(opts.get('ylabel')), size: 12, anchor: 'start', color: black, rotate: -90 });
    }

    const named = new Map();
    let plotIndex = 0;
    for (const st of scanStatements(body)) {
        const o = parseOptions(st.opts);
        if (st.cmd === 'addplot' || st.cmd === 'fill' || st.cmd === 'draw') {
            plotIndex++;
            const dm = /domain\s*=\s*\{?\s*([^,:{}\s]+)\s*:\s*([^,:{}\s]+)/.exec(st.opts);
            const domain = dm ? [parseFloat(dm[1]), parseFloat(dm[2])] : DEFAULT_DOMAIN;
            if (domain.some(Number.isNaN)) { ctx.bad('domain không đọc được: ' + (dm ? dm[0] : 'mặc định')); continue; }
            const sm = /samples\s*=\s*\{?\s*(\d+)/.exec(st.opts);
            const samples = sm ? parseInt(sm[1], 10) : DEFAULT_SAMPLES;

            // 1) fill between[of=A and B] — vùng giữa hai path đã đặt tên
            if (/fill between/.test(st.body)) {
                const fb = /of\s*=\s*\{?\s*([A-Za-z0-9_]+)\s+and\s+([A-Za-z0-9_]+)/.exec(st.body);
                if (!fb) { ctx.bad('fill between thiếu "of=A and B"'); continue; }
                const A = named.get(fb[1]); const B = named.get(fb[2]);
                if (!A || !B) { ctx.bad(`fill between tham chiếu path chưa khai báo (${fb[1]}, ${fb[2]})`); continue; }
                const sty = lineStyle(o, st.cmd, null, 'between');
                scene.fills.push({ pts: clampToBox(A.concat(B.slice().reverse()).map(p => ({ x: X(p.x), y: Y(p.y) })), padL, padT, padL + W, padT + H), color: sty.fill || '#9AA0A6' });
                if (sty.stroke) scene.strokes.push({ pts: A.concat(B.slice().reverse()).map(p => ({ x: X(p.x), y: Y(p.y) })), color: sty.stroke, width: sty.width, dash: sty.dash });
                continue;
            }

            let pts = null;
            let area;
            const coordM = /coordinates\s*\{([\s\S]*?)\}/.exec(st.body);
            const fnM = /^\s*\{([\s\S]*?)\}/.exec(st.body);
            const isBar = /\bybar(?:\s+interval)?\b/.test(st.opts);
            if (isBar) {
                const expr = fnM ? fnM[1] : (coordM ? null : '');
                pts = coordM ? parsePoints(coordM[1]) : (expr ? sampleFunction(expr, domain, samples, ctx) : null);
                if (!pts || pts.length < 2) { ctx.bad('ybar: không lấy được dữ liệu vẽ cột'); continue; }
                area = 'bar';
                const step = (domain[1] - domain[0]) / Math.max(1, pts.length - 1);
                const zero = Math.max(ymin, Math.min(ymax, 0));
                const sty = lineStyle(o, st.cmd, null, 'bar');
                for (const p of pts) {
                    const x2 = Math.min(domain[1], p.x + step);
                    if (!(x2 > p.x)) continue;                    // mẫu cuối của ybar interval: cột rộng 0, pgfplots không vẽ
                    const yv = Math.max(ymin, Math.min(ymax, p.y));
                    const rect = clampToBox([{ x: X(p.x), y: Y(zero) }, { x: X(x2), y: Y(zero) }, { x: X(x2), y: Y(yv) }, { x: X(p.x), y: Y(yv) }], padL, padT, padL + W, padT + H);
                    if (sty.fill) scene.fills.push({ pts: rect, color: sty.fill });
                    scene.strokes.push({ pts: rect.concat([rect[0]]), color: sty.stroke || '#000000', width: sty.width });
                }
                if (o.get('name path')) named.set(stripBraces(o.get('name path')), pts);
                continue;
            }
            if (coordM) {
                pts = parsePoints(coordM[1]);
                if (pts.length < 2) { ctx.bad('coordinates{} có ít hơn 2 điểm'); continue; }
            } else if (fnM) {
                pts = sampleFunction(fnM[1], domain, samples, ctx);
                if (!pts) continue;
            } else {
                ctx.bad(`\\${st.cmd} không có {hàm} hay coordinates{}`);
                continue;
            }

            if (/closedcycle/.test(st.body)) { pts = closeToAxis(pts); area = 'closed'; }
            if (o.get('name path')) named.set(stripBraces(o.get('name path')), pts);

            const inside = clampToBox(pts.map(p => ({ x: X(p.x), y: Y(p.y) })), padL, padT, padL + W, padT + H);
            const sty = lineStyle(o, st.cmd, CYCLE[(plotIndex - 1) % CYCLE.length], area);
            if (sty.fill) scene.fills.push({ pts: inside, color: sty.fill });
            if (sty.stroke) scene.strokes.push({ pts: inside, color: sty.stroke, width: sty.width, dash: sty.dash });
            continue;
        }
        if (st.cmd === 'path') {
            const pts = parsePoints(st.body);
            if (pts.length < 2) { ctx.bad('\\path không có hai điểm nối nhau'); continue; }
            if (o.get('name path')) named.set(stripBraces(o.get('name path')), pts);
            const sty = lineStyle(o, st.cmd, null, 'path');
            if (sty.stroke) scene.strokes.push({ pts: pts.map(p => ({ x: X(p.x), y: Y(p.y) })), color: sty.stroke, width: sty.width, dash: sty.dash });
            continue;
        }
        if (st.cmd === 'node') {
            if (!placeNode(st, scene, (x, y) => ({ x: X(x), y: Y(y) }), o)) { ctx.bad('\\node trong axis thiếu at (axis cs:x,y) hoặc chữ'); continue; }
            continue;
        }
        ctx.bad('lệnh trong axis chưa nằm trong tập hỗ trợ: \\' + st.cmd);
    }
    return ctx.box;
}

function fmtTick(v) {
    return Number.isInteger(v) ? String(v) : String(parseFloat(v.toFixed(4)));
}

// \node[...,font=\small,above right] at (axis cs:1.15,0.85) {$y=x^2$};
function placeNode(st, scene, toPx_, o) {
    const at = /\bat\s*\(([^()]*)\)/.exec(st.src);
    const txt = /\{([\s\S]*)\}\s*$/.exec(st.src);
    if (!at || !txt) return false;
    const c = parseCoord(at[1]);
    if (!c) return false;
    const side = /\b(above right|below right|above left|below left|right|left|above|below)\b/.exec(st.opts);
    const p = toPx_(c.x, c.y);
    const dx = side && /right/.test(side[1]) ? 7 : side && /left/.test(side[1]) ? -7 : 0;
    let dy = side && /above/.test(side[1]) ? -6 : side && /below/.test(side[1]) ? 15 : 4;
    if (!side) dy = -8;
    const size = /\\LARGE/.test(st.opts) ? 16 : /\\huge/.test(st.opts) ? 18 : /\\large/.test(st.opts) ? 14
        : /\\small/.test(st.opts) ? 11 : /\\footnotesize/.test(st.opts) ? 10.5 : /\\scriptsize/.test(st.opts) ? 9.5 : 12;
    // \node[blue,font=\small]: màu viết trần, không có key "color="
    const color = styleColor(o.get('color')) || colorOf(firstColorToken(o) || '') || '#000000';
    scene.texts.push({
        x: p.x + dx, y: p.y + dy, runs: labelRuns(txt[1]), size,
        anchor: dx > 0 ? 'start' : dx < 0 ? 'end' : 'middle',
        color: color === 'none' ? '#000000' : color
    });
    return true;
}

// ============================ TIKZ THUẦN (tự dựng hệ trục bằng \draw) ============================

// Đi lần lượt trên thân câu lệnh: (điểm) -- (điểm) plot[..] node[..]{..} circle (r) rectangle (p) cycle
function parsePlainPath(body, ctx) {
    const pts = [];
    const dots = [];
    const nodes = [];
    let rect = null;
    let closed = false;
    let last = null;
    let i = 0;
    const s = body;
    const push = p => { pts.push(p); last = p; };

    while (i < s.length) {
        const ch = s[i];
        if (/\s/.test(ch) || ch === '-') {
            if (ch === '-' && s[i + 1] === '-') i++;
            i++; continue;
        }
        if (ch === '(') {
            const close = s.indexOf(')', i);
            if (close < 0) { ctx.bad('toạ độ thiếu ngoặc đóng'); return null; }
            const inner = s.slice(i + 1, close);
            const c = parseCoord(inner);
            if (c) push(c);
            else { ctx.bad('không đọc được toạ độ: (' + inner + ')'); return null; }
            i = close + 1; continue;
        }
        if (s.startsWith('plot', i)) {
            const optM = /^\[\s*([^\]]*)\]/.exec(s.slice(i + 4));
            if (!optM) { ctx.bad('plot thiếu [...]'); return null; }
            const after = i + 4 + optM[0].length;
            const pm = /^\(\s*\{([^{}]*)\}\s*,\s*\{([^{}]*)\}\s*\)|^\(\s*([^,()]+)\s*,\s*([^()]+)\s*\)/.exec(s.slice(after));
            if (!pm) { ctx.bad('plot(...) không ở dạng ({x},{y})'); return null; }
            const po = parseOptions(optM[1]);
            const dm = po.get('domain');
            const domain = dm ? dm.split(':').map(v => parseFloat(v)) : DEFAULT_DOMAIN;
            if (domain.some(Number.isNaN) || domain.length !== 2) { ctx.bad('domain lạ: ' + dm); return null; }
            const samples = po.has('samples') ? parseInt(po.get('samples'), 10) : DEFAULT_SAMPLES;
            const got = sampleParametric(pm[1] !== undefined ? pm[1] : pm[3], pm[2] !== undefined ? pm[2] : pm[4], domain, samples, ctx);
            if (!got) return null;
            got.forEach(push);
            i = after + pm[0].length; continue;
        }
        if (s.startsWith('node', i)) {
            const optM = /^\[\s*([^\]]*)\]/.exec(s.slice(i + 4));
            const after = i + 4 + (optM ? optM[0].length : 0);
            const txtM = /^\{([\s\S]*)\}/.exec(s.slice(after));
            if (!txtM) { ctx.bad('node thiếu {chữ}'); return null; }
            nodes.push({ p: last || { x: 0, y: 0 }, text: txtM[1].replace(/^\{|\}$/g, ''), side: /\b(above right|below right|above left|below left|right|left|above|below)\b/.exec(optM ? optM[1] : '')?.[1] || 'above' });
            i = after + txtM[0].length; continue;
        }
        if (s.startsWith('circle', i)) {
            const cm = /^\s*\(\s*([\d.]+)\s*(pt|cm|mm)?\s*\)/.exec(s.slice(i + 6));
            if (!cm || !last) { ctx.bad('circle thiếu bán kính hoặc tâm'); return null; }
            dots.push({ p: last, rPt: parseFloat(cm[1]), unit: cm[2] || 'pt' });
            i += 6 + cm[0].length; continue;
        }
        if (s.startsWith('rectangle', i)) {
            const rm = /\(([^()]*)\)/.exec(s.slice(i + 9));
            const c = rm && parseCoord(rm[1]);
            if (!c || !last) { ctx.bad('rectangle thiếu góc'); return null; }
            rect = { a: last, b: c };
            i += 9 + rm[0].length; continue;
        }
        if (/^cycle/.test(s.slice(i))) { closed = true; i += 5; continue; }
        const skip = /^(to|arc|let|in|grid|sin|cos|coordinate)\b/.exec(s.slice(i));
        if (skip) { ctx.bad('đường chứa "' + skip[1] + '" ngoài tập hỗ trợ'); return null; }
        const word = /^[a-zA-Z]+/.exec(s.slice(i));
        if (!word) { ctx.bad('không đọc được thân lệnh: ' + s.slice(i, i + 20)); return null; }
        ctx.bad('không đọc được "' + word[0] + '" trong đường vẽ');
        return null;
    }
    if (!pts.length && !dots.length && !rect) { ctx.bad('đường vẽ không có điểm nào'); return null; }
    return { pts, dots, nodes, rect, closed };
}

function renderPlainTikz(body, scene, ctx, map, kpx) {
    for (const st of scanStatements(body)) {
        const o = parseOptions(st.opts);
        if (st.cmd === 'node') {
            if (!placeNode(st, scene, (x, y) => ({ x: map.x(x), y: map.y(y) }), o)) ctx.bad('\\node thiếu at/toạ độ hoặc chữ');
            continue;
        }
        if (st.cmd !== 'draw' && st.cmd !== 'fill' && st.cmd !== 'filldraw') { ctx.bad('lệnh chưa nằm trong tập hỗ trợ: \\' + st.cmd); continue; }
        const spec = parsePlainPath(st.body, ctx);
        if (!spec) continue;
        const sty = lineStyle(o, st.cmd, null, st.cmd === 'filldraw' ? 'closed' : undefined);
        const toPts = list => list.map(p => ({ x: map.x(p.x), y: map.y(p.y) }));
        for (const d of spec.dots) {
            const r = d.unit === 'cm' ? d.rPt * PX_PER_CM * (kpx / PX_PER_CM) : d.unit === 'mm' ? d.rPt * PX_PER_CM / 10 * (kpx / PX_PER_CM) : d.rPt * (kpx / PX_PER_CM) * 1.33;
            scene.dots.push({ x: map.x(d.p.x), y: map.y(d.p.y), r: Math.max(2, r), color: sty.fill || sty.stroke || '#000000' });
        }
        if (spec.rect) {
            const a = spec.rect.a; const b = spec.rect.b;
            const quad = [{ x: map.x(a.x), y: map.y(a.y) }, { x: map.x(b.x), y: map.y(a.y) }, { x: map.x(b.x), y: map.y(b.y) }, { x: map.x(a.x), y: map.y(b.y) }];
            if (sty.fill) scene.fills.push({ pts: quad, color: sty.fill });
            if (sty.stroke) scene.strokes.push({ pts: quad.concat([quad[0]]), color: sty.stroke, width: sty.width, dash: sty.dash });
        }
        if (spec.pts.length >= 2) {
            const drawn = toPts(spec.pts);
            if (sty.fill) scene.fills.push({ pts: drawn, color: sty.fill });
            if (sty.stroke) scene.strokes.push({ pts: drawn, color: sty.stroke, width: sty.width, dash: sty.dash, arrow: sty.arrow, close: spec.closed && !sty.fill });
        } else if (spec.pts.length === 1 && sty.stroke && !spec.dots.length && !spec.rect) {
            ctx.bad('đường chỉ có một điểm, không vẽ được');
        }
        for (const n of spec.nodes) {
            const p = { x: map.x(n.p.x), y: map.y(n.p.y) };
            const dx = n.side.includes('right') ? 8 : n.side.includes('left') ? -8 : 0;
            const dy = n.side.includes('above') ? -6 : n.side.includes('below') ? 15 : 4;
            scene.texts.push({
                x: p.x + dx, y: p.y + dy, runs: labelRuns(n.text), size: 12,
                anchor: dx > 0 ? 'start' : dx < 0 ? 'end' : 'middle', color: sty.stroke || '#000000'
            });
        }
    }
}

// ============================ ĐIỂM VÀO ============================

function extractEnvironment(src, name) {
    const b = '\\begin{' + name + '}';
    const e = '\\end{' + name + '}';
    const start = src.indexOf(b);
    if (start < 0) return null;
    let depth = 0; let i = start;
    while (i < src.length) {
        if (src.startsWith(b, i)) { depth++; i += b.length; continue; }
        if (src.startsWith(e, i)) { depth--; i += e.length; if (depth === 0) return { inner: src.slice(start + b.length, i - e.length), after: src.slice(i) }; continue; }
        i++;
    }
    return null;
}

function allCoords(s) {
    const out = [];
    const re = /\(\s*([+-]?[\d.]+)\s*,\s*([+-]?[\d.]+)\s*\)/g;
    let m;
    while ((m = re.exec(s))) out.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
    return out;
}

// Trả về { svg, unsupported, notes, size }. svg=null khi không đủ tự tin — người gọi nên
// fallback AI hoặc để nguyên khối hs-tikz trong bản nháp.
function renderTikz(code) {
    const unsupported = [];
    const notes = [];
    const ctx = { bad: why => unsupported.push(why), note: why => notes.push(why), box: null };
    const src = String(code || '').trim();
    const pic = extractEnvironment(src, 'tikzpicture');
    if (!pic) { ctx.bad('không phải một môi trường tikzpicture trọn vẹn'); return { svg: null, unsupported, notes }; }
    if (/[^\s]/.test((pic.after || '').replace(/\\end\{tikzpicture\}/g, ''))) { ctx.bad('có chữ nằm sau \\end{tikzpicture}'); return { svg: null, unsupported, notes }; }

    let head = pic.inner;
    const optM = /^\s*\[([\s\S]*?)\]/.exec(head);
    const opts = parseOptions(optM ? optM[1] : '');
    if (optM) head = head.slice(optM[0].length);
    for (const key of opts.keys()) {
        if (!/^(scale|xshift|yshift|shift|rotate|every node|baseline)$/.test(String(key))) ctx.bad('tham số của \\begin{tikzpicture} chưa hỗ trợ: ' + key);
    }
    if (unsupported.length) return { svg: null, unsupported, notes };
    const scale = opts.has('scale') ? (parseFloat(opts.get('scale')) || 1) : 1;

    const axisAt = head.indexOf('\\begin{axis}');
    const scene = newScene();
    let box;
    if (axisAt >= 0) {
        const env = extractEnvironment(head, 'axis');
        if (!env) { ctx.bad('môi trường axis không đóng'); return { svg: null, unsupported, notes }; }
        const axisOptM = /^\s*\[([\s\S]*?)\]/.exec(env.inner);
        if (/[^\s]/.test(head.slice(0, axisAt)) || /[^\s]/.test(env.after)) { ctx.bad('có lệnh nằm ngoài môi trường axis'); return { svg: null, unsupported, notes }; }
        box = renderAxis(axisOptM ? axisOptM[1] : '', env.inner.slice(axisOptM ? axisOptM[0].length : 0), scene, ctx);
        if (!box) return { svg: null, unsupported, notes };
    } else {
        const pts = allCoords(head);
        // tính thêm các điểm sinh ra từ plot tham số để khung包住 hết hình
        for (const st of scanStatements(head)) {
            if (!/plot\s*\[/.test(st.body)) continue;
            const dm = /domain\s*=\s*\{?\s*([-\d.]+)\s*:\s*([-\d.]+)/.exec(st.opts || st.body);
            const body2 = st.body;
            const pm = /\(\s*\{([^{}]*)\}\s*,\s*\{([^{}]*)\}\s*\)/.exec(body2);
            if (!dm || !pm) continue;
            const got = sampleParametric(pm[1], pm[2], [parseFloat(dm[1]), parseFloat(dm[2])], parseInt((/samples\s*=\s*(\d+)/.exec(st.opts || st.body) || [])[1] || DEFAULT_SAMPLES, 10), { bad() { }, note() { } });
            if (got) pts.push(...got);
        }
        if (pts.length < 2) { ctx.bad('không đủ toạ độ để xác định khung hình'); return { svg: null, unsupported, notes }; }
        const xs = pts.map(p => p.x); const ys = pts.map(p => p.y);
        const xmin = Math.min(...xs); const xmax = Math.max(...xs);
        const ymin = Math.min(...ys); const ymax = Math.max(...ys);
        const k = PX_PER_CM * scale;
        const padL = 18, padT = 14;
        const textRight = /node\s*\[\s*right\s*\]|node\s*\[[^\]]*right/.test(head) ? 40 : 12;
        const textAbove = /node\s*\[\s*above/.test(head) ? 14 : 0;
        const textBelow = /node\s*\[\s*below/.test(head) ? 20 : 0;
        box = { w: (xmax - xmin) * k + padL + textRight, h: (ymax - ymin) * k + padT + textAbove + textBelow };
        const map = { x: x => padL + (x - xmin) * k, y: y => padT + textAbove + (ymax - y) * k };
        renderPlainTikz(head, scene, ctx, map, k);
    }

    const empty = !scene.fills.length && !scene.strokes.length && !scene.dots.length && !scene.texts.length;
    if (unsupported.length || empty) return { svg: null, unsupported, notes };
    return { svg: emitScene(scene, box.w, box.h), unsupported, notes, size: box };
}

module.exports = { renderTikz, parseExpr, normalizeExpr, labelRuns, texToText, colorOf, scanStatements, PX_PER_CM };
