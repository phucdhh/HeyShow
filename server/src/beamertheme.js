'use strict';
// Giải theme beamer (\usetheme{Madrid}, \setbeamercolor{...}, \definecolor{...}) thành CSS để
// HeyShow dựng lại màu sắc, block, bullet và thanh header/footer trong <section-master>.
// Beamer mô tả tất cả những thứ đó bằng màu xcolor, nên phần việc ở đây chủ yếu là giải được
// biểu thức trộn màu "structure.fg!75!black" theo đúng nghĩa của xcolor.

// ============================ MÀU ============================

const NAMED = {
    black: [0, 0, 0], darkgray: [64, 64, 64], gray: [128, 128, 128], lightgray: [191, 191, 191], white: [255, 255, 255],
    red: [255, 0, 0], green: [0, 255, 0], blue: [0, 0, 255], cyan: [0, 255, 255], magenta: [255, 0, 255], yellow: [255, 255, 0],
    brown: [191, 128, 64], lime: [191, 255, 0], olive: [128, 128, 0], orange: [255, 128, 0], pink: [255, 191, 191],
    purple: [191, 0, 64], teal: [0, 128, 128], violet: [128, 0, 128]
};

function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function mix(a, b, p) { return [a[0] * p + b[0] * (1 - p), a[1] * p + b[1] * (1 - p), a[2] * p + b[2] * (1 - p)]; }
function hex(rgb) { return '#' + rgb.map(clamp255).map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(); }

function fromModel(model, spec) {
    const n = String(spec).split(',').map(x => parseFloat(String(x).trim()));
    if (n.some(x => Number.isNaN(x))) return null;
    if (model === 'rgb') return n.slice(0, 3).map(v => clamp255(v * 255));
    if (model === 'RGB') return n.slice(0, 3).map(clamp255);
    if (model === 'gray') return [n[0] * 255, n[0] * 255, n[0] * 255];
    if (model === 'HTML') {
        const h = String(spec).trim().replace(/^#/, '');
        if (!/^[0-9a-fA-F]+$/.test(h)) return null;
        const s = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6).padEnd(6, '0');
        return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16));
    }
    if (model === 'cmy') {
        const [c, m, y] = n;
        return [(1 - c) * (1 - y) * 255, (1 - m) * (1 - y) * 255, (1 - y) * 255];
    }
    if (model === 'cmyk') {
        const [c, m, y, k] = n;
        return [(1 - c) * (1 - k) * 255, (1 - m) * (1 - k) * 255, (1 - y) * (1 - k) * 255];
    }
    if (model === 'hsb' || model === 'Hsb') {
        const [h, s, v] = n;
        const f = i => { const k = (i + h * 6) % 6; return v * (1 - s * Math.max(0, Math.min(k, 4 - k, 1))) * 255; };
        return [f(5), f(3), f(1)];
    }
    return null;
}

// "A, B, C" → ["A","B","C"], cắt ở dấu phẩy ngoài cùng cặp ngoặc (danh sách theme, parent=)
function splitList(str) {
    const out = []; let depth = 0, cur = '';
    for (const c of String(str)) {
        if (c === '{') depth++;
        else if (c === '}') depth--;
        if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
        cur += c;
    }
    out.push(cur);
    return out.map(p => p.trim()).filter(p => p !== '');
}

// "A!30!B!40!C" → [A, 30, B, 40, C], cắt ở '!' ngoài cùng cặp ngoặc
function splitMix(str) {
    const parts = []; let depth = 0, cur = '';
    for (const c of String(str)) {
        if (c === '{') depth++;
        else if (c === '}') depth--;
        if (c === '!' && depth === 0) { parts.push(cur); cur = ''; continue; }
        cur += c;
    }
    parts.push(cur);
    return parts.map(p => p.trim()).filter(p => p !== '');
}

// ============================ BẢNG THEME ============================

