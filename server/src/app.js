// Đọc server/.env bất kể thư mục hiện hành khi khởi động (PM2 có thể chạy từ nơi khác)
require('dotenv').config({ quiet: true, path: __dirname + '/../.env' });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Paths
const CLIENT_DIST = path.join(__dirname, '../../client/dist');
const DATA_DIR = path.join(__dirname, '../../data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SECRET_FILE = path.join(DATA_DIR, '.jwt-secret');
const SOCIAL_FILE = path.join(DATA_DIR, 'social.json');

// Tạo thư mục nếu chưa có
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(USERS_DIR, { recursive: true });

// Các slug dành riêng cho route hệ thống, không cho user chiếm dụng
const RESERVED_SLUGS = ['api', 'admin_panel', 'assets', 'src', 'gallery', 'dashboard', 'design', 'help', 'templates', 'favicon.svg', 'icons.svg'];

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

// --- QUẢN LÝ DATABASE ĐƠN GIẢN (JSON) ---

// Ghi atomic: ghi file tạm rồi rename, tránh làm hỏng db.json khi mất điện giữa chừng
function saveDB(data) {
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), { mode: 0o600 });
    fs.renameSync(tmpFile, DB_FILE);
    try { fs.chmodSync(DB_FILE, 0o600); } catch (e) { /* Termux có thể không hỗ trợ chmod */ }
}

function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialPassword = crypto.randomBytes(9).toString('base64url');
        const initialData = {
            users: {
                "admin": { passwordHash: hashPasswordSync(initialPassword), role: "admin" }
            },
            config: {
                aiKeys: { groq: "", deepseek: "" }
            }
        };
        saveDB(initialData);
        console.log('\n================= HeyShow: Khởi tạo lần đầu =================');
        console.log('Tài khoản quản trị đã được tạo với mật khẩu ngẫu nhiên:');
        console.log(`  username: admin`);
        console.log(`  password: ${initialPassword}`);
        console.log('Hãy đăng nhập /admin_panel và đổi mật khẩu ngay.');
        console.log('============================================================\n');
        return initialData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

// --- STORE GALLERY (views, likes, comments của từng bài đã publish) ---
// Tách khỏi db.json để thao tác like/view/comment không đụng vào dữ liệu tài khoản.
// Key: "<loginId>/<tenFile.html>" - ổn định kể cả khi user đổi urlSlug.

function loadSocial() {
    try {
        if (fs.existsSync(SOCIAL_FILE)) {
            const data = JSON.parse(fs.readFileSync(SOCIAL_FILE, 'utf-8'));
            if (data && typeof data === 'object') {
                data.presentations = data.presentations || {};
                return data;
            }
        }
    } catch (e) { /* file hỏng thì khởi tạo lại */ }
    return { presentations: {} };
}

function saveSocial(data) {
    const tmpFile = `${SOCIAL_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
    fs.renameSync(tmpFile, SOCIAL_FILE);
}

function presKey(loginId, fileName) {
    return `${loginId}/${fileName}`;
}

function fileMtime(filePath) {
    try { return fs.statSync(filePath).mtimeMs; } catch (e) { return Date.now(); }
}

// Lấy (hoặc tạo) record của một bài trình chiếu.
// Bài publish từ trước khi có gallery sẽ lấy ngày đăng từ mtime của file.
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
    rec.likes = Array.isArray(rec.likes) ? rec.likes : [];
    rec.comments = Array.isArray(rec.comments) ? rec.comments : [];
    rec.views = Number.isFinite(rec.views) ? rec.views : 0;
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
    const currentDB = loadDB();
    for (const [loginId, user] of Object.entries(currentDB.users)) {
        if (loginId === param || slugOf(loginId, user) === param) {
            return { loginId, user };
        }
    }
    return null;
}

function authorInfo(loginId, user) {
    return {
        username: loginId,
        urlSlug: slugOf(loginId, user),
        avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(loginId)}&background=random`
    };
}

// Gắn thông tin hiển thị của tác giả bình luận (không trả passwordHash ra ngoài)
function decorateComment(comment, currentDB) {
    const user = currentDB.users[comment.author] || {};
    return {
        id: comment.id,
        text: comment.text,
        at: comment.at,
        editedAt: comment.editedAt || null,
        author: authorInfo(comment.author, user)
    };
}

// Token hợp lệ thì gắn user, không có thì bỏ qua (route công khai nhưng muốn biết "tôi đã like chưa")
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try { req.user = jwt.verify(token, JWT_SECRET); } catch (e) { /* token hỏng -> coi như khách */ }
    }
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

// Tên đăng nhập cũng được dùng làm đường dẫn thư mục và slug URL nên phải giới hạn ký tự
const USERNAME_RE = /^[a-zA-Z0-9@._-]{3,64}$/;
const FORBIDDEN_USERNAMES = ['__proto__', 'constructor', 'prototype'];

