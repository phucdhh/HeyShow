import { get, post, del, setToken, clearToken, getToken, tokenPayload, onUnauthorized, ApiError } from './api.js';

const loginPanel = document.getElementById('login-panel');
const dashboardPanel = document.getElementById('dashboard-panel');

// Login
const loginUser = document.getElementById('login-user');
const loginPass = document.getElementById('login-pass');
const btnLogin = document.getElementById('btn-login');
const loginMsg = document.getElementById('login-msg');

// AI Config
const aiKeyGroq = document.getElementById('ai-key-groq');
const aiKeyDeepseek = document.getElementById('ai-key-deepseek');
const btnSaveAi = document.getElementById('btn-save-ai');
const aiMsg = document.getElementById('ai-msg');

// Change Pass
const newAdminPass = document.getElementById('new-admin-pass');
const btnChangePass = document.getElementById('btn-change-pass');
const userMsg = document.getElementById('user-msg');

// Quản lý người dùng
const usersTbody = document.getElementById('users-tbody');
const btnRefreshUsers = document.getElementById('btn-refresh-users');
const usersMsg = document.getElementById('users-msg');
const newUserName = document.getElementById('new-user-name');
const newUserPass = document.getElementById('new-user-pass');
const newUserRole = document.getElementById('new-user-role');
const btnCreateUser = document.getElementById('btn-create-user');
const createUserMsg = document.getElementById('create-user-msg');

const btnLogout = document.getElementById('btn-logout');

// Utility
function showMsg(el, text, isError = false) {
    el.textContent = text;
    el.className = isError ? 'error-msg' : 'success-msg';
    setTimeout(() => el.textContent = '', 3000);
}

// Admin là một role của tài khoản bình thường, không phải tài khoản riêng —
// nên trang này đăng nhập bằng đúng token mà editor/dashboard đang dùng.
function msgOf(e, fallback) {
    return e instanceof ApiError ? e.message : fallback;
}

// --- TABS ---
const TAB_NAMES = ['users', 'ai', 'admin'];

function switchTab(name) {
    document.querySelectorAll('button.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    for (const t of TAB_NAMES) {
        document.getElementById('tab-' + t).classList.toggle('hidden', t !== name);
    }
    localStorage.setItem('heyshow_admin_tab', name);
}

document.querySelectorAll('button.tab').forEach(b => b.addEventListener('click', () => {
    closeOpenMenu();
    switchTab(b.dataset.tab);
}));

// Kiểm tra trạng thái đăng nhập. Token giờ dùng chung với editor, nên người dùng
// bình thường vẫn có token — phải nhìn role để không hiện bảng điều hành lỗi.
function checkAuth() {
    if (tokenPayload()?.role !== 'admin') {
        loginPanel.classList.remove('hidden');
        dashboardPanel.classList.add('hidden');
        if (getToken()) showMsg(loginMsg, 'Tài khoản đang đăng nhập không có quyền quản trị', true);
        return false;
    }
    loginPanel.classList.add('hidden');
    dashboardPanel.classList.remove('hidden');
    switchTab(localStorage.getItem('heyshow_admin_tab') || 'users');
    loadConfig();
    loadUsers();
    return true;
}

onUnauthorized(() => {
    if (loginPanel.classList.contains('hidden')) showMsg(loginMsg, 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại', true);
    checkAuth();
});

// Gọi API lấy cấu hình
async function loadConfig() {
    try {
        const data = await get('/api/admin/config');
        const keys = data.config.aiKeys || {};
        aiKeyGroq.value = keys.groq || '';
        aiKeyDeepseek.value = keys.deepseek || '';
    } catch (e) {
        console.error("Lỗi tải cấu hình:", e);
    }
}

// --- QUẢN LÝ NGƯỜI DÙNG ---

function currentAdminName() {
    return tokenPayload()?.username || null;
}

function fmtDate(ts) {
    return ts ? new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

async function loadUsers() {
    try {
        const data = await get('/api/admin/users');
        renderRoleOptions(data.roles);
        renderUsers(data.users);
    } catch (e) {
        if (e instanceof ApiError) showMsg(usersMsg, e.message, true);
        else showMsg(usersMsg, 'Lỗi kết nối', true);
    }
}

// Nhãn quyền kèm hạn mức lấy từ server để hai bên khỏi lệch số
function renderRoleOptions(roles) {
    if (!Array.isArray(roles)) return;
    for (const option of newUserRole.options) {
        const info = roles.find(r => r.name === option.value);
        option.textContent = info
            ? (info.maxPresentations === null ? `${info.label} — không giới hạn` : `${info.label} — tối đa ${info.maxPresentations} bài`)
            : option.value;
    }
}

function makeCell(parent, cls, text) {
    const td = document.createElement('td');
    if (cls) td.className = cls;
    td.textContent = text;
    parent.appendChild(td);
    return td;
}

// Chỉ một menu dropdown được mở tại một thời điểm; bấm ra ngoài thì đóng
function closeOpenMenu() {
    document.querySelectorAll('.menu').forEach(m => m.remove());
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-cell')) closeOpenMenu();
});

function openMenu(cell, items) {
    const already = cell.querySelector('.menu');
    closeOpenMenu();
    if (already) return;
    const menu = document.createElement('div');
    menu.className = 'menu';
    for (const it of items) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = it.label;
        if (it.danger) b.classList.add('danger');
        if (it.disabled) {
            b.disabled = true;
            b.title = it.disabledReason || '';
        } else {
            b.addEventListener('click', () => { closeOpenMenu(); it.action(); });
        }
        menu.appendChild(b);
    }
    cell.appendChild(menu);
}

