// Giống hệt template publish của server (server/src/app.js - buildFullHtml)
// để preview trong Help/Templates trùng khớp thứ người xem nhận được.
export function previewHtml(code) {
    const template = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview - HeyShow</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.1.0/reset.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.1.0/reveal.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.1.0/theme/black.min.css">
</head>
<body>
    <div class="reveal">
        <div class="slides">
            __HEYSHOW_CODE__
        </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.1.0/reveal.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.1.0/plugin/math/math.js"><\/script>
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
                plugins: [ RevealMath.KaTeX ]
            });
        });
    <\/script>
</body>
</html>`;
    // split/join thay vì replace: code mẫu chứa "$$" của KaTeX sẽ bị hiểu nhầm là mẫu thay thế
    return template.split('__HEYSHOW_CODE__').join(code);
}