function isValidUsername(name) {
    return typeof name === 'string'
        && USERNAME_RE.test(name)
        && !RESERVED_SLUGS.includes(name)
        && !FORBIDDEN_USERNAMES.includes(name);
}

// Chặn path traversal: loại bỏ mọi ký tự không hợp lệ (bao gồm '/' và '\')
function userDir(username) {
    const safe = String(username || '').replace(/[^a-zA-Z0-9@._-]/g, '');
    if (!safe || safe === '.' || safe === '..') return null;
    return path.join(USERS_DIR, safe);
}

// Tên file từ URL chỉ được là tên thuần, không chứa đường dẫn
function safeFileName(name) {
    const base = path.basename(String(name || ''));
    return base && base !== '.' && base !== '..' ? base : null;
}

// Khởi tạo DB & Thư mục cho admin
loadDB();
const DEFAULT_USER = 'admin';
const defaultUserDir = userDir(DEFAULT_USER);
fs.mkdirSync(path.join(defaultUserDir, 'drafts'), { recursive: true });
fs.mkdirSync(path.join(defaultUserDir, 'published'), { recursive: true });

// Cảnh báo nếu tài khoản admin vẫn đang dùng mật khẩu mặc định công khai của bản cũ
(function warnDefaultAdmin() {
    try {
        const adminHash = loadDB().users?.admin?.passwordHash;
        const legacyDefault = crypto.createHash('sha256').update('admin123').digest('hex');
        if (adminHash === legacyDefault) {
            console.warn('\n[CẢNH BÁO] Tài khoản admin vẫn dùng mật khẩu mặc định "admin123".');
            console.warn('[CẢNH BÁO] Hãy đổi mật khẩu ngay tại /admin_panel trước khi expose ra Internet.\n');
        }
    } catch (e) { /* bỏ qua nếu db chưa sẵn sàng */ }
})();

// --- CHỐNG BRUTE-FORCE ---
// scrypt tốn CPU nên endpoint đăng nhập công khai cần giới hạn số lần thử.
// Server đứng sau Cloudflare Tunnel nên req.ip luôn là local; phải đọc IP thật từ header.
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_FAILURES = 30;
const authAttempts = new Map();

function clientIp(req) {
    return req.get('cf-connecting-ip') || req.get('x-forwarded-for')?.split(',')[0].trim() || req.ip;
}

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

    // Chỉ đếm lần THẤT BẠI: người gõ đúng mật khẩu không bao giờ bị khoá.
    // Cần thiết vì cả một lớp dùng chung IP của trường sẽ đi qua cùng một tunnel.
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

// Middleware xác thực JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.status(401).json({ success: false, error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Token expired or invalid' });

        const dir = userDir(user.username);
        if (!dir) return res.status(403).json({ success: false, error: 'Tài khoản không hợp lệ' });

        req.user = user;
        req.userDir = dir;
        next();
    });
}

// Các route /api/admin/* chỉ dành cho role admin
function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Cần quyền quản trị' });
    }
    next();
}

// --- API AUTH & ADMIN ---

