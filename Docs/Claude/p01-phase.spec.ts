/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * OTOMIX — Phase P01 independent verification suite
 * -----------------------------------------------------------------------------
 * Location : tools/test/p01-phase.spec.ts
 * Run      : pnpm vitest run tools/test/p01-phase.spec.ts
 *
 * Written from OTOMIX_MicroTask_Plan.md (P01 section), NOT from the agent's code.
 * Philosophy: the agent's own 142 tests prove the code agrees with the agent.
 * This suite proves the code agrees with the PLAN, and hunts the defect classes
 * that self-written tests typically miss (phantom deps, BOM, masked regressions,
 * missing gate wiring, literal duplication, unparameterised SQL, ...).
 *
 * Sections
 *   A  Repository / toolchain / CI gates          (T01)
 *   B  Constants registry                         (T02)
 *   C  Domain types + registry schema + semver    (T03)
 *   D  Protobuf contract                          (T04-S01)
 *   E  Gateway: status map, idempotency, dedup    (T04-S02, T06)
 *   F  Persistence: SQL, RLS, withTenant          (T05)  [static; live DB checks are in the audit prompt]
 *   G  Resilience: retry + degraded mode          (T07)
 *   H  Telemetry: logger + traceparent            (T08)  [needs the ADAPTERS block]
 *   I  Dependency graph / cycles / phantom deps   (cross-cutting)
 *   J  Plan conformance, test inventory, P01-IT   (meta)
 *
 * ADAPTERS: only logger/propagation need API knowledge the plan does not give.
 * Fill the ADAPTERS block (bottom of the helpers) once. Do NOT change assertions.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire, builtinModules } from 'module';
import { pathToFileURL } from 'url';

// =============================================================================
// Helpers
// =============================================================================
const ROOT = path.resolve(__dirname, '..', '..');
const PKGS = path.join(ROOT, 'packages');
const PACKAGES = ['core', 'access', 'adapter', 'gateway', 'workers', 'ui', 'db', 'proto', 'contracts'];
const IGNORE = new Set(['node_modules', 'dist', '.git', 'coverage', '.turbo', 'build', '.next']);

function walk(dir: string, accept: (f: string) => boolean = () => true): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, accept));
    else if (accept(full)) out.push(full);
  }
  return out;
}
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');
const abs = (r: string) => path.join(ROOT, r);
const exists = (r: string) => fs.existsSync(abs(r));
const read = (f: string) => fs.readFileSync(f, 'utf-8'); // raw: deliberately NO stripBom
const readRel = (r: string) => read(abs(r));
const isTs = (f: string) => /\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f);
const srcFiles = (pkg: string) => walk(path.join(PKGS, pkg, 'src'), isTs);
const testFiles = (pkg: string) => walk(path.join(PKGS, pkg, 'test'), isTs);
const pkgJson = (pkg: string) => JSON.parse(readRel(`packages/${pkg}/package.json`));

/** Remove // and block comments (crude but sufficient for literal hunting). */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

async function loadFile(r: string): Promise<any> {
  if (!exists(r)) throw new Error(`Missing file required by the plan: ${r}`);
  return import(/* @vite-ignore */ pathToFileURL(abs(r)).href);
}

const exportCache = new Map<string, any>();
async function findExport(pkg: string, name: string): Promise<any> {
  const key = `${pkg}:${name}`;
  if (exportCache.has(key)) return exportCache.get(key);
  const re = new RegExp(`\\b${name}\\b`);
  for (const f of srcFiles(pkg).filter((x) => re.test(read(x)))) {
    const mod = await import(/* @vite-ignore */ pathToFileURL(f).href);
    if (mod[name] !== undefined) {
      exportCache.set(key, mod[name]);
      return mod[name];
    }
  }
  throw new Error(`Export "${name}" not found under packages/${pkg}/src`);
}

/** Merge named exports and the members of exported plain objects. */
function flatten(mod: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(mod)) {
    out[k] = v;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v as any)) if (!(k2 in out)) out[k2] = v2;
    }
  }
  return out;
}
function deepFrozen(v: any): boolean {
  if (v === null || typeof v !== 'object') return true;
  return Object.isFrozen(v) && Object.values(v).every(deepFrozen);
}

/** Classify a parse() call: accepted / rejected, typed code, thrown or returned. */
function judge(fn: () => any): { accepted: boolean; code?: string; threw: boolean; generic: boolean } {
  try {
    const r = fn();
    if (r && typeof r === 'object') {
      const txt = (() => { try { return JSON.stringify(r, (_k, v) => (typeof v === 'bigint' ? String(v) : v)) ?? ''; } catch { return ''; } })();
      const code = /INVALID_ARGUMENT/.test(txt) ? 'INVALID_ARGUMENT' : undefined;
      if (typeof (r as any).isOk === 'function') return { accepted: !!(r as any).isOk(), code, threw: false, generic: false };
      for (const k of ['ok', 'success', 'valid']) if (k in r) return { accepted: !!(r as any)[k], code, threw: false, generic: false };
      if ('error' in r && (r as any).error) return { accepted: false, code, threw: false, generic: false };
    }
    return { accepted: true, threw: false, generic: false };
  } catch (e: any) {
    const code = e?.code === 'INVALID_ARGUMENT' || /INVALID_ARGUMENT/.test(String(e?.message)) ? 'INVALID_ARGUMENT' : e?.code;
    return { accepted: false, code, threw: true, generic: e?.constructor === Error && !e?.code };
  }
}
function expectAccept(parse: (x: any) => any, input: any) {
  const j = judge(() => parse(input));
  expect(j.accepted, `should ACCEPT ${String(input)}`).toBe(true);
}
function expectReject(parse: (x: any) => any, input: any) {
  const j = judge(() => parse(input));
  expect(j.accepted, `should REJECT ${String(input)}`).toBe(false);
  expect(j.code, `reject of ${String(input)} must carry INVALID_ARGUMENT`).toBe('INVALID_ARGUMENT');
  expect(j.generic, `reject of ${String(input)} must be a typed error/result, not a generic thrown Error`).toBe(false);
}

function protoMessage(text: string, name: string): string | undefined {
  const m = new RegExp(`message\\s+${name}\\s*\\{`).exec(text);
  if (!m) return undefined;
  let i = m.index + m[0].length;
  let depth = 1;
  while (i < text.length && depth) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    i++;
  }
  return text.slice(m.index + m[0].length, i - 1);
}
function protoFields(body: string): Array<{ name: string; num: number }> {
  let prev = '';
  let b = body;
  while (prev !== b) { prev = b; b = b.replace(/\b(message|enum)\s+\w+\s*\{[^{}]*\}/g, ''); }
  const out: Array<{ name: string; num: number }> = [];
  const re = /(?:repeated\s+|optional\s+)?[\w.<>, ]+?\s+(\w+)\s*=\s*(\d+)\s*[;[]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(b))) out.push({ name: m[1], num: Number(m[2]) });
  return out;
}

