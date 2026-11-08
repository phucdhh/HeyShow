// Runtime của thẻ <wsp> — bản duy nhất, dùng cho cả ba nơi trình bày slide:
// bản publish/export (server/src/slide-parts.js đọc file này, cắt nguyên văn hai hàm
// WSP_BOC và WSP_MOUNT để nội tuyến vào file HTML), khung Preview trong editor
// (client/src/main.js) và preview ở /templates + /help (client/src/reveal-preview.js).
//
// Vì server cắt chuỗi chứ không import, hai hàm phải tự chứa: không tham chiếu biến ngoài,
// mọi thứ cần đều đi qua tham số, và bên trong không được có chuỗi "</scr" (nó nằm gọn
// trong thẻ <script> của bài publish). Dấu } đóng mỗi hàm phải nằm ở CỘT 0 — đó là mốc để
// slide-parts.js cắt, nên hai hàm này không được đặt trong khối nào khác.
//
// CÁCH <wsp> ĐƯỢC XỬ LÝ. Người dùng copy TOÀN BỘ nội dung một file .json của Web Sketchpad
// (embed-objects-examples/WSP/wsp-examples) rồi dán vào giữa cặp thẻ:
//
//     <wsp>
//       { "metadata": { "width": 600, "height": 400, ... }, "resources": {}, "pages": [...] }
//     </wsp>
//
// Cũng như <jsxgraph>, HTML không phải vùng chứa code: dấu `<` trong dữ liệu bị trình duyệt
// đọc thành thẻ HTML và nuốt nốt phần còn lại của slide. WSP_BOC đổi cặp thẻ lấy nhau sang
// <script type="text/wsp">, một phần tử raw-text — JSON giữ nguyên từng ký tự và trình duyệt
// không đem chạy nó. WSP_MOUNT sau đó dựng khung cho từng ô rồi nạp Web Sketchpad.
//
// THƯ VIỆN NẰM TRÊN MÁY CHỦ CỦA MÌNH. Web Sketchpad không có CDN (cdnjs không có nó), nên
// jQuery 2.1.0 + wsp-min.js 4.8.0 + wsp-runner.js + widgets đã được đóng gói trong
// client/public/wsp/ và trang slide lấy từ chính origin phục vụ nó. Vì lẽ đó WSP_MOUNT nhận
// DIR: bản publish để trống để runtime tự suy ra từ URL trang, còn khung Preview và preview
// Help/Templates phải truyền origin của app — iframe vẽ bằng document.write có location là
// about:blank nên tự suy ra sẽ sai. Bài EXPORT tải về mở ở máy khác cũng chẳng có /wsp/ nào
// bên cạnh, nên địa chỉ công khai của HeyShow nằm cứng trong WSP_MOUNT làm chỗ trụ: mọi file
// thử lại đúng một lần ở đó (xem doiMayGoc).
//
// ~1.3MB nên KHÔNG nạp cùng Reveal ở <head>: mọi bài đều phải tải thêm 1.3MB thì giáo viên
// chỉ soạn slide chữ chịu oan (đúng lý do của <jsxgraph>). Nạp khi trang có thẻ <wsp> thật.
//
// Sáu điều ràng buộc cách nạp, đọc ra từ chính source thư viện:
//  1. wsp-runner.js định nghĩa $.fn.WSP và GSP.fixSketch/fixAuthorPrefs — Document của
//     wsp-min.js gọi hai hàm đó, thiếu runner là sketch chết giữa lúc dựng.
//  2. bản nén của widgets phải mang tên widgets.js: WIDGETS.getScriptPath() dò <script src>
//     kết thúc bằng "/widgets.js" để tìm thư mục chứa png và widgets.html.
//  3. widgets.js gọi $.getScript sang geometricfunctions.org để lấy database trợ giúp nếu
//     window.wspHelpData chưa tồn tại — phải đặt trước một object rỗng.
//  4. wsp-runner.js chỉ chờ IntersectionObserver khi nguồn là data-url; với
//     data-sourceDocument nó dựng ngay, còn số đo của một sketch thì Web Sketchpad đọc từ
//     CSS thật. Nên runtime chỉ dựng ô đang nhìn thấy, và co giãn sau khi sketch dựng xong.
//  5. widgets.js kéo thả bảng điều khiển bằng plugin $.fn.tinyDraggable (jquery.tiny-
//     draggable.min.js) — thiếu file này thì mở bảng Style là TypeError.
//  6. chính widgets.js định nghĩa $.fn.once trong handler ready của jQuery, mà jQuery 2.1 hẹn
//     handler đó bằng setTimeout — tức là sau khi script vừa được đọc xong. Dựng sketch tức thì
//     sau khi nạp là gọi phải .once chưa có (xem choKhoiDong).

