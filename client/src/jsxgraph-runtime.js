// Runtime của thẻ <jsxgraph> — bản duy nhất, dùng cho cả ba nơi trình bày slide:
// bản publish/export (server/src/slide-parts.js đọc file này, cắt nguyên văn hai hàm
// JSXGRAPH_BOC và JSXGRAPH_MOUNT để nội tuyến vào file HTML), khung Preview trong editor
// (client/src/main.js) và preview ở /templates + /help (client/src/reveal-preview.js).
//
// Vì server cắt chuỗi chứ không import, hai hàm phải tự chứa: không tham chiếu biến ngoài,
// mọi thứ cần đều đi qua tham số, và bên trong không được có chuỗi "</scr" (nó nằm gọn
// trong thẻ <script> của bài publish). Dấu } đóng mỗi hàm phải nằm ở CỘT 0 — đó là mốc để
// slide-parts.js cắt, nên hai hàm này không được đặt trong khối nào khác.
//
// CÁCH <jsxgraph> ĐƯỢC XỬ LÝ. Người dùng viết, bên trong một slide:
//
//     <jsxgraph>
//       const board = JXG.JSXGraph.initBoard(BOARDID, { boundingbox: [-6, 6, 6, -6] });
//       board.create('point', [1, 2], { name: 'A' });
//     </jsxgraph>
//
// HTML không phải vùng chứa code: dấu `<` trong JS (nhất là so sánh `a<b`) bị trình duyệt
// đọc thành thẻ HTML và nuốt nốt phần còn lại của slide — đúng lỗi "$0<p<1$" từng làm hỏng
// bài (client/src/debug.js bắt). Nên JSXGRAPH_BOC đổi cặp thẻ lấy nhau sang
// <script type="text/jsxgraph">, một phần tử raw-text: code giữ nguyên từng ký tự và
// không được trình duyệt chạy. JSXGRAPH_MOUNT sau đó dựng khung div cho từng ô rồi nạp
// JSXGraph.
//
// Hai khuôn code mà giáo viên dán vào, theo đúng các mẫu trong
// embed-objects-examples/JSXGraph (mẫu của HeyGeo Web):
//   khuôn A  JXG.JSXGraph.initBoard(BOARDID, {...})  -> BOARDID là id khung HeyShow dựng
//   khuôn B  board.create('point', ...)              -> dùng board HeyShow tạo hộ
// Code có initBoard thì không tạo hộ board, để `const board = ...` của người dùng không
// đâm vào biến mà runtime truyền xuống. initBoard('jxgbox', ...) — khuôn của jsxgraph.org —
// được đổi sang id của ô đang dựng, vì id đó không có thật trong bài HeyShow.
//
// JSXGraph ~1MB nên KHÔNG nạp cùng Reveal ở <head>: mọi bài đều phải tải thêm 1MB thì
// giáo viên chỉ soạn slide chữ chịu oan. CSS + jsxgraphcore.js chỉ được nạp khi trang có
// thẻ <jsxgraph> thật.

export const JSXGRAPH_VERSION = '1.14.2';
export const JSXGRAPH_CDN = `https://cdnjs.cloudflare.com/ajax/libs/jsxgraph/${JSXGRAPH_VERSION}`;

// Dấu nhận diện mảnh runtime trong file slide: server, script vá bài đã publish và test
// cùng dò chuỗi này để biết bài đã có runtime hay chưa.
export const JSXGRAPH_MARKER = 'data-heyshow-jsxgraph';

// type của cái script mà một thẻ <jsxgraph> biến thành — cũng là khoá để runtime tìm ô.
export const JSXGRAPH_TYPE = 'text/jsxgraph';

export const JSXGRAPH_CSS = `
        /* Khung dựng board cho một thẻ <jsxgraph>: hộp ngoài mang số đo px mà runtime
           tính, hộp trong (div mà code JSXGraph trỏ vào) phủ kín nó, còn .loi hiện lỗi
           ngay trong ô. */
        .heyshow-jsxgraph { position: relative; overflow: hidden; margin: 0 auto; }
        .heyshow-jsxgraph > .loi {
            position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
            padding: 12px; box-sizing: border-box; text-align: center;
            background: #fef2f2; color: #b91c1c; border: 1px dashed #dc2626; border-radius: 8px;
            font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap;
        }`;

