// Tiện ích khởi động một server HeyShow cô lập phục vụ test.
//
// Test không được đụng tới data/ thật: HEYSHOW_DATA_DIR trỏ toàn bộ ghi đọc ra thư
// mục tạm, PORT trỏ sang cổng khác để không xung đột với server đang chạy.

const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

// Server/ là gốc tương đối: helpers nằm ở server/test/helpers
const SERVER_ROOT = path.join(__dirname, '..', '..');
const APP = path.join(SERVER_ROOT, 'src', 'app.js');

function freePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.once('error', reject);
        srv.listen(0, '127.0.0.1', () => {
            const { port } = srv.address();
            srv.close(() => resolve(port));
        });
    });
}

function mkdtemp() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'heyshow-test-'));
}

// Boot server, chờ dòng "is running at" rồi trả về { url, adminPassword, stop }
// dbSeed: nội dung db.json ghi xuống TRƯỚC khi khởi động, dùng cho các tài khoản cũ
// mà API hiện tại không tạo được (ví dụ tên đăng nhập có dấu cách và dấu câu).
// prepare: dựng sẵn cây thư mục users/ trong kho tạm trước khi boot, cần cho các test
// phụ thuộc thời điểm tạo tài khoản vì server chỉ tự tạo thư mục cho admin.
// env: biến môi trường riêng cho instance này (MAIL_TRANSPORT, PUBLIC_BASE_URL...).
//
// Mọi instance test đều bị khóa chặt đường gửi thư: app.js đọc server/.env, mà .env của
// máy phát triển có thể chứa SMTP thật. Không khóa thì một test tình cờ sẽ gửi email
// thật bằng hộp thư của người lập trình. dotenv không ghi đè biến đã tồn tại (kể cả
// chuỗi rỗng), nên đặt sẵn ở đây là chặn được. Test cần bắt mail thì tự bật
// MAIL_TRANSPORT=capture, thư khi đó chỉ đi vào data/mail-outbox.jsonl của thư mục tạm.
const NO_MAIL_ENV = {
    MAIL_TRANSPORT: 'off',
    SMTP_HOST: '', SMTP_PORT: '', SMTP_USER: '', SMTP_PASS: '', MAIL_FROM: ''
};

// Cùng lý do với thư: server/.env của máy phát triển có thể trỏ tới HeyTTS thật. Mọi test
// mặc định tắt nhánh TTS; test nào cần thì tự truyền HEYTTS_URL của mock qua tham số env.
const NO_TTS_ENV = {
    HEYTTS_URL: '', HEYTTS_API_KEY: ''
};

async function startServer({ dbSeed, prepare, env = {} } = {}) {
    const port = await freePort();
    const dataDir = mkdtemp();
    if (prepare) prepare(dataDir);
    if (dbSeed) fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify(dbSeed), { mode: 0o600 });
    const child = spawn(process.execPath, [APP], {
        cwd: SERVER_ROOT,
        env: { ...process.env, ...NO_MAIL_ENV, ...NO_TTS_ENV, ...env, PORT: String(port), HEYSHOW_DATA_DIR: dataDir }
    });

    let log = '';
    const childErr = new Error('Server test không khởi động được');
    await new Promise((resolve, reject) => {
        const onData = buf => {
            log += buf.toString();
            if (/is running at/.test(log)) resolve();
        };
        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.once('exit', code => reject(new Error(`Server thoát sớm (code ${code}):\n${log}`)));
        setTimeout(() => reject(Object.assign(childErr, { log })), 10000);
    });

    const adminPassword = (log.match(/password: (\S+)/) || [])[1];

    return {
        url: `http://127.0.0.1:${port}`,
        dataDir,
        adminPassword,
        log: () => log,
        async stop(signal = 'SIGTERM') {
            if (child.exitCode === null && child.signalCode === null) child.kill(signal);
            await new Promise(resolve => child.once('exit', resolve));
            fs.rmSync(dataDir, { recursive: true, force: true });
        }
    };
}

function apiRequest(baseUrl, method, route, { token, body } = {}) {
    return fetch(baseUrl + route, {
        method,
        headers: {
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
    }).then(async res => ({
        status: res.status,
        json: await res.json().catch(() => null),
        headers: Object.fromEntries(res.headers)
    }));
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = { startServer, apiRequest, sleep, mkdtemp };