// Đăng nhập
app.post('/api/auth/login', rateLimitAuth, async (req, res) => {
    const { username, password } = req.body;
    const currentDB = loadDB();
    const deny = () => res.status(401).json({ success: false, error: 'Invalid credentials' });

    if (typeof username !== 'string' || !Object.hasOwn(currentDB.users, username)) {
        return deny();
    }

    const user = currentDB.users[username];
    const { ok, legacy } = await verifyPassword(password, user.passwordHash);
    if (!ok) return deny();

    // Nâng cấp hash cũ (SHA-256 không salt) lên scrypt ngay khi đăng nhập thành công
    if (legacy) {
        user.passwordHash = await hashPassword(password);
        saveDB(currentDB);
    }

    const token = jwt.sign({ username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
});

// Đổi mật khẩu (chỉ admin)
app.post('/api/admin/password', authenticateToken, requireAdmin, async (req, res) => {
    const { newPassword } = req.body;
    const currentDB = loadDB();
    const user = Object.hasOwn(currentDB.users, req.user.username) ? currentDB.users[req.user.username] : null;

    if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
    if (typeof newPassword !== 'string' || newPassword.length < 4) {
        return res.status(400).json({ success: false, error: 'Mật khẩu quá ngắn' });
    }

    user.passwordHash = await hashPassword(newPassword);
    saveDB(currentDB);
    res.json({ success: true });
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
                }
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
    const currentDB = loadDB();
    res.json({ success: true, config: { aiKeys: getAiKeys(currentDB) } });
});

// Lưu Config (AI Key) - chỉ admin
app.post('/api/admin/config', authenticateToken, requireAdmin, (req, res) => {
    const { aiKeys, aiApiKey } = req.body;
    const incoming = aiKeys && typeof aiKeys === 'object' ? aiKeys : (typeof aiApiKey === 'string' ? { deepseek: aiApiKey } : null);
    if (!incoming) {
        return res.status(400).json({ success: false, error: 'API Key không hợp lệ' });
    }
    const currentDB = loadDB();
    const keys = getAiKeys(currentDB);
    for (const provider of Object.keys(AI_PROVIDERS)) {
        if (typeof incoming[provider] === 'string') keys[provider] = incoming[provider].trim();
    }
    currentDB.config.aiKeys = keys;
    delete currentDB.config.aiApiKey;
    saveDB(currentDB);
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

// Ngày tạo tài khoản: ưu tiên createdAt trong db; tài khoản cũ lấy mtime thư mục user làm xấp xỉ
function userCreatedAt(loginId, user) {
    if (Number.isFinite(user.createdAt)) return user.createdAt;
    try {
        return fs.statSync(path.join(USERS_DIR, loginId)).mtimeMs;
    } catch (e) {
        return null;
    }
}

// Danh sách user + số liệu hoạt động; không bao giờ trả passwordHash ra ngoài
// (avatar base64 được đưa vào như ảnh đại diện — cùng cách /api/gallery vẫn trả)
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    const currentDB = loadDB();
    const social = loadSocial();
    const users = Object.entries(currentDB.users).map(([loginId, user]) => {
        const dir = userDir(loginId);
        let views = 0, likes = 0;
        for (const [key, rec] of Object.entries(social.presentations)) {
            if (key.startsWith(`${loginId}/`)) {
                views += rec.views || 0;
                likes += (rec.likes || []).length;
            }
        }
        return {
            username: loginId,
            role: user.role || 'user',
            urlSlug: slugOf(loginId, user),
            email: user.email || '',
            avatar: user.avatar || '',
            createdAt: userCreatedAt(loginId, user),
            drafts: dir ? countHtml(path.join(dir, 'drafts')) : 0,
            published: dir ? countHtml(path.join(dir, 'published')) : 0,
            views,
            likes
        };
    });
    res.json({ success: true, users });
});

// Admin tạo tài khoản (thường cho giáo viên chưa có nick)
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    const { username, password, role } = req.body;

    if (typeof username !== 'string' || !USERNAME_RE.test(username) || !isValidUsername(username)) {
        return res.status(400).json({
            success: false,
            error: 'Tên đăng nhập phải dài 3-64 ký tự, chỉ gồm chữ cái, số và @ . _ -, không trùng tên hệ thống.'
        });
    }
    if (typeof password !== 'string' || password.length < 3) {
        return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 3 ký tự' });
    }
    if (role !== undefined && !['user', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Quyền không hợp lệ (user hoặc admin)' });
    }

    const currentDB = loadDB();
    if (Object.hasOwn(currentDB.users, username)) {
        return res.status(400).json({ success: false, error: 'Tên đăng nhập đã tồn tại' });
    }

    currentDB.users[username] = {
        passwordHash: await hashPassword(password),
        role: role || 'user',
        createdAt: Date.now()
    };
    saveDB(currentDB);

    const newUserDir = userDir(username);
    fs.mkdirSync(path.join(newUserDir, 'drafts'), { recursive: true });
    fs.mkdirSync(path.join(newUserDir, 'published'), { recursive: true });

    res.json({ success: true, message: `Đã tạo tài khoản ${username}` });
});

// Đặt lại mật khẩu cho user khác (kể cả admin khác)
app.post('/api/admin/users/:username/password', authenticateToken, requireAdmin, async (req, res) => {
    const { username } = req.params;
    const { newPassword } = req.body;
    const currentDB = loadDB();
    if (!Object.hasOwn(currentDB.users, username)) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 3) {
        return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 3 ký tự' });
    }

    currentDB.users[username].passwordHash = await hashPassword(newPassword);
    saveDB(currentDB);
    res.json({ success: true, message: `Đã đặt lại mật khẩu cho ${username}` });
});

// Đổi quyền user/admin. Chặn tự đổi quyền của chính mình để không vô tình mất quyền quản trị.
app.post('/api/admin/users/:username/role', authenticateToken, requireAdmin, (req, res) => {
    const { username } = req.params;
    const { role } = req.body;
    const currentDB = loadDB();
    if (!Object.hasOwn(currentDB.users, username)) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
    }
    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Quyền không hợp lệ (user hoặc admin)' });
    }
    if (username === req.user.username) {
        return res.status(400).json({ success: false, error: 'Không thể tự đổi quyền của chính mình' });
    }

    currentDB.users[username].role = role;
    saveDB(currentDB);
    res.json({ success: true, message: `Đã đổi ${username} thành ${role}` });
});

