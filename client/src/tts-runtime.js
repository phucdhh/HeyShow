// Runtime của thẻ <tts> — bản duy nhất, dùng cho cả ba nơi trình bày slide:
// bản publish/export (server/src/slide-parts.js đọc file này, cắt nguyên văn TTS_BOC và
// TTS_MOUNT để nội tuyến vào file HTML), khung Preview trong editor (client/src/main.js)
// và preview ở /templates + /help (client/src/reveal-preview.js).
//
// Vì server cắt chuỗi chứ không import, hai hàm phải tự chứa: không tham chiếu biến ngoài,
// mọi thứ cần đều đi qua tham số, và TTS_MOUNT không được có chuỗi "</scr" (nó nằm gọn
// trong thẻ <script> của bài publish). Dấu } đóng mỗi hàm phải nằm ở CỘT 0 — đó là mốc để
// slide-parts.js cắt, nên hai hàm này không được đặt trong khối nào khác.
//
// CÁCH <tts> ĐƯỢC XỬ LÝ. Người dùng viết, bên trong một slide:
//
//     <tts data-voice="diem_trinh" data-speed="1">
//       Xin chào các em, hôm nay chúng ta học định lí Pythagore.
//     </tts>
//
// Nội dung thẻ là CHỮ THUẦN, không phải HTML. Nó có thể chứa dấu `<` (ví dụ "a < b"),
// nên TTS_BOC đổi cặp thẻ sang <script type="text/tts"> — một phần tử raw-text: chữ giữ
// nguyên từng ký tự và trình duyệt không chạy. TTS_MOUNT sau đó thay từng ô bằng một nút
// "Nghe"; bấm lần đầu mới gọi HeyShow tạo âm thanh (lazy), các lần sau lấy bản đã lưu
// trong data/tts/ (cache).
//
// Thẻ không có nút phát lúc trang tải: gallery mở 12 iframe một lượt, tạo sẵn âm thanh
// cho tất cả là bắt GPU của máy chủ chạy oan. Chỉ một cú bấm của người xem mới đánh thức
// HeyTTS, và một đoạn chữ giống nhau chỉ được tổng hợp đúng một lần.

export const TTS_HOME = 'https://heyshow.pedu.vn';

// Dấu nhận diện mảnh runtime trong file slide: server, script vá bài đã publish và test
// cùng dò chuỗi này để biết bài đã có runtime hay chưa.
export const TTS_MARKER = 'data-heyshow-tts';

// type của cái script mà một thẻ <tts> biến thành — cũng là khoá để runtime tìm ô.
export const TTS_TYPE = 'text/tts';

// Giọng mặc định là giọng Việt: phần lớn bài trên HeyShow là tiếng Việt. Muốn đọc tiếng
// Anh thì đặt data-voice="af_heart" (hoặc một giọng Anh khác trong danh sách của HeyTTS).
export const TTS_DEFAULT_VOICE = 'diem_trinh';

// HeyTTS chỉ nhận speed trong khoảng này; ngoài khoảng thì server đưa về sát biên.
export const TTS_SPEED_MIN = 0.5;
export const TTS_SPEED_MAX = 2;

