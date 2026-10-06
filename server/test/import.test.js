// Test bộ máy nhập file: .pptx -> bản nháp, Markdown/beamer .tex -> bản nháp.
// Những hàm này nhận dữ liệu người dùng tải lên nên cần chắc: không ném lỗi trên
// file thật, và không chèn nguyên văn HTML độc địa vào bản nháp.
//
// Chạy: node --test server/test/

const test = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');

const pptx = require('../src/pptx');
const textimport = require('../src/textimport');

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    + 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function shape(phType, paragraphs) {
    const paras = paragraphs
        .map(p => `<a:p><a:pPr lvl="${p.lvl || 0}"/><a:r><a:t>${p.text}</a:t></a:r></a:p>`)
        .join('');
    return `<p:sp><p:nvSpPr><p:cNvPr id="1" name="s"/><p:cNvSpPr/><p:nvPr><p:ph type="${phType}"/></p:nvPr></p:nvSpPr>`
        + `<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${paras}</p:txBody></p:sp>`;
}

function slideXml(inner) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + `<p:sld ${NS}><p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/>${inner}</p:spTree></p:cSld></p:sld>`;
}

// File .pptx tối giản nhưng đúng cấu trúc: title + body + ảnh nhúng + ảnh liên kết
// ngoài + ghi chú, slide 2 có một bảng.
async function samplePptx() {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
    zip.file('ppt/presentation.xml', `<p:presentation ${NS}/>`);

    zip.file('ppt/slides/slide1.xml', slideXml(
        shape('ctrTitle', [{ text: 'Bài giảng Hình học' }])
        + shape('body', [{ text: 'Định nghĩa đường thẳng' }, { text: 'Ý phụ', lvl: 1 }, { text: '&lt;script&gt;alert(1)&lt;/script&gt;' }])
        + '<p:pic><p:nvPicPr><p:cNvPr id="7" name="anh"/><p:cNvSpPr/><p:nvPr/></p:nvPicPr>'
        + '<p:blipFill><a:blip r:embed="rId2"/></p:blipFill></p:pic>'
        + '<p:pic><p:nvPicPr><p:cNvPr id="8" name="anh-network"/><p:cNvSpPr/><p:nvPr/></p:nvPicPr>'
        + '<p:blipFill><a:blip r:link="rId3"/></p:blipFill></p:pic>'
    ));
    zip.file('ppt/slides/_rels/slide1.xml.rels', '<?xml version="1.0"?><Relationships xmlns="' + REL + '">'
        + `<Relationship Id="rId2" Type="${REL}/image" Target="../media/image1.png"/>`
        + `<Relationship Id="rId3" Type="${REL}/image" Target="https://pedu.vn/anh.png" TargetMode="External"/>`
        + `<Relationship Id="rId4" Type="${REL}/notesSlide" Target="../notesSlides/notesSlide1.xml"/>`
        + '</Relationships>');
    zip.file('ppt/notesSlides/notesSlide1.xml', slideXml(shape('body', [{ text: 'Nhắc lại tiên đề Euclid' }])));

    zip.file('ppt/slides/slide2.xml', slideXml(
        shape('title', [{ text: 'Bảng thống kê' }])
        + '<p:graphicFrame><a:graphic><a:graphicData><a:tbl><a:tr><a:tc/></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame>'
    ));

    return zip.generateAsync({ type: 'nodebuffer' });
}

// ============================ PPTX ============================

test('pptx: tách tiêu đề, bullet kèm cấp, ảnh nhúng và ảnh liên kết ngoài', async () => {
    const analysis = await pptx.analyzePptx(await samplePptx());
    assert.equal(analysis.slides.length, 2);

    const s1 = analysis.slides[0];
    assert.equal(s1.title, 'Bài giảng Hình học');
    assert.deepEqual(s1.bullets.map(b => b.lvl), [0, 1, 0], 'phải giữ cấp thụt lề');
    assert.equal(s1.notes, 'Nhắc lại tiên đề Euclid');

    // ảnh nhúng không lấy ra được (url rỗng -> client in hướng dẫn Google Drive),
    // ảnh link ngoài thì giữ nguyên url
    assert.equal(s1.images.length, 2);
    assert.equal(s1.images.find(i => i.name === 'image1.png').url, '');
    assert.equal(s1.images.find(i => i.url).url, 'https://pedu.vn/anh.png');
    assert.equal(analysis.slides[1].tables, 1);
});