// Xóa tài khoản: không tự xóa; dọn luôn bản nháp, bài publish và số liệu gallery của user.
app.delete('/api/admin/users/:username', authenticateToken, requireAdmin, (req, res) => {
    const { username } = req.params;
    const currentDB = loadDB();
    if (!Object.hasOwn(currentDB.users, username)) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' });
    }
    if (username === req.user.username) {
        return res.status(400).json({ success: false, error: 'Không thể tự xóa tài khoản của chính mình' });
    }

    delete currentDB.users[username];
    saveDB(currentDB);

    const dir = userDir(username);
    if (dir) {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { console.warn(`[ADMIN] Không xóa được thư mục ${username}:`, e.message); }
    }

    const social = loadSocial();
    let touched = false;
    for (const key of Object.keys(social.presentations)) {
        if (key.startsWith(`${username}/`)) {
            delete social.presentations[key];
            touched = true;
        }
    }
    if (touched) saveSocial(social);

    res.json({ success: true, message: `Đã xóa tài khoản ${username}` });
});

// --- Đăng ký ---
app.post('/api/auth/register', rateLimitAuth, async (req, res) => {
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
    if (typeof password !== 'string' || password.length < 3) {
        return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 3 ký tự' });
    }

    const currentDB = loadDB();
    if (Object.hasOwn(currentDB.users, username)) {
        return res.status(400).json({ success: false, error: 'Tên đăng nhập đã tồn tại' });
    }

    currentDB.users[username] = {
        passwordHash: await hashPassword(password),
        role: 'user',
        createdAt: Date.now()
    };
    saveDB(currentDB);

    // Tạo thư mục cho user mới
    const newUserDir = userDir(username);
    fs.mkdirSync(path.join(newUserDir, 'drafts'), { recursive: true });
    fs.mkdirSync(path.join(newUserDir, 'published'), { recursive: true });

    res.json({ success: true });
});

// --- API ROUTES (CẦN JWT) ---

// --- API USER PROFILE ---

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

// Slug nằm trực tiếp trong đường dẫn URL công khai nên phải kiểm soát chặt
const SLUG_RE = /^[a-zA-Z0-9_-]{3,40}$/;

function isValidSlug(slug) {
    return typeof slug === 'string' && SLUG_RE.test(slug) && !RESERVED_SLUGS.includes(slug);
}

const AVATAR_RE = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/;
const AVATAR_MAX_LEN = 1_500_000;
const PHONE_RE = /^[0-9+\-.()\s]{0,20}$/;
const FULL_NAME_MAX_LEN = 80;

