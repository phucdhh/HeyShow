import { get, post, patch, del, getToken, tokenPayload, onUnauthorized, isAuthed } from './api.js';

const THUMB_W = 1280;

const grid = document.getElementById('gallery-grid');
const emptyEl = document.getElementById('gallery-empty');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const searchEmpty = document.getElementById('search-empty');
const feedEl = document.getElementById('gallery-feed');
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
const statShares = document.getElementById('stat-shares');
const btnShare = document.getElementById('btn-share');
const shareOverlay = document.getElementById('share-dialog-overlay');
const btnCloseShare = document.getElementById('btn-close-share');
const shareChannels = document.getElementById('share-channels');
const shareLinkInput = document.getElementById('share-link-input');
const btnCopyLink = document.getElementById('btn-copy-link');
const commentList = document.getElementById('comment-list');
const commentEmpty = document.createElement('div');
const composer = document.getElementById('comment-composer');
const composerAvatar = document.getElementById('composer-avatar');
const commentInput = document.getElementById('comment-input');
const btnSendComment = document.getElementById('btn-send-comment');
const loginHint = document.getElementById('comment-login-hint');

let page = 0; // trang đã nạp xong, 0 là lưới còn trống
let totalPages = 1;
let total = 0;
let query = '';
let feedLoading = false;
let feedFailed = false;
// Mỗi lần tìm kiếm tăng lên: kết quả của request cũ đang chờ phải bị bỏ, nếu không
// bài của từ khóa cũ sẽ nối vào lưới của từ khóa mới.
let feedGeneration = 0;
const seenKeys = new Set(); // bài mới publish chen giữa hai trang có thể lặp lại ở trang sau
let current = null; // bài đang mở trong viewer
let canModerate = false; // chủ bài hoặc admin: được gỡ bình luận của người khác

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

function scaleThumb(card) {
    const box = card.querySelector('.thumb');
    const frame = card.querySelector('iframe');
    if (box && frame && box.clientWidth) {
        frame.style.transform = `scale(${box.clientWidth / THUMB_W})`;
    }
}

function scaleAllThumbs() {
    for (const card of grid.querySelectorAll('.card')) scaleThumb(card);
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
    const shares = document.createElement('span');
    shares.title = 'Lượt chia sẻ';
    // Cùng một biểu tượng với nút Share trong viewer — ký tự "↗" trông như mũi tên đi ra
    // chứ không phải chia sẻ, và hai chỗ cạnh nhau mà hai hình khác nhau rất chướng.
    shares.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"></line><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line></svg>`;
    shares.append(` ${item.shares || 0}`);
    const date = document.createElement('span');
    date.className = 'card-date';
    date.textContent = fmtDate(item.createdAt);
    stats.append(views, likes, comments, shares, date);

    body.append(title, meta, stats);
    card.append(thumb, body);

    card.addEventListener('click', () => {
        location.hash = `#/p/${encodeURIComponent(item.user)}/${encodeURIComponent(item.fileName)}`;
    });

    return card;
}

// Nối một trang cards vào lưới. Bỏ bài đã hiện: giữa hai lần gọi API, bài vừa publish
// hoặc vừa sửa trôi lên đầu danh sách nên trang sau có thể lặp lại trang trước.
function appendItems(items) {
    const added = [];
    for (const item of items) {
        if (seenKeys.has(item.key)) continue;
        seenKeys.add(item.key);
        const card = buildCard(item);
        grid.appendChild(card);
        added.push(card);
    }
    // Thụt lề card mới vào đúng cỡ cột đang hiển thị
    for (const card of added) scaleThumb(card);
}

function renderEmptyState() {
    if (total === 0 && query) {
        searchEmpty.textContent = `Không tìm thấy bài nào khớp với “${query}”.`;
        searchEmpty.classList.remove('hidden');
        emptyEl.classList.add('hidden');
        return;
    }
    searchEmpty.classList.add('hidden');
    emptyEl.classList.toggle('hidden', total !== 0);
}

// Dòng dưới lưới: đang nạp trang kế, hết bài, hay hỏng giữa chừng
function renderFeed() {
    feedEl.innerHTML = '';
    if (total === 0) return; // lưới trống đã có #gallery-empty / #search-empty nói
    if (feedLoading) {
        const spinner = document.createElement('span');
        spinner.className = 'feed-spinner';
        spinner.setAttribute('aria-hidden', 'true');
        feedEl.append(spinner, 'Đang tải thêm…');
        return;
    }
    if (feedFailed) {
        const note = document.createElement('span');
        note.textContent = 'Không tải được các bài tiếp theo.';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.textContent = 'Thử lại';
        retry.addEventListener('click', loadFeed);
        feedEl.append(note, retry);
        return;
    }
    if (page >= totalPages && totalPages > 1) {
        feedEl.append(`Bạn đã xem hết ${total} bài.`);
    }
}