export const TTS_CSS = `
        /* Một thẻ <tts> sau khi dựng: nút "Nghe" (hoặc thanh audio khi đã có âm thanh),
           dòng chú thích giọng đọc, và ô lỗi hiện ngay trong slide. */
        .heyshow-tts {
            display: flex; flex-wrap: wrap; align-items: center; gap: .3em .6em;
            margin: .45em 0; font-family: inherit;
        }
        .heyshow-tts-play {
            display: inline-flex; align-items: center; gap: .4em;
            padding: .32em .95em; border: 1px solid currentColor; border-radius: 999px;
            background: transparent; color: inherit; font: inherit; line-height: 1.4;
            cursor: pointer;
        }
        .heyshow-tts-play:hover { opacity: .82; }
        .heyshow-tts-play:disabled { opacity: .6; cursor: progress; }
        /* Icon-only: nút tròn gọn thay vì viên thuốc dài. */
        .heyshow-tts-play.chi-bieu-tuong { padding: .5em; border-radius: 50%; }
        /* Trạng thái đang phát có thêm vòng ngoài, không đổi màu người dùng đã chọn. */
        .heyshow-tts-play.dang-phat { outline: 2px solid currentColor; outline-offset: 2px; }
        .heyshow-tts-icon { display: inline-flex; width: 1em; height: 1em; }
        .heyshow-tts-icon svg { width: 100%; height: 100%; display: block; }
        .heyshow-tts-audio { display: block; width: 100%; max-width: 620px; height: 40px; }
        .heyshow-tts-status { font-size: .5em; opacity: .75; }
        .heyshow-tts-caption { flex-basis: 100%; font-size: .42em; opacity: .62; }
        .heyshow-tts-loi {
            flex-basis: 100%; padding: .3em .6em; border-radius: 8px;
            background: #fef2f2; color: #b91c1c; border: 1px dashed #dc2626;
            font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap;
        }
        /* thumbnail của gallery là iframe ?embed=1 — 12 nút "Nghe" trên lưới ảnh chỉ tổ rối */
        .heyshow-embed .heyshow-tts { display: none !important; }`;

// <tts ...> … </tts> -> <script type="text/tts" …> … </script>. Thuộc tính của thẻ
// (data-voice, data-speed) đi theo nguyên văn vì chỉ tên thẻ bị thay.
//
// ky (không bắt buộc) là hàm của server: nhận (chữ, chuỗi thuộc tính) và trả về chuỗi
// thuộc tính bổ sung — server dùng nó để đăng ký đoạn chữ vào kho cache và gắn
// data-tts-hash. Preview của client gọi không có ky nên thẻ giữ nguyên thuộc tính người dùng.
//
// Thẻ mở KHÔNG có thẻ đóng thì để nguyên: biến nó thành script mà không đóng nổi sẽ nuốt
// cả phần còn lại của bài — thà còn nhìn thấy chữ thô, tab Debug đã báo thiếu thẻ đóng rồi.
export function TTS_BOC(ma, ky) {
    const LOAI = 'text/tts';
    const van = String(ma);
    const theMo = /<\s*tts\b([^>]*)>/gi;
    const theDong = /<\s*\/\s*tts\s*>/gi;
    const soMo = (van.match(theMo) || []).length;
    const soDong = (van.match(theDong) || []).length;
    if (soMo === 0 || soMo !== soDong) return van;

    const dong = [];
    let tim;
    while ((tim = theDong.exec(van)) !== null) dong.push([tim.index, tim.index + tim[0].length]);

    let ketqua = '', con = 0, thuTuDong = 0, mo;
    while ((mo = theMo.exec(van)) !== null) {
        if (mo.index < con) continue;            // thẻ mở nằm trong khối tts trước đó
        ketqua += van.slice(con, mo.index);
        con = mo.index + mo[0].length;
        if (thuTuDong >= dong.length || dong[thuTuDong][0] < con) {
            ketqua += mo[0];                     // không kiếm được thẻ đóng cặp
            continue;
        }
        const [tu, den] = dong[thuTuDong++];
        const noi = van.slice(con, tu);
        // data-tts-hash / data-tts-error là thuộc tính của hệ thống. Người dùng gõ tay vào
        // thẻ thì bỏ đi, nếu không sẽ có hai thuộc tính trùng tên và runtime đọc nhầm cái đầu.
        const thuocTinh = String(mo[1] || '').replace(
            /\s+data-tts-(?:hash|error)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ''
        );
        const them = ky ? (ky(noi, thuocTinh) || '') : '';
        ketqua += '<script type="' + LOAI + '"' + thuocTinh + them + '>';
        ketqua += noi;
        ketqua += '</script>';
        con = den;
        theMo.lastIndex = con;
    }
    return ketqua + van.slice(con);
}