app.get('/api/user/profile', authenticateToken, (req, res) => {
    const currentDB = loadDB();
    const user = currentDB.users[req.user.username];
    if (!user) return res.status(404).json({ success: false });

    res.json({
        success: true,
        profile: {
            username: req.user.username,
            urlSlug: slugOf(req.user.username, user),
            fullName: user.fullName || '',
            email: user.email || '',
            phone: user.phone || '',
            avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user.username)}&background=random`
        }
    });
});

app.post('/api/user/profile', authenticateToken, async (req, res) => {
    const { urlSlug, email, password, avatarBase64, fullName, phone } = req.body;
    const currentDB = loadDB();
    const user = currentDB.users[req.user.username];
    if (!user) return res.status(404).json({ success: false });

    if (urlSlug !== undefined && urlSlug !== '') {
        const currentSlug = slugOf(req.user.username, user);
        // Giữ nguyên slug hiện có: tài khoản cũ có thể đang dùng slug không đạt chuẩn mới,
        // không nên bắt họ đổi chỉ vì bấm "Lưu hồ sơ".
        if (urlSlug !== currentSlug) {
            if (!isValidSlug(urlSlug)) {
                return res.status(400).json({
                    success: false,
                    error: 'Username URL phải dài 3-40 ký tự, chỉ gồm chữ cái, số, gạch ngang và gạch dưới.'
                });
            }
            // Kiểm tra trùng lặp slug
            for (const [loginId, u] of Object.entries(currentDB.users)) {
                if (loginId !== req.user.username && slugOf(loginId, u) === urlSlug) {
                    return res.status(400).json({ success: false, error: 'Username này đã được sử dụng.' });
                }
            }
            user.urlSlug = urlSlug;
        }
    }

    if (fullName !== undefined) {
        if (typeof fullName !== 'string' || fullName.trim().length > FULL_NAME_MAX_LEN) {
            return res.status(400).json({ success: false, error: `Họ tên tối đa ${FULL_NAME_MAX_LEN} ký tự` });
        }
        user.fullName = fullName.trim();
    }

    if (phone !== undefined) {
        if (typeof phone !== 'string' || !PHONE_RE.test(phone.trim())) {
            return res.status(400).json({ success: false, error: 'Số điện thoại chỉ gồm số, dấu +, -, khoảng trắng (tối đa 20 ký tự)' });
        }
        user.phone = phone.trim();
    }

    if (email !== undefined) {
        if (typeof email !== 'string' || email.length > 254) {
            return res.status(400).json({ success: false, error: 'Email không hợp lệ' });
        }
        user.email = email;
    }

    if (avatarBase64) {
        if (typeof avatarBase64 !== 'string' || avatarBase64.length > AVATAR_MAX_LEN || !AVATAR_RE.test(avatarBase64)) {
            return res.status(400).json({ success: false, error: 'Ảnh đại diện không hợp lệ (PNG/JPG/GIF/WebP, tối đa ~1MB)' });
        }
        user.avatar = avatarBase64;
    }

    if (password) {
        if (typeof password !== 'string' || password.length < 3) {
            return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 3 ký tự' });
        }
        user.passwordHash = await hashPassword(password);
    }

    saveDB(currentDB);
    res.json({ success: true, message: 'Đã cập nhật hồ sơ' });
});

// --- API FILES ---

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

// 1. Lấy danh sách các bản nháp
app.get('/api/files', authenticateToken, (req, res) => {
    try {
        const userDraftDir = path.join(req.userDir, 'drafts');
        const files = fs.readdirSync(userDraftDir).filter(f => f.endsWith('.html'));
        res.json({ success: true, files });
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

// 3. Tạo/Cập nhật bản nháp (Save)
app.post('/api/files/:name', authenticateToken, (req, res) => {
    const fileName = safeFileName(req.params.name);
    if (!fileName) return res.status(400).json({ success: false, error: 'Tên file không hợp lệ' });

    const { content } = req.body;
    if (typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Nội dung không hợp lệ' });
    }

    const userDraftDir = path.join(req.userDir, 'drafts');
    const filePath = path.join(userDraftDir, fileName);

    try {
        if (!fs.existsSync(userDraftDir)) fs.mkdirSync(userDraftDir, { recursive: true });

        fs.writeFileSync(filePath, content);
        res.json({ success: true, message: 'Saved successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Xóa bản nháp
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

        // Dọn luôn dữ liệu gallery của bài đã xoá
        const social = loadSocial();
        delete social.presentations[presKey(req.user.username, fileName)];
        saveSocial(social);

        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Dựng file HTML hoàn chỉnh (Reveal.js) từ nội dung nháp — dùng cho cả publish và export
function buildFullHtml(fileName, rawHtml) {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(fileName)} - HeyShow</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.1.0/reset.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.1.0/reveal.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.1.0/theme/black.min.css">
    <style>
        /* Chế độ thumbnail của gallery (?embed=1): ẩn điều khiển để ảnh thu nhỏ gọn mắt */
        .heyshow-embed .reveal .controls,
        .heyshow-embed .reveal .progress,
        .heyshow-embed .slide-number { display: none !important; }
    </style>
</head>
<body>
    <div class="reveal">
        <div class="slides">
            ${rawHtml}
        </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.1.0/reveal.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.1.0/plugin/math/math.js"></script>
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
                plugins: [ RevealMath.KaTeX ] // Hỗ trợ công thức Toán học
            });
        });
    </script>
</body>
</html>`;
}

// 5. Publish bản nháp
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

        fs.writeFileSync(pubPath, fullHtml);

        // Cập nhật metadata cho gallery: tiêu đề, ngày đăng/cập nhật
        const social = loadSocial();
        const rec = getPres(social, presKey(req.user.username, fileName), fileMtime(pubPath));
        rec.title = extractTitle(rawHtml, fileName.replace(/\.html$/i, ''));
        rec.updatedAt = Date.now();
        saveSocial(social);
        
        const currentDB = loadDB();
        const urlSlug = slugOf(req.user.username, currentDB.users[req.user.username]);

        res.json({ 
            success: true, 
            message: 'Published successfully',
            url: `/${encodeURIComponent(urlSlug)}/${encodeURIComponent(fileName)}`
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- API DASHBOARD (quản lý trình chiếu của từng user) ---

// 6. Đổi tên file (cả nháp lẫn bản đã publish, giữ nguyên likes/comments)
app.post('/api/files/:name/rename', authenticateToken, (req, res) => {
    const fileName = safeFileName(req.params.name);
    let newName = safeFileName(req.body?.newName || '');
    if (!fileName || !newName) return res.status(400).json({ success: false, error: 'Tên file không hợp lệ' });
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
        const social = loadSocial();
        const oldKey = presKey(req.user.username, fileName);
        const newKey = presKey(req.user.username, newName);
        if (social.presentations[oldKey]) {
            social.presentations[newKey] = social.presentations[oldKey];
            delete social.presentations[oldKey];
            saveSocial(social);
        }

        res.json({ success: true, newName });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 7. Gỡ publish — bài quay về dạng nháp để tiếp tục biên tập (giữ likes/comments)
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

        const draftDir = path.join(req.userDir, 'drafts');
        fs.mkdirSync(draftDir, { recursive: true });
        let fileName = `${base}.html`;
        let n = 2;
        while (fs.existsSync(path.join(draftDir, fileName)) || fs.existsSync(path.join(req.userDir, 'published', fileName))) {
            fileName = `${base}-${n}.html`;
            n++;
        }
        fs.writeFileSync(path.join(draftDir, fileName), html);
        res.json({ success: true, fileName, slideCount: analysis.slides.length });
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

        const draftDir = path.join(req.userDir, 'drafts');
        fs.mkdirSync(draftDir, { recursive: true });
        let fileName = `${base}.html`;
        let n = 2;
        while (fs.existsSync(path.join(draftDir, fileName)) || fs.existsSync(path.join(req.userDir, 'published', fileName))) {
            fileName = `${base}-${n}.html`;
            n++;
        }
        fs.writeFileSync(path.join(draftDir, fileName), html);
        res.json({ success: true, fileName, slideCount: analysis.slides.length });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// 9. Dữ liệu trang Dashboard: danh sách bài của tôi + hoạt động (likes/comments) gần đây
app.get('/api/dashboard', authenticateToken, (req, res) => {
    try {
        const loginId = req.user.username;
        const currentDB = loadDB();
        const user = currentDB.users[loginId] || {};
        const social = loadSocial();
        const urlSlug = slugOf(loginId, user);

        const draftDir = path.join(req.userDir, 'drafts');
        const pubDir = path.join(req.userDir, 'published');
        const listHtml = dir => {
            try { return fs.readdirSync(dir).filter(f => f.endsWith('.html')); } catch (e) { return []; }
        };
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
                url: published ? `/${encodeURIComponent(urlSlug)}/${encodeURIComponent(fileName)}` : null,
                views: rec?.views || 0,
                likes: rec?.likes?.length || 0,
                commentCount: rec?.comments?.length || 0,
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
                activity.push({
                    type: 'comment', file: fileName, title, at: c.at,
                    text: c.text,
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

        res.json({ success: true, me: authorInfo(loginId, user), items, activity: activity.slice(0, 20) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Thống kê tổng cho trang chủ (công khai)
app.get('/api/stats', (req, res) => {
    try {
        const currentDB = loadDB();
        const social = loadSocial();
        let presentations = 0, views = 0, likes = 0, comments = 0;

        for (const loginId of Object.keys(currentDB.users)) {
            const ownerDir = userDir(loginId);
            if (!ownerDir) continue;
            let files = [];
            try { files = fs.readdirSync(path.join(ownerDir, 'published')).filter(f => f.endsWith('.html')); } catch (e) { continue; }
            presentations += files.length;
            for (const fileName of files) {
                const rec = social.presentations[presKey(loginId, fileName)];
                if (!rec) continue;
                views += rec.views || 0;
                likes += (rec.likes || []).length;
                comments += (rec.comments || []).length;
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
    const keys = getAiKeys(loadDB());
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

app.post('/api/ai/generate', authenticateToken, async (req, res) => {
    const { prompt, currentCode, mode, targetCode } = req.body;
    const provider = Object.hasOwn(AI_PROVIDERS, req.body.provider) ? req.body.provider : DEFAULT_AI_PROVIDER;
    const currentDB = loadDB();
    const apiKey = getAiKeys(currentDB)[provider];

    if (!apiKey) {
        return res.status(400).json({ success: false, error: `Chưa cấu hình API Key cho ${AI_PROVIDERS[provider].label}. Hãy vào trang Admin để cài đặt.` });
    }

    if (typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ success: false, error: 'Yêu cầu không hợp lệ' });
    }

    const position = Object.hasOwn(AI_POSITIONS, mode) ? mode : 'last';

    try {
        const systemPrompt = `Bạn là trợ lý viết code HTML cho HeyShow — ứng dụng tạo bài trình chiếu dựa trên thư viện Reveal.js.

Cấu trúc một file HeyShow:
- <section-master>...</section-master> (không bắt buộc, tối đa một thẻ): chứa nội dung dùng chung được hệ thống TỰ ĐỘNG chèn vào đầu MỌI slide khi trình chiếu (header, footer, <style> thiết lập chung...). Bản thân <section-master> KHÔNG phải là một slide.
- <section>...</section>: mỗi thẻ là một slide. <section> lồng bên trong <section> tạo thành nhóm slide dọc.

Quy tắc chung:
- CHỈ TRẢ VỀ code HTML thuần (plain text): KHÔNG <html>/<head>/<body>, KHÔNG markdown backticks (\`\`\`html), KHÔNG giải thích.
- Có thể dùng class/attribute của Reveal.js (class "fragment" để hiện dần, data-background-color...).
- Có thể dùng công thức KaTeX trong $$...$$ (khối) hoặc $...$ (dòng).
- Code phải cân bằng thẻ mở/thẻ đóng.

${AI_POSITIONS[position]}`;

        let userPrompt = `Code hiện tại của tôi:\n${currentCode}\n\n`;
        if (typeof targetCode === 'string' && targetCode.trim()) {
            const contextLabel = position === 'master' ? 'Nội dung <section-master> hiện tại' : 'Slide hiện tại của tôi';
            userPrompt += `${contextLabel}:\n${targetCode}\n\n`;
        }
        userPrompt += `Yêu cầu của tôi: ${prompt}`;

        const response = await callAiProvider(provider, apiKey, systemPrompt, userPrompt);

        let generatedHtml = response.data.choices[0].message.content.trim();
        
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
        res.status(500).json({ success: false, error: `Lỗi khi gọi AI (${AI_PROVIDERS[provider].label}). Vui lòng kiểm tra lại API Key.${detail}` });
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
        const social = loadSocial();
        const currentDB = loadDB();
        const me = req.user?.username;
        const items = [];

        for (const [loginId, user] of Object.entries(currentDB.users)) {
            const ownerDir = userDir(loginId);
            if (!ownerDir) continue;

            const pubDir = path.join(ownerDir, 'published');
            let files = [];
            try {
                files = fs.readdirSync(pubDir).filter(f => f.endsWith('.html'));
            } catch (e) { continue; }

            for (const fileName of files) {
                const key = presKey(loginId, fileName);
                const rec = getPres(social, key, fileMtime(path.join(pubDir, fileName)));
                items.push({
                    key,
                    user: loginId,
                    fileName,
                    url: `/${encodeURIComponent(slugOf(loginId, user))}/${encodeURIComponent(fileName)}`,
                    title: rec.title || fileName.replace(/\.html$/i, ''),
                    author: authorInfo(loginId, user),
                    createdAt: rec.createdAt,
                    updatedAt: rec.updatedAt || rec.createdAt,
                    views: rec.views,
                    likes: rec.likes.length,
                    likedByMe: me ? rec.likes.includes(me) : false,
                    commentCount: rec.comments.length
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
        const social = loadSocial();
        const me = req.user?.username;
        const items = [];

        const ownerDir = userDir(loginId);
        const pubDir = ownerDir ? path.join(ownerDir, 'published') : null;
        let files = [];
        try {
            files = pubDir ? fs.readdirSync(pubDir).filter(f => f.endsWith('.html')) : [];
        } catch (e) { files = []; }

        for (const fileName of files) {
            const key = presKey(loginId, fileName);
            const rec = getPres(social, key, fileMtime(path.join(pubDir, fileName)));
            items.push({
                key,
                user: loginId,
                fileName,
                url: `/${encodeURIComponent(slugOf(loginId, user))}/${encodeURIComponent(fileName)}`,
                title: rec.title || fileName.replace(/\.html$/i, ''),
                createdAt: rec.createdAt,
                updatedAt: rec.updatedAt || rec.createdAt,
                views: rec.views,
                likes: rec.likes.length,
                likedByMe: me ? rec.likes.includes(me) : false,
                commentCount: rec.comments.length
            });
        }

        items.sort((a, b) => b.updatedAt - a.updatedAt);
        res.json({ success: true, author: authorInfo(loginId, user), items });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Thông tin + bình luận của một bài (dùng cho panel phải của viewer)
app.get('/api/p/:user/:file', optionalAuth, (req, res) => {
    const target = resolvePresentation(req, res);
    if (!target) return;

    const social = loadSocial();
    const currentDB = loadDB();
    const key = presKey(target.loginId, target.fileName);
    const rec = getPres(social, key, fileMtime(target.pubPath));
    const me = req.user?.username;

    res.json({
        success: true,
        presentation: {
            key,
            user: target.loginId,
            fileName: target.fileName,
            url: `/${encodeURIComponent(slugOf(target.loginId, target.user))}/${encodeURIComponent(target.fileName)}`,
            title: rec.title || target.fileName.replace(/\.html$/i, ''),
            author: authorInfo(target.loginId, target.user),
            createdAt: rec.createdAt,
            updatedAt: rec.updatedAt || rec.createdAt,
            views: rec.views,
            likes: rec.likes.length,
            likedByMe: me ? rec.likes.includes(me) : false,
            comments: rec.comments.map(c => decorateComment(c, currentDB))
        }
    });
});

// Like / bỏ like (chỉ user đã đăng nhập)
app.post('/api/p/:user/:file/like', authenticateToken, (req, res) => {
    const target = resolvePresentation(req, res);
    if (!target) return;

    const social = loadSocial();
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

    saveSocial(social);
    res.json({ success: true, likes: rec.likes.length, likedByMe: index < 0 });
});

const COMMENT_MAX_LEN = 2000;

// Thêm bình luận (chỉ user đã đăng nhập)
app.post('/api/p/:user/:file/comments', authenticateToken, (req, res) => {
    const target = resolvePresentation(req, res);
    if (!target) return;

    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ success: false, error: 'Bình luận không được để trống' });
    if (text.length > COMMENT_MAX_LEN) {
        return res.status(400).json({ success: false, error: `Bình luận tối đa ${COMMENT_MAX_LEN} ký tự` });
    }

    const social = loadSocial();
    const currentDB = loadDB();
    const rec = getPres(social, presKey(target.loginId, target.fileName), fileMtime(target.pubPath));

    const comment = {
        id: crypto.randomBytes(8).toString('hex'),
        author: req.user.username,
        text,
        at: Date.now()
    };
    rec.comments.push(comment);
    saveSocial(social);

    res.json({ success: true, comment: decorateComment(comment, currentDB) });
});

// Sửa bình luận (chỉ chính tác giả)
app.patch('/api/p/:user/:file/comments/:commentId', authenticateToken, (req, res) => {
    const target = resolvePresentation(req, res);
    if (!target) return;

    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ success: false, error: 'Bình luận không được để trống' });
    if (text.length > COMMENT_MAX_LEN) {
        return res.status(400).json({ success: false, error: `Bình luận tối đa ${COMMENT_MAX_LEN} ký tự` });
    }

    const social = loadSocial();
    const currentDB = loadDB();
    const rec = getPres(social, presKey(target.loginId, target.fileName), fileMtime(target.pubPath));
    const comment = rec.comments.find(c => c.id === req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: 'Không tìm thấy bình luận' });
    if (comment.author !== req.user.username) {
        return res.status(403).json({ success: false, error: 'Chỉ được sửa bình luận của chính bạn' });
    }

    comment.text = text;
    comment.editedAt = Date.now();
    saveSocial(social);

    res.json({ success: true, comment: decorateComment(comment, currentDB) });
});

// --- PHỤC VỤ STATIC FILES ---

// Phục vụ trang Admin Panel (đổi url để tránh xung đột với user 'admin')
app.get('/admin_panel', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'admin.html')));
app.get('/admin_panel/', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'admin.html')));

// Phục vụ trang Gallery công khai
app.get('/gallery', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'gallery.html')));
app.get('/gallery/', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'gallery.html')));

// Trang chủ: giới thiệu HeyShow
app.get('/', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'landing.html')));

// Trang biên tập slide (editor) tại /design
app.get('/design', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
app.get('/design/', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));

// Trang quản lý trình chiếu của user tại /dashboard
app.get('/dashboard', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'dashboard.html')));
app.get('/dashboard/', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'dashboard.html')));

// Trang hướng dẫn sử dụng tại /help
app.get('/help', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'help.html')));
app.get('/help/', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'help.html')));