test('pptx: báo cáo đếm đúng để màn hình xác nhận hiển thị', async () => {
    const report = pptx.buildReport(await pptx.analyzePptx(await samplePptx()));
    assert.equal(report.slideCount, 2);
    assert.equal(report.totals.images, 2);
    assert.equal(report.totals.tables, 1);
    assert.equal(report.totals.notes, 1, 'đếm slide có ghi chú, không đếm số dòng ghi chú');
    assert.equal(report.slides[1].title, 'Bảng thống kê');
    assert.equal(report.slides[0].bullets, 3);
});

test('pptx: bản nháp thoát HTML nên nội dung lấy từ file không chèn được script', async () => {
    const draft = pptx.buildDraftHtml(await pptx.analyzePptx(await samplePptx()), 'baigiang.pptx');
    assert.ok(draft.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'bullet phải về dạng escaped');
    assert.ok(!/<li[^>]*>\s*<script/i.test(draft), 'không được có thẻ script sống trong bullet');
    assert.equal(draft.match(/<section>/g).length, 2);
    assert.ok(draft.includes('<h1>Bài giảng Hình học</h1>'), 'slide đầu dùng h1');
    assert.ok(draft.includes('<h2>Bảng thống kê</h2>'), 'slide sau dùng h2');
    assert.ok(draft.includes('https://lh3.googleusercontent.com/d/'), 'ảnh nhúng kèm hướng dẫn thay link');
    assert.ok(draft.includes('Nhắc lại tiên đề Euclid'));
    assert.ok(draft.includes('BẢNG'), 'bảng phải được đánh dấu ⚠ chứ không im lặng mất');
});

test('pptx: ghi chú chứa "--" không được đóng sớm comment hướng dẫn', () => {
    const analysis = { slides: [{ index: 1, title: 'A', bullets: [], images: [], videos: [], tables: 0, charts: 0, smartArts: 0, notes: 'x--> y <b>chữ đậm</b>' }] };
    const draft = pptx.buildDraftHtml(analysis, 'a.pptx');
    assert.ok(draft.includes('x- -&gt; y'), `chuỗi "--" phải bị ngắt: ${draft}`);
    assert.ok(draft.includes('&lt;b&gt;chữ đậm&lt;/b&gt;'));
    // mọi comment mở ra phải được đóng đúng một lần: nếu "--" lọt vào thì số <!--
    // và --> lệch nhau, và HTML sinh ra sẽ vỡ cấu trúc khi mở trong Design.
    assert.equal(draft.match(/<!--/g).length, draft.match(/-->/g).length);
});

test('pptx: tên bản nháp bị làm sạch, không escape khỏi thư mục user', () => {
    assert.equal(pptx.draftNameFrom('Bai Giang  01.pptx'), 'Bai Giang 01');
    assert.equal(pptx.draftNameFrom('../../etc/passwd.pptx'), 'etcpasswd');
    assert.equal(pptx.draftNameFrom('a\\b:c*d?e"f<g>h|.pptx'), 'abcdefgh');
    assert.equal(pptx.draftNameFrom('   .pptx'), 'pptx-import');
    assert.equal(pptx.draftNameFrom(`${'r'.repeat(200)}.pptx`).length, 60, 'chặn tên quá dài');
});

test('pptx: file rác phải báo lỗi tiếng Việt, không ném lỗi trừu tượng', async () => {
    await assert.rejects(() => pptx.analyzePptx(Buffer.from('đây không phải zip')), /không phải định dạng Office/i);

    const notPptx = await new JSZip().file('readme.txt', 'xin chao').generateAsync({ type: 'nodebuffer' });
    await assert.rejects(() => pptx.analyzePptx(notPptx), /Không tìm thấy nội dung slide/);

    const emptyPptx = await new JSZip()
        .file('ppt/presentation.xml', `<p:presentation ${NS}/>`)
        .generateAsync({ type: 'nodebuffer' });
    await assert.rejects(() => pptx.analyzePptx(emptyPptx), /không có slide nào/i);
});

// ============================ Markdown / LaTeX ============================

test('textimport: nhận loại file từ tên gốc', () => {
    assert.equal(textimport.detectKind('Bai-Giang.MD'), 'md');
    assert.equal(textimport.detectKind('note.markdown'), 'md');
    assert.equal(textimport.detectKind('slide.tex'), 'tex');
    assert.equal(textimport.detectKind('BEAMER.TEX'), 'tex');
    for (const name of ['a.pptx', 'a.txt', 'md', '', null, 'a.md.exe']) {
        assert.equal(textimport.detectKind(name), null, `phải từ chối: ${name}`);
    }
});

