#!/usr/bin/env node
//
// Vá những bài slide đã publish TRƯỚC khi server chèn guard CSS + shim sessionStorage.
//
// Bài cũ là file tĩnh nằm trên đĩa nên không được hưởng gì từ template mới: chúng vẫn
// bị lỗi vuốt trên điện thoại (Reveal chạm sessionStorage dưới CSP sandbox là chết) và
// vẫn có thể bị CSS của bài làm mọi slide chồng lên nhau. Script này chèn đúng hai mảnh
// mà buildFullHtml vẫn chèn, không sửa nội dung bài.
//
//   node scripts/repair-published-slides.cjs                   # dry-run, chỉ liệt kê
//   node scripts/repair-published-slides.cjs --apply           # ghi thật
//   node scripts/repair-published-slides.cjs --data-dir=/path/to/data/users --apply
//
// Thêm --bump-reveal để đổi phiên bản Reveal của bài cũ lên bản mà template đang dùng
// (--from chỉ ra bản hiện trên đĩa, mặc định 5.1.0; --to mặc định REVEAL_VERSION):
//
//   node scripts/repair-published-slides.cjs --bump-reveal --from=5.1.0
//   node scripts/repair-published-slides.cjs --bump-reveal --from=4.3.1 --apply
//
// Chạy bao nhiêu lần vẫn cho cùng kết quả: mảnh nào đã có dấu nhận diện là bỏ qua, và
// bản đã lên đúng phiên bản rồi thì không thẻ nào khớp khuôn nữa nên không đổi gì.
// Ghi theo kiểu atomicWrite (file.tmp + rename) nên không cần dừng PM2; rủi ro duy nhất
// là một request đang đọc dở đúng lúc rename, may lắm là người đó tải lại trang.

const fs = require('fs');
const path = require('path');
const { atomicWrite } = require('../server/src/storage');
const {
    REVEAL_VERSION, patchSlideHtml, bumpRevealVersion, revealAssetTags,
    GUARD_MARKER, SHIM_MARKER
} = require('../server/src/slide-parts');

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const BUMP = argv.includes('--bump-reveal');
const opt = (name, fallback) => {
    const hit = argv.find(a => a.startsWith(`--${name}=`));
    return hit ? hit.split('=')[1] : fallback;
};
const FROM = opt('from', '5.1.0');
const TO = opt('to', REVEAL_VERSION);
const dataDir = opt('data-dir', '') || process.env.HEYSHOW_DATA_DIR
    || path.join(__dirname, '..', 'data', 'users');

function htmlFiles(dir) {
    const found = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'published') {
                for (const f of fs.readdirSync(full)) {
                    if (f.endsWith('.html')) found.push(path.join(full, f));
                }
            } else if (!['history', 'node_modules', '.backups'].includes(entry.name)) {
                // thư mục con bất kỳ: phòng khi cấu trúc đĩa đổi
                try { found.push(...htmlFiles(full)); } catch (e) { /* không đọc được thì bỏ */ }
            }
        }
    }
    return found;
}

// Nội dung bài phải y hệt sau khi sửa, nên khoanh đúng phần giữa template mà so:
// từ <div class="slides"> đến mảnh do buildFullHtml sinh ra tiếp theo (shim hoặc thẻ
// <script> Reveal). Hai bên mốc đó là phần template, còn trong mốc là bài của người dùng.
const SLIDES_OPEN = '<div class="slides">';

