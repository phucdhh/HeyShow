#!/usr/bin/env bash
#
# Sao lưu dữ liệu HeyShow (tài khoản, bài soạn, bình luận, ảnh đại diện).
#
#   ./scripts/backup-data.sh              kéo data/ đang chạy trên Fold 4 về máy
#   ./scripts/backup-data.sh --local      sao lưu data/ ngay trên máy phát triển
#   KEEP=30 ./scripts/backup-data.sh      giữ 30 bản thay vì 14
#   HEYSHOW_BACKUP_DIR=/Volumes/SSD/bs ./scripts/backup-data.sh
#
# Bản sao đặt ngoài thư mục dự án theo mặc định ($HOME/HeyShowBackups) để Google
# Drive không đẩy lên cloud — trong data/ có hash mật khẩu và API key AI.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Địa chỉ máy chủ thật không nằm trong git: chúng chỉ sống trong sync2fold4.sh,
# file bị gitignore. Script này đọc lại giá trị mặc định ở đó để khỏi nhập tay;
# biến môi trường vẫn được ưu tiên cao nhất.
SYNC_FILE="$ROOT_DIR/sync2fold4.sh"
sync_default() {
    [[ -f "$SYNC_FILE" ]] || return 0
    sed -n "s|^[[:space:]]*$1=\"\\\${$1:-\\(.*\\)}\".*|\\1|p" "$SYNC_FILE" | head -n1
}

DEPLOY_USER="${DEPLOY_USER:-$(sync_default DEPLOY_USER)}"
DEPLOY_HOST="${DEPLOY_HOST:-$(sync_default DEPLOY_HOST)}"
DEPLOY_PORT="${DEPLOY_PORT:-$(sync_default DEPLOY_PORT)}"
REMOTE_DIR="${REMOTE_DIR:-HeyShow}"
BACKUP_DIR="${HEYSHOW_BACKUP_DIR:-$HOME/HeyShowBackups}"
KEEP="${KEEP:-14}"

MODE=remote
if [[ "${1:-}" == "--local" ]]; then MODE=local; fi

if [[ "$MODE" == remote && -z "$DEPLOY_USER$DEPLOY_HOST" ]]; then
    echo "Chưa có địa chỉ máy chủ. Chạy: cp sync2fold4.example.sh sync2fold4.sh rồi điền" >&2
    echo "DEPLOY_USER/DEPLOY_HOST, hoặc truyền trực tiếp: DEPLOY_HOST=... DEPLOY_USER=... $0" >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"
OUT="${BACKUP_DIR}/heyshow-data-$(date +%Y%m%d-%H%M%S).tar.gz"

echo "==> Tạo bản sao ($MODE) tại $OUT"
# Server vẫn đang chạy khi ta sao lưu: tầng lưu trữ ghi theo kiểu file tạm + rename,
# nên tar luôn bắt được các file hoàn chỉnh.
if [[ "$MODE" == remote ]]; then
    ssh -p "$DEPLOY_PORT" "${DEPLOY_USER}@${DEPLOY_HOST}" "tar -czf - -C ~/${REMOTE_DIR} data" > "$OUT"
else
    tar -czf "$OUT" -C "$ROOT_DIR" data
fi

echo "==> Kiểm tra tính nguyên vẹn"
tar -tzf "$OUT" >/dev/null

BYTES=$(wc -c < "$OUT" | tr -d ' ')
if [[ "$BYTES" -lt 1024 ]]; then
    echo "!! Bản sao chỉ ${BYTES} byte — data/ trống hoặc tar đã lỗi. Giữ file để xem: $OUT" >&2
    exit 1
fi
echo "   OK, ${BYTES} byte"

PUBLISHED=$(tar -tzf "$OUT" | grep -c '/published/.*\.html$' || true)
DRAFTS=$(tar -tzf "$OUT" | grep -c '/drafts/.*\.html$' || true)
echo "   Bên trong: ${PUBLISHED} bài đã publish, ${DRAFTS} bản nháp"

# bash 3.2 (macOS) không có mapfile nên giữ lại bằng vòng lặp POSIX
ls -1t "${BACKUP_DIR}"/heyshow-data-*.tar.gz 2>/dev/null \
    | tail -n +$((KEEP + 1)) \
    | while read -r old; do
        echo "==> Xóa bản cũ: $old"
        rm -f "$old"
    done

TOTAL=$(ls -1 "${BACKUP_DIR}"/heyshow-data-*.tar.gz | wc -l | tr -d ' ')
echo "==> Xong. Còn ${TOTAL} bản trong ${BACKUP_DIR}"

cat <<EOF

Khôi phục khi cần (dừng server trước để tránh ghi đè file đang mở):
  ssh -p ${DEPLOY_PORT} ${DEPLOY_USER}@${DEPLOY_HOST} 'pm2 stop heyshow'
  cat ${OUT} | ssh -p ${DEPLOY_PORT} ${DEPLOY_USER}@${DEPLOY_HOST} 'tar -xzf - -C ~/${REMOTE_DIR}'
  ssh -p ${DEPLOY_PORT} ${DEPLOY_USER}@${DEPLOY_HOST} 'pm2 restart heyshow'
EOF
