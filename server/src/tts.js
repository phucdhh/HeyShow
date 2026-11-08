// Kho âm thanh của thẻ <tts>: HeyTTS chỉ là bộ chuyển đổi, HeyShow giữ file Opus và
// phục vụ lại. Mọi đoạn chữ + giọng + tốc độ được băm thành một khoá nội dung; lần đầu
// gọi HeyTTS (cache miss), lần thứ hai trở đi trả thẳng file đã lưu (cache hit).
//
// Hai file cho mỗi khoá trong thư mục dữ liệu:
//   <hash>.json   mô tả việc đọc (chữ, giọng, tốc độ) — có mặt ngay lúc publish/export
//   <hash>.opus   âm thanh — chỉ sinh ra khi người xem bấm nghe lần đầu
//
// Bài đã publish chạy ở origin mờ (CSP sandbox) nên không có token đăng nhập. Nó chỉ được
// phép xin đúng những việc đã đăng ký trong <hash>.json; muốn đọc một đoạn chữ tuỳ ý thì
// phải là người dùng đã đăng nhập (preview trong editor). Nhờ vậy thẻ <tts> không mở ra
// một API text-to-speech công khai cho bất kỳ ai.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { atomicWrite } = require('./storage');

// Đổi số này khi cách chuẩn hoá chữ/giọng/tốc độ thay đổi: bài đã publish vẫn giữ hash cũ
// trong file, còn việc đăng ký mới sinh hash mới thay vì trộn hai thế hệ cache.
const CACHE_VERSION = 1;
const DEFAULT_VOICE = 'diem_trinh';
const SPEED_MIN = 0.5;
const SPEED_MAX = 2;
const MAX_TRANSPORT_BYTES = 20 * 1024 * 1024;
const HASH_RE = /^[a-f0-9]{32}$/;
const VOICE_RE = /^[a-z][a-z0-9_]{1,39}$/;

function loi(status, message) {
    return Object.assign(new Error(message), { status });
}

function chuanHoaChu(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function chuanHoaTocDo(value) {
    // Nhận cả "1,2" vì bàn phím tiếng Việt hay gõ dấu phẩy thập phân.
    const so = Number(String(value == null ? '' : value).replace(',', '.'));
    if (!Number.isFinite(so) || so <= 0) return 1;
    return Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(so * 100) / 100));
}

// Hội thoại nhiều giọng: mỗi lượt mở đầu bằng [giọng], chữ còn lại là lời của lượt đó.
// Dùng làm dấu phân cách (không bám theo dòng) vì runtime đã gộp khoảng trắng khi đọc lại.
const VOICE_MARKER = /\[([a-z][a-z0-9_]{1,39})\]/gi;

function tachHoiThoai(raw) {
    const chu = String(raw == null ? '' : raw);
    const moc = [...chu.matchAll(VOICE_MARKER)];
    if (!moc.length) return null;
    const luot = [];
    const truoc = chuanHoaChu(chu.slice(0, moc[0].index));
    if (truoc) luot.push({ voice: null, text: truoc });
    for (let i = 0; i < moc.length; i++) {
        const dau = moc[i].index + moc[i][0].length;
        const cuoi = i + 1 < moc.length ? moc[i + 1].index : chu.length;
        const text = chuanHoaChu(chu.slice(dau, cuoi));
        if (text) luot.push({ voice: moc[i][1].toLowerCase(), text });
    }
    return luot.length ? luot : null;
}

