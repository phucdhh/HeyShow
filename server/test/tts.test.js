// Test thẻ <tts>: đổi thẻ lúc publish, cơ chế lazy (chưa gọi HeyTTS khi publish), cache
// miss -> hit, chặn văn bản lạ khi chưa đăng nhập, và các mảnh runtime khớp giữa server
// với client. HeyTTS thật không được gọi: mỗi test dựng một mock HTTP cục bộ.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const path = require('path');

const { startServer, apiRequest } = require('./helpers/server');

const API_KEY = 'khoa-thu-nghiem';
const OGG = Buffer.concat([Buffer.from('OggS'), Buffer.from('opus-thu-nghiem')]);

function startMockHeyTts() {
    let calls = 0;
    let last = null;

    const server = http.createServer((req, res) => {
        if (req.method !== 'POST' || req.url !== '/v1/tts') {
            res.writeHead(404);
            return res.end();
        }
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', () => {
            calls++;
            let body = null;
            try { body = JSON.parse(raw); } catch (err) { /* để null */ }
            last = { headers: req.headers, body };

            if (String(req.headers['x-api-key'] || '') !== API_KEY) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ detail: 'Invalid API key' }));
            }
            res.writeHead(200, {
                'Content-Type': 'audio/ogg; codecs=opus',
                'X-Audio-Duration': '3.000'
            });
            res.end(OGG);
        });
    });

    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({
                url: `http://127.0.0.1:${port}`,
                calls: () => calls,
                last: () => last,
                stop: () => new Promise((done) => server.close(done))
            });
        });
    });
}

let mock = null;
let srv = null;
let token = null;
let publishedHash = null;
let ttsDir = null;

const SAMPLE = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../client/src/samples/tts/samples.json'), 'utf-8'
))[0];

test.before(async () => {
    mock = await startMockHeyTts();
    srv = await startServer({
        env: {
            HEYTTS_URL: mock.url,
            HEYTTS_API_KEY: API_KEY,
            TTS_MAX_PER_MINUTE: '3'
        }
    });
    ttsDir = path.join(srv.dataDir, 'tts');

    const login = await apiRequest(srv.url, 'POST', '/api/auth/login', {
        body: { username: 'admin', password: srv.adminPassword }
    });
    assert.equal(login.status, 200);
    token = login.json.token;
});

test.after(async () => {
    if (srv) await srv.stop();
    if (mock) await mock.stop();
});

// Đoạn mẫu công khai ở /help và /templates được server đăng ký sẵn lúc khởi động, nên
// người chưa đăng nhập vẫn nghe thử được. Đây cũng là lần tạo âm thanh đầu tiên (miss).
test('mẫu công khai: chưa đăng nhập vẫn tạo được, và lần hai là cache hit', async () => {
    const first = await apiRequest(srv.url, 'POST', '/api/tts/speak', {
        body: { text: SAMPLE.text, voice: SAMPLE.voice, speed: SAMPLE.speed }
    });
    assert.equal(first.status, 200, JSON.stringify(first.json));
    assert.equal(first.json.success, true);
    assert.equal(first.json.cached, false);
    assert.equal(first.json.voice, SAMPLE.voice);
    assert.equal(mock.calls(), 1, 'lần đầu phải gọi HeyTTS đúng một lần');
    assert.equal(mock.last().body.voice, SAMPLE.voice);
    assert.equal(mock.last().body.speed, SAMPLE.speed);
    assert.equal(mock.last().headers['x-api-key'], API_KEY, 'server phải gửi khoá HeyTTS');

    const second = await apiRequest(srv.url, 'POST', '/api/tts/speak', {
        body: { text: SAMPLE.text, voice: SAMPLE.voice, speed: SAMPLE.speed }
    });
    assert.equal(second.status, 200);
    assert.equal(second.json.cached, true);
    assert.equal(mock.calls(), 1, 'cache hit không được gọi lại HeyTTS');
});

