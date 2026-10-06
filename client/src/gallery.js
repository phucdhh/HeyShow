const API_BASE = '/api';
const THUMB_W = 1280;
const THUMB_H = 720;

const grid = document.getElementById('gallery-grid');
const emptyEl = document.getElementById('gallery-empty');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const searchEmpty = document.getElementById('search-empty');
const pager = document.getElementById('gallery-pager');
const toastEl = document.getElementById('toast');

const meLink = document.getElementById('me-link');
const meAvatar = document.getElementById('me-avatar');
const loginLink = document.getElementById('login-link');

const overlay = document.getElementById('viewer-overlay');
const viewerFrame = document.getElementById('viewer-frame');
const btnCloseViewer = document.getElementById('btn-close-viewer');
const viewerTitle = document.getElementById('viewer-title');
const viewerAvatar = document.getElementById('viewer-avatar');
const viewerAuthorName = document.getElementById('viewer-author-name');
const viewerAuthorLink = document.getElementById('viewer-author-link');
const viewerDate = document.getElementById('viewer-date');
const statViews = document.getElementById('stat-views');
const statLikes = document.getElementById('stat-likes');
const statComments = document.getElementById('stat-comments');
const btnLike = document.getElementById('btn-like');
const viewerOpenLink = document.getElementById('viewer-open-link');
const commentList = document.getElementById('comment-list');
const commentEmpty = document.createElement('div');
const composer = document.getElementById('comment-composer');
const composerAvatar = document.getElementById('composer-avatar');
const commentInput = document.getElementById('comment-input');
const btnSendComment = document.getElementById('btn-send-comment');
const loginHint = document.getElementById('comment-login-hint');

let page = 1;
let totalPages = 1;
let query = '';
let current = null; // bài đang mở trong viewer

function getToken() {
    return localStorage.getItem('heyshow_user_token');
}

function authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

function parseJwt(token) {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
}

// ---------- KaTeX: render công thức trong bình luận + preview khi gõ ----------

let myUsername = null;

// Thứ tự quan trọng: $$ phải xét trước $
const MATH_DELIMITERS = [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
    { left: '$', right: '$', display: false }
];

function typesetMath(el) {
    if (!window.renderMathInElement) return;
    try {
        renderMathInElement(el, {
            delimiters: MATH_DELIMITERS.map(d => ({ left: d.left, right: d.right, display: d.display })),
            throwOnError: false
        });
    } catch (e) { /* công thức lỗi thì giữ nguyên text */ }
}

// Quét các công thức đã đóng cặp dấu, trả về {start, end, latex, display}
function findMathSegments(text) {
    const segs = [];
    let i = 0;
    while (i < text.length) {
        let hit = null;
        for (const d of MATH_DELIMITERS) {
            if (text.startsWith(d.left, i)) {
                const close = text.indexOf(d.right, i + d.left.length);
                if (close !== -1) { hit = { d, close }; break; }
            }
        }
        if (hit) {
            const start = i;
            const end = hit.close + hit.d.right.length;
            const latex = text.slice(i + hit.d.left.length, hit.close);
            if (latex.trim()) segs.push({ start, end, latex, display: hit.d.display });
            i = end;
        } else {
            i++;
        }
    }
    return segs;
}

function showToast(message, isError = false) {
    toastEl.textContent = message;
    toastEl.style.backgroundColor = isError ? '#dc2626' : '#16a34a';
    toastEl.style.color = '#ffffff';
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3000);
}

function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(ts) {
    return new Date(ts).toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

// ---------- Lưới cards ----------

function scaleAllThumbs() {
    for (const card of grid.querySelectorAll('.card')) {
        const box = card.querySelector('.thumb');
        const frame = card.querySelector('iframe');
        if (box && frame && box.clientWidth) {
            frame.style.transform = `scale(${box.clientWidth / THUMB_W})`;
        }
    }
}

// Thumbnail là iframe thu nhỏ của chính slide đầu, chỉ tải khi cuộn tới
const thumbObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const frame = entry.target.querySelector('iframe');
        if (frame && !frame.src) {
            frame.src = frame.dataset.src;
            frame.style.transform = `scale(${entry.target.clientWidth / THUMB_W})`;
        }
        thumbObserver.unobserve(entry.target);
    }
}, { rootMargin: '300px' });