// <jsxgraph ...> … </jsxgraph> -> <script type="text/jsxgraph" …> … </script>. Thuộc tính
// của thẻ (data-w, data-h) đi theo nguyên văn vì chỉ tên thẻ bị thay.
//
// Thẻ mở KHÔNG có thẻ đóng thì để nguyên: biến nó thành script mà không đóng nổi sẽ nuốt
// cả phần còn lại của bài — thà còn nhìn thấy code thô, tab Debug đã báo thiếu thẻ đóng rồi.
export function JSXGRAPH_BOC(ma) {
    const LOAI = 'text/jsxgraph';
    const van = String(ma);
    const theMo = /<\s*jsxgraph\b([^>]*)>/gi;
    const theDong = /<\s*\/\s*jsxgraph\s*>/gi;
    const soMo = (van.match(theMo) || []).length;
    const soDong = (van.match(theDong) || []).length;
    if (soMo === 0 || soMo !== soDong) return van;

    const dong = [];
    let tim;
    while ((tim = theDong.exec(van)) !== null) dong.push([tim.index, tim.index + tim[0].length]);

    let ketqua = '', con = 0, thuTuDong = 0, mo;
    while ((mo = theMo.exec(van)) !== null) {
        if (mo.index < con) continue;            // thẻ mở nằm trong khối jsxgraph trước đó
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

export function JSXGRAPH_MOUNT(CDN) {
    const LOAI = 'text/jsxgraph';
    const DAI_RONG = 840, DAO_CAO = 420;
    const daLam = new WeakSet();
    let lan = 0, baoLoiMotLan = false;

    // Hộp dựng board: con trong mang id mà code JSXGraph trỏ vào. Nó phải có số đo NGAY
    // trước lúc initBoard (JSXGraph đọc offsetWidth/offsetHeight một lần rồi vẽ), còn một
    // div rỗng thì cao 0 nên phải phủ kín hộp bằng absolute + 100%. Class 'jxgbox' là class
    // mà jsxgraph.css và chính JSXGraph dùng cho khung board.
    //
    // Nền và viền: jsxgraph.css cho .jxgbox nền TRẮNG + viền xanh, hợp khi đứng riêng nhưng
    // trên slide thì thành một tấm thẻ trắng giữa bài. `data-bg="transparent"` (hoặc một màu
    // CSS bất kỳ) và `data-border="none"` ghi thẳng style vào khung để đè stylesheet đó.
    function taoHop(ten, rong, cao, khop) {
        const hop = document.createElement('div');
        hop.className = 'heyshow-jsxgraph';
        hop.style.width = `${rong}px`;
        hop.style.height = `${cao}px`;
        const khung = document.createElement('div');
        khung.id = ten;
        khung.className = 'jxgbox';
        khung.style.cssText = 'position:absolute; inset:0; width:100%; height:100%;';
        const nen = khop && khop.getAttribute('data-bg');
        const vien = khop && khop.getAttribute('data-border');
        if (nen) khung.style.background = /^(none|transparent)$/i.test(nen) ? 'transparent' : nen;
        if (vien) khung.style.border = /^(none|0)$/i.test(vien) ? 'none' : vien;
        hop.appendChild(khung);
        return hop;
    }

    // JSXGraph đọc offsetWidth/offsetHeight của khung lúc initBoard nên khung phải có số đo
    // thật. Chiều ngang lấy của khung chứa (clientWidth của cha tính cả padding nên phải trừ
    // lại); ô thường nằm trong <section> đang bị Reveal ẩn hoặc trong tab Preview đang đóng
    // -> đo ra 0, khi đó dùng mặc định và để ResizeObserver của JSXGraph chỉnh lại.
    //
    // Chiều cao thì NGƯỢC LẠI: không bao giờ đo cha. Chính cái thẻ này quyết định khung chứa
    // cao bao nhiêu, nên lúc chưa dựng thì .hs-card chỉ cao đúng bằng phần chữ phía trên và
    // board bị ép còn 160px (bài "Mặt phẳng cắt mặt nón" vỡ bố cục vì dòng này). data-h là
    // cách duy nhất để nói cao bao nhiêu, nhận px ("520") hoặc % so với chiều rộng slide.
    function doKen(khop) {
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
        return {
            rong: quy(khop.getAttribute('data-w'), rong > 0 ? rong : DAI_RONG),
            cao: quy(khop.getAttribute('data-h'), DAO_CAO)
        };
    }

    function napCSS() {
        if (document.querySelector('link[data-heyshow-jsxgraph]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.setAttribute('data-heyshow-jsxgraph', 'css');
        link.href = `${CDN}/jsxgraph.css`;
        document.head.appendChild(link);
    }

    // Bài có hai thẻ <jsxgraph> thì cả hai chờ chung một lần tải 1MB.
    let dangTai = null;
    function napJS() {
        if (window.JXG) return Promise.resolve();
        if (dangTai) return dangTai;
        dangTai = new Promise((roi, hong) => {
            let the = document.getElementById('heyshow-jsxgraph-js');
            if (!the) {
                the = document.createElement('script');
                the.id = 'heyshow-jsxgraph-js';
                the.src = `${CDN}/jsxgraphcore.js`;
                document.head.appendChild(the);
            }
            the.addEventListener('load', roi);
            the.addEventListener('error', () => hong(new Error('không tải được JSXGraph từ CDN')));
        });
        return dangTai;
    }

    // Lỗi hiện NGAY TRONG ô slide chứ không chỉ ở console: giáo viên đứng lớp không mở
    // devtools, còn một khoảng trống thì không biết đường nào mà lần.
    function hienLoi(hop, loi) {
        const canh = document.createElement('div');
        canh.className = 'loi';
        canh.textContent = `JSXGraph: ${(loi && loi.message) || loi || 'lỗi không rõ'}`;
        hop.appendChild(canh);
        if (!baoLoiMotLan) {
            baoLoiMotLan = true;
            console.warn(`[HeyShow] thẻ <jsxgraph> chạy lỗi: ${((loi && loi.stack) || loi)}`);
        }
    }

    // Code có `useKatex: true` thì JSXGraph gọi thẳng window.katex.render() lúc dựng nhãn.
    // Nhưng Reveal nạp KaTeX bất đồng bộ: đo trên bài thật, board initBoard ở 390ms trong khi
    // katex gán vào window ở 606ms — mọi nhãn (\text{Góc} \alpha, z_0…) hiện nguyên văn mã
    // LaTeX. JSXGraph không thử lại, nên phải chờ thư viện math xuất hiện rồi mới dựng ô.
    // Chờ tối đa 10s: KaTeX không tới (bài tắt plugin math, mất mạng) thì vẫn vẽ bảng, chỉ
    // xấu ở phần nhãn.
    function choMath(ma) {
        const canKatex = /\busekatex\b\s*[:=]\s*(true|!0)/i.test(ma);
        const canMathJax = /\busemathjax\b\s*[:=]\s*(true|!0)/i.test(ma);
        if (!canKatex && !canMathJax) return Promise.resolve();
        const du = () => (!canKatex || window.katex) && (!canMathJax || window.MathJax);
        if (du()) return Promise.resolve();
        return new Promise((roi) => {
            const hetLuc = Date.now() + 10000;
            const kiemTra = () => {
                if (du() || Date.now() > hetLuc) roi();
                else setTimeout(kiemTra, 100);
            };
            kiemTra();
        });
    }

    function ganMot(khop) {
        return choMath(khop.textContent || '').then(() => {
            let ma = khop.textContent || '';
            const ten = `heyshow-jsxg-${++lan}`;
            const so = doKen(khop);
            const hop = taoHop(ten, so.rong, so.cao, khop);
            khop.parentNode.replaceChild(hop, khop);
            if (!ma.trim()) { hienLoi(hop, 'thẻ <jsxgraph> trống'); return; }

            // Mã dán từ jsxgraph.org/share gọi initBoard('jxgbox'): id đó không tồn tại trong
            // bài của HeyShow (và hai thẻ cùng trang sẽ trùng id). Đổi chuỗi đó lấy id của ô này.
            if (/(["'])jxgbox\1/.test(ma)) {
                ma = ma.replace(/(["'])jxgbox\1/g, (_, nhay) => nhay + ten + nhay);
            }

            const tuKhoiTao = /initBoard\s*\(/.test(ma);
            const boardCu = window.board;
            let board;
            if (!tuKhoiTao) {
                try {
                    board = window.JXG.JSXGraph.initBoard(ten, {
                        boundingbox: [-10, 10, 10, -10], keepaspectratio: true,
                        showCopyright: false, axis: true
                    });
                } catch (loi) { hienLoi(hop, loi); return; }
            }
            // Xoay khối 3D trên điện thoại. view3d xoay bằng cú kéo trên khung, nhưng board coi
            // cú chạm MỘT NGÓN là pan (pan.enabled mặc định bật, needTwoFingers tắt), nên mode
            // đã là MOVE_ORIGIN trước khi view3d kịp nhận cú kéo — đo bằng PointerEvent
            // pointerType 'touch': pan bật thì ma trận xoay đứng yên, pan tắt thì xoay được
            // (bài viết tay trên cùng máy chủ cũng đặt pan: {enabled: false}). Chỉ tắt pan cho
            // khối có view3d và khi chính code người dùng không tự đặt `pan:`.
            const tatPan = /view3d/.test(ma) && !/\bpan\s*:/.test(ma);
            const dsBoard = [];
            // .bind: initBoard là method của JXG.JSXGraph, gọi rời thì `this` mất và JSXGraph
            // ném "Cannot read properties of undefined (reading '_setAttributes')".
            const initBoardGoc = window.JXG.JSXGraph.initBoard.bind(window.JXG.JSXGraph);
            window.JXG.JSXGraph.initBoard = (id, tuy) => {
                const b = initBoardGoc(id, tuy);
                dsBoard.push(b);
                return b;
            };
            try {
                // Không truyền `board` làm tham số: khuôn A khai báo `const board = initBoard(...)`
                // ngay dòng đầu, trùng tên tham số là SyntaxError cả ô không dựng được. Khuôn B
                // (chỉ board.create) đọc `board` như biến toàn cục, ta đặt nó vào đúng lúc chạy.
                if (board) window.board = board;
                // Mã chạy trong thân hàm nên `var`/`const` người dùng khai báo chỉ sống trong ô
                // đó: hai thẻ <jsxgraph> trong một bài không ghi đè biến của nhau được.
                (new Function('BOARDID', ma))(ten);
            } catch (loi) {
                hienLoi(hop, loi);
            } finally {
                window.JXG.JSXGraph.initBoard = initBoardGoc;
                window.board = boardCu;
                // Chép ra object mới: b.attr.pan có thể đang trỏ chung JXG.Options.board.pan,
                // sửa thẳng là tắt pan cho mọi board khác trên trang.
                if (tatPan) {
                    dsBoard.forEach((b) => { b.attr.pan = Object.assign({}, b.attr.pan, { enabled: false }); });
                }
            }
        });
    }

    // Dựng mọi ô chưa xử lý. Chạy nhiều lần là bình thường (slidechanged, nội dung tới
    // muộn), WeakSet giữ cho mỗi ô chỉ được dựng một lần.
    function ganTatCa() {
        const ds = [];
        document.querySelectorAll(`script[type="${LOAI}"]`).forEach((khop) => {
            if (daLam.has(khop)) return;
            daLam.add(khop);
            ds.push(khop);
        });
        if (!ds.length) return;
        napCSS();
        napJS().then(() => {
            // Nối tiếp từng ô: ô thứ hai có thể phải chờ KaTeX của ô thứ nhất, và `board`
            // toàn cục đặt tạm trong lúc chạy code phải thuộc về đúng một ô tại một thời điểm.
            ds.reduce((tien, khop) => tien.then(() => ganMot(khop)).catch((loi) => {
                hienLoi(taoHop(`loi-${++lan}`, DAI_RONG, DAO_CAO), loi);
            }), Promise.resolve());
        }).catch((loi) => {
            // CDN chết: bỏ dấu "đã làm" để lần sau còn cơ hội thử lại.
            ds.forEach((khop) => daLam.delete(khop));
            hienLoi(taoHop(`loi-${++lan}`, DAI_RONG, DAO_CAO), loi);
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
        // Bài nằm trong iframe của gallery/templates, hay tab Preview bị ẩn: nội dung có
        // thể tới muộn sau DOMContentLoaded (srcdoc, doc.write) nên theo dõi thêm.
        new MutationObserver(ganTatCa).observe(document.documentElement, { childList: true, subtree: true });
    }

    khiSanSang();
}

// Ba mảnh ghép vào trang slide, đúng khuôn buildFullHtml của server: STYLE nằm trong
// <head>, SCRIPT nằm cuối <body>, BOC chạy trên nội dung bài trước khi nó vào DOM.
export const JSXGRAPH_STYLE = `<style>${JSXGRAPH_CSS}
    </style>`;

export const JSXGRAPH_SCRIPT = `<script ${JSXGRAPH_MARKER}="runtime">(${String(JSXGRAPH_MOUNT)})(${JSON.stringify(JSXGRAPH_CDN)})</script>`;
