import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The new app lives in web/. The first design (index.html at the repo root)
// is copied unchanged to /original/ by scripts/copy-original.mjs.
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  test: { root: '.', include: ['web/src/**/*.test.ts'] },
} as Parameters<typeof defineConfig>[0]);
