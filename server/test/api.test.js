// Test tích hợp toàn bộ bề mặt API: quyền + hạn mức, lịch sử phiên bản, bình luận
// lồng nhau, đường dẫn /show/ và cô lập origin, thu hồi token, avatar.
//
// Chạy: node --test server/test/   (kho dữ liệu là thư mục tạm, không đụng data/)

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('fs');
const path = require('path');

const { startServer, apiRequest, sleep } = require('./helpers/server');

let srv = null;
let stopSrv = null;

test.before(async () => {
    srv = await startServer();
    const admin = await apiRequest(srv.url, 'POST', '/api/auth/login', {
        body: { username: 'admin', password: srv.adminPassword }
    });
    assert.equal(admin.status, 200);
    srv.admin = admin.json.token;
    srv.api = (method, route, opts = {}) => apiRequest(srv.url, method, route, { token: srv.admin, ...opts });

    // Một tài khoản cho mỗi quyền, tạo sẵn để không phải đăng ký trong từng test
    srv.users = {};
    for (const role of ['user', 'designer', 'master']) {
        const name = `t${role}`;
        await srv.api('POST', '/api/admin/users', { body: { username: name, password: 'matkhau123', role } });
        const login = await apiRequest(srv.url, 'POST', '/api/auth/login', { body: { username: name, password: 'matkhau123' } });
        srv.users[role] = { login: login.json.token, ...login.json.me };
    }
    stopSrv = () => srv.stop();
});

test.after(async () => {
    if (stopSrv) await stopSrv();
});

test('các quyền có hạn mức bài đúng như tài liệu', async () => {
    const expected = { user: 10, designer: 20, master: 50 };
    for (const [role, max] of Object.entries(expected)) {
        const res = await apiRequest(srv.url, 'GET', '/api/me/quota', { token: srv.users[role].login });
        assert.equal(res.json.quota.max, max, `${role} phải có hạn mức ${max}`);
    }
    const adminQuota = await srv.api('GET', '/api/me/quota');
    assert.equal(adminQuota.json.quota.max, null, 'admin trả về null (không giới hạn) sau khi qua JSON');
});

test('admin từ chối quyền không tồn tại', async () => {
    const res = await srv.api('POST', '/api/admin/users', { body: { username: 'tgone', password: 'matkhau123', role: 'superadmin' } });
    assert.equal(res.status, 400);
});

test('tài khoản user bị chặn ở bài thứ 11', async () => {
    const tok = srv.users.user.login;
    let blocked = null;
    for (let i = 1; i <= 12 && !blocked; i++) {
        const res = await apiRequest(srv.url, 'POST', `/api/files/limit-${i}.html`, {
            token: tok, body: { content: '<section><h1>x</h1></section>' }
        });
        if (res.status >= 400) blocked = { i, ...res };
    }
    assert.equal(blocked.i, 11, 'phải chặn đúng ở bài thứ 11');
    assert.equal(blocked.status, 403);
    assert.match(blocked.json.error, /tối đa 10 bài/);
    // 403 phải là lỗi quyền hạn, KHÔNG phải phiên chết — client dựa vào code 'auth'
    // để quyết định có xoá token hay không, nên thiếu field này sẽ đá nhầm người dùng
    assert.notEqual(blocked.json.code, 'auth', 'lỗi hạn mức không được báo là hết phiên');

    // designer vẫn tạo thoải mái trong khoảng đó
    for (let i = 1; i <= 11; i++) {
        const res = await apiRequest(srv.url, 'POST', `/api/files/limit-${i}.html`, {
            token: srv.users.designer.login, body: { content: '<section><h1>x</h1></section>' }
        });
        assert.equal(res.status, 200, `designer không bị chặn ở bài ${i}`);
    }
});

test('lịch sử phiên bản giữ đúng 5 bản gần nhất và khôi phục được', async () => {
    const tok = srv.users.master.login;
    const file = 'hist.html';

    await apiRequest(srv.url, 'POST', `/api/files/${file}`, { token: tok, body: { content: '<section><h1>lần 1</h1></section>' } });
    for (let i = 2; i <= 8; i++) {
        await apiRequest(srv.url, 'POST', `/api/files/${file}`, { token: tok, body: { content: `<section><h1>lần ${i}</h1></section>` } });
        await sleep(320); // lớn hơn debounce 250ms để mỗi lần ghi một phiên bản phân biệt được
    }

    const hist = await apiRequest(srv.url, 'GET', `/api/files/${file}/history`, { token: tok });
    assert.equal(hist.json.maxVersions, 5);
    assert.equal(hist.json.versions.length, 5, 'chỉ giữ 5 bản gần nhất');
    assert.deepEqual(
        hist.json.versions.map(v => v.name),
        [...hist.json.versions.map(v => v.name)].sort().reverse(),
        'danh sách phải mới nhất trước'
    );

    const oldest = hist.json.versions[hist.json.versions.length - 1];
    const read = await apiRequest(srv.url, 'GET', `/api/files/${file}/history/${oldest.name}`, { token: tok });
    const restored = await apiRequest(srv.url, 'POST', `/api/files/${file}/history/${oldest.name}/restore`, { token: tok });
    assert.equal(restored.status, 200);

    const current = await apiRequest(srv.url, 'GET', `/api/files/${file}`, { token: tok });
    assert.equal(current.json.content, read.json.content, 'nội dung sau khôi phục phải khớp bản đã lưu');

    // khôi phục cũng được cất thành một bản, nên vẫn không vượt 5
    const after = await apiRequest(srv.url, 'GET', `/api/files/${file}/history`, { token: tok });
    assert.equal(after.json.versions.length, 5);

    const foreign = await apiRequest(srv.url, 'GET', `/api/files/${file}/history`, { token: srv.users.user.login });
    assert.equal(foreign.json.versions.length, 0, 'user khác không đọc được lịch sử của nhau');
});

test('publish trả về link /show/ và slide nhận CSP sandbox', async () => {
    const tok = srv.users.master.login;
    const pub = await apiRequest(srv.url, 'POST', '/api/files/hist.html/publish', { token: tok });
    assert.equal(pub.status, 200);
    assert.ok(pub.json.url.startsWith('/show/tmaster/'), `url phải dạng /show/<slug>/…: ${pub.json.url}`);
    assert.ok(!('legacyUrl' in pub.json), 'chỉ trả về một dạng URL duy nhất, không kèm link cũ');

    const slide = await fetch(srv.url + pub.json.url);
    assert.equal(slide.status, 200);
    assert.match(slide.headers.get('content-security-policy'), /^sandbox\b/, 'slide phải chạy ở origin mờ');
    // no-cache để republish có hiệu lực ngay. Cố ý KHÔNG có no-transform: nó chặn Cloudflare
    // chèn beacon nhưng cũng chặn luôn Brotli, làm bài slide nặng gấp ~5 lần khi tải.
    assert.equal(slide.headers.get('cache-control'), 'no-cache',
        'republish phải có hiệu lực ngay, và không được thêm no-transform');

    // Chốt chặn chống CSS của bài viết làm mọi slide chồng lên nhau (vuốt trên điện thoại
    // không còn thay đổi gì). Ba bản template phải mang cùng một rule.
    const slideHtml = await slide.text();
    const GUARD = '.reveal:not(.overview) .slides>section:not(.present)';
    assert.ok(slideHtml.includes(GUARD), 'file publish phải có rule ẩn slide không hiện tại');
    for (const file of ['src/reveal-preview.js', 'src/main.js']) {
        const src = fs.readFileSync(path.join(__dirname, '..', '..', 'client', file), 'utf8');
        assert.ok(src.includes(GUARD), `${file} phải giữ đúng rule của bản publish`);
    }

    // Reveal 6 bật chế độ cuộn khi khung chứa ≤435px, tức là mọi điện thoại dọc và mọi khung
    // preview. Ở chế độ đó slide nằm trong trang cao theo kích thước thật của section, trên
    // nền đen của theme black (nền sáng của mẫu gắn ở .reveal chứ không ở <section>) — người
    // dùng báo bài mở trên điện thoại có slide nền tối. Preview và bản publish phải tắt như
    // nhau để điện thoại nào cũng còn vuốt từng slide, co vừa màn hình.
    const previewSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'src/reveal-preview.js'), 'utf8');
    assert.ok(previewSrc.includes('${REVEAL_SCROLL_MODE_OFF}'),
        'preview phải tắt chế độ cuộn tự động để luôn ra một slide trọn vẹn');
    assert.ok(slideHtml.includes('scrollActivationWidth: null'),
        'bản publish phải tắt chế độ cuộn, nếu không điện thoại dọc ra nền đen');

    // CSP sandbox biến sessionStorage thành bẫy ném SecurityError, còn Reveal 5/6 thì gọi
    // nó mỗi lần chuyển slide -> vuốt trên điện thoại chết hẳn. Bản publish phải tự đỡ
    // chỗ đó TRƯỚC khi nạp reveal.js.
    const SHIM = "Object.defineProperty(window, 'sessionStorage'";
    assert.ok(slideHtml.includes(SHIM), 'file publish phải có shim sessionStorage');
    const revealTag = slideHtml.match(/<script src="[^"]*\/reveal\.js\/[\d.]+\/reveal\.js"/);
    assert.ok(revealTag, 'file publish phải nạp Reveal từ CDN');
    assert.ok(slideHtml.indexOf(SHIM) < revealTag.index, 'shim phải chạy trước script Reveal.js');

    // Bài mở ở tab vẫn còn thanh địa chỉ nên người xem không thấy hết chiều cao slide:
    // bản publish phải tự kèm nút vào Fullscreen API, và nút phải biến mất khi bài được
    // nhúng làm thumbnail (gallery) hay khi in ra PDF.
    const BTN = '<button class="heyshow-fullscreen"';
    assert.ok(slideHtml.includes(BTN), 'file publish phải có nút toàn màn hình');
    assert.ok(slideHtml.includes('.heyshow-embed .heyshow-fullscreen'),
        'thumbnail ở gallery không được lộ nút');
    assert.ok(slideHtml.indexOf(BTN) < slideHtml.lastIndexOf('</body>'), 'nút phải ở trong body');
    assert.ok(slideHtml.includes("has('fs')"), '?fs=1 phải được xử lý ngay khi trang mở');
    assert.ok(!/allow-same-origin/.test(slide.headers.get('content-security-policy')),
        'không được gỡ origin mờ để đổi lấy việc sửa lỗi');

    // link kiểu cũ /<slug>/<file>.html vẫn mở được vì nhiều người đã chia sẻ
    const legacy = await fetch(`${srv.url}/tmaster/hist.html`);
    assert.equal(legacy.status, 200);
    assert.match(legacy.headers.get('content-security-policy'), /sandbox/);

    // các trang của ứng dụng KHÔNG bị sandbox (editor cần localStorage)
    const landing = await fetch(srv.url + '/');
    assert.ok(!/sandbox/.test(landing.headers.get('content-security-policy') || ''), 'trang editor phải giữ được origin thật');
    assert.equal(landing.status, 200);
});