function contentOf(html) {
    const open = html.indexOf(SLIDES_OPEN);
    if (open < 0) return null;
    const tail = html.slice(open);
    const anchors = [
        tail.indexOf(SHIM_MARKER),
        tail.search(/<script[^>]+src=["'][^"']*reveal\.js\//i)
    ].filter(i => i > 0);
    if (anchors.length === 0) return null;
    return tail.slice(SLIDES_OPEN.length, Math.min(...anchors));
}

let patched = 0;
let bumped = 0;
let clean = 0;
let skipped = 0;
const giu = [];

if (!fs.existsSync(dataDir)) {
    console.error(`Không thấy ${dataDir} — kiểm tra --data-dir hoặc HEYSHOW_DATA_DIR.`);
    process.exit(1);
}

console.log(`Thư mục: ${dataDir}  [${APPLY ? 'GHI THẬT' : 'dry-run'}]`
    + (BUMP ? `  Reveal ${FROM} -> ${TO}` : '  chỉ guard + shim'));

for (const file of htmlFiles(dataDir).sort()) {
    const rel = path.relative(dataDir, file);
    const original = fs.readFileSync(file, 'utf-8');
    const marks = [];

    const first = patchSlideHtml(original);
    if (first.error) {
        skipped++;
        console.log(`  BỎ  ${rel} — ${first.error}`);
        continue;
    }
    let next = first.html;
    marks.push(...first.added);

    if (BUMP) {
        const b = bumpRevealVersion(next, { from: FROM, to: TO });
        if (b.changed) {
            next = b.html;
            bumped++;
            marks.push(`reveal ${FROM}->${TO}`);
        } else if (next.includes(`reveal.js/${FROM}/`)) {
            // còn dấu bản ${FROM} trên đĩa nhưng không ghép đủ năm thẻ theo khuôn
            // buildFullHtml (theme khác, hoặc bài dán nguyên một trang HTML) -> để nguyên
            giu.push(`${rel} — còn ${FROM} nhưng lệch khuôn (thiếu ${b.missing.length}/5 thẻ)`);
        }
        // không còn thẻ FROM nào: bài đã ở bản khác, coi như sạch, không cần báo
    }

    if (marks.length === 0) {
        clean++;
        continue;
    }

    // Bài nào sắp ghi thì phải chắc phần bài viết không đổi; chỗ khác biệt duy nhất
    // được phép là đúng phép thế phiên bản Reveal (bài của AI thỉnh thoảng tự nạp Reveal).
    const before = contentOf(original);
    const after = contentOf(next);
    let expected = before;
    if (BUMP && before !== null) {
        const oldT = revealAssetTags(FROM);
        const newT = revealAssetTags(TO);
        expected = before;
        oldT.forEach((tag, i) => { expected = expected.split(tag).join(newT[i]); });
    }
    if (before === null || after === null || after !== expected) {
        skipped++;
        console.log(`  BỎ  ${rel} — phần bài viết thay đổi (${marks.join(', ')}), không dám ghi`);
        continue;
    }

    patched++;
    console.log(`  VÁ  ${rel} — ${marks.join(' + ')}`);
    if (APPLY) atomicWrite(file, next);
}

console.log(`\n${APPLY ? 'Đã vá' : 'Cần vá'}: ${patched} bài, đã đủ: ${clean} bài, `
    + `bỏ qua: ${skipped} bài, đổi phiên bản Reveal: ${bumped} bài.`);
for (const line of giu) console.log(`   ${line}`);
if (!APPLY && patched + skipped + giu.length > 0) console.log('Thêm --apply để ghi. Nên chạy scripts/backup-data.sh trước.');

if (APPLY && patched > 0) {
    const bad = [];
    const versions = new Map();
    for (const f of htmlFiles(dataDir)) {
        const rel = path.relative(dataDir, f);
        const text = fs.readFileSync(f, 'utf-8');
        if (!text.includes(SHIM_MARKER) || !text.includes(GUARD_MARKER)) {
            bad.push(`${rel} — thiếu guard/shim`);
            continue;
        }
        const open = text.indexOf(SLIDES_OPEN);
        const head = text.slice(0, open < 0 ? text.length : open);
        const v = (head.match(/reveal\.js\/([\d.]+)\//) || [])[1] || 'không rõ';
        versions.set(v, (versions.get(v) || 0) + 1);
    }
    console.log('   Template của các bài trên đĩa đang nạp: '
        + [...versions].map(([v, n]) => `${v}: ${n} bài`).join(', '));
    if (bad.length > 0) {
        console.error(`!! ${bad.length} bài thiếu mảnh, ví dụ:`);
        for (const b of bad.slice(0, 5)) console.error('   ' + b);
        process.exitCode = 1;
    } else if (BUMP && versions.has(FROM)) {
        console.error(`!! Vẫn còn ${versions.get(FROM)} bài nạp ${FROM} — xem danh sách GIỮ ở trên.`);
        process.exitCode = 1;
    } else {
        console.log('   Kiểm tra lại: mọi bài trên đĩa đều có đủ guard + shim.');
    }
}