// Dựng nút "Nghe" cho từng ô chưa xử lý. Luồng một lần bấm:
//   1. Gửi POST /api/tts/speak. Bài đã publish gửi data-tts-hash (server tra kho cache);
//      preview gửi thẳng chữ + giọng + tốc độ kèm token đăng nhập của editor.
//   2. Server trả về url của file .opus. Lần đầu (cache miss) server gọi HeyTTS rồi ghi
//      file; lần sau (cache hit) trả lời gần như tức thì.
//   3. Gắn url vào thẻ audio và phát. Trình duyệt tự cache file theo URL bất biến đó.
export function TTS_MOUNT(GOC, NHA) {
    const LOAI = 'text/tts';
    const NHA_GOC = NHA || 'https://heyshow.pedu.vn';
    // Bài publish mở bằng https -> URL tương đối, cùng máy chủ. File export mở bằng
    // file:// (không có /api) -> quay về máy gốc công khai, giống cách <wsp> làm với /wsp/.
    const GOC_API = GOC || (/^https?:$/.test(location.protocol) ? '' : NHA_GOC);
    const GIONG_MAC_DINH = 'diem_trinh';
    const TOC_DO_MIN = 0.5, TOC_DO_MAX = 2;
    const TEN_GIONG = {
        diem_trinh: 'Diễm Trinh', duc_duy: 'Đức Duy', mai_linh: 'Mai Linh',
        manh_dung: 'Mạnh Dũng', ngoc_huyen: 'Ngọc Huyền', phat_tai: 'Phát Tài',
        thuc_trinh: 'Thục Trinh'
    };
    const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
    const CO_SAN = {
        small: '0.65em', nho: '0.65em', sm: '0.65em',
        normal: '1em', vua: '1em', md: '1em',
        large: '1.3em', lon: '1.3em', lg: '1.3em'
    };
    const daLam = new WeakSet();

    function docThuocTinh(o, ten) {
        const giaTri = o.getAttribute(ten);
        return giaTri === null ? '' : String(giaTri).trim();
    }

    // Cờ không có giá trị (`data-icon-only`) cũng là bật; viết rõ false/0/no/off là tắt.
    function coBat(o, ten) {
        if (!o.hasAttribute(ten)) return false;
        return !/^(0|false|no|off)$/i.test(docThuocTinh(o, ten));
    }

    function docTocDo(o) {
        const so = Number((docThuocTinh(o, 'data-speed') || docThuocTinh(o, 'speed')).replace(',', '.'));
        if (!isFinite(so) || so <= 0) return 1;
        return Math.min(TOC_DO_MAX, Math.max(TOC_DO_MIN, Math.round(so * 100) / 100));
    }

    // Chỉ preview mới đọc được localStorage: bài publish chạy CSP sandbox (origin mờ) nên
    // mọi lần chạm vào đây đều ném SecurityError — bắt lại và đi đường công khai bằng hash.
    function layToken() {
        try { return window.localStorage.getItem('heyshow_token'); } catch (err) { return null; }
    }

    function hienLoi(hop, thongDiep) {
        let o = hop.querySelector('.heyshow-tts-loi');
        if (!o) {
            o = document.createElement('div');
            o.className = 'heyshow-tts-loi';
            hop.appendChild(o);
        }
        o.textContent = thongDiep;
    }

    function ganMot(o) {
        const chu = String(o.textContent || '').replace(/\s+/g, ' ').trim();
        const laHoiThoai = /\[[a-z][a-z0-9_]{1,39}\]/i.test(chu);
        const giong = (docThuocTinh(o, 'data-voice') || docThuocTinh(o, 'voice') || GIONG_MAC_DINH).toLowerCase();
        const tocDo = docTocDo(o);
        const hash = docThuocTinh(o, 'data-tts-hash');
        const loiSan = docThuocTinh(o, 'data-tts-error');

        const hop = document.createElement('div');
        hop.className = 'heyshow-tts';

        if (loiSan) {
            hienLoi(hop, loiSan);
            o.parentNode.replaceChild(hop, o);
            return;
        }
        if (!chu) {
            hienLoi(hop, 'Thẻ <tts> không có nội dung để đọc.');
            o.parentNode.replaceChild(hop, o);
            return;
        }

        // Tuỳ biến hiển thị. Mặc định chỉ có nút (thanh audio ẩn): nút đã là nút phát/tạm
        // dừng, thanh audio của trình duyệt lại co rất nhỏ theo phép thu nhỏ của slide.
        const nhanGoc = docThuocTinh(o, 'data-label') || 'Nghe';
        const chiBieuTuong = coBat(o, 'data-icon-only');
        const hienThanhAudio = coBat(o, 'data-controls');
        // Chỉ có biểu tượng thì mặc định cũng ẩn dòng "Giọng … · 1×" cho thật gọn; muốn
        // giữ dòng đó thì ghi rõ data-caption="true".
        const hienChuThich = o.hasAttribute('data-caption') ? coBat(o, 'data-caption') : !chiBieuTuong;
        const mauNut = docThuocTinh(o, 'data-color');
        const nenNut = docThuocTinh(o, 'data-bg');
        const coNut = docThuocTinh(o, 'data-size');

        const nut = document.createElement('button');
        nut.type = 'button';
        nut.className = 'heyshow-tts-play';
        if (chiBieuTuong) nut.classList.add('chi-bieu-tuong');
        if (mauNut) nut.style.color = mauNut;
        if (nenNut) nut.style.background = /^(none|transparent)$/i.test(nenNut) ? 'transparent' : nenNut;
        if (coNut) nut.style.fontSize = CO_SAN[coNut.toLowerCase()] || coNut;

        const bieuTuong = document.createElement('span');
        bieuTuong.className = 'heyshow-tts-icon';
        bieuTuong.setAttribute('aria-hidden', 'true');
        const oNhan = document.createElement('span');
        oNhan.className = 'heyshow-tts-nhan';
        if (chiBieuTuong) oNhan.style.display = 'none';
        nut.appendChild(bieuTuong);
        nut.appendChild(oNhan);

        const audio = document.createElement('audio');
        audio.className = 'heyshow-tts-audio';
        audio.controls = true;
        audio.preload = 'none';
        audio.style.display = 'none';

        const trangThai = document.createElement('span');
        trangThai.className = 'heyshow-tts-status';
        trangThai.setAttribute('aria-live', 'polite');

        const chuThich = document.createElement('div');
        chuThich.className = 'heyshow-tts-caption';
        chuThich.textContent = laHoiThoai
            ? `Hội thoại · ${tocDo}×`
            : `Giọng ${TEN_GIONG[giong] || giong} · ${tocDo}×`;
        if (!hienChuThich) chuThich.style.display = 'none';

        hop.appendChild(nut);
        hop.appendChild(audio);
        hop.appendChild(trangThai);
        hop.appendChild(chuThich);

        let dangChay = false;
        let daCo = false;

        function datNhan(text) {
            oNhan.textContent = text;
            nut.setAttribute('aria-label', text);
            nut.setAttribute('title', text);
        }

        // Hai trạng thái dùng hai biểu tượng khác hẳn nhau (tam giác / hai vạch) và thêm
        // vòng ngoài khi đang phát — nút icon-only vẫn đọc được trạng thái, không cần chữ.
        function capNhatNut() {
            if (dangChay) return;
            const dangPhat = daCo && !audio.paused;
            bieuTuong.innerHTML = dangPhat ? ICON_PAUSE : ICON_PLAY;
            nut.classList.toggle('dang-phat', dangPhat);
            datNhan(dangPhat ? 'Tạm dừng' : nhanGoc);
        }

        bieuTuong.innerHTML = ICON_PLAY;
        datNhan(nhanGoc);
        audio.addEventListener('play', capNhatNut);
        audio.addEventListener('pause', capNhatNut);
        audio.addEventListener('ended', capNhatNut);

        nut.addEventListener('click', async () => {
            if (dangChay) return;
            if (daCo) {
                try {
                    if (audio.paused) {
                        if (audio.ended) audio.currentTime = 0;
                        await audio.play();
                    } else {
                        audio.pause();
                    }
                } catch (err) {
                    hienLoi(hop, 'Không phát được âm thanh.');
                }
                capNhatNut();
                return;
            }
            dangChay = true;
            nut.disabled = true;
            datNhan('Đang tạo…');
            trangThai.textContent = 'Đang tạo âm thanh…';
            const loiCu = hop.querySelector('.heyshow-tts-loi');
            if (loiCu) loiCu.remove();

            try {
                const body = hash ? { hash } : { text: chu, voice: giong, speed: tocDo };
                const token = layToken();

                async function gui(coToken) {
                    const headers = { 'Content-Type': 'application/json' };
                    if (coToken) headers.Authorization = `Bearer ${token}`;
                    const r = await fetch(`${GOC_API}/api/tts/speak`, {
                        method: 'POST', headers, body: JSON.stringify(body)
                    });
                    return { res: r, data: await r.json().catch(() => null) };
                }

                let kq = await gui(Boolean(token) && !hash);
                // Token cũ còn trong máy (phiên đã hết hạn, đổi mật khẩu…) không được chặn
                // mẫu công khai ở /help và /templates: thử lại đường không token. Nếu vẫn
                // hỏng thì giữ lỗi phiên để editor biết mà đăng nhập lại.
                if (kq.res.status === 401 && token && !hash) {
                    const loiPhien = kq.data;
                    const lai = await gui(false);
                    if (lai.res.ok) kq = lai;
                    else throw new Error((loiPhien && loiPhien.error) || 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.');
                }
                const res = kq.res;
                const data = kq.data;
                if (!res.ok || !data || data.success !== true || !data.url) {
                    throw new Error((data && data.error) || `Không tạo được âm thanh (lỗi ${res.status})`);
                }

                audio.src = GOC_API + data.url;
                if (hienThanhAudio) audio.style.display = '';
                daCo = true;
                nut.disabled = false;
                trangThai.textContent = data.cached ? '' : 'Đã tạo xong — lần sau phát ngay.';
                if (!data.cached) {
                    setTimeout(() => { trangThai.textContent = ''; }, 5000);
                }
                // Giữ thao tác phát trong cùng một lượt bấm khi trình duyệt cho phép; nếu bị
                // chặn (chủ yếu Safari sau khi chờ mạng) thì nút (hoặc thanh audio) vẫn ở đó.
                try {
                    await audio.play();
                } catch (err) {
                    trangThai.textContent = hienThanhAudio
                        ? 'Bấm nút phát trên thanh âm thanh để nghe.'
                        : 'Bấm lại nút Nghe để phát.';
                }
            } catch (loi) {
                trangThai.textContent = '';
                hienLoi(hop, `Không tạo được âm thanh: ${(loi && loi.message) || loi}`);
                nut.disabled = false;
                datNhan(nhanGoc);
            } finally {
                dangChay = false;
                capNhatNut();
            }
        });

        audio.addEventListener('error', () => {
            if (audio.getAttribute('src')) hienLoi(hop, 'Không phát được tệp âm thanh vừa tạo.');
        });

        o.parentNode.replaceChild(hop, o);
    }

    function ganTatCa() {
        document.querySelectorAll(`script[type="${LOAI}"]`).forEach((o) => {
            if (daLam.has(o)) return;
            daLam.add(o);
            ganMot(o);
        });
    }

    function khiSanSang() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', khiSanSang);
            return;
        }
        ganTatCa();
        if (window.Reveal && Reveal.on) {
            Reveal.on('slidechanged', ganTatCa);
            Reveal.on('ready', ganTatCa);
        }
        // Bài trong iframe của gallery/templates, hay tab Preview bị ẩn: nội dung có thể
        // tới muộn sau DOMContentLoaded (srcdoc, document.write) nên theo dõi thêm.
        new MutationObserver(ganTatCa).observe(document.documentElement, { childList: true, subtree: true });
    }

    khiSanSang();
}

// Ba mảnh ghép vào trang slide, đúng khuôn buildFullHtml của server: STYLE nằm trong
// <head>, SCRIPT nằm cuối <body>, BOC chạy trên nội dung bài trước khi nó vào DOM.
export const TTS_STYLE = `<style>${TTS_CSS}
    </style>`;

// GOC: gốc gọi API. Bản publish truyền "" (URL tương đối); preview trong editor/help
// truyền origin của trang app vì tài liệu preview có thể là srcdoc (location "about:").
export function TTS_SCRIPT(GOC) {
    return `<script ${TTS_MARKER}="runtime">(${String(TTS_MOUNT)})(${JSON.stringify(GOC || '')}, ${JSON.stringify(TTS_HOME)})</script>`;
}
