// Đọc server/.env bất kể thư mục hiện hành khi khởi động (PM2 có thể chạy từ nơi khác)
require('dotenv').config({ quiet: true, path: __dirname + '/../.env' });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const { createJsonStore, atomicWrite } = require('./storage');
const { REVEAL_CSS, REVEAL_JS, REVEAL_MATH_JS, REVEAL_KATEX_OPTS, SLIDE_HEAD_GUARD, SLIDE_STORAGE_SHIM } = require('./slide-parts');
const access = require('./access');
const history = require('./history');
const avatars = require('./avatars');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '5mb' }));

// Header bảo mật chung cho MỌI response, kể cả JSON của API. Đặt ở đây (trước mọi
// route) vì setHeader sau khi route đã gửi response thì không còn tác dụng.
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // SAMEORIGIN: gallery nhúng slide bằng iframe cùng origin nên không dùng DENY
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
});

// Paths
const CLIENT_DIST = path.join(__dirname, '../../client/dist');
// HEYSHOW_DATA_DIR cho phép chạy test/smoke trên một kho dữ liệu tạm, không đụng tới
// dữ liệu thật trong ./data
const DATA_DIR = path.resolve(process.env.HEYSHOW_DATA_DIR || path.join(__dirname, '../../data'));
const USERS_DIR = path.join(DATA_DIR, 'users');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SECRET_FILE = path.join(DATA_DIR, '.jwt-secret');
const SOCIAL_FILE = path.join(DATA_DIR, 'social.json');

// Tạo thư mục nếu chưa có
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(USERS_DIR, { recursive: true });

// Slug nằm trực tiếp trong đường dẫn URL công khai nên phải kiểm soát chặt
const SLUG_RE = /^[a-zA-Z0-9_-]{3,40}$/;
const USERNAME_RE = /^[a-zA-Z0-9@._-]{3,64}$/;
const FORBIDDEN_USERNAMES = ['__proto__', 'constructor', 'prototype'];

// Các slug dành riêng cho route hệ thống, không cho user chiếm dụng. Phải phủ mọi
// route cấp một; chốt chặn ở cuối file kiểm lại điều này lúc khởi động. So sánh không
// phân biệt hoa/thường vì Express khớp đường dẫn không phân biệt hoa/thường: user tên
// "Gallery" cũng che mất trang gallery y như "gallery".
const RESERVED_SLUGS = ['api', 'admin_panel', 'assets', 'src', 'gallery', 'dashboard', 'design', 'help', 'templates', 'show', 'health', 'favicon.svg', 'icons.svg'];

function isReservedName(name) {
    if (typeof name !== 'string') return false;
    const lower = name.toLowerCase();
    return RESERVED_SLUGS.some(r => r.toLowerCase() === lower);
}

// Slug mặc định suy ra từ tên đăng nhập (bỏ phần @domain, bỏ dấu)
function defaultSlug(username) {
    const s = String(username);
    // loginId dạng "@abc" có phần trước @ rỗng -> fallback sang toàn bộ tên đã lọc ký tự
    const base = s.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');
    return base || s.replace(/[^a-zA-Z0-9_-]/g, '');
}

function slugOf(loginId, user) {
    return user?.urlSlug || defaultSlug(loginId);
}

// --- STORE GALLERY (views, likes/comments của từng bài đã publish) ---
// Tách khỏi db.json để thao tác like/view/comment không đụng vào dữ liệu tài khoản.
// Key: "<loginId>/<tenFile.html>" - ổn định kể cả khi user đổi urlSlug.

// Tên thư mục thật trên đĩa: mọi ký tự ngoài bảng ASCII an toàn đều bị bỏ.
// Tài khoản cũ kiểu "Minh Nhật Phan" vì thế sống trong users/MinhNhtPhan.
function folderOf(loginId) {
    return String(loginId || '').replace(/[^a-zA-Z0-9@._-]/g, '');
}

// Chặn path traversal: loại bỏ mọi ký tự không hợp lệ (bao gồm '/' và '\')
function userDir(username) {
    const safe = folderOf(username);
    if (!safe || safe === '.' || safe === '..') return null;
    return path.join(USERS_DIR, safe);
}

function presKey(loginId, fileName) {
    return `${loginId}/${fileName}`;
}

function fileMtime(filePath) {
    try { return fs.statSync(filePath).mtimeMs; } catch (e) { return Date.now(); }
}

// --- BẢO MẬT: HASH MẬT KHẨU ---
// Định dạng mới: scrypt$<salt hex>$<hash hex>
// Hash cũ (SHA-256 không salt) vẫn đăng nhập được và được tự nâng cấp lên scrypt.
const SCRYPT_KEYLEN = 64;

function timingSafeEqualBuffers(a, b) {
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hashPasswordSync(password) {
    const salt = crypto.randomBytes(16);
    const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

// scrypt chạy bất đồng bộ trên threadpool để không chặn event loop
function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16);
        crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, derived) => {
            if (err) return reject(err);
            resolve(`scrypt$${salt.toString('hex')}$${derived.toString('hex')}`);
        });
    });
}

function verifyPassword(password, stored) {
    return new Promise((resolve) => {
        const fail = { ok: false, legacy: false };
        if (typeof stored !== 'string' || !stored || typeof password !== 'string') {
            return resolve(fail);
        }

        const parts = stored.split('$');
        if (parts.length === 3 && parts[0] === 'scrypt') {
            const salt = Buffer.from(parts[1], 'hex');
            const expected = Buffer.from(parts[2], 'hex');
            if (!salt.length || !expected.length) return resolve(fail);
            crypto.scrypt(password, salt, expected.length, (err, derived) => {
                if (err) return resolve(fail);
                resolve({ ok: timingSafeEqualBuffers(expected, derived), legacy: false });
            });
            return;
        }

        const legacy = crypto.createHash('sha256').update(password).digest();
        resolve({ ok: timingSafeEqualBuffers(legacy, Buffer.from(stored, 'hex')), legacy: true });
    });
}

// --- QUẢN LÝ DATABASE (JSON + cache trong bộ nhớ + ghi tuần tự) ---
// Mọi thay đổi đi qua mutateDB/mutateSocial: chúng chạy ĐỒNG BỘ trên object đã cache
// nên hai request đồng thời không thể cùng đọc-bản-cũ-rồi-ghi-de như bản trước.
// Việc ra đĩa được xếp hàng và gộp lại, vì vậy một loạt lượt xem/like không tạo
// hàng trăm lần ghi file.

const dbStore = createJsonStore({
    file: DB_FILE,
    label: 'db.json',
    mode: 0o600,
    seed: () => ({ users: {}, config: { aiKeys: { groq: '', deepseek: '' } } }),
    normalize: sanitizeDb,
    onCorrupt: (err, raw) => preserveCorrupt(DB_FILE, raw, err)
});

function normalizeUser(rec) {
    if (!rec || typeof rec !== 'object') return null;
    rec.role = access.normalizeRole(rec.role);
    if (!Number.isFinite(rec.tokenVersion) || rec.tokenVersion < 0) rec.tokenVersion = 0;
    return rec;
}

// Sửa cấu trúc thay vì ném lỗi: file cũ/thiếu trường không được làm sập API
function sanitizeDb(db) {
    if (!db || typeof db !== 'object') return;
    if (!db.users || typeof db.users !== 'object') db.users = {};
    if (!db.config || typeof db.config !== 'object') db.config = {};
    if (!db.config.aiKeys || typeof db.config.aiKeys !== 'object') db.config.aiKeys = {};
    for (const [loginId, rec] of Object.entries(db.users)) {
        if (!normalizeUser(rec)) delete db.users[loginId];
    }
}

function preserveCorrupt(file, raw, err) {
    const backup = `${file}.corrupt-${Date.now()}`;
    try {
        fs.writeFileSync(backup, raw, { mode: 0o600 });
        console.error(`[db] ${path.basename(file)} hỏng (${err.message}). Đã giữ bản gốc tại ${backup} và làm việc trên cấu trúc khởi tạo.`);
    } catch (writeErr) {
        console.error(`[db] ${path.basename(file)} hỏng và không ghi được bản sao cứu dữ liệu:`, writeErr.message);
    }
}

function getDB() {
    return dbStore.read();
}

function mutateDB(modifier) {
    return dbStore.mutate(modifier);
}

// Đổi mật khẩu / đổi quyền / xóa tài khoản -> tăng tokenVersion để JWT cũ vô hiệu ngay,
// không phải chờ hết hạn 24h.
function bumpTokenVersion(loginId) {
    mutateDB(db => {
        const rec = db.users[loginId];
        if (rec) rec.tokenVersion = (Number.isFinite(rec.tokenVersion) ? rec.tokenVersion : 0) + 1;
    });
}

// Khởi tạo db.json ngay khi bật server để không mất mật khẩu admin in ra console
function seedDatabase() {
    const db = getDB();
    if (Object.keys(db.users).length) return;

    const initialPassword = crypto.randomBytes(9).toString('base64url');
    mutateDB(next => {
        if (Object.keys(next.users).length) return next;
        next.users.admin = {
            passwordHash: hashPasswordSync(initialPassword),
            role: 'admin',
            tokenVersion: 0,
            createdAt: Date.now()
        };
        return next;
    });
    dbStore.flush(true);

    console.log('\n================= HeyShow: Khởi tạo lần đầu =================');
    console.log('Tài khoản quản trị đã được tạo với mật khẩu ngẫu nhiên:');
    console.log('  username: admin');
    console.log(`  password: ${initialPassword}`);
    console.log('Hãy đăng nhập /admin_panel và đổi mật khẩu ngay.');
    console.log('============================================================\n');
}

function normalizePresentationRec(rec) {
    if (!rec || typeof rec !== 'object') return false;
    rec.likes = Array.isArray(rec.likes) ? rec.likes : [];
    rec.comments = Array.isArray(rec.comments) ? rec.comments : [];
    rec.views = Number.isFinite(rec.views) ? rec.views : 0;
    if (!rec.replyCounts || typeof rec.replyCounts !== 'object') rec.replyCounts = {};
    return true;
}

function seedSocial() {
    return { presentations: {} };
}

const socialStore = createJsonStore({
    file: SOCIAL_FILE,
    label: 'social.json',
    seed: seedSocial,
    normalize: sanitizeSocial,
    onCorrupt: (err, raw) => preserveCorrupt(SOCIAL_FILE, raw, err)
});

function getSocial() {
    return socialStore.read();
}

function mutateSocial(modifier) {
    return socialStore.mutate(modifier);
}

function sanitizeSocial(social) {
    if (!social || typeof social !== 'object') return;
    if (!social.presentations || typeof social.presentations !== 'object') social.presentations = {};
    for (const [key, rec] of Object.entries(social.presentations)) {
        if (!normalizePresentationRec(rec)) delete social.presentations[key];
    }
}

function getPres(social, key, createdAtFallback) {
    let rec = social.presentations[key];
    if (!rec) {
        rec = social.presentations[key] = {
            title: '',
            createdAt: createdAtFallback || Date.now(),
            views: 0,
            likes: [],
            comments: []
        };
    }
    normalizePresentationRec(rec);
    rec.createdAt = rec.createdAt || createdAtFallback || Date.now();
    return rec;
}

// Tiêu đề hiển thị: heading đầu tiên trong slide, nếu không có thì dùng tên file
function extractTitle(html, fallback) {
    const match = String(html).match(/<\s*(h1|h2|h3)[^>]*>([\s\S]*?)<\s*\/\s*\1\s*>/i);
    if (match) {
        const text = match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text) return text.slice(0, 120);
    }
    return fallback;
}

// Tìm user theo tham chiếu trên URL (chấp nhận cả urlSlug lẫn loginId)
function resolveUserParam(param) {
    if (typeof param !== 'string' || !param) return null;
    const currentDB = getDB();
    for (const [loginId, user] of Object.entries(currentDB.users)) {
        if (loginId === param || slugOf(loginId, user) === param) {
            return { loginId, user };
        }
    }
    return null;
}

