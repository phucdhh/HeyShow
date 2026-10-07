// Test bộ vẽ TikZ/pgfplots → SVG tất định: hình học phải đúng tuyệt đối, cú pháp lạ
// phải báo unsupported chứ không được vẽ sai.
//
// Chạy: node --test server/test/tikzrender.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const R = require('../src/tikzrender');

const FIX = name => fs.readFileSync(path.join(__dirname, 'fixtures', 'tikz', name), 'utf8');

// SVG gồm đường trục (2 điểm) rồi mới tới các plot, nên muốn lấy một đường cong/ vùng tô
// thì tìm phần tử có nhiều điểm nhất.
function shapePoints(svg, tag) {
    const all = [...svg.matchAll(new RegExp(`<${tag} points="([^"]*)"`, 'g'))]
        .map(m => m[1].split(' ').map(pair => pair.split(',').map(Number)));
    assert.ok(all.length, `không có <${tag}> nào trong SVG`);
    return all.reduce((best, p) => (p.length > best.length ? p : best), all[0]);
}
const countTags = (svg, tag) => (svg.match(new RegExp(`<${tag} `, 'g')) || []).length;
const strokes = svg => [...svg.matchAll(/<polyline points="([^"]*)" fill="none" stroke="([^"]*)"/g)]
    .map(m => ({ pts: m[1].split(' ').map(p => p.split(',').map(Number)), color: m[2] }));

// ---------- biểu thức ----------

test('parseExpr tính đúng số học và lượng giác theo độ của pgfplots', () => {
    assert.equal(R.parseExpr('1+2*3', {}), 7);
    assert.equal(R.parseExpr('2^3^2', {}), 512);              // luỹ thừa kết hợp phải
    assert.equal(R.parseExpr('-2^2', {}), -4);                // dấu trừ gắn với luỹ thừa
    assert.equal(R.parseExpr('1-(-2)', {}), 3);
    assert.equal(R.parseExpr('0.25*(x-0.5)*(3.5-x)*2+0.3*x', { x: 1 }), 0.925);
    assert.ok(Math.abs(R.parseExpr('sin(deg(x))', { x: Math.PI / 2 }) - 1) < 1e-12);
    assert.ok(Math.abs(R.parseExpr('cos(60)', {}) - 0.5) < 1e-12);
    assert.equal(R.parseExpr('sqrt(16)+ln(e)+log(1000)', {}), 8);
    assert.equal(R.parseExpr('mod(7,3)', {}), 1);
});

test('parseExpr tự xử dụng phép nhân viết sát kiểu LaTeX', () => {
    assert.equal(R.parseExpr('2x', { x: 3 }), 6);
    assert.equal(R.parseExpr('2(x+1)', { x: 3 }), 8);
    assert.equal(R.parseExpr('(x+1)(x-1)', { x: 3 }), 8);
    assert.equal(R.parseExpr('\\x*\\x/2', { x: 4 }), 8);
});

test('parseExpr từ chối biểu thức lạ thay vì đoán (mã đến từ file người dùng tải lên)', () => {
    assert.throws(() => R.parseExpr('alert(1)', {}), /hàm không rõ/);
    assert.throws(() => R.parseExpr('x+1', {}), /biến không rõ/);
    assert.throws(() => R.parseExpr('1 +', {}), /biểu thức bị cụt/);
    assert.throws(() => R.parseExpr('2 ; 3', {}), /ký tự không hỗ trợ/);
    assert.throws(() => R.parseExpr('\\draw (0,0)', {}), /ký tự không hỗ trợ/);
});

// ---------- màu xcolor ----------

test('colorOf giải mã colour mix của xcolor', () => {
    assert.equal(R.colorOf('blue!25'), '#BFBFFF');
    assert.equal(R.colorOf('red'), '#FF0000');
    assert.equal(R.colorOf('blue!50!white'), '#8080FF');
    assert.equal(R.colorOf('green!40!black!25').toLowerCase(), '#bfd9bf');   // 25% của (green!40!black) với trắng
    assert.equal(R.colorOf('black!75!gray').toLowerCase(), '#202020');   // 75% đen + 25% xám
    assert.equal(R.colorOf('khongphailamausac'), null);
});

// ---------- chữ LaTeX ----------