export const WSP_VERSION = '4.8.0';

// Máy gốc của HeyShow: bài xuất ra tải về máy, mở bằng file:// thì không còn origin nào
// của HeyShow để suy ra, phải hồi về địa chỉ công khai này.
export const WSP_HOME = 'https://heyshow.pedu.vn';

// Thư mục chứa thư viện đã đóng gói: client/public/wsp/ → dist → máy chủ HeyShow.
export const WSP_DIR = '/wsp/';

// Dấu nhận diện mảnh runtime trong file slide: server, script vá bài đã publish và test
// cùng dò chuỗi này để biết bài đã có runtime hay chưa.
export const WSP_MARKER = 'data-heyshow-wsp';

// type của cái script mà một thẻ <wsp> biến thành — cũng là khoá để runtime tìm ô.
export const WSP_TYPE = 'text/wsp';

export const WSP_CSS = `
        /* Khung dựng sketch của một thẻ <wsp>. Mô hình hiển thị ĐÚNG 100% số đo tự nhiên của
           sketch (metadata.width/height, cộng cột công cụ nếu sketch có): người thiết kế tự
           chọn khung vẽ vừa slide, vì thu nhỏ bằng transform làm điểm và nhãn khó quan sát,
           khó kéo. data-w/data-h vẫn dùng được khi thật sự cần ép vừa một khung.
           Reveal co cả bài bằng transform, Web Sketchpad tính lại toạ độ chuột bằng cách nhân
           ma trận transform của mọi phần tử cha (GSP.convertPointFromPage), nên kéo thả điểm
           vẫn trúng. .loi hiện lỗi ngay trong ô. */
        .heyshow-wsp { position: relative; overflow: visible; margin: 0 auto; }
        .heyshow-wsp > .hs-wsp-nham {
            position: absolute; top: 0; left: 0; transform-origin: 0 0;
            width: -moz-fit-content; width: fit-content;
            /* .sketch_container là inline-block nên dòng chứa nó cộng thêm khoảng descender
               theo cỡ chữ của Reveal — đo được hộp cao 567px cho canvas 540px. */
            line-height: 0;
        }
        .heyshow-wsp .sketch_container { line-height: normal; }
        .heyshow-wsp > .loi {
            position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
            padding: 12px; box-sizing: border-box; text-align: center;
            background: #fef2f2; color: #b91c1c; border: 1px dashed #dc2626; border-radius: 8px;
            font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap;
        }
        /* Trang slide của HeyShow để cỡ chữ nhỏ; bảng công cụ của Web Sketchpad tính cỡ
           theo font của trang nên phải ép khung sketch về cỡ gốc, kẻo nhãn chỉ vài px.
           width:auto bỏ dải trống 87px mà .wsp-base-node giữ chỗ cho cột công cụ (kể cả khi
           cột ấy không có hoặc đã bị ẩn) — đo được trước khi vá: khung 867px cho canvas 780px. */
        .heyshow-wsp .wsp-base-node { font-size: 16px; width: auto !important; }
        /* Nền và viền khung vẽ do data-bg / data-border quyết định, mặc định trắng và KHÔNG
           viền để mô hình hoà vào nền slide như thẻ <jsxgraph>. */
        .heyshow-wsp .sketch_canvas { background: var(--hs-wsp-nen, #fff); }
        .heyshow-wsp .sketch_canvas,
        .heyshow-wsp .wsp-button-bar { border: var(--hs-wsp-vien, none) !important; }
        /* Thanh dưới (undo/redo, Reset, Widgets, chuyển trang) và cột nút widget mặc định ẨN;
           thêm data-bar="true" / data-style-widget="true" khi mô hình thật sự cần chúng. */
        .heyshow-wsp:not(.wsp-hien-thanh) .wsp-button-bar { display: none !important; }
        .heyshow-wsp:not(.wsp-hien-cong-cu) .widget_controlWidth { display: none !important; }
        /* Cột nút widget bị kéo dãn hết chiều cao khung (đo được 326px cho 5 nút 23px): cho
           nó xếp cột theo đúng chiều cao nội dung. */
        .heyshow-wsp.wsp-hien-cong-cu .widget_controlWidth {
            display: flex !important; flex-direction: column;
            height: max-content !important; max-height: max-content !important;
        }
        /* Khung trợ giúp công cụ giữ sẵn 50px cho chữ trợ giúp (chống nhảy bố cục khi rê
           công cụ) — trong ô cố định của HeyShow đó là 50px trống. */
        .heyshow-wsp .helpContainer { display: none !important; }
        /* Khi một công cụ WSP đang bật, khung vẽ nhận outline xanh (class wsp-tool-background)
           và thanh trợ giúp mở ra dưới đáy — "No help is available for Compass". Mô hình
           nằm giữa slide không nên trông như một ô nhập liệu đang được chọn: bỏ cả hai. */
        .heyshow-wsp .sketch_canvas { outline: none !important; }`;

