import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// 배포 확인용 빌드 표식 — index.html 의 <meta name="build"> 를 라이브와 대조한다(Pages SPA 폴백은 없는 번들에도 200 을 준다)
const BUILD = process.env.BUILD_ID || `${execSync('git rev-parse --short HEAD').toString().trim()}-${Date.now().toString(36)}`;

export default defineConfig({
  base: './',
  build: { outDir: 'dist', sourcemap: false, assetsInlineLimit: 0, chunkSizeWarningLimit: 400 },
  server: { port: 3000 },
  plugins: [{ name: 'build-id', transformIndexHtml: (html) => html.replace('__BUILD__', BUILD) }],
});
