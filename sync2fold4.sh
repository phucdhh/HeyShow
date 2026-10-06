#!/bin/bash

# Kịch bản build và đồng bộ code từ Mac lên Fold 4 (Termux)
# Có loại trừ thư mục data/ để không làm mất slide của người dùng

echo "==> Đang build Frontend..."
cd client
npm run build
cd ..

echo "==> Đang đồng bộ dự án HeyShow lên Fold 4..."

rsync -avz \
  --exclude 'node_modules' \
  --exclude 'client/node_modules' \
  --exclude 'server/node_modules' \
  --exclude 'data' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  --exclude '.env' \
  -e "ssh -p 8022" \
  ./ u0_a341@192.168.1.84:~/HeyShow/

echo "==> Đồng bộ hoàn tất!"
echo "==> Gợi ý lệnh khởi động lại server trên Fold 4:"
echo "ssh -p 8022 u0_a341@192.168.1.84 \"cd ~/HeyShow/server && npm install && pm2 restart heyshow || pm2 start src/app.js --name heyshow\""
