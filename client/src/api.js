// Tầng gọi API dùng chung cho mọi trang của HeyShow.
//
// Trước đây mỗi trang tự viết fetch, tự chọn khoá localStorage và tự xử lý 401:
// admin.js dùng 'heyshow_admin_token' trong khi các trang khác dùng
// 'heyshow_user_token', nên đăng nhập ở editor rồi mở /admin_panel vẫn bị coi là
// chưa đăng nhập. Token giờ chỉ có MỘT khoá, và mọi request đi qua đây.

export const TOKEN_KEY = 'heyshow_token';
const LEGACY_TOKEN_KEYS = ['heyshow_user_token', 'heyshow_admin_token'];

let unauthorizedHandler = null;

// Admin là role chứ không phải tài khoản riêng, nên không cần token riêng.
// Bản cũ đã lưu token dưới hai khoá khác nhau — đọc thử để không đá người dùng
// đang đăng nhập ra ngoài khi nâng cấp.
export function getToken() {
    const current = localStorage.getItem(TOKEN_KEY);
    if (current) return current;
    for (const key of LEGACY_TOKEN_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
            localStorage.setItem(TOKEN_KEY, legacy);
            localStorage.removeItem(key);
            return legacy;
        }
    }
    return null;
}

export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
    for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
}

export function isAuthed() {
    return Boolean(getToken());
}

// JWT: header.payload.signature — payload là base64url, không cần verify ở client
// (server vẫn kiểm tra lại mọi request). Chỉ dùng để hiển thị tên/quyền tức thời.
export function tokenPayload() {
    const token = getToken();
    if (!token) return null;
    const part = token.split('.')[1];
    if (!part) return null;
    try {
        return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    } catch (err) {
        return null;
    }
}

// Trang đăng ký cách xử lý "phiên hết hạn" của riêng nó (toast, redirect, modal...)
export function onUnauthorized(handler) {
    unauthorizedHandler = handler;
}

export function authHeaders(extra = {}) {
    const token = getToken();
    return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// Chỉ 401 kèm code 'auth' mới là "phiên đăng nhập không còn dùng được": token thiếu,
// hết hạn hoặc đã bị thu hồi (đổi mật khẩu, đổi quyền, admin đặt lại mật khẩu).
// 403 là lỗi quyền hạn (vượt hạn mức bài, không được quản trị...) — giữ token lại,
// nếu không một lần bấm sai sẽ đá người dùng đang đăng nhập ra ngoài.
function handleUnauthorized(status, data) {
    if (status !== 401 || !data || data.code !== 'auth') return false;
    clearToken();
    if (unauthorizedHandler) unauthorizedHandler(data);
    return true;
}

async function toResult(res) {
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (err) { /* HTML/404 từ proxy */ }
    return { status: res.status, ok: res.ok, data, text, headers: res.headers };
}

// request(): gọi API, KHÔNG ném lỗi — trang nào cần hành vi riêng thì tự đọc status.
export async function request(method, route, { body, headers, raw } = {}) {
    const isPayload = body !== undefined && body !== null && raw !== true;
    const res = await fetch(route, {
        method,
        headers: isPayload
            ? authHeaders({ 'Content-Type': 'application/json', ...headers })
            : authHeaders(headers),
        body: raw === true ? body : (isPayload ? JSON.stringify(body) : undefined)
    });
    const out = await toResult(res);
    if (!out.ok) handleUnauthorized(out.status, out.data);
    return out;
}

// api(): bản gọn cho các trang — trả data, ném ApiError khi HTTP lỗi hoặc success:false
export async function api(method, route, { body, headers, raw } = {}) {
    const out = await request(method, route, { body, headers, raw });
    if (!out.ok) {
        throw new ApiError((out.data && out.data.error) || `Lỗi ${out.status}`, out.status, out.data);
    }
    if (out.data && out.data.success === false) {
        throw new ApiError(out.data.error || 'Yêu cầu không thành công', out.status, out.data);
    }
    return out.data;
}

export const get = (route) => api('GET', route);
export const post = (route, body) => api('POST', route, { body });
export const patch = (route, body) => api('PATCH', route, { body });
export const put = (route, body) => api('PUT', route, { body });
export const del = (route, body) => api('DELETE', route, { body });