// Chỉ giữ các lệnh \setbeamercolor ảnh hưởng tới phần HeyShow tái hiện, nguyên văn từ beamer.
const COLOR_THEMES = {
    default: String.raw`
\definecolor{beamer@blendedblue}{rgb}{0.2,0.2,0.7}
\setbeamercolor{normal text}{fg=black,bg=white}
\setbeamercolor{alerted text}{fg=red}
\setbeamercolor{example text}{fg=green!50!black}
\setbeamercolor{structure}{fg=beamer@blendedblue}
\setbeamercolor{palette primary}{use=structure,fg=structure.fg}
\setbeamercolor{palette secondary}{use=structure,fg=structure.fg!75!black}
\setbeamercolor{palette tertiary}{use=structure,fg=structure.fg!50!black}
\setbeamercolor{palette quaternary}{fg=black}
\setbeamercolor{titlelike}{parent=structure}
\setbeamercolor{title}{parent=titlelike}
\setbeamercolor{subtitle}{parent=title}
\setbeamercolor{frametitle}{parent=titlelike}
\setbeamercolor{framesubtitle}{parent=frametitle}
\setbeamercolor{local structure}{parent=structure}
\setbeamercolor{item}{parent=local structure}
\setbeamercolor{item projected}{parent=item,use=item,fg=white,bg=item.fg}
\setbeamercolor{block title}{parent=structure}
\setbeamercolor{block title alerted}{parent=alerted text}
\setbeamercolor{block title example}{parent=example text}
\setbeamercolor{block body}{}
\setbeamercolor{block body alerted}{}
\setbeamercolor{block body example}{}
\setbeamercolor{author in head/foot}{parent=palette primary}
\setbeamercolor{title in head/foot}{parent=palette quaternary}
\setbeamercolor{institute in head/foot}{parent=palette tertiary}
\setbeamercolor{date in head/foot}{parent=palette secondary}
\setbeamercolor{section in head/foot}{parent=palette tertiary}
\setbeamercolor{subsection in head/foot}{parent=palette secondary}
\setbeamercolor{section in toc}{parent=structure}
\setbeamercolor{page number in head/foot}{}`,

    whale: String.raw`
\setbeamercolor*{palette primary}{use=structure,fg=white,bg=structure.fg}
\setbeamercolor*{palette secondary}{use=structure,fg=white,bg=structure.fg!75!black}
\setbeamercolor*{palette tertiary}{use=structure,fg=white,bg=structure.fg!50!black}
\setbeamercolor*{palette quaternary}{fg=white,bg=black}
\setbeamercolor*{sidebar}{use=structure,bg=structure.fg}
\setbeamercolor*{palette sidebar primary}{use=structure,fg=structure.fg!10}
\setbeamercolor*{palette sidebar secondary}{fg=white}
\setbeamercolor*{palette sidebar tertiary}{use=structure,fg=structure.fg!50}
\setbeamercolor*{palette sidebar quaternary}{fg=white}
\setbeamercolor*{titlelike}{parent=palette primary}`,

    seahorse: String.raw`
\setbeamercolor{palette primary}{use=structure,fg=black,bg=structure.fg!20!white}
\setbeamercolor{palette secondary}{use=structure,fg=black,bg=structure.fg!25!white}
\setbeamercolor{palette tertiary}{use=structure,fg=black,bg=structure.fg!30!white}
\setbeamercolor{palette quaternary}{use=structure,fg=black,bg=structure.fg!35!white}
\setbeamercolor{sidebar}{use=structure,bg=structure.fg!20!white}
\setbeamercolor*{titlelike}{parent=palette primary}`,

    dolphin: String.raw`
\setbeamercolor*{palette primary}{use=structure,fg=black,bg=structure.fg!40!white}
\setbeamercolor*{palette secondary}{use=structure,fg=white,bg=structure.fg!60!white}
\setbeamercolor*{palette tertiary}{use=structure,fg=white,bg=structure.fg!90!white}
\setbeamercolor*{palette quaternary}{fg=white,bg=black}
\setbeamercolor*{sidebar}{use=structure,bg=structure.fg}
\setbeamercolor*{titlelike}{use=structure,fg=structure.fg}`,

    orchid: String.raw`
\setbeamercolor{block title}{use=structure,fg=white,bg=structure.fg!75!black}
\setbeamercolor{block title alerted}{use=alerted text,fg=white,bg=alerted text.fg!75!black}
\setbeamercolor{block title example}{use=example text,fg=white,bg=example text.fg!75!black}
\setbeamercolor{block body}{parent=normal text,use=block title,bg=block title.bg!10!bg}
\setbeamercolor{block body alerted}{parent=normal text,use=block title alerted,bg=block title alerted.bg!10!bg}
\setbeamercolor{block body example}{parent=normal text,use=block title example,bg=block title example.bg!10!bg}`,

    rose: String.raw`
\setbeamercolor{block title}{use=structure,fg=structure.fg,bg=structure.fg!20!bg}
\setbeamercolor{block title alerted}{use=alerted text,fg=alerted text.fg,bg=alerted text.fg!20!bg}
\setbeamercolor{block title example}{use=example text,fg=example text.fg,bg=example text.fg!20!bg}
\setbeamercolor{block body}{parent=normal text,use=block title,bg=block title.bg!50!bg}
\setbeamercolor{block body alerted}{parent=normal text,use=block title alerted,bg=block title alerted.bg!50!bg}
\setbeamercolor{block body example}{parent=normal text,use=block title example,bg=block title example.bg!50!bg}`,

    crane: String.raw`
\definecolor{craneorange}{RGB}{252,187,6}
\definecolor{craneblue}{RGB}{4,6,76}
\setbeamercolor{structure}{fg=craneblue}
\setbeamercolor{palette primary}{fg=craneblue,bg=craneorange!70}
\setbeamercolor{palette secondary}{fg=craneblue,bg=craneorange!80}
\setbeamercolor{palette tertiary}{fg=craneblue,bg=craneorange!90}
\setbeamercolor{palette quaternary}{fg=craneblue,bg=craneorange}
\setbeamercolor{titlelike}{parent=palette quaternary}
\setbeamercolor{block title}{fg=craneblue,bg=craneorange}
\setbeamercolor{block title alerted}{use=alerted text,fg=craneblue,bg=alerted text.fg!75!bg}
\setbeamercolor{block title example}{use=example text,fg=craneblue,bg=example text.fg!75!bg}
\setbeamercolor{block body}{parent=normal text,use=block title,bg=block title.bg!25!bg}
\setbeamercolor{block body alerted}{parent=normal text,use=block title alerted,bg=block title alerted.bg!25!bg}
\setbeamercolor{block body example}{parent=normal text,use=block title example,bg=block title example.bg!25!bg}`,

    beaver: String.raw`
\definecolor{darkred}{rgb}{0.8,0,0}
\setbeamercolor{section in toc}{fg=black,bg=white}
\setbeamercolor{alerted text}{fg=darkred!80!gray}
\setbeamercolor*{palette primary}{fg=darkred!60!black,bg=gray!30!white}
\setbeamercolor*{palette secondary}{fg=darkred!70!black,bg=gray!15!white}
\setbeamercolor*{palette tertiary}{bg=darkred!80!black,fg=gray!10!white}
\setbeamercolor*{palette quaternary}{fg=darkred,bg=gray!5!white}
\setbeamercolor{titlelike}{parent=palette primary,fg=darkred}
\setbeamercolor{frametitle}{bg=gray!10!white}
\setbeamercolor{frametitle right}{bg=gray!60!white}`,

    lily: String.raw`
\setbeamercolor*{block body}{}
\setbeamercolor*{block body alerted}{}
\setbeamercolor*{block body example}{}
\setbeamercolor*{block title}{parent=structure}
\setbeamercolor*{block title alerted}{parent=alerted text}
\setbeamercolor*{block title example}{parent=example text}
\setbeamercolor*{titlelike}{parent=structure}`,

    dove: String.raw`
\setbeamercolor*{normal text}{fg=black,bg=white}
\setbeamercolor*{alerted text}{fg=black}
\setbeamercolor*{example text}{fg=black}
\setbeamercolor*{structure}{fg=black}
\setbeamercolor{palette primary}{fg=black,bg=white}
\setbeamercolor{palette secondary}{fg=black,bg=white}
\setbeamercolor{palette tertiary}{fg=black,bg=white}
\setbeamercolor{palette quaternary}{fg=black,bg=white}
\setbeamercolor{item projected}{fg=black,bg=black!20}
\setbeamercolor*{block title}{parent=structure}
\setbeamercolor*{block title alerted}{parent=alerted text}
\setbeamercolor*{block title example}{parent=example text}
\setbeamercolor*{block body}{}
\setbeamercolor*{block body alerted}{}
\setbeamercolor*{block body example}{}
\setbeamercolor*{titlelike}{parent=structure}`,

    albatross: String.raw`
\setbeamercolor*{normal text}{fg=yellow!50!white,bg=blue!50!black}
\setbeamercolor*{example text}{fg=green!65!black}
\setbeamercolor*{structure}{fg=blue!25!white}
\setbeamercolor{palette primary}{use={structure,normal text},fg=structure.fg,bg=normal text.bg!75!black}
\setbeamercolor{palette secondary}{use={structure,normal text},fg=structure.fg,bg=normal text.bg!60!black}
\setbeamercolor{palette tertiary}{use={structure,normal text},fg=structure.fg,bg=normal text.bg!45!black}
\setbeamercolor{palette quaternary}{use={structure,normal text},fg=structure.fg,bg=normal text.bg!30!black}
\setbeamercolor*{block body}{bg=normal text.bg!90!black}
\setbeamercolor*{block body alerted}{bg=normal text.bg!90!black}
\setbeamercolor*{block body example}{bg=normal text.bg!90!black}
\setbeamercolor*{block title}{parent=structure,bg=normal text.bg!75!black}
\setbeamercolor*{block title alerted}{use={normal text,alerted text},fg=alerted text.fg!75!normal text.fg,bg=normal text.bg!75!black}
\setbeamercolor*{block title example}{use={normal text,example text},fg=example text.fg!75!normal text.fg,bg=normal text.bg!75!black}
\setbeamercolor{item projected}{fg=black}`,

    beetle: String.raw`
\setbeamercolor{normal text}{fg=black,bg=black!40}
\setbeamercolor{structure}{fg=white}
\setbeamercolor{alerted text}{fg=red!85!black}
\setbeamercolor{item projected}{use=item,fg=black,bg=item.fg!75}
\definecolor{beetle@other}{RGB}{64,80,127}
\setbeamercolor*{palette primary}{fg=white,bg=beetle@other}
\setbeamercolor*{palette secondary}{parent=palette primary,use=palette primary,bg=palette primary.bg!95!black}
\setbeamercolor*{palette tertiary}{parent=palette primary,use=palette primary,bg=palette primary.bg!90!black}
\setbeamercolor*{palette quaternary}{parent=palette primary,use=palette primary,bg=palette primary.bg!85!black}
\setbeamercolor{framesubtitle}{fg=black}
\setbeamercolor*{subtitle}{fg=black}
\setbeamercolor*{block title}{parent=structure}
\setbeamercolor*{block title alerted}{parent=alerted text}
\setbeamercolor*{block title example}{parent=example text}
\setbeamercolor*{block body}{}
\setbeamercolor*{block body alerted}{}
\setbeamercolor*{block body example}{}
\setbeamercolor*{titlelike}{parent=structure}`,

    spruce: String.raw`
\definecolor{MSUgreen}{RGB}{0,102,51}
\setbeamercolor{alerted text}{fg=MSUgreen!80!white}
\setbeamercolor*{palette primary}{fg=MSUgreen!60!black,bg=white!85!MSUgreen}
\setbeamercolor*{sidebar}{fg=MSUgreen,bg=MSUgreen!75!white}
\setbeamercolor*{titlelike}{parent=palette primary}
\setbeamercolor{frametitle}{bg=white!90!MSUgreen}
\setbeamercolor{frametitle right}{bg=white!60!MSUgreen}`,

    wolverine: String.raw`
\definecolor{darkblue}{rgb}{0,0,0.8}
\setbeamercolor{alerted text}{fg=darkblue!80!yellow}
\setbeamercolor*{palette primary}{fg=darkblue!60!black,bg=yellow!85!orange}
\setbeamercolor*{sidebar}{fg=darkblue,bg=orange!75!white}
\setbeamercolor*{titlelike}{parent=palette primary}
\setbeamercolor{frametitle}{bg=yellow!90!orange}
\setbeamercolor{frametitle right}{bg=yellow!60!orange}`,

    seagull: String.raw`
\setbeamercolor{normal text}{fg=black,bg=white}
\setbeamercolor{structure}{fg=gray}
\setbeamercolor{block title}{fg=black,bg=gray!20}
\setbeamercolor{titlelike}{parent=structure}`,

    monarca: String.raw`
\definecolor{craneorange}{RGB}{252,187,6}
\definecolor{craneblue}{RGB}{4,6,76}
\setbeamercolor{normal text}{fg=black,bg=craneorange}
\setbeamercolor{structure}{fg=black}
\setbeamercolor{palette primary}{fg=craneorange!75,bg=black}
\setbeamercolor{palette secondary}{fg=black,bg=craneorange}
\setbeamercolor{palette quaternary}{fg=black,bg=white}
\setbeamercolor{titlelike}{parent=palette quaternary}
\setbeamercolor{block title}{fg=black,bg=white}
\setbeamercolor{sidebar}{bg=craneorange!90}`,

    sidebartab: String.raw`
\setbeamercolor{section in sidebar}{use=sidebar,fg=sidebar.fg}
\setbeamercolor{subsection in sidebar}{use=sidebar,fg=sidebar.fg}`,

    fly: String.raw`
\setbeamercolor{normal text}{fg=black,bg=black!40}
\setbeamercolor{structure}{fg=white}
\setbeamercolor{alerted text}{fg=red!85!black}
\setbeamercolor*{sidebar}{bg=black!50}
\setbeamercolor*{palette primary}{use=structure,fg=structure.fg}
\setbeamercolor*{framesubtitle}{fg=black}
\setbeamercolor*{subtitle}{fg=black}
\setbeamercolor*{block title}{parent=structure}`,

    // theme này chỉ đặt structure.fg từ tuỳ chọn gray/RGB/named..., không đụng tới nền.
    structure: String.raw`
\setbeamercolor{structure}{fg=black}`
};

