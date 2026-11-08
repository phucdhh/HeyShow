// Dashboard: Presentations (dropdown ⋮ cho từng bài), Activities, Profile, Import, Sync và Backup.
import { get, post, del, request, getToken, setToken, clearToken, tokenPayload, getStashedToken, clearStashedToken, onUnauthorized, authHeaders } from './api.js';
import { allDecks, putDeck, putDecks, clearDecks, isSupported as idbSupported, estimate as idbEstimate } from './browser-store.js';

const TAB_KEY = 'heyshow_dashboard_tab';
const TAB_NAMES = ['presentations', 'activities', 'profile', 'import', 'sync', 'backup'];

const itemsEl = document.getElementById('items');
const itemsEmpty = document.getElementById('items-empty');
const activityEl = document.getElementById('activity');
const activityEmpty = document.getElementById('activity-empty');
const meAvatar = document.getElementById('me-avatar');
const meRole = document.getElementById('me-role');
const supportBar = document.getElementById('support-bar');
const supportWho = document.getElementById('support-who');
const toastEl = document.getElementById('toast');

const deleteOverlay = document.getElementById('delete-overlay');
const deleteMsg = document.getElementById('delete-msg');
const renameOverlay = document.getElementById('rename-overlay');
const renameOld = document.getElementById('rename-old');
const renameInput = document.getElementById('rename-input');
const reuseOverlay = document.getElementById('reuse-overlay');
const reuseTitle = document.getElementById('reuse-title');
const reuseMsg = document.getElementById('reuse-msg');
const reuseConfirm = document.getElementById('reuse-confirm');
const quotaLine = document.getElementById('quota-line');

const historyOverlay = document.getElementById('history-overlay');
const historyFile = document.getElementById('history-file');
const historyList = document.getElementById('history-list');

const profileAvatar = document.getElementById('profile-avatar');
const profileAvatarUpload = document.getElementById('profile-avatar-upload');
const profileFullName = document.getElementById('profile-fullname');
const profileEmail = document.getElementById('profile-email');
const profilePhone = document.getElementById('profile-phone');
const profileSlug = document.getElementById('profile-slug');
const profilePass = document.getElementById('profile-pass');
const btnSaveProfile = document.getElementById('btn-save-profile');
const profileMsg = document.getElementById('profile-msg');

let items = [];
let pendingDelete = null;
let pendingRename = null;
let pendingReuse = null;
let tempAvatarBase64 = null;
let myUsername = '';

function requireLogin() {
    location.replace(`/design?redirect=${encodeURIComponent('/dashboard')}`);
}

if (!getToken()) requireLogin();

// api.js đã xoá token; ở đây chỉ cần đưa người dùng về màn hình đăng nhập
onUnauthorized(() => requireLogin());

// ---------- Phiên hỗ trợ: admin mở Dashboard này từ ảnh đại diện ở bảng Users ----------
const supportPayload = tokenPayload();
const supportingUser = supportPayload && supportPayload.imp ? supportPayload.username : null;

if (supportingUser) {
    document.body.classList.add('supporting');
    supportWho.textContent = `Đang hỗ trợ ${supportingUser} (admin: ${supportPayload.imp})`;
    supportBar.classList.remove('hidden');
} else {
    // Token cất tạm chỉ để phục vụ nút "Về bảng quản trị"; không còn phiên hỗ trợ
    // nào thì xóa ngay, kẻo token admin vẫn nằm lại trong localStorage.
    clearStashedToken();
}

document.getElementById('btn-exit-support').addEventListener('click', () => {
    const adminToken = getStashedToken();
    clearStashedToken();
    if (adminToken) setToken(adminToken);
    else clearToken();
    location.href = '/admin_panel';
});

function showToast(message, isError = false) {
    toastEl.textContent = message;
    toastEl.style.background = isError ? '#dc2626' : '#16a34a';
    toastEl.style.color = '#ffffff';
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// Báo lỗi cho từng thao tác: server trả message cụ thể (vd vượt hạn mức bài)
function fail(e) {
    if (e && e.status) showToast(e.message || 'Yêu cầu không thành công', true);
    else showToast('Lỗi kết nối', true);
}

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'vừa xong';
    if (min < 60) return `${min} phút trước`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} giờ trước`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day} ngày trước`;
    return new Date(ts).toLocaleDateString('vi-VN');
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

// ---------- Tabs ----------

function switchTab(name) {
    closeOpenMenu();
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    for (const t of TAB_NAMES) document.getElementById('tab-' + t).classList.toggle('hidden', t !== name);
    localStorage.setItem(TAB_KEY, name);
    // Bảng so sánh cần dữ liệu hai phía (server + IndexedDB) nên chỉ dựng khi tab mở.
    if (name === 'sync') refreshSync();
}

document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

// ---------- Dropdown menu (kiểu VS Code, chỉ mở 1 menu lúc một) ----------

function closeOpenMenu() {
    document.querySelectorAll('.menu').forEach(m => m.remove());
}

document.addEventListener('click', e => {
    if (!e.target.closest('.menu-wrap')) closeOpenMenu();
});

function openMenu(wrap, menuItems) {
    const already = wrap.querySelector('.menu');
    closeOpenMenu();
    if (already) return;
    const menu = el('div', 'menu');
    for (const it of menuItems) {
        const btn = el('button', it.danger ? 'danger' : '', it.label);
        btn.type = 'button';
        if (it.onClick) btn.addEventListener('click', () => { closeOpenMenu(); it.onClick(); });
        else { btn.disabled = true; btn.title = it.disabledReason || ''; }
        menu.appendChild(btn);
    }
    wrap.appendChild(menu);
}

// ---------- Render danh sách trình chiếu ----------

async function doPublish(item) {
    try {
        await post(`/api/files/${encodeURIComponent(item.fileName)}/publish`);
        showToast('Đã xuất bản!');
        await load();
    } catch (e) {
        fail(e);
    }
}

async function doUnpublish(item) {
    try {
        await post(`/api/files/${encodeURIComponent(item.fileName)}/unpublish`);
        showToast('Đã chuyển về bản nháp');
        await load();
    } catch (e) {
        fail(e);
    }
}

async function doExport(item) {
    try {
        const out = await request('GET', `/api/files/${encodeURIComponent(item.fileName)}/export`);
        if (!out.ok) return showToast((out.data && out.data.error) || 'Lỗi tải file', true);
        const blob = new Blob([out.text], { type: 'text/html;charset=utf-8' });
        const a = el('a');
        a.href = URL.createObjectURL(blob);
        a.download = item.fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    } catch (e) {
        fail(e);
    }
}

// ---------- Lịch sử phiên bản bản nháp ----------

function fmtVersion(at) {
    if (!at) return 'không rõ thời điểm';
    return `${new Date(at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })} · ${timeAgo(at)}`;
}

