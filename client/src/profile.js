import { get } from './api.js';

const THUMB_W = 1280;

const banner = document.getElementById('profile-banner');
const avatarEl = document.getElementById('profile-avatar');
const nameEl = document.getElementById('profile-name');
const countEl = document.getElementById('profile-count');
const grid = document.getElementById('profile-grid');
const emptyEl = document.getElementById('profile-empty');
const errorEl = document.getElementById('profile-error');

function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// slug là đoạn đầu tiên của đường dẫn: /ndmphuc/ -> ndmphuc
function currentSlug() {
    const seg = location.pathname.split('/').filter(Boolean)[0];
    return seg ? decodeURIComponent(seg) : '';
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

function scaleAllThumbs() {
    for (const card of grid.querySelectorAll('.card')) {
        const box = card.querySelector('.thumb');
        const frame = card.querySelector('iframe');
        if (box && frame && box.clientWidth) {
            frame.style.transform = `scale(${box.clientWidth / THUMB_W})`;
        }
    }
}

function buildCard(item) {
    const card = document.createElement('article');
    card.className = 'card';
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
    const date = document.createElement('span');
    date.textContent = fmtDate(item.createdAt);
    meta.append(date);

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
    stats.append(views, likes, comments);

    body.append(title, meta, stats);
    card.append(thumb, body);

    // Mở bài trong viewer của gallery (giữ nguyên luồng thích/bình luận)
    card.addEventListener('click', () => {
        location.href = `/gallery#/p/${encodeURIComponent(item.user)}/${encodeURIComponent(item.fileName)}`;
    });

    return card;
}

async function loadProfile() {
    const slug = currentSlug();
    if (!slug) {
        errorEl.textContent = 'Không xác định được người dùng.';
        errorEl.classList.remove('hidden');
        return;
    }
    try {
        const data = await get(`/api/profile/${encodeURIComponent(slug)}`);

        avatarEl.src = data.author.avatar;
        nameEl.textContent = data.author.urlSlug;
        const n = data.items.length;
        countEl.textContent = `${n} bài trình chiếu đã xuất bản`;
        banner.classList.remove('hidden');
        document.title = `${data.author.urlSlug} - HeyShow`;

        grid.innerHTML = '';
        emptyEl.classList.toggle('hidden', n > 0);
        for (const item of data.items) grid.appendChild(buildCard(item));
        scaleAllThumbs();
    } catch (e) {
        errorEl.textContent = e.status === 404
            ? 'Không tìm thấy người dùng này.'
            : 'Không tải được trang cá nhân. Vui lòng thử lại sau.';
        errorEl.classList.remove('hidden');
    }
}

window.addEventListener('resize', scaleAllThumbs);

loadProfile();
