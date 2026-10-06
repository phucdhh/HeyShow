const API_BASE = '/api';

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

// Kiểm tra trạng thái đăng nhập
function checkAuth() {
    const token = localStorage.getItem('heyshow_admin_token');
    if (token) {
        loginPanel.classList.add('hidden');
        dashboardPanel.classList.remove('hidden');
        switchTab(localStorage.getItem('heyshow_admin_tab') || 'users');
        loadConfig();
        loadUsers();
    } else {
        loginPanel.classList.remove('hidden');
        dashboardPanel.classList.add('hidden');
    }
}

// Gọi API lấy cấu hình
async function loadConfig() {
    try {
        const token = localStorage.getItem('heyshow_admin_token');
        const res = await fetch(`${API_BASE}/admin/config`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            const keys = data.config.aiKeys || {};
            aiKeyGroq.value = keys.groq || '';
            aiKeyDeepseek.value = keys.deepseek || '';
        } else if (res.status === 401 || res.status === 403) {
            // Token hết hạn
            logout();
        }
    } catch (e) {
        console.error("Lỗi tải cấu hình:", e);
    }
}

// --- QUẢN LÝ NGƯỜI DÙNG ---

function authHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('heyshow_admin_token')}` };
}

// Tên đăng nhập của người đang quản trị (decode payload JWT, chỉ để ẩn nút tự xóa/đổi quyền)
function currentAdminName() {
    try {
        const payload = JSON.parse(atob(localStorage.getItem('heyshow_admin_token').split('.')[1]));
        return payload.username;
    } catch (e) {
        return null;
    }
}

function fmtDate(ts) {
    return ts ? new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

async function loadUsers() {
    try {
        const res = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders() });
        if (res.status === 401 || res.status === 403) return logout();
        const data = await res.json();
        if (data.success) renderUsers(data.users);
        else showMsg(usersMsg, data.error || 'Không tải được danh sách user', true);
    } catch (e) {
        showMsg(usersMsg, 'Lỗi kết nối', true);
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
            openMenu(tdAct, [
                { label: 'Đặt lại mật khẩu', action: () => toggleResetRow(tr, u.username) },
                {
                    label: u.role === 'user' ? 'Đổi quyền → admin' : 'Đổi quyền → user',
                    disabled: u.username === me,
                    disabledReason: 'Không thể tự đổi quyền của chính mình',
                    action: async () => {
                        const newRole = u.role === 'user' ? 'admin' : 'user';
                        if (!confirm(`Đổi ${u.username} thành ${newRole}?`)) return;
                        await adminPost(`/admin/users/${encodeURIComponent(u.username)}/role`, { role: newRole }, usersMsg, loadUsers);
                    }
                },
                {
                    label: 'Xóa tài khoản',
                    danger: true,
                    disabled: u.username === me,
                    disabledReason: 'Không thể tự xóa tài khoản của chính mình',
                    action: () => deleteUser(u.username)
                }
            ]);
        });
        tdAct.appendChild(dots);
        usersTbody.appendChild(tr);
    }
}

async function deleteUser(username) {
    const typed = prompt(`Xóa vĩnh viễn "${username}" cùng toàn bộ bản nháp, bài đã publish và số liệu gallery?\nGõ lại đúng tên tài khoản để xác nhận:`);
    if (typed === null) return;
    if (typed.trim() !== username) return showMsg(usersMsg, 'Tên xác nhận không khớp, hủy xóa.', true);
    try {
        const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(username)}`, { method: 'DELETE', headers: authHeaders() });
        const data = await res.json();
        showMsg(usersMsg, data.success ? data.message : (data.error || 'Xóa thất bại'), !data.success);
        if (data.success) loadUsers();
    } catch (e) {
        showMsg(usersMsg, 'Lỗi kết nối', true);
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
    const doSave = async () => {
        const pw = input.value;
        if (pw.length < 3) return showMsg(usersMsg, 'Mật khẩu phải có ít nhất 3 ký tự', true);
        await adminPost(`/admin/users/${encodeURIComponent(username)}/password`, { newPassword: pw }, usersMsg, () => { tr.remove(); loadUsers(); });
    };
    btnSave.addEventListener('click', doSave);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doSave(); });
    tr.appendChild(td);
    refTr.after(tr);
    input.focus();
}

async function adminPost(path_, body, msgEl, onSuccess) {
    try {
        const res = await fetch(`${API_BASE}${path_}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) { showMsg(msgEl, data.message || 'Thành công!'); if (onSuccess) onSuccess(); }
        else showMsg(msgEl, data.error || 'Có lỗi xảy ra', true);
    } catch (e) {
        showMsg(msgEl, 'Lỗi kết nối', true);
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
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: loginUser.value, password: loginPass.value })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('heyshow_admin_token', data.token);
            loginPass.value = '';
            checkAuth();
        } else {
            showMsg(loginMsg, 'Sai tài khoản hoặc mật khẩu', true);
        }
    } catch (e) {
        showMsg(loginMsg, 'Lỗi kết nối', true);
    }
});

// Lưu API Key
btnSaveAi.addEventListener('click', async () => {
    try {
        const token = localStorage.getItem('heyshow_admin_token');
        const res = await fetch(`${API_BASE}/admin/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ aiKeys: { groq: aiKeyGroq.value.trim(), deepseek: aiKeyDeepseek.value.trim() } })
        });
        const data = await res.json();
        if (data.success) showMsg(aiMsg, 'Đã lưu cấu hình AI!');
        else showMsg(aiMsg, data.error || 'Có lỗi xảy ra', true);
    } catch (e) {
        showMsg(aiMsg, 'Lỗi kết nối', true);
    }
});

// Đổi mật khẩu
btnChangePass.addEventListener('click', async () => {
    const newPass = newAdminPass.value.trim();
    if (!newPass) return showMsg(userMsg, 'Vui lòng nhập mật khẩu mới', true);

    try {
        const token = localStorage.getItem('heyshow_admin_token');
        const res = await fetch(`${API_BASE}/admin/password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newPassword: newPass })
        });
        const data = await res.json();
        if (data.success) {
            showMsg(userMsg, 'Đổi mật khẩu thành công!');
            newAdminPass.value = '';
        } else {
            showMsg(userMsg, data.error || 'Có lỗi xảy ra', true);
        }
    } catch (e) {
        showMsg(userMsg, 'Lỗi kết nối', true);
    }
});

// Đăng xuất
function logout() {
    localStorage.removeItem('heyshow_admin_token');
    checkAuth();
}
btnLogout.addEventListener('click', logout);

// Khởi chạy
checkAuth();