async function restoreVersion(item, version, btn) {
    if (!confirm(`Khôi phục "${item.title}" về bản ${fmtVersion(version.at)}?\n\nNội dung hiện tại sẽ được cất thành một phiên bản mới, nên vẫn quay lại được.`)) return;
    btn.disabled = true;
    try {
        await post(`/api/files/${encodeURIComponent(item.fileName)}/history/${encodeURIComponent(version.name)}/restore`);
        historyOverlay.classList.add('hidden');
        showToast('Đã khôi phục phiên bản');
        location.href = `/design?file=${encodeURIComponent(item.fileName)}`;
    } catch (e) {
        fail(e);
        btn.disabled = false;
    }
}

async function openHistory(item) {
    historyFile.textContent = `${item.title} (${item.fileName})`;
    historyList.replaceChildren(el('p', null, 'Đang tải…'));
    historyOverlay.classList.remove('hidden');
    try {
        const data = await get(`/api/files/${encodeURIComponent(item.fileName)}/history`);
        historyList.replaceChildren();
        if (!data.versions.length) {
            const empty = el('p', null, `Chưa có phiên bản nào. HeyShow sẽ tự lưu ${data.maxVersions} bản gần nhất mỗi lần bạn sửa bài trong Design.`);
            empty.id = 'history-empty';
            historyList.appendChild(empty);
            return;
        }
        for (const [i, v] of data.versions.entries()) {
            const row = el('div', 'version');
            const when = el('div', 'when');
            when.appendChild(el('span', null, i === 0 ? 'Bản lưu gần nhất' : timeAgo(v.at)));
            when.appendChild(el('small', null, `${fmtVersion(v.at)} · ${(v.size / 1024).toFixed(1)} KB`));
            const btn = el('button', null, '↩ Khôi phục');
            btn.type = 'button';
            btn.addEventListener('click', () => restoreVersion(item, v, btn));
            row.append(when, btn);
            historyList.appendChild(row);
        }
    } catch (e) {
        historyList.replaceChildren(el('p', 'avatar-hint', 'Không tải được lịch sử phiên bản.'));
        fail(e);
    }
}

document.getElementById('history-cancel').addEventListener('click', () => historyOverlay.classList.add('hidden'));
historyOverlay.addEventListener('click', e => {
    if (e.target === historyOverlay) historyOverlay.classList.add('hidden');
});

function renderItem(item) {
    const card = el('div', 'item');
    card.dataset.file = item.fileName;

    const head = el('div', 'item-head');
    head.appendChild(el('span', 'item-title', item.title));

    // 🔒 = chỉ mình bạn dùng; ♻ (cùng ký hiệu với nút Reuse trong Gallery) = bài đang cho tái sử dụng
    const lock = el('button', item.allowReuse ? 'reuse-toggle on' : 'reuse-toggle',
        item.allowReuse ? '♻' : '🔒');
    lock.type = 'button';
    lock.title = item.allowReuse
        ? 'Đang cho phép tái sử dụng — bấm để thu hồi'
        : 'Chưa cho phép tái sử dụng — bấm để mở khoá';
    lock.addEventListener('click', () => openReuseConfirm(item));
    head.appendChild(lock);
    head.appendChild(el('span', `badge ${item.status}`, item.status === 'published' ? 'Đã xuất bản' : 'Nháp'));

    // Tên file xám, đã publish thì click vào mở thẳng bài viết
    let fileNode;
    if (item.url) {
        fileNode = el('a', 'item-file', item.fileName);
        fileNode.href = item.url;
        fileNode.target = '_blank';
        fileNode.rel = 'noopener';
        fileNode.title = 'Mở bài đã xuất bản';
    } else {
        fileNode = el('span', 'item-file', item.fileName);
    }
    head.appendChild(fileNode);

    const meta = el('div', 'item-meta');
    meta.appendChild(el('span', '', `👁 ${item.views}`));
    meta.appendChild(el('span', '', `♡ ${item.likes}`));
    meta.appendChild(el('span', '', `💬 ${item.commentCount}`));
    if (item.versions) meta.appendChild(el('span', '', `🕘 ${item.versions} phiên bản`));
    meta.appendChild(el('span', '', `Cập nhật ${timeAgo(item.updatedAt)}`));

    // Toàn bộ thao tác nằm trong dropdown ⋮ đặt ngang hàng tên file
    const wrap = el('div', 'menu-wrap');
    const dots = el('button', 'dots', '⋮');
    dots.type = 'button';
    dots.title = 'Thao tác';
    dots.addEventListener('click', e => {
        e.stopPropagation();
        const menuItems = [
            { label: '✏️ Sửa bài', onClick: () => { location.href = `/design?file=${encodeURIComponent(item.fileName)}`; } },
        ];
        if (item.hasDraft) {
            menuItems.push({ label: item.status === 'published' ? '🔄 Xuất bản lại' : '🚀 Publish', onClick: () => doPublish(item) });
        }
        if (item.url) {
            menuItems.push({ label: '🖨 In ra PDF', onClick: () => {
                window.open(`${item.url}?print-pdf`, '_blank', 'noopener');
                showToast('Trong tab mới: nhấn Ctrl/Cmd+P → chọn "Lưu dưới dạng PDF"');
            } });
            menuItems.push({ label: '📥 Về nháp', onClick: () => doUnpublish(item) });
        }
        menuItems.push({ label: '💾 Tải HTML', onClick: () => doExport(item) });
        menuItems.push({ label: '✍️ Đổi tên', onClick: () => openRename(item) });
        if (item.hasDraft) {
            menuItems.push({ label: `🕘 Lịch sử phiên bản${item.versions ? ` (${item.versions})` : ''}`, onClick: () => openHistory(item) });
        }
        menuItems.push({ label: '🗑 Xoá', danger: true, onClick: () => openDelete(item) });
        openMenu(wrap, menuItems);
    });
    wrap.appendChild(dots);
    head.appendChild(wrap);

    card.appendChild(head);
    card.appendChild(meta);
    return card;
}

function renderItems() {
    itemsEl.querySelectorAll('.item').forEach(n => n.remove());
    itemsEmpty.classList.toggle('hidden', items.length > 0);
    for (const item of items) itemsEl.appendChild(renderItem(item));
}

// ---------- Render hoạt động (likes / comments) ----------

function renderActivity(activity) {
    activityEl.querySelectorAll('.act').forEach(n => n.remove());
    activityEmpty.classList.toggle('hidden', activity.length > 0);

    for (const act of activity) {
        const row = el('div', 'act');
        const img = el('img');
        img.src = act.actor.avatar;
        img.alt = '';
        img.loading = 'lazy';
        row.appendChild(img);

        const body = el('div', 'body');
        const line = el('div');
        line.appendChild(el('span', 'who', act.actor.urlSlug || act.actor.username));
        line.appendChild(el('span', 'what', act.type === 'like' ? ' đã thích ' : act.isReply ? ' đã trả lời trong ' : ' đã bình luận trong '));
        const link = el('a', null, `«${act.title}»`);
        // Deep-link tới viewer của gallery cho đúng bài
        link.href = `/gallery#/p/${encodeURIComponent(myUsername)}/${encodeURIComponent(act.file)}`;
        line.appendChild(link);
        body.appendChild(line);

        if (act.type === 'comment' && act.text) {
            body.appendChild(el('div', 'text', act.text));
        }
        body.appendChild(el('time', null, timeAgo(act.at)));
        row.appendChild(body);
        activityEl.appendChild(row);
    }
}