// Trang thư viện mẫu sẵn tại /templates
app.get('/templates', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'templates.html')));
app.get('/templates/', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'templates.html')));

// Phục vụ các slide đã được publish tự động theo username slug
app.use('/:slug', (req, res, next) => {
    const slug = req.params.slug;
    // Bỏ qua các route đặc biệt
    if (RESERVED_SLUGS.includes(slug)) return next();
    
    const currentDB = loadDB();
    let actualUserId = null;
    
    // Tìm kiếm user dựa vào urlSlug, nếu không có thì kiểm tra loginId
    for (const [loginId, user] of Object.entries(currentDB.users)) {
        if (slugOf(loginId, user) === slug || loginId === slug) {
            actualUserId = loginId;
            break;
        }
    }
    
    if (!actualUserId) return next();

    // Trang cá nhân của user: phục vụ profile.html khi truy cập /<slug> hoặc /<slug>/
    if (req.path === '/' || req.path === '') {
        return res.sendFile(path.join(CLIENT_DIST, 'profile.html'));
    }

    const ownerDir = userDir(actualUserId);
    if (!ownerDir) return next();

    const userPubDir = path.join(ownerDir, 'published');

    // Đếm lượt xem khi mở trang slide thật; bỏ qua thumbnail (?embed=1) của gallery
    // và chế độ in PDF (?print-pdf) vì đó không phải lượt xem thật
    // req.path ở đây đã tương đối so với mount '/:slug' (Express tự cắt phần slug)
    if (req.method === 'GET' && req.query.embed === undefined && req.query['print-pdf'] === undefined) {
        // req.path còn ở dạng percent-encoded (URL thô) nên phải giải mã,
        // nếu không các tên file tiếng Việt/có dấu cách sẽ không khớp với file trên đĩa
        let rawName = req.path.replace(/^\/+/, '');
        try { rawName = decodeURIComponent(rawName); } catch (e) { /* giữ nguyên nếu mã hoá lỗi */ }
        const viewedFile = safeFileName(rawName);
        if (viewedFile && viewedFile.endsWith('.html') && fs.existsSync(path.join(userPubDir, viewedFile))) {
            const social = loadSocial();
            const rec = getPres(social, presKey(actualUserId, viewedFile), fileMtime(path.join(userPubDir, viewedFile)));
            rec.views += 1;
            saveSocial(social);
        }
    }

    if (fs.existsSync(userPubDir)) {
        express.static(userPubDir, { index: false })(req, res, next);
    } else {
        next();
    }
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

// Start server
app.listen(PORT, () => {
    console.log(`Server HeyShow is running at http://localhost:${PORT}`);
});
