#!/usr/bin/env node
// Vá khối runtime <tts> đã nhúng sẵn trong các bài ĐÃ PUBLISH, để bài cũ nhận bản runtime
// mới (nhãn "Play"/"Pause", bỏ dòng trạng thái thừa) mà tác giả không phải publish lại.
//
// Chạy TRÊN MÁY CHỦ, sau khi đã deploy code mới (server/src/slide-parts.js + client/src):
//     node scripts/patch-published-tts-runtime.cjs             # vá thật
//     node scripts/patch-published-tts-runtime.cjs --dry-run   # chỉ đếm, không ghi
//     node scripts/patch-published-tts-runtime.cjs --data DIR   # kho dữ liệu khác
//
// Chỉ thay đúng khối <script data-heyshow-tts="runtime">…</script> bằng bản dựng hiện tại
// từ client/src/tts-runtime.js (qua server/src/slide-parts). CSS, nội dung slide và
// data-tts-hash giữ nguyên nên âm thanh đã tạo trong data/tts vẫn dùng lại. Bản gốc của
// mỗi file bị sửa được sao lưu ra ~/heyshow-tts-patch-backup-<thời-điểm> trước khi ghi.
// Chạy lại nhiều lần an toàn: file đã là bản mới thì bỏ qua.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { SLIDE_TTS_JS, TTS_MARKER } = require('../server/src/slide-parts');

const args = process.argv.slice(2);
const hasFlag = (n) => args.includes(n);
const optVal = (n, def) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : def; };

const DATA = path.resolve(optVal('--data', path.join(__dirname, '..', 'data')));
const USERS = path.join(DATA, 'users');
const DRY = hasFlag('--dry-run');

// Khối runtime TTS: mở bằng marker, đóng ở </script> ĐẦU TIÊN sau nó. Nội dung runtime
// không chứa '</script>' (server chặn lúc nạp nên không thể lọt), nên cắt tới đó là đúng.
const RE_TTS_SCRIPT = /<script\s+data-heyshow-tts="runtime">[\s\S]*?<\/script>/g;

function listPublished(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) listPublished(p, out);
        else if (/\.html$/i.test(entry.name)) out.push(p);
    }
}

function main() {
    if (!fs.existsSync(USERS)) { console.error('Không thấy thư mục users:', USERS); process.exit(1); }

    const files = [];
    for (const u of fs.readdirSync(USERS)) {
        const pub = path.join(USERS, u, 'published');
        if (fs.existsSync(pub)) listPublished(pub, files);
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupRoot = path.join(os.homedir(), `heyshow-tts-patch-backup-${stamp}`);

    let scanned = 0, withTts = 0, changed = 0, already = 0, missing = 0;

    for (const file of files) {
        scanned++;
        const text = fs.readFileSync(file, 'utf8');
        if (!text.includes(TTS_MARKER)) continue;      // bài không dùng <tts>
        withTts++;

        RE_TTS_SCRIPT.lastIndex = 0;
        const matches = text.match(RE_TTS_SCRIPT);
        if (!matches) { missing++; console.warn('  THIẾU khối runtime:', path.relative(DATA, file)); continue; }

        // Hàm thay thế (không dùng chuỗi) để '$' trong code runtime không bị hiểu nhầm.
        const next = text.replace(RE_TTS_SCRIPT, () => SLIDE_TTS_JS);
        if (next === text) { already++; continue; }

        if (DRY) { changed++; console.log('  sẽ vá:', path.relative(DATA, file)); continue; }

        const rel = path.relative(DATA, file);
        const bak = path.join(backupRoot, rel);
        fs.mkdirSync(path.dirname(bak), { recursive: true });
        fs.copyFileSync(file, bak);

        const tmp = file + '.patch-tmp';
        fs.writeFileSync(tmp, next);
        fs.renameSync(tmp, file);
        changed++;
        console.log('  đã vá:', rel);
    }

    console.log('\n=== Tổng kết' + (DRY ? ' (dry-run)' : '') + ' ===');
    console.log('Quét file .html đã publish :', scanned);
    console.log('Có thẻ <tts>               :', withTts);
    console.log((DRY ? 'Sẽ vá' : 'Đã vá') + '                      :', changed);
    console.log('Đã là bản mới (bỏ qua)     :', already);
    console.log('Có marker nhưng thiếu khối :', missing);
    if (!DRY && changed) console.log('Sao lưu bản gốc            :', backupRoot);
}

main();
