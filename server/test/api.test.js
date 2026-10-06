// Test tích hợp toàn bộ bề mặt API: quyền + hạn mức, lịch sử phiên bản, bình luận
// lồng nhau, đường dẫn /show/ và cô lập origin, thu hồi token, avatar.
//
// Chạy: node --test server/test/   (kho dữ liệu là thư mục tạm, không đụng data/)

const test = require('node:test');
const assert = require('node:assert/strict');
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

    const slide = await fetch(srv.url + pub.json.url);
    assert.equal(slide.status, 200);
    assert.match(slide.headers.get('content-security-policy'), /^sandbox\b/, 'slide phải chạy ở origin mờ');
    assert.equal(slide.headers.get('cache-control'), 'no-cache', 'republish phải có hiệu lực ngay');

    // link kiểu cũ /<slug>/<file>.html vẫn mở được vì nhiều người đã chia sẻ
    const legacy = await fetch(`${srv.url}/tmaster/hist.html`);
    assert.equal(legacy.status, 200);
    assert.match(legacy.headers.get('content-security-policy'), /sandbox/);

    // các trang của ứng dụng KHÔNG bị sandbox (editor cần localStorage)
    const landing = await fetch(srv.url + '/');
    assert.ok(!/sandbox/.test(landing.headers.get('content-security-policy') || ''), 'trang editor phải giữ được origin thật');
    assert.equal(landing.status, 200);
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

test('gallery và profile công khai dùng link /show/', async () => {
    const gal = await srv.api('GET', '/api/gallery');
    const item = gal.json.items.find(p => p.url && p.url.includes('hist.html'));
    assert.ok(item, 'bài đã publish phải có trong gallery');
    assert.ok(item.url.startsWith('/show/'), item.url);

    const prof = await srv.api('GET', '/api/profile/tmaster');
    assert.equal(prof.status, 200);
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