// URL ảnh đại diện: file trên đĩa nếu đã tải lên, không thì ảnh dựng từ tên
function avatarUrlFor(loginId, user) {
    if (user && user.avatarFile) return avatars.avatarPathFor(loginId);
    return avatars.fallbackAvatar(user?.fullName || loginId);
}

function authorInfo(loginId, user) {
    return {
        username: loginId,
        urlSlug: slugOf(loginId, user),
        fullName: user?.fullName || '',
        avatar: avatarUrlFor(loginId, user)
    };
}

// Gắn thông tin hiển thị của bình luận (không trả passwordHash ra ngoài).
// parentId != null nghĩa là đây là phản hồi lồng dưới một bình luận khác.
function decorateComment(comment, currentDB) {
    const user = currentDB.users[comment.author] || {};
    return {
        id: comment.id,
        text: comment.text,
        at: comment.at,
        editedAt: comment.editedAt || null,
        deletedAt: comment.deletedAt || null,
        parentId: comment.parentId || null,
        author: authorInfo(comment.author, user)
    };
}

function extractBearer(req) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
    return null;
}

// Xác minh token và đối chiếu tokenVersion trong db: tài khoản vừa đổi mật khẩu,
// đổi quyền hoặc bị xóa sẽ mất hiệu lực ngay thay vì chờ hết hạn 24h.
function verifyToken(token) {
    if (!token) return null;
    let payload;
    try {
        payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
    if (!payload || typeof payload.username !== 'string') return null;

    const record = getDB().users[payload.username];
    if (!record) return null;
    const currentVersion = Number.isFinite(record.tokenVersion) ? record.tokenVersion : 0;
    if ((Number.isFinite(payload.tv) ? payload.tv : 0) !== currentVersion) return null;

    // role lấy từ db chứ không từ token, để quản trị thu quyền có hiệu lực tức thì
    return { username: payload.username, role: record.role, tokenVersion: currentVersion };
}

// Token hợp lệ thì gắn user, không có thì bỏ qua (route công khai nhưng muốn biết "tôi đã like chưa")
function optionalAuth(req, res, next) {
    const user = verifyToken(extractBearer(req));
    if (user) req.user = user;
    next();
}

// JWT Secret: ưu tiên biến môi trường, nếu không có thì sinh ngẫu nhiên và
// lưu vào data/.jwt-secret để token không bị vô hiệu mỗi lần restart trên Termux.
function resolveJwtSecret() {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    try {
        if (fs.existsSync(SECRET_FILE)) {
            const saved = fs.readFileSync(SECRET_FILE, 'utf-8').trim();
            if (saved) return saved;
        }
        const generated = crypto.randomBytes(48).toString('hex');
        fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
        console.log('Đã sinh JWT secret mới tại data/.jwt-secret');
        return generated;
    } catch (err) {
        console.error('Không đọc/ghi được JWT secret. Hãy đặt biến môi trường JWT_SECRET.');
        throw err;
    }
}

const JWT_SECRET = resolveJwtSecret();

function isValidUsername(name) {
    return typeof name === 'string'
        && USERNAME_RE.test(name)
        && !isReservedName(name)
        && !FORBIDDEN_USERNAMES.includes(name);
}

// Slug hiện ngay trong URL công khai: /<slug>/... nên không được trùng với route hệ thống
function isValidSlug(slug) {
    return typeof slug === 'string' && SLUG_RE.test(slug) && !isReservedName(slug);
}

// URL không phân biệt hoa/thường nên "Phuc" và "PHUC" là hai user tranh nhau một địa chỉ.
// Trên điện thoại hệ tệp phân biệt hoa/thường, cả hai thư mục cùng tồn tại êm xuôi, vì vậy
// chỉ có thể chặn ngay từ lúc nhận tên.
// So ba kiểu: tên đăng nhập, tên thư mục trên đĩa và slug suy ra từ tên. Tài khoản cũ
// "Minh Nhật Phan" có thư mục "MinhNhtPhan" và slug "MinhNhtPhan"; "minhnht.phan" ngày nay
// đăng ký được nhưng cho ra đúng hai địa chỉ đó — nếu không chặn thì một người đọc-de được
// bài của người kia.
function nameTaken(db, candidate, exceptLoginId) {
    const values = [String(candidate).toLowerCase(), defaultSlug(candidate).toLowerCase()];
    for (const [loginId, user] of Object.entries(db.users)) {
        if (exceptLoginId && loginId === exceptLoginId) continue;
        const owned = [
            loginId.toLowerCase(),
            folderOf(loginId).toLowerCase(),
            slugOf(loginId, user).toLowerCase()
        ];
        if (values.some(v => owned.includes(v))) return true;
    }
    return false;
}

// Tên file từ URL chỉ được là tên thuần, không chứa đường dẫn
function safeFileName(name) {
    const base = path.basename(String(name || ''));
    return base && base !== '.' && base !== '..' ? base : null;
}

// Tên file nháp phải an toàn khi làm tên thư mục lịch sử và tên slug publish
function isValidDraftName(name) {
    return typeof name === 'string' && /^[\w@.\- ]{1,120}\.html$/i.test(name) && !name.includes('..');
}

// Khởi tạo db + thư mục tài khoản admin
seedDatabase();
const DEFAULT_USER = 'admin';
const defaultUserDir = userDir(DEFAULT_USER);
fs.mkdirSync(path.join(defaultUserDir, 'drafts'), { recursive: true });
fs.mkdirSync(path.join(defaultUserDir, 'published'), { recursive: true });

// Dọn dữ liệu cũ một lần lúc bật server. role/tokenVersion đã được sanitizeDb và
// sanitizeSocial vá sẵn trong bộ nhớ; việc còn lại là chuyển avatar base64 khổng lồ
// trong db.json thành file ảnh.
function migrateLegacyData() {
    const db = getDB();
    let moved = 0;

    for (const [loginId, rec] of Object.entries(db.users)) {
        if (typeof rec.avatar !== 'string' || !rec.avatar.startsWith('data:image/')) continue;
        const dir = userDir(loginId);
        const saved = dir ? avatars.saveFromDataUrl(dir, rec.avatar) : null;
        if (saved) rec.avatarFile = saved.fileName;
        delete rec.avatar;
        moved++;
    }

    // flush(force=true): các thay đổi ở trên ghi thẳng vào object đã cache nên không đi
    // qua mutate(), cờ dirty không bật. Gọi tường minh để cấu trúc đã chuẩn hoá xuống đĩa.
    dbStore.flush(true);
    socialStore.flush(true);
    if (moved) console.log(`[migrate] Đã chuyển ${moved} avatar base64 thành file.`);
}
migrateLegacyData();

// Cảnh báo nếu tài khoản admin vẫn đang dùng mật khẩu mặc định công khai của bản cũ
(function warnDefaultAdmin() {
    try {
        const adminHash = getDB().users?.admin?.passwordHash;
        const legacyDefault = crypto.createHash('sha256').update('admin123').digest('hex');
        if (adminHash === legacyDefault) {
            console.warn('\n[CẢNH BÁO] Tài khoản admin vẫn dùng mật khẩu mặc định "admin123".');
            console.warn('[CẢNH BÁO] Hãy đổi mật khẩu ngay tại /admin_panel trước khi expose ra Internet.\n');
        }
    } catch (e) { /* bỏ qua nếu db chưa sẵn sàng */ }
})();

// --- GIỚI HẠN TẦN SUẤT CHUNG ---
// scrypt tốn CPU nên endpoint đăng nhập công khai cần giới hạn số lần thử; các endpoint
// tốn tiền (AI) và endpoint ghi dữ liệu cũng cần kìm hãm để một tài khoản bị lộ token
// không thể đốt hết API key của quản trị hoặc spam bình luận.
// Server đứng sau Cloudflare Tunnel nên req.ip luôn là local; phải đọc IP thật từ header.
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_FAILURES = 30;

function clientIp(req) {
    return req.get('cf-connecting-ip') || req.get('x-forwarded-for')?.split(',')[0].trim() || req.ip;
}

// Bộ đếm cửa sổ trôi: chỉ giữ trong RAM, đủ cho quy mô cá nhân và không cần Redis.
function createCounter(windowMs, maxCount) {
    const hits = new Map();

    function sweep() {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (now > entry.resetAt) hits.delete(key);
        }
    }
    setInterval(sweep, windowMs).unref();

    return function limiter(req, res, next, keyPrefix = '') {
        const now = Date.now();
        const key = `${keyPrefix}|${clientIp(req) || 'unknown'}|${req.user?.username || '-'}`;
        let entry = hits.get(key);

        if (!entry || now > entry.resetAt) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(key, entry);
        }
        if (entry.count >= maxCount) {
            return res.status(429).json({
                success: false,
                error: `Thao tác quá thường xuyên (tối đa ${maxCount} lần/${Math.round(windowMs / 1000)} giây). Vui lòng thử lại sau.`
            });
        }
        entry.count++;
        next();
    };
}

// Bộ đếm chỉ tính lần THẤT BẠI: người gõ đúng mật khẩu không bao giờ bị khoá.
// Cần thiết vì cả một lớp dùng chung IP của trường sẽ đi qua cùng một tunnel.
const authAttempts = new Map();

function rateLimitAuth(req, res, next) {
    const now = Date.now();
    const key = clientIp(req) || 'unknown';
    let entry = authAttempts.get(key);

    if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + AUTH_WINDOW_MS };
        authAttempts.set(key, entry);
    }
    if (entry.count >= AUTH_MAX_FAILURES) {
        return res.status(429).json({ success: false, error: 'Quá nhiều lần đăng nhập sai. Vui lòng đợi vài phút rồi thử lại.' });
    }

    res.on('finish', () => {
        if (res.statusCode === 401) entry.count++;
    });
    next();
}

// Dọn bộ nhớ định kỳ; unref() để không giữ tiến trình sống
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of authAttempts) {
        if (now > entry.resetAt) authAttempts.delete(key);
    }
}, AUTH_WINDOW_MS).unref();

// API AI tính tiền theo từng request nên chặn trước cả khi đọc key
const limitAi = createCounter(60 * 1000, Number(process.env.AI_MAX_PER_MINUTE || 8));
// Like/comment: đủ cao cho người dùng thật, thấp đủ để chặn spam tự động
const limitWrite = createCounter(60 * 1000, Number(process.env.WRITE_MAX_PER_MINUTE || 20));

// Middleware xác thực JWT
function authenticateToken(req, res, next) {
    const token = extractBearer(req);
    // 401 = "đăng nhập lại đi" (thiếu token, token hết hạn/bị thu hồi).
    // 403 giữ riêng cho lỗi quyền hạn (vượt hạn mức bài, không được quản trị...),
    // để client phân biệt được hai loại và không xoá nhầm token đang còn dùng.
    if (token == null) return res.status(401).json({ success: false, code: 'auth', error: 'Chưa đăng nhập' });

    const user = verifyToken(token);
    if (!user) return res.status(401).json({ success: false, code: 'auth', error: 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại' });

    const dir = userDir(user.username);
    if (!dir) return res.status(401).json({ success: false, code: 'auth', error: 'Tài khoản không còn tồn tại' });

    req.user = user;
    req.userDir = dir;
    next();
}

// Các route /api/admin/* chỉ dành cho role admin
function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Cần quyền quản trị' });
    }
    next();
}

// --- API AUTH & ADMIN ---

// Mật khẩu tự đổi phải đủ mạnh; mật khẩu admin cấp cho học sinh chỉ cần 3 ký tự
// để tiện dùng trong lớp.
const SELF_PASSWORD_MIN = 8;
const ISSUED_PASSWORD_MIN = 3;

function passwordTooShort(password, min) {
    return typeof password !== 'string' || password.length < min;
}

