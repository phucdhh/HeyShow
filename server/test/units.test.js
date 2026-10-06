// Test đơn vị cho các module nền: phân cấp quyền, lịch sử phiên bản, tầng lưu trữ JSON,
// mảnh ghép bắt buộc trong file slide. Không khởi động server — chạy thẳng trên các hàm
// thuần và thư mục tạm.
//
// Chạy: node --test server/test/

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const access = require('../src/access');
const history = require('../src/history');
const { createJsonStore, atomicWrite } = require('../src/storage');
const { patchSlideHtml, SLIDE_HEAD_GUARD, GUARD_MARKER, SHIM_MARKER } = require('../src/slide-parts');

function tmpDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), `heyshow-${prefix}-`));
}

// Date.now tăng dần giả định: tên bản lưu chứa millis nên đây là cách duy nhất
// để thứ tự "bản nào mới hơn" là xác định khi vòng lặp chạy trong cùng một mili giây.
function withFakeClock(run) {
    const real = Date.now;
    let t = 1_700_000_000_000;
    Date.now = () => ++t;
    try {
        return run();
    } finally {
        Date.now = real;
    }
}

// ============================ access.js ============================

test('access: thang bậc quyền và hạn mức bài đúng như tài liệu', () => {
    assert.deepEqual(access.roleNames(), ['user', 'designer', 'master', 'admin']);
    assert.equal(access.maxPresentations('user'), 10);
    assert.equal(access.maxPresentations('designer'), 20);
    assert.equal(access.maxPresentations('master'), 50);
    assert.equal(access.maxPresentations('admin'), Infinity);

    assert.ok(access.rankOf('user') < access.rankOf('designer'));
    assert.ok(access.rankOf('designer') < access.rankOf('master'));
    assert.ok(access.rankOf('master') < access.rankOf('admin'));
    assert.ok(access.isAdmin('admin'));
    assert.ok(!access.isAdmin('master'));
});

test('access: role lạ hoặc thiếu bị quy về user, không nâng quyền thầm lặng', () => {
    for (const junk of [undefined, null, '', 'supervisor', 'ADMIN', 42, { role: 'admin' }]) {
        assert.equal(access.normalizeRole(junk), 'user', `role ${JSON.stringify(junk)} phải về user`);
    }
    assert.equal(access.maxPresentations('ADMIN'), 10, 'phân biệt hoa thường — "ADMIN" không phải admin');
});

test('access: chặn ở đúng ngưỡng, admin không bao giờ bị chặn', () => {
    assert.ok(access.canAddPresentation(9, 'user'));
    assert.ok(!access.canAddPresentation(10, 'user'), 'user có 10 bài thì phải chặn');
    assert.ok(!access.canAddPresentation(20, 'designer'));
    assert.ok(!access.canAddPresentation(50, 'master'));
    assert.ok(access.canAddPresentation(10_000, 'admin'));
    assert.ok(access.canAddPresentation(9, 'supervisor'), 'role lạ dùng hạn mức user');
    assert.ok(!access.canAddPresentation(10, 'supervisor'));
});

test('access: thông báo vượt hạn mức nêu rõ quyền và con số, roleNames trả bản sao', () => {
    const msg = access.limitMessage('designer', 20);
    assert.ok(msg.includes('Designer') && msg.includes('20'), msg);

    const copy = access.roleNames();
    copy.push('root');
    assert.equal(access.roleNames().length, 4, 'sửa mảng trả về không được nhiễm vào module');
});

// ============================ history.js ============================