test('nhãn LaTeX đổi thành Unicode, chỉ phần công thức mới in nghiêng', () => {
    assert.deepEqual(R.labelRuns('$2\\pi$'), [{ t: '2π', italic: true }]);
    assert.deepEqual(R.labelRuns('$v$ (m/s)'), [{ t: 'v', italic: true }, { t: ' (m/s)', italic: false }]);
    assert.equal(R.texToText('y=x^2'), 'y=x²');
    assert.equal(R.texToText('\\frac{1}{2}x'), '(1)/(2)x');
    assert.equal(R.texToText('\\sqrt{x}'), '√(x)');
});

// ---------- hình học trên trục có ghi rõ xmin/xmax/ymin/ymax ----------

const AX = (opts, body) => R.renderTikz(`\\begin{tikzpicture}\\begin{axis}[${opts}]${body}\\end{axis}\\end{tikzpicture}`);

test('toạ độ dữ liệu ánh xạ tuyến tính đúng sang điểm ảnh', () => {
    const { svg, unsupported } = AX('xmin=0,xmax=4,ymin=0,ymax=8,width=10cm,height=5cm',
        '\\addplot coordinates {(0,0)(2,4)(4,8)};');
    assert.deepEqual(unsupported, []);
    const p = shapePoints(svg, 'polyline');
    assert.equal(p.length, 3);
    // điểm giữa phải nằm chính giữa hai đầu: affine, không co kéo tuỳ hứng
    assert.ok(Math.abs((p[0][0] + p[2][0]) / 2 - p[1][0]) < 0.1);
    assert.ok(Math.abs((p[0][1] + p[2][1]) / 2 - p[1][1]) < 0.1);
    // x tăng → sang phải; y tăng → lên trên (trục ảnh ngược chiều)
    assert.ok(p[0][0] < p[2][0] && p[0][1] > p[2][1]);
    // đúng bằng hai đầu của đường trục: (0,0) chạm góc dưới-trái, (4,8) chạm góc trên-phải
    const [xAxis] = strokes(svg);
    assert.equal(p[0][1], xAxis.pts[0][1]);
    assert.equal(p[0][0], xAxis.pts[0][0]);
});

test('domain/samples quyết định số điểm lấy nghiệm của hàm', () => {
    const { svg } = AX('xmin=0,xmax=2,ymin=0,ymax=4,width=10cm,height=5cm',
        '\\addplot[domain=0:2,samples=5]{x^2};');
    const p = shapePoints(svg, 'polyline');
    assert.equal(p.length, 5);
    // mẫu thứ 3 là trung điểm domain → x=1, y=1; mẫu cuối x=2, y=4 = ymax → tỉ lệ chiều cao phải là 1/4
    const ratio = (p[0][1] - p[2][1]) / (p[0][1] - p[4][1]);
    assert.ok(Math.abs(ratio - 0.25) < 0.01, `tỉ lệ chiều cao sai: ${ratio}`);
    assert.ok(p[4][1] < p[0][1]);                            // parabol đi lên
});

test('đỉnh sin rơi đúng giữa miền 0..2π', () => {
    const { svg } = AX('xmin=0,xmax=6.28318,ymin=-1,ymax=1,width=10cm,height=5cm',
        '\\addplot[domain=0:6.28318,samples=41]{sin(deg(x))};');
    const p = shapePoints(svg, 'polyline');
    assert.equal(p.length, 41);
    const top = p.reduce((best, q, i) => (q[1] < p[best][1] ? i : best), 0);
    assert.equal(top, 10);                                   // π/2 là mẫu thứ 11 trong 41 mẫu
    const bottom = p.reduce((best, q, i) => (q[1] > p[best][1] ? i : best), 0);
    assert.equal(bottom, 30);                                  // đáy tại 3π/2
});

