import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

const ROOT = path.resolve(__dirname, '..', '..');
const CONFIG = path.join(ROOT, '.dependency-cruiser.cjs');

function findEntry(): string {
  const candidates = [
    'node_modules/dependency-cruiser/bin/dependency-cruise.mjs',
    'node_modules/dependency-cruiser/bin/dependency-cruise.js',
    'node_modules/dependency-cruiser/bin/depcruise.mjs',
    'node_modules/dependency-cruiser/bin/depcruise.js',
  ];
  for (const c of candidates) {
    const abs = path.join(ROOT, c);
    if (fs.existsSync(abs)) return abs;
  }
  throw new Error('depcruise entry not found');
}

const ENTRY = findEntry();

function runDepcruise(cwd: string, dirs: string[], configPath: string): { violations: number; raw: any } {
  const args = [ENTRY, '--config', configPath, '--output-type', 'json', ...dirs];
  let stdout = '';
  try {
    stdout = execFileSync(process.execPath, args, {
      cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err: any) {
    if (err && err.stdout) { stdout = err.stdout.toString(); } else { throw err; }
  }
  let parsed: any = {};
  try { parsed = JSON.parse(stdout); } catch { parsed = {}; }
  return { violations: countViolations(parsed), raw: parsed };
}

/**
 * Walk modules[].dependencies[] first. depcruise v16 can report a
 * summary.violations object with all-zero counts even when individual
 * dependencies carry `valid: false` + rule matches, so trusting the
 * summary alone silently under-reports. The dependency graph is the
 * ground truth; summary is only a fallback.
 */
function countViolations(parsed: any): number {
  let count = 0;
  const modules = parsed?.modules || parsed?.output?.modules || [];
  for (const m of modules) {
    for (const d of (m.dependencies || [])) {
      if (d.valid === false && Array.isArray(d.rules) && d.rules.length > 0) count++;
    }
  }
  if (count > 0) return count;

  const s = parsed?.summary || parsed?.output?.summary;
  if (s?.violations) {
    if (typeof s.violations === 'number') return s.violations;
    if (typeof s.violations === 'object') {
      return (s.violations.error || 0) + (s.violations.warn || 0) + (s.violations.info || 0);
    }
  }
  return 0;
}

describe('no-decoder-on-main (P07-T02-S01-M01)', () => {
  it('real graph: 0 violations', () => {
    const dirs = ['packages/gateway/src', 'packages/ui/src']
      .map((d) => path.join(ROOT, d))
      .filter((d) => fs.existsSync(d));
    if (dirs.length === 0) return;
    const r = runDepcruise(ROOT, dirs, CONFIG);
    if (r.violations !== 0) {
      console.error('depcruise violations:', JSON.stringify(r.raw, null, 2).slice(0, 4000));
    }
    expect(r.violations).toBe(0);
  });

  it('synthetic violation: gateway importing decode triggers rule (temp file in real tree)', () => {
    const violator = path.join(ROOT, 'packages', 'gateway', 'src', '__no_decoder_violator.ts');
    try {
      fs.writeFileSync(
        violator,
        "import { decodeAll } from '../../workers/src/decode';\nexport const x = decodeAll;\n",
      );
      const r = runDepcruise(ROOT, [path.join(ROOT, 'packages', 'gateway', 'src')], CONFIG);
      if (r.violations === 0) {
        const modules = r.raw?.modules || r.raw?.output?.modules || [];
        const v = modules.find((m: any) => String(m.source || m.name || '').includes('__no_decoder_violator'));
        console.error('expected >=1 violation but got 0');
        console.error('summary:', JSON.stringify(r.raw?.summary ?? r.raw?.output?.summary ?? {}, null, 2));
        console.error('violator module:', v ? JSON.stringify({ source: v.source, deps: v.dependencies }, null, 2).slice(0, 3000) : 'not found');
      }
      expect(r.violations).toBeGreaterThan(0);
    } finally {
      if (fs.existsSync(violator)) { try { fs.unlinkSync(violator); } catch {} }
    }
  });
});