function specifiers(src: string): string[] {
  const out: string[] = [];
  const re = /(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m: RegExpExecArray | null;
  const code = stripComments(src);
  while ((m = re.exec(code))) out.push(m[1] ?? m[2] ?? m[3] ?? m[4]);
  return out;
}
const BUILTINS = new Set(builtinModules.flatMap((b) => [b, b.split('/')[0]]));
function bareName(spec: string): string | null {
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:')) return null;
  const n = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
  return BUILTINS.has(n) ? null : n;
}

// ----------------------------------------------------------------------------
// ADAPTERS — logger & traceparent. The plan fixes behaviour, not API names.
// Replace the bodies below to call the real implementation. Keep signatures.
// ----------------------------------------------------------------------------
const NOT_ADAPTED = (what: string) =>
  new Error(`NOT_ADAPTED: fill ADAPTERS.${what} in tools/test/p01-phase.spec.ts to call the real implementation (do not edit assertions).`);

const ADAPTERS = {
  /** Feed one record to the real JSON logger; return the exact line(s) it emitted. */
  emitLog: async (_record: Record<string, unknown>): Promise<string> => {
    // Best-effort autodiscovery: createLogger(...).info(event, fields) writing to stdout/console.
    const file = 'packages/core/src/telemetry/logger.ts';
    const mod = await loadFile(file);
    const factory = mod.createLogger ?? mod.makeLogger ?? mod.getLogger;
    if (typeof factory !== 'function') throw NOT_ADAPTED('emitLog');
    const lines: string[] = [];
    const w = vi.spyOn(process.stdout, 'write').mockImplementation(((s: any) => { lines.push(String(s)); return true; }) as any);
    const c = vi.spyOn(console, 'log').mockImplementation(((...a: any[]) => { lines.push(a.map(String).join(' ')); }) as any);
    try {
      const logger = factory({ service: 'p01-audit', sink: (l: any) => lines.push(typeof l === 'string' ? l : JSON.stringify(l)) });
      const fn = logger.info ?? logger.log;
      if (typeof fn !== 'function') throw NOT_ADAPTED('emitLog');
      fn.call(logger, String(_record.event ?? 'audit.event'), _record);
    } finally { w.mockRestore(); c.mockRestore(); }
    if (!lines.length) throw NOT_ADAPTED('emitLog');
    return lines.join('\n');
  },
  /** traceparent string -> traceparent string of the child after a simulated postMessage hop. */
  postMessageHop: async (_traceparent: string): Promise<string> => { throw NOT_ADAPTED('postMessageHop'); },
  /** Parse a traceparent; return null when invalid (must not throw). */
  parseTraceparent: async (_tp: string): Promise<{ traceId: string; spanId: string; flags: string } | null> => { throw NOT_ADAPTED('parseTraceparent'); },
};

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

// =============================================================================
// A. Repository, toolchain, quality gates  (P01-T01)
// =============================================================================
describe('A. Repository & toolchain (P01-T01)', () => {
  it('A1 no UTF-8 BOM in ANY text file (checked on raw bytes, independent of stripBom)', () => {
    const ext = /\.(json|jsonc|ts|tsx|js|mjs|cjs|ya?ml|sql|proto|md|toml)$/;
    const bad = walk(ROOT, (f) => ext.test(f)).filter((f) => {
      const fd = fs.openSync(f, 'r');
      const b = Buffer.alloc(3);
      fs.readSync(fd, b, 0, 3, 0);
      fs.closeSync(fd);
      return b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
    });
    expect(bad.map(rel)).toEqual([]);
  });

  it('A2 every package.json parses with plain JSON.parse and has the plan-mandated shape', () => {
    for (const p of PACKAGES) {
      const j = pkgJson(p);
      expect(j.name, p).toBe(`@otomix/${p}`);
      expect(j.scripts?.build, `${p}: build script`).toBeTruthy();
      expect(j.scripts?.test, `${p}: test script`).toBeTruthy();
    }
  });

  it('A3 no package lists the same dependency in both dependencies and devDependencies', () => {
    const dups: string[] = [];
    for (const p of PACKAGES) {
      const j = pkgJson(p);
      for (const k of Object.keys(j.dependencies ?? {})) if (j.devDependencies && k in j.devDependencies) dups.push(`${p}:${k}`);
    }
    expect(dups).toEqual([]);
  });

  it('A4 effective strict mode (resolving extends, honouring child overrides) is true for every package', () => {
    const effective = (file: string, depth = 0): boolean | undefined => {
      if (depth > 10) return undefined;
      const j = JSON.parse(read(file));
      if (j.compilerOptions && j.compilerOptions.strict !== undefined) return j.compilerOptions.strict;
      if (!j.extends) return undefined;
      let ext = path.resolve(path.dirname(file), j.extends);
      if (!fs.existsSync(ext) && fs.existsSync(`${ext}.json`)) ext = `${ext}.json`;
      return effective(ext, depth + 1);
    };
    for (const p of PACKAGES) expect(effective(path.join(PKGS, p, 'tsconfig.json')), p).toBe(true);
    expect(effective(abs('tsconfig.json'))).toBe(true);
  });

  it('A5 no @ts-nocheck in hand-written source (generated proto stubs excluded)', () => {
    const hits = PACKAGES.filter((p) => p !== 'proto').flatMap(srcFiles).filter((f) => /@ts-nocheck/.test(read(f)));
    expect(hits.map(rel)).toEqual([]);
  });

  it('A6 ESLint and Prettier are configured at the root', () => {
    const rootPkg = JSON.parse(readRel('package.json'));
    const eslint = fs.readdirSync(ROOT).some((f) => /^(eslint\.config\.|\.eslintrc)/.test(f)) || !!rootPkg.eslintConfig;
    const prettier = fs.readdirSync(ROOT).some((f) => /^\.prettierrc|^prettier\.config\./.test(f)) || !!rootPkg.prettier;
    expect(eslint, 'eslint config').toBe(true);
    expect(prettier, 'prettier config').toBe(true);
  });

  it('A7 reproducibility: lockfile present and packageManager pinned', () => {
    expect(exists('pnpm-lock.yaml')).toBe(true);
    expect(JSON.parse(readRel('package.json')).packageManager ?? '').toMatch(/^pnpm@\d+/);
  });

  it('A8 (recommended) .editorconfig forbids BOM so the bug cannot silently return', () => {
    expect(exists('.editorconfig')).toBe(true);
    const t = readRel('.editorconfig');
    expect(t).toMatch(/charset\s*=\s*utf-8\s*$/m);
    expect(t).not.toMatch(/utf-8-bom/);
  });

  it('A9 coverage thresholds are per-package: core branches 90, access branches 100 (not just global)', () => {
    const cfgs = fs.readdirSync(ROOT).filter((f) => /^vitest\.(config|workspace)\./.test(f)).map((f) => read(abs(f))).join('\n')
      + walk(PKGS, (f) => /vitest\.config\./.test(f)).map(read).join('\n');
    expect(cfgs).toMatch(/packages\/core[\s\S]{0,500}?branches\s*:\s*90/);
    expect(cfgs).toMatch(/packages\/access[\s\S]{0,500}?branches\s*:\s*100/);
  });

  it('A10 CVSS gate: script exists, threshold is >= 7.0, and the deploy job `needs:` the gate job', () => {
    const gate = readRel('scripts/cvss-gate.ts');
    expect(gate).toMatch(/>=\s*(7(\.0)?|[A-Z_]*THRESHOLD)/);
    expect(gate).toMatch(/exit\(\s*1\s*\)|exitCode\s*=\s*1/);

    const wfDir = abs('.github/workflows');
    expect(fs.existsSync(wfDir), '.github/workflows missing: the CI gate is not wired').toBe(true);
    const wfs = fs.readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f));
    let wired = false;
    for (const f of wfs) {
      const text = read(path.join(wfDir, f)).replace(/\r/g, '');
      const jobs: Record<string, string> = {};
      let inJobs = false; let cur: string | null = null;
      for (const line of text.split('\n')) {
        if (/^jobs:\s*$/.test(line)) { inJobs = true; continue; }
        if (!inJobs) continue;
        if (/^\S/.test(line) && line.trim()) { inJobs = false; cur = null; continue; }
        const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
        if (m) { cur = m[1]; jobs[cur] = ''; continue; }
        if (cur) jobs[cur] += line + '\n';
      }
      const gateKey = Object.keys(jobs).find((k) => /cvss-gate/.test(jobs[k]));
      const deployKey = Object.keys(jobs).find((k) => /deploy|release|publish/i.test(k));
      if (!gateKey || !deployKey) continue;
      expect(jobs[gateKey], 'gate must be blocking').not.toMatch(/continue-on-error:\s*true/);
      const needs = /needs:\s*(\[[^\]]*\]|[\w-]+|(?:\n\s+-\s*[\w-]+)+)/.exec(jobs[deployKey])?.[1] ?? '';
      if (new RegExp(`(^|[^\\w-])${gateKey}([^\\w-]|$)`).test(needs)) wired = true;
    }
    expect(wired, 'no workflow has a deploy job that needs the cvss-gate job').toBe(true);
  });
});