// Publish chỉ đổi thẻ sang script raw-text + đăng ký việc đọc; âm thanh chưa được tạo.
test('publish <tts>: đổi thẻ, gắn hash, đăng ký job nhưng KHÔNG gọi HeyTTS', async () => {
    const sp = require('../src/slide-parts.js');
    const callsTruoc = mock.calls();
    const code = [
        '<section>',
        '  <h2>Nghe lại bài giảng</h2>',
        '  <tts data-voice="duc_duy" data-speed="1.2">',
        '    Xin chào < các em & thầy cô, đây là bài học hôm nay.',
        '  </tts>',
        '</section>'
    ].join('\n');

    await apiRequest(srv.url, 'POST', '/api/files/tts.html', { token, body: { content: code } });
    const pub = await apiRequest(srv.url, 'POST', '/api/files/tts.html/publish', { token });
    assert.equal(pub.status, 200);
    const bai = await (await fetch(srv.url + pub.json.url)).text();

    assert.ok(bai.includes(sp.SLIDE_TTS_JS), 'bản publish phải nội tuyến đúng runtime tts');
    assert.ok(bai.includes(sp.SLIDE_TTS_STYLE), 'bản publish phải kèm CSS của nút Nghe');
    assert.ok(bai.includes(`<script type="${sp.TTS_TYPE}"`), 'thẻ phải thành script raw-text');

    const khop = bai.match(/<script type="text\/tts"[^>]*data-tts-hash="([a-f0-9]{32})"[^>]*>([\s\S]*?)<\/script>/);
    assert.ok(khop, 'phải gắn data-tts-hash vào thẻ');
    publishedHash = khop[1];
    assert.equal(khop[2].replace(/\s+/g, ' ').trim(),
        'Xin chào < các em & thầy cô, đây là bài học hôm nay.',
        'chữ trong thẻ phải đi qua nguyên văn, kể cả dấu < và &');

    // Phần bài viết không còn thẻ <tts> thô nào (hai mảnh runtime có nhắc tên thẻ trong
    // comment nên phải gỡ ra trước khi dò).
    const phanBai = bai.replace(sp.SLIDE_TTS_STYLE, '').replace(sp.SLIDE_TTS_JS, '');
    assert.ok(!/<\s*tts\b/i.test(phanBai), 'không còn thẻ <tts> thô trong bài viết');

    assert.equal(mock.calls(), callsTruoc, 'publish không được gọi HeyTTS — phải lazy');
    const jobFile = path.join(ttsDir, `${publishedHash}.json`);
    assert.ok(fs.existsSync(jobFile), 'việc đọc phải được đăng ký ngay lúc publish');
    const job = JSON.parse(fs.readFileSync(jobFile, 'utf-8'));
    assert.equal(job.voice, 'duc_duy');
    assert.equal(job.speed, 1.2);
    assert.equal(job.text, 'Xin chào < các em & thầy cô, đây là bài học hôm nay.');
    assert.equal(fs.existsSync(path.join(ttsDir, `${publishedHash}.opus`)), false,
        'chưa bấm nghe thì chưa có tệp âm thanh');
});

test('bài đã publish: xin theo hash là cache miss rồi hit, file Opus phục vụ được', async () => {
    const callsTruoc = mock.calls();

    const first = await apiRequest(srv.url, 'POST', '/api/tts/speak', { body: { hash: publishedHash } });
    assert.equal(first.status, 200, JSON.stringify(first.json));
    assert.equal(first.json.cached, false);
    assert.equal(mock.calls(), callsTruoc + 1);
    assert.equal(mock.last().body.text, 'Xin chào < các em & thầy cô, đây là bài học hôm nay.');
    assert.equal(mock.last().body.voice, 'duc_duy');

    const opus = path.join(ttsDir, `${publishedHash}.opus`);
    assert.ok(fs.existsSync(opus), 'âm thanh phải được lưu trên máy chủ HeyShow');
    assert.equal(fs.readFileSync(opus).subarray(0, 4).toString('latin1'), 'OggS');

    const second = await apiRequest(srv.url, 'POST', '/api/tts/speak', { body: { hash: publishedHash } });
    assert.equal(second.status, 200);
    assert.equal(second.json.cached, true);
    assert.equal(mock.calls(), callsTruoc + 1, 'hit không được gọi lại HeyTTS');

    const audio = await fetch(`${srv.url}/api/tts/audio/${publishedHash}.opus`);
    assert.equal(audio.status, 200);
    assert.match(audio.headers.get('content-type'), /audio\/ogg/);
    assert.match(audio.headers.get('cache-control'), /immutable/);
    assert.equal(audio.headers.get('access-control-allow-origin'), '*',
        'trang slide chạy origin mờ nên file âm thanh phải mở CORS');
    const bytes = Buffer.from(await audio.arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'OggS');
});

