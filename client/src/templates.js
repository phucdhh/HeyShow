// Trang Templates: thư viện mẫu sẵn của HeyShow (bài trình chiếu + slide đơn lẻ).
// Kho mẫu nằm ở client/src/templates/, mỗi danh mục một file (GROUP cho sidebar + SAMPLES);
// templates/groups.js liệt kê thứ tự hiển thị. File này chỉ lo phần hiển thị trang.
import { previewHtml } from './reveal-preview.js';
import { CATEGORIES } from './templates/groups.js';

const GROUPS = CATEGORIES.map(c => c.GROUP);
const copyBtnFor = (get, title) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
        const text = get();
        let ok = false;
        try {
            await navigator.clipboard.writeText(text);
            ok = true;
        } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
            ta.remove();
        }
        btn.textContent = ok ? 'Đã copy ✓' : 'Ctrl+C nhé';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
    });
    btn.title = 'Copy code ' + title;
    return btn;
};

function buildCard(t, kind) {
    const card = document.createElement('div');
    card.className = 'tpl';
    card.id = 't-' + t.id;

    const head = document.createElement('div');
    head.className = 'tpl-head';
    const title = document.createElement('span');
    title.className = 'ex-title';
    title.textContent = t.title;
    const spacer = document.createElement('span');
    spacer.className = 'spacer';
    head.append(title, spacer);

    // Mẫu cả bài: thêm nút tạo bản nháp; mẫu slide đơn: chỉ Copy (dán vào file đang mở)
    if (kind === 'deck') {
        const useBtn = document.createElement('button');
        useBtn.type = 'button';
        useBtn.className = 'use';
        useBtn.textContent = 'Dùng mẫu này';
        useBtn.title = 'Tạo bản nháp mới trong Design với toàn bộ mẫu';
        useBtn.addEventListener('click', () => {
            localStorage.setItem('heyshow_pending_template', JSON.stringify({
                name: t.title, fileName: t.fileName, code: t.code
            }));
            location.href = '/design';
        });
        head.appendChild(useBtn);
    }
    head.appendChild(copyBtnFor(() => t.code, t.title));

    const desc = document.createElement('span');
    desc.className = 'desc';
    desc.textContent = t.desc;
    head.appendChild(desc);

    const preview = document.createElement('div');
    preview.className = 'preview';
    const label = document.createElement('span');
    label.className = 'preview-label';
    label.textContent = 'PREVIEW';
    const iframe = document.createElement('iframe');
    iframe.title = 'Preview: ' + t.title;
    preview.append(label, iframe);

    const details = document.createElement('details');
    details.className = 'code';
    const summary = document.createElement('summary');
    summary.textContent = 'Xem code HTML của mẫu';
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.textContent = t.code;
    pre.appendChild(codeEl);
    details.append(summary, pre);

    card.append(head, preview, details);

    if (t.note) {
        const note = document.createElement('div');
        note.className = 'note';
        note.textContent = t.note;
        card.appendChild(note);
    }
    return card;
}

// Sidebar dựa vào GROUPS nên cùng một đoạn render sinh ra cả hai: thêm mẫu chỉ việc
// khai báo, khỏi phải sửa templates.html.
function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
}

const ALL = CATEGORIES.flatMap(c => c.SAMPLES);
const content = document.getElementById('tpl-content');
const nav = document.getElementById('tpl-nav');
const emptyMsg = document.getElementById('tpl-empty');
const KINDS = {
    deck: { title: 'Mẫu bài trình chiếu', hint: 'Cả một bộ slide hoàn chỉnh. Bấm “Dùng mẫu này” (cần đăng nhập) để HeyShow tạo ngay một file nháp mới với toàn bộ nội dung mẫu.' },
    slide: { title: 'Mẫu slide', hint: 'Slide đơn lẻ dùng chung được cho mọi bài. Bấm “Copy” rồi dán vào file đang soạn, đặt con trỏ ở nơi muốn chèn.' },
};

// emptyMsg nằm sẵn trong markup nên phải chèn phía trước nó, nếu không thông báo
// "không tìm thấy" bị đẩy xuống cuối trang và người đọc phải cuộn tới đó mới thấy.
function addToContent(node) {
    content.insertBefore(node, emptyMsg);
}

const sections = [];   // { group, sec, live, navItem, cards: [{ card, hay }] } — tìm kiếm lọc theo cards
const kindHeads = {};
let lastKind = null;