// =============================================================================
// B. Constants registry (P01-T02)
// =============================================================================
const TIMING: Record<string, number> = {
  LOOKAHEAD_MS: 50, SCHED_ACCURACY_MS: 2, DRIFT_THRESHOLD_MS: 4, STARVATION_FRAME_MS: 10, BUFFER_NORMAL: 2048,
  BUFFER_DEGRADED: 4096, PORT_BUFFER_SAMPLES: 1024, PORT_LATENCY_MS: 10, ANALYSIS_TIMEOUT_MS: 5000,
  EXTRACTION_ALERT_MS: 2500, OBSERVER_CYCLE_MS: 1,
};
const GRID: Record<string, number> = {
  PERIOD_MIN: 0.95, PERIOD_MAX: 1.05, DRIFT_MAX_S: 0.05, ANCHOR_SYNC_BARS: 16, BODY_REALIGN_DBFS: -40,
  FALLBACK_TRANSIENT_DBFS: -12, CORR_MIN: 0.85, SHAPE_VAR_MAX: 0.15, STRAIGHT_VAR: 0.02, TRIPLET_VAR: 0.05,
  SWING_MIN: 0.05, SWING_MAX: 0.33, IRREGULAR_XFADE_EXTRA_MS: 10, STATIC_GRID_BPM: 120, SAFETY_XFADE_BARS: 4,
  QUANTUM_DIVISOR: 24, GLIDE_MAX: 0.08, PITCH_NODE_SEMITONES: 1, REALIGN_MAX_SEMITONES: 0.05, RATE_MIN: 0.98,
  RATE_MAX: 1.02, RATE_SLEW_PER_S: 0.005,
};
const SCORING: Record<string, number | number[]> = {
  ENERGY_WEIGHTS: [0.4, 0.3, 0.2, 0.1], MIX_WEIGHTS: [0.4, 0.3, 0.2, 0.1], UNMIXABLE_BELOW: 0.4, VOCAL_THRESHOLD: 0.65,
  VOCAL_MEDIAN_S: 1, RECO_WEIGHTS: [0.6, 0.3, 0.1], TEMPO_DELTA_LIMIT: 0.01, WASM_HEAP_MB: 512, ACCESS_TTL_MIN: 15,
  REFRESH_TTL_DAYS: 7, KEY_ROTATION_DAYS: 90, IDEMPOTENCY_TTL_H: 24, MAX_RETRIES: 3, RPO_MIN: 15, RTO_MIN: 60, SLO: 0.999,
};
const CONST_FILES = {
  timing: 'packages/core/src/constants/timing.ts',
  grid: 'packages/core/src/constants/grid.ts',
  scoring: 'packages/core/src/constants/scoring.ts',
  access: 'packages/access/src/constants.ts',
};