test('history: giữ đúng 5 bản gần nhất và bản mới nhất nằm đầu danh sách', () => {
    const dir = tmpDir('hist');
    try {
        withFakeClock(() => {
            for (let i = 1; i <= 7; i++) history.snapshot(dir, 'bai-giang.html', `nội dung ${i}`);
        });
        const versions = history.listVersions(dir, 'bai-giang.html');
        assert.equal(versions.length, history.MAX_VERSIONS);
        assert.equal(history.MAX_VERSIONS, 5);

        // Bản đầu tiên là bản mới nhất (i = 7)
        assert.equal(history.readVersion(dir, 'bai-giang.html', versions[0]), 'nội dung 7');
        assert.equal(history.readVersion(dir, 'bai-giang.html', versions[4]), 'nội dung 3');
        assert.deepEqual(
            versions.map(v => history.readVersion(dir, 'bai-giang.html', v)),
            ['nội dung 7', 'nội dung 6', 'nội dung 5', 'nội dung 4', 'nội dung 3'],
            'danh sách phải mới nhất trước và hai bản cũ nhất đã bị xóa'
        );
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('history: readVersion chặn mọi kiểu đi lạc ra ngoài thư mục lịch sử', () => {
    const dir = tmpDir('hist');
    try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'doc.txt'), 'bên ngoài');
        const v = history.snapshot(dir, 'a.html', 'nội dung');

        assert.equal(history.readVersion(dir, 'a.html', v.name), 'nội dung');
        for (const bad of ['../doc.txt', '../doc.html', 'a/../../doc.html', '', null, 'khong-phai-html']) {
            assert.equal(history.readVersion(dir, 'a.html', bad), null, `phải chặn: ${bad}`);
        }
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('history: snapshot bỏ qua nội dung rỗng, file chưa có lịch sử trả mảng trống', () => {
    const dir = tmpDir('hist');
    try {
        assert.equal(history.snapshot(dir, 'a.html', ''), null);
        assert.equal(history.snapshot(dir, 'a.html', null), null);
        assert.deepEqual(history.listVersions(dir, 'chua-tung-luu.html'), []);
        assert.equal(history.readVersion(dir, 'chua-tung-luu.html', 'khong-co.html'), null);

        const info = history.versionInfo(dir, 'chua-tung-luu.html', 'khong-co.html');
        assert.equal(info.at, null);
        assert.equal(info.size, 0);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('history: tên file độc địa được làm sạch, dropHistories xóa sạch dấu vết', () => {
    const dir = tmpDir('hist');
    try {
        withFakeClock(() => {
            history.snapshot(dir, '../../evil.html', 'x');
            history.snapshot(dir, 'bài giảng 01.html', 'y');
        });
        const entries = fs.readdirSync(path.join(dir, 'history'));
        assert.equal(entries.length, 2);
        for (const e of entries) {
            assert.ok(!e.includes('/'), `tên thư mục lịch sử phải không còn dấu chéo: ${e}`);
            assert.ok(!e.includes('..'), `không cho phép "..": ${e}`);
        }

        history.dropHistories(dir, ['../../evil.html', 'bài giảng 01.html']);
        assert.equal(fs.readdirSync(path.join(dir, 'history')).length, 0);
        history.dropHistories(dir, ['khong-ton-tai.html']); // không ném khi không có lịch sử
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

// ============================ storage.js ============================

test('store: seed ra file mới, ghi nguyên tử, quyền 0600, không sót file tạm', () => {
    const dir = tmpDir('store');
    try {
        const file = path.join(dir, 'db.json');
        const store = createJsonStore({ file, label: 'db', mode: 0o600, seed: () => ({ users: {} }) });

        store.read();
        assert.ok(!fs.existsSync(file), 'chưa sửa thì chưa ghi đĩa');

        store.mutate(db => { db.users.admin = { role: 'admin' }; });
        store.mutate(db => { db.users.teacher = { role: 'user' }; });
        assert.equal(store.isDirty(), true);
        store.flush(true);

        const onDisk = JSON.parse(fs.readFileSync(file, 'utf-8'));
        assert.deepEqual(Object.keys(onDisk.users).sort(), ['admin', 'teacher'], 'cả hai lần mutate đều được giữ');
        assert.equal(fs.statSync(file).mode & 0o777, 0o600);
        assert.ok(!fs.existsSync(`${file}.tmp`), 'file tạm phải được rename đi');
        assert.equal(store.isDirty(), false);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('store: nhiều lần flush khi đã sạch không ghi lại đĩa', () => {
    const dir = tmpDir('store');
    try {
        const file = path.join(dir, 'social.json');
        const store = createJsonStore({ file, label: 'social', seed: () => ({}) });
        store.mutate(d => { d.x = 1; });
        store.flush(true);
        const first = fs.statSync(file).mtimeMs;

        const later = new Date(first + 50).getTime();
        fs.utimesSync(file, new Date(later), new Date(later));
        store.flush(); // không dirty -> không ghi -> mtime giữ nguyên
        assert.equal(fs.statSync(file).mtimeMs, later);
        store.flush(true); // force thì phải ghi
        assert.notEqual(fs.statSync(file).mtimeMs, later);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('store: JSON hỏng không làm sập API, bản gốc được báo về để cứu dữ liệu', () => {
    const dir = tmpDir('store');
    try {
        const file = path.join(dir, 'db.json');
        fs.writeFileSync(file, '{ "users": [broken');

        const seen = [];
        const store = createJsonStore({
            file,
            label: 'db',
            seed: () => ({ users: {} }),
            onCorrupt: (err, text) => seen.push({ message: err.message, text })
        });

        assert.deepEqual(store.read(), { users: {} }, 'phải làm việc trên cấu trúc khởi tạo');
        assert.equal(seen.length, 1);
        assert.ok(seen[0].text.includes('broken'), 'onCorrupt nhận nguyên văn file hỏng để sao lưu');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('store: JSON hợp lệ nhưng sai kiểu (mảng/chuỗi) cũng coi là hỏng', () => {
    const dir = tmpDir('store');
    try {
        for (const [content, name] of [[[], 'mảng'], ['"chuỗi"', 'chuỗi'], ['null', 'null']]) {
            const file = path.join(dir, `db-${name}.json`);
            fs.writeFileSync(file, JSON.stringify(content));
            let corrupt = 0;
            const store = createJsonStore({
                file,
                label: 'db',
                seed: () => ({ users: {} }),
                onCorrupt: () => { corrupt++; }
            });
            assert.deepEqual(store.read(), { users: {} }, `${name} phải về seed`);
            assert.equal(corrupt, 1);
        }
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('store: tiến trình khác ghi đè lên đĩa (rsync) thì cache phải tự đọc lại', () => {
    const dir = tmpDir('store');
    try {
        const file = path.join(dir, 'db.json');
        const store = createJsonStore({ file, label: 'db', mode: 0o600, seed: () => ({ users: {} }) });
        store.mutate(db => { db.users.a = 1; });
        store.flush(true);
        assert.equal(store.read().users.a, 1);

        // ai đó sửa trực tiếp trên đĩa, độ dài khác để mtime/size đều đổi
        fs.writeFileSync(file, JSON.stringify({ users: { b: 2 }, note: 'thay đổi từ bên ngoài' }));
        const fresh = store.read();
        assert.equal(fresh.users.b, 2);
        assert.equal(fresh.users.a, undefined, 'không được tưởng cache cũ là bản hiện hành');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('store: normalize chạy mỗi lần đọc để vá cấu trúc thiếu', () => {
    const dir = tmpDir('store');
    try {
        const file = path.join(dir, 'db.json');
        fs.writeFileSync(file, JSON.stringify({ users: { minhtan: { role: 'user' } } }));
        const store = createJsonStore({
            file,
            label: 'db',
            seed: () => ({ users: {} }),
            normalize: db => { db.tokenVersion = db.tokenVersion || 1; }
        });
        assert.equal(store.read().tokenVersion, 1);
        assert.equal(store.read().users.minhtan.role, 'user', 'normalize không được phá dữ liệu có thật');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('atomicWrite: nội dung đầy đủ trên đĩa kể cả khi chuỗi dài', () => {
    const dir = tmpDir('store');
    try {
        const file = path.join(dir, 'big.json');
        const text = JSON.stringify({ blob: 'x'.repeat(2_000_000) });
        atomicWrite(file, text);
        assert.equal(fs.readFileSync(file, 'utf-8'), text);
        assert.ok(!fs.existsSync(`${file}.tmp`));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

// ============================ slide-parts.js ============================

// Bài đã publish từ trước là file tĩnh, không tự nhiên có guard + shim như bản
// buildFullHtml hiện tại — script vá phải thêm đúng hai mảnh đó và không làm đổi bài.
function oldDeck(extra = '') {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Bai cu</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/reveal.min.css">
${extra}</head>
<body>
    <div class="reveal"><div class="slides">
        <section><h1>MOT</h1></section>
        <section><h1>HAI</h1></section>
    </div></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/reveal.min.js"></script>
    <script>Reveal.initialize({ hash: true });</script>
</body>
</html>`;
}

test('slide-parts: vá bài cũ thêm đủ guard + shim, shim đứng trước script Reveal', () => {
    const { html, added } = patchSlideHtml(oldDeck());
    assert.deepEqual(added, ['guard', 'shim']);
    assert.ok(html.includes(SHIM_MARKER), 'phải có shim sessionStorage');
    assert.ok(html.includes(GUARD_MARKER), 'phải có rule ẩn slide không hiện tại');
    assert.ok(html.indexOf(SHIM_MARKER) < html.indexOf('<script src="https://cdnjs'),
        'shim phải chạy trước Reveal thì mới đỡ được lỗi');
    assert.ok(html.indexOf('<style>') < html.indexOf('</head>'), 'guard phải vào trước </head>');
    assert.ok(html.includes('<h1>HAI</h1>'), 'nội dung bài giữ nguyên');
});

test('slide-parts: bài đã có mảnh nào thì không chèn lại lần nữa', () => {
    const once = patchSlideHtml(oldDeck()).html;
    const twice = patchSlideHtml(once);
    assert.deepEqual(twice.added, [], 'vá lần hai phải không đổi gì');
    assert.equal(twice.html, once);

    const onlyShim = patchSlideHtml(oldDeck(`    <style>${SLIDE_HEAD_GUARD}</style>\n`));
    assert.deepEqual(onlyShim.added, ['shim'], 'đã có guard thì chỉ thiếu shim');
});

test('slide-parts: file lạ thì bỏ qua, không ghi bản vá nửa vời', () => {
    const noHead = patchSlideHtml('<html><body><div class="reveal"></div></body></html>');
    assert.match(noHead.error, /<\/head>/);
    assert.equal(noHead.html, '<html><body><div class="reveal"></div></body></html>', 'html trả về phải còn nguyên');

    const noScript = patchSlideHtml('<html><head><title>x</title></head><body>bài viết thường</body></html>');
    assert.match(noScript.error, /<script>/);
    assert.ok(!noScript.html.includes(SHIM_MARKER));
});