// ---------- Profile ----------

profileAvatar.addEventListener('click', () => profileAvatarUpload.click());
profileAvatarUpload.addEventListener('change', () => {
    const file = profileAvatarUpload.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { showToast('Ảnh quá lớn. Vui lòng chọn ảnh < 1MB', true); return; }
    const reader = new FileReader();
    reader.onload = () => {
        tempAvatarBase64 = reader.result;
        profileAvatar.src = tempAvatarBase64;
    };
    reader.readAsDataURL(file);
    profileAvatarUpload.value = '';
});

// Tự động bỏ dấu và khoảng trắng cho slug
profileSlug.addEventListener('input', () => {
    let val = profileSlug.value;
    val = val.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    val = val.replace(/[^a-zA-Z0-9_-]/g, '');
    profileSlug.value = val;
});

function setProfileMsg(text, isError) {
    profileMsg.textContent = text;
    profileMsg.style.color = isError ? '#dc2626' : '#16a34a';
}

// Nhắc trước khi sát hạn mức để người dùng biết nên dọn bài hay xin nâng quyền
const NEAR_QUOTA = 2;

function renderQuota(quota) {
    if (!quota || quota.max === null) {
        quotaLine.classList.add('hidden');
        return;
    }
    quotaLine.replaceChildren(
        el('span', null, 'Hạn mức: '),
        el('b', null, `${quota.used}/${quota.max} bài trình chiếu`),
        el('span', null, quota.used >= quota.max ? ' — đã đầy, hãy xoá bớt bài trước khi tạo bài mới' : ` — còn tạo được ${quota.max - quota.used} bài`)
    );
    quotaLine.classList.toggle('near', quota.max - quota.used <= NEAR_QUOTA);
    quotaLine.classList.remove('hidden');
}

async function loadProfile() {
    try {
        const data = await get('/api/user/profile');
        const p = data.profile;
        profileAvatar.src = p.avatar;
        profileFullName.value = p.fullName || '';
        profileEmail.value = p.email || '';
        profilePhone.value = p.phone || '';
        profileSlug.value = p.urlSlug || '';
        renderQuota(p.quota);
    } catch (e) {
        if (e && e.status) setProfileMsg(e.message, true);
        else console.error('Lỗi tải hồ sơ:', e);
    }
}

btnSaveProfile.addEventListener('click', async () => {
    btnSaveProfile.disabled = true;
    setProfileMsg('Đang lưu...', false);
    try {
        const payload = {
            fullName: profileFullName.value.trim(),
            email: profileEmail.value.trim(),
            phone: profilePhone.value.trim(),
            urlSlug: profileSlug.value.trim(),
        };
        if (profilePass.value) payload.password = profilePass.value;
        if (tempAvatarBase64) payload.avatarBase64 = tempAvatarBase64;

        await post('/api/user/profile', payload);
        setProfileMsg('Lưu thành công!');
        profilePass.value = '';
        tempAvatarBase64 = null;
        showToast('Đã cập nhật hồ sơ');
        await loadProfile();
    } catch (e) {
        setProfileMsg((e && e.message) || 'Lỗi kết nối', Boolean(e && e.status));
    } finally {
        btnSaveProfile.disabled = false;
    }
});

// ---------- Import PPTX ----------

const importDrop = document.getElementById('import-drop');
const btnPickPptx = document.getElementById('btn-pick-pptx');
const importFile = document.getElementById('import-file');
const importFileName = document.getElementById('import-file-name');
const importStatus = document.getElementById('import-status');
const importReport = document.getElementById('import-report');

let importBuffer = null;   // ArrayBuffer của file đã chọn, giữ để gửi lại lúc convert
let importOrigName = '';
let importKind = 'pptx';   // 'pptx' | 'text' (md/tex) — quyết định gọi endpoint nào

function setImportStatus(text, isError) {
    importStatus.textContent = text;
    importStatus.className = isError ? 'error' : '';
}

// ---- Progress import: dùng XHR vì fetch không có event upload.onprogress ----
// pct = 0..100 (xác định) hoặc null (thanh chạy bất định khi server xử lý)
let progressEl = null;
function showProgress(label, pct) {
    if (!progressEl) {
        progressEl = el('div', 'import-progress');
        progressEl.appendChild(el('div', 'label'));
        const wrap = el('div', 'bar-wrap');
        wrap.appendChild(el('div', 'bar'));
        progressEl.appendChild(wrap);
        importStatus.replaceChildren(progressEl);
        importStatus.className = '';
    }
    const labelEl = progressEl.querySelector('.label');
    labelEl.replaceChildren(el('span', null, label));
    if (pct === null) {
        progressEl.classList.add('processing');
        labelEl.appendChild(el('b', null, '···'));
    } else {
        progressEl.classList.remove('processing');
        labelEl.appendChild(el('b', null, `${pct}%`));
        progressEl.querySelector('.bar').style.width = `${pct}%`;
    }
}

function hideProgress() {
    progressEl = null;
    importStatus.replaceChildren();
}

function uploadRaw(path, buffer, onUploadPct) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api' + path);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
        xhr.responseType = 'json';
        xhr.upload.addEventListener('progress', e => {
            if (e.lengthComputable) onUploadPct(Math.min(100, Math.round((e.loaded * 100) / e.total)));
        });
        xhr.addEventListener('load', () => resolve({ status: xhr.status, data: xhr.response }));
        xhr.addEventListener('error', () => reject(new Error('network')));
        xhr.send(buffer);
    });
}

function clearImport() {
    importBuffer = null;
    importOrigName = '';
    importKind = 'pptx';
    importFile.value = '';
    importFileName.textContent = '';
    setImportStatus('');
    importReport.replaceChildren();
}