// \usetheme{Name} = ba theme thành phần, đúng như beamer khai báo trong beamertheme*.sty
const THEME_RECIPES = {
    default: [],
    madrid: [['color', 'whale'], ['color', 'orchid'], ['inner', 'rounded', 'shadow'], ['outer', 'infolines']],
    berlin: [['outer', 'miniframes', 'footline=authorinstitutetitle'], ['color', 'whale'], ['color', 'orchid'], ['inner', 'rectangles']],
    warsaw: [['inner', 'rounded', 'shadow=true'], ['outer', 'shadow'], ['color', 'orchid'], ['color', 'whale']],
    copenhagen: [['outer', 'split'], ['inner', 'rounded'], ['color', 'whale'], ['color', 'orchid']],
    luebeck: [['outer', 'split'], ['inner', 'rectangles'], ['color', 'whale'], ['color', 'orchid']],
    malmoe: [['outer', 'split'], ['color', 'whale']],
    pittsburgh: [['inner', 'circles']],
    hannover: [['outer', 'sidebar', 'height=0pt,left'], ['color', 'seahorse'], ['inner', 'circles']],
    marburg: [['color', 'whale'], ['outer', 'sidebar', 'height=0pt']],
    berkeley: [['outer', 'sidebar'], ['inner', 'rectangles'], ['color', 'whale'], ['color', 'orchid']],
    paloalto: [['outer', 'sidebar'], ['inner', 'rounded', 'shadow=true'], ['color', 'orchid'], ['color', 'whale']],
    rochester: [['outer', 'sidebar', 'width=0pt'], ['inner', 'rectangles'], ['color', 'whale'], ['color', 'orchid']],
    singapore: [['outer', 'miniframes', 'subsection=false']],
    dresden: [['outer', 'miniframes', 'footline=authorinstitutetitle'], ['color', 'whale']],
    ilmenau: [['outer', 'miniframes', 'footline=authorinstitutetitle'], ['color', 'whale'], ['color', 'orchid'], ['inner', 'rounded']],
    szeged: [['outer', 'miniframes', 'footline=institutetitle']],
    frankfurt: [['outer', 'smoothbars', 'subsection=false'], ['inner', 'rounded', 'shadow=true'], ['color', 'orchid'], ['color', 'whale']],
    darmstadt: [['outer', 'smoothbars'], ['inner', 'rounded', 'shadow=true'], ['color', 'orchid'], ['color', 'whale']],
    boadilla: [['color', 'rose'], ['inner', 'rounded', 'shadow'], ['color', 'dolphin'], ['outer', 'infolines']],
    annarbor: [['inner', 'rounded', 'shadow=true'], ['outer', 'infolines'], ['color', 'wolverine']],
    cambridgeus: [['inner', 'rounded', 'shadow=true'], ['outer', 'infolines'], ['color', 'beaver']],
    eastlansing: [['inner', 'rounded'], ['outer', 'infolines'], ['color', 'spruce']],
    montpellier: [['outer', 'tree']],
    antibes: [['outer', 'tree'], ['color', 'whale'], ['color', 'orchid'], ['inner', 'rectangles']],
    bergen: [['color', 'orchid'], ['inner', 'rectangles'], ['inner', 'inmargin']],
    juanlespins: [['outer', 'smoothtree'], ['color', 'whale'], ['color', 'orchid'], ['inner', 'rounded', 'shadow=true']],
    shadow: [['inner', 'rounded', 'shadow=true'], ['color', 'orchid'], ['color', 'whale'], ['outer', 'shadow']],
    split: [['color', 'whale'], ['outer', 'split']],
    sidebar: [['outer', 'sidebar', 'right,height=0pt']],
    bars: [['outer', 'miniframes', 'footline=authorinstitutetitle'], ['color', 'whale']],
    boxes: [], classic: [], lined: [], plain: [], compatibility: [['outer', 'miniframes', 'subsection=false'], ['color', 'whale']]
};