test('\\closedcycle đóng vùng tô xuống trục hoành bằng đúng hai điểm phụ', () => {
    const { svg } = AX('xmin=0,xmax=2,ymin=0,ymax=4,width=10cm,height=5cm',
        '\\addplot[blue!25,draw=none,domain=0:2,samples=9]{x^2}\\closedcycle;');
    const fill = shapePoints(svg, 'polygon');
    assert.equal(fill.length, 11);                           // 9 điểm hàm + 2 điểm đóng xuống y=0
    assert.equal(countTags(svg, 'polygon'), 1);
    assert.equal(strokes(svg).length, 2);                    // chỉ hai đường trục, draw=none nên không có nét
    const [xAxis] = strokes(svg);
    assert.equal(fill[9][1], xAxis.pts[0][1]);               // hai điểm phụ nằm trên trục hoành
    assert.equal(fill[10][1], xAxis.pts[0][1]);
});

test('fill between = path A nối với path B đảo chiều', () => {
    const { svg, unsupported } = AX('xmin=-0.3,xmax=2.6,ymin=-0.3,ymax=4.6,width=10cm,height=5cm',
        '\\addplot[thick,blue,domain=0:2,samples=5,name path=A]{x^2};'
        + '\\path[name path=B] (axis cs:0,0)--(axis cs:2,0);'
        + '\\addplot[blue!25] fill between[of=A and B];');
    assert.deepEqual(unsupported, []);
    const region = shapePoints(svg, 'polygon');
    assert.equal(region.length, 7);                          // 5 điểm parabol + 2 điểm trục
    assert.ok(region[6][0] < region[5][0]);                  // B đi ngược từ phải về trái
    assert.equal(countTags(svg, 'polygon'), 1);
    assert.equal(strokes(svg).filter(s => s.color !== '#000000').length, 1); // vùng tô không có viền
});

test('ybar interval dựng đúng số cột bằng số khoảng, không thừa cột rộng 0', () => {
    const { svg } = AX('xmin=0,xmax=4.4,ymin=0,ymax=4.5,width=10cm,height=5cm',
        '\\addplot[ybar interval,fill=blue!20,draw=blue!60,domain=0.5:3.5,samples=7]{1+0.25*(x-0.5)*(3.5-x)*2+0.3*x};');
    assert.equal(countTags(svg, 'polygon'), 6);              // 7 mẫu → 6 khoảng
    const bar = shapePoints(svg, 'polygon');
    assert.equal(bar.length, 4);
    assert.ok(bar[1][0] > bar[0][0]);                        // cột có bề rộng dương
    assert.ok(bar[0][1] > bar[2][1]);                        // cột dựng từ trục hoành lên tới giá trị hàm
});

test('\\addplot không ghi màu vẫn lấy đúng màu vòng của pgfplots', () => {
    const { svg } = AX('xmin=0,xmax=1,ymin=0,ymax=1,width=10cm,height=5cm',
        '\\addplot[domain=0:1,samples=3]{x};\\addplot[domain=0:1,samples=3]{x};\\addplot[domain=0:1,samples=3]{x};');
    const colors = strokes(svg).filter(s => s.pts.length === 3).map(s => s.color);
    assert.deepEqual(colors, [R.colorOf('blue!75!black'), R.colorOf('red!75!black'), R.colorOf('black!75!gray')]);
});

test('vạch khắc lấy đúng từ xtick/xticklabels, \\empty là không có vạch', () => {
    const { svg } = AX('xmin=0,xmax=4.4,ymin=0,ymax=4,width=10cm,height=5cm,xtick={0.5,3.5},xticklabels={$a$,$b$},ytick=\\empty',
        '\\addplot[domain=0:1,samples=3]{x};');
    assert.equal(countTags(svg, 'text'), 2);
    assert.match(svg, /<tspan font-style="italic">a<\/tspan>/);
    assert.match(svg, /<tspan font-style="italic">b<\/tspan>/);
});

test('axis lines=middle cho hai trục cắt nhau đúng tại gốc toạ độ', () => {
    const { svg } = AX('xmin=-0.3,xmax=2.6,ymin=-0.3,ymax=4.6,width=10cm,height=5cm,axis lines=middle',
        '\\addplot[domain=0:2,samples=5]{x^2};');
    const [xAxis, yAxis] = strokes(svg);
    assert.equal(xAxis.pts[0][1], xAxis.pts[1][1]);          // trục hoành: nằm ngang
    assert.equal(yAxis.pts[0][0], yAxis.pts[1][0]);          // trục tung: nằm đứng
    const curve = shapePoints(svg, 'polyline');
    // (0, 0) là điểm đầu của parabol → hai trục phải cắt nhau ngay tại đó
    assert.equal(xAxis.pts[0][1], curve[0][1]);
    assert.equal(yAxis.pts[0][0], curve[0][0]);
    assert.equal(countTags(svg, 'polyline'), 3);             // không vẽ thêm khung
});

