// Phân tích file .pptx (ZIP chứa XML) và sinh bản nháp HeyShow.
// Chỉ dùng JS thuần (jszip + fast-xml-parser) để chạy được trên Termux.
const JSZip = require('jszip');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false });

const VIDEO_EXT = ['mp4', 'wmv', 'avi', 'mov', 'm4v', 'mkv', 'webm', 'mpg', 'mpeg'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'svg', 'emf', 'wmf'];

function asArray(x) {
    if (x === undefined || x === null) return [];
    return Array.isArray(x) ? x : [x];
}

// Thu đệ quy mọi node mang tên `name` (kể cả trong nhóm shape lồng nhau).
// fast-xml-parser trả về array khi cùng tên lặp lại -> phải trải ra, không push nguyên mảng.
function walk(node, name, out = []) {
    if (Array.isArray(node)) {
        for (const n of node) walk(n, name, out);
        return out;
    }
    if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
            if (k === name) {
                if (Array.isArray(v)) out.push(...v);
                else out.push(v);
            } else if (!k.startsWith('@_')) {
                walk(v, name, out);
            }
        }
    }
    return out;
}

function paraText(p) {
    let t = '';
    for (const r of asArray(p['a:r'])) t += String(r['a:t'] ?? '');
    for (const fld of asArray(p['a:fld'])) t += String(fld['a:t'] ?? '');
    return t.trim();
}

function paraLevel(p) {
    const pPr = p['a:pPr'];
    if (pPr && typeof pPr === 'object' && pPr['@_lvl'] !== undefined) {
        const lvl = parseInt(pPr['@_lvl'], 10);
        return Number.isFinite(lvl) ? lvl : 0;
    }
    return 0;
}

function phTypeOf(sp) {
    const phs = walk(sp['p:nvSpPr'] ?? sp, 'p:ph');
    return phs.length ? String(phs[0]['@_type'] || 'body') : null; // null = textbox tự do
}

function shapeParas(sp) {
    const paras = [];
    for (const txBody of asArray(sp['p:txBody'])) {
        for (const p of asArray(txBody['a:p'])) {
            const text = paraText(p);
            if (text) paras.push({ text, lvl: paraLevel(p) });
        }
    }
    return paras;
}

function extOf(name) {
    const m = String(name).match(/\.([a-zA-Z0-9]+)$/);
    return m ? m[1].toLowerCase() : '';
}

function parseRelId(rels, id) {
    for (const rel of asArray(rels && rels['Relationships'] && rels['Relationships']['Relationship'])) {
        if (String(rel['@_Id']) === id) return rel;
    }
    return null;
}

// Pic trong pptx: ảnh nhúng (r:embed) hoặc link ngoài (r:link), video là rel kiểu /video
function collectMedia(spTree, rels, slide) {
    const ids = new Set();
    for (const blip of walk(spTree, 'a:blip')) {
        const id = blip['@_r:embed'] || blip['@_r:link'];
        if (id) ids.add(String(id));
    }
    for (const id of ids) {
        const rel = parseRelId(rels, id);
        if (!rel) continue;
        const type = String(rel['@_Type'] || '');
        const target = String(rel['@_Target'] || '');
        const external = String(rel['@_TargetMode'] || '') === 'External' || /^https?:\/\//i.test(target);
        const ext = extOf(target);
        const name = target.split('/').pop() || 'media';
        if (type.endsWith('/video') || VIDEO_EXT.includes(ext)) {
            slide.videos.push({ name, url: external ? target : '' });
        } else if (type.endsWith('/image') || IMAGE_EXT.includes(ext)) {
            slide.images.push({ name, url: external ? target : '' });
        } else if (type.endsWith('/audio')) {
            slide.videos.push({ name: `(audio) ${name}`, url: external ? target : '' });
        }
    }
}