async function handlePptxFile(file) {
    if (!file) return;
    const isPptx = /\.pptx$/i.test(file.name);
    const isText = /\.(md|markdown|tex)$/i.test(file.name);
    if (!isPptx && !isText) return setImportStatus('Chỉ nhận file .pptx, .md (Markdown) hoặc .tex (LaTeX beamer)', true);
    if (file.size > (isPptx ? 10 : 5) * 1024 * 1024) return setImportStatus(`File vượt quá ${isPptx ? 10 : 5}MB, hãy giảm kích cỡ rồi thử lại`, true);
    clearImport();
    importKind = isPptx ? 'pptx' : 'text';
    importOrigName = file.name;
    importFileName.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    showProgress('Đang đọc file...', 0);
    const analyzePath = isPptx ? '/import/pptx/analyze' : `/import/text/analyze?orig=${encodeURIComponent(file.name)}`;
    try {
        importBuffer = await file.arrayBuffer();
        const { status, data } = await uploadRaw(analyzePath, importBuffer, pct => {
            if (pct < 100) showProgress('Đang tải file lên HeyShow...', pct);
            else showProgress('Đã tải xong. Máy chủ đang phân tích file (có thể mất vài chục giây với file nhiều ảnh/video)...', null);
        });
        if (data && data.code === 'auth') { clearToken(); return requireLogin(); }
        if (!data || !data.success) {
            hideProgress();
            clearImport();
            setImportStatus((data && data.error) || `Không phân tích được file (lỗi ${status})`, true);
            return;
        }
        hideProgress();
        renderImportReport(data.report);
    } catch (e) {
        hideProgress();
        clearImport();
        setImportStatus('Lỗi kết nối khi phân tích', true);
    }
}

function chip(cls, text) {
    const c = el('span', 'chip' + (cls ? ' ' + cls : ''), text);
    return c;
}