// Nạp trang kế tiếp.
async function loadFeed() {
    if (feedLoading || page >= totalPages) return;
    feedFailed = false;
    feedLoading = true;
    const gen = feedGeneration;
    const params = new URLSearchParams({ page: String(page + 1) });
    if (query) params.set('q', query);
    try {
        const data = await get(`/api/gallery?${params}`);
        if (gen === feedGeneration) {
            page = data.page;
            totalPages = data.totalPages;
            total = data.total;
            appendItems(data.items);
            renderEmptyState();
        }
    } catch (e) {
        if (gen === feedGeneration) {
            feedFailed = true;
            // Trang đầu hỏng nên lưới còn trống: nói rõ là lỗi mạng, đừng để hiểu nhầm là kho bài rỗng
            if (page === 0) {
                emptyEl.textContent = 'Không tải được thư viện. Vui lòng thử lại sau.';
                emptyEl.classList.remove('hidden');
            }
        }
    }
    // Một lần tìm kiếm mới đã chiếm quyền: bỏ kết quả cũ, đừng đụng cờ của vòng mới
    if (gen !== feedGeneration) return;
    feedLoading = false;
    renderFeed();
    // Cards mới có thể vẫn chưa lấp kín màn hình, mà observer chỉ báo khi trạng thái cắt
    // nhau thay đổi — cho nó thấy lại sentinel để vòng nạp kế tiếp tự nổ.
    feedObserver.unobserve(feedEl);
    feedObserver.observe(feedEl);
}

// Xóa lưới và bắt đầu lại từ trang 1 (đầu phiên, hoặc khi đổi từ khóa tìm kiếm)
function resetFeed(q) {
    feedGeneration++;
    query = q;
    page = 0;
    totalPages = 1;
    total = 0;
    feedLoading = false; // request còn đang chờ sẽ bị bỏ nhờ gen đổi
    feedFailed = false;
    seenKeys.clear();
    grid.innerHTML = '';
    emptyEl.textContent = 'Chưa có bài trình chiếu nào được xuất bản.';
    emptyEl.classList.add('hidden');
    searchEmpty.classList.add('hidden');
    feedEl.innerHTML = '';
}

function startFeed(q) {
    const scrolled = window.scrollY > 0;
    resetFeed(q);
    loadFeed();
    if (scrolled) window.scrollTo({ top: 0 });
}

// Cuộn tới gần cuối lưới là nạp trang kế; 700px để thumbnail kịp tải, người dùng không
// thấy khoảng trống. Trang lỗi thì đừng tự thử lại — sentinel vẫn nằm trong tầm nhìn nên
// observer sẽ gọi dồn dập vào một API đang có sự cố; người dùng phải bấm "Thử lại".
// Sentinel cũng không được ẩn bằng .hidden: observer không bao giờ cắt phần tử display:none.
const feedObserver = new IntersectionObserver((entries) => {
    if (feedFailed) return;
    if (entries.some(e => e.isIntersecting)) loadFeed();
}, { rootMargin: '700px 0px' });
feedObserver.observe(feedEl);

// Debounce để không bắn request liên tục khi gõ
let searchTimer = null;
searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    searchClear.classList.toggle('hidden', !q);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => startFeed(q), 300);
});
searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.add('hidden');
    clearTimeout(searchTimer);
    startFeed('');
    searchInput.focus();
});

window.addEventListener('resize', scaleAllThumbs);

// ---------- Viewer 2 panel ----------