test('hash lạ không được tạo âm thanh', async () => {
    const callsTruoc = mock.calls();
    const res = await apiRequest(srv.url, 'POST', '/api/tts/speak', { body: { hash: '0'.repeat(32) } });
    assert.equal(res.status, 403);
    assert.equal(res.json.success, false);
    assert.equal(mock.calls(), callsTruoc);
});

test('preview đã đăng nhập: đọc được chữ mới, tốc độ ngoài khoảng bị kẹp về biên', async () => {
    const callsTruoc = mock.calls();
    const text = 'Một câu hoàn toàn mới chỉ có trong bản nháp của giáo viên.';
    const res = await apiRequest(srv.url, 'POST', '/api/tts/speak', {
        token, body: { text, voice: 'af_heart', speed: 5 }
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(res.json.cached, false);
    assert.equal(res.json.speed, 2, 'tốc độ 5 phải được kẹp về 2');
    assert.equal(mock.calls(), callsTruoc + 1);
    assert.equal(mock.last().body.speed, 2);
    assert.equal(mock.last().body.voice, 'af_heart');

    // Sau khi tạo, đoạn chữ này đã được đăng ký nên người khác xin lại là cache hit.
    const lai = await apiRequest(srv.url, 'POST', '/api/tts/speak', { body: { text, voice: 'af_heart', speed: 5 } });
    assert.equal(lai.status, 200);
    assert.equal(lai.json.cached, true);
});

test('chưa đăng nhập thì không được đọc văn bản tuỳ ý', async () => {
    const callsTruoc = mock.calls();
    const res = await apiRequest(srv.url, 'POST', '/api/tts/speak', {
        body: { text: 'Đoạn chữ không có trong bài nào cả.', voice: 'diem_trinh', speed: 1 }
    });
    assert.equal(res.status, 403);
    assert.match(res.json.error, /Chưa đăng nhập|chưa được đăng ký/);
    assert.equal(mock.calls(), callsTruoc);
});

test('token hỏng bị từ chối trước khi gọi HeyTTS', async () => {
    const callsTruoc = mock.calls();
    const res = await apiRequest(srv.url, 'POST', '/api/tts/speak', {
        token: 'khong.phai.token', body: { text: 'Một câu bất kỳ.', speed: 1 }
    });
    assert.equal(res.status, 401);
    assert.equal(res.json.code, 'auth');
    assert.equal(mock.calls(), callsTruoc);
});

test('hạn mức chỉ tính lần gọi HeyTTS thật; cache hit vẫn phục vụ', async () => {
    // Ba lần tạo thật đã dùng hết hạn mức 3/phút của instance test này.
    const moi = await apiRequest(srv.url, 'POST', '/api/tts/speak', {
        token, body: { text: 'Câu thứ tư, vượt hạn mức thử nghiệm.', speed: 1 }
    });
    assert.equal(moi.status, 429, 'lần tạo thật thứ tư phải bị chặn');

    const hit = await apiRequest(srv.url, 'POST', '/api/tts/speak', { body: { hash: publishedHash } });
    assert.equal(hit.status, 200, 'cache hit không bị hạn mức chặn');
    assert.equal(hit.json.cached, true);
});

test('bài không có <tts> không mang runtime hay CSS âm thanh', async () => {
    const sp = require('../src/slide-parts.js');
    const code = '<section><h1>Chỉ chữ</h1><p>a < b</p></section>';
    await apiRequest(srv.url, 'POST', '/api/files/notts.html', { token, body: { content: code } });
    const pub = await apiRequest(srv.url, 'POST', '/api/files/notts.html/publish', { token });
    const bai = await (await fetch(srv.url + pub.json.url)).text();
    assert.ok(!bai.includes(sp.TTS_MARKER), 'không được có runtime tts');
    assert.ok(!/heyshow-tts|audio\/ogg/.test(bai), 'không được nhắc tới trình phát âm thanh');
});

test('export bản nháp cũng đổi thẻ và đăng ký việc đọc', async () => {
    const sp = require('../src/slide-parts.js');
    const text = 'Một đoạn chữ chỉ có trong bản nháp để kiểm tra export.';
    const code = `<section><tts data-voice="mai_linh">${text}</tts></section>`;
    await apiRequest(srv.url, 'POST', '/api/files/tts-export.html', { token, body: { content: code } });

    const exported = await (await fetch(`${srv.url}/api/files/tts-export.html/export`, {
        headers: { Authorization: `Bearer ${token}` }
    })).text();
    assert.ok(exported.includes(sp.SLIDE_TTS_JS), 'file export phải có runtime tts');
    const hash = (exported.match(/data-tts-hash="([a-f0-9]{32})"/) || [])[1];
    assert.ok(hash, 'file export phải gắn hash');
    assert.ok(fs.existsSync(path.join(ttsDir, `${hash}.json`)), 'export phải đăng ký việc đọc');
});

test('thẻ <tts> hỏng: vẫn publish được nhưng lỗi hiện trong thẻ', async () => {
    const sp = require('../src/slide-parts.js');
    const code = '<section><tts>   </tts><tts data-speed="9">Đọc câu này.</tts></section>';
    await apiRequest(srv.url, 'POST', '/api/files/tts-bad.html', { token, body: { content: code } });
    const pub = await apiRequest(srv.url, 'POST', '/api/files/tts-bad.html/publish', { token });
    assert.equal(pub.status, 200, 'một thẻ hỏng không được chặn cả bài publish');
    const bai = await (await fetch(srv.url + pub.json.url)).text();
    assert.ok(bai.includes(sp.SLIDE_TTS_JS));
    assert.match(bai, /data-tts-error="[^"]*không có nội dung/);
    // Thẻ có chữ vẫn được đăng ký, tốc độ 9 bị kẹp về 2.
    const hash = (bai.match(/data-tts-hash="([a-f0-9]{32})"/) || [])[1];
    const job = JSON.parse(fs.readFileSync(path.join(ttsDir, `${hash}.json`), 'utf-8'));
    assert.equal(job.speed, 2);
});

test('CORS: preflight và response thật từ origin mờ đều nhận "*"', async () => {
    const preflight = await fetch(`${srv.url}/api/tts/speak`, {
        method: 'OPTIONS',
        headers: {
            Origin: 'null',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type'
        }
    });
    assert.ok(preflight.status === 204 || preflight.status === 200, `preflight trả ${preflight.status}`);
    assert.equal(preflight.headers.get('access-control-allow-origin'), '*');

    // origin "null" là đúng cảnh bài đã publish nằm trong CSP sandbox; header phải là *
    // chứ không phải "null" để mọi trình duyệt xử lý giống nhau.
    const that = await fetch(`${srv.url}/api/tts/speak`, {
        method: 'POST',
        headers: { Origin: 'null', 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: publishedHash })
    });
    assert.equal(that.status, 200);
    assert.equal(that.headers.get('access-control-allow-origin'), '*');
});

