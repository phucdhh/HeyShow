// Trang chủ: đổ số liệu thống kê từ /api/stats (kèm hiệu ứng đếm tăng dần)
function animateNumber(el, target) {
    const duration = 900;
    const start = performance.now();
    const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased).toLocaleString('vi-VN');
        if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (!data.success) return;
        const map = {
            'stat-presentations': data.stats.presentations,
            'stat-views': data.stats.views,
            'stat-likes': data.stats.likes,
            'stat-comments': data.stats.comments,
            'stat-users': data.stats.users
        };
        for (const [id, value] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) animateNumber(el, value || 0);
        }
    } catch (e) { /* stats chỉ để trang trí, lỗi thì giữ dấu – */ }
}

loadStats();