// Nâng cấp Reveal là sửa hai hằng số ở hai file khác nhau, và 6.x còn đổi chỗ plugin math.
// Thiếu một trong hai thì bài publish chạy một bản Reveal, preview trong editor chạy bản
// kia, hoặc KaTeX mất không một tiếng động — nên bắt buộc test giữ nhịp.
test('nâng cấp Reveal: server và client cùng phiên bản, đúng layout của 6.x', async () => {
    const WANT = '6.0.2';
    const read = rel => fs.readFileSync(path.join(__dirname, rel), 'utf8');
    const verOf = src => (src.match(/REVEAL_VERSION = '([\d.]+)'/) || [])[1];

    const server = read('../src/slide-parts.js');
    const client = read('../../client/src/reveal-cdn.js');
    assert.equal(verOf(server), WANT, 'muốn đổi phiên bản thì cập nhật luôn hằng WANT của test này');
    assert.equal(verOf(client), WANT, 'client/src/reveal-cdn.js phải đổi cùng lúc với server');

    for (const [name, src] of [['server', server], ['client', client]]) {
        // Chỉ soi dòng khai báo, không soi cả file: phần comment cũng nhắc tới đường
        // dẫn kiểu 5.x thì grep thô sẽ báo lỗi oan.
        const mathLine = src.split('\n').find(line => line.includes('REVEAL_MATH_JS')) || '';
        assert.ok(mathLine.includes('/plugin/math.js'), `${name} phải nạp plugin/math.js của 6.x`);
        assert.ok(!mathLine.includes('plugin/math/math.js'),
            `${name} còn đường dẫn plugin math kiểu 5.x, bản đó không còn trên CDN`);
    }
    for (const file of ['src/reveal-preview.js', 'src/main.js']) {
        assert.ok(read(`../../client/${file}`).includes('reveal-cdn.js'),
            `${file} phải lấy URL Reveal từ reveal-cdn.js thay vì tự ghi`);
        assert.ok(read(`../../client/${file}`).includes('${REVEAL_KATEX_OPTS}'),
            `${file} phải dùng chung cấu hình KaTeX với bản publish`);
        assert.ok(read(`../../client/${file}`).includes('${REVEAL_SCROLL_MODE_OFF}'),
            `${file} phải tắt chế độ cuộn y hệt bản publish`);
    }

    // Khóa tắt chế độ cuộn: ba chỗ (publish, preview mẫu, editor) phải cùng một chuỗi.
    const scrollOf = src => (src.match(/REVEAL_SCROLL_MODE_OFF = '([^']+)'/) || [])[1];
    assert.equal(scrollOf(server), 'scrollActivationWidth: null',
        'server/src/slide-parts.js phải định nghĩa REVEAL_SCROLL_MODE_OFF');
    assert.equal(scrollOf(client), scrollOf(server),
        'client/src/reveal-cdn.js phải chép hệt khóa tắt chế độ cuộn của server');

    // Chữ Việt trong $...$ khiến KaTeX bắn cảnh báo mỗi lần mở console; tắt đúng loại đó,
    // server và client phải khai báo giống nhau từng ký tự.
    const optsOf = src => (src.match(/REVEAL_KATEX_OPTS = `([^`]+)`/) || [])[1];
    assert.ok(optsOf(server), 'server/src/slide-parts.js phải định nghĩa REVEAL_KATEX_OPTS');
    assert.equal(optsOf(client), optsOf(server), 'client/src/reveal-cdn.js phải chép hệt cấu hình KaTeX');
    assert.match(optsOf(server), /unicodeTextInMathMode/, 'phải nhắm đúng loại cảnh báo này');

    const html = await (await fetch(`${srv.url}/show/tmaster/hist.html`)).text();
    assert.ok(html.includes(`/reveal.js/${WANT}/reveal.js`), 'bài publish phải mang đúng phiên bản');
    assert.ok(html.includes(`/reveal.js/${WANT}/plugin/math.js`), 'bài publish phải nạp plugin math của 6.x');
    assert.ok(html.includes(optsOf(server)), 'bài publish phải mang cấu hình KaTeX chung');
});

// --- Thẻ <jsxgraph> ---
// Dấu `<` trong code JS (so sánh `a < b`) rơi vào DOM theo nghĩa HTML sẽ bị parser đọc thành
// thẻ và nuốt nốt `</section>` phía sau — đúng lớp lỗi "$0<p<1$" từng làm hỏng bài. Nên bản
// publish đổi cặp thẻ sang <script type="text/jsxgraph"> (raw-text, code còn nguyên từng ký
// tự) rồi runtime mới dựng bảng. Runtime kéo theo JSXGraph ~1MB, vì vậy bài không có thẻ
// <jsxgraph> tuyệt đối không được mang theo.
test('thẻ <jsxgraph>: bản publish mang runtime, code giữ nguyên từng ký tự', async () => {
    const sp = require('../src/slide-parts.js');
    const tok = srv.users.master.login;
    const code = [
        '<section>',
        '  <h2>Đường thẳng qua hai điểm</h2>',
        '  <jsxgraph>',
        '    const board = JXG.JSXGraph.initBoard(BOARDID, { boundingbox: [-8, 8, 8, -8], axis: true });',
        "    const A = board.create('point', [-3, 2], { name: 'A' });",
        "    const B = board.create('point', [2, -1], { name: 'B' });",
        '    if (A.X() < B.X()) { board.create(\'line\', [A, B], {}); }',
        '  </jsxgraph>',
        '</section>'
    ].join('\n');

    await apiRequest(srv.url, 'POST', '/api/files/jxg.html', { token: tok, body: { content: code } });
    const pub = await apiRequest(srv.url, 'POST', '/api/files/jxg.html/publish', { token: tok });
    assert.equal(pub.status, 200);
    const bai = await (await fetch(srv.url + pub.json.url)).text();

    assert.ok(bai.includes(sp.SLIDE_JSXGRAPH_JS), 'file publish phải nội tuyến đúng runtime mà slide-parts.js sinh ra');
    assert.ok(bai.includes(sp.SLIDE_JSXGRAPH_STYLE), 'file publish phải kèm CSS của khung bảng');
    assert.ok(bai.includes(`<script type="${sp.JSXGRAPH_TYPE}"`), 'thẻ phải thành script raw-text');
    // Hai mảnh runtime có nhắc tới "<jsxgraph>" trong comment/log nên phải gỡ chúng ra trước
    // rồi mới dò: còn lại đúng nghĩa là phần bài viết không còn thẻ thô.
    const phanBai = bai.replace(sp.SLIDE_JSXGRAPH_STYLE, '').replace(sp.SLIDE_JSXGRAPH_JS, '');
    assert.ok(!/<\s*jsxgraph\b/i.test(phanBai), 'không còn thẻ <jsxgraph> thô nào trong bài viết');
    // Nguyên văn cả dòng có dấu < viết trần: đó chính là thứ từng làm parser nuốt slide
    assert.ok(bai.includes('if (A.X() < B.X()) {'), 'code JSXGraph phải đi qua nguyên văn, kể cả dấu <');
    assert.ok(bai.includes(sp.JSXGRAPH_CDN), 'runtime phải trỏ đúng CDN JSXGraph');
    assert.equal(/<script[^>]*src="[^"]*jsxgraphcore\.js"/.test(bai), false,
        'JSXGraph do runtime nạp lúc chạy, không được gắn sẵn thẻ script vào <head>');

    // /export của bản nháp đi qua cùng buildFullHtml, phải ra cùng một mảnh
    await apiRequest(srv.url, 'POST', '/api/files/jxgdraft.html', { token: tok, body: { content: code } });
    const exported = await (await fetch(`${srv.url}/api/files/jxgdraft.html/export`, {
        headers: { Authorization: `Bearer ${tok}` }
    })).text();
    assert.ok(exported.includes(sp.SLIDE_JSXGRAPH_JS), 'file export cũng phải có runtime');
    assert.ok(exported.includes(`<script type="${sp.JSXGRAPH_TYPE}"`), 'export cũng đổi thẻ sang script raw-text');

    // Bài chỉ có chữ: không được trả giá 1MB cho một thứslide không dùng
    const onlyText = '<section><h1>Chỉ chữ</h1><p>$a<b$</p></section>';
    await apiRequest(srv.url, 'POST', '/api/files/nojxg.html', { token: tok, body: { content: onlyText } });
    const p2 = await apiRequest(srv.url, 'POST', '/api/files/nojxg.html/publish', { token: tok });
    const bai2 = await (await fetch(srv.url + p2.json.url)).text();
    assert.ok(!bai2.includes(sp.JSXGRAPH_MARKER), 'bài không có <jsxgraph> phải sạch runtime');
    assert.ok(!/jsxgraph/i.test(bai2), 'bài không có <jsxgraph> không được nhắc tới JSXGraph');
});

// Server cắt chuỗi từ file nguồn của client chứ không import: lệch nhau một ký tự là giáo
// viên soạn một đằng, người xem nhận một nẻo — y hệt bài học REVEAL_KATEX_OPTS ở test trên.
test('runtime <jsxgraph>: server và client sinh ra cùng một mảnh HTML', async () => {
    const read = rel => fs.readFileSync(path.join(__dirname, rel), 'utf8');
    const sp = require('../src/slide-parts.js');
    const client = await import('../../client/src/jsxgraph-runtime.js');

    for (const key of ['JSXGRAPH_VERSION', 'JSXGRAPH_CDN', 'JSXGRAPH_MARKER', 'JSXGRAPH_TYPE']) {
        assert.equal(client[key], sp[key], `client/src/jsxgraph-runtime.js phải cùng ${key} với server`);
    }
    assert.equal(client.JSXGRAPH_STYLE, sp.SLIDE_JSXGRAPH_STYLE, 'CSS của preview và bản publish phải một');
    assert.equal(client.JSXGRAPH_SCRIPT, sp.SLIDE_JSXGRAPH_JS, 'runtime của preview và bản publish phải một');

    const MAU = '<section><jsxgraph data-w="640">board.create(\'point\', [1, 2]);</jsxgraph></section>';
    assert.equal(client.JSXGRAPH_BOC(MAU), sp.JSXGRAPH_BOC(MAU), 'hai bên đổi thẻ phải ra cùng kết quả');

    // Preview không được tự viết lại cách dựng bảng: phải import đúng runtime này
    for (const file of ['src/reveal-preview.js', 'src/main.js']) {
        assert.ok(read(`../../client/${file}`).includes('jsxgraph-runtime.js'),
            `${file} phải lấy runtime từ jsxgraph-runtime.js thay vì tự ghi`);
        assert.ok(read(`../../client/${file}`).includes('JSXGRAPH_BOC('),
            `${file} phải đổi thẻ <jsxgraph> y hệt bản publish trước khi đưa vào DOM`);
    }

    // Thẻ không cân cặp: BOC bỏ qua để debug.js còn thấy mà báo, không nuốt cả bài
    const ho = sp.JSXGRAPH_BOC('<jsxgraph>board.create();');
    assert.equal(ho, '<jsxgraph>board.create();', 'thẻ thiếu </jsxgraph> phải để nguyên');
});

// Sidebar và nội dung trang /templates sinh từ GROUP + SAMPLES của từng file danh mục trong
// client/src/templates/, nối nhau theo thứ tự khai báo ở groups.js. Khai báo lệch một ký tự là
// mẫu biến mất khỏi trang trong im lặng (không lỗi, không cảnh báo), nên test chốt lại tính
// khép kín của bộ dữ liệu đó — kể cả việc mọi file đều có tên trong groups.js.
test('thư viện mẫu: danh mục khép kín, mọi bài trình chiếu có tên file', () => {
    const dir = path.join(__dirname, '../../client/src/templates');
    const manifest = fs.readFileSync(path.join(dir, 'groups.js'), 'utf8');
    const files = [...manifest.matchAll(/^import \* as [A-Z]+ from '\.\/([a-z-]+)\.js';$/gm)].map(m => m[1]);
    const onDisk = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'groups.js')
        .map(f => f.slice(0, -3)).sort();
    assert.deepEqual(files.slice().sort(), onDisk,
        'mọi file danh mục phải được groups.js nạp — file nằm ngoài danh sách là mẫu không hiện ra trang');

    const groups = [];
    const used = [], ids = [], fileNames = [];
    for (const name of files) {
        const src = fs.readFileSync(path.join(dir, name + '.js'), 'utf8');
        const g = src.match(/^ {4}id: '([a-z-]+)', kind: '(deck|slide)', label: '/m);
        assert.ok(g, `${name}.js phải export GROUP đủ id/kind/label cho sidebar`);
        groups.push({ id: g[1], kind: g[2] });
        used.push(...[...src.matchAll(/^ {8}group: '([a-z-]+)',/gm)].map(m => m[1]));
        ids.push(...[...src.matchAll(/^ {8}id: '([a-z-]+)',$/gm)].map(m => m[1]));
        fileNames.push(...[...src.matchAll(/^ {8}fileName: '([^']+)',/gm)].map(m => m[1]));

        // Reveal đặt width:960px cho section với box-sizing: content-box, nên padding tự nó
        // đẩy thẻ slide rộng hơn khung vẽ: ~28px cạnh phải bị cắt trong preview và cả khi chiếu.
        for (const m of src.matchAll(/\.reveal \.slides section \{([^}]*)\}/g)) {
            if (m[1].includes('padding:')) {
                assert.ok(m[1].includes('box-sizing:border-box'),
                    `rule section có padding phải kèm box-sizing:border-box, nếu không slide tràn khỏi khung 960×700: ${m[1].trim()}`);
            }
        }
    }

    assert.ok(groups.length >= 10, 'GROUPS phải có danh mục cho sidebar');
    assert.equal(ids.length, used.length, 'mọi mẫu phải được gán group');
    assert.equal(new Set(ids).size, ids.length, 'id mẫu phải duy nhất — preview và neo đường dẫn dựa vào id');
    for (const g of used) {
        assert.ok(groups.some(x => x.id === g), `group "${g}" không có trong GROUPS: mẫu sẽ không hiện ra trang`);
    }
    for (const g of groups) {
        assert.ok(used.includes(g.id), `danh mục "${g.id}" rỗng: sidebar sẽ có một mục không có nội dung`);
    }
    // Render chỉ in một nhãn "Mẫu bài/Mẫu slide" mỗi khi kind đổi, nên hai loại lẫn lộn là mất nhãn.
    const kinds = groups.map(g => g.kind).join(' ');
    assert.ok(!kinds.includes('slide deck'),
        `GROUPS phải xếp hết bài trình chiếu trước slide đơn, đang là: ${kinds}`);
    const deckCount = used.filter(g => groups.some(x => x.id === g && x.kind === 'deck')).length;
    assert.equal(fileNames.length, deckCount,
        'mẫu cả bài cần fileName để nút "Dùng mẫu này" tạo file nháp');
});

// Route cấp một được khớp không phân biệt hoa/thường, nên "Gallery" cũng che mất
// /gallery y như "gallery". Kiểm cả hai kiểu viết để không ai chiếm được trang.
test('không cho đăng ký tên trùng route hệ thống, kể cả viết hoa khác nhau', async () => {
    for (const name of ['gallery', 'Gallery', 'GALLERY', 'api', 'API', 'health', 'Health', 'show', 'design']) {
        const res = await apiRequest(srv.url, 'POST', '/api/auth/register', {
            body: { username: name, password: 'matkhau123' }
        });
        assert.equal(res.status, 400, `"${name}" không được phép đăng ký`);
        assert.match(res.json.error, /giữ riêng/, `"${name}" phải báo lý do giữ tên, không phải lý do khác`);
    }
    const adminSide = await srv.api('POST', '/api/admin/users', { body: { username: 'Admin_panel', password: 'matkhau123' } });
    assert.equal(adminSide.status, 400, 'admin cũng không tạo được tài khoản trùng tên route');
});

// Hai thư mục user khác nhau trên đĩa nhưng chỉ một URL: phải chặn từ lúc nhận tên.
test('hai tên chỉ khác nhau hoa thường không cùng chiếm một URL', async () => {
    const created = await srv.api('POST', '/api/admin/users', { body: { username: 'CaseTest', password: 'matkhau123' } });
    assert.equal(created.status, 200);

    for (const dup of ['casetest', 'CASETEST', 'CaseTest']) {
        const res = await apiRequest(srv.url, 'POST', '/api/auth/register', {
            body: { username: dup, password: 'matkhau123' }
        });
        assert.equal(res.status, 400, `"${dup}" trùng "CaseTest" khi bỏ qua hoa/thường`);
        assert.match(res.json.error, /đã tồn tại/);
    }
});

// Tài khoản đời cũ có loginId không thuộc USERNAME_RE ("Minh Nhật Phan"), thư mục trên
// đĩa là tên đã lọc ký tự ("MinhNhtPhan") và slug cũng vậy. Người mới đăng ký "MinhNhtPhan"
// sẽ chiếm đúng thư mục đó; "minhnht.phan" thì chiếm đúng slug đó vì defaultSlug bỏ dấu chấm.
test('không cho đăng ký tên trùng thư mục hoặc trùng slug của tài khoản có dấu', async () => {
    const legacy = await startServer({
        dbSeed: {
            users: { 'Minh Nhật Phan': { passwordHash: 'scrypt$00$00', role: 'user' } },
            config: { aiKeys: { groq: '', deepseek: '' } }
        }
    });
    try {
        for (const name of ['MinhNhtPhan', 'minhnhtphan', 'minhnht.phan', '@minhnht.phan']) {
            const res = await apiRequest(legacy.url, 'POST', '/api/auth/register', {
                body: { username: name, password: 'matkhau123' }
            });
            assert.equal(res.status, 400, `"${name}" đụng tới tài khoản "Minh Nhật Phan"`);
            assert.match(res.json.error, /đã tồn tại/);
        }
        const free = await apiRequest(legacy.url, 'POST', '/api/auth/register', {
            body: { username: 'minhnht.phan2', password: 'matkhau123' }
        });
        assert.equal(free.status, 200, 'tên không đụng thư mục lẫn slug vẫn đăng ký bình thường');
    } finally {
        await legacy.stop();
    }
});

// Bảng Users xếp theo ngày đăng ký. Tài khoản đời cũ không có createdAt trong db, trước
// đây suy từ mtime thư mục => mỗi lần user soạn hay publish bài là cả tài khoản bị kéo
// lên đầu danh sách, admin đọc nhầm thành "vừa đăng ký". Server phải gắn ngày một lần
// lúc khởi động rồi không bao giờ đổi lại.
test('ngày đăng ký của tài khoản cũ được ghi một lần và không trôi theo hoạt động', async () => {
    const longAgo = Math.floor((Date.now() - 40 * 24 * 3600 * 1000) / 1000);
    const salt = crypto.randomBytes(16);
    const legacy = await startServer({
        dbSeed: {
            users: {
                admin: {
                    passwordHash: `scrypt$${salt.toString('hex')}$${crypto.scryptSync('matkhau-quan-tri', salt, 64).toString('hex')}`,
                    role: 'admin',
                    tokenVersion: 0,
                    createdAt: Date.now()
                },
                'Minh Nhật Phan': { passwordHash: 'scrypt$00$00', role: 'user', tokenVersion: 0 }
            }
        },
        prepare: (dir) => {
            const root = path.join(dir, 'users', 'MinhNhtPhan');
            const drafts = path.join(root, 'drafts');
            const published = path.join(root, 'published');
            fs.mkdirSync(drafts, { recursive: true });
            fs.mkdirSync(published, { recursive: true });
            // "đăng ký" cách đây 40 ngày: thời điểm tạo thư mục là dấu vết duy nhất còn lại
            for (const p of [root, drafts, published]) fs.utimesSync(p, longAgo, longAgo);
        }
    });
    try {
        const login = await apiRequest(legacy.url, 'POST', '/api/auth/login', {
            body: { username: 'admin', password: 'matkhau-quan-tri' }
        });
        assert.equal(login.status, 200, JSON.stringify(login.json));
        const tok = login.json.token;

        const rowOf = async (name) => {
            const res = await apiRequest(legacy.url, 'GET', '/api/admin/users', { token: tok });
            assert.equal(res.status, 200);
            return res.json.users.find(u => u.username === name);
        };

        const first = await rowOf('Minh Nhật Phan');
        assert.ok(Math.abs(first.createdAt - longAgo * 1000) < 2000,
            `phải lấy đúng dấu vết 40 ngày trước, nhận được ${new Date(first.createdAt).toISOString()}`);
        const newest = (await rowOf('admin'));
        assert.ok(newest.createdAt > first.createdAt, 'tài khoản tạo sau phải đứng trên tài khoản tạo trước');

        // User đó vừa sửa avatar vừa publish: mtime của thư mục con và thư mục cha bị đẩy tới bây giờ
        const root = path.join(legacy.dataDir, 'users', 'MinhNhtPhan');
        const now = Math.floor(Date.now() / 1000);
        fs.writeFileSync(path.join(root, 'published', 'bai-moi.html'), '<html></html>');
        fs.mkdirSync(path.join(root, 'avatar'), { recursive: true });
        for (const p of [root, path.join(root, 'published'), path.join(root, 'avatar')]) fs.utimesSync(p, now, now);

        const after = await rowOf('Minh Nhật Phan');
        assert.equal(after.createdAt, first.createdAt, 'sửa bài không được đổi ngày đăng ký');

        const dbOnDisk = JSON.parse(fs.readFileSync(path.join(legacy.dataDir, 'db.json'), 'utf-8'));
        assert.equal(dbOnDisk.users['Minh Nhật Phan'].createdAt, first.createdAt,
            'ngày đăng ký phải được ghi ngược vào db, không chỉ suy ra lúc đọc');
    } finally {
        await legacy.stop();
    }
});

test('đăng ký kèm hồ sơ: họ tên, email, số điện thoại, username URL', async () => {
    const res = await apiRequest(srv.url, 'POST', '/api/auth/register', {
        body: {
            username: 'newteacher',
            password: 'matkhau123',
            fullName: '  Nguyễn Đăng Minh Phúc  ',
            email: 'ndmphuc@example.edu.vn',
            phone: '0905 123 456',
            urlSlug: 'ndmphuc'
        }
    });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    const prof = await apiRequest(srv.url, 'GET', '/api/user/profile', { token: res.json.token });
    assert.equal(prof.json.profile.fullName, 'Nguyễn Đăng Minh Phúc', 'họ tên phải được cắt khoảng trắng hai đầu');
    assert.equal(prof.json.profile.email, 'ndmphuc@example.edu.vn');
    assert.equal(prof.json.profile.phone, '0905 123 456');
    assert.equal(prof.json.profile.urlSlug, 'ndmphuc');

    // Payload cũ { username, password } vẫn dùng được (admin tạo tài khoản, script...)
    const bare = await apiRequest(srv.url, 'POST', '/api/auth/register', {
        body: { username: 'oldstyle', password: 'matkhau123' }
    });
    assert.equal(bare.status, 200, JSON.stringify(bare.json));
});

test('đăng ký chặn email sai, số điện thoại sai và username URL trùng', async () => {
    const bad = [
        [{ email: 'khong phai email' }, /Email không hợp lệ/],
        [{ phone: '0905!123' }, /Số điện thoại/],
        [{ fullName: 'A'.repeat(81) }, /Họ tên tối đa/],
        [{ urlSlug: 'ab' }, /Username URL/],
        [{ urlSlug: 'gallery' }, /Username URL/],
        [{ urlSlug: 'tuser' }, /Username URL này đã được sử dụng/]
    ];
    for (const [extra, pattern] of bad) {
        const res = await apiRequest(srv.url, 'POST', '/api/auth/register', {
            body: { username: 'regcheck', password: 'matkhau123', ...extra }
        });
        assert.equal(res.status, 400, JSON.stringify(extra) + ' phải bị chặn');
        assert.match(res.json.error, pattern, `${JSON.stringify(extra)} phải báo đúng lý do`);
    }
    // Phải chặn TRƯỚC khi ghi tài khoản, nếu không mỗi lần sai là một user rác
    const users = await srv.api('GET', '/api/admin/users');
    assert.ok(!users.json.users.some(u => u.username === 'regcheck'), 'đăng ký lỗi không được để lại tài khoản');
});

test('đổi slug cũng bị chặn nếu trùng route hoặc trùng tên người khác', async () => {
    // Dùng tài khoản riêng để không làm đổi slug của tuser mà các test khác đang tham chiếu
    await srv.api('POST', '/api/admin/users', { body: { username: 'tslug', password: 'matkhau123' } });
    const login = await apiRequest(srv.url, 'POST', '/api/auth/login', { body: { username: 'tslug', password: 'matkhau123' } });
    const tok = login.json.token;

    for (const slug of ['Gallery', 'health', 'Show']) {
        const res = await apiRequest(srv.url, 'POST', '/api/user/profile', { token: tok, body: { urlSlug: slug } });
        assert.equal(res.status, 400, `slug "${slug}" là của hệ thống`);
    }
    const taken = await apiRequest(srv.url, 'POST', '/api/user/profile', { token: tok, body: { urlSlug: 'casetest' } });
    assert.equal(taken.status, 400, 'không được lấy slug của người khác chỉ bằng cách đổi hoa/thường');
    assert.match(taken.json.error, /đã được sử dụng/);

    const ok = await apiRequest(srv.url, 'POST', '/api/user/profile', { token: tok, body: { urlSlug: 'tslug-moi' } });
    assert.equal(ok.status, 200, 'slug hợp lệ và chưa ai dùng thì vẫn đổi được');

    // Người khác không được lấy đúng slug đó chỉ bằng cách đổi hoa/thường
    const steal = await apiRequest(srv.url, 'POST', '/api/user/profile', {
        token: srv.users.user.login, body: { urlSlug: 'TSLUG-MOI' }
    });
    assert.equal(steal.status, 400, 'slug chỉ khác hoa/thường vẫn là của người khác');
});

test('mọi response mang header bảo mật chung', async () => {
    for (const route of ['/api/stats', '/health', '/']) {
        const res = await fetch(srv.url + route);
        assert.equal(res.headers.get('x-content-type-options'), 'nosniff', `${route} thiếu nosniff`);
        assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', `${route} thiếu Referrer-Policy`);
        assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN', `${route} thiếu X-Frame-Options`);
    }
});

test('bình luận lồng nhau thành thread một cấp', async () => {
    const root = await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/comments', {
        token: srv.users.designer.login, body: { text: 'bình luận gốc' }
    });
    assert.equal(root.status, 200);
    const rootId = root.json.comment.id;

    const reply = await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/comments', {
        token: srv.admin, body: { text: 'phản hồi', parentId: rootId }
    });
    assert.equal(reply.status, 200);
    assert.equal(reply.json.comment.parentId, rootId);

    const deep = await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/comments', {
        token: srv.admin, body: { text: 'lồng hai cấp', parentId: reply.json.comment.id }
    });
    assert.equal(deep.status, 400, 'chỉ cho trả lời bình luận gốc');

    const detail = await srv.api('GET', '/api/p/tmaster/hist.html');
    const thread = detail.json.presentation.threads.find(c => c.id === rootId);
    assert.equal(thread.replies.length, 1);
    assert.equal(thread.replies[0].text, 'phản hồi');
});

// Bình luận cũng thích được như cả bài: toggle hai chiều, cộng dồn theo người, khách chỉ nhìn
// thấy số chứ không bấm được.
test('thích bình luận: toggle hai chiều, phản hồi cũng thích được', async () => {
    const root = (await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/comments', {
        token: srv.users.designer.login, body: { text: 'bình luận để thích' }
    })).json.comment;
    const reply = (await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/comments', {
        token: srv.users.master.login, body: { text: 'phản hồi để thích', parentId: root.id }
    })).json.comment;
    const likePath = id => `/api/p/tmaster/hist.html/comments/${id}/like`;

    const first = await apiRequest(srv.url, 'POST', likePath(root.id), { token: srv.users.user.login });
    assert.equal(first.status, 200);
    assert.deepEqual(first.json, { success: true, likes: 1, likedByMe: true });

    const second = await apiRequest(srv.url, 'POST', likePath(root.id), { token: srv.users.master.login });
    assert.equal(second.json.likes, 2, 'hai người khác nhau thì cộng dồn');

    const again = await apiRequest(srv.url, 'POST', likePath(root.id), { token: srv.users.user.login });
    assert.equal(again.json.likes, 1, 'bấm lần hai là bỏ thích');
    assert.equal(again.json.likedByMe, false);

    const onReply = await apiRequest(srv.url, 'POST', likePath(reply.id), { token: srv.users.user.login });
    assert.equal(onReply.json.likes, 1, 'phản hồi cũng có lượt thích riêng');

    const asUser = await apiRequest(srv.url, 'GET', '/api/p/tmaster/hist.html', { token: srv.users.user.login });
    const thread = asUser.json.presentation.threads.find(c => c.id === root.id);
    assert.equal(thread.likes, 1);
    assert.equal(thread.likedByMe, false, 'đã bỏ thích thì không được tính là thích');
    assert.equal(thread.replies[0].likes, 1);
    assert.equal(thread.replies[0].likedByMe, true);

    const asGuest = await apiRequest(srv.url, 'GET', '/api/p/tmaster/hist.html', {});
    const guestThread = asGuest.json.presentation.threads.find(c => c.id === root.id);
    assert.equal(guestThread.likes, 1, 'khách vẫn thấy số lượt thích');
    assert.equal(guestThread.likedByMe, false, 'khách thì chưa thích gì cả');

    const anon = await apiRequest(srv.url, 'POST', likePath(root.id), {});
    assert.equal(anon.status, 401, 'khách không bấm thích được');

    const missing = await apiRequest(srv.url, 'POST', likePath('deadbeef'), { token: srv.users.user.login });
    assert.equal(missing.status, 404, 'bình luận không tồn tại thì 404');

    // Bình luận bị gỡ phải chặn cửa like, nếu không số liệu vẫn nhảy trên một vỏ rỗng.
    const doomed = (await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/comments', {
        token: srv.users.designer.login, body: { text: 'bình luận sắp bị xóa' }
    })).json.comment;
    await apiRequest(srv.url, 'DELETE', `/api/p/tmaster/hist.html/comments/${doomed.id}`, {
        token: srv.users.designer.login
    });
    const afterDelete = await apiRequest(srv.url, 'POST', likePath(doomed.id), { token: srv.users.user.login });
    assert.equal(afterDelete.status, 404, 'bình luận đã xóa thì không thích được');
});

// Mọi bình luận đang nằm trong social.json trên production đều CHƯA có trường likes (nó chỉ
// có từ hôm nay), nên bản cũ phải đọc ra 0 lượt và thích được ngay mà không cần migrate.
test('bình luận cũ chưa có trường likes vẫn đọc và thích được', async () => {
    await sleep(400); // đợi hàng đợi ghi của store yên hẳn kẻo nó đè mất file vừa sửa
    const file = path.join(srv.dataDir, 'social.json');
    const social = JSON.parse(fs.readFileSync(file, 'utf8'));
    const rec = social.presentations['tmaster/hist.html'];
    assert.ok(rec, 'test ở trên phải để lại record của bài này');
    rec.comments.push({ id: 'legacy01', author: 'tdesigner', text: 'bình luận của bản cũ', at: Date.now() - 1000 });
    fs.writeFileSync(file, JSON.stringify(social), { mode: 0o600 });

    const detail = await apiRequest(srv.url, 'GET', '/api/p/tmaster/hist.html', { token: srv.users.user.login });
    const found = detail.json.presentation.comments.find(c => c.id === 'legacy01');
    assert.ok(found, 'server phải nạp lại file vừa đổi trên đĩa');
    assert.equal(found.likes, 0, 'chưa có trường likes phải đọc ra 0 lượt');
    assert.equal(found.likedByMe, false);

    const liked = await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/comments/legacy01/like', {
        token: srv.users.user.login
    });
    assert.equal(liked.status, 200);
    assert.equal(liked.json.likes, 1, 'bình luận cũ thích được ngay, không cần chuyển đổi');
});

test('quyền gỡ bình luận: người dưng bị chặn, admin gỡ được', async () => {
    const { comment } = (await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/comments', {
        token: srv.users.designer.login, body: { text: 'bình luận cần kiểm duyệt' }
    })).json;

    // tuser không phải tác giả, không phải chủ bài, không phải admin
    const stranger = await apiRequest(srv.url, 'DELETE', `/api/p/tmaster/hist.html/comments/${comment.id}`, {
        token: srv.users.user.login
    });
    assert.equal(stranger.status, 403, 'người không liên quan không gỡ được');

    const byAdmin = await srv.api('DELETE', `/api/p/tmaster/hist.html/comments/${comment.id}`);
    assert.equal(byAdmin.status, 200, 'admin gỡ được bình luận rác trên mọi bài');

    const detail = await srv.api('GET', '/api/p/tmaster/hist.html');
    assert.ok(!detail.json.presentation.comments.some(c => c.id === comment.id), 'bình luận đã gỡ phải biến mất');
    assert.ok(!detail.json.presentation.threads.some(c => c.id === comment.id));
});

test('tác giả tự gỡ được bình luận của mình', async () => {
    const tok = srv.users.user.login;
    const { comment } = (await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/comments', {
        token: tok, body: { text: 'để tôi xóa lại' }
    })).json;
    const res = await apiRequest(srv.url, 'DELETE', `/api/p/tmaster/hist.html/comments/${comment.id}`, { token: tok });
    assert.equal(res.status, 200);
    const detail = await srv.api('GET', '/api/p/tmaster/hist.html');
    assert.ok(!detail.json.presentation.comments.some(c => c.id === comment.id));
});

// Dashboard đếm bình luận bằng cùng bộ lọc với viewer, nếu không chủ bài sẽ thấy
// số lượng lớn hơn những gì người xem nhìn thấy (bản mềm-xóa vẫn còn trong social.json)
test('dashboard không đếm bình luận đã bị gỡ', async () => {
    const tok = srv.users.user.login;
    const rowOf = async () => {
        const dash = (await apiRequest(srv.url, 'GET', '/api/dashboard', { token: srv.users.master.login })).json;
        return dash;
    };
    const before = await rowOf();
    const base = before.items.find(i => i.fileName === 'hist.html');
    assert.ok(base, 'bài hist.html phải có trong dashboard của chủ bài');

    const { comment } = (await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/comments', {
        token: tok, body: { text: 'bình luận rồi sẽ bị gỡ' }
    })).json;
    const added = (await rowOf()).items.find(i => i.fileName === 'hist.html');
    assert.equal(added.commentCount, base.commentCount + 1, 'bình luận mới phải được đếm');

    await apiRequest(srv.url, 'DELETE', `/api/p/tmaster/hist.html/comments/${comment.id}`, { token: tok });
    const after = (await rowOf()).items.find(i => i.fileName === 'hist.html');
    assert.equal(after.commentCount, base.commentCount, 'bình luận đã gỡ không được tính');

    assert.ok(Number.isInteger(after.versions), 'dashboard phải báo số phiên bản đã lưu');
    assert.match(after.url, /^\/show\/tmaster\//, 'link công khai phải nằm dưới /show/');
    assert.equal(before.me.role, 'master');
    assert.equal(before.quota.max, 50);
});

test('chủ bài gỡ được bình luận của người khác trên bài của mình', async () => {
    const { comment } = (await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/comments', {
        token: srv.users.designer.login, body: { text: 'rác trên bài của master' }
    })).json;
    const res = await apiRequest(srv.url, 'DELETE', `/api/p/tmaster/hist.html/comments/${comment.id}`, {
        token: srv.users.master.login
    });
    assert.equal(res.status, 200);
});

test('đổi mật khẩu vô hiệu hóa ngay mọi JWT cũ', async () => {
    const tok = srv.users.designer.login;
    const before = await apiRequest(srv.url, 'GET', '/api/me/quota', { token: tok });
    assert.equal(before.status, 200);

    const change = await apiRequest(srv.url, 'POST', '/api/me/password', {
        token: tok, body: { currentPassword: 'matkhau123', newPassword: 'matkhau123moi' }
    });
    assert.equal(change.status, 200);

    const after = await apiRequest(srv.url, 'GET', '/api/me/quota', { token: tok });
    assert.equal(after.status, 401, 'token thu hồi phải là 401 để client phân biệt với lỗi quyền hạn');
    assert.equal(after.json.code, 'auth');

    const like = await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/like', { token: tok });
    assert.equal(like.status, 401);
    assert.equal(like.json.code, 'auth');

    const noToken = await apiRequest(srv.url, 'GET', '/api/me/quota');
    assert.equal(noToken.status, 401);
    assert.equal(noToken.json.code, 'auth');

    const fresh = await apiRequest(srv.url, 'POST', '/api/auth/login', { body: { username: 'tdesigner', password: 'matkhau123moi' } });
    assert.equal(fresh.status, 200);
    const again = await apiRequest(srv.url, 'GET', '/api/me/quota', { token: fresh.json.token });
    assert.equal(again.status, 200);
});

// Đăng nhập sai cũng trả 401 nhưng KHÔNG được mang code 'auth', nếu không client
// sẽ coi là "phiên hết hạn" và xoá token của người đang dùng hợp lệ ở tab khác.
test('sai mật khẩu khi đăng nhập không bị hiểu nhầm là hết phiên', async () => {
    const res = await apiRequest(srv.url, 'POST', '/api/auth/login', { body: { username: 'tuser', password: 'sai-mat-khau' } });
    assert.equal(res.status, 401);
    assert.notEqual(res.json.code, 'auth');
});

// Đăng nhập bằng email: email không phải khoá của db.users nên server phải tự dò.
// me.username bắt buộc vẫn là loginId, vì client và token đều tham chiếu theo tên đó.
test('đăng nhập được bằng email, kể cả viết hoa khác đi', async () => {
    await srv.api('POST', '/api/user/profile', {
        token: srv.users.user.login, body: { email: 'tuser@example.edu.vn' }
    });

    for (const ident of ['tuser@example.edu.vn', 'TUser@Example.Edu.VN', '  tuser@example.edu.vn  ']) {
        const res = await apiRequest(srv.url, 'POST', '/api/auth/login', { body: { username: ident, password: 'matkhau123' } });
        assert.equal(res.status, 200, `"${ident}" phải đăng nhập được bằng email`);
        assert.equal(res.json.me.username, 'tuser', 'phải trả về loginId chứ không phải email');
    }

    // Sai mật khẩu qua email cũng phải bị chặn y như qua tên đăng nhập
    const bad = await apiRequest(srv.url, 'POST', '/api/auth/login', { body: { username: 'tuser@example.edu.vn', password: 'sai' } });
    assert.equal(bad.status, 401);
    assert.notEqual(bad.json.code, 'auth', 'sai mật khẩu không được báo là hết phiên');
});

// Email chưa từng bị chặn trùng, nên dữ liệu thật có thể có hai tài khoản cùng email.
// Khi đó không thể đoán người dùng muốn vào tài khoản nào -> buộc dùng tên đăng nhập.
test('hai tài khoản cùng email thì không đăng nhập bằng email được', async () => {
    await srv.api('POST', '/api/admin/users', { body: { username: 'tdupe', password: 'matkhau123' } });
    const login = await apiRequest(srv.url, 'POST', '/api/auth/login', { body: { username: 'tdupe', password: 'matkhau123' } });
    await srv.api('POST', '/api/user/profile', { token: login.json.token, body: { email: 'tuser@example.edu.vn' } });

    const ambiguous = await apiRequest(srv.url, 'POST', '/api/auth/login', { body: { username: 'tuser@example.edu.vn', password: 'matkhau123' } });
    assert.equal(ambiguous.status, 401, 'email trùng hai tài khoản phải bị từ chối');

    const byName = await apiRequest(srv.url, 'POST', '/api/auth/login', { body: { username: 'tdupe', password: 'matkhau123' } });
    assert.equal(byName.status, 200, 'đăng nhập bằng tên đăng nhập vẫn bình thường');
});

test('mật khẩu mới phải đủ mạnh', async () => {
    const res = await apiRequest(srv.url, 'POST', '/api/me/password', {
        token: srv.users.master.login, body: { currentPassword: 'matkhau123', newPassword: 'short' }
    });
    assert.equal(res.status, 400);
});

test('lượt xem được gom lại thay vì ghi đĩa mỗi lần mở', async () => {
    for (let i = 0; i < 4; i++) await fetch(srv.url + '/show/tmaster/hist.html');

    const socialFile = path.join(srv.dataDir, 'social.json');
    const readViews = () => {
        try {
            return JSON.parse(fs.readFileSync(socialFile, 'utf-8')).presentations['tmaster/hist.html'].views;
        } catch (err) {
            return null;
        }
    };
    const during = await srv.api('GET', '/health');
    assert.ok(during.json.pendingViews >= 1, 'lượt xem phải còn nằm trong bộ đếm chờ ghi');

    await sleep(3600); // VIEW_FLUSH_MS = 3000
    assert.ok(readViews() >= 4, `lượt xem phải được ghi gộp, nhận ${readViews()}`);

    const detail = await srv.api('GET', '/api/p/tmaster/hist.html');
    assert.ok(detail.json.presentation.views >= 4);
});

test('like toggle hai chiều', async () => {
    const on = await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/like', { token: srv.users.user.login });
    assert.equal(on.json.likedByMe, true);
    const off = await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/like', { token: srv.users.user.login });
    assert.equal(off.json.likedByMe, false);
});

// Ghi lượt chia sẻ từ hộp thoại "Share to": đếm tổng + theo kênh, khách vẫn ghi được
test('share: ghi đủ mọi kênh, khách cũng tính được', async () => {
    const channels = ['ganjing', 'facebook', 'x', 'copy'];
    const before = (await srv.api('GET', '/api/p/tmaster/hist.html')).json.presentation;
    const base = before.shares || 0;
    const baseByChannel = before.sharesByChannel || {};

    for (const [i, channel] of channels.entries()) {
        const res = await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/share', { body: { channel } });
        assert.equal(res.status, 200, `kênh ${channel} phải nhận`);
        assert.equal(res.json.shares, base + i + 1, `${channel} phải tăng tổng lên 1`);
        assert.equal(res.json.byChannel[channel], (baseByChannel[channel] || 0) + 1, `${channel} phải tăng 1 lượt`);
    }

    const bad = await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/share', { body: { channel: 'zalo' } });
    assert.equal(bad.status, 400, 'kênh lạ phải bị chặn để client thấy lỗi');
    const missing = await apiRequest(srv.url, 'POST', '/api/p/tmaster/hist.html/share', { body: {} });
    assert.equal(missing.status, 400);

    const detail = await srv.api('GET', '/api/p/tmaster/hist.html');
    assert.equal(detail.json.presentation.shares, base + channels.length);

    const gal = await srv.api('GET', '/api/gallery');
    const item = gal.json.items.find(p => p.fileName === 'hist.html' && p.user === 'tmaster');
    assert.equal(item.shares, base + channels.length, 'gallery cũng phải trả số lượt chia sẻ');
});

test('gallery và profile công khai dùng link /show/', async () => {
    const gal = await srv.api('GET', '/api/gallery');
    const item = gal.json.items.find(p => p.url && p.url.includes('hist.html'));
    assert.ok(item, 'bài đã publish phải có trong gallery');
    assert.ok(item.url.startsWith('/show/'), item.url);

    const prof = await srv.api('GET', '/api/profile/tmaster');
    assert.equal(prof.status, 200);
});

// Card trong Gallery hiển thị HỌ TÊN (không phải slug) kèm QUYỀN của tác giả, nên hai trường
// đó phải có trong author của /api/gallery. Tài khoản chưa nhập họ tên vẫn phải có chuỗi để
// client in "Unknown" thay vì để trống. Họ tên cũng phải tìm được: người xem thấy "Dạ Hợp"
// trên card mà gõ vào ô tìm không ra bài thì tên đó vô dụng.
test('gallery trả họ tên và quyền của tác giả cho card', async () => {
    const own = await startServer();
    try {
        const admin = await apiRequest(own.url, 'POST', '/api/auth/login', {
            body: { username: 'admin', password: own.adminPassword }
        });
        own.admin = admin.json.token;

        const reg = await apiRequest(own.url, 'POST', '/api/auth/register', {
            body: { username: 'cachetinh', password: 'matkhau123' }
        });
        assert.equal(reg.status, 200, JSON.stringify(reg.json));
        const tok = reg.json.token;

        await apiRequest(own.url, 'POST', '/api/files/card.html', {
            token: tok, body: { content: '<section><h1>Bai mot</h1></section>' }
        });
        const pub = await apiRequest(own.url, 'POST', '/api/files/card.html/publish', { token: tok });
        assert.equal(pub.status, 200);
        await sleep(400); // hai lần mutateDB liên tiếp, queue ghi gộp trong 250ms

        let gal = await apiRequest(own.url, 'GET', '/api/gallery');
        let author = gal.json.items.find(p => p.fileName === 'card.html').author;
        assert.equal(author.role, 'user', 'quyền mặc định phải là user');
        assert.equal(author.fullName, '', 'chưa nhập họ tên thì API trả chuỗi rỗng để client tự in Unknown');
        assert.ok(author.urlSlug, 'slug vẫn phải có vì card bấm vào là tới trang cá nhân');

        // Đặt họ tên TRƯỚC khi đổi quyền: route admin bumpTokenVersion() nên token cũ chết ngay
        await apiRequest(own.url, 'POST', '/api/user/profile', { token: tok, body: { fullName: ' Lê Thị Cà Khịa ' } });
        await apiRequest(own.url, 'POST', '/api/admin/users/cachetinh/role', {
            token: own.admin, body: { role: 'designer' }
        });

        // Tài khoản thứ hai: slug 'hienlanh' không chứa chữ nào của họ tên 'Dạ Hợp', nên
        // tìm ra bài của nó bằng 'da hop' chứng minh khớp đúng trường fullName chứ không phải slug.
        const reg2 = await apiRequest(own.url, 'POST', '/api/auth/register', {
            body: { username: 'hienlanh', password: 'matkhau123', fullName: 'Dạ Hợp' }
        });
        assert.equal(reg2.status, 200, JSON.stringify(reg2.json));
        await apiRequest(own.url, 'POST', '/api/files/lap.html', {
            token: reg2.json.token, body: { content: '<section><h1>Bai hai</h1></section>' }
        });
        assert.equal((await apiRequest(own.url, 'POST', '/api/files/lap.html/publish', { token: reg2.json.token })).status, 200);
        await sleep(400);

        gal = await apiRequest(own.url, 'GET', '/api/gallery');
        author = gal.json.items.find(p => p.fileName === 'card.html').author;
        assert.equal(author.role, 'designer', 'đổi quyền xong là card đổi ngay, không cần publish lại');
        assert.equal(author.fullName, 'Lê Thị Cà Khịa', 'họ tên phải được cắt khoảng trắng hai đầu');

        // Khung xem (viewer) của Gallery đọc /api/p/… chứ không phải /api/gallery, nên họ tên
        // phải có ở cả hai — thiếu một chỗ là sidebar hiện slug như trước.
        const detail = await apiRequest(own.url, 'GET', '/api/p/cachetinh/card.html');
        assert.equal(detail.json.presentation.author.fullName, 'Lê Thị Cà Khịa');
        assert.equal(detail.json.presentation.author.role, 'designer');
        const cmt = await apiRequest(own.url, 'POST', '/api/p/hienlanh/lap.html/comments', {
            token: own.admin, body: { text: 'bình luận thử' }
        });
        assert.equal(cmt.json.comment.author.fullName, '', 'admin chưa nhập họ tên → chuỗi rỗng để client in Unknown');
        assert.equal(cmt.json.comment.author.role, 'admin');

        const search = async q => {
            const r = await apiRequest(own.url, 'GET', `/api/gallery?q=${encodeURIComponent(q)}`);
            return r.json.items.map(i => i.fileName).sort().join(',');
        };
        assert.equal(await search('da hop'), 'lap.html', 'gõ họ tên không dấu phải tìm ra bài');
        assert.equal(await search('DẠ HỢP'), 'lap.html', 'họ tên viết hoa có dấu cũng phải ra');
        assert.equal(await search('ca khia'), 'card.html', 'tên hiển thị của bài khác cũng tìm được');
        assert.equal(await search('hienlanh'), 'lap.html', 'slug vẫn tìm được vì người xem có thể nhớ đường dẫn');
        assert.equal(await search('bai mot'), 'card.html', 'tìm theo tên bài không đổi');
        assert.equal(await search('khongaitimduoc'), '', 'chuỗi lạ phải trả 0 kết quả');
    } finally {
        await own.stop();
    }
});

test('không đăng ký được username trùng đường dẫn hệ thống', async () => {
    for (const name of ['show', 'api', 'gallery', 'admin_panel']) {
        const res = await apiRequest(srv.url, 'POST', '/api/auth/register', { body: { username: name, password: 'matkhau123' } });
        assert.ok(res.status >= 400, `"${name}" phải bị chặn khi đăng ký`);
    }
});

test('avatar lưu thành file riêng, db.json không phình', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const tok = srv.users.user.login;

    const res = await apiRequest(srv.url, 'POST', '/api/user/profile', { token: tok, body: { avatarBase64: png } });
    assert.equal(res.status, 200);
    assert.match(res.json.profile.avatar, /^\/api\/avatar\//, 'avatar phải là đường dẫn, không phải base64');

    await sleep(400); // hàng đợi ghi db.json debounce 250ms
    const db = fs.readFileSync(path.join(srv.dataDir, 'db.json'), 'utf-8');
    assert.doesNotMatch(db, /"avatar"\s*:\s*"data:image/);
    assert.match(db, /"avatarFile"/);

    const img = await fetch(srv.url + res.json.profile.avatar);
    assert.equal(img.status, 200);
    assert.equal(img.headers.get('content-type'), 'image/png');

    const bad = await apiRequest(srv.url, 'POST', '/api/user/profile', { token: tok, body: { avatarBase64: 'javascript:alert(1)' } });
    assert.equal(bad.status, 400, 'chuỗi không phải ảnh phải bị chặn');

    const cleared = await apiRequest(srv.url, 'POST', '/api/user/profile', { token: tok, body: { avatarBase64: '' } });
    assert.match(cleared.json.profile.avatar, /^https:\/\/ui-avatars\.com/, 'xóa avatar thì quay về ảnh dựng tự động');
});

test('đổi urlSlug hợp lệ, chặn slug trùng và slug hệ thống', async () => {
    const tok = srv.users.user.login;

    const ok = await apiRequest(srv.url, 'POST', '/api/user/profile', { token: tok, body: { urlSlug: 'ten-loi' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.profile.urlSlug, 'ten-loi');

    const clash = await apiRequest(srv.url, 'POST', '/api/user/profile', { token: srv.users.master.login, body: { urlSlug: 'ten-loi' } });
    assert.equal(clash.status, 400, 'slug đã có người dùng thì phải bị từ chối');

    const reserved = await apiRequest(srv.url, 'POST', '/api/user/profile', { token: tok, body: { urlSlug: 'show' } });
    assert.equal(reserved.status, 400);
});

test('khai tử: xóa user dọn luôn thư mục và số liệu gallery', async () => {
    const del = await srv.api('DELETE', '/api/admin/users/tuser');
    assert.equal(del.status, 200);
    assert.equal(fs.existsSync(path.join(srv.dataDir, 'users', 'tuser')), false);

    const login = await apiRequest(srv.url, 'POST', '/api/auth/login', { body: { username: 'tuser', password: 'matkhau123' } });
    assert.ok([401, 403].includes(login.status) || login.json.success === false);
});

test('admin không tự hạ quyền và không tự xóa chính mình', async () => {
    const selfRole = await srv.api('POST', '/api/admin/users/admin/role', { body: { role: 'user' } });
    assert.equal(selfRole.status, 400);
    const selfDel = await srv.api('DELETE', '/api/admin/users/admin');
    assert.equal(selfDel.status, 400);
});

// ---------- phiên hỗ trợ: admin mở Dashboard của user ----------

test('admin cấp phiên hỗ trợ, token đó nhân danh đúng user và sửa được bản nháp', async () => {
    await srv.api('POST', '/api/admin/users', { body: { username: 'tsupport', password: 'matkhau123', role: 'designer' } });
    const login = await apiRequest(srv.url, 'POST', '/api/auth/login', { body: { username: 'tsupport', password: 'matkhau123' } });
    assert.equal(login.status, 200);
    await apiRequest(srv.url, 'POST', '/api/files/support-demo.html', {
        token: login.json.token, body: { content: '<section><h1>của user</h1></section>' }
    });

    const res = await srv.api('POST', '/api/admin/users/tsupport/support', { body: {} });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    const token = res.json.token;

    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    assert.equal(claims.imp, 'admin', 'token phải ghi rõ admin nào đã mở phiên');
    assert.equal(claims.exp - claims.iat, 3600, 'phiên hỗ trợ chỉ sống 1 giờ');

    const dash = await apiRequest(srv.url, 'GET', '/api/dashboard', { token });
    assert.equal(dash.status, 200);
    assert.equal(dash.json.me.username, 'tsupport');
    assert.ok(dash.json.items.some(i => i.fileName === 'support-demo.html'), 'Dashboard phải liệt kê bài của user');

    const saved = await apiRequest(srv.url, 'POST', '/api/files/support-demo.html', {
        token, body: { content: '<section><h1>admin sửa giúp</h1></section>' }
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));

    const own = await apiRequest(srv.url, 'GET', '/api/files/support-demo.html', { token: login.json.token });
    assert.match(own.json.content, /admin sửa giúp/, 'user thấy đúng bản mà admin đã sửa');
});

test('phiên hỗ trợ bị chặn với người thường, với chính mình và tài khoản không có thật', async () => {
    const asUser = await apiRequest(srv.url, 'POST', '/api/admin/users/tmaster/support', {
        token: srv.users.master.login, body: {}
    });
    assert.equal(asUser.status, 403);

    const self = await srv.api('POST', '/api/admin/users/admin/support', { body: {} });
    assert.equal(self.status, 400);

    const ghost = await srv.api('POST', '/api/admin/users/khongtontai/support', { body: {} });
    assert.equal(ghost.status, 404);
});

test('đặt lại mật khẩu thu hồi ngay phiên hỗ trợ đang mở', async () => {
    const token = (await srv.api('POST', '/api/admin/users/tsupport/support', { body: {} })).json.token;
    const reset = await srv.api('POST', '/api/admin/users/tsupport/password', { body: { newPassword: 'matkhau-moi' } });
    assert.equal(reset.status, 200);

    const after = await apiRequest(srv.url, 'GET', '/api/dashboard', { token });
    assert.equal(after.status, 401);
});

// ---------- vẽ TikZ → SVG ----------

const TIKZ_OK = '\\begin{tikzpicture}\\begin{axis}[xmin=0,xmax=4,ymin=0,ymax=8,width=10cm,height=5cm]'
    + '\\addplot[blue!25,draw=none,domain=0:2,samples=9]{x^2}\\closedcycle;\\end{axis}\\end{tikzpicture}';
const TIKZ_ODD = '\\begin{tikzpicture}\\draw (0,0) to[out=90,in=180] (1,1);\\end{tikzpicture}';

test('/api/ai/tikz: bộ vẽ tất định dựng hình ngay khi chưa có API Key', async () => {
    const res = await srv.api('POST', '/api/ai/tikz', { body: { code: TIKZ_OK } });
    assert.equal(res.status, 200, JSON.stringify(res.json));
    assert.equal(res.json.engine, 'tikzrender');
    assert.match(res.json.svg, /^<svg xmlns/);
    assert.match(res.json.svg, /<polygon points=/);
    assert.ok(!/<script|\son[a-z]/i.test(res.json.svg), 'SVG trả về phải sạch');
});

// Bộ vẽ chạy trong server nên không được ăn hạn mức AI — giáo án vài chục hình là dính 429.
test('hình do bộ tất định vẽ không tốn hạn mức AI mỗi phút', async () => {
    for (let i = 0; i < 10; i++) {
        const res = await srv.api('POST', '/api/ai/tikz', { body: { code: TIKZ_OK } });
        assert.equal(res.status, 200, `lần ${i + 1}: ${JSON.stringify(res.json)}`);
    }
});

test('mã ngoài tập cú pháp thì đòi API Key chứ không vẽ bừa', async () => {
    const res = await srv.api('POST', '/api/ai/tikz', { body: { code: TIKZ_ODD } });
    assert.equal(res.status, 400);
    assert.match(res.json.error, /API Key/);

    const empty = await srv.api('POST', '/api/ai/tikz', { body: { code: '   ' } });
    assert.equal(empty.status, 400);
    assert.match(empty.json.error, /Không có mã TikZ/);
});

// ---------- tái sử dụng bài trình chiếu ----------
// Tài khoản riêng: test đổi mật khẩu ở trên đã thu hồi token của tdesigner/tuser.

let reuseOwner = '';
let reuseFan = '';

async function makeUser(username) {
    await srv.api('POST', '/api/admin/users', { body: { username, password: 'matkhau123', role: 'user' } });
    const login = await apiRequest(srv.url, 'POST', '/api/auth/login', { body: { username, password: 'matkhau123' } });
    assert.equal(login.status, 200, `không đăng nhập được ${username}`);
    return login.json.token;
}

test('mở khoá thì người khác tái sử dụng thành bản nháp của riêng họ', async () => {
    reuseOwner = await makeUser('treuse-a');
    reuseFan = await makeUser('treuse-b');
    await apiRequest(srv.url, 'POST', '/api/files/dao-ham.html', {
        token: reuseOwner, body: { content: '<section><h1>Đạo hàm</h1></section>' }
    });
    await apiRequest(srv.url, 'POST', '/api/files/dao-ham.html/publish', { token: reuseOwner });

    const closed = await apiRequest(srv.url, 'POST', '/api/p/treuse-a/dao-ham.html/reuse', { token: reuseFan });
    assert.equal(closed.status, 403, 'chưa mở khoá thì phải chặn');
    assert.match(closed.json.error, /chưa cho phép/);
    // từ chối kiểu này KHÔNG được mang code 'auth', nếu không api.js đá nhầm người đang online
    assert.notEqual(closed.json.code, 'auth');

    const guest = await apiRequest(srv.url, 'POST', '/api/p/treuse-a/dao-ham.html/reuse', {});
    assert.equal(guest.status, 401, 'phải đăng nhập mới tái sử dụng được');
    assert.equal(guest.json.code, 'auth');

    const on = await apiRequest(srv.url, 'POST', '/api/files/dao-ham.html/reuse', {
        token: reuseOwner, body: { allow: true }
    });
    assert.equal(on.status, 200, JSON.stringify(on.json));
    assert.equal(on.json.allowReuse, true);

    const ownerDash = await apiRequest(srv.url, 'GET', '/api/dashboard', { token: reuseOwner });
    assert.equal(ownerDash.json.items.find(i => i.fileName === 'dao-ham.html').allowReuse, true,
        'Dashboard phải hiện ổ khoá mở cho chủ bài');

    const detail = await apiRequest(srv.url, 'GET', '/api/p/treuse-a/dao-ham.html', { token: reuseFan });
    assert.equal(detail.json.presentation.allowReuse, true, 'gallery cần cờ này để hiện nút Reuse');

    const original = await apiRequest(srv.url, 'GET', '/api/files/dao-ham.html', { token: reuseOwner });

    const copy = await apiRequest(srv.url, 'POST', '/api/p/treuse-a/dao-ham.html/reuse', { token: reuseFan });
    assert.equal(copy.status, 200, JSON.stringify(copy.json));
    assert.equal(copy.json.fileName, 'dao-ham.html', 'chưa trùng tên thì giữ nguyên tên gốc');

    const copied = await apiRequest(srv.url, 'GET', '/api/files/dao-ham.html', { token: reuseFan });
    assert.match(copied.json.content, /^<!-- Tái sử dụng từ bài «Đạo hàm» của @treuse-a/, 'phải ghi nguồn tác giả');
    assert.ok(copied.json.content.includes(original.json.content), 'phải chép nguyên văn mã nguồn gốc');

    const untouched = await apiRequest(srv.url, 'GET', '/api/files/dao-ham.html', { token: reuseOwner });
    assert.equal(untouched.json.content, original.json.content, 'tái sử dụng không được đụng tới bản gốc');

    const again = await apiRequest(srv.url, 'POST', '/api/p/treuse-a/dao-ham.html/reuse', { token: reuseFan });
    assert.equal(again.json.fileName, 'dao-ham-2.html', 'trùng tên phải tự thành dao-ham-2.html');

    const fanDash = await apiRequest(srv.url, 'GET', '/api/dashboard', { token: reuseFan });
    const draftItem = fanDash.json.items.find(i => i.fileName === 'dao-ham.html');
    assert.equal(draftItem.status, 'draft', 'bản sao chỉ là nháp, không tự publish');
    assert.equal(draftItem.title, 'Đạo hàm', 'bản sao mang tiêu đề bài gốc chứ không chỉ tên file');
});

test('thu hồi khoá thì tái sử dụng bị chặn lại', async () => {
    const off = await apiRequest(srv.url, 'POST', '/api/files/dao-ham.html/reuse', {
        token: reuseOwner, body: { allow: false }
    });
    assert.equal(off.json.allowReuse, false);

    const denied = await apiRequest(srv.url, 'POST', '/api/p/treuse-a/dao-ham.html/reuse', { token: reuseFan });
    assert.equal(denied.status, 403);

    const ghost = await apiRequest(srv.url, 'POST', '/api/files/khongtontai.html/reuse', {
        token: reuseOwner, body: { allow: true }
    });
    assert.equal(ghost.status, 404, 'không được ghi record cho tên file không tồn tại');
});

test('tái sử dụng chịu hạn mức bài của người bấm', async () => {
    const full = await makeUser('treuse-full');
    for (let i = 1; i <= 10; i++) {
        await apiRequest(srv.url, 'POST', `/api/files/lop-${i}.html`, {
            token: full, body: { content: '<section><h1>x</h1></section>' }
        });
    }
    await apiRequest(srv.url, 'POST', '/api/files/dao-ham.html/reuse', { token: reuseOwner, body: { allow: true } });

    const res = await apiRequest(srv.url, 'POST', '/api/p/treuse-a/dao-ham.html/reuse', { token: full });
    assert.equal(res.status, 403);
    assert.match(res.json.error, /tối đa 10 bài/);
    assert.notEqual(res.json.code, 'auth', 'đầy hạn mức không phải phiên chết');

    const still = await apiRequest(srv.url, 'GET', '/api/files', { token: full });
    assert.equal(still.json.files.length, 10, 'bị chặn thì không được để lại bản nháp mồ côi');
});
