import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import {
    defaultKeymap, history, historyKeymap, indentWithTab,
    toggleComment, moveLineUp, moveLineDown
} from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { foldGutter, foldKeymap, foldAll, unfoldAll, bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { search, searchKeymap, openSearchPanel, highlightSelectionMatches } from "@codemirror/search";
import {
    autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, snippetCompletion
} from "@codemirror/autocomplete";
import { lintGutter } from "@codemirror/lint";
import { slideGutter, slidesField, sectionLinter, slideStatus, slideAt, topSectionAt } from "./slides.js";
import { colorSwatches, closeColorPicker } from "./color-picker.js";
import { get, post, getToken, setToken, clearToken, tokenPayload, onUnauthorized, ApiError } from "./api.js";
import { REVEAL_CSS, REVEAL_JS, REVEAL_MATH_JS, REVEAL_KATEX_OPTS } from "./reveal-cdn.js";

// Các DOM elements
const editorContainer = document.getElementById('editor-container');
const previewIframe = document.getElementById('preview-iframe');
const fileSelect = document.getElementById('file-select');
const newFileNameInput = document.getElementById('new-file-name');
const btnCreate = document.getElementById('btn-create');
const btnSave = document.getElementById('btn-save');
const btnPublish = document.getElementById('btn-publish');
const quotaBadge = document.getElementById('quota-badge');
const toastEl = document.getElementById('toast');

let currentFileName = '';
let editorView;

// Template mặc định cho slide mới
const DEFAULT_SLIDE_TEMPLATE = `<section-master>
  <!-- Các thiết lập chung cho tất cả slide ở đây (như header, footer, background) -->
  <header style="position: absolute; top: 10px; left: 20px; font-size: 0.5em; color: #888;">
    HeyShow Presentation
  </header>
</section-master>

<section>
  <h2>Slide Tiêu Đề</h2>
  <p>Đây là một bài thuyết trình được tạo bởi HeyShow.</p>
</section>

<section>
  <h2>Nội Dung</h2>
  <ul>
    <li>Điểm 1</li>
    <li>Điểm 2</li>
  </ul>
</section>
`;

// Vị trí slide theo con trỏ, để preview nhảy tới đúng slide đang soạn
function getSlideIndices(scan, cursorPos) {
    const s = slideAt(scan, cursorPos);
    return s ? { h: s.h, v: s.v } : { h: 0, v: 0 };
}

const htmlLang = html();

// Gõ "section", "math", "columns"... rồi chọn để chèn khung slide quen thuộc
const heyshowSnippets = [
    snippetCompletion("<section>\n  ${}\n</section>",
        { label: "section", detail: "Slide mới", type: "keyword" }),
    snippetCompletion("<section-master>\n  ${}\n</section-master>",
        { label: "section-master", detail: "Slide master (dùng chung mọi slide)", type: "keyword" }),
    snippetCompletion("<section>\n  <section>\n    ${}\n  </section>\n  <section>\n    \n  </section>\n</section>",
        { label: "section-vertical", detail: "Nhóm slide dọc", type: "keyword" }),
    snippetCompletion('<li class="fragment">${}</li>',
        { label: "fragment", detail: "Hiện dần từng dòng khi bấm phím", type: "keyword" }),
    snippetCompletion("$$\n  ${}\n$$",
        { label: "math", detail: "Công thức KaTeX (khối)", type: "keyword" }),
    snippetCompletion('<div style="display: flex; gap: 1em;">\n  <div style="flex: 1;">${}</div>\n  <div style="flex: 1;"></div>\n</div>',
        { label: "columns", detail: "Bố cục 2 cột", type: "keyword" }),
    snippetCompletion('<img src="${}" alt="" style="max-height: 420px;">',
        { label: "image", detail: "Chèn ảnh", type: "keyword" }),
    snippetCompletion('<span style="background: #ffd479; color: #11111b; padding: 0 0.2em;">${}</span>',
        { label: "highlight", detail: "Tô nền cho chữ", type: "keyword" })
];

const editorStatus = document.getElementById('editor-status');
let savedContent = '';

function isDirty() {
    return !!currentFileName && editorView.state.doc.toString() !== savedContent;
}

// Hỏi trước khi bỏ thay đổi chưa lưu (chuyển file, tạo file mới, đóng tab)
function confirmDiscard() {
    return !isDirty() || window.confirm('File đang mở có thay đổi chưa lưu. Bạn vẫn muốn tiếp tục?');
}

function updateStatus() {
    if (!editorView) return;
    if (!currentFileName) {
        editorStatus.textContent = 'Chưa mở file';
        editorStatus.classList.remove('dirty');
        return;
    }
    const scan = editorView.state.field(slidesField);
    const label = slideStatus(scan, editorView.state.selection.main.head);
    const dirty = isDirty();
    editorStatus.textContent = dirty ? `${label} · Chưa lưu ●` : label;
    editorStatus.classList.toggle('dirty', dirty);
}

// Theme sáng kiểu HeyGeo: nền trắng/xám nhạt, con trỏ & điểm nhấn amber
const heyshowLight = [
    EditorView.theme({
        "&": { backgroundColor: "#ffffff", color: "#1f2937" },
        ".cm-content": { caretColor: "#d97706", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
        ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#d97706" },
        "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection":
            { backgroundColor: "rgba(253, 230, 138, 0.7)" },
        ".cm-gutters": { backgroundColor: "#f9fafb", color: "#9ca3af", borderRight: "1px solid #e5e7eb" },
        ".cm-activeLine": { backgroundColor: "#fffbeb" },
        ".cm-activeLineGutter": { backgroundColor: "#fef3c7", color: "#b45309" },
        ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 12px" }
    }, { dark: false }),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true })
];

