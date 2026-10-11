import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// 배포 확인용 빌드 표식 — index.html 의 <meta name="build"> 를 라이브와 대조한다(Pages SPA 폴백은 없는 번들에도 200 을 준다)
const BUILD = process.env.BUILD_ID || `${execSync('git rev-parse --short HEAD').toString().trim()}-${Date.now().toString(36)}`;

export default defineConfig({
  base: './',
  build: { outDir: 'dist', sourcemap: false, assetsInlineLimit: 0, chunkSizeWarningLimit: 400 },
  server: { port: 3000 },
  plugins: [
    { name: 'build-id', transformIndexHtml: (html) => html.replace('__BUILD__', BUILD) },
    // 스모크 전용 페이지 — 허브를 끈 같은 게임(phaser-smoke 는 정적 서버라 /api/hub 가 404 로 콘솔을 더럽힌다).
    //   배포 때는 tools/deploy.sh 가 지운다.
    {
      name: 'smoke-page',
      apply: 'build',
      enforce: 'post',
      generateBundle(_o, bundle) {
        const html = bundle['index.html'];
        if (html && html.type === 'asset') {
          this.emitFile({ type: 'asset', fileName: 'smoke.html', source: String(html.source).replace('<head>', '<head>\n    <meta name="gb-hub" content="off" />') });
        }
      },
    },
  ],
});