test('textimport: markdown tách slide, giữ công thức KaTeX, thoát HTML độc địa', () => {
    const md = [
        '# Giải tích 1',
        '',
        '- Mở đầu',
        '  - Ý phụ thụt lề',
        '- Cảnh báo <script>alert(1)</script>',
        '',
        'Công thức $\\int_0^1 x^2 dx$ giữ nguyên.',
        '',
        '---',
        '',
        '## Chương 2',
        '',
        '```js',
        'const a = "<b>";',
        '```',
        '',
        '![logo](https://cdn.pedu.vn/logo.png)',
        '![ảnh cục bộ](images/logo.png)'
    ].join('\n');

    const analysis = textimport.analyze(md, 'md');
    assert.equal(analysis.kind, 'md');
    assert.equal(analysis.slides.length, 2);
    assert.equal(analysis.slides[0].title, 'Giải tích 1');
    assert.deepEqual(analysis.slides[0].bullets.map(b => b.lvl), [0, 1, 0]);
    assert.equal(analysis.slides[1].title, 'Chương 2');
    assert.equal(analysis.slides[0].images.length, 0);
    assert.equal(analysis.slides[1].images.length, 2);
    assert.equal(analysis.slides[1].images.find(i => i.url).url, 'https://cdn.pedu.vn/logo.png');
    assert.equal(analysis.slides[1].images.find(i => !i.url).name, 'logo.png', 'đường dẫn cục bộ chỉ còn tên file');

    const draft = textimport.buildDraftHtml(analysis, 'baigiang.md');
    assert.equal(draft.match(/<section>/g).length, 2);
    assert.ok(draft.includes('$\\int_0^1 x^2 dx$'), 'KaTeX tự render, không được phá công thức');
    assert.ok(!/<li[^>]*>\s*<script/i.test(draft), 'markdown không được chèn script sống');
    assert.ok(draft.includes('&lt;script&gt;'), 'nội dung phải về dạng escaped');
    assert.ok(draft.includes('<pre><code class="language-js">'), 'khối code giữ ngôn ngữ');
    assert.ok(draft.includes('const a = &quot;&lt;b&gt;&quot;;'), 'code bên trong cũng phải escape');
    assert.ok(draft.includes('src="https://cdn.pedu.vn/logo.png"'), 'ảnh link ngoài giữ src');
    assert.ok(draft.includes('src=""'), 'ảnh cục bộ để trống src + hướng dẫn');
});

test('textimport: beamer tách frame, bỏ comment LaTeX, lấy ghi chú \\note', () => {
    const tex = [
        '% chú thích tệp, không phải nội dung',
        '\\title{Hình học 10}',
        '\\author{Thầy Phuc}',
        '\\begin{document}',
        '\\maketitle',
        '',
        '\\begin{frame}{Giới hạn}',
        '\\begin{itemize}',
        '  \\item Định nghĩa $\\varepsilon$',
        '  \\item Ví dụ 1',
        '\\end{itemize}',
        '\\note{Ghi chú giáo viên}',
        '\\end{frame}',
        '\\end{document}'
    ].join('\n');

    const analysis = textimport.analyze(tex, 'tex');
    assert.equal(analysis.kind, 'tex');
    assert.equal(analysis.slides.length, 2, 'slide tiêu đề + 1 frame');
    assert.equal(analysis.slides[0].title, 'Hình học 10');
    assert.equal(analysis.slides[1].title, 'Giới hạn');
    assert.equal(analysis.slides[1].bullets.length, 2);
    assert.ok(analysis.slides[1].notes.includes('Ghi chú giáo viên'), analysis.slides[1].notes);
    assert.ok(!JSON.stringify(analysis).includes('chú thích tệp'), 'comment % phải bị loại');

    const draft = textimport.buildDraftHtml(analysis, 'hinhhoc.tex');
    assert.ok(draft.includes('LaTeX beamer'), 'header ghi rõ nguồn beamer');
    assert.ok(draft.includes('$\\varepsilon$'), 'giữ công thức trong bullet');
});