function buildCard(item) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.key = item.key;
    card.title = item.title;

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const placeholder = document.createElement('div');
    placeholder.className = 'thumb-placeholder';
    placeholder.textContent = 'Đang tải xem trước...';
    const frame = document.createElement('iframe');
    frame.dataset.src = `${item.url}?embed=1`;
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.addEventListener('load', () => placeholder.remove());
    thumb.append(placeholder, frame);
    thumbObserver.observe(thumb);

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = item.title;

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const authorLink = document.createElement('a');
    authorLink.className = 'author-link';
    authorLink.href = `/${encodeURIComponent(item.author.urlSlug)}/`;
    authorLink.title = 'Xem trang cá nhân';
    // Bấm vào tác giả thì đi tới trang riêng, không mở viewer của card
    authorLink.addEventListener('click', e => e.stopPropagation());
    const avatar = document.createElement('img');
    avatar.src = item.author.avatar;
    avatar.alt = '';
    const author = document.createElement('span');
    author.className = 'author';
    author.textContent = item.author.urlSlug;
    authorLink.append(avatar, author);
    meta.append(authorLink);

    const stats = document.createElement('div');
    stats.className = 'card-stats';
    const views = document.createElement('span');
    views.textContent = `👁 ${item.views}`;
    views.title = 'Lượt xem';
    const likes = document.createElement('span');
    likes.textContent = `♡ ${item.likes}`;
    likes.title = 'Lượt thích';
    const comments = document.createElement('span');
    comments.textContent = `💬 ${item.commentCount}`;
    comments.title = 'Bình luận';
    const date = document.createElement('span');
    date.className = 'card-date';
    date.textContent = fmtDate(item.createdAt);
    stats.append(views, likes, comments, date);

    body.append(title, meta, stats);
    card.append(thumb, body);

    card.addEventListener('click', () => {
        location.hash = `#/p/${encodeURIComponent(item.user)}/${encodeURIComponent(item.fileName)}`;
    });

    return card;
}

async function loadGallery(targetPage = 1, q = '') {
    const params = new URLSearchParams({ page: String(targetPage) });
    if (q) params.set('q', q);
    try {
        const res = await fetch(`${API_BASE}/gallery?${params}`, { headers: authHeaders() });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        page = data.page;
        totalPages = data.totalPages;
        query = q;

        grid.innerHTML = '';
        for (const item of data.items) grid.appendChild(buildCard(item));
        scaleAllThumbs();
        renderPager();

        if (data.total === 0 && q) {
            searchEmpty.textContent = `Không tìm thấy bài nào khớp với “${q}”.`;
            searchEmpty.classList.remove('hidden');
        } else {
            searchEmpty.classList.add('hidden');
        }
        emptyEl.classList.toggle('hidden', !(data.total === 0 && !q));
    } catch (e) {
        emptyEl.textContent = 'Không tải được thư viện. Vui lòng thử lại sau.';
        emptyEl.classList.remove('hidden');
    }
}

// Dãy số trang hiển thị: luôn giữ hai đầu và các trang kề trang hiện tại
function pagerWindow(currentPage, total) {
    const out = [];
    for (let p = 1; p <= total; p++) {
        if (p === 1 || p === total || Math.abs(p - currentPage) <= 1) out.push(p);
        else if (out[out.length - 1] !== '…') out.push('…');
    }
    return out;
}

function renderPager() {
    pager.innerHTML = '';
    if (totalPages <= 1) {
        pager.classList.add('hidden');
        return;
    }
    pager.classList.remove('hidden');

    const mkButton = (label, target, { disabled = false, active = false, title = '' } = {}) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        if (title) b.title = title;
        b.disabled = disabled;
        if (active) {
            b.classList.add('active');
            b.setAttribute('aria-current', 'page');
        } else if (!disabled) {
            b.addEventListener('click', () => goToPage(target));
        }
        return b;
    };

    pager.append(mkButton('‹', page - 1, { disabled: page <= 1, title: 'Trang trước' }));
    for (const p of pagerWindow(page, totalPages)) {
        if (p === '…') {
            const ell = document.createElement('span');
            ell.className = 'pager-ellipsis';
            ell.textContent = '…';
            pager.append(ell);
        } else {
            pager.append(mkButton(String(p), p, { active: p === page }));
        }
    }
    pager.append(mkButton('›', page + 1, { disabled: page >= totalPages, title: 'Trang sau' }));
}