// ============================ ĐỌC PREAMBLE ============================

function readBraced(s, i) {
    if (s[i] !== '{') return { body: '', end: i };
    let depth = 0, out = '';
    for (let j = i; j < s.length; j++) {
        const c = s[j];
        if (c === '{') { depth++; if (depth > 1) out += c; }
        else if (c === '}') { depth--; if (depth === 0) return { body: out, end: j + 1 }; out += c; }
        else if (depth > 0) out += c;
    }
    return { body: out, end: -1 };
}

function skipSpace(s, i) { let j = i; while (j < s.length && /\s/.test(s[j])) j++; return j; }

function parseKeyVals(str) {
    const out = []; let depth = 0, cur = '';
    for (const c of String(str)) {
        if (c === '{') depth++;
        else if (c === '}') depth--;
        if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
        cur += c;
    }
    out.push(cur);
    const kv = {};
    for (const part of out) {
        const i = part.indexOf('=');
        if (i < 0) { if (part.trim()) kv[part.trim()] = ''; }
        else kv[part.slice(0, i).trim()] = part.slice(i + 1).trim();
    }
    return kv;
}

function stripBraces(s) {
    let v = String(s).trim();
    while (/^\{[\s\S]*\}$/.test(v)) v = v.slice(1, -1).trim();
    return v;
}

