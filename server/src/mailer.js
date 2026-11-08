// Tầng gửi thư của HeyShow (thư đặt lại mật khẩu, sau này là thông báo).
//
// Tách riêng vì cách gửi là thứ dễ thay đổi nhất: hiện tại là SMTP của Gmail với App
// Password của hộp quản trị. Google đang bỏ dần Basic SMTP để chuyển sang OAuth 2, khi
// đó chỉ sửa module này — luồng đặt lại mật khẩu trong app.js giữ nguyên.
//
// Bốn cấu hình, theo thứ tự ưu tiên (khai báo trong server/.env — file này bị rsync loại
// trừ nên bí mật không bao giờ bị bản trên máy phát triển đè lên bản trên máy chủ):
//   MAIL_TRANSPORT=capture  -> ghi thư vào data/mail-outbox.jsonl (dev + test, không cần mật khẩu)
//   MAIL_TRANSPORT=off      -> tắt hẳn, kể cả khi .env đã có SMTP_USER/SMTP_PASS
//   SMTP_USER + SMTP_PASS   -> gửi thật qua SMTP (mặc định smtp.gmail.com:587)
//   còn lại                 -> tắt: send() báo chưa gửi để caller trả lời người dùng thẳng thắn
//   MAIL_FROM               -> chữ ký người gửi, mặc định = SMTP_USER (Gmail chỉ cho gửi
//                              đúng hộp đã xác thực hoặc alias đã bật "Send mail as")
//   PASSWORD_RESET_TTL_MINUTES / PASSWORD_RESET_RESEND_SECONDS /
//   PASSWORD_RESET_MAX_PER_IP / PASSWORD_RESET_MAX_PER_HOUR / PUBLIC_BASE_URL
// `off` thắng credentials: người vận hành đã nói tắt thì không được âm thầm gửi thư thật.

const fs = require('fs');
const path = require('path');

const nodemailer = require('nodemailer');

const GMAIL_HOST = 'smtp.gmail.com';
const OUTBOX_FILE = 'mail-outbox.jsonl';

// "HeyShow <phuc@example.edu.vn>" -> "phuc@example.edu.vn"
function addressOf(from) {
    const match = String(from || '').match(/[^\s<>"',;]+@[^\s<>"',;]+/);
    return match ? match[0].toLowerCase() : '';
}

function createMailer({ dataDir } = {}) {
    const transport = String(process.env.MAIL_TRANSPORT || '').trim().toLowerCase();
    const host = String(process.env.SMTP_HOST || GMAIL_HOST).trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const user = String(process.env.SMTP_USER || '').trim();
    // App Password Google sinh ra dạng "abcd efgh ijkl mnop"; khoảng trắng dán từ trình
    // duyệt là lỗi của giao diện chứ không phải của mật khẩu, nên xử lý ở đây.
    const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
    const from = String(process.env.MAIL_FROM || user).trim();
    const capture = transport === 'capture';
    // MAIL_TRANSPORT=off là lệnh tắt của người vận hành: phải thắng cả credentials trong .env.
    const disabled = transport === 'off';
    const outbox = dataDir ? path.join(dataDir, OUTBOX_FILE) : null;

    let smtp = null;
    if (!capture && !disabled && user && pass) {
        smtp = nodemailer.createTransport({
            host,
            port,
            // 465 là Implicit TLS; mọi port khác phải ép STARTTLS, nếu không App
            // Password bị gửi plaintext trên đường truyền.
            secure: port === 465,
            requireTLS: port !== 465,
            auth: { user, pass },
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 12000
        });
        const fromAddress = addressOf(from);
        if (fromAddress && fromAddress !== user.toLowerCase()) {
            console.warn(`[mail] From "${from}" không phải hộp "${user}": Gmail chỉ cho gửi`);
            console.warn('[mail] đúng hộp đã xác thực (hoặc alias đã bật "Send mail as").');
        }
    }

    function describe() {
        if (capture) return `capture:${outbox}`;
        if (smtp) return `smtp:${host}:${port} (${user})`;
        return 'off';
    }

    // Gửi nhưng không bao giờ nổ ra ngoài: thất bại là chuyện của log và của người dùng
    // cuối, còn request thì đã trả lời rồi.
    async function send({ to, subject, text, html }) {
        const envelope = {
            from,
            to: String(to || '').trim(),
            subject: String(subject || '').trim(),
            text: String(text || ''),
            ...(html ? { html: String(html) } : {})
        };
        if (!envelope.to) return { sent: false, reason: 'thiếu người nhận' };

        if (capture) {
            if (!outbox) return { sent: false, reason: 'chưa có thư mục dữ liệu để ghi outbox' };
            fs.mkdirSync(path.dirname(outbox), { recursive: true });
            fs.appendFileSync(outbox, JSON.stringify({ ...envelope, at: new Date().toISOString() }) + '\n', { mode: 0o600 });
            return { sent: true, captured: true };
        }
        if (!smtp) return { sent: false, reason: 'HeyShow chưa bật gửi thư' };

        try {
            const info = await smtp.sendMail(envelope);
            return { sent: true, messageId: info.messageId };
        } catch (err) {
            return { sent: false, reason: err.message };
        }
    }

    return { enabled: () => Boolean(capture || smtp), describe, send };
}

module.exports = { createMailer, addressOf };
