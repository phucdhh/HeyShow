#!/usr/bin/env bash
#
# Deploy HeyShow từ máy phát triển lên Fold 4 (Termux + PM2).
#
# Đây là BẢN MẪU không chứa địa chỉ máy thật. Tạo file riêng rồi sửa host:
#   cp sync2fold4.example.sh sync2fold4.sh && ${EDITOR:-vi} sync2fold4.sh
#   (sync2fold4.sh đã nằm trong .gitignore vì chứa IP LAN + user Termux)
#
#   ./sync2fold4.sh                build + test + đồng bộ + reload + kiểm tra /health
#   ./sync2fold4.sh --dry-run      chỉ hiển thị những gì sẽ đồng bộ, không ghi gì lên điện thoại
#   ./sync2fold4.sh --skip-tests   bỏ qua bộ test khi cần deploy gấp
#   ./sync2fold4.sh --no-build     đồng bộ bản dist/ có sẵn
#
# Thư mục data/ (tài khoản, mật khẩu hash, API key AI, bài soạn của người dùng)
# luôn bị loại trừ — đồng bộ code không được phép chạm vào dữ liệu sống.
#
# Cấu hình host: biến môi trường DEPLOY_USER / DEPLOY_HOST / DEPLOY_PORT / SERVER_PORT.

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-them-vao-sync2fold4.sh-cua-ban}"
DEPLOY_HOST="${DEPLOY_HOST:-thay-bang-ip-cua-dien-thoai}"
DEPLOY_PORT="${DEPLOY_PORT:-8022}"
SERVER_PORT="${SERVER_PORT:-3000}"
REMOTE_DIR="${REMOTE_DIR:-~/HeyShow}"
SSH="ssh -p ${DEPLOY_PORT} ${DEPLOY_USER}@${DEPLOY_HOST}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

RUN_BUILD=1
RUN_TESTS=1
DRY_RUN=0
for arg in "$@"; do
    case "$arg" in
        --no-build)   RUN_BUILD=0 ;;
        --skip-tests) RUN_TESTS=0 ;;
        --dry-run)    DRY_RUN=1 ;;
        -h|--help)    sed -n '3,13p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *) echo "Bỏ qua tham số không rõ: $arg" >&2 ;;
    esac
done

step() { printf '\n==> %s\n' "$1"; }

if [[ $DRY_RUN -eq 1 ]]; then
    step 'Dry run: những file sẽ được đồng bộ'
    rsync -avni --delete \
        --exclude 'node_modules' --exclude 'client/node_modules' --exclude 'server/node_modules' \
        --exclude 'client/dist' --exclude 'data' --exclude '.git' --exclude '.env' --exclude '.env.*' \
        --exclude '*.log' --exclude '.backups' --exclude '.DS_Store' \
        ./ "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DIR}/"
    echo '--- Dry run kết thúc, không có gì được ghi. ---'
    exit 0
fi

if [[ $RUN_TESTS -eq 1 ]]; then
    step 'Chạy bộ test tích hợp (bộ máy chặn code lỗi đưa lên server)'
    npm test --silent
fi

if [[ $RUN_BUILD -eq 1 ]]; then
    step 'Build frontend'
    (cd client && node node_modules/vite/bin/vite.js build)
fi

step 'Đồng bộ lên Fold 4'
# --delete giữ cây thư mục trên điện thoại khớp bản trên máy phát triển,
# nhưng data/ đã loại trừ ở cả hai chiều nên không bao giờ bị xóa.
rsync -avz --delete \
    --exclude 'node_modules' --exclude 'client/node_modules' --exclude 'server/node_modules' \
    --exclude 'data' --exclude '.git' --exclude '.env' --exclude '.env.*' \
    --exclude '*.log' --exclude '.backups' --exclude '.DS_Store' \
    -e "ssh -p ${DEPLOY_PORT}" \
    ./ "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DIR}/"

step 'Cài dependency server và reload PM2'
$SSH <<'REMOTE'
set -e
cd ~/HeyShow/server
npm install --omit=dev
if pm2 describe heyshow >/dev/null 2>&1; then
    pm2 reload heyshow --update-env
else
    pm2 start src/app.js --name heyshow
fi
pm2 save
REMOTE

step 'Kiểm tra /health'
# Server chạy trên điện thoại nên phải hỏi qua ssh, curl ở máy phát triển không tới được.
ok=0
for _ in 1 2 3 4 5; do
    sleep 2
    response="$($SSH "curl -sf --max-time 5 http://127.0.0.1:${SERVER_PORT}/health || true")"
    if [[ -n "$response" ]]; then echo "$response"; ok=1; break; fi
done

if [[ $ok -eq 1 ]]; then
    step 'Deploy hoàn tất, server đang sống'
else
    step 'Deploy xong nhưng server KHÔNG trả lời /health — kiểm tra: pm2 logs heyshow' >&2
    exit 1
fi
