import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