GROUPS.forEach((g, i) => {
    if (g.kind !== lastKind) {
        lastKind = g.kind;
        const head = el('div', 'kind-head');
        head.dataset.kind = g.kind;
        head.append(el('h2', null, KINDS[g.kind].title), el('p', null, KINDS[g.kind].hint));
        addToContent(head);
        kindHeads[g.kind] = head;
        nav.appendChild(el('div', 'side-kind', KINDS[g.kind].title));
    }
    const sec = el('section', 'block');
    sec.id = 'g-' + g.id;
    const live = el('span', 'live');
    const h2 = el('h2');
    h2.append(el('span', 'num', String(i + 1)), el('span', 'g-label', g.label), live);
    sec.appendChild(h2);
    if (g.lead) sec.appendChild(el('p', 'lead', g.lead));
    const holder = el('div', 'g-cards');
    sec.appendChild(holder);
    addToContent(sec);

    const cards = ALL.filter(t => t.group === g.id).map(t => {
        const card = buildCard(t, g.kind);
        const hay = fold([t.title, t.desc, t.note, t.id].join(' '));
        holder.appendChild(card);
        return { card, hay };
    });
    const link = el('a', 'nav-item');
    link.href = '#g-' + g.id;
    link.append(el('span', 'nav-label', g.label), el('span', 'nav-cnt', String(cards.length)));
    link.addEventListener('click', e => { e.preventDefault(); selectGroup(g.id); });
    nav.appendChild(link);

    sections.push({ group: g, sec, live, navItem: link, cards });
});

// Tìm kiếm: bỏ dấu để gõ "giao an" vẫn ra "Giáo án", tiếng Việt có dấu vẫn khớp.
function fold(s) {
    return (s || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

const search = document.getElementById('tpl-search');
const layout = document.querySelector('.layout');

// Sidebar hoạt động như tab: mỗi lần chỉ một danh mục hiện ra. Nhờ vậy các iframe preview
// của danh mục khác không được nạp, trang nhẹ hơn nhiều so với tải cả kho một lúc.
let activeGroup = groupFromHash() || GROUPS[0].id;

function groupFromHash() {
    const id = (location.hash || '').replace('#g-', '');
    return GROUPS.some(g => g.id === id) ? id : null;
}

function selectGroup(id) {
    activeGroup = id;
    search.value = '';   // chọn danh mục = thoát chế độ tìm kiếm
    history.replaceState(null, '', '#g-' + id);
    applyView();
    // Đang cuộn sâu thì kéo đầu nội dung lên lại, để thấy ngay danh mục vừa chọn
    if (window.scrollY > 200) {
        const y = layout.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: Math.max(0, y) });
    }
}

function applyView() {
    const q = fold(search.value.trim());
    let shown = 0;
    sections.forEach(({ group, sec, live, navItem, cards }) => {
        let visible = 0;
        cards.forEach(({ card, hay }) => {
            const ok = !q || hay.includes(q);
            card.hidden = !ok;
            if (ok) visible++;
        });
        // Có từ khoá: tìm trong mọi danh mục. Không có từ khoá: chỉ mở tab đang chọn.
        sec.hidden = (q ? false : group.id !== activeGroup) || visible === 0;
        live.textContent = q && visible !== cards.length ? visible + '/' + cards.length : String(cards.length);
        navItem.classList.toggle('active', q ? visible > 0 : group.id === activeGroup);
        navItem.classList.toggle('muted', visible === 0);
        if (!sec.hidden) shown += visible;
    });
    Object.values(kindHeads).forEach(head => {
        head.hidden = !sections.some(s => s.group.kind === head.dataset.kind && !s.sec.hidden);
    });
    emptyMsg.hidden = shown > 0;
}
search.addEventListener('input', applyView);

// Link #g-<id> dán từ nơi khác gửi tới, hoặc nút back của trình duyệt
window.addEventListener('hashchange', () => {
    const id = groupFromHash();
    if (id && id !== activeGroup) selectGroup(id);
});

applyView();

// Nạp Reveal vào iframe preview khi cuộn tới gần, tránh tải hàng chục iframe một lúc
const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        const iframe = card.querySelector('iframe');
        const t = ALL.find(x => x.id === card.id.slice(2));
        if (iframe && t && !iframe.srcdoc) iframe.srcdoc = previewHtml(t.code);
        io.unobserve(card);
    });
}, { rootMargin: '300px 0px' });
document.querySelectorAll('.tpl').forEach(card => io.observe(card));