test('tệp âm thanh không tồn tại: 404 không cache, chặn tên lạ', async () => {
    for (const name of [`${'0'.repeat(32)}.opus`, 'khong-phai-hash.opus', '..%2F..%2Fdb.json']) {
        const res = await fetch(`${srv.url}/api/tts/audio/${name}`);
        assert.equal(res.status, 404, `${name} phải 404`);
        assert.equal(res.headers.get('cache-control'), 'no-store', '404 phải cho phép hỏi lại sau khi tạo xong');
    }
});

// Server cắt chuỗi từ file nguồn của client chứ không import: lệch một ký tự là preview
// và bản publish chạy hai kiểu khác nhau.
test('runtime <tts>: server và client sinh ra cùng một mảnh HTML', async () => {
    const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');
    const sp = require('../src/slide-parts.js');
    const client = await import('../../client/src/tts-runtime.js');

    for (const key of ['TTS_HOME', 'TTS_MARKER', 'TTS_TYPE']) {
        assert.equal(client[key], sp[key], `client/src/tts-runtime.js phải cùng ${key} với server`);
    }
    assert.equal(client.TTS_STYLE, sp.SLIDE_TTS_STYLE, 'CSS của preview và bản publish phải một');
    assert.equal(client.TTS_SCRIPT(''), sp.SLIDE_TTS_JS, 'runtime của preview và bản publish phải một');

    const MAU = '<section><tts data-voice="diem_trinh">a < b và "nháy"</tts></section>';
    assert.equal(client.TTS_BOC(MAU), sp.TTS_BOC(MAU), 'hai bên đổi thẻ phải ra cùng kết quả');
    assert.ok(sp.TTS_BOC(MAU).includes('<script type="text/tts" data-voice="diem_trinh">'));
    assert.equal(sp.TTS_BOC('<tts>chưa đóng'), '<tts>chưa đóng', 'thẻ thiếu </tts> phải để nguyên');

    // Hai thuộc tính của hệ thống không được để người dùng tự đặt.
    const tuDat = sp.TTS_BOC('<tts data-tts-hash="deadbeef" data-tts-error="x">chữ</tts>');
    assert.ok(!tuDat.includes('data-tts-hash') && !tuDat.includes('data-tts-error'));

    // Tuỳ biến hiển thị đi qua nguyên văn tới runtime.
    const tuyBien = '<tts data-controls="true" data-icon-only data-color="#0e7490"'
        + ' data-size="large" data-label="Nghe câu hỏi" data-caption="false">chữ</tts>';
    const ra = sp.TTS_BOC(tuyBien);
    for (const thuocTinh of ['data-controls="true"', 'data-icon-only', 'data-color="#0e7490"',
        'data-size="large"', 'data-label="Nghe câu hỏi"', 'data-caption="false"']) {
        assert.ok(ra.includes(thuocTinh), `TTS_BOC phải giữ ${thuocTinh}`);
    }

    for (const file of ['src/reveal-preview.js', 'src/main.js']) {
        assert.ok(read(`../../client/${file}`).includes('tts-runtime.js'),
            `${file} phải lấy runtime từ tts-runtime.js thay vì tự ghi`);
        assert.ok(read(`../../client/${file}`).includes('TTS_BOC('),
            `${file} phải đổi thẻ <tts> y hệt bản publish trước khi đưa vào DOM`);
    }
});

