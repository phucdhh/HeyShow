#!/usr/bin/env node
//
// Vá những bài slide đã publish TRƯỚC khi server chèn guard CSS + shim sessionStorage.
//
// Bài cũ là file tĩnh nằm trên đĩa nên không được hưởng gì từ template mới: chúng vẫn
// bị lỗi vuốt trên điện thoại (Reveal chạm sessionStorage dưới CSP sandbox là chết) và
// vẫn có thể bị CSS của bài làm mọi slide chồng lên nhau. Script này chèn đúng hai mảnh
// mà buildFullHtml vẫn chèn, không sửa nội dung bài.
//
//   node scripts/repair-published-slides.cjs                  # dry-run, chỉ liệt kê
//   node scripts/repair-published-slides.cjs --apply          # ghi thật
//   node scripts/repair-published-slides.cjs --data-dir=/path/to/data/users --apply
//
// Chạy bao nhiêu lần vẫn cho cùng kết quả: mảnh nào đã có dấu nhận diện là bỏ qua.
// Ghi theo kiểu atomicWrite (file.tmp + rename) nên không cần dừng PM2; rủi ro duy nhất
// là một request đang đọc dở đúng lúc rename, may lắm là người đó tải lại trang.

const fs = require('fs');
const path = require('path');
const { atomicWrite } = require('../server/src/storage');
const { patchSlideHtml, GUARD_MARKER, SHIM_MARKER } = require('../server/src/slide-parts');

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const dataDir = (argv.find(a => a.startsWith('--data-dir=')) || '').split('=')[1]
    || process.env.HEYSHOW_DATA_DIR
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

let patched = 0;
let clean = 0;
let skipped = 0;

if (!fs.existsSync(dataDir)) {
    console.error(`Không thấy ${dataDir} — kiểm tra --data-dir hoặc HEYSHOW_DATA_DIR.`);
    process.exit(1);
}

console.log(`Thư mục: ${dataDir}  [${APPLY ? 'GHI THẬT' : 'dry-run'}]`);

for (const file of htmlFiles(dataDir).sort()) {
    const original = fs.readFileSync(file, 'utf-8');
    const { html, added, error } = patchSlideHtml(original);

    if (error) {
        skipped++;
        console.log(`  BỎ  ${path.relative(dataDir, file)} — ${error}`);
        continue;
    }
    if (!added || added.length === 0) {
        clean++;
        continue;
    }
    patched++;
    console.log(`  VÁ  ${path.relative(dataDir, file)} — ${added.join(' + ')}`);
    if (APPLY) atomicWrite(file, html);
}

console.log(`\n${APPLY ? 'Đã vá' : 'Cần vá'}: ${patched} bài, đã đủ: ${clean} bài, bỏ qua: ${skipped} bài.`);
if (!APPLY && patched + skipped > 0) console.log('Thêm --apply để ghi. Nên chạy scripts/backup-data.sh trước.');

if (APPLY && patched > 0) {
    const missing = htmlFiles(dataDir).filter(f => {
        const text = fs.readFileSync(f, 'utf-8');
        return !text.includes(SHIM_MARKER) || !text.includes(GUARD_MARKER);
    });
    if (missing.length === 0) {
        console.log('   Kiểm tra lại: mọi bài trên đĩa đều có đủ guard + shim.');
    } else {
        console.error(`!! Vẫn còn ${missing.length} bài thiếu mảnh, ví dụ ${path.relative(dataDir, missing[0])}`);
        process.exitCode = 1;
    }
}
