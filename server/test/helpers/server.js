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
async function startServer() {
    const port = await freePort();
    const dataDir = mkdtemp();
    const child = spawn(process.execPath, [APP], {
        cwd: SERVER_ROOT,
        env: { ...process.env, PORT: String(port), HEYSHOW_DATA_DIR: dataDir }
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
