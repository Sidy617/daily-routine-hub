// Fails the build when screens, components or the Meulic theme break the design rules
// in AGENTS.md. The Original theme is the first design, kept as chosen, so it is not checked;
// other people's themes are checked as warnings. Code from 21st.dev keeps its own look.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const src = join(root, 'web', 'src');

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const rel = (f) => relative(src, f).split(sep).join('/');
const files = walk(src).filter((f) => /\.(tsx|css)$/.test(f));
// Drawings (the logo and the share picture) need real colours; 21st.dev code is kept as received.
const exempt = (r) => r === 'components/Brand.tsx' || r === 'components/ShareCard.tsx' || r.startsWith('components/ui/glass-');
const themeFile = (r) => r.startsWith('themes/');
const strict = files.filter((f) => {
  const r = rel(f);
  if (exempt(r)) return false;
  if (themeFile(r)) return r === 'themes/meulic.css';
  return true;
});
const others = files.filter((f) => themeFile(rel(f)) && !/(meulic|original)\.css$/.test(f));

const rules = [
  { name: 'no purple, violet or indigo', re: /\b(purple|violet|indigo)-\d|#(7c3aed|8b5cf6|6366f1|4f46e5|a855f7|9333ea|667eea|764ba2|5856d6|5e5ce6)\b/i },
  { name: 'no text under 11px', re: /font-size:\s*(\d|10)(\.\d+)?px|text-\[(\d|10)(\.\d+)?px\]/i },
  { name: 'no fixed capital labels (use label-case)', re: /text-transform:\s*uppercase|\buppercase\b/ },
  { name: 'no emoji', re: /\p{Extended_Pictographic}/u },
  { name: 'no colours written into screens (use theme tokens)', re: /#[0-9a-f]{3,8}\b(?![-\w])/i, onlyTsx: true },
  { name: 'gradients belong in theme files', re: /(linear|radial|conic)-gradient\(|bg-(linear|radial|gradient)-/i, notThemes: true },
  { name: 'no em dashes', re: /—/ },
];

function check(list) {
  const found = [];
  for (const file of list) {
    const r = rel(file);
    const isCss = file.endsWith('.css');
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments explain, they don't style
        for (const rule of rules) {
          if (rule.onlyTsx && isCss) continue;
          if (rule.notThemes && themeFile(r)) continue;
          if (rule.notThemes && r === 'styles/app.css' && /wallpaper|data:image/.test(line)) continue;
          if (rule.re.test(line)) found.push(`web/src/${r}:${i + 1}  ${rule.name}\n    ${line.trim().slice(0, 140)}`);
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