// Bài báo lỗi của người dùng: file beamer import vào thì công thức trong "\[ ... \]" và
// "\( ... \)" không hiện được. Nguyên nhân không phải KaTeX (plugin 6.0.2 nhận đủ bốn kiểu
// dấu) mà là bản nháp bị chính các bước gỡ lệnh LaTeX của textimport làm hỏng trước khi
// kịp tới tay KaTeX: \begin{array} trong "\[ \]" bị dropEnv vứt, \begin{align*} thì mất
// luôn cặp dấu. Test này giữ nguyên từng kiểu đã chết.
test('textimport: beamer giữ công thức nguyên vẹn để KaTeX hiển thị', () => {
    const tex = [
        '\\begin{frame}{Đạo hàm}',
        'Hàm số \\( f(x) = x^2 \\) liên tục.',
        '\\[',
        'f\'(x) = 2x \\quad \\forall x \\in \\mathbb{R}',
        '\\]',
        'Tích phân $ \\int_0^1 x\\,dx = \\tfrac{1}{2} $.',
        '\\end{frame}',
        '',
        '\\begin{frame}{Bảng xét dấu}',
        '\\[ \\begin{array}{|c|cc|}\\hline x & 0 & 1 \\hline \\end{array} \\]',
        '\\begin{equation}',
        '\\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}',
        '\\end{equation}',
        '\\begin{align*}',
        'u_n &= \\frac{1}{n} \\\\',
        'v_n &= \\frac{1}{n^2}',
        '\\end{align*}',
        '\\end{frame}',
        '',
        '\\begin{frame}{Ứng dụng}',
        '\\begin{itemize}',
        '  \\item Tỷ lệ đạt 50\\%, mỗi em 5\\$.',
        '  \\item Hàm \\[ f(x)=\\begin{cases} x & x \\ge 0 \\\\ -x & x<0 \\end{cases} \\]',
        '\\end{itemize}',
        '\\end{frame}'
    ].join('\n');

    const draft = textimport.buildDraftHtml(textimport.analyze(tex, 'tex'), 'daoham.tex');
    const flat = draft.replace(/\s+/g, ' ');
    // Bản giải mã entity: KaTeX đọc text node nên "&amp;" trong HTML chính là "&" mà toán
    // cần, so sánh trên bản này để test không phải viết tay từng entity.
    const tho = flat.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    // Mỗi công thức phải còn đủ cả cặp dấu lẫn lệnh bên trong: mất cặp dấu thì trình duyệt
    // in ra LaTeX thô, mất lệnh thì KaTeX nhận phải chuỗi rỗng.
    const cmds = ['\\( f(x) = x^2 \\)', '\\[ f\'(x) = 2x \\quad \\forall x \\in \\mathbb{R} \\]',
        '$ \\int_0^1 x\\,dx = \\tfrac{1}{2} $', '\\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}',
        '\\begin{cases} x & x \\ge 0 \\\\ -x & x<0 \\end{cases}', 'u_n &= \\frac{1}{n} \\\\ v_n'];
    for (const c of cmds) assert.ok(tho.includes(c), `công thức bị phá: ${c}`);

    // array là môi trường TOÁN (bảng xét dấu), không phải bảng HTML: phải còn trong \[ \]
    assert.ok(tho.includes('\\begin{array}{|c|cc|}\\hline x & 0 & 1 \\hline \\end{array}'),
        'array trong \\[ \\] bị dropEnv ăn mất');
    // môi trường tự đứng phải được bọc dấu ngăn cách, nếu không KaTeX không nhận ra là toán
    assert.ok(/\\\[ \\begin\{equation\}/.test(tho), 'equation phải được bọc thành \\[ ... \\]');
    assert.ok(/\\\[ \\begin\{align\*\}/.test(tho), 'align* phải được bọc thành \\[ ... \\]');

    // \$ và \% là ký tự thường, không được phép mở/đóng công thức
    assert.ok(flat.includes('50%') && flat.includes('5$'), '\\% và \\$ phải thành ký tự thường');
    assert.ok(!/5.*\\\$/.test(tho), '\\$ còn nguyên dấu chéo sẽ bị KaTeX hiểu là toán');

    // Không được để lọt ký tự điều khiển dùng làm token, cũng không escape hai lần
    assert.ok(!Array.from(draft).some(ch => ch.charCodeAt(0) < 5), 'token nội bộ lọt ra bản nháp');
    assert.ok(!/&amp;(amp|lt|gt|#39);/.test(draft), 'escape HTML hai lần');
});

test('textimport: file trống hoặc không có frame thì báo lỗi rõ ràng', () => {
    assert.throws(() => textimport.analyze('\n\n   \n', 'md'), /Không tìm thấy slide nào/);
    assert.throws(() => textimport.analyze('\\begin{document}\\end{document}', 'tex'), /begin\{frame\}/);
});
