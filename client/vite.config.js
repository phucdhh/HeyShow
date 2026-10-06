import { defineConfig } from 'vite';
import { resolve } from 'path';

// Khi chạy `npm run dev` ở client, trình duyệt là http://localhost:5173 còn backend
// ở http://localhost:3000. Các trang gọi API bằng đường dẫn tương đối (/api/...) nên
// phải chuyển tiếp sang server, nếu không mọi request sẽ 404 trên port của Vite.
const BACKEND = process.env.HEYSHOW_BACKEND || 'http://localhost:3000';

export default defineConfig({
  server: {
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        gallery: resolve(__dirname, 'gallery.html'),
        profile: resolve(__dirname, 'profile.html'),
        landing: resolve(__dirname, 'landing.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        help: resolve(__dirname, 'help.html'),
        templates: resolve(__dirname, 'templates.html')
      }
    }
  }
});