function issueToken(loginId, record) {
    return jwt.sign(
        { username: loginId, role: record.role, tv: Number.isFinite(record.tokenVersion) ? record.tokenVersion : 0 },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

// Đăng nhập
app.post('/api/auth/login', rateLimitAuth, async (req, res) => {
    const { username, password } = req.body;
    const currentDB = getDB();
    const deny = () => res.status(401).json({ success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' });

    if (typeof username !== 'string' || !Object.hasOwn(currentDB.users, username)) {
        return deny();
    }

    const user = currentDB.users[username];
    const { ok, legacy } = await verifyPassword(password, user.passwordHash);
    if (!ok) return deny();

    // Nâng cấp hash cũ (SHA-256 không salt) lên scrypt ngay khi đăng nhập thành công
    if (legacy) {
        const freshHash = await hashPassword(password);
        mutateDB(db => {
            if (db.users[username]) db.users[username].passwordHash = freshHash;
        });
    }

    const fresh = getDB().users[username];
    res.json({
        success: true,
        token: issueToken(username, fresh),
        me: {
            username,
            role: fresh.role,
            ...authorInfo(username, fresh)
        }
    });
});

// Đổi mật khẩu của chính admin đang đăng nhập
app.post('/api/admin/password', authenticateToken, requireAdmin, async (req, res) => {
    const { newPassword } = req.body;
    if (passwordTooShort(newPassword, SELF_PASSWORD_MIN)) {
        return res.status(400).json({ success: false, error: `Mật khẩu phải có ít nhất ${SELF_PASSWORD_MIN} ký tự` });
    }

    const freshHash = await hashPassword(newPassword);
    mutateDB(db => {
        const rec = db.users[req.user.username];
        if (!rec) return;
        rec.passwordHash = freshHash;
    });
    bumpTokenVersion(req.user.username);
    res.json({ success: true, message: 'Đã đổi mật khẩu. Hãy đăng nhập lại.' });
});

// Các nhà cung cấp AI hỗ trợ (cả hai đều dùng chuẩn OpenAI chat completions)
const AI_PROVIDERS = {
    groq: {
        label: 'Groq',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'openai/gpt-oss-120b',
        // Groq gỡ model cũ khá thường xuyên (llama-3.3-70b-versatile chết ngày 16/08/2026):
        // nếu báo model_not_found thì tự thử lần lượt các model còn lại trong danh sách
        fallbackModels: [
            'openai/gpt-oss-20b',
            'meta-llama/llama-4-scout-17b-16e-instruct',
            'meta-llama/llama-4-maverick-17b-128e-instruct',
            'llama-3.1-8b-instant'
        ]
    },
    deepseek: {
        label: 'DeepSeek',
        url: 'https://api.deepseek.com/chat/completions',
        model: 'deepseek-chat'
    }
};
const DEFAULT_AI_PROVIDER = 'groq';

// Trần thời gian và độ dài cho một lượt gọi AI: mã nguồn gửi lên chỉ cần đủ ngữ cảnh,
// còn dài hơn vừa tốn tiền vừa làm model mất trọng tâm.
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 45000);
const AI_MAX_CODE_LEN = 60000;
const AI_MAX_TARGET_LEN = 20000;
const AI_MAX_PROMPT_LEN = 4000;

function clipText(value, maxLen) {
    if (typeof value !== 'string') return '';
    return value.length > maxLen ? value.slice(0, maxLen) : value;
}

// Key AI theo nhà cung cấp; key DeepSeek đời cũ (config.aiApiKey) được migrate tự động
function getAiKeys(db) {
    const stored = (db.config && db.config.aiKeys) || {};
    const keys = {};
    for (const provider of Object.keys(AI_PROVIDERS)) {
        keys[provider] = typeof stored[provider] === 'string' ? stored[provider] : '';
    }
    if (!keys.deepseek && db.config && typeof db.config.aiApiKey === 'string') {
        keys.deepseek = db.config.aiApiKey;
    }
    return keys;
}

// Gọi API chat completions; riêng Groq tự chuyển model dự phòng khi model chính bị gỡ
async function callAiProvider(provider, apiKey, systemPrompt, userPrompt) {
    const info = AI_PROVIDERS[provider];
    const models = [info.model, ...(info.fallbackModels || [])];
    let lastError = null;
    for (const model of models) {
        try {
            // Model Groq hiện tại (gpt-oss) là model suy luận: token dành cho phần reasoning,
            // nên cần trần token cao hơn, giảm effort và không ép temperature
            const body = provider === 'groq'
                ? { model, reasoning_effort: 'low', max_tokens: 4000 }
                : { model, temperature: 0.7, max_tokens: 1500 };
            body.messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ];
            return await axios.post(info.url, body, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                // Không có timeout thì một lần gọi treo sẽ giữ kết nối và chiếm chỗ
                // cho tới khi Cloudflare cắt; trên điện thoại càng dễ dồn nghẽn.
                timeout: AI_TIMEOUT_MS
            });
        } catch (err) {
            if (err.response && err.response.data && err.response.data.error
                && err.response.data.error.code === 'model_not_found' && model !== models[models.length - 1]) {
                console.warn(`[AI] ${info.label}: model ${model} không còn tồn tại, thử model kế tiếp.`);
                lastError = err;
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

// Đọc Config (AI Key) - chỉ admin
app.get('/api/admin/config', authenticateToken, requireAdmin, (req, res) => {
    res.json({ success: true, config: { aiKeys: getAiKeys(getDB()) } });
});

// Lưu Config (AI Key) - chỉ admin
app.post('/api/admin/config', authenticateToken, requireAdmin, (req, res) => {
    const { aiKeys, aiApiKey } = req.body;
    const incoming = aiKeys && typeof aiKeys === 'object' ? aiKeys : (typeof aiApiKey === 'string' ? { deepseek: aiApiKey } : null);
    if (!incoming) {
        return res.status(400).json({ success: false, error: 'API Key không hợp lệ' });
    }
    mutateDB(db => {
        const keys = getAiKeys(db);
        for (const provider of Object.keys(AI_PROVIDERS)) {
            if (typeof incoming[provider] === 'string') keys[provider] = incoming[provider].trim();
        }
        db.config.aiKeys = keys;
        delete db.config.aiApiKey;
    });
    res.json({ success: true });
});

// --- QUẢN LÝ NGƯỜI DÙNG (chỉ admin) ---

function countHtml(dir) {
    try {
        return fs.readdirSync(dir).filter(f => f.endsWith('.html')).length;
    } catch (e) {
        return 0;
    }
}

function listHtml(dir) {
    try {
        return fs.readdirSync(dir).filter(f => f.endsWith('.html'));
    } catch (e) {
        return [];
    }
}

// Một bài trình chiếu = một tên file. Cùng tên vừa có nháp vừa có bản publish vẫn tính là 1.
function presentationNames(dir) {
    if (!dir) return [];
    return [...new Set([...listHtml(path.join(dir, 'drafts')), ...listHtml(path.join(dir, 'published'))])];
}

function presentationCount(dir) {
    return presentationNames(dir).length;
}

// Trả về { allowed, used, max } — dùng trước khi TẠO bài mới (lưu bài đã tồn tại không bị chặn)
function quotaFor(loginId) {
    const record = getDB().users[loginId] || {};
    const max = access.maxPresentations(record.role);
    const used = presentationCount(userDir(loginId));
    return { allowed: access.canAddPresentation(used, record.role), used, max: Number.isFinite(max) ? max : null };
}

function quotaError(loginId) {
    const quota = quotaFor(loginId);
    if (quota.allowed) return null;
    return {
        status: 403,
        body: {
            success: false,
            error: access.limitMessage(getDB().users[loginId]?.role, quota.max),
            quota
        }
    };
}

// Ngày tạo tài khoản: ưu tiên createdAt trong db; tài khoản cũ lấy mtime thư mục user làm xấp xỉ
function userCreatedAt(loginId, user) {
    if (Number.isFinite(user.createdAt)) return user.createdAt;
    const dir = userDir(loginId);
    if (!dir) return null;
    try {
        return fs.statSync(dir).mtimeMs;
    } catch (e) {
        return null;
    }
}

// Danh sách user + số liệu hoạt động; không bao giờ trả passwordHash ra ngoài
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    const currentDB = getDB();
    const social = getSocial();
    const users = Object.entries(currentDB.users).map(([loginId, user]) => {
        const dir = userDir(loginId);
        let views = 0, likes = 0;
        for (const [key, rec] of Object.entries(social.presentations)) {
            if (key.startsWith(`${loginId}/`)) {
                views += rec.views || 0;
                likes += (rec.likes || []).length;
            }
        }
        const max = access.maxPresentations(user.role);
        const presentations = presentationCount(dir);
        return {
            username: loginId,
            role: user.role,
            urlSlug: slugOf(loginId, user),
            email: user.email || '',
            fullName: user.fullName || '',
            phone: user.phone || '',
            avatar: avatarUrlFor(loginId, user),
            createdAt: userCreatedAt(loginId, user),
            drafts: dir ? countHtml(path.join(dir, 'drafts')) : 0,
            published: dir ? countHtml(path.join(dir, 'published')) : 0,
            presentations,
            maxPresentations: Number.isFinite(max) ? max : null,
            quotaReached: !access.canAddPresentation(presentations, user.role),
            views,
            likes
        };
    });
    // Tài khoản mới tạo nhất đứng đầu; admin không bị giới hạn nên luôn còn chỗ
    users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json({ success: true, users, roles: access.roleNames().map(name => ({ name, label: access.ROLE_CAPS[name].label, maxPresentations: Number.isFinite(access.maxPresentations(name)) ? access.maxPresentations(name) : null })) });
});

// Số dư hạn mức của chính người dùng đang đăng nhập (editor hiển thị cảnh báo khi gần hết)
app.get('/api/me/quota', authenticateToken, (req, res) => {
    res.json({ success: true, quota: quotaFor(req.user.username), role: req.user.role });
});

// Tự đổi mật khẩu: tăng tokenVersion để mọi phiên đăng nhập cũ bị vô hiệu.
app.post('/api/me/password', authenticateToken, async (req, res) => {
    const { newPassword } = req.body;
    if (passwordTooShort(newPassword, SELF_PASSWORD_MIN)) {
        return res.status(400).json({ success: false, error: `Mật khẩu phải có ít nhất ${SELF_PASSWORD_MIN} ký tự` });
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
        return res.status(400).json({ success: false, error: 'Mật khẩu cần ít nhất một chữ và một số' });
    }

    const freshHash = await hashPassword(newPassword);
    let found = false;
    mutateDB(db => {
        const rec = db.users[req.user.username];
        if (!rec) return;
        found = true;
        rec.passwordHash = freshHash;
    });
    if (!found) return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
    bumpTokenVersion(req.user.username);
    res.json({ success: true, message: 'Đã đổi mật khẩu. Các phiên đăng nhập cũ sẽ bị thoát.' });
});

// Admin tạo tài khoản (thường cho giáo viên chưa có nick)
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    const { username, password } = req.body;
    const role = req.body.role === undefined ? 'user' : req.body.role;

    if (typeof username !== 'string' || !USERNAME_RE.test(username) || !isValidUsername(username)) {
        return res.status(400).json({
            success: false,
            error: 'Tên đăng nhập phải dài 3-64 ký tự, chỉ gồm chữ cái, số và @ . _ -, không trùng tên hệ thống.'
        });
    }
    if (passwordTooShort(password, ISSUED_PASSWORD_MIN)) {
        return res.status(400).json({ success: false, error: `Mật khẩu phải có ít nhất ${ISSUED_PASSWORD_MIN} ký tự` });
    }
    if (!Object.hasOwn(access.ROLE_CAPS, role)) {
        return res.status(400).json({ success: false, error: `Quyền không hợp lệ (${access.roleNames().join(', ')})` });
    }

    const freshHash = await hashPassword(password);

    if (nameTaken(getDB(), username)) {
        return res.status(400).json({ success: false, error: 'Tên đăng nhập đã tồn tại' });
    }
    mutateDB(db => {
        db.users[username] = {
            passwordHash: freshHash,
            role,
            tokenVersion: 0,
            createdAt: Date.now()
        };
    });

    const newUserDir = userDir(username);
    fs.mkdirSync(path.join(newUserDir, 'drafts'), { recursive: true });
    fs.mkdirSync(path.join(newUserDir, 'published'), { recursive: true });

    res.json({ success: true, message: `Đã tạo tài khoản ${username}`, user: { username, role } });
});

// Đặt lại mật khẩu cho user khác (kể cả admin khác)
app.post('/api/admin/users/:username/password', authenticateToken, requireAdmin, async (req, res) => {
    const { username } = req.params;
    const { newPassword } = req.body;
    if (!Object.hasOwn(getDB().users, username)) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
    }
    if (passwordTooShort(newPassword, ISSUED_PASSWORD_MIN)) {
        return res.status(400).json({ success: false, error: `Mật khẩu phải có ít nhất ${ISSUED_PASSWORD_MIN} ký tự` });
    }

    const freshHash = await hashPassword(newPassword);
    // Đổi mật khẩu thì phiên cũ phải chết: tăng tokenVersion, kể cả khi tự đổi của mình
    mutateDB(db => {
        const rec = db.users[username];
        if (!rec) return;
        rec.passwordHash = freshHash;
    });
    bumpTokenVersion(username);
    res.json({ success: true, message: `Đã đặt lại mật khẩu cho ${username}` });
});