function renderImportReport(report) {
    importReport.replaceChildren();
    const t = report.totals;

    const summary = el('div', 'import-summary');
    summary.appendChild(chip('ok', `📄 ${report.slideCount} slide`));
    summary.appendChild(chip('', `✏️ Import được: tiêu đề, chữ, ${report.slides.reduce((n, s) => n + s.bullets, 0)} dòng nội dung${t.notes ? `, ${t.notes} ghi chú` : ''}`));
    if (t.images) summary.appendChild(chip('bad', `🖼 ${t.images} ảnh → cần link Google Drive`));
    if (t.videos) summary.appendChild(chip('bad', `🎬 ${t.videos} video → cần link trực tiếp .mp4/.m3u8`));
    if (t.tables) summary.appendChild(chip('bad', `▦ ${t.tables} bảng không import được`));
    if (t.charts) summary.appendChild(chip('bad', `📊 ${t.charts} hình/biểu đồ không import được`));
    if (t.smartArts) summary.appendChild(chip('bad', `🧠 ${t.smartArts} SmartArt không import được`));
    importReport.appendChild(summary);

    const table = el('table', 'import-report');
    const thead = el('thead');
    const hr = el('tr');
    for (const h of ['#', 'Tiêu đề', 'Nội dung', 'Phương tiện / Vấn đề']) hr.appendChild(el('th', null, h));
    thead.appendChild(hr);
    table.appendChild(thead);
    const tbody = el('tbody');
    for (const s of report.slides) {
        const tr = el('tr');
        tr.appendChild(el('td', null, String(s.index)));
        tr.appendChild(el('td', null, s.title));
        tr.appendChild(el('td', null, s.bullets ? `${s.bullets} dòng` : '—'));
        const issues = [];
        for (const i of s.images) issues.push(`🖼 ${i}`);
        for (const v of s.videos) issues.push(`🎬 ${v}`);
        if (s.tables) issues.push(`▦ ${s.tables} bảng`);
        if (s.charts) issues.push(`📊 ${s.charts} hình/biểu đồ`);
        if (s.smartArts) issues.push(`🧠 ${s.smartArts} SmartArt`);
        if (s.hasNotes) issues.push('📝 ghi chú (import vào comment)');
        tr.appendChild(el('td', null, issues.length ? issues.join(' · ') : 'OK'));
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    importReport.appendChild(table);

    const guide = el('div', 'media-guide');
    guide.appendChild(el('p', null, 'Đối với các đối tượng không import được, HeyShow sẽ tạo sẵn chỗ trống (placeholder) trong code để bạn tự dán link vào:'));
    const lines = [
        `• 🖼 ẢNH: tải file ảnh lên Google Drive → Chia sẻ → "Bất kỳ ai có đường dẫn" → dùng link trực tiếp dạng https://lh3.googleusercontent.com/d/<ID> cho thẻ <img src="...">`,
        `• 🎬 VIDEO: lấy LINK TRỰC TIẾP tới file .mp4/.m3u8 dán vào src của thẻ <video>, hoặc dán link video Gan Jing World vào data-gjw của mẫu "Video tự dừng ở các mốc". HeyShow không hỗ trợ chèn video từ YouTube.`,
        `• ▦📊🧠 Bảng / Biểu đồ / SmartArt: gõ lại bằng HTML trong Design, hoặc mô tả cho ✨ AI trong Design để nó viết giúp.`
    ];
    for (const line of lines) guide.appendChild(el('p', null, line));
    importReport.appendChild(guide);

    const actions = el('div', 'import-actions');
    const btnImport = el('button', 'primary', `📥 Import ${report.slideCount} slide thành bản nháp`);
    btnImport.type = 'button';
    const btnCancel = el('button', 'cancel', 'Huỷ, không import');
    btnCancel.type = 'button';
    btnImport.addEventListener('click', () => doImport(btnImport));
    btnCancel.addEventListener('click', clearImport);
    actions.appendChild(btnImport);
    actions.appendChild(btnCancel);
    importReport.appendChild(actions);
}

async function doImport(btn) {
    if (!importBuffer) return;
    btn.disabled = true;
    const convertPath = importKind === 'pptx'
        ? `/import/pptx/convert?orig=${encodeURIComponent(importOrigName)}`
        : `/import/text/convert?orig=${encodeURIComponent(importOrigName)}`;
    try {
        const { status, data } = await uploadRaw(convertPath, importBuffer, pct => {
            if (pct < 100) showProgress('Đang gửi file để chuyển đổi...', pct);
            else showProgress('Đã tải xong. Máy chủ đang chuyển đổi sang slide HeyShow...', null);
        });
        if (data && data.code === 'auth') { clearToken(); return requireLogin(); }
        if (!data || !data.success) {
            hideProgress();
            setImportStatus((data && data.error) || `Lỗi chuyển đổi (lỗi ${status})`, true);
            btn.disabled = false;
            return;
        }
        hideProgress();
        importReport.replaceChildren();
        const ok = el('div', 'media-guide');
        ok.appendChild(el('p', null, `✅ Đã tạo bản nháp "${data.fileName}" (${data.slideCount} slide). Hãy mở editor để chèn link ảnh/video và chỉnh sửa.`));
        const link = el('a', null, `✏️ Mở "${data.fileName}" trong Design`);
        link.href = `/design?file=${encodeURIComponent(data.fileName)}`;
        ok.appendChild(link);
        importReport.appendChild(ok);
        showToast('Đã import xong');
        const texFile = importKind === 'text' && /\.tex$/i.test(importOrigName);
        clearBuffersAfterImport();
        await load();
        if (texFile) await offerTikzConversion(data.fileName);
    } catch (e) {
        hideProgress();
        setImportStatus('Lỗi kết nối khi import', true);
        btn.disabled = false;
    }
}

function clearBuffersAfterImport() {
    importBuffer = null;
    importOrigName = '';
    importFile.value = '';
    importFileName.textContent = '';
}

// ---------- Vẽ lại mã TikZ thành SVG, ngay sau khi import .tex ----------

// textimport nhét nguyên văn mỗi môi trường vẽ vào khối ẩn <div class="hs-tikz">.
// Khối còn nguyên khi hình vẽ lỗi nên người dùng bấm lại nút này là làm tiếp được.
const TIKZ_BLOCK = /<div class="hs-tikz" hidden>\s*<pre><code>([\s\S]*?)<\/code><\/pre>\s*<\/div>\n?/g;
const TIKZ_NOTE = /[ \t]*<!-- ⚠ Slide này có \d+ HÌNH VẼ TikZ[\s\S]*?-->\n/g;

function decodeEntities(escaped) {
    const ta = document.createElement('textarea');
    ta.innerHTML = escaped;
    return ta.value;
}

async function offerTikzConversion(fileName) {
    let content;
    try {
        content = (await get(`/api/files/${encodeURIComponent(fileName)}`)).content;
    } catch (e) {
        return; // không đọc được bản nháp thì bỏ qua, các phần khác của import vẫn nguyên
    }
    const count = (content.match(TIKZ_BLOCK) || []).length;
    if (!count) return;

    // Bộ vẽ tất định trong server lo được phần lớn hình toán mà không cần API Key.
    // AI chỉ còn là dự phòng cho cú pháp ngoài tập đó, nên danh sách nhà cung cấp là tuỳ chọn.
    let ai = null;
    try {
        ai = await get('/api/ai/providers');
    } catch (e) { /* coi như chưa có provider nào */ }
    const usable = Object.entries(ai && ai.providers ? ai.providers : {}).filter(([, p]) => p.configured);

    const panel = el('div', 'media-guide');
    panel.appendChild(el('p', null, usable.length
        ? `🪄 Bản nháp còn ${count} hình vẽ TikZ/pgfplots dưới dạng mã. HeyShow dựng lại thành SVG bằng bộ vẽ có sẵn — toạ độ tính ra con số nên đúng từng điểm; hình nào ngoài tập cú pháp mới nhờ AI.`
        : `🪄 Bản nháp còn ${count} hình vẽ TikZ/pgfplots dưới dạng mã. HeyShow dựng lại thành SVG bằng bộ vẽ có sẵn. Chưa có nhà cung cấp AI nào nên hình ngoài tập cú pháp sẽ giữ nguyên mã vẽ.`));
    const actions = el('div', 'import-actions');
    let select = null;
    if (usable.length) {
        select = el('select');
        select.style.cssText = 'font:inherit;font-size:0.92rem;padding:8px 10px;border-radius:8px;border:1px solid #fcd34d;background:#fff';
        for (const [id, provider] of usable) {
            const opt = el('option', null, `AI dự phòng: ${provider.label}`);
            opt.value = id;
            opt.selected = id === ai.default;
            select.appendChild(opt);
        }
    }
    const run = el('button', 'primary', `🪄 Vẽ lại ${count} hình`);
    run.type = 'button';
    const skip = el('button', 'cancel', 'Bỏ qua');
    skip.type = 'button';
    skip.addEventListener('click', () => panel.remove());
    run.addEventListener('click', () => runTikzConversion(fileName, panel, run, select));
    actions.append(...(select ? [select] : []), run, skip);
    panel.appendChild(actions);
    importReport.appendChild(panel);
}

async function runTikzConversion(fileName, panel, btn, select) {
    btn.disabled = true;
    let out;
    try {
        out = (await get(`/api/files/${encodeURIComponent(fileName)}`)).content;
    } catch (e) {
        fail(e);
        btn.disabled = false;
        return;
    }
    const blocks = out.match(TIKZ_BLOCK) || [];
    if (!blocks.length) {
        panel.replaceChildren(el('p', null, '✅ Bản nháp không còn mã TikZ nào — hình đã được vẽ lại đủ rồi.'));
        return;
    }
    let done = 0;
    let byAi = 0;
    let why = '';
    for (let i = 0; i < blocks.length; i++) {
        showProgress(`Đang vẽ hình ${i + 1}/${blocks.length}`, Math.round((done / blocks.length) * 100));
        try {
            const res = await post('/api/ai/tikz', {
                code: decodeEntities(/<pre><code>([\s\S]*?)<\/code>/.exec(blocks[i])[1]),
                provider: select ? select.value : undefined
            });
            // hàm thay thế chứ không chuỗi: SVG có thể chứa "$&" sẽ bị nhân bản nếu truyền thẳng
            out = out.replace(blocks[i], () => res.svg + '\n');
            if (res.engine && res.engine !== 'tikzrender') byAi++;
            done++;
        } catch (e) {
            // giữ khối ẩn cho hình lỗi để lần bấm sau còn thấy mà vẽ tiếp
            why = e.message || '';
        }
    }
    hideProgress();
    if (done === blocks.length) out = out.replace(TIKZ_NOTE, '');
    try {
        await post(`/api/files/${encodeURIComponent(fileName)}`, { content: out });
    } catch (e) {
        fail(e);
        btn.disabled = false;
        return;
    }
    const left = blocks.length - done;
    panel.replaceChildren(el('p', null, left
        ? `⚠ Vẽ được ${done}/${blocks.length} hình, còn ${left} hình chưa vẽ được${why ? ` (${why})` : ''}. Mã vẽ gốc vẫn nằm nguyên trong bản nháp — bấm "Vẽ lại" để thử tiếp hoặc đổi nhà cung cấp AI.`
        : `✅ Đã vẽ lại ${done} hình thành SVG${byAi ? `, trong đó ${byAi} hình phải nhờ AI vì mã nằm ngoài tập cú pháp bộ vẽ dựng chắc chắn được` : ''}. Mở Design để kiểm tra hình có đúng ý không.`));
    if (!left) return;
    const retry = el('div', 'import-actions');
    btn.disabled = false;
    btn.textContent = `🪄 Vẽ lại ${left} hình còn lại`;
    if (select) retry.append(select);
    retry.append(btn);
    panel.appendChild(retry);
}

importDrop.addEventListener('click', () => importFile.click());
btnPickPptx.addEventListener('click', e => { e.stopPropagation(); importFile.click(); });
importFile.addEventListener('change', () => handlePptxFile(importFile.files[0]));
importDrop.addEventListener('dragover', e => { e.preventDefault(); importDrop.classList.add('drag'); });
importDrop.addEventListener('dragleave', () => importDrop.classList.remove('drag'));
importDrop.addEventListener('drop', e => {
    e.preventDefault();
    importDrop.classList.remove('drag');
    handlePptxFile(e.dataTransfer?.files?.[0]);
});

// ---------- Sync: bản sao bài trong IndexedDB của trình duyệt ----------

const syncSection = document.getElementById('tab-sync');
const syncRows = document.getElementById('sync-rows');
const syncStatus = document.getElementById('sync-status');
const syncSummary = document.getElementById('sync-summary');
const syncOverwrite = document.getElementById('sync-overwrite');
const btnSyncPull = document.getElementById('btn-sync-pull');
const btnSyncPush = document.getElementById('btn-sync-push');
const btnSyncClear = document.getElementById('btn-sync-clear');

let localDecks = [];   // bản sao đang nằm trong trình duyệt, nạp lại mỗi lần mở tab

function setSyncStatus(text, isError) {
    syncStatus.textContent = text;
    syncStatus.className = isError ? 'error' : '';
}

function fmtBytes(bytes) {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function serverDrafts() {
    return items.filter(item => item.hasDraft);
}

// So sánh theo thời điểm: lúc tải về có ghi lại mtime của bài trên server, nên
// "server mới hơn" nghĩa là bài đó đã được sửa sau lần tải gần nhất.
function syncState(item, local) {
    if (!item) return ['local-only', 'chỉ có trong trình duyệt'];
    if (!local) return ['none', 'chưa có trong trình duyệt'];
    if (item.updatedAt > local.serverUpdatedAt) return ['server-new', 'server mới hơn — tải lại'];
    return ['synced', 'đã đồng bộ'];
}

function renderSync() {
    syncRows.replaceChildren();
    const byName = new Map(localDecks.map(d => [d.fileName, d]));
    const rows = serverDrafts().map(item => ({ item, local: byName.get(item.fileName) || null }));
    for (const deck of localDecks) {
        if (!rows.some(r => r.item && r.item.fileName === deck.fileName)) rows.push({ item: null, local: deck });
    }
    rows.sort((a, b) => (b.item ? b.item.updatedAt : b.local.savedAt) - (a.item ? a.item.updatedAt : a.local.savedAt));

    for (const row of rows) {
        const name = row.item ? row.item.fileName : row.local.fileName;
        const [cls, label] = syncState(row.item, row.local);
        const tr = el('tr');
        const title = el('td');
        title.appendChild(el('b', null, row.item ? row.item.title : name));
        // Bài chỉ còn trong trình duyệt thì tên file là tiêu đề, in lại dòng dưới chỉ thừa
        if (row.item) title.appendChild(el('div', 'avatar-hint', name));
        tr.appendChild(title);
        tr.appendChild(el('td', null, row.item ? fmtVersion(row.item.updatedAt) : '— không còn trên server —'));
        tr.appendChild(el('td', null, row.local ? `${fmtVersion(row.local.savedAt)} · ${fmtBytes(row.local.bytes)}` : '—'));
        tr.appendChild(el('td')).appendChild(el('span', `state ${cls}`, label));
        syncRows.appendChild(tr);
    }
    renderSyncSummary(rows);
}

async function renderSyncSummary(rows) {
    const bytes = localDecks.reduce((n, d) => n + (d.bytes || 0), 0);
    const est = await idbEstimate();
    syncSummary.textContent = localDecks.length
        ? `${rows.length} bài · ${localDecks.length} bản sao trong trình duyệt (${fmtBytes(bytes)})`
        + (est && est.usage ? ` · trình duyệt đang dùng ${fmtBytes(est.usage)} cho toàn bộ dữ liệu của HeyShow` : '')
        : 'Trình duyệt này chưa chứa bản sao nào của bài trình chiếu.';
}

// Chỉ đọc IndexedDB khi cần; lỗi (bị tab khác giữ, trình duyệt chặn) báo ra status chứ không ném.
async function readLocalDecks() {
    if (!idbSupported()) {
        localDecks = [];
        setSyncStatus('Trình duyệt này không có IndexedDB (chế độ ẩn danh?). Hãy dùng tab Backup để tải file .zip.', true);
        return false;
    }
    try {
        localDecks = await allDecks();
        return true;
    } catch (e) {
        localDecks = [];
        setSyncStatus(e.message || 'Không đọc được bản sao trong trình duyệt', true);
        return false;
    }
}

async function refreshSync() {
    const ok = await readLocalDecks();
    renderSync();
    if (ok) setSyncStatus(localDecks.length ? '' : 'Chưa có bản sao nào. Bấm "Tải từ server về trình duyệt" để tạo.');
}

function deckRecord(fileName, content) {
    const item = items.find(i => i.fileName === fileName);
    return {
        fileName,
        content,
        bytes: new Blob([content]).size,
        serverUpdatedAt: item ? item.updatedAt : Date.now(),
        savedAt: Date.now()
    };
}

async function pullOne(fileName) {
    const content = (await get(`/api/files/${encodeURIComponent(fileName)}`)).content;
    const deck = deckRecord(fileName, content);
    await putDeck(deck);
    return deck;
}

async function pullAll() {
    const drafts = serverDrafts();
    if (!drafts.length) return setSyncStatus('Bạn chưa có bài nào trên server để tải về.', true);
    btnSyncPull.disabled = true;
    btnSyncPush.disabled = true;
    const failed = [];
    try {
        const pulled = [];
        for (let i = 0; i < drafts.length; i++) {
            setSyncStatus(`Đang tải bài ${i + 1}/${drafts.length}: ${drafts[i].fileName}`);
            try {
                pulled.push(deckRecord(drafts[i].fileName, (await get(`/api/files/${encodeURIComponent(drafts[i].fileName)}`)).content));
            } catch (e) {
                if (e && e.status === 401) { clearToken(); return requireLogin(); }
                failed.push(drafts[i].fileName);
            }
        }
        if (pulled.length) await putDecks(pulled);
        await refreshSync();
        setSyncStatus(failed.length
            ? `⚠ Đã cất ${pulled.length} bài, ${failed.length} bài lỗi: ${failed.join(', ')}. Bấm lại để tải phần còn thiếu.`
            : `✅ Đã cất ${pulled.length} bài vào trình duyệt này.`, failed.length > 0);
        if (!failed.length) showToast('Đã tải bản sao về trình duyệt');
    } catch (e) {
        setSyncStatus(e.message || 'Không ghi được vào IndexedDB', true);
    } finally {
        btnSyncPull.disabled = false;
        btnSyncPush.disabled = false;
    }
}

// Đếm số bài theo hành động server trả về, dùng chung cho push và restore.
function summarizeEntries(entries) {
    const n = action => entries.filter(e => e.action === action).length;
    const parts = [];
    if (n('created')) parts.push(`${n('created')} bài tạo mới`);
    if (n('overwritten')) parts.push(`${n('overwritten')} bài ghi đè`);
    if (n('renamed')) parts.push(`${n('renamed')} bài trùng tên, cất thành tên khác`);
    if (n('unchanged')) parts.push(`${n('unchanged')} bài đã giống hệt nên bỏ qua`);
    return parts.length ? parts.join(' · ') : 'không có bài nào';
}

// Sau khi đẩy lên, bản sao trong trình duyệt phải được coi là khớp với server. Bài bị
// đổi tên (trùng tên) thì ngược lại: kéo bản trên server về đè lên bản cục bộ, vì nội dung
// đẩy đi đã nằm an toàn trên server dưới tên khác.
async function markPushed(entries) {
    await load();
    let touched = false;
    for (const e of entries) {
        if (e.action === 'renamed') { await pullOne(e.from); touched = true; continue; }
        const item = items.find(i => i.fileName === e.fileName);
        const local = localDecks.find(d => d.fileName === e.from);
        if (!item || !local || local.serverUpdatedAt === item.updatedAt) continue;
        local.serverUpdatedAt = item.updatedAt;
        await putDeck(local);
        touched = true;
    }
    if (touched) localDecks = await allDecks();
}

async function pushAll() {
    if (!localDecks.length) {
        return setSyncStatus('Trình duyệt chưa có bản sao nào để đẩy lên. Bấm "Tải từ server về trình duyệt" trước.', true);
    }
    btnSyncPush.disabled = true;
    btnSyncPull.disabled = true;
    setSyncStatus(`Đang đẩy ${localDecks.length} bài lên server...`);
    try {
        const out = await request('POST', '/api/backup/push', {
            body: JSON.stringify({
                overwrite: syncOverwrite.checked,
                decks: localDecks.map(d => ({ fileName: d.fileName, content: d.content }))
            }),
            raw: true,
            headers: { 'Content-Type': 'application/octet-stream' }
        });
        if (!out.ok || !out.data || !out.data.success) {
            setSyncStatus((out.data && out.data.error) || `Server từ chối (lỗi ${out.status})`, true);
            return;
        }
        await markPushed(out.data.entries);
        renderSync();
        setSyncStatus(`✅ Đẩy lên xong: ${summarizeEntries(out.data.entries)}.`);
        showToast('Đã đẩy bản sao lên server');
    } catch (e) {
        setSyncStatus(e.message || 'Lỗi kết nối khi đẩy lên server', true);
    } finally {
        btnSyncPush.disabled = false;
        btnSyncPull.disabled = false;
    }
}

btnSyncPull.addEventListener('click', () => pullAll());
btnSyncPush.addEventListener('click', () => pushAll());
btnSyncClear.addEventListener('click', async () => {
    if (!localDecks.length) return setSyncStatus('Trình duyệt không có bản sao nào để xoá.');
    if (!confirm(`Xoá ${localDecks.length} bản sao trong trình duyệt này?\n\nBài trên server không bị ảnh hưởng, và có thể tải lại bất cứ lúc nào.`)) return;
    try {
        await clearDecks();
        localDecks = [];
        renderSync();
        setSyncStatus('Đã xoá toàn bộ bản sao trong trình duyệt.');
    } catch (e) {
        setSyncStatus(e.message || 'Không xoá được bản sao', true);
    }
});

// ---------- Backup: file .zip tải về máy và phục hồi từ file ----------

const btnBackupExport = document.getElementById('btn-backup-export');
const backupStatus = document.getElementById('backup-status');
const backupReport = document.getElementById('backup-report');
const backupDrop = document.getElementById('backup-drop');
const btnPickZip = document.getElementById('btn-pick-zip');
const backupFile = document.getElementById('backup-file');
const backupZipName = document.getElementById('backup-zip-name');
const backupOverwrite = document.getElementById('backup-overwrite');
const btnBackupRestore = document.getElementById('btn-backup-restore');

const MAX_ZIP_BYTES = 60 * 1024 * 1024;   // đúng hạn mức express.raw của route restore

let zipBuffer = null;   // ArrayBuffer file .zip đã chọn, chỉ gửi lên khi bấm Phục hồi

function setBackupStatus(text, isError) {
    backupStatus.textContent = text;
    backupStatus.className = isError ? 'error' : '';
}

function clearZipPick() {
    zipBuffer = null;
    backupFile.value = '';
    backupZipName.textContent = '';
    btnBackupRestore.disabled = true;
}

async function exportBackup() {
    btnBackupExport.disabled = true;
    setBackupStatus('Máy chủ đang đóng gói toàn bộ bản nháp của bạn...');
    try {
        // zip là nhị phân nên không đi qua request()/api.js: đọc res.text() sẽ làm hỏng byte
        const res = await fetch('/api/backup/export', { headers: authHeaders() });
        if (!res.ok) {
            const msg = `Không tải được file sao lưu (lỗi ${res.status})`;
            let data = null;
            try { data = await res.json(); } catch (e) { /* server lỗi giữa chừng, trả HTML */ }
            if (data && data.code === 'auth') { clearToken(); return requireLogin(); }
            setBackupStatus((data && data.error) || msg, true);
            return;
        }
        const blob = await res.blob();
        const disp = res.headers.get('Content-Disposition') || '';
        const name = (/filename="([^"]+)"/.exec(disp) || [])[1] || 'heyshow-backup.zip';
        const a = el('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
        setBackupStatus(`✅ Đã tải về ${name} (${fmtBytes(blob.size)}). Giải nén ra là thấy thư mục drafts/ — mở từng file .html bằng trình duyệt là đọc được bài.`);
        showToast('Đã tải file sao lưu');
    } catch (e) {
        setBackupStatus('Lỗi kết nối khi tải file sao lưu', true);
    } finally {
        btnBackupExport.disabled = false;
    }
}

async function handleZipFile(file) {
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) return setBackupStatus('Chỉ nhận file .zip do HeyShow xuất ra', true);
    if (file.size > MAX_ZIP_BYTES) return setBackupStatus(`File vượt quá ${fmtBytes(MAX_ZIP_BYTES)}`, true);
    clearZipPick();
    setBackupStatus('Đang đọc file...');
    try {
        zipBuffer = await file.arrayBuffer();
    } catch (e) {
        return setBackupStatus('Không đọc được file này', true);
    }
    backupZipName.textContent = `${file.name} · ${fmtBytes(file.size)}`;
    btnBackupRestore.disabled = false;
    setBackupStatus('File đã sẵn sàng. Bấm "Phục hồi từ file đã chọn" để đưa các bài về thành bản nháp. Bài trùng tên mặc định được giữ cả hai.');
}

async function doRestore() {
    if (!zipBuffer) return;
    btnBackupRestore.disabled = true;
    setBackupStatus('Đang gửi file lên server...');
    // uploadRaw tự nối tiền tố /api, nên ở đây chỉ đưa đường đi sau /api
    const route = '/backup/restore' + (backupOverwrite.checked ? '?overwrite=1' : '');
    try {
        const { status, data } = await uploadRaw(route, zipBuffer, pct => {
            if (pct < 100) setBackupStatus(`Đang tải file lên HeyShow: ${pct}%`);
            else setBackupStatus('Đã gửi xong. Máy chủ đang giải nén và ghi bản nháp...');
        });
        if (data && data.code === 'auth') { clearToken(); return requireLogin(); }
        if (!data || !data.success) {
            setBackupStatus((data && data.error) || `Phục hồi thất bại (lỗi ${status})`, true);
            return;
        }
        renderRestoreReport(data.entries);
        setBackupStatus(`✅ ${summarizeEntries(data.entries)}. Bấm lại để phục hồi lần nữa, ví dụ với tuỳ chọn ghi đè.`);
        showToast('Đã phục hồi từ file backup');
        await load();
        if (!syncSection.classList.contains('hidden')) await refreshSync();
    } catch (e) {
        setBackupStatus('Lỗi kết nối khi phục hồi', true);
    } finally {
        // File vẫn được giữ lại sau lần phục hồi nên nút sáng trở lại, chỉ hết bấm khi chọn file khác
        btnBackupRestore.disabled = !zipBuffer;
    }
}

function renderRestoreReport(entries) {
    backupReport.replaceChildren();
    const renamed = entries.filter(e => e.action === 'renamed');
    if (!renamed.length) return;
    const box = el('div', 'media-guide');
    box.appendChild(el('p', null, 'Những bài trùng tên được cất thành tên khác để không mất bản đang có trên server:'));
    for (const e of renamed) box.appendChild(el('p', null, `• ${e.from} → ${e.fileName}`));
    box.appendChild(el('p', null, 'Muốn ghi đè thay vì tạo bản đôi, tích "Ghi đè bài trùng tên trên server" rồi phục hồi lại — bản đang có vẫn được cất vào lịch sử phiên bản.'));
    backupReport.appendChild(box);
}

btnBackupExport.addEventListener('click', () => exportBackup());
backupDrop.addEventListener('click', () => backupFile.click());
btnPickZip.addEventListener('click', e => { e.stopPropagation(); backupFile.click(); });
backupFile.addEventListener('change', () => handleZipFile(backupFile.files[0]));
backupDrop.addEventListener('dragover', e => { e.preventDefault(); backupDrop.classList.add('drag'); });
backupDrop.addEventListener('dragleave', () => backupDrop.classList.remove('drag'));
backupDrop.addEventListener('drop', e => {
    e.preventDefault();
    backupDrop.classList.remove('drag');
    handleZipFile(e.dataTransfer?.files?.[0]);
});
btnBackupRestore.addEventListener('click', doRestore);

// ---------- Modal xoá / đổi tên ----------

function openDelete(item) {
    pendingDelete = item;
    deleteMsg.textContent = `Bạn có chắc chắn muốn xoá "${item.title}" (${item.fileName})? Toàn bộ bản nháp, bản đã publish cùng lượt thích và bình luận sẽ bị xoá vĩnh viễn, không thể khôi phục.`;
    deleteOverlay.classList.remove('hidden');
}

function openRename(item) {
    pendingRename = item;
    renameOld.textContent = `Tên hiện tại: ${item.fileName}`;
    renameInput.value = item.fileName.replace(/\.html$/i, '');
    renameOverlay.classList.remove('hidden');
    renameInput.focus();
    renameInput.select();
}

document.getElementById('delete-cancel').addEventListener('click', () => {
    deleteOverlay.classList.add('hidden');
    pendingDelete = null;
});

document.getElementById('delete-confirm').addEventListener('click', async () => {
    if (!pendingDelete) return;
    const item = pendingDelete;
    deleteOverlay.classList.add('hidden');
    pendingDelete = null;
    try {
        await del(`/api/files/${encodeURIComponent(item.fileName)}`);
        showToast('Đã xoá');
        await load();
    } catch (e) {
        fail(e);
    }
});

async function doRename() {
    if (!pendingRename) return;
    const item = pendingRename;
    const raw = renameInput.value.trim();
    if (!raw) return showToast('Tên không được để trống', true);
    renameOverlay.classList.add('hidden');
    pendingRename = null;
    try {
        const data = await post(`/api/files/${encodeURIComponent(item.fileName)}/rename`, { newName: raw });
        showToast(`Đã đổi tên thành ${data.newName}`);
        await load();
    } catch (e) {
        fail(e);
    }
}

document.getElementById('rename-cancel').addEventListener('click', () => {
    renameOverlay.classList.add('hidden');
    pendingRename = null;
});
document.getElementById('rename-confirm').addEventListener('click', doRename);
renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doRename();
    if (e.key === 'Escape') { renameOverlay.classList.add('hidden'); pendingRename = null; }
});