// Khởi tạo CodeMirror Editor
function initEditor() {
    const startState = EditorState.create({
        doc: "",
        extensions: [
            // Thứ tự trong mảng là thứ tự trái → phải của các cột gutter
            slideGutter,
            lineNumbers(),
            highlightActiveLineGutter(),
            foldGutter({ openText: '▾', closedText: '▸' }),
            lintGutter(),
            history(),
            htmlLang,
            htmlLang.language.data.of({ autocomplete: heyshowSnippets }),
            heyshowLight,
            EditorView.lineWrapping, // Cho phép tự động xuống dòng để không đẩy editor ra ngang
            indentOnInput(),
            bracketMatching(),
            closeBrackets(),
            autocompletion(),
            highlightActiveLine(),
            search({ top: true, caseSensitive: false }),
            highlightSelectionMatches(),
            sectionLinter,
            colorSwatches,
            slidesField,
            keymap.of([
                { key: 'Mod-/', run: toggleComment },
                { key: 'Alt-ArrowUp', run: moveLineUp },
                { key: 'Alt-ArrowDown', run: moveLineDown },
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                indentWithTab
            ]),
            // Lắng nghe sự kiện thay đổi nội dung (debounce 500ms)
            EditorView.updateListener.of((update) => {
                if (update.docChanged || update.selectionSet) updateStatus();
                if (update.docChanged) {
                    clearTimeout(window.previewTimeout);
                    window.previewTimeout = setTimeout(() => {
                        updatePreview(true);
                    }, 500);
                } else if (update.selectionSet) {
                    clearTimeout(window.previewTimeout);
                    window.previewTimeout = setTimeout(() => {
                        updatePreview(false);
                    }, 50);
                }
            })
        ]
    });

    editorView = new EditorView({
        state: startState,
        parent: editorContainer
    });
    updateStatus();
}