// Đổi quyền trong 4 bậc user/designer/master/admin.
// Chặn tự đổi quyền của chính mình để không vô tình mất quyền quản trị.
app.post('/api/admin/users/:username/role', authenticateToken, requireAdmin, (req, res) => {
    const { username } = req.params;
    const { role } = req.body;
    const currentDB = getDB();
    if (!Object.hasOwn(currentDB.users, username)) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
    }
    if (!Object.hasOwn(access.ROLE_CAPS, role)) {
        return res.status(400).json({ success: false, error: `Quyền không hợp lệ (${access.roleNames().join(', ')})` });
    }
    if (username === req.user.username) {
        return res.status(400).json({ success: false, error: 'Không thể tự đổi quyền của chính mình' });
    }

    const existing = presentationCount(userDir(username));
    const targetMax = access.maxPresentations(role);
    // Hạ quyền một tài khoản đang vượt hạn mức sẽ khiến họ bị khóa chức năng lưu bài
    if (Number.isFinite(targetMax) && existing > targetMax) {
        return res.status(400).json({
            success: false,
            error: `${username} đang có ${existing} bài, nhiều hơn hạn mức ${targetMax} của quyền ${role}. Hãy xóa bớt bài trước khi hạ quyền.`
        });
    }

    mutateDB(db => {
        db.users[username].role = role;
    });
    // Thu hồi token để các phiên cũ mang role cũ không còn hiệu lực
    bumpTokenVersion(username);
    res.json({ success: true, message: `Đã đổi ${username} thành ${access.ROLE_CAPS[role].label}`, role });
});

// Xóa tài khoản: không tự xóa; dọn luôn bản nháp, bài publish và số liệu gallery của user.
app.delete('/api/admin/users/:username', authenticateToken, requireAdmin, (req, res) => {
    const { username } = req.params;
    if (!Object.hasOwn(getDB().users, username)) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
    }
    if (username === req.user.username) {
        return res.status(400).json({ success: false, error: 'Không thể tự xóa tài khoản của chính mình' });
    }

    mutateDB(db => { delete db.users[username]; });

    const dir = userDir(username);
    if (dir) {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { console.warn(`[ADMIN] Không xóa được thư mục ${username}:`, e.message); }
    }

    mutateSocial(social => {
        const prefix = `${username}/`;
        for (const key of Object.keys(social.presentations)) {
            if (key.startsWith(prefix)) delete social.presentations[key];
        }
    });

    res.json({ success: true, message: `Đã xóa tài khoản ${username}` });
});

// --- Đăng ký ---
// Đang bật (giữ hành vi cũ). Đặt REGISTER_ENABLED=false trong server/.env khi muốn
// chỉ admin cấp tài khoản — nên làm trước khi mở rộng ra ngoài trường.
const REGISTRATION_ENABLED = !/^(0|false|no|off|closed)$/i.test(process.env.REGISTER_ENABLED || '');

app.post('/api/auth/register', rateLimitAuth, async (req, res) => {
    if (!REGISTRATION_ENABLED) {
        return res.status(403).json({
            success: false,
            error: 'Đăng ký tài khoản đang tạm khóa. Hãy liên hệ quản trị để được cấp tài khoản.'
        });
    }

    const { username, password } = req.body;

    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
        return res.status(400).json({
            success: false,
            error: 'Tên đăng nhập phải dài 3-64 ký tự, chỉ gồm chữ cái, số và @ . _ -'
        });
    }
    if (!isValidUsername(username)) {
        return res.status(400).json({
            success: false,
            error: 'Tên đăng nhập này được hệ thống giữ riêng, hãy chọn tên khác.'
        });
    }
    // Người đăng ký tự nhập mật khẩu nên áp chuẩn mạnh hơn mật khẩu admin cấp
    if (passwordTooShort(password, SELF_PASSWORD_MIN)) {
        return res.status(400).json({ success: false, error: `Mật khẩu phải có ít nhất ${SELF_PASSWORD_MIN} ký tự` });
    }

    const freshHash = await hashPassword(password);

    if (nameTaken(getDB(), username)) {
        return res.status(400).json({ success: false, error: 'Tên đăng nhập đã tồn tại' });
    }
    mutateDB(db => {
        db.users[username] = {
            passwordHash: freshHash,
            role: 'user',
            tokenVersion: 0,
            createdAt: Date.now()
        };
    });

    // Tạo thư mục cho user mới
    const newUserDir = userDir(username);
    fs.mkdirSync(path.join(newUserDir, 'drafts'), { recursive: true });
    fs.mkdirSync(path.join(newUserDir, 'published'), { recursive: true });

    const record = getDB().users[username];
    res.json({ success: true, token: issueToken(username, record), me: { username, role: record.role, ...authorInfo(username, record) } });
});

// --- API ROUTES (CẦN JWT) ---

// --- API USER PROFILE ---

const PHONE_RE = /^[0-9+\-.()\s]{0,20}$/;
const FULL_NAME_MAX_LEN = 80;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 1. Hồ sơ: quyền, hạn mức và số dư bài viết của chính người dùng
app.get('/api/user/profile', authenticateToken, (req, res) => {
    const currentDB = getDB();
    const user = currentDB.users[req.user.username];
    if (!user) return res.status(404).json({ success: false });

    const quota = quotaFor(req.user.username);
    res.json({
        success: true,
        profile: {
            username: req.user.username,
            urlSlug: slugOf(req.user.username, user),
            role: user.role,
            fullName: user.fullName || '',
            email: user.email || '',
            phone: user.phone || '',
            avatar: avatarUrlFor(req.user.username, user),
            quota,
            maxPresentations: quota.max
        }
    });
});

// 2. Cập nhật hồ sơ. Avatar được cất thành file riêng thay vì base64 trong db.json.
app.post('/api/user/profile', authenticateToken, async (req, res) => {
    const { urlSlug, email, password, avatarBase64, fullName, phone } = req.body;
    const loginId = req.user.username;
    if (!Object.hasOwn(getDB().users, loginId)) return res.status(404).json({ success: false });

    if (urlSlug !== undefined && urlSlug !== '') {
        const currentSlug = slugOf(loginId, getDB().users[loginId]);
        // Giữ nguyên slug hiện có: tài khoản cũ có thể đang dùng slug không đạt chuẩn mới,
        // không nên bắt họ đổi chỉ vì bấm "Lưu hồ sơ".
        if (urlSlug !== currentSlug) {
            if (!isValidSlug(urlSlug)) {
                return res.status(400).json({
                    success: false,
                    error: 'Username URL phải dài 3-40 ký tự, chỉ gồm chữ cái, số, gạch ngang và gạch dưới.'
                });
            }
            const clash = nameTaken(getDB(), urlSlug, loginId);
            if (clash) return res.status(400).json({ success: false, error: 'Username này đã được sử dụng.' });

            mutateDB(db => { db.users[loginId].urlSlug = urlSlug; });
        }
    }

    if (fullName !== undefined) {
        if (typeof fullName !== 'string' || fullName.trim().length > FULL_NAME_MAX_LEN) {
            return res.status(400).json({ success: false, error: `Họ tên tối đa ${FULL_NAME_MAX_LEN} ký tự` });
        }
        const value = fullName.trim();
        mutateDB(db => { db.users[loginId].fullName = value; });
    }

    if (phone !== undefined) {
        if (typeof phone !== 'string' || !PHONE_RE.test(phone.trim())) {
            return res.status(400).json({ success: false, error: 'Số điện thoại chỉ gồm số, dấu +, -, khoảng trắng (tối đa 20 ký tự)' });
        }
        const value = phone.trim();
        mutateDB(db => { db.users[loginId].phone = value; });
    }

    if (email !== undefined) {
        const value = typeof email === 'string' ? email.trim() : '';
        if (value && (!EMAIL_RE.test(value) || value.length > 254)) {
            return res.status(400).json({ success: false, error: 'Email không hợp lệ' });
        }
        mutateDB(db => { db.users[loginId].email = value; });
    }

    // Chuỗi rỗng là yêu cầu XÓA avatar, vì vậy phải kiểm tra !== undefined chứ
    // không dùng if (avatarBase64) — rỗng là falsy và nhánh xóa sẽ không bao giờ chạy.
    if (avatarBase64 !== undefined) {
        if (avatarBase64 === '') {
            avatars.removeAvatar(req.userDir);
            mutateDB(db => { delete db.users[loginId].avatarFile; });
        } else if (typeof avatarBase64 !== 'string') {
            return res.status(400).json({ success: false, error: 'Ảnh đại diện phải là chuỗi data URL' });
        } else {
            const saved = avatars.saveFromDataUrl(req.userDir, avatarBase64);
            if (!saved) {
                return res.status(400).json({ success: false, error: 'Ảnh đại diện không hợp lệ (PNG/JPG/GIF/WebP, tối đa ~1MB)' });
            }
            mutateDB(db => {
                delete db.users[loginId].avatar;
                db.users[loginId].avatarFile = saved.fileName;
            });
        }
    }

    if (password) {
        if (passwordTooShort(password, SELF_PASSWORD_MIN)) {
            return res.status(400).json({ success: false, error: `Mật khẩu phải có ít nhất ${SELF_PASSWORD_MIN} ký tự` });
        }
        const freshHash = await hashPassword(password);
        // Đổi mật khẩu phải vô hiệu các phiên đang mở
        mutateDB(db => {
            const rec = db.users[loginId];
            if (rec) rec.passwordHash = freshHash;
        });
        bumpTokenVersion(loginId);
    }

    const fresh = getDB().users[loginId];
    res.json({
        success: true,
        message: 'Đã cập nhật hồ sơ',
        profile: {
            username: loginId,
            urlSlug: slugOf(loginId, fresh),
            role: fresh.role,
            fullName: fresh.fullName || '',
            email: fresh.email || '',
            phone: fresh.phone || '',
            avatar: avatarUrlFor(loginId, fresh)
        }
    });
});

// Ảnh đại diện phục vụ từ file, cho phép cache dài vì tên file gắn với timestamp
app.get('/api/avatar/:user', (req, res) => {
    const found = resolveUserParam(req.params.user);
    const dir = found ? userDir(found.loginId) : null;
    const image = dir ? avatars.readAvatar(dir) : null;
    if (!image) return res.status(404).json({ success: false, error: 'Không có ảnh đại diện' });

    res.setHeader('Content-Type', image.mime);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(image.buffer);
});

// --- API FILES ---

// Giới hạn kích thước bản nháp: JSON body đã chặn ở 5mb, đây là trần tính theo từng file
const MAX_DRAFT_BYTES = 2 * 1024 * 1024;

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

// Ghi nháp an toàn: lưu nội dung cũ thành một phiên bản (giữ 5 bản) rồi ghi kiểu atomic.
// Bản cũ ghi thẳng bằng writeFileSync nên mất điện giữa chừng sẽ hỏng luôn bài đang soạn.
function writeDraft(req, fileName, content) {
    const draftDir = path.join(req.userDir, 'drafts');
    const filePath = path.join(draftDir, fileName);

    if (!fs.existsSync(draftDir)) fs.mkdirSync(draftDir, { recursive: true });

    let previous = null;
    try { previous = fs.readFileSync(filePath, 'utf-8'); } catch (err) { /* file mới */ }

    const snapshot = previous !== null && previous !== content
        ? history.snapshot(req.userDir, fileName, previous)
        : null;

    atomicWrite(filePath, content);
    return { snapshot, isNew: previous === null };
}

