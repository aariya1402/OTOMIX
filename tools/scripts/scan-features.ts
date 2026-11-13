// GAP-015, RBAC-M02: drift detector between ROUTE_SCOPES and permissions.seed.sql
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROUTE_SCOPES } from '../../packages/gateway/src/scopes';

const SEED_PATH = resolve(__dirname, '..', '..', 'packages', 'db', 'seeds', 'permissions.seed.sql');

function extractSeedKeys(sql: string): string[] {
  const keys = new Set<string>();
  const re = /\(\s*'([^']+)'\s*,\s*'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) { keys.add(m[1]); }
  return Array.from(keys).sort();
}

function extractRouteScopes(): string[] {
  const set = new Set<string>();
  for (const entry of ROUTE_SCOPES) {
    for (const s of entry.scopes) { set.add(s); }
  }
  return Array.from(set).sort();
}

function main(): void {
  const sql = readFileSync(SEED_PATH, 'utf8');
  const seedKeys = extractSeedKeys(sql);
  const routeScopes = extractRouteScopes();

  const missing: string[] = [];
  for (const s of routeScopes) {
    if (!seedKeys.includes(s)) { missing.push(s); }
  }
  const unused = seedKeys.filter((k) => !routeScopes.includes(k));

  const lines: string[] = [];
  lines.push('=== scan-features: ROUTE_SCOPES vs permissions.seed.sql ===');
  lines.push('route scopes: ' + routeScopes.length + ' | seed keys: ' + seedKeys.length);
  lines.push('');
  for (const s of routeScopes) {
    lines.push('  ' + s + ' -> ' + (seedKeys.includes(s) ? 'OK' : 'MISSING'));
  }
  if (missing.length > 0) {
    lines.push('');
    lines.push('MISSING keys (' + missing.length + '):');
    for (const m of missing) { lines.push('  - ' + m); }
    process.stdout.write(lines.join('\n') + '\n');
    process.exit(1);
  }
  if (unused.length > 0) {
    lines.push('');
    lines.push('UNREFERENCED seed keys (' + unused.length + ', informational only):');
    for (const u of unused) { lines.push('  ~ ' + u); }
  }
  lines.push('');
  lines.push('RESULT: no missing route-scope keys. Drift check OK.');
  process.stdout.write(lines.join('\n') + '\n');
}

main();