// <wsp ...> … </wsp> -> <script type="text/wsp" …> … </script>. Thuộc tính của thẻ (data-w,
// data-h, data-bg, data-border, data-bar, data-style-widget) đi theo nguyên văn vì chỉ tên
// thẻ bị thay.
//
// Thẻ mở KHÔNG có thẻ đóng thì để nguyên: biến nó thành script mà không đóng nổi sẽ nuốt
// cả phần còn lại của bài — thà còn nhìn thấy code thô, tab Debug đã báo thiếu thẻ đóng rồi.
export function WSP_BOC(ma) {
    const LOAI = 'text/wsp';
    const van = String(ma);
    const theMo = /<\s*wsp\b([^>]*)>/gi;
    const theDong = /<\s*\/\s*wsp\s*>/gi;
    const soMo = (van.match(theMo) || []).length;
    const soDong = (van.match(theDong) || []).length;
    if (soMo === 0 || soMo !== soDong) return van;

    const dong = [];
    let tim;
    while ((tim = theDong.exec(van)) !== null) dong.push([tim.index, tim.index + tim[0].length]);

    let ketqua = '', con = 0, thuTuDong = 0, mo;
    while ((mo = theMo.exec(van)) !== null) {
        if (mo.index < con) continue;            // thẻ mở nằm trong khối wsp trước đó
        ketqua += van.slice(con, mo.index);
        con = mo.index + mo[0].length;
        if (thuTuDong >= dong.length || dong[thuTuDong][0] < con) {
            ketqua += mo[0];                     // không kiếm được thẻ đóng cặp
            continue;
        }
        const [tu, den] = dong[thuTuDong++];
        ketqua += '<script type="' + LOAI + '"' + mo[1] + '>';
        ketqua += van.slice(con, tu);
        ketqua += '</script>';
        con = den;
        theMo.lastIndex = con;
    }
    return ketqua + van.slice(con);
}

