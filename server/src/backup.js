// Sao lưu / phục hồi toàn bộ bản nháp của một người dùng dưới dạng file .zip.
//
// Zip tự sinh và tự đọc bằng JSZip chứ không gọi binary `zip` của hệ thống: HeyShow chạy
// trên Termux (Android), nơi không đảm bảo có sẵn zip/unzip, còn JSZip đã là dependency
// của luồng import PowerPoint nên không thêm gì mới.
const JSZip = require('jszip');

const MANIFEST_NAME = 'manifest.json';
const DECK_DIR = 'drafts';

// Một bản nháp không bao giờ lớn hơn MAX_DRAFT_BYTES (2MB) trên server, nên zip nào chứa
// entry to hơn là dấu hiệu của file bịa ra — chặn trước khi readAsText nuốt bộ nhớ.
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;
// Hạn mức cao nhất là 50 bài (master) và admin không giới hạn; 500 là mức chặn zip nhồi.
const MAX_ENTRIES = 500;
// Ngân sách giải nén cho CẢ file zip. Hợp pháp trần là 50 bài × 2MB = 100MB nên 120MB vẫn
// thừa chỗ; con số này tồn tại để chặn zip bomb: body 60MB nén 1000:1 nở thành hàng chục
// GB, mà điện thoại chạy tiến trình này chỉ có vài trăm MB RAM.
const MAX_TOTAL_BYTES = 120 * 1024 * 1024;
// manifest chỉ là danh sách tên bài, to bất thường là dấu hiệu file bịa ra.
const MAX_MANIFEST_BYTES = 1024 * 1024;

// Đọc một entry nhưng dừng ngay khi vượt quá capBytes, không chờ giải nén xong mới đo:
// kích thước khai báo trong header zip là thứ người tạo file nói láo được, còn số byte
// thật thì phải đếm trong lúc nó chảy ra.
function readEntryCapped(entry, capBytes, message) {
    return new Promise((resolve, reject) => {
        const stream = entry.nodeStream();
        const chunks = [];
        let used = 0;
        let done = false;

        // jszip đẩy chunk bằng readable.push() từ worker của nó, nên destroy() ở phía
        // người đọc khiến worker vẫn push và nổ "push() after EOF" không bắt được. Tắt
        // dòng dữ liệu tại nguồn (helper.pause) rồi gỡ listener là đủ.
        const halt = () => {
            stream.removeAllListeners('data');
            stream.removeAllListeners('end');
            stream.removeAllListeners('error');
            // jszip còn phát hiện "size mismatch" sau khi ta đã từ chối entry: không có
            // listener thì nó ném 'error' trần và làm sập tiến trình — đúng thứ cần chặn.
            stream.on('error', () => {});
            if (stream._helper) stream._helper.pause();
            else stream.destroy();
        };

        stream.on('data', chunk => {
            if (done) return;
            used += chunk.length;
            if (used > capBytes) {
                done = true;
                chunks.length = 0;
                halt();
                const err = new Error(message);
                err.status = 400;
                return reject(err);
            }
            chunks.push(chunk);
        });
        stream.once('end', () => {
            if (done) return;
            done = true;
            resolve(Buffer.concat(chunks));
        });
        stream.once('error', err => {
            if (done) return;
            done = true;
            halt();
            err.status = 400;
            reject(err);
        });
    });
}

function pad(n) {
    return String(n).padStart(2, '0');
}