// Hàm hiển thị thông báo
function showToast(message, isError = false) {
    toastEl.textContent = message;
    toastEl.style.backgroundColor = isError ? '#dc2626' : '#16a34a';
    toastEl.style.color = '#ffffff';
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// Cập nhật iframe preview sử dụng cấu trúc Reveal.js
function updatePreview(fullReload = true) {
    const code = editorView.state.doc.toString();
    const { h, v } = getSlideIndices(editorView.state.field(slidesField), editorView.state.selection.main.head);
    
    const iframeWindow = previewIframe.contentWindow;

    // Nếu chỉ di chuyển con trỏ, không thay đổi nội dung -> chỉ gọi Reveal.slide() để nhảy đến Slide
    if (!fullReload && iframeWindow && iframeWindow.Reveal) {
        try {
            iframeWindow.Reveal.slide(h, v);
        } catch(e) {}
        return;
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        ${REVEAL_CSS}
        <style>
            /* Reset iframe giống hệt với trang Public */
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; background-color: #111; }

            /* Chốt chặn giống buildFullHtml của server: CSS của bài viết ghi
               display:!important lên .reveal .slides section sẽ làm mọi slide chồng lên nhau. */
            @media screen {
                html:not(.reveal-print) .reveal:not(.overview) .slides>section:not(.present),
                html:not(.reveal-print) .reveal:not(.overview) .slides>section>section:not(.present) {
                    display: none !important;
                }
            }
        </style>
    </head>
    <body>
        <div class="reveal">
            <div class="slides">
                ${code}
            </div>
        </div>
        ${REVEAL_JS}
        <!-- Plugin Math (KaTeX) của Reveal.js -->
        ${REVEAL_MATH_JS}
        <script>
            window.addEventListener('DOMContentLoaded', () => {
                // Xử lý thẻ section-master
                const masters = document.querySelectorAll('section-master');
                let masterContent = '';
                masters.forEach(m => {
                    masterContent += m.innerHTML;
                    m.remove();
                });

                if (masterContent) {
                    const sections = document.querySelectorAll('.reveal .slides section');
                    sections.forEach(sec => {
                        // Chỉ chèn vào các section không chứa section con (leaf section)
                        if (sec.querySelectorAll('section').length === 0) {
                            sec.insertAdjacentHTML('afterbegin', masterContent);
                        }
                    });
                }

                Reveal.initialize({
                    hash: false, 
                    slideNumber: true,
                    ${REVEAL_KATEX_OPTS},
                    // Loại bỏ embedded và display: block để cho Reveal tự tính toán y hệt trang public
                    plugins: [ RevealMath.KaTeX ] 
                }).then(() => {
                    Reveal.layout();
                    Reveal.slide(${h}, ${v});
                });
            });
        </script>
    </body>
    </html>
    `;

    const doc = previewIframe.contentDocument || iframeWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();
}

// --- Các hàm gọi API ---

// --- Xác thực (Auth) ---
const authOverlay = document.getElementById('auth-overlay');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const authUser = document.getElementById('auth-user');
const authUserLabel = document.getElementById('auth-user-label');
const authPass = document.getElementById('auth-pass');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const authMsg = document.getElementById('auth-msg');

// Các trường riêng cho tab Đăng ký
const regFields = Array.from(authOverlay.querySelectorAll('.reg-only'));
const regFullName = document.getElementById('reg-full-name');
const regEmail = document.getElementById('reg-email');
const regPhone = document.getElementById('reg-phone');
const regSlug = document.getElementById('reg-slug');
const regSlugHint = document.getElementById('reg-slug-hint');
const regPassConfirm = document.getElementById('reg-pass-confirm');

// const userDisplay = document.getElementById('user-display');
const btnLogout = document.getElementById('btn-logout');

// Avatar & Profile
const userAvatar = document.getElementById('user-avatar');
const userDropdown = document.getElementById('user-dropdown');
const btnProfile = document.getElementById('btn-profile');

const profileOverlay = document.getElementById('profile-overlay');
const btnCloseProfile = document.getElementById('btn-close-profile');
const profileAvatarPreview = document.getElementById('profile-avatar-preview');
const profileAvatarUpload = document.getElementById('profile-avatar-upload');
const profileUrlSlug = document.getElementById('profile-url-slug');
const profileEmail = document.getElementById('profile-email');
const profileNewPass = document.getElementById('profile-new-pass');
const btnSaveProfile = document.getElementById('btn-save-profile');
const profileMsg = document.getElementById('profile-msg');

let isLoginMode = true;
const authBox = authOverlay.querySelector('.auth-box');
// Người đăng ký tự gõ "Username URL" thì thôi tự điền theo họ tên
let slugTouched = false;

// Bỏ dấu tiếng Việt để ra slug đọc được trên URL
function slugify(text) {
    const s = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
    return s.replace(/-+$/g, '');
}

function showSlugHint() {
    regSlugHint.textContent = `Link trang của bạn: /${regSlug.value || 'username-url'}`;
}

function syncSlug() {
    if (slugTouched) return showSlugHint();
    regSlug.value = slugify(regFullName.value) || slugify(authUser.value);
    showSlugHint();
}

// Chuyển đổi tab
function setAuthMode(login) {
    isLoginMode = login;
    tabLogin.classList.toggle('active', login);
    tabRegister.classList.toggle('active', !login);
    authBox.classList.toggle('is-register', !login);
    btnAuthSubmit.textContent = login ? 'Đăng nhập' : 'Đăng ký';
    // Đăng nhập được bằng cả email, còn Đăng ký luôn lấy tên đăng nhập làm loginId
    authUserLabel.textContent = login ? 'Tên đăng nhập hoặc Email' : 'Tên đăng nhập (Username)';
    authUser.placeholder = login ? 'VD: user123 hoặc user@truong.edu.vn' : 'VD: user123';
    authPass.placeholder = login ? '••••••••' : 'Tối thiểu 8 ký tự';
    regFields.forEach(el => el.classList.toggle('hidden', login));
    if (!login) syncSlug();
}

tabLogin.addEventListener('click', () => setAuthMode(true));
tabRegister.addEventListener('click', () => setAuthMode(false));

authUser.addEventListener('input', syncSlug);
regFullName.addEventListener('input', syncSlug);
regSlug.addEventListener('input', () => {
    // Xoá trắng ô này là dấu hiệu "hãy tự điền lại giúp tôi"
    slugTouched = regSlug.value.trim() !== '';
    // Giống ô slug trong hồ sơ: chỉ giữ ký tự dùng được trên URL
    regSlug.value = regSlug.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
    syncSlug();
});
showSlugHint();

// Mở file chỉ định qua query param (Dashboard bấm "Sửa" → /design?file=ten.html)
async function openFileFromQuery() {
    const params = new URLSearchParams(location.search);
    const file = params.get('file');
    if (!file) return;
    // Xoá param ngay để reload/đăng nhập lại không mở lặp.
    // Phải dùng window.history: tên `history` trong module này đã bị import history() của CodeMirror che mất
    params.delete('file');
    const qs = params.toString();
    window.history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));
    await loadFileContent(file);
    fileSelect.value = file;
}

// Trang /templates lưu mẫu đã chọn vào localStorage; vào Design là tạo bản nháp mới từ mẫu
async function maybeUsePendingTemplate() {
    const raw = localStorage.getItem('heyshow_pending_template');
    if (!raw) return;
    localStorage.removeItem('heyshow_pending_template');
    let tpl;
    try { tpl = JSON.parse(raw); } catch (e) { return; }
    if (!tpl || typeof tpl.code !== 'string' || !tpl.code) return;

    const suggested = (tpl.fileName || 'mau-moi') + '';
    let name = window.prompt(`Tạo bản nháp mới từ mẫu "${tpl.name || ''}". Nhập tên file:`, suggested);
    if (!name || !name.trim()) return;
    name = name.trim();
    if (!name.endsWith('.html')) name += '.html';

    try {
        // Tránh ghi đè file đã có: tự thêm hậu tố -2, -3…
        const { files } = await get('/api/files');
        if (files.includes(name)) {
            const stem = name.slice(0, -5);
            let i = 2;
            while (files.includes(`${stem}-${i}.html`)) i++;
            name = `${stem}-${i}.html`;
        }

        await post(`/api/files/${encodeURIComponent(name)}`, { content: tpl.code });
        currentFileName = name;
        await loadFiles();
        fileSelect.value = name;
        await loadFileContent(name);
        showToast(`Đã tạo bản nháp từ mẫu: ${tpl.name || name}`);
    } catch (e) {
        showToast(e instanceof ApiError ? e.message : 'Lỗi tạo file từ mẫu', true);
    }
}

function checkAuth() {
    const payload = tokenPayload();
    if (!getToken() || !payload?.username) {
        clearToken();
        authOverlay.classList.remove('hidden');
        return false;
    }
    authOverlay.classList.add('hidden');
    loadFiles();
    loadUserProfile();
    openFileFromQuery();
    maybeUsePendingTemplate();
    return true;
}

// Token chết giữa chừng (đổi mật khẩu, admin đổi quyền, hết hạn) — trở về màn đăng nhập
onUnauthorized(() => {
    if (authOverlay.classList.contains('hidden')) {
        authMsg.style.color = '#dc2626';
        authMsg.textContent = 'Phiên đăng nhập không còn hiệu lực. Hãy đăng nhập lại.';
    }
    checkAuth();
});

// Xử lý ẩn hiện Dropdown avatar
userAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('hidden');
});
document.addEventListener('click', () => userDropdown.classList.add('hidden'));

// Mở modal profile
btnProfile.addEventListener('click', () => {
    profileOverlay.classList.remove('hidden');
});
btnCloseProfile.addEventListener('click', () => {
    profileOverlay.classList.add('hidden');
    profileMsg.textContent = '';
});

// Upload ảnh avatar (Base64)
let tempAvatarBase64 = null;
profileAvatarPreview.addEventListener('click', () => profileAvatarUpload.click());
profileAvatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 1024 * 1024) return showToast("Ảnh quá lớn. Vui lòng chọn ảnh < 1MB", true);
        const reader = new FileReader();
        reader.onload = (e) => {
            tempAvatarBase64 = e.target.result;
            profileAvatarPreview.src = tempAvatarBase64;
        };
        reader.readAsDataURL(file);
    }
});

async function loadUserProfile() {
    try {
        const data = await get('/api/user/profile');
        userAvatar.src = data.profile.avatar;
        profileAvatarPreview.src = data.profile.avatar;
        profileUrlSlug.value = data.profile.urlSlug;
        profileEmail.value = data.profile.email;
    } catch (e) {
        // Lỗi ở đây chỉ làm avatar/slug trống tạm thời — onUnauthorized đã lo vụ hết hạn
    }
}

// Tự động bỏ dấu và khoảng trắng cho username
profileUrlSlug.addEventListener('input', (e) => {
    let val = e.target.value;
    val = val.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    val = val.replace(/[^a-zA-Z0-9_-]/g, '');
    e.target.value = val;
});

btnSaveProfile.addEventListener('click', async () => {
    btnSaveProfile.disabled = true;
    profileMsg.style.color = '#6b7280';
    profileMsg.textContent = 'Đang lưu...';

    try {
        const payload = {
            urlSlug: profileUrlSlug.value.trim(),
            email: profileEmail.value.trim(),
        };
        if (profileNewPass.value) payload.password = profileNewPass.value;
        if (tempAvatarBase64) payload.avatarBase64 = tempAvatarBase64;

        await post('/api/user/profile', payload);
        profileMsg.style.color = '#16a34a';
        profileNewPass.value = '';
        tempAvatarBase64 = null;

        // Đổi mật khẩu làm thu hồi mọi token cũ, kể cả token đang dùng
        if (payload.password) {
            profileMsg.textContent = 'Đã đổi mật khẩu. Hãy đăng nhập lại.';
            setTimeout(() => { clearToken(); checkAuth(); }, 1200);
            return;
        }

        profileMsg.textContent = 'Lưu thành công!';
        loadUserProfile();
        setTimeout(() => btnCloseProfile.click(), 1500);
    } catch (e) {
        profileMsg.style.color = '#dc2626';
        profileMsg.textContent = e instanceof ApiError ? e.message : 'Lỗi kết nối';
    } finally {
        btnSaveProfile.disabled = false;
    }
});

btnLogout.addEventListener('click', () => {
    clearToken();
    closeColorPicker(false);
    currentFileName = '';
    savedContent = '';
    editorView.dispatch({ changes: { from: 0, to: editorView.state.doc.length, insert: "" } });
    updatePreview();
    updateStatus();
    fileSelect.innerHTML = '<option value="" disabled selected>-- Chọn file nháp --</option>';
    checkAuth();
});

// Kiểm ngay trên trình duyệt để báo lỗi tức thì; server vẫn kiểm lại toàn bộ
const REG_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REG_PHONE_RE = /^[0-9+\-.()\s]{0,20}$/;
const REG_SLUG_RE = /^[a-zA-Z0-9_-]{3,40}$/;
const REG_PASSWORD_MIN = 8;
const REG_FULL_NAME_MAX = 80;

function registerError() {
    const fullName = regFullName.value.trim();
    const email = regEmail.value.trim();
    const phone = regPhone.value.trim();
    const slug = regSlug.value.trim();
    const password = authPass.value;

    if (!fullName) return 'Nhập họ và tên';
    if (fullName.length > REG_FULL_NAME_MAX) return `Họ tên tối đa ${REG_FULL_NAME_MAX} ký tự`;
    if (!email) return 'Nhập email';
    if (!REG_EMAIL_RE.test(email)) return 'Email không hợp lệ';
    if (phone && !REG_PHONE_RE.test(phone)) return 'Số điện thoại chỉ gồm số, dấu +, -, khoảng trắng (tối đa 20 ký tự)';
    if (!REG_SLUG_RE.test(slug)) return 'Username URL phải dài 3-40 ký tự, chỉ gồm chữ cái, số, gạch ngang và gạch dưới.';
    if (password.length < REG_PASSWORD_MIN) return `Mật khẩu phải có ít nhất ${REG_PASSWORD_MIN} ký tự`;
    if (password !== regPassConfirm.value) return 'Xác nhận mật khẩu không khớp';
    return '';
}

btnAuthSubmit.addEventListener('click', async () => {
    const username = authUser.value.trim();
    const password = authPass.value;
    if (!username || !password) return authMsg.textContent = 'Vui lòng nhập đủ thông tin';

    let profile = null;
    if (!isLoginMode) {
        const err = registerError();
        if (err) {
            authMsg.style.color = '#dc2626';
            authMsg.textContent = err;
            return;
        }
        profile = {
            fullName: regFullName.value.trim(),
            email: regEmail.value.trim(),
            phone: regPhone.value.trim(),
            urlSlug: regSlug.value.trim()
        };
    }

    btnAuthSubmit.disabled = true;
    authMsg.textContent = 'Đang xử lý...';
    authMsg.style.color = '#6b7280';

    try {
        const data = await post(isLoginMode ? '/api/auth/login' : '/api/auth/register', { username, password, ...profile });
        if (!isLoginMode) {
            authMsg.style.color = '#16a34a';
            authMsg.textContent = 'Đăng ký thành công! Hãy đăng nhập.';
            // Giữ lại đúng tên vừa đăng ký để khỏi phải gõ lại
            authPass.value = '';
            regPassConfirm.value = '';
            setAuthMode(true);
            authPass.focus();
            return;
        }
        setToken(data.token);
        authMsg.textContent = '';
        // Nếu được chuyển tới từ nơi khác (vd. Gallery) thì quay lại đó.
        const redirect = new URLSearchParams(location.search).get('redirect');
        if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
            location.href = redirect;
            return;
        }
        checkAuth();
    } catch (e) {
        authMsg.style.color = '#dc2626';
        authMsg.textContent = e instanceof ApiError ? e.message : 'Lỗi kết nối mạng';
    } finally {
        btnAuthSubmit.disabled = false;
    }
});

// Admin (max = null) không giới hạn nên không cần nhắc hạn mức
function renderQuota(quota) {
    if (!quota || quota.max === null) {
        quotaBadge.classList.add('hidden');
        return;
    }
    quotaBadge.textContent = `${quota.used}/${quota.max} bài`;
    quotaBadge.title = quota.used >= quota.max
        ? 'Đã hết hạn mức — xoá bớt bài cũ hoặc liên hệ quản trị để nâng quyền'
        : `Còn tạo được ${quota.max - quota.used} bài nữa`;
    quotaBadge.classList.toggle('near', quota.used >= quota.max);
    quotaBadge.classList.remove('hidden');
}

async function loadFiles() {
    try {
        const data = await get('/api/files');
        while (fileSelect.options.length > 1) fileSelect.remove(1);
        for (const f of data.files) {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            fileSelect.appendChild(opt);
        }
        if (currentFileName) fileSelect.value = currentFileName;
        renderQuota(data.quota);
    } catch (e) {
        if (!(e instanceof ApiError)) showToast("Lỗi tải danh sách file", true);
    }
}

async function loadFileContent(fileName) {
    try {
        const data = await get(`/api/files/${encodeURIComponent(fileName)}`);
        closeColorPicker(false);
        currentFileName = fileName;
        savedContent = data.content;
        editorView.dispatch({
            changes: { from: 0, to: editorView.state.doc.length, insert: data.content },
            selection: { anchor: 0 },
            scrollIntoView: true
        });
        updatePreview();
        updateStatus();
    } catch (e) {
        if (!(e instanceof ApiError)) showToast("Lỗi tải nội dung file", true);
    }
}

async function saveFile() {
    if (!currentFileName) return showToast("Vui lòng chọn hoặc tạo file trước", true);
    try {
        const content = editorView.state.doc.toString();
        await post(`/api/files/${encodeURIComponent(currentFileName)}`, { content });
        savedContent = content;
        updateStatus();
        showToast("Đã lưu bản nháp");
    } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Lỗi lưu file", true);
    }
}

async function createFile() {
    let rawName = newFileNameInput.value.trim();
    if (!rawName) return showToast("Vui lòng nhập tên file", true);
    if (!confirmDiscard()) return;
    if (!rawName.endsWith('.html')) rawName += '.html';

    // Kiểm tra xem file đã tồn tại trong danh sách chưa
    let exists = false;
    for (let i = 0; i < fileSelect.options.length; i++) {
        if (fileSelect.options[i].value === rawName) {
            exists = true;
            break;
        }
    }

    if (exists) {
        // Nếu đã tồn tại, chỉ mở file đó thay vì tạo mới
        fileSelect.value = rawName;
        await loadFileContent(rawName);
        newFileNameInput.value = '';
        showToast("Đã mở file có sẵn");
        return;
    }

    try {
        await post(`/api/files/${encodeURIComponent(rawName)}`, { content: DEFAULT_SLIDE_TEMPLATE });
        currentFileName = rawName;
        newFileNameInput.value = '';
        showToast("Tạo file mới thành công");
        await loadFiles();
        await loadFileContent(rawName);
    } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Lỗi tạo file", true);
    }
}

async function publishFile() {
    if (!currentFileName) return showToast("Vui lòng lưu bản nháp trước khi publish", true);
    await saveFile();
    try {
        const data = await post(`/api/files/${encodeURIComponent(currentFileName)}/publish`);
        showToast("Publish thành công! Link đã sẵn sàng.");
        window.open(data.url, '_blank');
    } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Lỗi publish file", true);
    }
}

// --- Sự kiện DOM ---

fileSelect.addEventListener('change', (e) => {
    const name = e.target.value;
    if (!name || name === currentFileName) return;
    if (!confirmDiscard()) {
        fileSelect.value = currentFileName;
        return;
    }
    loadFileContent(name);
});

btnCreate.addEventListener('click', createFile);
btnSave.addEventListener('click', saveFile);
btnPublish.addEventListener('click', publishFile);

// Công cụ trên thanh tiêu đề khung soạn thảo
document.getElementById('btn-search').addEventListener('click', () => {
    editorView.focus();
    openSearchPanel(editorView);
});
document.getElementById('btn-fold-all').addEventListener('click', () => {
    foldAll(editorView);
    editorView.focus();
});
document.getElementById('btn-unfold-all').addEventListener('click', () => {
    unfoldAll(editorView);
    editorView.focus();
});

// Ctrl/Cmd+S lưu nháp ở bất cứ đâu trong trang, kể cả khi con trỏ đang ở khung search
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveFile();
    }
});

window.addEventListener('beforeunload', (e) => {
    if (!isDirty()) return;
    e.preventDefault();
    e.returnValue = '';
});

// Cấu hình thanh kéo Resize (Split pane)
const resizer = document.getElementById('resizer');
const leftPane = document.getElementById('editor-pane');
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Ngăn bôi đen text khi kéo
    // Ngăn iframe chộp mất sự kiện mousemove
    previewIframe.style.pointerEvents = 'none'; 
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    // Tính toán chiều rộng bằng pixel thay vì flex ratio để ổn định hơn
    const newWidth = e.clientX;
    const minWidth = window.innerWidth * 0.2;
    const maxWidth = window.innerWidth * 0.8;
    
    if (newWidth > minWidth && newWidth < maxWidth) {
        // Gỡ bỏ flex 1 cũ, đặt cứng width
        leftPane.style.flex = 'none';
        leftPane.style.width = `${newWidth}px`;
    }
});

document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = '';
        previewIframe.style.pointerEvents = 'auto';
    }
});

// Các DOM elements (Thêm AI)
const btnAiToggle = document.getElementById('btn-ai-toggle');
const aiChatPanel = document.getElementById('ai-chat-panel');
const btnCloseAi = document.getElementById('btn-close-ai');
const aiPromptInput = document.getElementById('ai-prompt');
const btnAiSend = document.getElementById('btn-ai-send');
const aiChatHistory = document.getElementById('ai-chat-history');
const aiModeSelect = document.getElementById('ai-mode');
const aiProviderSelect = document.getElementById('ai-provider');

// AI Logic
btnAiToggle.addEventListener('click', () => {
    aiChatPanel.classList.toggle('hidden');
    if (!aiChatPanel.classList.contains('hidden')) loadAiProviders();
});
btnCloseAi.addEventListener('click', () => {
    aiChatPanel.classList.add('hidden');
});

// Hỏi server nhà cung cấp nào đã có API key để bật/tắt lựa chọn tương ứng
let aiProvidersLoaded = false;
async function loadAiProviders() {
    if (aiProvidersLoaded) return;
    try {
        const data = await get('/api/ai/providers');
        aiProvidersLoaded = true;
        const baseLabels = { groq: 'Groq (mặc định)', deepseek: 'DeepSeek' };
        for (const option of aiProviderSelect.options) {
            const info = data.providers[option.value];
            const configured = info ? info.configured : true;
            option.disabled = !configured;
            option.textContent = configured ? baseLabels[option.value] : `${baseLabels[option.value]} — chưa có key`;
        }
        if (aiProviderSelect.selectedOptions[0]?.disabled) {
            aiProviderSelect.value = (data.providers[data.default] && data.providers[data.default].configured)
                ? data.default
                : [...aiProviderSelect.options].find(o => !o.disabled)?.value || data.default;
        }
    } catch (e) {
        // Không tải được thì cứ để cả hai lựa chọn bật; server sẽ báo lỗi thiếu key khi gửi
    }
}

function appendChatMsg(text, sender = 'user') {
    const div = document.createElement('div');
    div.className = `chat-msg ${sender}`;
    // Cho phép hiển thị xuống dòng và code thô
    div.textContent = text;
    aiChatHistory.appendChild(div);
    aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
}

// Xác định vị trí chèn và code bối cảnh gửi kèm cho AI, theo vị trí người dùng chọn
function resolveAiTarget(mode) {
    const state = editorView.state;
    const sel = state.selection.main;
    const doc = state.doc;

    if (mode === 'master') {
        const { master } = state.field(slidesField);
        if (master.from >= 0) {
            const pos = master.closeFrom >= 0 ? master.closeFrom : doc.length;
            return {
                range: { from: pos, to: pos },
                note: 'chèn vào cuối Slide Master',
                contextCode: doc.sliceString(master.from, master.to === null ? doc.length : master.to)
            };
        }
        // Chưa có Slide Master: tạo mới ở đầu file, bọc quanh code AI trả về
        return {
            range: { from: 0, to: 0 },
            wrap: ['<section-master>\n', '\n</section-master>\n\n'],
            note: 'tạo Slide Master mới ở đầu file'
        };
    }

    const cur = topSectionAt(doc, sel.head);
    if (mode === 'current') {
        if (!cur) return { error: 'Con trỏ không nằm trong slide nào. Hãy đặt con trỏ vào bên trong một slide rồi thử lại.' };
        return {
            range: { from: cur.closeFrom, to: cur.closeFrom },
            note: 'chèn vào cuối slide hiện tại',
            contextCode: doc.sliceString(cur.from, cur.to)
        };
    }
    if (mode === 'next') {
        if (cur) {
            return {
                range: { from: cur.to, to: cur.to },
                note: 'chèn thành slide mới ngay sau slide hiện tại',
                contextCode: doc.sliceString(cur.from, cur.to)
            };
        }
        return { range: { from: doc.length, to: doc.length }, note: 'con trỏ không nằm trong slide nào nên đã chèn vào cuối file' };
    }
    return { range: { from: doc.length, to: doc.length }, note: 'chèn thành slide mới vào cuối file' };
}

async function sendAiPrompt() {
    const prompt = aiPromptInput.value.trim();
    if (!prompt) return;

    const mode = aiModeSelect.value;
    const provider = aiProviderSelect.value;
    const target = resolveAiTarget(mode);
    if (target.error) {
        appendChatMsg(target.error, 'error');
        return;
    }

    appendChatMsg(prompt, 'user');
    aiPromptInput.value = '';
    btnAiSend.disabled = true;

    // Lấy context từ Editor hiện tại để gửi cho AI hiểu
    const state = editorView.state;
    const currentCode = state.doc.toString();
    appendChatMsg("...", "ai"); // Loading indicator

    try {
        const data = await post('/api/ai/generate', {
            prompt, currentCode, mode, targetCode: target.contextCode || null, provider
        });

        // Remove loading indicator
        aiChatHistory.lastChild.remove();

        appendChatMsg(`Đã sinh code xong. Đang ${target.note}...`, 'ai');

        // Chèn code HTML trả về tại vị trí đã chọn
        const newCode = data.result;
        const { from, to } = target.range;
        let insertText;
        if (target.wrap) {
            insertText = target.wrap[0] + newCode + target.wrap[1];
        } else if (mode === 'master' || mode === 'current') {
            // Chèn bên trong thẻ, ngay trước thẻ đóng: đảm bảo nằm trên dòng riêng
            const leading = from > 0 && state.doc.sliceString(from - 1, from) !== '\n' ? '\n' : '';
            insertText = leading + newCode + '\n';
        } else {
            const prefix = from === 0 ? '' : '\n\n';
            const suffix = to >= state.doc.length ? '' : '\n';
            insertText = prefix + newCode + suffix;
        }
        editorView.dispatch({ changes: { from, to, insert: insertText } });

        // Đặt con trỏ cuối đoạn vừa chèn và cuộn tới đó
        editorView.dispatch({
            selection: { anchor: from + insertText.length },
            scrollIntoView: true
        });

        // Cập nhật preview
        updatePreview();
    } catch (e) {
        aiChatHistory.lastChild.remove();
        appendChatMsg(e instanceof ApiError ? e.message : "Lỗi kết nối mạng", 'error');
    } finally {
        btnAiSend.disabled = false;
    }
}

btnAiSend.addEventListener('click', sendAiPrompt);
aiPromptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAiPrompt();
});

// Khởi chạy
initEditor();
checkAuth();