function goToPage(target) {
    if (target === page || target < 1 || target > totalPages) return;
    loadGallery(target, query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Debounce để không bắn request liên tục khi gõ
let searchTimer = null;
searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    searchClear.classList.toggle('hidden', !q);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadGallery(1, q), 300);
});
searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.add('hidden');
    clearTimeout(searchTimer);
    loadGallery(1, '');
    searchInput.focus();
});

window.addEventListener('resize', scaleAllThumbs);

// ---------- Viewer 2 panel ----------

function renderComment(comment) {
    const row = document.createElement('div');
    row.className = 'comment';
    row.dataset.id = comment.id;

    const profileHref = `/${encodeURIComponent(comment.author.urlSlug)}/`;
    const avatarLink = document.createElement('a');
    avatarLink.className = 'comment-avatar-link';
    avatarLink.href = profileHref;
    const avatar = document.createElement('img');
    avatar.src = comment.author.avatar;
    avatar.alt = '';
    avatarLink.append(avatar);

    const wrap = document.createElement('div');
    const bubble = document.createElement('div');
    bubble.className = 'comment-bubble';
    const name = document.createElement('a');
    name.className = 'name';
    name.href = profileHref;
    name.textContent = comment.author.urlSlug;
    const text = document.createElement('div');
    text.className = 'text';
    text.textContent = comment.text;
    typesetMath(text);
    bubble.append(name, text);

    const time = document.createElement('div');
    time.className = 'comment-time';
    time.textContent = fmtDateTime(comment.at);

    wrap.append(bubble, time);

    if (comment.editedAt) {
        const edited = document.createElement('div');
        edited.className = 'comment-edited';
        edited.textContent = 'đã sửa';
        wrap.append(edited);
    }

    if (myUsername && comment.author.username === myUsername) {
        const actions = document.createElement('div');
        actions.className = 'comment-actions';
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Sửa';
        editBtn.addEventListener('click', () => startEditComment(row, comment, text));
        actions.append(editBtn);
        wrap.append(actions);
    }

    row.append(avatarLink, wrap);
    return row;
}

function startEditComment(row, comment, textEl) {
    if (row.querySelector('.comment-edit-box')) return;
    const bubble = textEl.closest('.comment-bubble');

    const box = document.createElement('div');
    box.className = 'comment-edit-box';
    const ta = document.createElement('textarea');
    ta.value = comment.text;
    ta.maxLength = 2000;
    const btns = document.createElement('div');
    btns.className = 'comment-edit-btns';
    const save = document.createElement('button');
    save.className = 'save';
    save.textContent = 'Lưu';
    const cancel = document.createElement('button');
    cancel.className = 'cancel';
    cancel.textContent = 'Huỷ';
    btns.append(save, cancel);
    box.append(ta, btns);

    textEl.style.display = 'none';
    bubble.append(box);
    ta.focus();

    cancel.addEventListener('click', () => { box.remove(); textEl.style.display = ''; });
    save.addEventListener('click', async () => {
        const newText = ta.value.trim();
        if (!newText) return showToast('Bình luận không được để trống', true);
        save.disabled = true;
        try {
            const { user, fileName } = current;
            const res = await fetch(`${API_BASE}/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}/comments/${encodeURIComponent(comment.id)}`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ text: newText })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            row.replaceWith(renderComment(data.comment));
        } catch (e) {
            showToast(e.message || 'Không sửa được bình luận', true);
            save.disabled = false;
        }
    });
}

function renderComments(comments) {
    commentList.innerHTML = '';
    if (!comments.length) {
        commentList.appendChild(commentEmpty);
        return;
    }
    for (const c of comments) commentList.appendChild(renderComment(c));
    commentList.scrollTop = commentList.scrollHeight;
}

function applyPresentationMeta(p) {
    viewerTitle.textContent = p.title;
    viewerAvatar.src = p.author.avatar;
    viewerAuthorName.textContent = p.author.urlSlug;
    viewerAuthorLink.href = `/${encodeURIComponent(p.author.urlSlug)}/`;
    viewerDate.textContent = `Đăng ngày ${fmtDate(p.createdAt)}`;
    statViews.textContent = p.views;
    statLikes.textContent = p.likes;
    statComments.textContent = p.comments.length;
    btnLike.classList.toggle('liked', p.likedByMe);
    btnLike.firstChild.textContent = p.likedByMe ? '♥ ' : '♡ ';
    viewerOpenLink.href = p.url;
    renderComments(p.comments);
}