// URL trình chiếu công khai. /show/ là vùng được cô lập (CSP sandbox) để HTML do
// người dùng viết không đọc được token của editor; đường dẫn cũ /<slug>/<file> vẫn
// còn hiệu lực vì nhiều link đã chia sẻ.
function showUrl(urlSlug, fileName) {
    return `/show/${encodeURIComponent(urlSlug)}/${encodeURIComponent(fileName)}`;
}

// Chọn tên nháp trống chưa ai dùng, thêm -2, -3 khi trùng (dùng cho luồng import)
function reserveDraftName(req, base) {
    const draftDir = path.join(req.userDir, 'drafts');
    fs.mkdirSync(draftDir, { recursive: true });

    let fileName = `${base}.html`;
    let n = 2;
    while (fs.existsSync(path.join(draftDir, fileName)) || fs.existsSync(path.join(req.userDir, 'published', fileName))) {
        fileName = `${base}-${n}.html`;
        n++;
    }
    return fileName;
}

// 1. Lấy danh sách các bản nháp
app.get('/api/files', authenticateToken, (req, res) => {
    try {
        const files = listHtml(path.join(req.userDir, 'drafts'));
        res.json({ success: true, files, quota: quotaFor(req.user.username) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Đọc nội dung 1 bản nháp
app.get('/api/files/:name', authenticateToken, (req, res) => {
    const fileName = safeFileName(req.params.name);
    if (!fileName) return res.status(400).json({ success: false, error: 'Tên file không hợp lệ' });

    const filePath = path.join(req.userDir, 'drafts', fileName);

    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({ success: true, content });
    } else {
        res.status(404).json({ success: false, error: 'File not found' });
    }
});

// 3. Tạo/Cập nhật bản nháp (Save). Chỉ bài HOÀN TOÀN MỚI mới bị tính hạn mức.
app.post('/api/files/:name', authenticateToken, (req, res) => {
    const fileName = safeFileName(req.params.name);
    if (!fileName || !isValidDraftName(fileName)) {
        return res.status(400).json({ success: false, error: 'Tên file không hợp lệ (tối đa 120 ký tự, kết thúc bằng .html)' });
    }

    const { content } = req.body;
    if (typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Nội dung không hợp lệ' });
    }
    if (Buffer.byteLength(content) > MAX_DRAFT_BYTES) {
        return res.status(413).json({ success: false, error: 'Bản nháp vượt quá 2MB. Hãy bớt ảnh nhúng dạng base64 ra ngoài.' });
    }

    const exists = fs.existsSync(path.join(req.userDir, 'drafts', fileName))
        || fs.existsSync(path.join(req.userDir, 'published', fileName));
    if (!exists) {
        const blocked = quotaError(req.user.username);
        if (blocked) return res.status(blocked.status).json(blocked.body);
    }

    try {
        const { snapshot } = writeDraft(req, fileName, content);
        res.json({
            success: true,
            message: 'Saved successfully',
            version: snapshot ? snapshot.name : null,
            quota: quotaFor(req.user.username)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Danh sách phiên bản đã lưu của một bản nháp (tối đa 5, mới nhất trước)
app.get('/api/files/:name/history', authenticateToken, (req, res) => {
    const fileName = safeFileName(req.params.name);
    if (!fileName) return res.status(400).json({ success: false, error: 'Tên file không hợp lệ' });

    const versions = history.listVersions(req.userDir, fileName)
        .map(name => history.versionInfo(req.userDir, fileName, name));
    res.json({ success: true, versions, maxVersions: history.MAX_VERSIONS });
});

// 5. Xem một phiên bản cụ thể (để so sánh trước khi khôi phục)
app.get('/api/files/:name/history/:version', authenticateToken, (req, res) => {
    const fileName = safeFileName(req.params.name);
    const content = history.readVersion(req.userDir, fileName, req.params.version);
    if (!fileName || content === null) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy phiên bản' });
    }
    res.json({ success: true, content });
});

// 6. Khôi phục một phiên bản. Nội dung hiện tại cũng được cất lại thành phiên bản,
// nên khôi phục nhầm vẫn quay về được.
app.post('/api/files/:name/history/:version/restore', authenticateToken, (req, res) => {
    const fileName = safeFileName(req.params.name);
    const content = history.readVersion(req.userDir, fileName, req.params.version);
    if (!fileName || content === null) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy phiên bản' });
    }

    try {
        const { snapshot } = writeDraft(req, fileName, content);
        res.json({ success: true, content, version: snapshot ? snapshot.name : null });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 7. Xóa bản nháp (kèm luôn bản đã publish và dữ liệu gallery của bài)
app.delete('/api/files/:name', authenticateToken, (req, res) => {
    const fileName = safeFileName(req.params.name);
    if (!fileName) return res.status(400).json({ success: false, error: 'Tên file không hợp lệ' });

    try {
        const filePath = path.join(req.userDir, 'drafts', fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        const pubPath = path.join(req.userDir, 'published', fileName);
        if (fs.existsSync(pubPath)) {
            fs.unlinkSync(pubPath);
        }

        // Dọn luôn dữ liệu gallery và lịch sử phiên bản của bài đã xoá
        mutateSocial(social => { delete social.presentations[presKey(req.user.username, fileName)]; });
        history.dropHistories(req.userDir, [fileName]);

        res.json({ success: true, message: 'Deleted successfully', quota: quotaFor(req.user.username) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Guard CSS và shim sessionStorage cho mọi file slide định nghĩa ở slide-parts.js —
// cùng nguồn với script vá những bài đã publish từ trước (scripts/repair-published-slides.cjs).

// Dựng file HTML hoàn chỉnh (Reveal.js) từ nội dung nháp — dùng cho cả publish và export
function buildFullHtml(fileName, rawHtml) {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(fileName)} - HeyShow</title>
    ${REVEAL_CSS}
    <style>
        /* Chế độ thumbnail của gallery (?embed=1): ẩn điều khiển để ảnh thu nhỏ gọn mắt */
        .heyshow-embed .reveal .controls,
        .heyshow-embed .reveal .progress,
        .heyshow-embed .slide-number { display: none !important; }
${SLIDE_HEAD_GUARD}
    </style>
</head>
<body>
    <div class="reveal">
        <div class="slides">
            ${rawHtml}
        </div>
    </div>${SLIDE_STORAGE_SHIM}
    ${REVEAL_JS}
    ${REVEAL_MATH_JS}
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            if (new URLSearchParams(location.search).has('embed')) {
                document.documentElement.classList.add('heyshow-embed');
            }

            // Xử lý thẻ section-master
            const masters = document.querySelectorAll('section-master');
            let masterContent = '';
            masters.forEach(m => {
                masterContent += m.innerHTML;
                m.remove();
            });

            if (masterContent) {
                const sections = document.querySelectorAll('.reveal .slides section');
                sections.forEach(sec => {
                    // Chỉ chèn vào các section không chứa section con (leaf section)
                    if (sec.querySelectorAll('section').length === 0) {
                        sec.insertAdjacentHTML('afterbegin', masterContent);
                    }
                });
            }

            Reveal.initialize({
                hash: true,
                slideNumber: true,
                ${REVEAL_KATEX_OPTS},
                plugins: [ RevealMath.KaTeX ] // Hỗ trợ công thức Toán học
            });
        });
    </script>
</body>
</html>`;
}

// 8. Publish bản nháp
app.post('/api/files/:name/publish', authenticateToken, (req, res) => {
    const fileName = safeFileName(req.params.name);
    if (!fileName) return res.status(400).json({ success: false, error: 'Tên file không hợp lệ' });

    const userPubDir = path.join(req.userDir, 'published');
    const draftPath = path.join(req.userDir, 'drafts', fileName);
    const pubPath = path.join(userPubDir, fileName);

    if (!fs.existsSync(draftPath)) {
        return res.status(404).json({ success: false, error: 'Draft not found' });
    }

    try {
        if (!fs.existsSync(userPubDir)) fs.mkdirSync(userPubDir, { recursive: true });

        const rawHtml = fs.readFileSync(draftPath, 'utf-8');
        const fullHtml = buildFullHtml(fileName, rawHtml);

        atomicWrite(pubPath, fullHtml);

        // Cập nhật metadata cho gallery: tiêu đề, ngày đăng/cập nhật
        mutateSocial(social => {
            const rec = getPres(social, presKey(req.user.username, fileName), fileMtime(pubPath));
            rec.title = extractTitle(rawHtml, fileName.replace(/\.html$/i, ''));
            rec.updatedAt = Date.now();
        });

        const urlSlug = slugOf(req.user.username, getDB().users[req.user.username]);

        res.json({
            success: true,
            message: 'Published successfully',
            url: showUrl(urlSlug, fileName)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- API DASHBOARD (quản lý trình chiếu của từng user) ---

// 9. Đổi tên file (cả nháp lẫn bản đã publish, giữ nguyên likes/comments)
app.post('/api/files/:name/rename', authenticateToken, (req, res) => {
    const fileName = safeFileName(req.params.name);
    let newName = safeFileName(req.body?.newName || '');
    if (!fileName || !newName) return res.status(400).json({ success: false, error: 'Tên file không hợp lệ' });
    if (!isValidDraftName(newName)) {
        return res.status(400).json({ success: false, error: 'Tên file mới không hợp lệ (tối đa 120 ký tự, kết thúc bằng .html)' });
    }
    if (!newName.toLowerCase().endsWith('.html')) newName += '.html';
    if (newName === fileName) return res.json({ success: true, newName });

    const draftDir = path.join(req.userDir, 'drafts');
    const pubDir = path.join(req.userDir, 'published');
    const oldDraft = path.join(draftDir, fileName);
    const oldPub = path.join(pubDir, fileName);

    if (!fs.existsSync(oldDraft) && !fs.existsSync(oldPub)) {
        return res.status(404).json({ success: false, error: 'File not found' });
    }
    if (fs.existsSync(path.join(draftDir, newName)) || fs.existsSync(path.join(pubDir, newName))) {
        return res.status(400).json({ success: false, error: 'Đã có file tên này' });
    }

    try {
        if (fs.existsSync(oldDraft)) fs.renameSync(oldDraft, path.join(draftDir, newName));
        if (fs.existsSync(oldPub)) fs.renameSync(oldPub, path.join(pubDir, newName));

        // Dời record gallery sang tên mới để không mất views/likes/comments
        mutateSocial(social => {
            const oldKey = presKey(req.user.username, fileName);
            const newKey = presKey(req.user.username, newName);
            if (social.presentations[oldKey]) {
                social.presentations[newKey] = social.presentations[oldKey];
                delete social.presentations[oldKey];
            }
        });

        // Lịch sử phiên bản cũng phải đi theo tên mới
        const oldHistory = history.historyDir(req.userDir, fileName);
        const newHistory = history.historyDir(req.userDir, newName);
        if (fs.existsSync(oldHistory)) {
            try { fs.renameSync(oldHistory, newHistory); } catch (err) { /* không mất bài nếu lỡ */ }
        }

        res.json({ success: true, newName });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 10. Gỡ publish — bài quay về dạng nháp để tiếp tục biên tập (giữ likes/comments)
app.post('/api/files/:name/unpublish', authenticateToken, (req, res) => {
    const fileName = safeFileName(req.params.name);
    if (!fileName) return res.status(400).json({ success: false, error: 'Tên file không hợp lệ' });

    const pubPath = path.join(req.userDir, 'published', fileName);
    if (!fs.existsSync(pubPath)) {
        return res.status(400).json({ success: false, error: 'Bài chưa được publish' });
    }

    try {
        fs.unlinkSync(pubPath);
        res.json({ success: true, message: 'Đã chuyển về bản nháp' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 8. Export HTML hoàn chỉnh (tải về chạy offline). Bài chưa publish thì dựng từ nháp.
app.get('/api/files/:name/export', authenticateToken, (req, res) => {
    const fileName = safeFileName(req.params.name);
    if (!fileName || !fileName.toLowerCase().endsWith('.html')) {
        return res.status(400).json({ success: false, error: 'Tên file không hợp lệ' });
    }

    const pubPath = path.join(req.userDir, 'published', fileName);
    const draftPath = path.join(req.userDir, 'drafts', fileName);

    let content = null;
    if (fs.existsSync(pubPath)) {
        content = fs.readFileSync(pubPath, 'utf-8');
    } else if (fs.existsSync(draftPath)) {
        content = buildFullHtml(fileName, fs.readFileSync(draftPath, 'utf-8'));
    } else {
        return res.status(404).json({ success: false, error: 'File not found' });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.send(content);
});

// --- API IMPORT PPTX ---
// Hai bước: analyze (tải lên, báo cáo những gì import được/không) rồi người dùng
// bấm Import => convert (file được gửi lại từ trình duyệt, server không lưu tạm).

const pptx = require('./pptx');
const pptxRaw = express.raw({ type: 'application/octet-stream', limit: '12mb' });

function readPptxBuffer(req, res) {
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
        res.status(400).json({ success: false, error: 'File trống hoặc không hợp lệ' });
        return null;
    }
    if (buf.length > 10 * 1024 * 1024) {
        res.status(413).json({ success: false, error: 'File vượt quá 10MB' });
        return null;
    }
    if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
        res.status(400).json({ success: false, error: 'Đây không phải file .pptx hợp lệ' });
        return null;
    }
    return buf;
}

app.post('/api/import/pptx/analyze', authenticateToken, pptxRaw, async (req, res) => {
    const buf = readPptxBuffer(req, res);
    if (!buf) return;
    try {
        const analysis = await pptx.analyzePptx(buf);
        res.json({ success: true, report: pptx.buildReport(analysis) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.post('/api/import/pptx/convert', authenticateToken, pptxRaw, async (req, res) => {
    const buf = readPptxBuffer(req, res);
    if (!buf) return;
    try {
        const analysis = await pptx.analyzePptx(buf);
        const orig = typeof req.query.orig === 'string' ? req.query.orig : 'presentation.pptx';
        const html = pptx.buildDraftHtml(analysis, orig);
        const base = pptx.draftNameFrom(orig);

        // Import tạo bài mới nên cũng chịu hạn mức của quyền hiện tại
        const blocked = quotaError(req.user.username);
        if (blocked) return res.status(blocked.status).json(blocked.body);

        const fileName = reserveDraftName(req, base);
        atomicWrite(path.join(req.userDir, 'drafts', fileName), html);
        res.json({ success: true, fileName, slideCount: analysis.slides.length, quota: quotaFor(req.user.username) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Import văn bản: Markdown (.md) và LaTeX beamer (.tex) -> dùng lại cùng luồng analyze/convert.
const textimport = require('./textimport');
const textRaw = express.raw({ type: 'application/octet-stream', limit: '12mb' });

function readTextBuffer(req, res) {
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
        res.status(400).json({ success: false, error: 'File trống hoặc không hợp lệ' });
        return null;
    }
    if (buf.length > 5 * 1024 * 1024) {
        res.status(413).json({ success: false, error: 'File văn bản vượt quá 5MB' });
        return null;
    }
    return buf;
}

app.post('/api/import/text/analyze', authenticateToken, textRaw, (req, res) => {
    const buf = readTextBuffer(req, res);
    if (!buf) return;
    const orig = typeof req.query.orig === 'string' ? req.query.orig : 'import.md';
    const kind = textimport.detectKind(orig);
    if (!kind) return res.status(400).json({ success: false, error: 'Không nhận diện được loại file (chỉ hỗ trợ .md và .tex)' });
    try {
        const analysis = textimport.analyze(buf.toString('utf-8'), kind);
        res.json({ success: true, report: pptx.buildReport(analysis) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.post('/api/import/text/convert', authenticateToken, textRaw, (req, res) => {
    const buf = readTextBuffer(req, res);
    if (!buf) return;
    const orig = typeof req.query.orig === 'string' ? req.query.orig : 'import.md';
    const kind = textimport.detectKind(orig);
    if (!kind) return res.status(400).json({ success: false, error: 'Không nhận diện được loại file (chỉ hỗ trợ .md và .tex)' });
    try {
        const analysis = textimport.analyze(buf.toString('utf-8'), kind);
        const html = textimport.buildDraftHtml(analysis, orig);
        const base = pptx.draftNameFrom(orig);

        // Import tạo bài mới nên cũng chịu hạn mức của quyền hiện tại
        const blocked = quotaError(req.user.username);
        if (blocked) return res.status(blocked.status).json(blocked.body);

        const fileName = reserveDraftName(req, base);
        atomicWrite(path.join(req.userDir, 'drafts', fileName), html);
        res.json({ success: true, fileName, slideCount: analysis.slides.length, quota: quotaFor(req.user.username) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// 11. Dữ liệu trang Dashboard: danh sách bài của tôi + hoạt động (likes/comments) gần đây
app.get('/api/dashboard', authenticateToken, (req, res) => {
    try {
        const loginId = req.user.username;
        const currentDB = getDB();
        const user = currentDB.users[loginId] || {};
        const social = getSocial();
        const urlSlug = slugOf(loginId, user);

        const draftDir = path.join(req.userDir, 'drafts');
        const pubDir = path.join(req.userDir, 'published');
        const drafts = listHtml(draftDir);
        const pubs = listHtml(pubDir);

        const items = [];
        for (const fileName of new Set([...drafts, ...pubs])) {
            const rec = social.presentations[presKey(loginId, fileName)];
            const published = pubs.includes(fileName);
            const hasDraft = drafts.includes(fileName);
            const updatedAt = Math.max(
                hasDraft ? fileMtime(path.join(draftDir, fileName)) : 0,
                published ? fileMtime(path.join(pubDir, fileName)) : 0
            );
            items.push({
                fileName,
                title: rec?.title || fileName.replace(/\.html$/i, ''),
                status: published ? 'published' : 'draft',
                hasDraft,
                versions: history.listVersions(req.userDir, fileName).length,
                url: published ? showUrl(urlSlug, fileName) : null,
                views: rec?.views || 0,
                likes: rec?.likes?.length || 0,
                commentCount: visibleComments(rec).length,
                updatedAt
            });
        }
        items.sort((a, b) => b.updatedAt - a.updatedAt);

        // Hoạt động gần đây: bình luận + lượt thích trên các bài của tôi
        const activity = [];
        const prefix = `${loginId}/`;
        for (const [key, rec] of Object.entries(social.presentations)) {
            if (!key.startsWith(prefix)) continue;
            const fileName = key.slice(prefix.length);
            const title = rec.title || fileName.replace(/\.html$/i, '');

            for (const c of (Array.isArray(rec.comments) ? rec.comments : [])) {
                if (c.deletedAt) continue;
                activity.push({
                    type: 'comment', file: fileName, title, at: c.at,
                    text: c.text,
                    isReply: Boolean(c.parentId),
                    actor: authorInfo(c.author, currentDB.users[c.author] || {})
                });
            }
            const likeTimes = rec.likeTimes || {};
            for (const [liker, at] of Object.entries(likeTimes)) {
                activity.push({
                    type: 'like', file: fileName, title, at,
                    actor: authorInfo(liker, currentDB.users[liker] || {})
                });
            }
        }
        activity.sort((a, b) => b.at - a.at);

        res.json({
            success: true,
            me: { ...authorInfo(loginId, user), role: user.role || 'user' },
            items,
            activity: activity.slice(0, 20),
            quota: quotaFor(loginId)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Thống kê tổng cho trang chủ (công khai)
app.get('/api/stats', (req, res) => {
    try {
        const currentDB = getDB();
        const social = getSocial();
        let presentations = 0, views = 0, likes = 0, comments = 0;

        for (const loginId of Object.keys(currentDB.users)) {
            const ownerDir = userDir(loginId);
            if (!ownerDir) continue;
            const files = listHtml(path.join(ownerDir, 'published'));
            presentations += files.length;
            for (const fileName of files) {
                const rec = social.presentations[presKey(loginId, fileName)];
                if (!rec) continue;
                views += rec.views || 0;
                likes += (rec.likes || []).length;
                comments += (rec.comments || []).filter(c => !c.deletedAt).length;
            }
        }

        res.json({ success: true, stats: { presentations, views, likes, comments, users: Object.keys(currentDB.users).length } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- API AI (GROQ / DEEPSEEK) ---

// Cho editor biết nhà cung cấp nào đã có key để bật/tắt lựa chọn
app.get('/api/ai/providers', authenticateToken, (req, res) => {
    const keys = getAiKeys(getDB());
    const providers = {};
    for (const provider of Object.keys(AI_PROVIDERS)) {
        providers[provider] = { label: AI_PROVIDERS[provider].label, configured: Boolean(keys[provider]) };
    }
    res.json({ success: true, default: DEFAULT_AI_PROVIDER, providers });
});

// 4 vị trí chèn code mà editor hỗ trợ; mỗi vị trí cần một dạng output khác nhau từ AI
const AI_POSITIONS = {
    master: `Code của bạn sẽ được chèn vào BÊN TRONG thẻ <section-master> — phần nội dung dùng chung tự động xuất hiện trên MỌI slide.
- Hãy trả về các đoạn HTML/CSS dùng chung (ví dụ: <style> thiết lập màu nền/font chữ/kích thước tiêu đề, <header>, <footer>, logo...).
- TUYỆT ĐỐI KHÔNG trả về thẻ <section> hay <section-master> (thẻ mở/đóng đã có sẵn trong file).
- Nếu được yêu cầu "thiết lập" hay "cấu hình" giao diện slide, hãy dùng thẻ <style> với các selector CSS phù hợp.`,
    current: `Code của bạn sẽ được chèn vào BÊN TRONG slide hiện tại (thẻ <section> đang chứa con trỏ).
- Hãy trả về nội dung HTML của slide (tiêu đề, đoạn văn, danh sách, bảng, ảnh, công thức...) KHÔNG bọc trong thẻ <section>.
- KHÔNG trả về <style> toàn cục hay nội dung dùng chung — chỉ trả về nội dung hiển thị trên slide này.`,
    next: `Code của bạn sẽ được chèn thành slide mới ngay SAU slide hiện tại.
- Hãy trả về MỘT thẻ <section>...</section> hoàn chỉnh (nhiều thẻ chỉ khi người dùng yêu cầu nhiều slide).`,
    last: `Code của bạn sẽ được chèn vào CUỐI FILE thành slide mới.
- Hãy trả về MỘT HOẶC NHIỀU thẻ <section>...</section> hoàn chỉnh.`
};

app.post('/api/ai/generate', authenticateToken, limitAi, async (req, res) => {
    const { prompt } = req.body;
    const provider = Object.hasOwn(AI_PROVIDERS, req.body.provider) ? req.body.provider : DEFAULT_AI_PROVIDER;
    const apiKey = getAiKeys(getDB())[provider];

    if (!apiKey) {
        return res.status(400).json({ success: false, error: `Chưa cấu hình API Key cho ${AI_PROVIDERS[provider].label}. Hãy vào trang Admin để cài đặt.` });
    }

    if (typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ success: false, error: 'Yêu cầu không hợp lệ' });
    }
    if (prompt.length > AI_MAX_PROMPT_LEN) {
        return res.status(400).json({ success: false, error: `Mô tả yêu cầu tối đa ${AI_MAX_PROMPT_LEN} ký tự` });
    }

    const position = Object.hasOwn(AI_POSITIONS, req.body.mode) ? req.body.mode : 'last';
    // Toàn bộ file và slide chứa con trỏ chỉ cần đủ để model hiểu ngữ cảnh
    const currentCode = clipText(req.body.currentCode, AI_MAX_CODE_LEN);
    const targetCode = clipText(req.body.targetCode, AI_MAX_TARGET_LEN);

    try {
        const systemPrompt = `Bạn là trợ lý viết code HTML cho HeyShow — ứng dụng tạo bài trình chiếu dựa trên thư viện Reveal.js.

Cấu trúc một file HeyShow:
- <section-master>...</section-master> (không bắt buộc, tối đa một thẻ): chứa nội dung dùng chung được hệ thống TỰ ĐỘNG chèn vào đầu MỌI slide khi trình chiếu (header, footer, <style> thiết lập chung...). Bản thân <section-master> KHÔNG phải là một slide.
- <section>...</section>: mỗi thẻ là một slide. <section> lồng bên trong <section> tạo thành nhóm slide dọc.

Quy tắc chung:
- CHỈ TRẢ VỀ code HTML thuần (plain text): KHÔNG <html>/<head>/<body>, KHÔNG markdown backticks (\`\`\`html), KHÔNG giải thích.
- Có thể dùng class/attribute của Reveal.js (class "fragment" để hiện dần, data-background-color...).
- Có thể dùng công thức KaTeX trong $$...$$ (khối) hoặc $...$ (dòng). Trong $...$ CHỈ đặt ký hiệu Toán học: chữ Việt phải nằm ngoài công thức, hoặc bọc bằng \\text{...}.
- Code đặt trong <pre><code> thì mọi dấu < và & phải viết thành &lt; và &amp; (kể cả toán tử so sánh như a < b), nếu không trình duyệt coi là thẻ HTML.
- Code phải cân bằng thẻ mở/thẻ đóng.

${AI_POSITIONS[position]}`;

        let userPrompt = `Code hiện tại của tôi:\n${currentCode}\n\n`;
        if (targetCode.trim()) {
            const contextLabel = position === 'master' ? 'Nội dung <section-master> hiện tại' : 'Slide hiện tại của tôi';
            userPrompt += `${contextLabel}:\n${targetCode}\n\n`;
        }
        userPrompt += `Yêu cầu của tôi: ${prompt}`;

        const response = await callAiProvider(provider, apiKey, systemPrompt, userPrompt);

        const content = response.data?.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) {
            return res.status(502).json({ success: false, error: `Nhà cung cấp ${AI_PROVIDERS[provider].label} không trả về nội dung nào. Hãy thử lại.` });
        }

        let generatedHtml = content.trim();

        // Cố gắng loại bỏ markdown backticks nếu AI vẫn ngoan cố sinh ra
        if (generatedHtml.startsWith('```')) {
            const lines = generatedHtml.split('\n');
            lines.shift(); // Xóa dòng ```html
            if (lines[lines.length - 1].startsWith('```')) lines.pop(); // Xóa dòng ```
            generatedHtml = lines.join('\n').trim();
        }

        res.json({ success: true, result: generatedHtml });

    } catch (error) {
        console.error("AI API Error:", provider, error.response ? error.response.data : error.message);
        const remote = error.response && error.response.data && error.response.data.error;
        const detail = remote && remote.message ? ` Chi tiết: ${remote.message}` : '';
        const timedOut = error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '');
        const status = error.response ? 502 : 500;
        res.status(status).json({
            success: false,
            error: timedOut
                ? `Nhà cung cấp ${AI_PROVIDERS[provider].label} phản hồi quá chậm nên đã bị hủy. Hãy thu ngắn yêu cầu rồi thử lại.`
                : `Lỗi khi gọi AI (${AI_PROVIDERS[provider].label}). Vui lòng kiểm tra lại API Key.${detail}`
        });
    }
});

// --- API GALLERY ---

// Định danh bài trình chiếu từ tham số URL; trả 404 nếu không tồn tại
function resolvePresentation(req, res) {
    const found = resolveUserParam(req.params.user);
    const fileName = safeFileName(req.params.file);

    if (!found || !fileName || !fileName.endsWith('.html')) {
        res.status(404).json({ success: false, error: 'Không tìm thấy bài trình chiếu' });
        return null;
    }

    const ownerDir = userDir(found.loginId);
    const pubPath = ownerDir ? path.join(ownerDir, 'published', fileName) : null;
    if (!pubPath || !fs.existsSync(pubPath)) {
        res.status(404).json({ success: false, error: 'Không tìm thấy bài trình chiếu' });
        return null;
    }

    return { loginId: found.loginId, user: found.user, fileName, pubPath };
}

// Danh sách mọi bài đã publish để dựng lưới cards
const GALLERY_PAGE_SIZE = 12;

// Bỏ dấu + hạ chữ thường để tìm "dao ham" vẫn khớp "ĐẠO HÀM"
function foldText(s) {
    return String(s).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');
}

app.get('/api/gallery', optionalAuth, (req, res) => {
    try {
        const social = getSocial();
        const currentDB = getDB();
        const me = req.user?.username;
        const items = [];

        for (const [loginId, user] of Object.entries(currentDB.users)) {
            const ownerDir = userDir(loginId);
            if (!ownerDir) continue;

            const pubDir = path.join(ownerDir, 'published');
            const files = listHtml(pubDir);

            for (const fileName of files) {
                const key = presKey(loginId, fileName);
                const rec = getPres(social, key, fileMtime(path.join(pubDir, fileName)));
                items.push({
                    key,
                    user: loginId,
                    fileName,
                    url: showUrl(slugOf(loginId, user), fileName),
                    title: rec.title || fileName.replace(/\.html$/i, ''),
                    author: authorInfo(loginId, user),
                    createdAt: rec.createdAt,
                    updatedAt: rec.updatedAt || rec.createdAt,
                    views: rec.views,
                    likes: rec.likes.length,
                    likedByMe: me ? rec.likes.includes(me) : false,
                    commentCount: visibleComments(rec).length
                });
            }
        }

        items.sort((a, b) => b.updatedAt - a.updatedAt);

        // Tìm kiếm phủ toàn bộ gallery trước khi cắt trang
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        let matched = items;
        if (q) {
            const needle = foldText(q);
            matched = items.filter(it =>
                foldText(it.title).includes(needle) || foldText(it.author.urlSlug).includes(needle));
        }

        const total = matched.length;
        const totalPages = Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE));
        let page = parseInt(req.query.page, 10);
        if (!Number.isInteger(page) || page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        const start = (page - 1) * GALLERY_PAGE_SIZE;

        res.json({
            success: true,
            items: matched.slice(start, start + GALLERY_PAGE_SIZE),
            page, totalPages, total
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Trang cá nhân: thông tin tác giả + danh sách bài đã publish của riêng user đó
app.get('/api/profile/:user', optionalAuth, (req, res) => {
    try {
        const found = resolveUserParam(req.params.user);
        if (!found) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });

        const { loginId, user } = found;
        const social = getSocial();
        const me = req.user?.username;
        const items = [];

        const ownerDir = userDir(loginId);
        const pubDir = ownerDir ? path.join(ownerDir, 'published') : null;
        const files = listHtml(pubDir);

        for (const fileName of files) {
            const key = presKey(loginId, fileName);
            const rec = getPres(social, key, fileMtime(path.join(pubDir, fileName)));
            items.push({
                key,
                user: loginId,
                fileName,
                url: showUrl(slugOf(loginId, user), fileName),
                title: rec.title || fileName.replace(/\.html$/i, ''),
                createdAt: rec.createdAt,
                updatedAt: rec.updatedAt || rec.createdAt,
                views: rec.views,
                likes: rec.likes.length,
                likedByMe: me ? rec.likes.includes(me) : false,
                commentCount: visibleComments(rec).length
            });
        }

        items.sort((a, b) => b.updatedAt - a.updatedAt);
        res.json({ success: true, author: authorInfo(loginId, user), items });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Bình luận còn hiển thị (bản mềm-xóa vẫn giữ chỗ để mạch trả lời không bị đứt)
function visibleComments(rec) {
    const list = rec && Array.isArray(rec.comments) ? rec.comments : [];
    return list.filter(c => !c.deletedAt);
}

function buildCommentTree(rec, currentDB) {
    const decorated = visibleComments(rec).map(c => decorateComment(c, currentDB));
    const topLevel = decorated.filter(c => !c.parentId);
    const repliesByParent = new Map();
    for (const c of decorated) {
        if (!c.parentId) continue;
        if (!repliesByParent.has(c.parentId)) repliesByParent.set(c.parentId, []);
        repliesByParent.get(c.parentId).push(c);
    }
    return topLevel
        .sort((a, b) => a.at - b.at)
        .map(thread => ({
            ...thread,
            replies: (repliesByParent.get(thread.id) || []).sort((a, b) => a.at - b.at)
        }));
}

// Thông tin + bình luận của một bài (dùng cho panel phải của viewer)
app.get('/api/p/:user/:file', optionalAuth, (req, res) => {
    const target = resolvePresentation(req, res);
    if (!target) return;

    const social = getSocial();
    const currentDB = getDB();
    const key = presKey(target.loginId, target.fileName);
    const rec = getPres(social, key, fileMtime(target.pubPath));
    const me = req.user?.username;
    const canModerate = Boolean(me) && (
        req.user?.role === 'admin' || me === target.loginId
    );

    res.json({
        success: true,
        presentation: {
            key,
            user: target.loginId,
            fileName: target.fileName,
            url: showUrl(slugOf(target.loginId, target.user), target.fileName),
            title: rec.title || target.fileName.replace(/\.html$/i, ''),
            author: authorInfo(target.loginId, target.user),
            createdAt: rec.createdAt,
            updatedAt: rec.updatedAt || rec.createdAt,
            views: pendingViewDelta(key) + rec.views,
            likes: rec.likes.length,
            likedByMe: me ? rec.likes.includes(me) : false,
            // Chủ bài và quản trị được gỡ bình luận rác trên bài của mình
            canModerate,
            threads: buildCommentTree(rec, currentDB),
            comments: visibleComments(rec).map(c => decorateComment(c, currentDB))
        }
    });
});

// Like / bỏ like (chỉ user đã đăng nhập)
app.post('/api/p/:user/:file/like', authenticateToken, limitWrite, (req, res) => {
    const target = resolvePresentation(req, res);
    if (!target) return;

    const result = mutateSocial(social => {
        const rec = getPres(social, presKey(target.loginId, target.fileName), fileMtime(target.pubPath));
        const me = req.user.username;
        const index = rec.likes.indexOf(me);

        if (index >= 0) {
            rec.likes.splice(index, 1);
            if (rec.likeTimes) delete rec.likeTimes[me];
        } else {
            rec.likes.push(me);
            rec.likeTimes = rec.likeTimes || {};
            rec.likeTimes[me] = Date.now();
        }
        return { likes: rec.likes.length, likedByMe: index < 0 };
    });

    res.json({ success: true, ...result });
});

const COMMENT_MAX_LEN = 2000;
const MAX_COMMENTS_PER_PRESENTATION = 500;

function commentTextFromReq(req, res) {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
        res.status(400).json({ success: false, error: 'Bình luận không được để trống' });
        return null;
    }
    if (text.length > COMMENT_MAX_LEN) {
        res.status(400).json({ success: false, error: `Bình luận tối đa ${COMMENT_MAX_LEN} ký tự` });
        return null;
    }
    return text;
}

// Thêm bình luận mới, hoặc trả lời một bình luận đã có (thread tối đa 2 cấp)
app.post('/api/p/:user/:file/comments', authenticateToken, limitWrite, (req, res) => {
    const target = resolvePresentation(req, res);
    if (!target) return;

    const text = commentTextFromReq(req, res);
    if (text === null) return;

    const parentId = typeof req.body?.parentId === 'string' && req.body.parentId
        ? req.body.parentId
        : null;

    const currentDB = getDB();
    const outcome = mutateSocial(social => {
        const rec = getPres(social, presKey(target.loginId, target.fileName), fileMtime(target.pubPath));

        if (visibleComments(rec).length >= MAX_COMMENTS_PER_PRESENTATION) {
            return { error: { status: 400, body: { success: false, error: `Một bài chỉ chứa tối đa ${MAX_COMMENTS_PER_PRESENTATION} bình luận.` } } };
        }

        let parent = null;
        if (parentId) {
            parent = rec.comments.find(c => c.id === parentId);
            if (!parent || parent.deletedAt) {
                return { error: { status: 404, body: { success: false, error: 'Không tìm thấy bình luận cần trả lời' } } };
            }
            // Chỉ một cấp trả lời, giữ mạch đọc gọn như Facebook
            if (parent.parentId) {
                return { error: { status: 400, body: { success: false, error: 'Chỉ trả lời được bình luận gốc, không trả lời lồng thêm.' } } };
            }
        }

        const comment = {
            id: crypto.randomBytes(8).toString('hex'),
            author: req.user.username,
            text,
            at: Date.now(),
            parentId: parent ? parent.id : null
        };
        rec.comments.push(comment);
        return { comment };
    });

    if (outcome.error) return res.status(outcome.error.status).json(outcome.error.body);
    res.json({ success: true, comment: decorateComment(outcome.comment, currentDB) });
});

// Quyền sửa/xóa một bình luận: tác giả, chủ bài, hoặc admin
function mayManageComment(viewer, comment, presentationOwner, role) {
    if (!viewer) return false;
    if (comment.author === viewer) return true;
    return presentationOwner === viewer || role === 'admin';
}

// Sửa bình luận (tác giả)
app.patch('/api/p/:user/:file/comments/:commentId', authenticateToken, limitWrite, (req, res) => {
    const target = resolvePresentation(req, res);
    if (!target) return;

    const text = commentTextFromReq(req, res);
    if (text === null) return;

    const currentDB = getDB();
    const outcome = mutateSocial(social => {
        const rec = getPres(social, presKey(target.loginId, target.fileName), fileMtime(target.pubPath));
        const comment = rec.comments.find(c => c.id === req.params.commentId);
        if (!comment || comment.deletedAt) return { missing: true };
        if (comment.author !== req.user.username) {
            return { forbidden: true };
        }

        comment.text = text;
        comment.editedAt = Date.now();
        return { comment };
    });

    if (outcome.missing) return res.status(404).json({ success: false, error: 'Không tìm thấy bình luận' });
    if (outcome.forbidden) return res.status(403).json({ success: false, error: 'Chỉ được sửa bình luận của chính bạn' });
    res.json({ success: true, comment: decorateComment(outcome.comment, currentDB) });
});

// Xóa bình luận: tác giả rút lại, chủ bài và admin thì gỡ nội dung rác.
// Giữ lại một "vỏ" đã xóa để các lượt trả lời bên dưới không bị mất ngữ cảnh.
app.delete('/api/p/:user/:file/comments/:commentId', authenticateToken, limitWrite, (req, res) => {
    const target = resolvePresentation(req, res);
    if (!target) return;

    const outcome = mutateSocial(social => {
        const rec = getPres(social, presKey(target.loginId, target.fileName), fileMtime(target.pubPath));
        const comment = rec.comments.find(c => c.id === req.params.commentId);
        if (!comment || comment.deletedAt) return { missing: true };
        if (!mayManageComment(req.user.username, comment, target.loginId, req.user.role)) {
            return { forbidden: true };
        }

        comment.deletedAt = Date.now();
        comment.text = '';
        // Xóa bình luận gốc thì kéo theo các trả lời của nó
        const children = rec.comments.filter(c => c.parentId === comment.id && !c.deletedAt);
        for (const child of children) {
            child.deletedAt = Date.now();
            child.text = '';
        }
        return { removed: 1 + children.length };
    });

    if (outcome.missing) return res.status(404).json({ success: false, error: 'Không tìm thấy bình luận' });
    if (outcome.forbidden) {
        return res.status(403).json({ success: false, error: 'Bạn không có quyền xóa bình luận này' });
    }
    res.json({ success: true, removed: outcome.removed });
});

// --- PHỤC VỤ STATIC FILES ---

// Slide là HTML do người dùng tự viết. CSP sandbox cấp cho tài liệu một origin mờ,
// nên code trong slide KHÔNG đọc được localStorage/cookie của editor dù vẫn chạy trên
// cùng heyshow.pedu.vn/show. Đây là lý do route /show/ tồn tại.
const SLIDE_CSP = 'sandbox allow-scripts allow-forms allow-popups allow-modals';

function slideSecurityHeaders(res) {
    res.setHeader('Content-Security-Policy', SLIDE_CSP);
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Republish phải có hiệu lực ngay, không chờ hết cache.
    //
    // Không thêm `no-transform` dù đó là cách sạch nhất để Cloudflare ngừng chèn beacon Web
    // Analytics vào trang slide. Beacon đó gọi /cdn-cgi/rum bằng XHR, mà trang slide mang CSP
    // sandbox nên origin là "null" -> CORS chặn, mở gallery là thấy error cho từng bài. Tốn
    // dung lượng chứ không hỏng gì, và đã đo: `no-transform` làm mất luôn Brotli của Cloudflare,
    // một bài 44KB xuống thành 44KB thô thay vì ~9KB (origin không tự nén), gallery 12 iframe
    // là nửa MB tải thêm trên mạng di động. Đổi lại thì vào dashboard: Web Analytics ->
    // Manage site -> Advanced options -> Add rule, loại /show/ khỏi việc đo.
    res.setHeader('Cache-Control', 'no-cache');
}

// Bộ đếm lượt xem gom trong RAM: một tiết học 40 em cùng mở link sẽ tạo 40 lượt ghi
// social.json liên tiếp ở bản cũ; ở đây chỉ cộng vào bộ đếm và ghi một lần mỗi 3 giây.
const pendingViews = new Map();
const VIEW_FLUSH_MS = 3000;

function pendingViewDelta(key) {
    return pendingViews.get(key) || 0;
}

function recordView(key) {
    pendingViews.set(key, (pendingViews.get(key) || 0) + 1);
    scheduleViewFlush();
}

let viewFlushTimer = null;
function scheduleViewFlush() {
    if (viewFlushTimer) return;
    viewFlushTimer = setTimeout(() => {
        viewFlushTimer = null;
        flushViews();
    }, VIEW_FLUSH_MS);
    if (viewFlushTimer.unref) viewFlushTimer.unref();
}

function flushViews() {
    if (!pendingViews.size) return;
    const batch = [...pendingViews.entries()];
    pendingViews.clear();
    mutateSocial(social => {
        for (const [key, delta] of batch) {
            const rec = getPres(social, key, Date.now());
            rec.views += delta;
        }
    });
}

// Trang tĩnh của ứng dụng
const PUBLIC_PAGES = [
    ['/admin_panel', 'admin.html'],
    ['/gallery', 'gallery.html'],
    ['/design', 'index.html'],
    ['/dashboard', 'dashboard.html'],
    ['/help', 'help.html'],
    ['/templates', 'templates.html']
];

for (const [route, file] of PUBLIC_PAGES) {
    app.get(route, (req, res) => res.sendFile(path.join(CLIENT_DIST, file)));
    app.get(`${route}/`, (req, res) => res.sendFile(path.join(CLIENT_DIST, file)));
}

// Chốt chặn lúc khởi động: thêm route cấp một mà quên khai báo vào RESERVED_SLUGS thì
// user có thể đăng ký đúng tên đó và chiếm mất địa chỉ của trang. Threw ở đây để bộ
// test phát hiện ngay thay vì để trống một lỗ hổng âm thầm.
for (const name of [...PUBLIC_PAGES.map(([route]) => route.slice(1)), 'api', 'health']) {
    if (!isReservedName(name)) {
        throw new Error(`RESERVED_SLUGS thiếu "${name}": thêm route cấp một thì phải thêm cả tên dự phòng`);
    }
}

// Trang chủ: giới thiệu HeyShow
app.get('/', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'landing.html')));

// Kiểm tra sức khỏe server cho script deploy
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        uptime: Math.round(process.uptime()),
        pendingViews: pendingViews.size,
        pendingWrites: { db: dbStore.isDirty(), social: socialStore.isDirty() }
    });
});

// --- SLIDE ĐÃ PUBLISH ---
// /show/<slug>/<file>.html là đường dẫn chính (có CSP sandbox).
// /<slug>/<file>.html vẫn phục vụ y hệt vì nhiều link đã chia sẻ từ trước.
function resolveSlugDir(slug) {
    if (isReservedName(slug)) return null;
    const currentDB = getDB();
    for (const [loginId, user] of Object.entries(currentDB.users)) {
        if (slugOf(loginId, user) === slug || loginId === slug) {
            const dir = userDir(loginId);
            return dir ? { loginId, dir: path.join(dir, 'published') } : null;
        }
    }
    return null;
}

function servePublishedSlide(req, res, next, pubDir, loginId) {
    if (!fs.existsSync(pubDir)) return next();

    // req.path tương đối so với mount, Express đã cắt phần prefix
    let rawName = req.path.replace(/^\/+/, '');
    try { rawName = decodeURIComponent(rawName); } catch (e) { /* giữ nguyên nếu mã hoá lỗi */ }

    if (req.method === 'GET' && rawName.endsWith('.html')) {
        const viewedFile = safeFileName(rawName);
        if (viewedFile && fs.existsSync(path.join(pubDir, viewedFile))) {
            const shouldCount = req.query.embed === undefined && req.query['print-pdf'] === undefined;
            if (shouldCount) recordView(presKey(loginId, viewedFile));
        }
    }

    const sendStatic = express.static(pubDir, {
        index: false,
        fallthrough: true,
        setHeaders: (res2, filePath) => {
            if (filePath.endsWith('.html')) slideSecurityHeaders(res2);
        }
    });
    return sendStatic(req, res, next);
}

// Đường dẫn mới, có cô lập origin
app.use('/show/:slug', (req, res, next) => {
    const found = resolveSlugDir(req.params.slug);
    if (!found) {
        // /show/<slug> (không có file) -> trang cá nhân
        if (req.path === '/' || req.path === '') {
            const bySlug = resolveUserParam(req.params.slug);
            if (bySlug) return res.sendFile(path.join(CLIENT_DIST, 'profile.html'));
        }
        return next('router');
    }
    return servePublishedSlide(req, res, next, found.dir, found.loginId);
});

// Đường dẫn cũ, giữ nguyên hiệu lực
app.use('/:slug', (req, res, next) => {
    const slug = req.params.slug;
    const found = resolveSlugDir(slug);
    if (!found) return next();

    // Trang cá nhân của user: phục vụ profile.html khi truy cập /<slug> hoặc /<slug>/
    if (req.path === '/' || req.path === '') {
        return res.sendFile(path.join(CLIENT_DIST, 'profile.html'));
    }

    return servePublishedSlide(req, res, next, found.dir, found.loginId);
});

// Phục vụ assets chung của Vite
app.use(express.static(CLIENT_DIST, { index: false }));

// Fallback cho SPA (Vite) - xử lý lỗi path-to-regexp của express 5.x
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/admin_panel') && req.path.split('/').length <= 2) {
        res.sendFile(path.join(CLIENT_DIST, 'landing.html'));
    } else {
        next();
    }
});

// Lỗi trong một request không được làm sập tiến trình đang chạy trên điện thoại
app.use((err, req, res, next) => {
    console.error('[error]', err.message);
    if (res.headersSent) return next(err);
    const status = err.status || (err.code === 'entity.too.large' ? 413 : 500);
    res.status(status).json({ success: false, error: 'Có lỗi xảy ra, vui lòng thử lại.' });
});

process.on('unhandledRejection', reason => {
    console.error('[unhandledRejection]', reason);
});

// PM2 gửi SIGTERM/SIGINT khi restart: ghi nốt phần đang gom trước khi thoát
let shuttingDown = false;
function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] Nhận ${signal}, ghi dở dữ liệu rồi thoát.`);
    try {
        flushViews();
        dbStore.flush(true);
        socialStore.flush(true);
    } catch (err) {
        console.error('[server] Lỗi khi ghi dữ liệu lúc thoát:', err.message);
    }
    process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
app.listen(PORT, () => {
    console.log(`Server HeyShow is running at http://localhost:${PORT}`);
});
