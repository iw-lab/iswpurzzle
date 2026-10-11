import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist', sourcemap: false, assetsInlineLimit: 0, chunkSizeWarningLimit: 400 },
  server: { port: 3000 },
});