async function openViewer(user, fileName) {
    const key = `${user}/${fileName}`;
    if (current && current.key === key) return;

    current = { key, user, fileName, presentation: null };
    overlay.classList.remove('hidden');
    viewerFrame.src = `/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}`;

    try {
        const res = await fetch(`${API_BASE}/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}`, { headers: authHeaders() });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        if (!current || current.key !== key) return; // đã đóng/đổi bài trong lúc tải
        current.presentation = data.presentation;
        applyPresentationMeta(data.presentation);
    } catch (e) {
        viewerTitle.textContent = 'Không tải được thông tin bài trình chiếu.';
    }
}

function closeViewer() {
    current = null;
    overlay.classList.add('hidden');
    viewerFrame.src = 'about:blank';
}

// Khi iframe trình chiếu tải xong thì lượt xem đã được server cộng -> làm mới số liệu
viewerFrame.addEventListener('load', async () => {
    if (!current) return;
    const { user, fileName, key } = current;
    try {
        const res = await fetch(`${API_BASE}/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}`, { headers: authHeaders() });
        const data = await res.json();
        if (data.success && current && current.key === key) {
            current.presentation = data.presentation;
            applyPresentationMeta(data.presentation);
        }
    } catch (e) { /* giữ số liệu cũ */ }
});

btnCloseViewer.addEventListener('click', () => { location.hash = ''; });

btnLike.addEventListener('click', async () => {
    if (!getToken()) return showToast('Hãy đăng nhập để thích bài này', true);
    if (!current) return;
    const { user, fileName } = current;
    try {
        const res = await fetch(`${API_BASE}/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}/like`, {
            method: 'POST',
            headers: authHeaders()
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        statLikes.textContent = data.likes;
        btnLike.classList.toggle('liked', data.likedByMe);
        btnLike.firstChild.textContent = data.likedByMe ? '♥ ' : '♡ ';
    } catch (e) {
        showToast('Không gửi được lượt thích', true);
    }
});

btnSendComment.addEventListener('click', sendComment);
commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendComment();
    }
});