async function analyzePptx(buffer) {
    let zip;
    try {
        zip = await JSZip.loadAsync(buffer);
    } catch (e) {
        throw new Error('File không phải định dạng Office (ZIP) hợp lệ');
    }
    if (!zip.file('ppt/presentation.xml')) throw new Error('Không tìm thấy nội dung slide — đây có phải file .pptx? (.ppt cũ không hỗ trợ)');

    const slideNames = Object.keys(zip.files)
        .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
    if (!slideNames.length) throw new Error('File không có slide nào');

    const slides = [];
    for (const [i, sn] of slideNames.entries()) {
        const num = sn.match(/slide(\d+)\.xml/)[1];
        const sld = parser.parse(await zip.file(sn).async('string'));
        let rels = null;
        const relFile = zip.file(`ppt/slides/_rels/slide${num}.xml.rels`);
        if (relFile) rels = parser.parse(await relFile.async('string'));

        const spTree = (sld['p:sld'] && sld['p:sld']['p:cSld'] && sld['p:sld']['p:cSld']['p:spTree']) || {};
        const slide = { index: i + 1, title: '', bullets: [], images: [], videos: [], tables: 0, charts: 0, smartArts: 0, notes: '' };

        for (const sp of walk(spTree, 'p:sp')) {
            const type = phTypeOf(sp);
            const paras = shapeParas(sp);
            if (!paras.length) continue;
            if ((type === 'title' || type === 'ctrTitle') && !slide.title) {
                slide.title = paras.map(p => p.text).join(' ');
            } else {
                slide.bullets.push(...paras);
            }
        }

        slide.tables = walk(spTree, 'a:tbl').length;
        for (const rel of asArray(rels && rels['Relationships'] && rels['Relationships']['Relationship'])) {
            const type = String(rel['@_Type'] || '');
            if (type.endsWith('/chart')) slide.charts++;
            else if (type.endsWith('/diagram')) slide.smartArts++;
            else if (type.endsWith('/notesSlide')) {
                const target = String(rel['@_Target'] || '');
                const notesPath = `ppt/${target.replace(/^(\.\.\/)+/, '')}`;
                const nf = zip.file(notesPath);
                if (nf) {
                    const notes = parser.parse(await nf.async('string'));
                    const parts = [];
                    for (const sp of walk(notes, 'p:sp')) {
                        if (phTypeOf(sp) === 'body') parts.push(...shapeParas(sp).map(p => p.text));
                    }
                    slide.notes = parts.join(' ').slice(0, 2000);
                }
            }
        }
        collectMedia(spTree, rels, slide);
        slides.push(slide);
    }

    return { slides };
}