// Một bình luận: hoặc chủ đề (isReply=false) hoặc phản hồi bên trong chủ đề.
// Quyền hiển thị nút: tác giả tự sửa/xóa; chủ bài và admin (canModerate) chỉ xóa.
function renderComment(comment, { isReply = false } = {}) {
    const row = document.createElement('div');
    row.className = isReply ? 'comment reply' : 'comment';
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
    wrap.className = 'wrap';
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

    const isMine = myUsername && comment.author.username === myUsername;
    const actions = document.createElement('div');
    actions.className = 'comment-actions';
    if (isMine) {
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.textContent = 'Sửa';
        editBtn.addEventListener('click', () => startEditComment(row, comment, text));
        actions.append(editBtn);
    }
    if (isMine || canModerate) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'danger';
        delBtn.textContent = 'Xóa';
        delBtn.addEventListener('click', () => deleteComment(comment, delBtn));
        actions.append(delBtn);
    }
    // Chỉ trả lời bình luận gốc: server cũng chặn lồng hai cấp
    if (!isReply && myUsername) {
        const replyBtn = document.createElement('button');
        replyBtn.type = 'button';
        replyBtn.textContent = 'Trả lời';
        replyBtn.addEventListener('click', () => openReplyBox(comment, row));
        actions.append(replyBtn);
    }
    if (actions.childNodes.length) wrap.append(actions);

    row.append(avatarLink, wrap);
    return row;
}

// Ô trả lời mở ngay dưới bình luận gốc đang được trả lời
function openReplyBox(comment, row) {
    const existing = row.querySelector(':scope > .wrap > .reply-box');
    if (existing) { existing.remove(); return; } // bấm lần hai để đóng

    const box = document.createElement('div');
    box.className = 'reply-box';
    const ta = document.createElement('textarea');
    ta.placeholder = `Trả lời ${comment.author.urlSlug}…`;
    ta.maxLength = 2000;
    ta.rows = 2;
    const btns = document.createElement('div');
    btns.className = 'comment-edit-btns';
    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'save';
    send.textContent = 'Gửi';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'cancel';
    cancel.textContent = 'Huỷ';
    btns.append(send, cancel);
    box.append(ta, btns);
    row.querySelector(':scope > .wrap').append(box);
    ta.focus();

    cancel.addEventListener('click', () => box.remove());
    ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send.click(); }
    });
    send.addEventListener('click', async () => {
        const text = ta.value.trim();
        if (!text) return showToast('Nội dung trả lời không được để trống', true);
        send.disabled = true;
        try {
            const { user, fileName } = current;
            await post(`/api/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}/comments`, {
                text, parentId: comment.id
            });
            box.remove();
            await refreshPresentation();
        } catch (e) {
            showToast(e.message || 'Không gửi được trả lời', true);
            send.disabled = false;
        }
    });
}

async function deleteComment(comment, btn) {
    if (!confirm('Xóa bình luận này? Các phản hồi bên trong cũng bị ẩn theo.')) return;
    btn.disabled = true;
    try {
        const { user, fileName } = current;
        await del(`/api/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}/comments/${encodeURIComponent(comment.id)}`);
        await refreshPresentation();
    } catch (e) {
        showToast(e.message || 'Không xóa được bình luận', true);
        btn.disabled = false;
    }
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
            await patch(`/api/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}/comments/${encodeURIComponent(comment.id)}`, { text: newText });
            await refreshPresentation();
            box.remove();
        } catch (e) {
            showToast(e.message || 'Không sửa được bình luận', true);
            save.disabled = false;
        }
    });
}

// Chủ đề kiểu Facebook: bình luận gốc, phản hồi lồng bên dưới, mới nhất ở cuối
function renderThreads(threads) {
    commentList.innerHTML = '';
    const total = threads.reduce((n, t) => n + 1 + (t.replies ? t.replies.length : 0), 0);
    if (!total) {
        commentList.appendChild(commentEmpty);
        return;
    }
    for (const thread of threads) {
        const row = renderComment(thread);
        const box = document.createElement('div');
        box.className = 'replies';
        for (const reply of thread.replies || []) box.appendChild(renderComment(reply, { isReply: true }));
        row.querySelector(':scope > .wrap').append(box);
        commentList.appendChild(row);
    }
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
    statShares.textContent = p.shares || 0;
    btnLike.classList.toggle('liked', p.likedByMe);
    btnLike.firstChild.textContent = p.likedByMe ? '♥ ' : '♡ ';
    canModerate = Boolean(p.canModerate);
    renderThreads(p.threads || []);
}

// Tải lại số liệu + bình luận sau mỗi thao tác: đơn giản và luôn khớp với server
async function refreshPresentation() {
    if (!current) return;
    const { user, fileName, key } = current;
    try {
        const data = await get(`/api/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}`);
        if (!current || current.key !== key) return;
        current.presentation = data.presentation;
        applyPresentationMeta(data.presentation);
    } catch (e) { /* giữ liệu cũ nếu mạng trục trặc */ }
}