// ---------- Modal cho phép tái sử dụng ----------

function closeReuse() {
    reuseOverlay.classList.add('hidden');
    pendingReuse = null;
}

function openReuseConfirm(item) {
    pendingReuse = item;
    const allow = !item.allowReuse;
    reuseTitle.textContent = allow ? 'Cho phép tái sử dụng' : 'Thu hồi quyền tái sử dụng';
    reuseMsg.textContent = allow
        ? `"${item.title}" sẽ có nút Reuse trong Gallery: người khác tạo được bản nháp của riêng họ từ mã nguồn bài này. Bài còn là nháp (chưa publish) thì chưa ai thấy nút đó.`
        : `Người khác sẽ không tái sử dụng "${item.title}" được nữa. Các bản đã sao chép trước đó vẫn nằm trên tài khoản của họ.`;
    reuseConfirm.textContent = allow ? 'Đồng ý, cho phép' : 'Đồng ý, thu hồi';
    reuseOverlay.classList.remove('hidden');
}

async function doReuseToggle() {
    if (!pendingReuse) return;
    const item = pendingReuse;
    const allow = !item.allowReuse;
    closeReuse();
    try {
        await post(`/api/files/${encodeURIComponent(item.fileName)}/reuse`, { allow });
        item.allowReuse = allow;
        renderItems();
        showToast(allow ? 'Đã mở khoá, bài có thể được tái sử dụng' : 'Đã khoá bài lại');
    } catch (e) {
        fail(e);
    }
}

document.getElementById('reuse-cancel').addEventListener('click', closeReuse);
reuseConfirm.addEventListener('click', doReuseToggle);
reuseOverlay.addEventListener('click', e => { if (e.target === reuseOverlay) closeReuse(); });

document.getElementById('btn-logout').addEventListener('click', () => {
    clearToken();
    location.href = '/';
});

// ---------- Tải dữ liệu ----------

async function load() {
    try {
        const data = await get('/api/dashboard');
        items = data.items;
        myUsername = data.me?.username || '';
        meAvatar.src = data.me?.avatar || '';
        meRole.textContent = data.me?.role || '';
        meRole.classList.toggle('hidden', !data.me?.role);
        renderQuota(data.quota);
        renderItems();
        renderActivity(data.activity || []);
    } catch (e) {
        fail(e);
    }
}

switchTab(localStorage.getItem(TAB_KEY) || 'presentations');
// Mở Dashboard sẵn ở tab Sync: load() chạy nền, xong thì dựng bảng so sánh với dữ liệu thật.
load().then(() => { if (!syncSection.classList.contains('hidden')) refreshSync(); });
loadProfile();
