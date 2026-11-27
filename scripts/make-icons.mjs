// Writes web/public/icon.svg from the logo drawing in web/src/components/Brand.tsx,
// so the browser icon and the app's mark stay the same drawing. Run after changing the logo.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const brand = readFileSync(join(root, 'web/src/components/Brand.tsx'), 'utf8');
const paths = [...brand.match(/LOGO_PATHS = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const lines = `<circle cx="110" cy="110" r="97"/>${paths.map((d) => `<path d="${d}"/>`).join('')}`;
const w = 12; // drawn small in a browser tab, so thick and without the light line
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a52"/><stop offset=".55" stop-color="#f26a1b"/><stop offset="1" stop-color="#d9520a"/></linearGradient></defs><g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#b9450a" stroke-width="${w}">${lines}</g><g stroke="url(#b)" stroke-width="${w * 0.62}" transform="translate(-.5 -.5)">${lines}</g></g></svg>\n`;
writeFileSync(join(root, 'web/public/icon.svg'), svg);
console.log('wrote web/public/icon.svg');