test('tuỳ biến hiển thị không làm đổi khoá cache', () => {
    const { createTts } = require('../src/tts');
    const t = createTts({ dir: srv.dataDir, url: '', logger: { warn() {}, error() {} } });
    const day = t.registerFromAttrs('Một câu ngắn.',
        ' data-voice="duc_duy" data-speed="1" data-controls="true" data-icon-only'
        + ' data-color="#0f766e" data-size="large" data-label="Nghe câu hỏi"');
    const gon = t.registerFromAttrs('Một câu ngắn.', ' data-voice="duc_duy" data-speed="1"');
    assert.ok(day.hash && gon.hash);
    assert.equal(day.hash, gon.hash,
        'màu/cỡ/icon/thanh audio chỉ là cách hiển thị, không được tách cache âm thanh');
});

test('chuẩn hoá: giọng mặc định, tốc độ dấu phẩy, chữ gom khoảng trắng', () => {
    const { createTts } = require('../src/tts');
    const t = createTts({ dir: srv.dataDir, url: '', logger: { warn() {}, error() {} } });
    const kq = t.normalize({ text: '  Xin   chào\ncác em. ', speed: '1,25' });
    assert.equal(kq.ok, true);
    assert.deepEqual(kq.job, { v: 1, text: 'Xin chào các em.', voice: 'diem_trinh', speed: 1.25 });
    assert.equal(t.normalize({ text: '', speed: 1 }).ok, false);
    assert.equal(t.normalize({ text: 'x', voice: 'giọng sai!', speed: 1 }).ok, false);
});

test('hội thoại: marker [giọng] tách thành segments, hash và readJob khớp', () => {
    const { createTts } = require('../src/tts');
    const t = createTts({ dir: srv.dataDir, url: '', logger: { warn() {}, error() {} } });
    const kq = t.normalize({
        text: '[am_adam] Good morning, class. [af_heart] It is five, sir.', speed: '1'
    });
    assert.equal(kq.ok, true, kq.error);
    assert.ok(Array.isArray(kq.job.segments), 'phải thành job segments');
    assert.deepEqual(kq.job.segments.map((s) => s.voice), ['am_adam', 'af_heart']);
    assert.deepEqual(kq.job.segments.map((s) => s.text), ['Good morning, class.', 'It is five, sir.']);
    assert.equal(kq.job.text, undefined, 'job hội thoại không có text đơn');

    const hash = t.register(kq.job);
    const doc = t.readJob(hash);
    assert.ok(doc, 'readJob phải trả lại job hội thoại');
    assert.deepEqual(doc.segments.map((s) => s.voice), ['am_adam', 'af_heart']);

    // Khai báo bằng mảng segments trực tiếp phải ra cùng khoá cache.
    const trucTiep = t.normalize({ segments: [
        { text: 'Good morning, class.', voice: 'am_adam', speed: 1 },
        { text: 'It is five, sir.', voice: 'af_heart', speed: 1 }
    ] });
    assert.equal(t.hashOf(trucTiep.job), hash, 'hai cách khai báo phải ra cùng hash');
});

