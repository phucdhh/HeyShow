// Tầng lưu trữ file JSON: cache trong bộ nhớ + hàng đợi ghi tuần tự.
//
// Lý do tồn tại: bản cũ đọc-sửa-ghi db.json/social.json ở mọi request mà không có
// khoá. Hai request like/view đồng thời sẽ cùng đọc bản gốc và một trong hai ghi đè
// làm mất dữ liệu. Vì Node xử lý mỗi callback trên một luồng, mọi thay đổi được gộp
// và áp dụng ĐỒNG BỘ trên object đã cache nên không còn xen kẽ; việc ra đĩa được
// xếp hàng và gộp lại sau 250ms.

const fs = require('fs');

const DEFAULT_FLUSH_MS = 250;

const noop = () => {};

function safeStat(file) {
    try {
        const st = fs.statSync(file);
        return { mtimeMs: st.mtimeMs, size: st.size };
    } catch (err) {
        return null;
    }
}

// Ghi an toàn: file tạm cùng thư mục + rename (atomic trên mọi hệ thống file POSIX),
// giữ quyền 0600 cho file chứa dữ liệu nhạy cảm.
function atomicWrite(file, text, mode) {
    const tmpFile = `${file}.tmp`;
    if (mode) {
        const fd = fs.openSync(tmpFile, 'w', mode);
        try {
            fs.writeFileSync(fd, text);
        } finally {
            fs.closeSync(fd);
        }
    } else {
        fs.writeFileSync(tmpFile, text);
    }
    fs.renameSync(tmpFile, file);
    if (mode) {
        try { fs.chmodSync(file, mode); } catch (err) { /* Termux có thể không hỗ trợ chmod */ }
    }
}

function createJsonStore(options) {
    const { file, label, mode, seed, onCorrupt, normalize = noop, flushMs = DEFAULT_FLUSH_MS } = options;

    let cache = null;
    let cacheStamp = null;
    let dirty = false;
    let timer = null;
    let writing = false;

    function readFresh() {
        if (!fs.existsSync(file)) {
            cache = typeof seed === 'function' ? seed() : (seed || {});
            cacheStamp = safeStat(file); // null khi file chưa tồn tại
            dirty = true;
            return cache;
        }

        let text;
        try {
            text = fs.readFileSync(file, 'utf-8');
        } catch (err) {
            throw Object.assign(new Error(`Không đọc được ${label}: ${err.message}`), { code: 'READ' });
        }

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            // Không để một file hỏng làm sập toàn bộ API: giữ bản sao để cứu dữ liệu
            // rồi làm việc trên cấu trúc khởi tạo.
            if (typeof onCorrupt === 'function') onCorrupt(err, text);
            else console.error(`[store] ${label} hỏng, khởi tạo lại:`, err.message);
            parsed = typeof seed === 'function' ? seed() : (seed || {});
        }

        // Mảng cũng bị coi là hỏng: gán thêm thuộc tính lên mảng rồi stringify sẽ
        // âm thầm bỏ hết mọi thứ vừa ghi, tức mất dữ liệu mà không báo lỗi.
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            if (typeof onCorrupt === 'function') onCorrupt(new Error('không phải object JSON'), text);
            parsed = typeof seed === 'function' ? seed() : (seed || {});
        }

        cache = parsed;
        cacheStamp = safeStat(file);
        dirty = false;
        return cache;
    }

    // Bỏ qua cache nếu có tiến trình khác vừa ghi lên đĩa (rsync, script bảo trì).
    function isStaleOnDisk() {
        if (dirty || cacheStamp === null) return false;
        const st = safeStat(file);
        return !!st && (st.mtimeMs !== cacheStamp.mtimeMs || st.size !== cacheStamp.size);
    }

    function read() {
        if (cache === null || isStaleOnDisk()) readFresh();
        normalize(cache);
        return cache;
    }

    function writeDisk() {
        try {
            atomicWrite(file, JSON.stringify(cache, null, 2), mode);
            cacheStamp = safeStat(file);
            if (dirty) dirty = false;
        } catch (err) {
            console.error(`[store] Không ghi được ${label}:`, err.message);
        }
    }

    function flush(force = false) {
        if (timer) { clearTimeout(timer); timer = null; }
        if (cache === null) return;
        if (!dirty && !force) return;
        // Đang ghi dở thì để chu kỳ kế tiếp ghi lại (dirty vẫn còn nếu chưa kịp xóa).
        if (writing) return;
        writing = true;
        try {
            writeDisk();
        } finally {
            writing = false;
        }
    }

    function scheduleFlush() {
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            flush();
        }, flushMs);
        if (timer.unref) timer.unref();
    }

    // Mọi thay đổi đi qua đây: modifier chạy ĐỒNG BỘ trên object đã cache.
    function mutate(modifier) {
        const data = read();
        const result = modifier(data);
        dirty = true;
        scheduleFlush();
        return result === undefined ? data : result;
    }

    return {
        file,
        label,
        read,
        mutate,
        flush,
        flushAll() {
            if (dirty) flush();
        },
        // Cho bộ đếm lượt xem: chỉ báo "có thay đổi" để được ghi ở chu kỳ gộp.
        markDirty() {
            read();
            dirty = true;
            scheduleFlush();
        },
        isDirty() {
            return dirty;
        }
    };
}

module.exports = { createJsonStore, atomicWrite, safeStat };
