// Lịch sử phiên bản bản nháp: mỗi lần lưu sẽ cất nội dung cũ, giữ 5 bản gần nhất.
//
// Đường dẫn: data/users/<loginId>/history/<ten-file>.html/<millis>-<ngẫu nhiên>.html
// Việc này quan trọng khi soạn slide có AI: một lần chèn hỏng không còn làm mất cả bài.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_VERSIONS = 5;

// Tên thư mục lịch sử lấy từ tên file nháp, chỉ giữ ký tự an toàn
function historySlug(fileName) {
    const base = path.basename(String(fileName || ''));
    const safe = base.replace(/[^a-zA-Z0-9@._-]/g, '_');
    return safe || 'draft';
}

function historyDir(userDir, fileName) {
    return path.join(userDir, 'history', `${historySlug(fileName)}.d`);
}

function versionSort(a, b) {
    // Mới nhất trước; tên file có millis nên so chuỗi là đủ
    return a < b ? 1 : a > b ? -1 : 0;
}

function listVersions(userDir, fileName) {
    const dir = historyDir(userDir, fileName);
    let entries = [];
    try {
        entries = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
    } catch (err) {
        return [];
    }
    return entries.sort(versionSort);
}

function snapshot(userDir, fileName, content) {
    if (typeof content !== 'string' || content === '') return null;
    const dir = historyDir(userDir, fileName);
    fs.mkdirSync(dir, { recursive: true });

    const stamp = Date.now();
    const name = `${stamp}-${crypto.randomBytes(3).toString('hex')}.html`;
    fs.writeFileSync(path.join(dir, name), content);

    // Dọn bản vượt quá hạn mức
    for (const extra of listVersions(userDir, fileName).slice(MAX_VERSIONS)) {
        try { fs.unlinkSync(path.join(dir, extra)); } catch (err) { /* bỏ qua bản đã mất */ }
    }

    return { name, at: stamp, size: Buffer.byteLength(content) };
}

function readVersion(userDir, fileName, versionName) {
    const dir = historyDir(userDir, fileName);
    const base = path.basename(String(versionName || ''));
    if (!base.endsWith('.html') || base !== versionName) return null;
    const full = path.join(dir, base);
    // Kiểm tra nằm đúng thư mục lịch sử, chặn mọi kiểu traversal
    if (path.dirname(full) !== dir) return null;
    try {
        return fs.readFileSync(full, 'utf-8');
    } catch (err) {
        return null;
    }
}

function versionInfo(userDir, fileName, versionName) {
    const full = path.join(historyDir(userDir, fileName), versionName);
    try {
        const st = fs.statSync(full);
        return { name: versionName, at: Math.round(st.mtimeMs), size: st.size };
    } catch (err) {
        return { name: versionName, at: null, size: 0 };
    }
}

function dropHistories(userDir, fileNames) {
    for (const fileName of fileNames) {
        const dir = historyDir(userDir, fileName);
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (err) { /* không có lịch sử */ }
    }
}

module.exports = {
    MAX_VERSIONS,
    snapshot,
    listVersions,
    readVersion,
    versionInfo,
    historyDir,
    dropHistories
};