function newEnv() {
    return {
        defines: new Map(),   // tên màu → đặc tả (chuỗi trộn hoặc kết quả rgb)
        el: new Map(),        // phần tử beamer → { fg, bg, parent }
        inner: 'default',
        outer: 'default',
        outerOpt: '',
        innerOpt: '',
        shadow: false,
        names: [],
        notes: [],
        unknownColors: [],
        unknownThemes: [],
        touched: false
    };
}

function setElement(env, name, keys) {
    const el = { fg: null, bg: null, parent: [] };
    for (const [k, v] of Object.entries(keys)) {
        if (k === 'fg' || k === 'bg') el[k] = stripBraces(v) || null;
        else if (k === 'parent') el.parent = splitList(v).map(stripBraces).filter(Boolean);
    }
    env.el.set(name, el);
}

function applyColorTheme(env, name) {
    const key = String(name).toLowerCase();
    const src = COLOR_THEMES[key];
    if (!src) { env.unknownColors.push(String(name)); return; }
    runDirectives(env, src);
}

function applySubTheme(env, kind, name, opt) {
    const key = String(name).toLowerCase();
    if (kind === 'color') { applyColorTheme(env, key); return; }
    if (kind === 'inner') env.inner = key;
    else env.outer = key;
    if (opt !== undefined) { if (kind === 'inner') env.innerOpt = opt; else env.outerOpt = opt; }
}

