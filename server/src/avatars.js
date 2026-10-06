// Ảnh đại diện lưu thành file riêng thay vì base64 trong db.json.
//
// Bản cũ nhúng cả chuỗi data:image/...~1.5MB vào db.json, và mọi card gallery +
// mọi bình luận đều mang theo chuỗi đó, khiến payload phình to và db.json phải
// parse lại từng kilobyte rác. ở đây db.json chỉ còn tên file, ảnh phục vụ qua
// /api/avatar/:user.

const fs = require('fs');
const path = require('path');

const DATA_URL_RE = /^data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/=]+)$/;
const MAX_BASE64_LEN = 1_500_000; // ~1MB ảnh gốc

const EXT_BY_TYPE = {
    png: 'png',
    jpg: 'jpg',
    jpeg: 'jpg',
    gif: 'gif',
    webp: 'webp'
};

const MIME_BY_EXT = {
    png: 'image/png',
    jpg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp'
};

function avatarDir(userDir) {
    return path.join(userDir, 'avatar');
}

function currentAvatarFile(userDir) {
    const dir = avatarDir(userDir);
    try {
        return fs.readFileSync(path.join(dir, 'CURRENT'), 'utf-8').trim() || null;
    } catch (err) {
        return null;
    }
}

function guessExtFromDataUrl(dataUrl) {
    const match = DATA_URL_RE.exec(dataUrl);
    if (!match) return null;
    return EXT_BY_TYPE[match[1].toLowerCase()] || null;
}

// Trả về { fileName } khi đã ghi xong, null khi dữ liệu không hợp lệ
function saveFromDataUrl(userDir, dataUrl) {
    if (typeof dataUrl !== 'string' || dataUrl.length > MAX_BASE64_LEN) return null;
    const match = DATA_URL_RE.exec(dataUrl);
    if (!match) return null;

    const ext = EXT_BY_TYPE[match[1].toLowerCase()];
    if (!ext) return null;

    let buffer;
    try {
        buffer = Buffer.from(match[2], 'base64');
    } catch (err) {
        return null;
    }
    if (!buffer.length) return null;

    const dir = avatarDir(userDir);
    fs.mkdirSync(dir, { recursive: true });

    const fileName = `${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(dir, fileName), buffer);

    const previous = currentAvatarFile(userDir);
    fs.writeFileSync(path.join(dir, 'CURRENT'), fileName);
    if (previous && previous !== fileName) {
        try { fs.unlinkSync(path.join(dir, previous)); } catch (err) { /* bản cũ có thể đã bị xóa */ }
    }

    return { fileName, size: buffer.length };
}

function removeAvatar(userDir) {
    const dir = avatarDir(userDir);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (err) { /* chưa có avatar */ }
}

function readAvatar(userDir) {
    const fileName = currentAvatarFile(userDir);
    if (!fileName) return null;
    const ext = path.extname(fileName).slice(1).toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) return null;
    try {
        return { mime, buffer: fs.readFileSync(path.join(avatarDir(userDir), fileName)) };
    } catch (err) {
        return null;
    }
}

function avatarPathFor(loginId) {
    return `/api/avatar/${encodeURIComponent(loginId)}`;
}

// Chuỗi dùng làm giá trị avatar khi tài khoản chưa tải ảnh lên
function fallbackAvatar(displayName) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || '')}&background=random`;
}

module.exports = {
    DATA_URL_RE,
    MAX_BASE64_LEN,
    guessExtFromDataUrl,
    saveFromDataUrl,
    removeAvatar,
    readAvatar,
    currentAvatarFile,
    avatarPathFor,
    fallbackAvatar
};