// ---------- TikZ thuần ----------

test('nhãn \\node trong axis giữ màu viết trần của chính nó', () => {
    const { svg } = AX('xmin=0,xmax=2,ymin=0,ymax=2,width=10cm,height=5cm',
        '\\node[red,font=\\small] at (axis cs:1,1) {$y=x$};');
    assert.match(svg, /<text[^>]*fill="#FF0000"/);
    assert.match(svg, /<tspan font-style="italic">y=x<\/tspan>/);
});

test('TikZ thuần: mũi tên, điểm tròn, vùng tô và node', () => {
    const { svg, unsupported } = R.renderTikz(FIX('b5.tex'));
    assert.deepEqual(unsupported, []);
    assert.match(svg, /marker-end="url\(#hs-arrow\)"/);
    assert.equal(countTags(svg, 'circle'), 2);               // \fill (2,-2) circle (2pt) (8,4) circle (2pt)
    assert.equal(countTags(svg, 'polygon'), 1);              // vùng giữa parabol và đường thẳng
    assert.match(svg, /\(2,-2\)/);
    assert.match(svg, /\(8,4\)/);
});

// ---------- bảy hình thật trong giáo án tích phân ----------

test('bảy hình TikZ thật của giáo án đều dựng được, không phải fallback', () => {
    for (const f of ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7']) {
        const r = R.renderTikz(FIX(`${f}.tex`));
        assert.ok(r.svg, `${f}.tex không vẽ được: ${r.unsupported.join('; ')}`);
        assert.deepEqual(r.unsupported, [], `${f}.tex báo unsupported dù đã vẽ được`);
        assert.match(r.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
        assert.ok(!/<script|onload=|href=/i.test(r.svg), `${f}.tex sinh SVG có mã độc`);
    }
});

// ---------- từ chối cái mình không chắc ----------

test('cú pháp lạ trả về unsupported, không vẽ bừa', () => {
    const cases = [
        ['\\begin{tikzpicture}\\draw (0,0) to[out=90,in=180] (1,1);\\end{tikzpicture}', /to/],
        ['\\begin{tikzpicture}\\draw (0,0)--(1,1) arc (0:90:1cm);\\end{tikzpicture}', /arc/],
        ['\\begin{tikzpicture}\\foreach \\i in {1,2} {\\draw (0,0)--(\\i,\\i);}\\end{tikzpicture}', /foreach|không đủ toạ độ/],
        ['\\begin{tikzpicture}\\begin{axis}\\addplot {x};\\end{axis}\\end{tikzpicture}', /xmin/],
        ['\\begin{tikzpicture}\\begin{axis}[xmin=0,xmax=1,ymin=0,ymax=1]\\draw (0,0)--(1,1);\\end{axis}\\end{tikzpicture}', /coordinates/],
        ['\\begin{tikzpicture}\\draw (0,0)--(1,1);\\end{tikzpicture}\\begin{tikzpicture}\\draw (0,0)--(1,1);\\end{tikzpicture}', /tikzpicture/],
        ['\\begin{tikzpicture}[3d={}]\\draw (0,0)--(1,1);\\end{tikzpicture}', /tham số/],
        ['\\begin{tikzpicture}\\begin{axis}[xmin=0,xmax=1,ymin=0,ymax=1]\\node {x};\\end{axis}\\end{tikzpicture}', /node/]
    ];
    for (const [code, why] of cases) {
        const r = R.renderTikz(code);
        assert.equal(r.svg, null, `lẽ ra phải từ chối: ${code}`);
        assert.match(r.unsupported.join(' '), why);
    }
});

test('mã không phải tikzpicture thì trả svg=null, không ném lỗi', () => {
    for (const junk of ['', '   ', 'xin chao', '\\begin{tikzpicture}', '\\begin{tikzpicture}\\end{tikzpicture}']) {
        const r = R.renderTikz(junk);
        assert.equal(r.svg, null);
        assert.ok(r.unsupported.length);
    }
});
