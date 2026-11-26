// Serves the first design, unchanged, at /original/ next to the new app.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'dist', 'original'), { recursive: true });
copyFileSync(join(root, 'index.html'), join(root, 'dist', 'original', 'index.html'));
console.log('first design copied to dist/original/');
