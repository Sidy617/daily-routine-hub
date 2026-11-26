// Fails the build when the shared layout, the Meulic theme or a screen breaks
// the design rules in AGENTS.md. The Original theme is the first design, kept as
// chosen, so it is not checked; other people's themes are checked as warnings.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const src = join(root, 'web', 'src');

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const files = walk(src);
const strict = files.filter(
  (f) => (f.endsWith('.tsx') || f.endsWith('.css')) && !f.includes(join('themes', '')) || f.endsWith(join('themes', 'meulic.css')),
);
const others = files.filter((f) => f.includes(join('themes', '')) && f.endsWith('.css') && !/(meulic|original)\.css$/.test(f));

const rules = [
  { name: 'no gradients', re: /(linear|radial|conic)-gradient\(/i },
  { name: 'no purple, violet or indigo', re: /\b(purple|violet|indigo)\b|#(7c3aed|8b5cf6|6366f1|4f46e5|a855f7|9333ea|667eea|764ba2)\b/i },
  { name: 'no text under 13px', re: /font-size:\s*(\d|1[0-2])(\.\d+)?px/i, onlyCss: true },
  { name: 'no fixed capital labels (use --label-case)', re: /text-transform:\s*uppercase/i, onlyCss: true },
  { name: 'no glow shadows', re: /box-shadow:[^;]*\b(0\s+0\s+\d{2,}px)/i, onlyCss: true },
  { name: 'no emoji', re: /\p{Extended_Pictographic}/u },
  { name: 'no colours in screens (use theme tokens)', re: /#[0-9a-f]{3,8}\b(?![-\w])/i, onlyTsx: true },
  { name: 'no em dashes', re: /—/ },
];

function check(list) {
  const found = [];
  for (const file of list) {
    const isCss = file.endsWith('.css');
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const r of rules) {
        if (r.onlyCss && !isCss) continue;
        if (r.onlyTsx && isCss) continue;
        if (r.re.test(line)) found.push(`${relative(root, file)}:${i + 1}  ${r.name}\n    ${line.trim()}`);
      }
    });
  }
  return found;
}

const errors = check(strict);
const warnings = check(others);
for (const w of warnings) console.warn('warning  ' + w);
if (errors.length) {
  console.error(errors.map((e) => 'error    ' + e).join('\n'));
  console.error(`\n${errors.length} design rule${errors.length === 1 ? '' : 's'} broken. See AGENTS.md.`);
  process.exit(1);
}
console.log(`design rules ok (${strict.length} files checked${warnings.length ? `, ${warnings.length} warnings in personal themes` : ''})`);
