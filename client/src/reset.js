// Trang đặt lại mật khẩu. Một trang hai bước:
//   /reset_password              -> xin đường link gửi về email
//   /reset_password?token=***    -> đặt mật khẩu mới theo link trong thư
//
// Token đọc xong là xóa khỏi address bar: Cloudflare ghi query string vào log và trình
// duyệt giữ nó trong lịch sử, trong khi link chỉ sống 30 phút và dùng một lần.

import { post, clearToken, ApiError } from './api.js';

const PASS_MIN = 8;
const TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/;

const panelRequest = document.getElementById('panel-request');
const panelReset = document.getElementById('panel-reset');
const reqUser = document.getElementById('req-user');
const btnRequest = document.getElementById('btn-request');
const reqMsg = document.getElementById('req-msg');
const tokenPreview = document.getElementById('token-preview');
const newPass = document.getElementById('new-pass');
const newPassConfirm = document.getElementById('new-pass-confirm');
const btnReset = document.getElementById('btn-reset');
const resetMsg = document.getElementById('reset-msg');

function say(el, kind, text) {
    el.className = `msg ${kind}`;
    el.textContent = text;
}

function lockForm(button, fields) {
    button.disabled = true;
    fields.forEach(input => { input.disabled = true; });
}

const token = (new URLSearchParams(location.search).get('token') || '').trim();

if (TOKEN_RE.test(token)) {
    panelRequest.classList.add('hidden');
    panelReset.classList.remove('hidden');
    tokenPreview.textContent = token;
    newPass.focus();
} else if (token) {
    panelReset.classList.remove('hidden');
    tokenPreview.textContent = token;
    say(resetMsg, 'err', 'Đường link trong email có vẻ bị cắt ngang (điện thoại hoặc trình duyệt hay làm vậy). Hãy xin link mới ở phía trên.');
}

history.replaceState(null, '', '/reset_password');

btnRequest.addEventListener('click', async () => {
    const username = reqUser.value.trim();
    if (!username) return say(reqMsg, 'err', 'Vui lòng nhập tên đăng nhập hoặc email.');

    btnRequest.disabled = true;
    say(reqMsg, 'info', 'Đang gửi thư...');
    try {
        const data = await post('/api/auth/forgot-password', { username });
        say(reqMsg, 'ok', data.message);
    } catch (e) {
        say(reqMsg, 'err', e instanceof ApiError ? e.message : 'Lỗi kết nối mạng, hãy thử lại.');
    } finally {
        btnRequest.disabled = false;
    }
});

btnReset.addEventListener('click', async () => {
    const password = newPass.value;
    if (password.length < PASS_MIN) return say(resetMsg, 'err', `Mật khẩu phải có ít nhất ${PASS_MIN} ký tự`);
    if (password !== newPassConfirm.value) return say(resetMsg, 'err', 'Xác nhận mật khẩu không khớp');

    btnReset.disabled = true;
    say(resetMsg, 'info', 'Đang lưu...');
    try {
        const data = await post('/api/auth/reset-password', { token, password });
        lockForm(btnReset, [newPass, newPassConfirm]);
        // Đổi mật khẩu làm vô hiệu mọi phiên đang mở, nên token cục bộ (nếu còn) cũng
        // hết tác dụng — xóa để không quay lại Design rồi bị đá ra âm thầm.
        clearToken();
        resetMsg.className = 'msg ok';
        resetMsg.textContent = `${data.message} `;
        const go = document.createElement('a');
        go.href = '/design';
        go.textContent = 'Đăng nhập ngay';
        resetMsg.appendChild(go);
    } catch (e) {
        say(resetMsg, 'err', e instanceof ApiError ? e.message : 'Lỗi kết nối mạng, hãy thử lại.');
        btnReset.disabled = false;
    }
});

reqUser.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') btnRequest.click();
});

[newPass, newPassConfirm].forEach(el => el.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') btnReset.click();
}));
