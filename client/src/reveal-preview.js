// Giống hệt template publish của server (server/src/app.js - buildFullHtml)
// để preview trong Help/Templates trùng khớp thứ người xem nhận được.
import { REVEAL_CSS, REVEAL_JS, REVEAL_MATH_JS, REVEAL_KATEX_OPTS } from './reveal-cdn.js';

export function previewHtml(code) {
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
    </style>
</head>
<body>
    <div class="reveal">
        <div class="slides">
            __HEYSHOW_CODE__
        </div>
    </div>
    ${REVEAL_JS}
    ${REVEAL_MATH_JS}
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
                ${REVEAL_KATEX_OPTS},
                plugins: [ RevealMath.KaTeX ]
            });
        });
    </script>
</body>
</html>`;
    // split/join thay vì replace: code mẫu chứa "$$" của KaTeX sẽ bị hiểu nhầm là mẫu thay thế
    return template.split('__HEYSHOW_CODE__').join(code);
}
