import { defineConfig } from 'vite';
import { copyFileSync } from 'node:fs';

export default defineConfig({
  plugins: [{
    name: 'use-main-html-app',
    closeBundle() {
      copyFileSync('index-1.html', 'dist/index.html');
    }
  }]
});