const ROLE_NAMES = ['user', 'designer', 'master', 'admin'];

function renderUsers(users) {
    usersTbody.innerHTML = '';
    const me = currentAdminName();
    // Xếp theo ngày tạo, mới nhất trước
    users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    for (const u of users) {
        const tr = document.createElement('tr');

        const tdAva = makeCell(tr, null, '');
        const ava = document.createElement('img');
        ava.className = 'u-ava';
        ava.src = u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=random&size=64`;
        ava.alt = '';
        const name = document.createElement('span');
        name.className = 'u-name';
        name.textContent = u.username;
        tdAva.append(ava, name);
        if (u.email) {
            const sub = document.createElement('div');
            sub.className = 'u-sub';
            sub.textContent = u.email;
            tdAva.appendChild(sub);
        }

        const tdRole = makeCell(tr, null, '');
        const badge = document.createElement('span');
        badge.className = 'badge ' + u.role;
        badge.textContent = u.role;
        tdRole.appendChild(badge);
        const quota = document.createElement('div');
        quota.className = 'u-sub u-quota' + (u.quotaReached ? ' full' : '');
        quota.textContent = u.maxPresentations === null
            ? `${u.presentations} bài`
            : `${u.presentations}/${u.maxPresentations} bài${u.quotaReached ? ' — đã đầy' : ''}`;
        tdRole.appendChild(quota);

        makeCell(tr, null, u.urlSlug);
        makeCell(tr, 'num', u.drafts);
        makeCell(tr, 'num', u.published);
        makeCell(tr, 'num', `${u.views} / ${u.likes}`);
        makeCell(tr, null, fmtDate(u.createdAt));

        const tdAct = makeCell(tr, 'action-cell', '');
        const dots = document.createElement('button');
        dots.type = 'button';
        dots.className = 'mini dots';
        dots.textContent = '⋮';
        dots.title = `Thao tác với ${u.username}`;
        dots.addEventListener('click', (e) => {
            e.stopPropagation();
            const selfEdit = u.username === me;
            const menu = [{ label: 'Đặt lại mật khẩu', action: () => toggleResetRow(tr, u.username) }];
            // 4 bậc quyền liệt kê thẳng trong menu, bỏ qua quyền hiện tại
            for (const role of ROLE_NAMES) {
                if (role === u.role) continue;
                menu.push({
                    label: `Đổi quyền → ${role}`,
                    disabled: selfEdit,
                    disabledReason: 'Không thể tự đổi quyền của chính mình',
                    action: () => changeRole(u, role)
                });
            }
            menu.push({
                label: 'Xóa tài khoản',
                danger: true,
                disabled: selfEdit,
                disabledReason: 'Không thể tự xóa tài khoản của chính mình',
                action: () => deleteUser(u.username)
            });
            openMenu(tdAct, menu);
        });
        tdAct.appendChild(dots);
        usersTbody.appendChild(tr);
    }
}

function changeRole(u, newRole) {
    if (!confirm(`Đổi ${u.username} từ ${u.role} → ${newRole}?\n\nCác phiên đang đăng nhập của người này sẽ bị buộc đăng nhập lại.`)) return;
    adminPost(`/admin/users/${encodeURIComponent(u.username)}/role`, { role: newRole }, usersMsg, loadUsers);
}

async function deleteUser(username) {
    const typed = prompt(`Xóa vĩnh viễn "${username}" cùng toàn bộ bản nháp, bài đã publish và số liệu gallery?\nGõ lại đúng tên tài khoản để xác nhận:`);
    if (typed === null) return;
    if (typed.trim() !== username) return showMsg(usersMsg, 'Tên xác nhận không khớp, hủy xóa.', true);
    try {
        const data = await del(`/api/admin/users/${encodeURIComponent(username)}`);
        showMsg(usersMsg, data.message || 'Đã xóa tài khoản');
        loadUsers();
    } catch (e) {
        showMsg(usersMsg, msgOf(e, 'Lỗi kết nối'), true);
    }
}

// Hàng nhập mật khẩu mới hiện ngay dưới dòng user đang chọn
function toggleResetRow(refTr, username) {
    const existing = usersTbody.querySelector(`tr.reset-row[data-for="${CSS.escape(username)}"]`);
    usersTbody.querySelectorAll('tr.reset-row').forEach(r => r.remove());
    if (existing) return;

    const tr = document.createElement('tr');
    tr.className = 'reset-row';
    tr.dataset.for = username;
    const td = document.createElement('td');
    td.colSpan = 8;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Mật khẩu mới cho ${username} (tối thiểu 3 ký tự)`;
    const btnSave = document.createElement('button');
    btnSave.type = 'button';
    btnSave.className = 'mini';
    btnSave.textContent = 'Lưu';
    td.prepend(input);
    td.appendChild(btnSave);
    const doSave = () => {
        const pw = input.value;
        if (pw.length < 3) return showMsg(usersMsg, 'Mật khẩu phải có ít nhất 3 ký tự', true);
        adminPost(`/admin/users/${encodeURIComponent(username)}/password`, { newPassword: pw }, usersMsg, () => { tr.remove(); loadUsers(); });
    };
    btnSave.addEventListener('click', doSave);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doSave(); });
    tr.appendChild(td);
    refTr.after(tr);
    input.focus();
}