// 2026-11-04-15-30 theo giờ của server, để người dùng nhìn tên file là biết bản backup lúc nào
function stamp(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

// Tên bài bên trong zip do người khác tạo ra, phải coi như dữ liệu thù địch: chặn mọi
// đường dẫn có "..", rồi chỉ lấy phần tử cuối và bắt buộc đúng đuôi .html. Không làm vậy,
// một entry "../../../x.html" sẽ ghi ra ngoài thư mục tài khoản (zip slip).
function safeDeckName(name) {
    const raw = String(name || '');
    if (raw.includes('..')) return null;
    const base = raw.split(/[\\/]/).pop();
    if (!/^[\w@.\- ]{1,120}\.html$/i.test(base)) return null;
    return base;
}

function backupFileName(host, slug, date) {
    const clean = (value) => String(value || '').replace(/[^A-Za-z0-9._-]/g, '-');
    return `${clean(host)}-backup-${clean(slug)}-${stamp(date)}.zip`;
}

// decks: [{ fileName, content, updatedAt }]
async function buildBackupZip({ host, slug, decks, now = new Date() }) {
    const zip = new JSZip();
    const manifest = {
        app: 'HeyShow',
        host,
        slug,
        exportedAt: now.toISOString(),
        deckCount: decks.length,
        // Bản nháp là thứ Design biên tập; bản publish luôn dựng lại được từ nháp
        // nên file zip chỉ chứa nháp, kèm danh sách này để mở lên là hiểu ngay.
        decks: decks.map(d => ({ fileName: d.fileName, bytes: Buffer.byteLength(d.content, 'utf-8'), updatedAt: d.updatedAt }))
    };
    zip.file(MANIFEST_NAME, JSON.stringify(manifest, null, 2) + '\n');
    const folder = zip.folder(DECK_DIR);
    for (const d of decks) folder.file(d.fileName, d.content);

    return {
        fileName: backupFileName(host, slug, now),
        buffer: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
    };
}

// Trả về { manifest, decks } — ném Error có .status = 400 cho zip hỏng hoặc chứa nội dung
// không chấp nhận được, để route chỉ việc biến nó thành response 400.
async function readBackupZip(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        const err = new Error('File trống hoặc không phải định dạng .zip');
        err.status = 400;
        throw err;
    }

    let zip;
    try {
        zip = await JSZip.loadAsync(buffer);
    } catch (err) {
        const bad = new Error('Không đọc được file .zip này');
        bad.status = 400;
        throw bad;
    }

    let manifest = null;
    const manifestEntry = zip.files[MANIFEST_NAME];
    if (manifestEntry) {
        try {
            const raw = await readEntryCapped(manifestEntry, MAX_MANIFEST_BYTES,
                'manifest.json trong file backup lớn bất thường nên bị từ chối');
            manifest = JSON.parse(raw.toString('utf-8'));
        } catch (err) {
            // manifest hỏng không chặn việc phục hồi các bài bên trong, nhưng manifest
            // khổng lồ thì phải chặn: đó là zip bomb đội lốt metadata.
            if (err.status === 400 && String(err.message).startsWith('manifest')) throw err;
            manifest = null;
        }
    }

    const seen = new Set();
    const decks = [];
    let unpacked = 0;
    for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue;
        // Nén từ macOS thường kèm rác này; bỏ trước khi nó bị coi là một bài trình chiếu
        if (entry.name.startsWith('__MACOSX') || entry.name.startsWith('.')) continue;
        const fileName = safeDeckName(entry.name);
        if (!fileName || seen.has(fileName)) continue;

        const oversize = () => {
            const err = new Error(`Bài "${fileName}" vượt quá 2MB nên bị bỏ qua`);
            err.status = 400;
            return err;
        };
        const tooMuch = () => {
            const err = new Error(`File backup vượt quá ${MAX_TOTAL_BYTES / (1024 * 1024)}MB sau khi giải nén nên bị từ chối`);
            err.status = 400;
            return err;
        };
        // Kích thước khai báo trong header chặn được zip bomb mà không phải giải nén;
        // kẻ nói láo ở header thì vẫn bị cap khi đọc chặn lại theo byte thật.
        const declared = Number(entry._data && entry._data.uncompressedSize);
        if (Number.isFinite(declared) && declared > MAX_ENTRY_BYTES) throw oversize();
        if (unpacked + Math.max(declared, 0) > MAX_TOTAL_BYTES) throw tooMuch();

        const packed = await readEntryCapped(entry, MAX_ENTRY_BYTES, oversize().message);
        unpacked += packed.length;
        if (unpacked > MAX_TOTAL_BYTES) throw tooMuch();
        const content = packed.toString('utf-8');
        seen.add(fileName);
        decks.push({ fileName, content, updatedAt: entry.date ? entry.date.getTime() : null });
        if (decks.length > MAX_ENTRIES) {
            const err = new Error(`File backup chứa quá ${MAX_ENTRIES} bài`);
            err.status = 400;
            throw err;
        }
    }

    if (!decks.length) {
        const err = new Error('File backup không chứa bài trình chiếu nào (.html)');
        err.status = 400;
        throw err;
    }
    return { manifest, decks };
}

module.exports = { buildBackupZip, readBackupZip, backupFileName, safeDeckName, MANIFEST_NAME, DECK_DIR };