async function openViewer(user, fileName) {
    const key = `${user}/${fileName}`;
    if (current && current.key === key) return;

    current = { key, user, fileName, presentation: null };
    overlay.classList.remove('hidden');
    // /show/ là đường dẫn chính (slide chạy trong CSP sandbox); resolveSlugDir
    // chấp nhận cả login name lẫn urlSlug nên đoạn slug ở đây dùng được user
    viewerFrame.src = `/show/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}`;

    try {
        const data = await get(`/api/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}`);
        if (!current || current.key !== key) return; // đã đóng/đổi bài trong lúc tải
        current.presentation = data.presentation;
        applyPresentationMeta(data.presentation);
    } catch (e) {
        viewerTitle.textContent = 'Không tải được thông tin bài trình chiếu.';
    }
}

function closeViewer() {
    if (document.fullscreenElement === viewerFrame) document.exitFullscreen().catch(() => {});
    current = null;
    overlay.classList.add('hidden');
    viewerFrame.src = 'about:blank';
    closeShareDialog();
}

// Khi iframe trình chiếu tải xong thì lượt xem đã được server cộng -> làm mới số liệu
viewerFrame.addEventListener('load', () => refreshPresentation());

// Nút Full Screen nằm TRONG bài, tức là trong iframe. Trang bài chịu CSP sandbox nên
// origin của nó là "null", và Chrome từ chối requestFullscreen do chính trang đó gọi —
// đo rồi, kể cả khi iframe có allow="fullscreen". Phần tử duy nhất fullscreen được lúc
// này là cái iframe, mà chỉ trang cha mới gọi được: bài gửi 'heyshow-fs' lên đây, gallery
// tự bấm hộ.
function tellSlideFrame(message) {
    try { viewerFrame.contentWindow?.postMessage(message, '*'); } catch (e) { /* iframe đã đóng */ }
}

window.addEventListener('message', (e) => {
    if (e.data !== 'heyshow-fs' || e.source !== viewerFrame.contentWindow) return;
    if (document.fullscreenElement === viewerFrame) {
        // Bấm lần thứ hai là thoát — trong iframe thì fullscreenchange không nổ nên nút
        // không tự biết, phải để trang này xử lý.
        document.exitFullscreen().catch(() => {});
        return;
    }
    viewerFrame.requestFullscreen().catch(() => { tellSlideFrame('heyshow-fs-off'); });
});

// Tài liệu trong iframe không có fullscreenchange khi chính cái iframe fullscreen, nên
// nhãn "Exit"/"Full Screen" của nút phải do trang này gửi xuống.
document.addEventListener('fullscreenchange', () => {
    tellSlideFrame(document.fullscreenElement === viewerFrame ? 'heyshow-fs-on' : 'heyshow-fs-off');
});

btnCloseViewer.addEventListener('click', () => { location.hash = ''; });

btnLike.addEventListener('click', async () => {
    if (!isAuthed()) return showToast('Hãy đăng nhập để thích bài này', true);
    if (!current) return;
    const { user, fileName } = current;
    try {
        const data = await post(`/api/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}/like`);
        statLikes.textContent = data.likes;
        btnLike.classList.toggle('liked', data.likedByMe);
        btnLike.firstChild.textContent = data.likedByMe ? '♥ ' : '♡ ';
    } catch (e) {
        showToast(e.message || 'Không gửi được lượt thích', true);
    }
});

// ---------- Hộp thoại Share to ----------

// URL tuyệt đối để dán vào intent của mạng xã hội (p.url chỉ là đường dẫn /show/...)
function shareUrl() {
    if (!current || !current.presentation) return '';
    return new URL(current.presentation.url, location.origin).href;
}

// Mỗi mạng một khuôn link: Facebook và X có trang composer công khai nhận tham số
// URL; Gan Jing World không mở endpoint chia sẻ nào nên đưa người xem tới trang chủ
// để họ tự dán link vào Post.
function channelShareUrl(channel) {
    const url = shareUrl();
    const text = `${current.presentation.title} — HeyShow`;
    if (channel === 'facebook') {
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    }
    if (channel === 'x') {
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    }
    return 'https://www.ganjingworld.com/';
}

function openShareDialog() {
    if (!current || !current.presentation) return;
    shareLinkInput.value = shareUrl();
    shareOverlay.classList.remove('hidden');
}

function closeShareDialog() {
    shareOverlay.classList.add('hidden');
}

function setShares(count) {
    if (current) current.presentation.shares = count;
    statShares.textContent = count;
}

