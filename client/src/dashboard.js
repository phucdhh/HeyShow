// Dashboard 3 tab: Presentations (dropdown ⋮ cho từng bài), Activities và Profile.
import { get, post, del, request, getToken, clearToken, onUnauthorized } from './api.js';

const TAB_KEY = 'heyshow_dashboard_tab';
const TAB_NAMES = ['presentations', 'activities', 'profile', 'import'];

const itemsEl = document.getElementById('items');
const itemsEmpty = document.getElementById('items-empty');
const activityEl = document.getElementById('activity');
const activityEmpty = document.getElementById('activity-empty');
const meAvatar = document.getElementById('me-avatar');
const meName = document.getElementById('me-name');
const meRole = document.getElementById('me-role');
const toastEl = document.getElementById('toast');

const deleteOverlay = document.getElementById('delete-overlay');
const deleteMsg = document.getElementById('delete-msg');
const renameOverlay = document.getElementById('rename-overlay');
const renameOld = document.getElementById('rename-old');
const renameInput = document.getElementById('rename-input');
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
let tempAvatarBase64 = null;
let myFullName = '';
let myUsername = '';

function requireLogin() {
    location.replace(`/design?redirect=${encodeURIComponent('/dashboard')}`);
}

if (!getToken()) requireLogin();

// api.js đã xoá token; ở đây chỉ cần đưa người dùng về màn hình đăng nhập
onUnauthorized(() => requireLogin());

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
        myFullName = p.fullName || '';
        meName.textContent = myFullName || p.urlSlug || p.username;
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

function uploadPptx(path, buffer, onUploadPct) {
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
        const { status, data } = await uploadPptx(analyzePath, importBuffer, pct => {
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
    if (t.videos) summary.appendChild(chip('bad', `🎬 ${t.videos} video → cần link YouTube / Gan Jing World`));
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
        `• 🎬 VIDEO: tải lên YouTube (công khai / không liệt kê) hoặc Gan Jing World → lấy link nhúng (embed) dán vào src của thẻ <iframe>`,
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
        const { status, data } = await uploadPptx(convertPath, importBuffer, pct => {
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

// ---------- Vẽ lại mã TikZ thành SVG bằng AI, ngay sau khi import .tex ----------

// textimport nhét nguyên văn mỗi môi trường vẽ vào khối ẩn <div class="hs-tikz">.
// Khối còn nguyên khi AI trả về lỗi nên người dùng bấm lại nút này là làm tiếp được.
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

    let ai = null;
    try {
        ai = await get('/api/ai/providers');
    } catch (e) { /* coi như chưa có provider nào */ }
    const usable = Object.entries(ai && ai.providers ? ai.providers : {}).filter(([, p]) => p.configured);

    const panel = el('div', 'media-guide');
    if (!usable.length) {
        panel.appendChild(el('p', null,
            `🪄 Bản nháp còn ${count} hình vẽ TikZ/pgfplots dưới dạng mã, nhưng chưa có nhà cung cấp AI nào được cài API Key. Hãy vào trang Admin để thêm key Groq hoặc DeepSeek.`));
        importReport.appendChild(panel);
        return;
    }

    panel.appendChild(el('p', null,
        `🪄 Bản nháp còn ${count} hình vẽ TikZ/pgfplots dưới dạng mã. AI có thể đọc mã vẽ và dựng lại thành SVG.`));
    const actions = el('div', 'import-actions');
    const select = el('select');
    select.style.cssText = 'font:inherit;font-size:0.92rem;padding:8px 10px;border-radius:8px;border:1px solid #fcd34d;background:#fff';
    for (const [id, provider] of usable) {
        const opt = el('option', null, provider.label);
        opt.value = id;
        opt.selected = id === ai.default;
        select.appendChild(opt);
    }
    const run = el('button', 'primary', `🪄 Vẽ lại ${count} hình`);
    run.type = 'button';
    const skip = el('button', 'cancel', 'Bỏ qua');
    skip.type = 'button';
    skip.addEventListener('click', () => panel.remove());
    run.addEventListener('click', () => runTikzConversion(fileName, panel, run, select));
    actions.append(select, run, skip);
    panel.appendChild(actions);
    importReport.appendChild(panel);
}

async function runTikzConversion(fileName, panel, btn, select) {
    btn.disabled = true;
    const provider = select.value;
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
    let why = '';
    for (let i = 0; i < blocks.length; i++) {
        showProgress(`Đang vẽ hình ${i + 1}/${blocks.length} bằng ${select.options[select.selectedIndex].text}`,
            Math.round((done / blocks.length) * 100));
        try {
            const { svg } = await post('/api/ai/tikz', { code: decodeEntities(/<pre><code>([\s\S]*?)<\/code>/.exec(blocks[i])[1]), provider });
            // hàm thay thế chứ không chuỗi: SVG có thể chứa "$&" sẽ bị nhân bản nếu truyền thẳng
            out = out.replace(blocks[i], () => svg + '\n');
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
        ? `⚠ Vẽ được ${done}/${blocks.length} hình, còn ${left} hình chưa vẽ được${why ? ` (${why})` : ''}. Mã vẽ gốc vẫn nằm nguyên trong bản nháp — bấm "Vẽ lại" để thử tiếp hoặc đổi nhà cung cấp.`
        : `✅ Đã vẽ lại ${done} hình thành SVG. Mở Design để kiểm tra hình có đúng ý không.`));
    if (!left) return;
    const retry = el('div', 'import-actions');
    btn.disabled = false;
    btn.textContent = `🪄 Vẽ lại ${left} hình còn lại`;
    retry.append(select, btn);
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
        if (!myFullName) meName.textContent = data.me?.urlSlug || data.me?.username || '';
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
load();
loadProfile();