test('mẫu công khai: đủ đoạn cho Help/Templates, tham số hợp lệ', () => {
    const ds = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../../client/src/samples/tts/samples.json'), 'utf-8'
    ));
    assert.ok(ds.length >= 5, 'Help/Templates đang dùng tới samples[4]');
    for (const [i, s] of ds.entries()) {
        assert.equal(typeof s.text, 'string', `samples[${i}].text`);
        assert.ok(s.text.trim().length > 0, `samples[${i}].text rỗng`);
        assert.match(s.voice, /^[a-z][a-z0-9_]{1,39}$/, `samples[${i}].voice`);
        assert.ok(s.speed >= 0.5 && s.speed <= 2, `samples[${i}].speed`);
    }
});

test('tab Debug báo thẻ <tts> trống, quá dài và tốc độ ngoài khoảng', async () => {
    const { runDiagnostics } = await import('../../client/src/debug.js');
    const text = [
        '<section>',
        '  <tts data-speed="5"></tts>',
        `  <tts>${'x'.repeat(5001)}</tts>`,
        '</section>'
    ].join('\n');
    const doc = {
        length: text.length,
        toString: () => text,
        lineAt: () => ({ number: 2 })
    };
    const issues = runDiagnostics(doc, { diagnostics: [], total: 1, master: { from: -1 } });
    const messages = issues.map((i) => i.message).join('\n');
    assert.match(messages, /trống/);
    assert.match(messages, /vượt giới hạn 5000/);
    assert.match(messages, /0\.5–2/);
});

test('hội thoại <tts>: marker [giọng] thành segments, HeyTTS nhận segments, HTTP trả voice dialogue', async () => {
    const { createTts } = require('../src/tts');
    const t = createTts({
        dir: path.join(srv.dataDir, 'tts'), url: mock.url, apiKey: API_KEY,
        logger: { warn() {}, error() {} }
    });

    const kq = t.normalize({
        text: 'Intro. [af_heart] Hello. [am_adam] Hi.',
        voice: 'bf_emma',
        speed: 0.9
    });
    assert.equal(kq.ok, true);
    assert.deepEqual(kq.job.segments, [
        { text: 'Intro.', voice: 'bf_emma', speed: 0.9 },
        { text: 'Hello.', voice: 'af_heart', speed: 0.9 },
        { text: 'Hi.', voice: 'am_adam', speed: 0.9 }
    ]);

    // Đường publish/export đi qua registerFromAttrs — cùng normalize, nên job cũng là segments.
    const reg = t.registerFromAttrs('[af_heart] Hi.', ' data-voice="bf_emma" data-speed="1"');
    const jobFile = JSON.parse(fs.readFileSync(path.join(srv.dataDir, 'tts', `${reg.hash}.json`), 'utf-8'));
    assert.deepEqual(jobFile.segments, [{ text: 'Hi.', voice: 'af_heart', speed: 1 }]);

    // Service gửi đúng mảng segments cho HeyTTS.
    const out = await t.synthesize(kq.job);
    assert.equal(out.cached, false);
    assert.equal(mock.last().body.segments.length, 3);
    assert.equal(mock.last().body.segments[1].voice, 'af_heart');

    // HTTP chỉ phục vụ lại file đã có; response mô tả hội thoại, không phải một giọng đơn.
    const res = await apiRequest(srv.url, 'POST', '/api/tts/speak', { body: { hash: out.hash } });
    assert.equal(res.status, 200);
    assert.equal(res.json.cached, true);
    assert.equal(res.json.voice, 'dialogue');
    assert.equal(res.json.speed, null);
    assert.equal(res.json.chars, 'Intro.'.length + 'Hello.'.length + 'Hi.'.length);
});