function applyTheme(env, name) {
    const key = String(name).toLowerCase();
    const recipe = THEME_RECIPES[key];
    if (!recipe) { env.unknownThemes.push(String(name)); return; }
    env.names.push(name);
    for (const [kind, sub, opt] of recipe) applySubTheme(env, kind, sub, opt || '');
}

const DIRECTIVE = /\\(usetheme|usecolortheme|useinnertheme|useoutertheme|usefonttheme|setbeamercolor|setbeamertemplate|definecolor|colorlet)\*?(\[[^\]]*\])?\s*\{/g;

function runDirectives(env, text) {
    const src = String(text);
    // Regex riêng cho mỗi lần chạy: \usetheme{Madrid} gọi ngược lại runDirectives để nạp
    // whale/orchid/infolines, mà /g chia sẻ lastIndex giữa hai lời gọi thì vòng lặp ngoài
    // quay về 0 và lặp vô hạn.
    const re = new RegExp(DIRECTIVE.source, 'g');
    let m;
    while ((m = re.exec(src))) {
        const open = src.indexOf('{', m.index + m[0].length - 1);
        if (open < 0) break;
        const first = readBraced(src, open);
        if (first.end < 0) break;
        const cmd = m[1];
        if (cmd === 'definecolor' || cmd === 'colorlet') {
            let i = skipSpace(src, first.end);
            let model = cmd === 'colorlet' ? 'mixed' : '';
            if (src[i] === '{') {
                const mm = readBraced(src, i);
                model = mm.body.trim();
                i = skipSpace(src, mm.end);
            }
            const spec = src[i] === '{' ? readBraced(src, i).body : '';
            if (model === 'mixed' || model === 'named' || model === '') {
                const v = stripBraces(spec);
                const asRgb = fromModel(model === 'named' ? 'named' : model, v);
                env.defines.set(first.body, asRgb || v);
            } else {
                const rgb = fromModel(model, spec);
                if (rgb) env.defines.set(first.body, rgb);
            }
            re.lastIndex = i + (src[i] === '{' ? readBraced(src, i).end - i : 0);
        } else if (cmd === 'setbeamercolor') {
            const i = skipSpace(src, first.end);
            const keys = src[i] === '{' ? readBraced(src, i).body : '';
            setElement(env, stripBraces(first.body), parseKeyVals(keys));
            re.lastIndex = i + (src[i] === '{' ? readBraced(src, i).end - i : 0);
        } else if (cmd === 'usetheme') {
            for (const t of splitList(first.body)) applyTheme(env, stripBraces(t));
        } else if (cmd === 'usecolortheme') {
            for (const t of splitList(first.body)) applyColorTheme(env, stripBraces(t));
        } else if (cmd === 'useinnertheme' || cmd === 'useoutertheme') {
            applySubTheme(env, cmd === 'useinnertheme' ? 'inner' : 'outer', first.body, (m[2] || '').replace(/^\[/, ''));
        } else if (cmd === 'usefonttheme') {
            env.notes.push(`font theme "${first.body}"`);
        } else if (cmd === 'setbeamertemplate') {
            env.notes.push(`template "${stripBraces(first.body)}"`);
        }
    }
}

// ============================ GIẢI MÀU ============================

function resolver(env) {
    const memo = new Map();

    function colorOf(token, ctx, seen) {
        const t = stripBraces(token);
        if (!t) return null;
        if (t === 'fg' || t === 'bg') return inherit(t, ctx.el, seen);
        const ref = /^([a-zA-Z0-9@_ ]+?)\.(fg|bg)$/.exec(t);
        if (ref) return resolve(ref[1].trim(), ref[2], seen);
        if (/^-?[\d.]+$/.test(t)) return null;
        const d = env.defines.get(t);
        if (d) return Array.isArray(d) ? d : evalMix(d, { el: ctx.el }, seen.add('#' + t));
        const named = NAMED[t.toLowerCase()];
        if (named) return named;
        return null;
    }

    function evalMix(str, ctx, seen) {
        const parts = splitMix(str);
        if (!parts.length) return null;
        let cur = colorOf(parts[0], ctx, seen);
        if (!cur) return null;
        for (let i = 1; i < parts.length; i++) {
            const pct = parseFloat(parts[i]);
            if (Number.isNaN(pct)) return cur;
            const other = i + 1 < parts.length ? colorOf(parts[i + 1], ctx, seen) : NAMED.white;
            if (!other) return cur;
            cur = mix(cur, other, Math.max(0, Math.min(100, pct)) / 100);
            i++;
        }
        return cur;
    }

    function resolve(name, prop, seen) {
        const key = name + '.' + prop;
        if (seen.has(key)) return null;
        if (memo.has(key)) return memo.get(key);
        const el = env.el.get(name);
        if (!el) return null;
        const next = new Set(seen); next.add(key);
        let out = null;
        if (el[prop]) out = evalMix(el[prop], { el: name }, next);
        if (!out) out = inherit(prop, name, next, true);
        memo.set(key, out);
        return out;
    }

    // Màu kế thừa qua parent — dùng cho "bg" trơ trong "bg=block title.bg!10!bg"
    function inherit(prop, name, seen, fromSelf) {
        const el = env.el.get(name);
        if (!el) return null;
        for (const p of el.parent) {
            const v = resolve(p, prop, seen);
            if (v) return v;
        }
        if (!fromSelf && prop === 'bg') {
            const page = env.el.get('normal text');
            return page && page.bg ? evalMix(page.bg, { el: 'normal text' }, seen) : NAMED.white;
        }
        return null;
    }

    return (name, prop) => resolve(name, prop, new Set());
}

// ============================ SINH CSS ============================

function buildCss(env) {
    const c = resolver(env);
    // Nền cả khung của beamer lấy từ "background canvas" — lệnh người dùng hay ghi để đổi
    // màu nền mà không đổi màu chữ; theme nào không đặt thì thừa hưởng nền của normal text.
    const pageBg = c('background canvas', 'bg') || c('normal text', 'bg') || NAMED.white;
    const pageFg = c('normal text', 'fg') || NAMED.black;
    // Gán vào đúng chỗ kho mẫu HeyShow vẫn tô nền: .reveal, !important để thắng theme black.
    // Chữ để transparent trên section cho khỏi chặn nền đó, còn màu chữ theo normal text
    // kẻo nền tối thì chữ cũng tối.
    return [
        `/* beamer: ${env.names.length ? env.names.join('+') : env.outer + '/' + env.inner} — HeyShow Import */`,
        `.reveal { background: ${hex(pageBg)} !important; }`,
        `.reveal .slides section { background: transparent; color: ${hex(pageFg)}; }`
    ].join('\n');
}

// ============================ API ============================

function analyzeBeamerTheme(source) {
    const text = String(source || '');
    const preamble = text.slice(0, text.indexOf('\\begin{document}') >= 0 ? text.indexOf('\\begin{document}') : text.length);
    const env = newEnv();
    // beamer luôn nạp beamercolorthemedefault trước rồi mới tới theme của người dùng:
    // structure/normal text/block... có mặt để các parent= trỏ vào đó.
    runDirectives(env, COLOR_THEMES.default);
    runDirectives(env, preamble);
    const notes = [];
    if (env.unknownColors.length) notes.push(`màu của theme "${env.unknownColors.join('", "')}" chưa có trong bảng, giữ palette mặc định`);
    if (env.unknownThemes.length) notes.push(`theme "${env.unknownThemes.join('", "')}" không nhận diện được, chỉ dùng màu beamer mặc định`);
    if (env.notes.length) notes.push(`bỏ qua thiết lập riêng của beamer: ${env.notes.join(', ')}`);
    return {
        css: buildCss(env),
        notes
    };
}

module.exports = { analyzeBeamerTheme, NAMED, splitMix, fromModel };
