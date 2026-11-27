import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// The new app lives in web/. The first design (index.html at the repo root)
// is copied unchanged to /original/ by scripts/copy-original.mjs.
export default defineConfig({
  root: 'web',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./web/src', import.meta.url)) } },
  build: { outDir: '../dist', emptyOutDir: true },
  test: { root: '.', include: ['web/src/**/*.test.ts'] },
} as Parameters<typeof defineConfig>[0]);