async function adminPost(path_, body, msgEl, onSuccess) {
    try {
        const data = await post(`/api${path_}`, body);
        showMsg(msgEl, data.message || 'Thành công!');
        if (onSuccess) onSuccess();
    } catch (e) {
        showMsg(msgEl, msgOf(e, 'Lỗi kết nối'), true);
    }
}

btnRefreshUsers.addEventListener('click', loadUsers);

btnCreateUser.addEventListener('click', () => {
    const name = newUserName.value.trim();
    const pass = newUserPass.value;
    if (!name) return showMsg(createUserMsg, 'Nhập tên đăng nhập', true);
    if (pass.length < 3) return showMsg(createUserMsg, 'Mật khẩu phải có ít nhất 3 ký tự', true);
    adminPost('/admin/users', { username: name, password: pass, role: newUserRole.value }, createUserMsg, () => {
        newUserName.value = '';
        newUserPass.value = '';
        loadUsers();
    });
});

// Đăng nhập
btnLogin.addEventListener('click', async () => {
    try {
        const data = await post('/api/auth/login', { username: loginUser.value.trim(), password: loginPass.value });
        if (data.me && data.me.role !== 'admin') {
            showMsg(loginMsg, 'Tài khoản này không có quyền quản trị', true);
            return;
        }
        setToken(data.token);
        loginPass.value = '';
        checkAuth();
    } catch (e) {
        showMsg(loginMsg, msgOf(e, 'Lỗi kết nối'), true);
    }
});

// Lưu API Key
btnSaveAi.addEventListener('click', async () => {
    await adminPost('/admin/config', {
        aiKeys: { groq: aiKeyGroq.value.trim(), deepseek: aiKeyDeepseek.value.trim() }
    }, aiMsg, null);
});

// Đổi mật khẩu
btnChangePass.addEventListener('click', async () => {
    const newPass = newAdminPass.value.trim();
    if (!newPass) return showMsg(userMsg, 'Vui lòng nhập mật khẩu mới', true);
    try {
        const data = await post('/api/admin/password', { newPassword: newPass });
        newAdminPass.value = '';
        // Server thu hồi mọi token cũ khi đổi mật khẩu, kể cả token của trang này
        showMsg(userMsg, (data.message || 'Đổi mật khẩu thành công!') + ' Hãy đăng nhập lại.');
        setTimeout(logout, 1500);
    } catch (e) {
        showMsg(userMsg, msgOf(e, 'Lỗi kết nối'), true);
    }
});

// Đăng xuất
function logout() {
    clearToken();
    checkAuth();
}
btnLogout.addEventListener('click', logout);

// Khởi chạy
checkAuth();
