// Giống hệt template publish của server (server/src/app.js - buildFullHtml)
// để preview trong Help/Templates trùng khớp thứ người xem nhận được.
import { REVEAL_CSS, REVEAL_JS, REVEAL_MATH_JS, REVEAL_KATEX_OPTS, REVEAL_SCROLL_MODE_OFF } from './reveal-cdn.js';
import { JSXGRAPH_BOC, JSXGRAPH_STYLE, JSXGRAPH_SCRIPT } from './jsxgraph-runtime.js';

export function previewHtml(code) {
    // <jsxgraph> phải đổi thành script raw-text trước khi vào DOM, và runtime chỉ được nạp
    // khi mẫu thật sự có hình — đúng điều kiện buildFullHtml của bản publish.
    const coJsxgraph = /<\s*jsxgraph\b/i.test(code);
    const template = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview - HeyShow</title>
    ${REVEAL_CSS}
    <style>
        /* Giống hệt chốt chặn trong buildFullHtml của server: CSS của bài viết ghi
           display:!important lên .reveal .slides section sẽ làm mọi slide chồng lên nhau. */
        @media screen {
            html:not(.reveal-print) .reveal:not(.overview) .slides>section:not(.present),
            html:not(.reveal-print) .reveal:not(.overview) .slides>section>section:not(.present) {
                display: none !important;
            }
        }
        /* Preview chỉ để xem bố cục nên cho hiện sẵn mọi fragment. Nếu không, những slide
           dựng toàn nội dung trong fragment (dòng thời gian, ba con số) chỉ còn khoảng trống. */
        .reveal .slides section .fragment {
            opacity: 1 !important; visibility: visible !important; transform: none !important;
        }
    </style>${coJsxgraph ? `\n    ${JSXGRAPH_STYLE}` : ''}
</head>
<body>
    <div class="reveal">
        <div class="slides">
            __HEYSHOW_CODE__
        </div>
    </div>
    ${REVEAL_JS}
    ${REVEAL_MATH_JS}${coJsxgraph ? `\n    ${JSXGRAPH_SCRIPT}` : ''}
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const masters = document.querySelectorAll('section-master');
            let masterContent = '';
            masters.forEach(m => {
                masterContent += m.innerHTML;
                m.remove();
            });
            if (masterContent) {
                document.querySelectorAll('.reveal .slides section').forEach(sec => {
                    if (sec.querySelectorAll('section').length === 0) {
                        sec.insertAdjacentHTML('afterbegin', masterContent);
                    }
                });
            }
            Reveal.initialize({
                hash: false,
                slideNumber: true,
                // Dưới 435px bề ngang, Reveal 6 tự bật chế độ cuộn (body nhận .reveal-scroll)
                // và bỏ phép co slide về vừa khung: khung preview chỉ vài trăm px nên slide
                // hiện ra cắt góc trên nền đen. Bản publish cũng tắt như vậy — xem
                // REVEAL_SCROLL_MODE_OFF ở server/src/slide-parts.js.
                ${REVEAL_SCROLL_MODE_OFF},
                ${REVEAL_KATEX_OPTS},
                plugins: [ RevealMath.KaTeX ]
            });
        });
    </script>
</body>
</html>`;
    // split/join thay vì replace: code mẫu chứa "$$" của KaTeX sẽ bị hiểu nhầm là mẫu thay thế
    return template.split('__HEYSHOW_CODE__').join(coJsxgraph ? JSXGRAPH_BOC(code) : code);
}
