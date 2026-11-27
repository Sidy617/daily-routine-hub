// Asks the live database whether every table, link and action the app uses exists.
// Signed out, so it reads nothing: a "permission denied" answer means the thing exists
// and its rules work; "not found" or "no relationship" fails the build.
// Added after the Team screen broke on a missing team_members -> profiles link (26 Nov 2026).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const config = readFileSync(join(root, 'web', 'src', 'lib', 'config.ts'), 'utf8');
const url = /SUPABASE_URL = '([^']+)'/.exec(config)[1];
const key = /SUPABASE_KEY = '([^']+)'/.exec(config)[1];
const api = readFileSync(join(root, 'web', 'src', 'lib', 'api.ts'), 'utf8');

// A call these patterns cannot read would be skipped without a word (login_faces_v2 was, 27 Nov 2026), so it fails instead.
const count = (re) => [...api.matchAll(re)].length;
const unread = count(/\.rpc\(/g) - count(/\.rpc\('[a-z0-9_]+'/g) + count(/\bdb\.from\(/g) - count(/\bdb\.from\('[a-z0-9_]+'\)/g);
if (unread) {
  console.error(`${unread} call(s) in api.ts this check cannot read. Name tables and functions in plain quotes, or teach the patterns below.`);
  process.exit(1);
}

const tables = [...new Set([...api.matchAll(/\.from\('([a-z0-9_]+)'\)/g)].map((m) => m[1]))].filter((t) => t !== 'avatars');
const embeds = [...api.matchAll(/\.from\('([a-z0-9_]+)'\)\.select\('([a-z0-9_]+)\(/g)].map((m) => [m[1], m[2]]);
// Every column list the app reads, so a column the database lacks fails here, not on someone's phone.
const selects = [...new Set([...api.matchAll(/\.from\('([a-z0-9_]+)'\)\.select\('([^'*]+)'\)/g)].map((m) => `${m[1]}?select=${m[2]}`))];
// Functions are found by name and input names, so send each call's inputs (as null).
const rpcs = [...new Map([...api.matchAll(/\.rpc\('([a-z0-9_]+)'(?:,\s*\{([^}]*)\})?/g)].map((m) => {
  const args = (m[2] ?? '').split(',').map((a) => a.split(':')[0].trim()).filter(Boolean);
  return [m[1], Object.fromEntries(args.map((a) => [a, null]))];
})).entries()];

const headers = { apikey: key, 'content-type': 'application/json' };
const fails = [];

async function probe(label, res) {
  const body = await res.text();
  let code = '';
  try {
    code = JSON.parse(body).code ?? '';
  } catch {
    /* not json */
  }
  const missing = ['PGRST200', 'PGRST202', 'PGRST205', '42P01', '42883', '42703'].includes(code) || res.status === 404;
  console.log(`${missing ? 'MISSING' : 'ok     '}  ${label}  (${res.status}${code ? ' ' + code : ''})`);
  if (missing) fails.push(label);
}

for (const t of tables) await probe(`table ${t}`, await fetch(`${url}/rest/v1/${t}?select=*&limit=0`, { headers }));
for (const [t, rel] of embeds) await probe(`link ${t} -> ${rel}`, await fetch(`${url}/rest/v1/${t}?select=${rel}(*)&limit=0`, { headers }));
for (const s of selects) await probe(`columns ${s}`, await fetch(`${url}/rest/v1/${s}&limit=0`, { headers }));
for (const [fn, args] of rpcs) await probe(`action ${fn}`, await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args) }));

if (fails.length) {
  console.error(`\n${fails.length} missing in the live database: ${fails.join(', ')}. Apply the migration before merging.`);
  process.exit(1);
}
console.log(`\napi ok: ${tables.length} tables, ${embeds.length} links, ${selects.length} column lists, ${rpcs.length} actions`);