export function WSP_MOUNT(DIR) {
    const LOAI = 'text/wsp';
    const DAI_RONG = 840;      // bề ngang nội dung của một slide Reveal 960 đã trừ lề
    // Ngân sách chiều cao mặc định, tính theo bề ngang vừa đo. 0.5 là để MẶC ĐỊNH ĐỨNG ĐƯỢC
    // CÙNG MỘT TIÊU ĐỀ trong slide 700px: đo trên bài thật, sketch 874×456 với hệ số 0.62 bị
    // phóng lên 1.10 để khớp chiều ngang, thành hộp 501px cao — tiêu đề cộng hộp vượt 700px nên
    // phần dưới hình bị cắt trên cả /show lẫn khung Preview. 0.5 thì k ≤ 1.05 và vừa slide.
    const TY_LE_CAO = 0.5;
    const daLam = new WeakSet();
    let lan = 0, baoLoiMotLan = false;

    // Máy gốc của HeyShow — viết cứng trong hàm này vì WSP_MOUNT được nội tuyến vào bài
    // publish, nơi không có WSP_HOME/WSP_DIR (hai hàm runtime phải tự chứa).
    const MAY_GOC = 'https://heyshow.pedu.vn';

    function thuMuc() {
        if (DIR) return DIR;
        const le = (typeof location !== 'undefined' && location.protocol) || '';
        return (/^https?:$/i.test(le) ? location.origin : MAY_GOC) + '/wsp/';
    }
    // Thư viện nằm ở /wsp/ của CHÍNH máy chủ phục vụ trang — đúng khi mở bài trên HeyShow.
    // Bài export (Dashboard → Tải HTML) thì khác: mở bằng file:// hay đặt lên server của
    // trường đều không có /wsp/ nào bên cạnh, và đo trên máy thật là mọi file chết ngay từ
    // jquery-2.1.0.min.js, hộp <wsp> hiện đúng một ô lỗi. Gặp lỗi tải thì hồi về máy công
    // khai MỘT lần rồi dùng luôn địa chỉ ấy cho mọi file còn lại (widgets.js tự dò thư mục
    // của chính nó qua getScriptPath, nên widgets.html và ảnh png đi theo đúng máy gốc mới).
    const MAY_TRU = MAY_GOC + '/wsp/';
    let goc = thuMuc();
    function doiMayGoc() {
        if (goc === MAY_TRU) return false;
        goc = MAY_TRU;
        return true;
    }

    function napCSS() {
        if (document.querySelector('link[data-heyshow-wsp]')) return;
        const them = () => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.setAttribute('data-heyshow-wsp', 'css');
            link.href = `${goc}widgets.css`;
            link.addEventListener('error', () => {
                link.remove();
                if (doiMayGoc()) them();
            });
            document.head.appendChild(link);
        };
        them();
    }

    function napMotFile(ten, daThuLai) {
        return new Promise((roi, hong) => {
            const the = document.createElement('script');
            const lucNay = goc;
            the.src = lucNay + ten;
            the.addEventListener('load', roi);
            the.addEventListener('error', () => {
                the.remove();
                // File khác đã đổi máy gốc trong lúc chờ thì thử lại ở máy mới trước khi đầu hàng.
                if (!daThuLai && (goc !== lucNay || doiMayGoc())) napMotFile(ten, true).then(roi, hong);
                else hong(new Error(`không tải được ${ten}`));
            });
            document.head.appendChild(the);
        });
    }

    // Nạp lần lượt, không song song: wsp-runner.js gán hàm lên GSP ngay lúc được đọc,
    // widgets.js cần cả jQuery lẫn $.fn.WSP đã có mặt.
    //
    // Dấu nạp đặt trên CHÍNH document chứ không chỉ trên window: khung Preview của editor
    // dựng lại bằng document.open()/write(), mà document.open() thay tài liệu nhưng giữ
    // nguyên window — window.WIDGETS cũ vẫn còn trong khi jQuery của nó trỏ vào tài liệu đã
    // chết. Tin vào window là lần dựng thứ hai chạy bằng bộ thư viện cũ: không có style của
    // WSP, canvas cao 1560px, chữ vẽ lỗi "Cannot read properties of undefined (reading 'match')".
    let dangTai = null;
    function napThuVien() {
        if (window.WIDGETS && window.jQuery && window.jQuery.fn && window.jQuery.fn.WSP
            && document.documentElement.hasAttribute('data-heyshow-wsp-lib')) {
            return Promise.resolve();
        }
        if (dangTai) return dangTai;
        dangTai = napMotFile('jquery-2.1.0.min.js')
            // Plugin jQuery mà widgets dùng để kéo thả bảng điều khiển (ô Style, Trace…).
            // Thiếu file này, mở bảng điều khiển là "Ee.tinyDraggable is not a function".
            .then(() => napMotFile('jquery.tiny-draggable.min.js'))
            .then(() => napMotFile('wsp-min.js'))
            .then(() => napMotFile('wsp-runner.js'))
            .then(() => {
                window.wspHelpData = window.wspHelpData || {};
                return napMotFile('widgets.js');
            })
            .then(() => { document.documentElement.setAttribute('data-heyshow-wsp-lib', '1'); });
        return dangTai;
    }

    // Lỗi hiện NGAY TRONG ô slide chứ không chỉ ở console: giáo viên đứng lớp không mở
    // devtools, còn một khoảng trống thì không biết đường nào mà lần.
    function hienLoi(hop, loi) {
        const canh = document.createElement('div');
        canh.className = 'loi';
        canh.textContent = `Web Sketchpad: ${(loi && loi.message) || loi || 'lỗi không rõ'}`;
        hop.appendChild(canh);
        if (!baoLoiMotLan) {
            baoLoiMotLan = true;
            console.warn(`[HeyShow] thẻ <wsp> chạy lỗi: ${((loi && loi.stack) || loi)}`);
        }
    }

    // Reveal canh giữa nội dung slide bằng margin-top tính một lần lúc nó dựng bố cục, mà
    // bố cục đó chạy TRUOC khi sketch của ta có số đo (ônào nhìn thấy mới dựng, dựng xong
    // mới biết cao bao nhiêu). Hộp cao lên sau đó đẩy cả section xuống dưới: đo trên /show,
    // ngũ giác đều nằm 385px tính từ đỉnh khung slide, cao 470px trong khi khung chỉ còn
    // 686px → tràn 169px, phần dưới hình biến mất khỏi màn chiếu. Nói Reveal dựng lại bố
    // cục mỗi khi số đo cuối của một hộp thay đổi; gộp theo khung hình để vòng thử lại
    // của theoDoiKichThuoc không gọi layout() hàng chục lần.
    let boCucDaHen = false;
    function henBoCuc() {
        if (boCucDaHen) return;
        boCucDaHen = true;
        window.requestAnimationFrame(() => {
            boCucDaHen = false;
            if (window.Reveal && typeof window.Reveal.layout === 'function') window.Reveal.layout();
        });
    }

    // Số đo hộp chứa chỉ dùng khi thẻ tự đặt data-w/data-h. Không có cả hai thì trả về
    // null: sketch chạy đúng 100% số đo tự nhiên của nó, không co không dãn.
    // Chiều ngang lấy của khung slide (clientWidth của cha tính cả padding nên phải trừ lại);
    // ô nằm trong <section> đang bị Reveal ẩn thì đo ra 0 -> mặc định.
    function doKen(khop) {
        if (!khop.hasAttribute('data-w') && !khop.hasAttribute('data-h')) return null;
        const quy = (giaTri, macDinh) => {
            if (!giaTri || giaTri === 'auto') return macDinh;
            const so = parseFloat(giaTri);
            if (!isFinite(so) || so <= 0) return macDinh;
            if (giaTri.indexOf('%') >= 0) return Math.round(macDinh * so / 100);
            return Math.round(so);
        };
        let cha = khop.parentNode, rong = 0;
        while (cha && !(rong > 0)) {
            const cs = window.getComputedStyle(cha);
            rong = cha.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
            cha = cha.parentNode;
        }
        const w = quy(khop.getAttribute('data-w'), rong > 0 ? rong : DAI_RONG);
        return { rong: w, cao: quy(khop.getAttribute('data-h'), Math.round(w * TY_LE_CAO)) };
    }

    // Cờ bật/tắt dạng thuộc tính: có mặt là bật (kể cả viết trần <wsp data-bar>), trừ khi
    // ghi rõ false/0/no/off. Nhận cả data-<tên> lẫn <tên> trần vì thẻ do người dùng gõ tay.
    function coBat(khop, ten) {
        const khoa = khop.hasAttribute(`data-${ten}`) ? `data-${ten}`
            : (khop.hasAttribute(ten) ? ten : null);
        if (!khoa) return false;
        const giaTri = (khop.getAttribute(khoa) || '').trim().toLowerCase();
        return giaTri === '' || !/^(false|0|no|off|none)$/.test(giaTri);
    }

    function taoHop(khop) {
        const hop = document.createElement('div');
        hop.className = 'heyshow-wsp';
        if (coBat(khop, 'style-widget')) hop.classList.add('wsp-hien-cong-cu');
        if (coBat(khop, 'bar')) hop.classList.add('wsp-hien-thanh');
        const nham = document.createElement('div');
        nham.className = 'hs-wsp-nham';
        const khung = document.createElement('div');
        // class sketch_canvas bắt buộc: wsp-runner tự nạp sketch vào phần tử có class này,
        // và widgets.js tìm .sketch_canvas để gắn thanh nút chuyển trang cho sketch.
        khung.className = 'sketch_canvas';
        khung.id = `heyshow-wsp-${++lan}`;
        const nen = (khop.getAttribute('data-bg') || '').trim();
        hop.style.setProperty('--hs-wsp-nen',
            /^(none|transparent)$/i.test(nen) ? 'transparent' : (nen || '#fff'));
        const vien = (khop.getAttribute('data-border') || '').trim();
        hop.style.setProperty('--hs-wsp-vien', /^(none|0)$/i.test(vien) ? 'none' : (vien || 'none'));
        nham.appendChild(khung);
        hop.appendChild(nham);
        return { hop, nham, khung };
    }

    // Sketch chỉ lộ số đo thật sau onReady (core cộng cột công cụ, widgets chèn thanh nút),
    // nên bước ghi số đo chạy sau đó; xem theoDoiKichThuoc. Không có so (data-w/data-h) thì
    // hộp nhận đúng số đo tự nhiên — 100%, không transform.
    // Trả về false khi chưa đo được — onReady thử lại, xem theoDoiKichThuoc.
    function vaoKichThuoc(hop, nham, so) {
        const rong = nham.offsetWidth, cao = nham.offsetHeight;
        if (!(rong > 0) || !(cao > 0)) return false;
        let w, h;
        if (so) {
            const k = Math.min(so.rong / rong, so.cao / cao, 2);
            nham.style.transform = `scale(${k})`;
            w = `${Math.round(rong * k)}px`;
            h = `${Math.round(cao * k)}px`;
        } else {
            if (nham.style.transform) nham.style.transform = '';
            w = `${rong}px`;
            h = `${cao}px`;
        }
        if (hop.dataset.heyshowWspSo !== w + h) {
            hop.dataset.heyshowWspSo = w + h;
            hop.style.width = w;
            hop.style.height = h;
            henBoCuc();
        }
        return true;
    }

    // Số đo CUỐI của một sketch tới muộn hơn onReady: widgets chèn thanh nút (undo/redo,
    // Reset, Widgets) và bảng điều khiển sau khi canvas đã vẽ. Bỏ qua là hộp ở nguyên cao 0
    // còn hình thì tràn khỏi slide (đo trên bài thật với sketch t5_button_anim). Nên thử lại
    // theo từng khung hình một nhịp, tối đa ~1.5 giây, rồi giao cho ResizeObserver bắt mọi
    // lần lớn muộn về sau.
    function theoDoiKichThuoc(hop, nham, so) {
        let deNghi = 0;
        const thu = () => {
            if (vaoKichThuoc(hop, nham, so) || ++deNghi > 90) return;
            window.requestAnimationFrame(thu);
        };
        thu();
        if (window.ResizeObserver && nham.dataset.heyshowWspRo !== '1') {
            nham.dataset.heyshowWspRo = '1';
            // Không sợ vòng lặp: thứ ta ghi là số đo của hop, còn nham co theo nội dung của
            // chính nó (position:absolute + fit-content) nên không vì thế mà đổi kích thước.
            new window.ResizeObserver(() => vaoKichThuoc(hop, nham, so)).observe(nham);
        }
    }

    // Chờ bộ khởi động của widgets.js chạy xong trước khi dựng sketch.
    //
    // widgets.js định nghĩa $.fn.once và gắn nút chuyển trang BÊN TRONG một handler
    // $(function(){ WIDGETS.initWidget(); BUTTONBAR.init(); … }). jQuery 2.1 không chạy handler
    // đó ngay khi DOM đã sẵn sàng mà hẹn bằng setTimeout, nên nó nổ ở NHỊP SAU khi promise nạp
    // thư viện của ta được nối. Dựng sketch ngay nhịp ấy thì wsp-min gọi `r.parent().once(…)`
    // trong lúc $.fn.once chưa tồn tại: sketch dừng giữa chứng — có .wsp-base-node nhưng KHÔNG
    // canvas, không onError, không onReady, nên hộp cũng không bao giờ có số đo. Ở iframe thí dụ
    // Help (thẻ <wsp> nằm ngay slide đầu, dựng tại DOMContentLoaded) là gặp ngay; bài /show và
    // khung Preview thì thoát vì sketch đầu tiên chỉ dựng lúc lật slide, mấy giây sau.
    // Còn một ngả handler đó KHÔNG BAO GIỜ chạy: iframe Preview của editor được dựng bằng
    // document.write, thư viện (kể cả jQuery) nạp muộn bằng thẻ script động, sau khi
    // DOMContentLoaded đã nổ — jQuery 2.1 chờ đúng hai sự kiện ấy nên ready không bao giờ bật
    // (đo được: readyState "complete" mà jQuery.isReady false, $.fn.once thiếu, #widgetParent
    // không có; dựng sketch lúc đó là chết ngay ở attachToNode và không có canvas nào). Quá
    // ~1.5 giây mà widgets.js đã nạp xong, tự gọi jQuery.ready() để handler ready chạy đúng
    // chuỗi khởi động của thư viện: WIDGETS.initWidget, BUTTONBAR.init, WspHelp.init… Gọi khi
    // ready đã chạy rồi thì jQuery trả về ngay, không chạy hai lần.
    function choKhoiDong() {
        return new Promise((roi) => {
            let dem = 0, daGoiReady = false;
            const thu = () => {
                const j = window.jQuery;
                if (j && j.fn && j.fn.once) return roi();
                if (!daGoiReady && dem >= 50 && window.WIDGETS && typeof j.ready === 'function') {
                    daGoiReady = true;
                    try { j.ready(); } catch (loi) { /* thiếu bảng widget không chặn sketch */ }
                    if (j.fn.once) return roi();
                }
                if (++dem > 200) return roi();   // quá 6 giây thì dựng liều
                window.setTimeout(thu, 30);
            };
            thu();
        });
    }

    function ganMot(khop, so) {
        // File JSON tải từ mạng về thường mở đầu bằng BOM; JSON.parse từ chối nó.
        const van = (khop.textContent || '').replace(/^\uFEFF/, '').trim();
        const { hop, nham, khung } = taoHop(khop);
        khop.parentNode.replaceChild(hop, khop);
        if (!van) { hienLoi(hop, 'thẻ <wsp> trống'); return Promise.resolve(); }

        let duLieu;
        try {
            duLieu = JSON.parse(van);
        } catch (loi) {
            hienLoi(hop, `JSON không hợp lệ: ${loi.message}`);
            return Promise.resolve();
        }
        return napThuVien().then(choKhoiDong).then(() => {
            // widgets.js gắn thanh dưới (undo/redo, Reset, Widgets, chuyển trang) bằng handler
            // LoadDocument.WSP, mà nó chỉ gắn cho những .sketch_canvas CÓ MẶT lúc nó khởi động
            // — tức sketch đầu tiên; sketch dựng sau không bao giờ có thanh. Gắn trước khi nạp
            // sketch thì sự kiện LoadDocument của chính sketch này chạy đúng đường như sketch
            // đầu. Chỉ gắn khi thẻ bật data-bar, và bỏ qua nếu sketch tự cấm thanh (authorPrefs).
            if (hop.classList.contains('wsp-hien-thanh') && window.BUTTONBAR
                && typeof window.BUTTONBAR.init === 'function') {
                try { window.BUTTONBAR.init(window.jQuery(khung)); } catch (loi) { /* thiếu thanh không chặn sketch */ }
            }
            return new Promise((roi) => {
                window.jQuery(khung).WSP('loadSketch', {
                    // Nguồn đã có trong tay: wsp-runner dựng ngay, không ajax, không chờ
                    // visibility — trang slide chạy với CSP sandbox (origin mờ) nên mọi XHR
                    // tự phát của nó đều là request null-origin, data-url sẽ chết ở CORS.
                    'data-sourceDocument': duLieu,
                    // sizeParentToContent đổi khung sketch sang inline-block để co theo nội
                    // dung; HeyShow đã tự tính số đo nên giữ nguyên số đo của chính sketch.
                    sketchOptions: { sizeParentToContent: false },
                    onError: (nguon) => {
                        hienLoi(hop, `không đọc được sketch (${typeof nguon === 'string' ? nguon.slice(0, 140) : typeof nguon})`);
                        roi();
                    },
                    onReady: () => {
                        // Thanh nút widgets dựng bất đồng bộ sau onReady: trễ một nhịp rồi mới
                        // đo, và theoDoiKichThuoc còn thử tiếp nếu nhịp đó vẫn chưa đủ.
                        window.requestAnimationFrame(() => {
                            theoDoiKichThuoc(hop, nham, so);
                            roi();
                        });
                    }
                });
            });
        }).catch((loi) => {
            // Lỗi tới lúc nạp thư viện: hộp đã nằm trong slide rồi, báo vào đó chứ không
            // tạo hộp mới ngoài DOM (nơi không ai nhìn thấy).
            hienLoi(hop, loi);
            throw loi;
        });
    }

    // Ô nào thực sự nhìn thấy mới tới lượt dựng. Web Sketchpad đo nhãn và cột công cụ bằng
    // số đo CSS thật, mà .sketch_canvas trong một <section> chưa tới lượt hiện thì mọi số đo
    // đều 0 — dựng lúc đó là hỏng bố cục (wsp-runner.js cũng làm đúng như vậy với nguồn
    // data-url: nó chờ IntersectionObserver).
    //
    // Đo <section> chứa thẻ chứ không đo chính cái thẻ: <script> có display:none theo
    // stylesheet mặc định của trình duyệt nên getClientRects() của nó RỖNG MỌI lúc, kể cả khi
    // slide đang chiếu — gate này mà đặt lên thẻ thì không bao giờ dựng được sketch nào.
    // Reveal ẩn slide chưa tới lượt bằng display:none trên <section>, nên số đo của section
    // trả lời đúng câu hỏi cần hỏi.
    function thinDuoc(khop) {
        const sec = khop.closest && khop.closest('section');
        return (sec || khop.parentNode).getClientRects().length > 0;
    }

    // Dựng mọi ô đang nhìn thấy và chưa dựng. Chạy nhiều lần là bình thường (slidechanged,
    // nội dung tới muộn), WeakSet giữ cho mỗi ô chỉ được dựng một lần.
    function ganTatCa() {
        const ds = [];
        document.querySelectorAll(`script[type="${LOAI}"]`).forEach((khop) => {
            if (daLam.has(khop) || !thinDuoc(khop)) return;
            daLam.add(khop);
            ds.push([khop, doKen(khop)]);       // doKen đo lúc thẻ còn nằm trong slide
        });
        if (!ds.length) return;
        napCSS();
        // Nối tiếp từng ô: widgets.js chỉ có MỘT bảng điều khiển cho cả trang và nó gắn vào
        // sketch vừa được focus, nên hai ô dựng cùng lúc sẽ tranh nhau; ô sau còn có thể đo
        // phải số đo đang thay đổi của ô trước.
        ds.reduce((tien, [khop, so]) => tien.then(() => ganMot(khop, so)).catch((loi) => {
            if (!(window.WIDGETS && window.jQuery && window.jQuery.fn.WSP)) {
                // Thư viện chưa về (mất mạng, thiếu file trong dist): bỏ dấu "đã làm" để
                // lần quét sau còn cơ hội dựng lại. Lỗi đã hiện trong ô của thẻ đầu tiên.
                ds.forEach(([k]) => daLam.delete(k));
            }
        }), Promise.resolve());
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
        // Bài nằm trong iframe của gallery/templates, hay tab Preview bị ẩn: nội dung có
        // thể tới muộn sau DOMContentLoaded (srcdoc, doc.write) nên theo dõi thêm.
        new MutationObserver(ganTatCa).observe(document.documentElement, { childList: true, subtree: true });
    }

    khiSanSang();
}

// Hai mảnh ghép vào trang slide, đúng khuôn buildFullHtml của server: STYLE nằm trong
// <head>, SCRIPT nằm cuối <body>, BOC chạy trên nội dung bài trước khi nó vào DOM.
export const WSP_STYLE = `<style>${WSP_CSS}
    </style>`;

// DIR rỗng = để runtime tự suy ra từ trang đang chứa nó (bản publish, /show, export qua
// server). Khung Preview và preview Help/Templates truyền origin của app vào đây.
export const WSP_SCRIPT = (dir) => `<script ${WSP_MARKER}="runtime">(${String(WSP_MOUNT)})(${JSON.stringify(dir || '')})</script>`;