async function sendComment() {
    if (!getToken()) return showToast('Hãy đăng nhập để bình luận', true);
    if (!current) return;
    const text = commentInput.value.trim();
    if (!text) return;

    btnSendComment.disabled = true;
    try {
        const { user, fileName } = current;
        const res = await fetch(`${API_BASE}/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}/comments`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        commentInput.value = '';
        syncMathMirror();
        hideMathTooltip();
        if (commentEmpty.parentNode === commentList) commentEmpty.remove();
        commentList.appendChild(renderComment(data.comment));
        commentList.scrollTop = commentList.scrollHeight;
        statComments.textContent = Number(statComments.textContent) + 1;
    } catch (e) {
        showToast(e.message || 'Không gửi được bình luận', true);
    } finally {
        btnSendComment.disabled = false;
    }
}

// ---------- Live preview KaTeX khi rê chuột vào công thức đang gõ ----------

const mathTooltip = document.getElementById('math-tooltip');
const mathMirror = document.createElement('div');
let mirrorSegs = [];

mathMirror.style.position = 'fixed';
mathMirror.style.left = '-99999px';
mathMirror.style.top = '0';
mathMirror.style.visibility = 'hidden';
mathMirror.style.whiteSpace = 'pre-wrap';
mathMirror.style.overflowWrap = 'break-word';
mathMirror.style.wordBreak = 'normal';
mathMirror.style.boxSizing = 'border-box';
document.body.appendChild(mathMirror);

// Sao chép style chữ + bề rộng để mirror xuống dòng y hệt textarea
function copyTextareaStyle() {
    const cs = getComputedStyle(commentInput);
    for (const prop of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
        'lineHeight', 'textTransform', 'wordSpacing',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) {
        mathMirror.style[prop] = cs[prop];
    }
    mathMirror.style.width = commentInput.clientWidth + 'px';
}

// Dựng lại mirror, bọc mỗi công thức đã đóng cặp dấu vào một <span> để đo toạ độ
function syncMathMirror() {
    copyTextareaStyle();
    mathMirror.textContent = '';
    mirrorSegs = [];
    const value = commentInput.value;
    let cursor = 0;
    for (const seg of findMathSegments(value)) {
        if (seg.start > cursor) mathMirror.appendChild(document.createTextNode(value.slice(cursor, seg.start)));
        const span = document.createElement('span');
        span.textContent = value.slice(seg.start, seg.end);
        mathMirror.appendChild(span);
        mirrorSegs.push({ span, latex: seg.latex, display: seg.display });
        cursor = seg.end;
    }
    if (cursor < value.length) mathMirror.appendChild(document.createTextNode(value.slice(cursor)));
}

function hideMathTooltip() {
    mathTooltip.classList.remove('show');
}

function showMathTooltip(latex, display, clientX, clientY) {
    if (!window.katex) return;
    try {
        mathTooltip.innerHTML = katex.renderToString(latex, { displayMode: display, throwOnError: false });
    } catch (e) {
        mathTooltip.textContent = latex;
    }
    mathTooltip.classList.add('show');
    const pad = 14;
    const tw = mathTooltip.offsetWidth, th = mathTooltip.offsetHeight;
    let left = clientX + pad, top = clientY + pad;
    if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;
    if (top + th > window.innerHeight - 8) top = clientY - th - pad;
    mathTooltip.style.left = Math.max(8, left) + 'px';
    mathTooltip.style.top = Math.max(8, top) + 'px';
}

commentInput.addEventListener('input', () => { syncMathMirror(); hideMathTooltip(); });
commentInput.addEventListener('scroll', hideMathTooltip);
commentInput.addEventListener('mouseleave', hideMathTooltip);
commentInput.addEventListener('blur', hideMathTooltip);

commentInput.addEventListener('mousemove', (e) => {
    if (!mirrorSegs.length) { hideMathTooltip(); return; }
    copyTextareaStyle();
    const cs = getComputedStyle(commentInput);
    const rect = commentInput.getBoundingClientRect();
    const borderL = parseFloat(cs.borderLeftWidth) || 0;
    const borderT = parseFloat(cs.borderTopWidth) || 0;
    const mouseX = e.clientX - rect.left - borderL;
    const mouseY = e.clientY - rect.top - borderT + commentInput.scrollTop;

    const mRect = mathMirror.getBoundingClientRect();
    let found = null;
    for (const seg of mirrorSegs) {
        const r = seg.span.getBoundingClientRect();
        const l = r.left - mRect.left, t = r.top - mRect.top;
        if (mouseX >= l && mouseX <= l + r.width && mouseY >= t && mouseY <= t + r.height) {
            found = seg;
            break;
        }
    }
    if (found) showMathTooltip(found.latex, found.display, e.clientX, e.clientY);
    else hideMathTooltip();
});

// ---------- Định tuyến bằng hash để link viewer chia sẻ được ----------

// Trỏ các link "Đăng nhập" về trang biên tập (nơi có màn hình đăng nhập) kèm redirect trở lại đúng chỗ hiện tại.
function updateLoginRedirect() {
    const back = location.pathname + location.hash;
    const href = '/design?redirect=' + encodeURIComponent(back);
    loginLink.setAttribute('href', href);
    const hintLink = loginHint.querySelector('a');
    if (hintLink) hintLink.setAttribute('href', href);
}

function syncFromHash() {
    updateLoginRedirect();
    const match = location.hash.match(/^#\/p\/([^/]+)\/([^/]+)$/);
    if (!match) {
        if (current) closeViewer();
        return;
    }
    openViewer(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
}

window.addEventListener('hashchange', syncFromHash);

// ---------- Trạng thái đăng nhập trên header ----------

function setGuestState() {
    localStorage.removeItem('heyshow_user_token');
    myUsername = null;
    meLink.classList.add('hidden');
    loginLink.classList.remove('hidden');
    composer.classList.add('hidden');
    loginHint.classList.remove('hidden');
}

async function initMe() {
    const token = getToken();
    if (!token) return setGuestState();
    const payload = parseJwt(token);
    if (!payload?.username) return setGuestState();
    try {
        const res = await fetch(`${API_BASE}/user/profile`, { headers: authHeaders() });
        const data = await res.json();
        if (data.success) {
            myUsername = payload.username;
            meAvatar.src = data.profile.avatar;
            composerAvatar.src = data.profile.avatar;
            meLink.classList.remove('hidden');
            loginLink.classList.add('hidden');
            composer.classList.remove('hidden');
            loginHint.classList.add('hidden');
        } else {
            // Token hết hạn/không hợp lệ (vd. sau khi server đổi JWT secret):
            // trả về trạng thái khách để còn thấy gợi ý đăng nhập.
            setGuestState();
        }
    } catch (e) {
        setGuestState();
    }
}

commentEmpty.id = 'comment-empty';
commentEmpty.textContent = 'Chưa có bình luận nào. Hãy là người đầu tiên!';

initMe();
loadGallery();
syncFromHash();