// Báo cáo rút gọn cho client hiển thị (không kèm nội dung bullet)
function buildReport(analysis) {
    const totals = { images: 0, videos: 0, tables: 0, charts: 0, smartArts: 0, notes: 0 };
    const slides = analysis.slides.map(s => {
        totals.images += s.images.length;
        totals.videos += s.videos.length;
        totals.tables += s.tables;
        totals.charts += s.charts;
        totals.smartArts += s.smartArts;
        if (s.notes) totals.notes++;
        return {
            index: s.index,
            title: s.title || '(không có tiêu đề)',
            bullets: s.bullets.length,
            images: s.images.map(m => m.name),
            videos: s.videos.map(m => m.name),
            tables: s.tables,
            charts: s.charts,
            smartArts: s.smartArts,
            hasNotes: !!s.notes
        };
    });
    return { slideCount: slides.length, totals, slides };
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

// Danh sách bullet thành <ul> lồng nhau theo lvl
function bulletsHtml(bullets) {
    if (!bullets.length) return '';
    let out = '';
    let openLists = 0; // số <ul> đang mở
    const closeLists = n => { for (let i = 0; i < n; i++) out += '</ul>\n'; };
    let prevLvl = 0;
    out += '<ul>\n'; openLists = 1;
    for (const b of bullets) {
        const lvl = Math.max(0, Math.min(b.lvl, 3));
        if (lvl > prevLvl) { out += '<ul>\n'; openLists++; }
        else if (lvl < prevLvl) { closeLists(prevLvl - lvl); openLists -= (prevLvl - lvl); out += '<ul>\n'; }
        out += `  <li class="fragment">${escapeHtml(b.text)}</li>\n`;
        prevLvl = lvl;
    }
    closeLists(openLists);
    return out;
}

function mediaHtml(slide) {
    let out = '';
    for (const img of slide.images) {
        if (img.url) {
            out += `<!-- Ảnh liên kết ngoài từ PowerPoint (có thể không hiển thị nếu máy chủ đòi quyền): -->\n`;
            out += `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.name)}" style="max-width: 70%;">\n`;
        } else {
            out += `<!-- ⚠ ANH "${escapeHtml(img.name)}" (Slide ${slide.index}) nhúng trong PowerPoint khong the lay ra.\n`
                + `     Tai len Google Drive → Chia sẻ → "Bất kỳ ai có đường dẫn" → mở link,\n`
                + `     copy ID giữa /d/ và dấu ? → thay vào src bên dưới:\n`
                + `     https://lh3.googleusercontent.com/d/<FILE_ID> -->\n`;
            out += `<img src="" alt="${escapeHtml(img.name)}" style="max-width: 70%;">\n`;
        }
    }
    for (const vid of slide.videos) {
        if (vid.url) {
            out += `<!-- Video liên kết ngoài từ PowerPoint: -->\n`;
            out += `<iframe width="720" height="405" src="${escapeHtml(vid.url)}" title="${escapeHtml(vid.name)}" frameborder="0" allowfullscreen></iframe>\n`;
        } else {
            out += `<!-- ⚡ VIDEO "${escapeHtml(vid.name)}" (Slide ${slide.index}) nhúng trong PowerPoint khong the lay ra.\n`
                + `     Tai len YouTube (chế độ công khai/ không liệt kê) hoặc Gan Jing World →\n`
                + `     lấy link nhúng (embed) kiểu youtube.com/embed/<ID> rồi thay vào src bên dưới: -->\n`;
            out += `<iframe width="720" height="405" src="" title="Video từ PowerPoint" frameborder="0" allowfullscreen></iframe>\n`;
        }
    }
    if (slide.tables) out += `<!-- ⚠ Slide này có ${slide.tables} BẢNG trong PowerPoint — không import được. Gõ lại bằng <table> HTML hoặc dùng ✨ AI trong Design. -->\n`;
    if (slide.charts) out += `<!-- ⚠ Slide này có ${slide.charts} BIỂU ĐỒ trong PowerPoint — không import được. Dùng snippet biểu đồ hoặc ✨ AI trong Design. -->\n`;
    if (slide.smartArts) out += `<!-- ⚠ Slide này có ${slide.smartArts} SMARTART trong PowerPoint — không import được. Dùng snippet SmartArt hoặc ✨ AI trong Design. -->\n`;
    return out;
}

function buildDraftHtml(analysis, origName) {
    const header =
        `<!-- Nhập từ file "${escapeHtml(origName)}" bằng HeyShow Import.\n`
        + `     Các mục có ⚠ cần bạn bổ sung thủ công:\n`
        + `     - ẢNH: tải lên Google Drive → Chia sẻ "Bất kỳ ai có đường dẫn" → src="https://lh3.googleusercontent.com/d/<FILE_ID>"\n`
        + `     - VIDEO: tải lên YouTube hoặc Gan Jing World → dán link nhúng (embed) vào src của iframe\n`
        + `     - Bảng / Biểu đồ / SmartArt: gõ lại bằng HTML hoặc nhờ ✨ AI trong Design\n`
        + `     Mở /design để hoàn thiện — preview sẽ hiện ngay khi sửa. -->\n`;

    const sections = analysis.slides.map((s, i) => {
        const lines = ['<section>\n'];
        const titleText = s.title || `Slide ${s.index}`;
        lines.push(i === 0 ? `<h1>${escapeHtml(titleText)}</h1>\n` : `<h2>${escapeHtml(titleText)}</h2>\n`);
        if (s.title && s.bullets.length === 0 && i === 0) {
            // slide phụ đề: phần bullets rỗng, nếu có thêm title phụ (subtitle) đã nằm trong bullets
        }
        lines.push(bulletsHtml(s.bullets));
        const media = mediaHtml(s);
        if (media) lines.push(media);
        if (s.notes) lines.push(`<!-- 📝 Ghi chú của bạn trong PowerPoint: ${escapeHtml(s.notes).replace(/--/g, '--')} -->\n`);
        lines.push('</section>\n');
        return lines.join('');
    });
    return header + sections.join('\n');
}

// Suy tên bản nháp từ tên file pptx gốc
function draftNameFrom(origName) {
    let base = String(origName || '').replace(/\.[^.]*$/, '');
    // Bỏ cả ký tự điều khiển: tên file lấy từ .pptx người dùng tải lên, không tin được
    // eslint-disable-next-line no-control-regex
    base = base.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    return base || 'pptx-import';
}

module.exports = { analyzePptx, buildReport, buildDraftHtml, draftNameFrom };