async function recordShare(channel) {
    if (!current) return;
    try {
        const { user, fileName } = current;
        const data = await post(`/api/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}/share`, { channel });
        setShares(data.shares);
    } catch (e) { /* không chặn người xem chỉ vì thống kê lỗi */ }
}

btnShare.addEventListener('click', openShareDialog);
btnCloseShare.addEventListener('click', closeShareDialog);
shareOverlay.addEventListener('click', e => { if (e.target === shareOverlay) closeShareDialog(); });
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !shareOverlay.classList.contains('hidden')) closeShareDialog();
});

shareChannels.addEventListener('click', async (e) => {
    const btn = e.target.closest('.share-channel');
    if (!btn || !current || !current.presentation) return;

    const channel = btn.dataset.channel;
    // Ghi lượt trước khi mở cửa sổ: nếu trình duyệt điều hướng chính trang này
    // thay vì bật popup thì request đã nằm trên đường dây, không bị mất số liệu.
    await recordShare(channel);
    // of_width/height: hai mạng kia mở composer dạng cửa sổ nhỏ. Không kèm noopener vì
    // window.open trả null khi có cờ đó, và null là dấu hiệu duy nhất để phát hiện popup bị chặn.
    const popup = window.open(channelShareUrl(channel), `heyshow-share-${channel}`, 'width=640,height=560');
    // Gan Jing World không có composer URL nên chỉ mở trang web, popup bị chặn vẫn tính lượt chia sẻ
    if (!popup && channel !== 'ganjing') {
        showToast('Trình duyệt đã chặn cửa sổ bật lên, hãy cho phép popup rồi thử lại', true);
        return;
    }
    showToast('Đã mở cửa sổ chia sẻ');
});

// clipboard API cần HTTPS; fallback chọn text rồi copy bằng execCommand
async function copyShareLink() {
    const url = shareLinkInput.value;
    if (!url) return;
    try {
        await navigator.clipboard.writeText(url);
    } catch (e) {
        shareLinkInput.removeAttribute('readonly');
        shareLinkInput.select();
        shareLinkInput.setSelectionRange(0, url.length); // iOS cần chọn rõ-range
        const ok = document.execCommand('copy');
        shareLinkInput.setAttribute('readonly', '');
        window.getSelection().removeAllRanges();
        if (!ok) return showToast('Không sao chép được, hãy bôi đen link rồi tự copy', true);
    }
    await recordShare('copy');
    showToast('Đã sao chép link');
}
btnCopyLink.addEventListener('click', copyShareLink);

btnSendComment.addEventListener('click', sendComment);
commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendComment();
    }
});

async function sendComment() {
    if (!isAuthed()) return showToast('Hãy đăng nhập để bình luận', true);
    if (!current) return;
    const text = commentInput.value.trim();
    if (!text) return;

    btnSendComment.disabled = true;
    try {
        const { user, fileName } = current;
        await post(`/api/p/${encodeURIComponent(user)}/${encodeURIComponent(fileName)}/comments`, { text });
        commentInput.value = '';
        syncMathMirror();
        hideMathTooltip();
        await refreshPresentation();
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
    myUsername = null;
    canModerate = false;
    meLink.classList.add('hidden');
    loginLink.classList.remove('hidden');
    composer.classList.add('hidden');
    loginHint.classList.remove('hidden');
}

async function initMe() {
    const payload = tokenPayload();
    if (!getToken() || !payload || !payload.username) return setGuestState();
    try {
        const data = await get('/api/user/profile');
        myUsername = payload.username;
        meAvatar.src = data.profile.avatar;
        composerAvatar.src = data.profile.avatar;
        meLink.classList.remove('hidden');
        loginLink.classList.add('hidden');
        composer.classList.remove('hidden');
        loginHint.classList.add('hidden');
    } catch (e) {
        // Token hết hạn / bị thu hồi (đổi mật khẩu, đổi quyền): về trạng thái khách
        setGuestState();
    }
}

// api.js đã xóa token khi server trả 401/403; ở đây chỉ cần vẽ lại giao diện
onUnauthorized(() => {
    setGuestState();
    showToast('Phiên đăng nhập không còn hiệu lực, hãy đăng nhập lại', true);
});

commentEmpty.id = 'comment-empty';
commentEmpty.textContent = 'Chưa có bình luận nào. Hãy là người đầu tiên!';

initMe();
startFeed('');
syncFromHash();