describe('B. Spec constants registry (P01-T02)', () => {
  for (const [label, file, expected] of [
    ['timing (11)', CONST_FILES.timing, TIMING],
    ['grid (22)', CONST_FILES.grid, GRID],
  ] as const) {
    it(`B1 ${label}: exact values`, async () => {
      expect(Object.keys(expected).length).toBe(label.includes('11') ? 11 : 22);
      const flat = flatten(await loadFile(file));
      for (const [k, v] of Object.entries(expected)) {
        expect(flat, `${file} missing ${k}`).toHaveProperty([k]);
        expect(flat[k], k).toBe(v);
      }
    });
  }

  it('B2 scoring+access (16 values; the plan says "15" but lists 16): exact values, each defined in exactly ONE file', async () => {
    expect(Object.keys(SCORING).length).toBe(16);
    const core = flatten(await loadFile(CONST_FILES.scoring));
    const acc = flatten(await loadFile(CONST_FILES.access));
    for (const [k, v] of Object.entries(SCORING)) {
      const inCore = k in core; const inAcc = k in acc;
      expect(inCore !== inAcc, `${k} must be defined exactly once (core:${inCore} access:${inAcc})`).toBe(true);
      expect((inCore ? core : acc)[k], k).toEqual(v);
    }
  });

  it('B3 all four constants files are frozen (deeply, incl. arrays) and use Object.freeze', async () => {
    for (const f of Object.values(CONST_FILES)) {
      const mod = await loadFile(f);
      for (const [k, v] of Object.entries(mod)) expect(deepFrozen(v), `${f}:${k} must be deeply frozen`).toBe(true);
      expect(readRel(f), `${f} must use Object.freeze`).toMatch(/Object\.freeze/);
    }
  });

  it('B4 every constant carries a spec-section comment (§ / OTOMIX) on its line or the 3 lines above', () => {
    const miss: string[] = [];
    const all: Array<[string, string[]]> = [
      [CONST_FILES.timing, Object.keys(TIMING)], [CONST_FILES.grid, Object.keys(GRID)],
    ];
    for (const [f, names] of all) {
      const lines = readRel(f).split(/\r?\n/);
      for (const n of names) {
        const i = lines.findIndex((l) => new RegExp(`\\b${n}\\b\\s*[:=]`).test(l));
        if (i < 0) { miss.push(`${f}:${n}(not found)`); continue; }
        const ctx = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
        if (!/§|OTOMIX|Mother|spec/i.test(ctx)) miss.push(`${f}:${n}`);
      }
    }
    expect(miss).toEqual([]);
  });

  it('B5 cross-constant invariants hold (catches a fat-fingered value that still "equals" a typo in the test)', async () => {
    const t = flatten(await loadFile(CONST_FILES.timing));
    const g = flatten(await loadFile(CONST_FILES.grid));
    const sc = { ...flatten(await loadFile(CONST_FILES.scoring)), ...flatten(await loadFile(CONST_FILES.access)) };
    expect(g.PERIOD_MIN).toBeLessThan(1); expect(g.PERIOD_MAX).toBeGreaterThan(1);
    expect(g.RATE_MIN).toBeLessThan(1); expect(g.RATE_MAX).toBeGreaterThan(1);
    expect(g.SWING_MIN).toBeLessThan(g.SWING_MAX);
    expect(g.STRAIGHT_VAR).toBeLessThan(g.TRIPLET_VAR);
    expect(t.BUFFER_DEGRADED).toBe(2 * t.BUFFER_NORMAL);
    expect(t.EXTRACTION_ALERT_MS).toBeLessThan(t.ANALYSIS_TIMEOUT_MS);
    expect(t.DRIFT_THRESHOLD_MS / 1000).toBeLessThan(g.DRIFT_MAX_S);
    expect(g.ANCHOR_SYNC_BARS * 4).toBe(64);
    expect(sc.IDEMPOTENCY_TTL_H * 3600).toBe(86400);
    expect(sc.ACCESS_TTL_MIN).toBeLessThan(sc.REFRESH_TTL_DAYS * 24 * 60);
    expect(sc.RTO_MIN).toBeGreaterThanOrEqual(sc.RPO_MIN);
    for (const w of ['ENERGY_WEIGHTS', 'MIX_WEIGHTS', 'RECO_WEIGHTS']) {
      expect((sc[w] as number[]).reduce((a, b) => a + b, 0), `${w} must sum to 1`).toBeCloseTo(1, 10);
    }
  });

  it('B6 no duplicate definitions: magic literals 0.65 and 86400 appear in no hand-written src outside constants files', () => {
    const offenders: string[] = [];
    for (const p of PACKAGES.filter((x) => x !== 'proto')) {
      for (const f of srcFiles(p)) {
        if (/constants/.test(rel(f))) continue;
        const code = stripComments(read(f));
        if (/(?<![\d.])0\.65(?!\d)/.test(code)) offenders.push(`${rel(f)}: 0.65`);
        if (/(?<![\d.])86400(?!\d)/.test(code)) offenders.push(`${rel(f)}: 86400`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// =============================================================================
// C. Domain types, registry schema, SemVer gate  (P01-T03)
// =============================================================================
describe('C. Domain types & contracts (P01-T03)', () => {
  it('C1 BPM.parse: boundaries, non-finite, wrong types; typed INVALID_ARGUMENT (not generic throw)', async () => {
    const BPM = (await loadFile('packages/core/src/types/bpm.ts')).BPM;
    expect(BPM?.parse, 'BPM.parse export').toBeTypeOf('function');
    const parse = (x: any) => BPM.parse(x);
    for (const ok of [60, 60.0, 120, 128.5, 200]) expectAccept(parse, ok);
    for (const bad of [59.999, 200.001, NaN, Infinity, -Infinity, 0, -1, '120', null, undefined]) expectReject(parse, bad);
  });

  it('C2 CamelotKey.parse: all 24 valid keys accepted, malformed rejected (incl. trailing newline, case, whitespace)', async () => {
    const CK = (await loadFile('packages/core/src/types/camelot.ts')).CamelotKey;
    expect(CK?.parse).toBeTypeOf('function');
    const parse = (x: any) => CK.parse(x);
    for (let n = 1; n <= 12; n++) for (const l of ['A', 'B']) expectAccept(parse, `${n}${l}`);
    for (const bad of ['13A', '0B', '5C', 'a5', '', '01A', '1a', ' 1A', '1A ', '1A\n', '1AB', '10', 'A1', null, 5])
      expectReject(parse, bad);
  });

  it('C3 CamelotKey regex in code equals the CHECK regex in 001_core.sql', () => {
    const sqlFiles = walk(path.join(PKGS, 'db'), (f) => f.endsWith('.sql'));
    const core = sqlFiles.find((f) => /001.*core/i.test(path.basename(f)) && !/down/i.test(f));
    expect(core, '001_core.sql not found').toBeTruthy();
    expect(read(core!)).toMatch(/\(1\[0-2\]\|\[1-9\]\)\[AB\]/);
    expect(readRel('packages/core/src/types/camelot.ts')).toMatch(/\(1\[0-2\]\|\[1-9\]\)\[AB\]/);
  });

  it('C4 BeatIndex.parse: non-zero safe integers only (0, -0, fractions, unsafe, non-numbers rejected)', async () => {
    const BI = (await loadFile('packages/core/src/types/beat-index.ts')).BeatIndex;
    expect(BI?.parse).toBeTypeOf('function');
    const parse = (x: any) => BI.parse(x);
    for (const ok of [-5, -1, 1, 2, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]) expectAccept(parse, ok);
    for (const bad of [0, -0, 1.5, -0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null, undefined]) expectReject(parse, bad);
  });

  it('C5 Feature Registry schema is Draft-07, compiles under AJV, and encodes the plan invariants', () => {
    const p = 'packages/contracts/schemas/feature-registry-1.2.json';
    expect(exists(p), p).toBe(true);
    const schema = JSON.parse(readRel(p));
    expect(schema.$schema).toMatch(/draft-07/);
    expect(Array.isArray(schema.required) && schema.required.length > 0).toBe(true);
    const req = createRequire(path.join(PKGS, 'contracts', 'package.json'));
    const Ajv = req('ajv').default ?? req('ajv');
    expect(new Ajv({ strict: false, allErrors: true }).validateSchema(schema)).toBe(true);
    const flat = JSON.stringify(schema);
    expect(flat, 'bpm bounds 60..200').toMatch(/"minimum"\s*:\s*60/);
    expect(flat).toMatch(/"maximum"\s*:\s*200/);
    expect(flat, 'camelot pattern').toMatch(/\[AB\]/);
    expect(flat, 'vocal_map.threshold 0.65').toMatch(/0\.65/);
  });

  it('C6 validateRegistry returns a typed result (never throws) for garbage input', async () => {
    const v = await findExport('contracts', 'validateRegistry');
    for (const garbage of [{}, null, undefined, 'x', 42, [], { schema_version: '1.2.0' }]) {
      let r: any;
      expect(() => { r = v(garbage); }, `threw for ${JSON.stringify(garbage)}`).not.toThrow();
      const valid = typeof r === 'boolean' ? r : r?.valid ?? r?.ok ?? r?.success;
      expect(valid, `garbage ${JSON.stringify(garbage)} must be invalid`).toBe(false);
    }
  });

  it('C7 SemVer gate: 1.2.x ACCEPT · other 1.x/0.x REJECT · major bump PURGE_AND_REANALYZE · garbage never ACCEPT', async () => {
    const mod = await loadFile('packages/contracts/src/semver-gate.ts');
    const fn: any = Object.values(mod).find((x) => typeof x === 'function');
    expect(fn, 'semver-gate must export a function').toBeTypeOf('function');
    const d = (v: any) => { try { const r = fn(v); return typeof r === 'string' ? r : JSON.stringify(r); } catch { return 'THROW'; } };
    for (const v of ['1.2.0', '1.2.7', '1.2.99']) expect(d(v), v).toMatch(/ACCEPT/);
    for (const v of ['1.3.0', '1.1.9', '1.0.0', '0.9.0']) expect(d(v), v).toMatch(/REJECT/);
    for (const v of ['2.0.0', '3.1.4', '10.0.0']) expect(d(v), v).toMatch(/PURGE_AND_REANALYZE/);
    for (const v of ['abc', '', '1.2', '1.2.x', 'v1.2.0', null, undefined, 1.2])
      expect(d(v), String(v)).not.toMatch(/ACCEPT|PURGE_AND_REANALYZE/);
  });
});

// =============================================================================
// D. Protobuf contract (P01-T04-S01)
// =============================================================================
describe('D. Protobuf contract (P01-T04-S01-M01)', () => {
  const protoPath = ['proto/core/v1/core.proto', 'packages/proto/proto/core/v1/core.proto'].find(exists);

  it('D1 core.proto exists, proto3, package otodsp.core.v1, all plan messages present', () => {
    expect(protoPath, 'core.proto not found').toBeTruthy();
    const t = readRel(protoPath!);
    expect(t).toMatch(/syntax\s*=\s*"proto3"/);
    expect(t).toMatch(/package\s+otodsp\.core\.v1\s*;/);
    for (const m of ['AnalyzeAudioRequest', 'AnalyzeAudioResponse', 'TransitionPlanRequest', 'ExecutionFallback', 'DspParameterUpdate'])
      expect(protoMessage(t, m), `message ${m}`).toBeTruthy();
  });

  it('D2 frozen field numbers: AnalyzeAudioRequest.idempotency_key=6, DspParameterUpdate.sequence=6', () => {
    const t = readRel(protoPath!);
    expect(protoFields(protoMessage(t, 'AnalyzeAudioRequest')!).find((f) => f.name === 'idempotency_key')?.num).toBe(6);
    expect(protoFields(protoMessage(t, 'DspParameterUpdate')!).find((f) => f.name === 'sequence')?.num).toBe(6);
  });

  it('D3 every message: no duplicate field numbers/names, none in 19000-19999, none collide with `reserved`', () => {
    const t = readRel(protoPath!);
    const names = [...t.matchAll(/^\s*message\s+(\w+)\s*\{/gm)].map((m) => m[1]);
    expect(names.length).toBeGreaterThanOrEqual(5);
    for (const n of names) {
      const body = protoMessage(t, n)!;
      const fields = protoFields(body);
      const nums = fields.map((f) => f.num);
      expect(new Set(nums).size, `${n}: duplicate field numbers`).toBe(nums.length);
      expect(new Set(fields.map((f) => f.name)).size, `${n}: duplicate field names`).toBe(fields.length);
      for (const x of nums) { expect(x).toBeGreaterThanOrEqual(1); expect(x >= 19000 && x <= 19999, `${n}.${x} reserved range`).toBe(false); }
      const reserved = [...body.matchAll(/reserved\s+([\d,\s]+);/g)].flatMap((m) => m[1].split(',').map((s) => Number(s.trim())));
      for (const x of nums) expect(reserved.includes(x), `${n}: field ${x} is also reserved`).toBe(false);
    }
  });

  it('D4 buf is configured and stubs are generated', () => {
    expect(exists('buf.yaml') || exists('proto/buf.yaml') || exists('packages/proto/buf.yaml'), 'buf.yaml').toBe(true);
    expect(srcFiles('proto').length, 'generated TS stubs in packages/proto/src').toBeGreaterThan(0);
  });
});

// =============================================================================
// E. Gateway: status map, idempotency, receiver dedup  (P01-T04-S02, P01-T06)
// =============================================================================
describe('E. Gateway & delivery semantics (P01-T04-S02, P01-T06)', () => {
  it('E1 mapStatus: the 9 plan codes + ALREADY_EXISTS->409 (plan Review Checkpoint)', async () => {
    const mapStatus = await findExport('gateway', 'mapStatus');
    const http = (r: any) => (typeof r === 'number' ? r : r?.status ?? r?.http ?? r?.httpStatus ?? r?.statusCode);
    const table: Record<string, number> = {
      INVALID_ARGUMENT: 400, UNAUTHENTICATED: 401, PERMISSION_DENIED: 403, NOT_FOUND: 404, ABORTED: 409,
      ALREADY_EXISTS: 409, RESOURCE_EXHAUSTED: 429, DEADLINE_EXCEEDED: 504, UNAVAILABLE: 503, INTERNAL: 500,
    };
    for (const [code, status] of Object.entries(table)) expect(http(mapStatus(code)), code).toBe(status);
  });

  it('E2 mapStatus fails closed on unknown codes (a 5xx/4xx number, no throw, never 2xx)', async () => {
    const mapStatus = await findExport('gateway', 'mapStatus');
    const http = (r: any) => (typeof r === 'number' ? r : r?.status ?? r?.http ?? r?.httpStatus ?? r?.statusCode);
    for (const u of ['NOPE', '', undefined, null, 'ok']) {
      let r: any;
      expect(() => { r = http(mapStatus(u as any)); }).not.toThrow();
      expect(r, String(u)).toBeGreaterThanOrEqual(400);
      expect(r).toBeLessThan(600);
    }
  });

  it('E3 Idempotency-Key validator: UUIDv4 regex, all four mutating verbs covered', () => {
    const t = readRel('packages/gateway/src/idempotency/validate.ts');
    for (const v of ['POST', 'PUT', 'PATCH', 'DELETE']) expect(t, v).toMatch(new RegExp(`['"]${v}['"]`));
    expect(t, 'UUID version nibble 4').toMatch(/4[0-9a-f]{3}|-4\[0-9a-f\]\{3\}|\[4\]/i);
    expect(t, 'UUID variant nibble [89ab]').toMatch(/\[89ab\]/i);
    expect(t, 'must emit INVALID_ARGUMENT / 400').toMatch(/INVALID_ARGUMENT|400/);
  });

  it('E4 Redis idempotency store: otomix:idem: prefix, SET NX, TTL from the constant, fingerprint, in-progress marker, ABORTED on mismatch', () => {
    const t = readRel('packages/gateway/src/idempotency/store.ts');
    expect(t).toContain('otomix:idem:');
    expect(t).toMatch(/['"]NX['"]|\bNX\b/);
    expect(t, 'TTL must derive from IDEMPOTENCY_TTL_H (no literal 86400)').toMatch(/IDEMPOTENCY_TTL_H/);
    expect(t).toMatch(/sha256|createHash|fingerprint/i);
    expect(t).toMatch(/in[_-]?progress/i);
    expect(t).toMatch(/ABORTED|409/);
  });

  it('E5 receiver dedup: signature verification precedes the dedup write; constant-time compare; sequence ordering; TTL >= 24h', () => {
    const t = readRel('packages/db/src/receiver-dedup.ts');
    const code = stripComments(t);
    const sig = code.search(/createHmac|hmac|verifySignature|verify\(/i);
    const write = code.search(/\.set\(|\bSETNX\b|\bINSERT\b|\.add\(/i);
    expect(sig, 'no HMAC/signature verification found').toBeGreaterThanOrEqual(0);
    expect(write, 'no dedup write found').toBeGreaterThanOrEqual(0);
    expect(sig, 'signature check must come BEFORE the dedup write').toBeLessThan(write);
    expect(code, 'use timingSafeEqual (constant-time)').toMatch(/timingSafeEqual|crypto\.subtle\.verify/);
    expect(code).toMatch(/sequence/i);
    expect(code).toMatch(/IDEMPOTENCY_TTL_H|ttl/i);
  });
});

// =============================================================================
// F. Persistence foundation (P01-T05) — static SQL audit (live DB probes: see audit prompt)
// =============================================================================
describe('F. Tenant-scoped persistence (P01-T05)', () => {
  const sql = walk(path.join(PKGS, 'db'), (f) => f.endsWith('.sql'));
  const core = sql.find((f) => /001.*core/i.test(path.basename(f)) && !/down/i.test(f));
  const rls = sql.find((f) => /002.*rls/i.test(path.basename(f)) && !/down/i.test(f));

  it('F1 001_core.sql: all 5 tables, admin_audit range-partitioned, CHECKs for bpm/camelot/tenant', () => {
    expect(core, '001_core.sql').toBeTruthy();
    const t = read(core!);
    for (const tbl of ['features', 'users', 'tier_grants', 'admin_audit', 'outbox'])
      expect(t, tbl).toMatch(new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?(public\\.)?"?${tbl}"?`, 'i'));
    expect(t).toMatch(/PARTITION\s+BY\s+RANGE/i);
    expect((t.match(/\bCHECK\b/gi) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(t).toMatch(/\b60(\.0)?\b[\s\S]{0,80}\b200(\.0)?\b/);
    expect(t).toMatch(/\[AB\]/);
    expect(t, 'tenant constraint').toMatch(/tenant_id/i);
  });

  it('F2 migrations are reversible (down artifact exists and drops what up creates)', () => {
    const hasDownFile = sql.some((f) => /001.*down|down.*001/i.test(rel(f)));
    const inline = core ? /--\s*(\+migrate\s+)?down/i.test(read(core)) : false;
    expect(hasDownFile || inline, 'no down migration for 001').toBe(true);
    expect(sql.map(read).join('\n')).toMatch(/DROP\s+TABLE/i);
    expect(pkgJson('db').scripts['migrate:down'], 'migrate:down script').toBeTruthy();
  });

  it('F3 002_rls.sql: ENABLE + FORCE RLS and tenant_isolation policy for EVERY tenant_id table; missing_ok=true', () => {
    expect(core && rls, 'sql files').toBeTruthy();
    const c = read(core!); const r = read(rls!);
    const tables: string[] = [];
    for (const m of c.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?(\w+)"?\s*\(([\s\S]*?)\n\)/gi))
      if (/\btenant_id\b/i.test(m[2])) tables.push(m[1]);
    expect(tables.length, 'no tenant_id tables found').toBeGreaterThanOrEqual(1);
    for (const t of tables) expect(r, `table ${t} not mentioned in 002_rls.sql`).toMatch(new RegExp(`\\b${t}\\b`));
    expect(r).toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(r).toMatch(/FORCE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(r).toMatch(/tenant_isolation/);
    expect(r, "policy must use current_setting('app.tenant_id', true)").toMatch(/current_setting\(\s*'app\.tenant_id'\s*,\s*true\s*\)/);
    if (!/EXECUTE|FOREACH|FOR\s+\w+\s+IN/i.test(r))
      expect((r.match(/FORCE\s+ROW\s+LEVEL\s+SECURITY/gi) ?? []).length).toBeGreaterThanOrEqual(tables.length);
    expect(r, 'policy must not be SELECT-only').not.toMatch(/FOR\s+SELECT/i);
  });

  it('F4 app role: NOBYPASSRLS, not superuser, does not own tables', () => {
    const t = sql.map(read).join('\n');
    expect(t).toMatch(/CREATE\s+ROLE/i);
    expect(t).toMatch(/NOBYPASSRLS/i);
    expect(t).not.toMatch(/(?<!NO)BYPASSRLS/i);
    expect(t).not.toMatch(/(?<!NO)SUPERUSER/i);
    const roles = [...t.matchAll(/CREATE\s+ROLE\s+"?(\w+)"?/gi)].map((m) => m[1]);
    for (const r of roles) expect(t, `${r} must not own tables`).not.toMatch(new RegExp(`OWNER\\s+TO\\s+"?${r}"?`, 'i'));
  });

  it("F5 withTenant: parameterised transaction-local set_config('app.tenant_id', $1, true); no string-built SQL; validates input", () => {
    const code = stripComments(readRel('packages/db/src/with-tenant.ts'));
    expect(code).toMatch(/set_config\(\s*'app\.tenant_id'\s*,\s*\$1\s*,\s*true\s*\)/);
    expect(code, 'SET [LOCAL] app.tenant_id = ... is injectable/session-scoped').not.toMatch(/\bSET\s+(LOCAL\s+)?app\.tenant_id/i);
    expect(code, 'tenantId must never be interpolated').not.toMatch(/\$\{\s*tenantId\s*\}/);
    expect(code).toMatch(/(!\s*tenantId|tenantId\.length|typeof\s+tenantId|trim\(\))/);
  });

  it('F6 no string-built SQL anywhere in db/gateway src (template interpolation or concatenation inside query())', () => {
    const hits: string[] = [];
    for (const f of [...srcFiles('db'), ...srcFiles('gateway')]) {
      const c = stripComments(read(f));
      if (/\.query\(\s*`[^`]*\$\{/.test(c) || /\.query\(\s*['"][^'"]*['"]\s*\+/.test(c)) hits.push(rel(f));
    }
    expect(hits).toEqual([]);
  });

  it('F7 repository layer exists and every repository file goes through withTenant (plan Review Checkpoint)', () => {
    const repos = [...srcFiles('db'), ...srcFiles('gateway')].filter((f) => /repositor/i.test(path.basename(f)));
    expect(repos.length, 'plan: "make the gateway repository layer require withTenant" — no repository file exists').toBeGreaterThan(0);
    for (const f of repos) expect(read(f), rel(f)).toMatch(/withTenant/);
  });

  it('F8 no hard-coded secrets/credentials in hand-written src', () => {
    const re = /(password|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{8,}['"]/i;
    const hits = PACKAGES.filter((p) => p !== 'proto').flatMap(srcFiles).filter((f) => re.test(stripComments(read(f))));
    expect(hits.map(rel)).toEqual([]);
  });
});

// =============================================================================
// G. Resilience library (P01-T07)
// =============================================================================
describe('G. Resilience (P01-T07)', () => {
  async function runRetry(fn: any, opts: any) {
    const retry = await findExport('core', 'retry');
    vi.useFakeTimers();
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const settled = Promise.resolve().then(() => retry(fn, opts)).then((v: any) => ({ ok: true as const, v }), (e: any) => ({ ok: false as const, e }));
    await vi.runAllTimersAsync();
    const res = await settled;
    const delays = spy.mock.calls.map((c) => Number(c[1] ?? 0));
    return { res, delays };
  }
  const withRng = (idempotent: boolean | undefined, rng: () => number) => ({ idempotent, rng, random: rng, rand: rng, jitter: rng });

  it('G1 idempotent + always failing: exactly 4 attempts (1 + MAX_RETRIES=3), rejects with the LAST error', async () => {
    let n = 0;
    const fn = vi.fn(async () => { n++; throw new Error(`boom${n}`); });
    const { res } = await runRetry(fn, withRng(true, () => 0.5));
    expect(fn).toHaveBeenCalledTimes(4);
    expect(res.ok).toBe(false);
    expect((res as any).e.message).toBe('boom4');
  });

  it('G2 delays obey full jitter: 0 <= d_n <= min(5000, 200*2^n); rng≈1 reaches the bound; rng=0 collapses to ~0', async () => {
    const hi = await runRetry(vi.fn(async () => { throw new Error('x'); }), withRng(true, () => 0.999999));
    const lo = await runRetry(vi.fn(async () => { throw new Error('x'); }), withRng(true, () => 0));
    if (hi.delays.length === 0) return expect(true, 'retry sleeps via an injected sleeper; delay bounds verified by the audit prompt').toBe(true);
    const bound = (n: number) => Math.min(5000, 200 * 2 ** n);
    hi.delays.slice(0, 3).forEach((d, n) => { expect(d).toBeLessThanOrEqual(bound(n) + 1e-6); expect(d, `delay ${n} should approach bound`).toBeGreaterThanOrEqual(bound(n) * 0.9); });
    lo.delays.slice(0, 3).forEach((d, n) => expect(d, `full jitter with rng=0 must be ~0 (delay ${n})`).toBeLessThanOrEqual(bound(n) * 0.01 + 1));
  });

  it('G3 non-idempotent (false, undefined, missing options): exactly ONE attempt — hard refusal to retry', async () => {
    for (const idem of [false, undefined]) {
      const fn = vi.fn(async () => { throw new Error('x'); });
      const { res } = await runRetry(fn, withRng(idem as any, () => 0.5));
      expect(fn, `idempotent=${idem}`).toHaveBeenCalledTimes(1);
      expect(res.ok).toBe(false);
    }
  });

  it('G4 succeeds on the 3rd attempt: returns the value after exactly 3 calls', async () => {
    let n = 0;
    const fn = vi.fn(async () => { if (++n < 3) throw new Error('x'); return 'ok'; });
    const { res } = await runRetry(fn, withRng(true, () => 0.5));
    expect(res.ok).toBe(true);
    expect((res as any).v).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('G5 retry takes MAX_RETRIES / base / cap from constants or documents them — no hidden second source of truth', () => {
    const code = stripComments(readRel('packages/core/src/resilience/retry.ts'));
    expect(code).toMatch(/MAX_RETRIES|\b3\b/);
    expect(code, 'cap 5000').toMatch(/5000|5_000/);
    expect(code, 'base 200').toMatch(/\b200\b/);
  });

  describe('DegradedModeController', () => {
    const isActive = (c: any): boolean => {
      for (const k of ['isActive', 'isDegraded', 'active', 'degraded']) {
        if (typeof c[k] === 'function') return !!c[k]();
        if (typeof c[k] === 'boolean') return c[k];
      }
      const st = typeof c.getState === 'function' ? c.getState() : c.state;
      if (typeof st === 'string') return /^degraded$/i.test(st);
      throw new Error(`Cannot read degraded state; keys: ${Object.keys(c)}`);
    };
    const make = async () => new (await findExport('core', 'DegradedModeController'))();

    it('G6 enters on POOL_EXHAUSTED and WORKER_FAILED, exits only on RECOVERED', async () => {
      const c = await make();
      expect(isActive(c)).toBe(false);
      c.onEvent('POOL_EXHAUSTED'); expect(isActive(c)).toBe(true);
      c.onEvent('RECOVERED'); expect(isActive(c)).toBe(false);
      c.onEvent('WORKER_FAILED'); expect(isActive(c)).toBe(true);
      c.onEvent('WORKER_FAILED'); expect(isActive(c), 'repeat entry stays active').toBe(true);
      c.onEvent('RECOVERED'); expect(isActive(c)).toBe(false);
      expect(() => c.onEvent('RECOVERED'), 'RECOVERED while healthy is a no-op').not.toThrow();
      expect(isActive(c)).toBe(false);
    });

    it('G7 there is no other way out: exit() throws and leaves degraded mode active; unknown events do not clear it', async () => {
      const c = await make();
      c.onEvent('POOL_EXHAUSTED');
      if (typeof c.exit === 'function') { expect(() => c.exit()).toThrow(); expect(isActive(c)).toBe(true); }
      for (const junk of ['', 'recovered', 'RECOVER', 'NOPE']) { try { c.onEvent(junk); } catch { /* may throw */ } expect(isActive(c), `event "${junk}"`).toBe(true); }
    });

    it('G8 exposes the gauge name core.degraded_mode.active', () => {
      expect(readRel('packages/core/src/resilience/degraded.ts')).toContain('core.degraded_mode.active');
    });
  });
});

// =============================================================================
// H. Telemetry foundation (P01-T08)
// =============================================================================
describe('H. Telemetry (P01-T08)', () => {
  const RAW_IP = '203.0.113.7';
  const RAW_MAIL = 'alice@example.com';
  const base = {
    ts: '2026-11-10T12:00:00.000Z', level: 'info', service: 'gateway', tenant_id: 'otomix',
    trace_id: '0af7651916cd43dd8448eb211c80319c', span_id: 'b7ad6b7169203331', event: 'request.done', outcome: 'ok', duration_ms: 12,
  };

  it('H1 logger: raw ip/email/lat/long never reach the output; "Germany" country does not survive', async () => {
    const out = await ADAPTERS.emitLog({ ...base, country: 'Germany', ip: RAW_IP, email: RAW_MAIL, lat: 52.52, long: 13.405, latitude: 52.52, longitude: 13.405 });
    for (const raw of [RAW_IP, RAW_MAIL, '52.52', '13.405', 'Germany']) expect(out, `leaked ${raw}`).not.toContain(raw);
  });

  it('H2 logger: output is valid JSON containing all required fields; valid Alpha-2 country is preserved', async () => {
    const out = await ADAPTERS.emitLog({ ...base, country: 'DE' });
    const line = out.split('\n').filter(Boolean).pop()!;
    const j = JSON.parse(line);
    for (const k of ['ts', 'level', 'service', 'tenant_id', 'trace_id', 'span_id', 'event', 'outcome', 'duration_ms']) expect(j, k).toHaveProperty([k]);
    expect(j.country).toBe('DE');
  });

  it('H3 logger: masking also applies to NESTED objects and IPv6', async () => {
    const out = await ADAPTERS.emitLog({ ...base, context: { ip: '198.51.100.23', email: 'bob@example.org' }, ip: '2001:db8::1' });
    for (const raw of ['198.51.100.23', 'bob@example.org', '2001:db8::1']) expect(out, `leaked ${raw}`).not.toContain(raw);
  });

  it('H4 logger does not mutate the caller\'s record', async () => {
    const rec = { ...base, ip: RAW_IP, email: RAW_MAIL, lat: 1, long: 2 };
    const snap = JSON.parse(JSON.stringify(rec));
    await ADAPTERS.emitLog(rec);
    expect(rec).toEqual(snap);
  });

  it('H5 propagation (static): traceparent is a string field in the envelope; REST, gRPC metadata and postMessage covered', () => {
    const t = readRel('packages/core/src/telemetry/propagation.ts');
    expect(t).toMatch(/traceparent\s*\??\s*:\s*string/);
    expect(t).toMatch(/metadata/i);
    expect(t).toMatch(/headers?/i);
    expect(t).toMatch(/postMessage|envelope/i);
    expect(t, 'TraceContext must carry spanId AND parentId (defect fixed pre-commit)').toMatch(/spanId[\s\S]{0,400}parentId|parentId[\s\S]{0,400}spanId/);
  });

  it('H6 propagation: postMessage hop keeps trace_id, mints a NEW span_id, ids are valid W3C hex', async () => {
    const tp = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    const out = await ADAPTERS.postMessageHop(tp);
    expect(out).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
    const [, tid, sid] = out.split('-');
    expect(tid).toBe('0af7651916cd43dd8448eb211c80319c');
    expect(sid).not.toBe('b7ad6b7169203331');
    expect(sid).not.toMatch(/^0+$/);
  });

  it('H7 propagation: invalid traceparent values are rejected (null), never thrown, never accepted', async () => {
    const bad = [
      '', 'garbage', '00-xyz', '01-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
      'ff-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
      '00-00000000000000000000000000000000-b7ad6b7169203331-01',
      '00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01',
      '00-0AF7651916CD43DD8448EB211C80319C-B7AD6B7169203331-01',
      '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331',
    ];
    for (const b of bad) expect(await ADAPTERS.parseTraceparent(b), `accepted invalid "${b}"`).toBeNull();
    expect(await ADAPTERS.parseTraceparent('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01')).not.toBeNull();
  });
});

// =============================================================================
// I. Dependency graph, phantom deps, cycles (cross-cutting; the pending P01-FINAL madge step)
// =============================================================================
describe('I. Dependency integrity', () => {
  it('I1 every bare import in src is declared in that package (no phantom deps under pnpm strict resolution)', () => {
    const problems: string[] = [];
    for (const p of PACKAGES) {
      const j = pkgJson(p);
      const prod = new Set([...Object.keys(j.dependencies ?? {}), ...Object.keys(j.peerDependencies ?? {}), ...Object.keys(j.optionalDependencies ?? {}), j.name]);
      const dev = new Set([...prod, ...Object.keys(j.devDependencies ?? {})]);
      for (const f of srcFiles(p)) for (const s of specifiers(read(f))) { const n = bareName(s); if (n && !prod.has(n)) problems.push(`${rel(f)} imports "${n}" (not in dependencies)`); }
      for (const f of testFiles(p)) for (const s of specifiers(read(f))) { const n = bareName(s); if (n && !dev.has(n)) problems.push(`${rel(f)} imports "${n}" (not in deps/devDeps)`); }
    }
    expect(problems).toEqual([]);
  });

  it('I2 internal @otomix/* dependencies use the workspace protocol', () => {
    const bad: string[] = [];
    for (const p of PACKAGES) {
      const j = pkgJson(p);
      for (const sec of ['dependencies', 'devDependencies']) for (const [k, v] of Object.entries<string>(j[sec] ?? {})) if (k.startsWith('@otomix/') && !/^workspace:/.test(v)) bad.push(`${p}:${k}@${v}`);
    }
    expect(bad).toEqual([]);
  });

  it('I3 no circular dependencies between packages or between files inside a package', () => {
    // package graph
    const g: Record<string, Set<string>> = {};
    for (const p of PACKAGES) {
      g[p] = new Set();
      for (const f of srcFiles(p)) for (const s of specifiers(read(f))) { const m = /^@otomix\/([\w-]+)/.exec(s); if (m && m[1] !== p) g[p].add(m[1]); }
    }
    const cyc = (graph: Record<string, Set<string>>): string[] | null => {
      const state: Record<string, number> = {}; const stack: string[] = [];
      const dfs = (n: string): string[] | null => {
        state[n] = 1; stack.push(n);
        for (const m of graph[n] ?? []) {
          if (state[m] === 1) return [...stack.slice(stack.indexOf(m)), m];
          if (!state[m]) { const r = dfs(m); if (r) return r; }
        }
        stack.pop(); state[n] = 2; return null;
      };
      for (const n of Object.keys(graph)) if (!state[n]) { const r = dfs(n); if (r) return r; }
      return null;
    };
    expect(cyc(g), 'package-level cycle').toBeNull();
    // file graph per package
    for (const p of PACKAGES) {
      const files = srcFiles(p); const fg: Record<string, Set<string>> = {};
      const resolve = (from: string, s: string) => {
        const base = path.resolve(path.dirname(from), s.replace(/\.js$/, ''));
        return [base + '.ts', base + '.tsx', path.join(base, 'index.ts'), base].find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      };
      for (const f of files) {
        fg[f] = new Set();
        for (const s of specifiers(read(f))) if (s.startsWith('.')) { const r = resolve(f, s); if (r) fg[f].add(r); }
      }
      const c = cyc(fg);
      expect(c?.map(rel), `file-level cycle in ${p}`).toBeUndefined();
    }
  });
});

// =============================================================================
// J. Plan conformance, test inventory, phase integration (meta)
// =============================================================================
const PLAN_TEST_FILES = [
  'tools/test/workspace.spec.ts', 'tools/test/coverage-config.spec.ts', 'scripts/test/cvss-gate.spec.ts',
  'packages/core/test/constants.timing.spec.ts', 'packages/core/test/constants.grid.spec.ts', 'packages/core/test/constants.scoring.spec.ts',
  'packages/core/test/types.bpm.spec.ts', 'packages/core/test/types.camelot.spec.ts', 'packages/core/test/types.beat-index.spec.ts',
  'packages/core/test/retry.spec.ts', 'packages/core/test/degraded.spec.ts', 'packages/core/test/logger.spec.ts', 'packages/core/test/propagation.spec.ts',
  'packages/contracts/test/registry-schema.spec.ts', 'packages/contracts/test/semver-gate.spec.ts',
  'packages/gateway/test/status-map.spec.ts', 'packages/gateway/test/idem-validate.spec.ts', 'packages/gateway/test/idem-store.spec.ts',
  'packages/db/test/migrate.spec.ts', 'packages/db/test/rls.spec.ts', 'packages/db/test/with-tenant.spec.ts', 'packages/db/test/receiver-dedup.spec.ts',
];
const P01_IDS = [
  'T01-S01-M01', 'T01-S02-M01', 'T01-S02-M02', 'T02-S01-M01', 'T02-S01-M02', 'T02-S01-M03', 'T03-S01-M01', 'T03-S01-M02', 'T03-S01-M03',
  'T03-S02-M01', 'T03-S02-M02', 'T04-S01-M01', 'T04-S02-M01', 'T05-S01-M01', 'T05-S01-M02', 'T05-S01-M03', 'T06-S01-M01', 'T06-S01-M02',
  'T06-S02-M01', 'T07-S01-M01', 'T07-S02-M01', 'T08-S01-M01', 'T08-S01-M02',
].map((x) => `P01-${x}`);

describe('J. Plan conformance & phase integration', () => {
  it('J1 all 22 plan-named spec files exist at the exact plan paths', () => {
    expect(PLAN_TEST_FILES.filter((f) => !exists(f))).toEqual([]);
  });

  it('J2 zero skipped / focused / todo tests anywhere (plan: "0 skipped tests")', () => {
    const specs = [...walk(PKGS, (f) => /\.(spec|test)\.ts$/.test(f)), ...walk(abs('tools'), (f) => /\.(spec|test)\.ts$/.test(f)), ...walk(abs('scripts'), (f) => /\.(spec|test)\.ts$/.test(f))]
      .filter((f) => !f.endsWith('p01-phase.spec.ts'));
    const hits = specs.filter((f) => /\b(it|test|describe)\.(only|skip|todo|skipIf|runIf)\b|\bx(it|describe)\b/.test(stripComments(read(f))));
    expect(hits.map(rel)).toEqual([]);
  });

  it('J3 BOM regression test is not masked: no spec relies on stripBom for package.json/tsconfig parsing without a raw-byte check', () => {
    const ws = readRel('tools/test/workspace.spec.ts');
    if (/stripBom/.test(ws)) expect(ws, 'stripBom makes the old test tolerate a BOM; need an explicit raw-byte BOM assertion').toMatch(/0xef|0xEF|EF\s*BB\s*BF|\\ufeff|\\uFEFF|BOM-free|no BOM/);
  });

  it('J4 plan file: all 23 P01 micro-tasks are [x], none TODO/BLOCKED (set PLAN_PATH to override)', () => {
    const cands = [process.env.PLAN_PATH, abs('OTOMIX_MicroTask_Plan.md'), abs('docs/OTOMIX_MicroTask_Plan.md'), path.join(ROOT, '..', 'OTOMIX_MicroTask_Plan.md')].filter(Boolean) as string[];
    const planFile = cands.find((c) => fs.existsSync(c));
    expect(planFile, 'plan file not found in repo; set PLAN_PATH').toBeTruthy();
    const text = read(planFile!).replace(/\r/g, '');
    const start = text.indexOf('### P01 Foundation');
    const end = text.indexOf('<a id="p02">');
    expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
    const sec = text.slice(start, end);
    for (const id of P01_IDS) expect(sec, `${id} not marked [x]`).toMatch(new RegExp(`######\\s+${id}\\s+—\\s+\\[x\\]`));
    expect(sec).not.toMatch(/—\s+TODO/);
    expect(sec).not.toMatch(/—\s+BLOCKED/);
  });

  it('J5 P01-IT: vitest project "p01-integration" is defined (plan command: pnpm vitest run --project p01-integration)', () => {
    const cfg = fs.readdirSync(ROOT).filter((f) => /^vitest\.(config|workspace)\./.test(f)).map((f) => read(abs(f))).join('\n');
    expect(cfg).toMatch(/p01-integration/);
  });

  it('J6 cross-phase tests exist: X-P01-P05 and X-P01-P06 (X-P01-P02 needs P02 tOfI and may legitimately land in P02)', () => {
    expect(exists('packages/contracts/test/x-p01-p05.spec.ts'), 'x-p01-p05.spec.ts').toBe(true);
    expect(exists('packages/contracts/test/x-p01-p06.spec.ts'), 'x-p01-p06.spec.ts').toBe(true);
  });

  it('J7 integration tests really use Testcontainers (no mocked PG/Redis posing as integration)', () => {
    for (const f of ['packages/db/test/migrate.spec.ts', 'packages/db/test/rls.spec.ts', 'packages/db/test/with-tenant.spec.ts'])
      expect(readRel(f), f).toMatch(/PostgreSqlContainer|testcontainers/i);
    expect(readRel('packages/gateway/test/idem-store.spec.ts')).toMatch(/RedisContainer|testcontainers/i);
    expect(readRel('packages/gateway/test/idem-store.spec.ts'), 'idem-store integration must not use ioredis-mock').not.toMatch(/ioredis-mock/);
  });
});