function docThuocTinh(attrs, ten) {
    const re = new RegExp(`(?:^|\\s)${ten}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
    const m = re.exec(attrs || '');
    return m ? (m[1] ?? m[2] ?? m[3] ?? '') : '';
}

function createTts(options = {}) {
    const dir = options.dir;
    const url = String(options.url || '').trim().replace(/\/+$/, '');
    const apiKey = String(options.apiKey || '').trim();
    const timeoutMs = Number(options.timeoutMs || 120000);
    const maxChars = Number(options.maxChars || 5000);
    const logger = options.logger || console;
    const configured = Boolean(url);

    if (!dir) throw new Error('createTts cần thư mục lưu âm thanh');

    const inflight = new Map();

    function jobPath(hash) {
        return path.join(dir, `${hash}.json`);
    }

    function audioPath(hash) {
        return path.join(dir, `${hash}.opus`);
    }

    // Job chỉ gồm đúng những trường ảnh hưởng tới âm thanh. createdAt/hash nằm ngoài
    // phần được băm để hai lần đăng ký cùng nội dung ra cùng một khoá.
    function normalize(input) {
        input = input || {};
        const tocDo = chuanHoaTocDo(input.speed);

        // Hội thoại: ưu tiên mảng segments (client hiện đại), nếu không thì tách marker [giọng].
        let segments = null;
        if (Array.isArray(input.segments) && input.segments.length) {
            segments = input.segments.map((s) => ({
                text: s && s.text,
                voice: s && s.voice,
                speed: s && s.speed != null ? s.speed : input.speed
            }));
        } else {
            const tach = tachHoiThoai(input.text);
            if (tach) {
                segments = tach.map((s) => ({
                    text: s.text,
                    voice: s.voice || input.voice,
                    speed: input.speed
                }));
            }
        }

        if (segments) {
            const sach = [];
            let tong = 0;
            for (const s of segments) {
                const text = chuanHoaChu(s && s.text);
                if (!text) continue;
                const voice = (chuanHoaChu(s && s.voice) || DEFAULT_VOICE).toLowerCase();
                if (!VOICE_RE.test(voice)) {
                    return { ok: false, error: `Giọng đọc "${voice}" không hợp lệ.` };
                }
                tong += text.length;
                sach.push({ text, voice, speed: chuanHoaTocDo(s && s.speed != null ? s.speed : tocDo) });
            }
            if (!sach.length) return { ok: false, error: 'Thẻ <tts> không có nội dung để đọc.' };
            if (tong > maxChars) {
                return { ok: false, error: `Hội thoại dài ${tong} ký tự, vượt giới hạn ${maxChars} của HeyTTS.` };
            }
            return { ok: true, job: { v: CACHE_VERSION, segments: sach } };
        }

        const text = chuanHoaChu(input.text);
        if (!text) return { ok: false, error: 'Thẻ <tts> không có nội dung để đọc.' };
        if (text.length > maxChars) {
            return { ok: false, error: `Đoạn chữ dài ${text.length} ký tự, vượt giới hạn ${maxChars} của HeyTTS.` };
        }

        const voice = (chuanHoaChu(input.voice) || DEFAULT_VOICE).toLowerCase();
        if (!VOICE_RE.test(voice)) {
            return { ok: false, error: `Giọng đọc "${voice}" không hợp lệ.` };
        }

        return { ok: true, job: { v: CACHE_VERSION, text, voice, speed: tocDo } };
    }

    function hashOf(job) {
        const payload = Array.isArray(job.segments)
            ? {
                v: job.v,
                segments: job.segments.map((s) => ({ text: s.text, voice: s.voice, speed: s.speed }))
            }
            : { v: job.v, text: job.text, voice: job.voice, speed: job.speed };
        return crypto.createHash('sha256')
            .update(JSON.stringify(payload))
            .digest('hex')
            .slice(0, 32);
    }

    // Đăng ký việc đọc để origin mờ (bài đã publish) được phép xin âm thanh theo hash.
    // Ghi một lần là đủ: cùng nội dung thì cùng hash, lần sau bỏ qua.
    function register(job) {
        const hash = hashOf(job);
        fs.mkdirSync(dir, { recursive: true });
        const file = jobPath(hash);
        if (!fs.existsSync(file)) {
            atomicWrite(file, JSON.stringify({ ...job, hash, createdAt: Date.now() }, null, 2));
        }
        return hash;
    }

    // Dùng ở buildFullHtml: nhận nguyên văn chữ + chuỗi thuộc tính của thẻ, trả về chuỗi
    // thuộc tính bổ sung (data-tts-hash) hoặc lỗi để runtime hiện ngay trong slide.
    function registerFromAttrs(text, attrs) {
        try {
            const input = {
                text,
                voice: docThuocTinh(attrs, 'data-voice') || docThuocTinh(attrs, 'voice'),
                speed: docThuocTinh(attrs, 'data-speed') || docThuocTinh(attrs, 'speed')
            };
            const kq = normalize(input);
            if (!kq.ok) return { error: kq.error };
            return { hash: register(kq.job) };
        } catch (err) {
            logger.error('[tts] Không đăng ký được việc đọc:', err.message);
            return { error: 'Không lưu được thông tin âm thanh trên máy chủ.' };
        }
    }

    function readJob(hash) {
        if (!HASH_RE.test(String(hash || ''))) return null;
        let rec;
        try {
            rec = JSON.parse(fs.readFileSync(jobPath(hash), 'utf-8'));
        } catch (err) {
            return null;
        }
        if (!rec || rec.v !== CACHE_VERSION) return null;
        let job;
        if (Array.isArray(rec.segments)) {
            const sach = rec.segments
                .filter((s) => s && typeof s.text === 'string'
                    && typeof s.voice === 'string' && Number.isFinite(s.speed))
                .map((s) => ({ text: s.text, voice: s.voice, speed: s.speed }));
            if (!sach.length) return null;
            job = { v: rec.v, segments: sach };
        } else if (typeof rec.text === 'string' && typeof rec.voice === 'string'
            && Number.isFinite(rec.speed)) {
            job = { v: rec.v, text: rec.text, voice: rec.voice, speed: rec.speed };
        } else {
            return null;
        }
        // Khoá phải khớp nội dung: file bị sửa tay thì đừng đọc theo nó.
        return hashOf(job) === hash ? job : null;
    }

    function hasAudio(hash) {
        return HASH_RE.test(String(hash || '')) && fs.existsSync(audioPath(hash));
    }

    // Trả đường dẫn tuyệt đối cho route phục vụ file; tên lạ hay hash chưa có âm thanh
    // đều trả null để route chỉ việc 404.
    function audioFile(name) {
        const m = /^([a-f0-9]{32})\.opus$/.exec(String(name || ''));
        if (!m) return null;
        const file = audioPath(m[1]);
        return fs.existsSync(file) ? file : null;
    }

    function isInflight(hash) {
        return inflight.has(hash);
    }

    function whenReady(hash) {
        return inflight.get(hash) || Promise.resolve();
    }

    function mapError(err) {
        if (err && err.status) return err;
        const code = err && err.code;
        if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ECONNRESET') {
            return loi(504, 'HeyTTS phản hồi quá lâu. Thử lại sau ít giây.');
        }
        if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
            return loi(503, 'Không kết nối được HeyTTS. Kiểm tra máy chủ đọc đã chạy chưa.');
        }

        const status = err && err.response && err.response.status;
        if (!status) return loi(502, `Không gọi được HeyTTS: ${(err && err.message) || 'lỗi không rõ'}`);

        let detail = '';
        try {
            detail = JSON.parse(Buffer.from(err.response.data).toString('utf8')).detail || '';
        } catch (parseErr) { /* thân lỗi không phải JSON */ }

        if (status === 400) {
            return loi(400, typeof detail === 'string' && detail
                ? `HeyTTS: ${detail}`
                : 'HeyTTS từ chối yêu cầu này (kiểm tra giọng đọc).');
        }
        if (status === 401 || status === 403) return loi(502, 'Khoá HeyTTS trên máy chủ không hợp lệ.');
        if (status === 422) return loi(400, 'Đoạn chữ quá dài hoặc tốc độ đọc ngoài khoảng HeyTTS cho phép.');
        if (status === 503) return loi(503, 'HeyTTS chưa nạp xong mô hình đọc. Thử lại sau ít giây.');
        return loi(502, `HeyTTS lỗi ${status}.`);
    }

    async function goiHeyTts(job) {
        const payload = Array.isArray(job.segments)
            ? { segments: job.segments }
            : { text: job.text, voice: job.voice, speed: job.speed };
        let res;
        try {
            res = await axios.post(`${url}/v1/tts`, payload, {
                headers: {
                    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: timeoutMs,
                maxContentLength: MAX_TRANSPORT_BYTES
            });
        } catch (err) {
            throw mapError(err);
        }

        const buffer = Buffer.from(res.data || []);
        if (buffer.length < 4 || buffer.toString('latin1', 0, 4) !== 'OggS') {
            throw loi(502, 'HeyTTS trả về dữ liệu không phải Ogg Opus.');
        }
        return buffer;
    }

    // Cache miss -> gọi HeyTTS, ghi file. Hai request cùng một đoạn chữ chờ chung một lần
    // tổng hợp: gallery có 40 học sinh bấm cùng lúc cũng chỉ đánh thức GPU một lần.
    async function synthesize(job) {
        const hash = hashOf(job);
        if (hasAudio(hash)) return { hash, cached: true };

        const dangChay = inflight.get(hash);
        if (dangChay) {
            await dangChay;
            return { hash, cached: true };
        }
        if (!configured) {
            throw loi(503, 'Máy chủ chưa cấu hình HeyTTS (HEYTTS_URL).');
        }

        const viec = (async () => {
            register(job); // âm thanh sinh từ preview vẫn có mô tả để lần sau tra theo hash
            const buffer = await goiHeyTts(job);
            fs.mkdirSync(dir, { recursive: true });
            atomicWrite(audioPath(hash), buffer);
        })();

        inflight.set(hash, viec);
        try {
            await viec;
        } finally {
            inflight.delete(hash);
        }
        return { hash, cached: false };
    }

    // Đăng ký sẵn các đoạn mẫu trong trang /help và /templates để người chưa đăng nhập
    // vẫn bấm nghe thử được. Chỉ những câu công khai trong file mẫu, không mở thêm đường
    // tạo âm thanh tuỳ ý.
    function registerSamples(file) {
        let ds;
        try {
            ds = JSON.parse(fs.readFileSync(file, 'utf-8'));
        } catch (err) {
            if (err.code !== 'ENOENT') logger.warn('[tts] Không đọc được mẫu âm thanh:', err.message);
            return 0;
        }
        if (!Array.isArray(ds)) return 0;
        let so = 0;
        for (const item of ds) {
            const kq = normalize(item);
            if (!kq.ok) {
                logger.warn('[tts] Mẫu âm thanh bị bỏ qua:', kq.error);
                continue;
            }
            try {
                register(kq.job);
                so++;
            } catch (err) {
                logger.warn('[tts] Không đăng ký được mẫu âm thanh:', err.message);
            }
        }
        return so;
    }

    if (!configured) {
        logger.warn('[tts] Chưa đặt HEYTTS_URL — thẻ <tts> sẽ báo lỗi khi người xem bấm nghe.');
    }

    return {
        configured,
        normalize,
        hashOf,
        register,
        registerFromAttrs,
        readJob,
        hasAudio,
        audioFile,
        isInflight,
        whenReady,
        synthesize,
        registerSamples
    };
}

module.exports = { createTts, CACHE_VERSION, DEFAULT_VOICE, SPEED_MIN, SPEED_MAX };
