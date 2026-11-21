import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(__dirname, '..', '..');
const PLAN_DIR = path.join(ROOT, 'Docs', 'OtoMix Todo-Plan');
const REPORT_PATH = path.join(PLAN_DIR, 'OTOMIX_Audit_Report.md');

const read = (p: string): string => fs.readFileSync(p, 'utf-8').replace(/^\uFEFF/, '');
const relPath = (p: string): string => path.relative(ROOT, p).split(path.sep).join('/');
const escapeRe = (s: string): string => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

function walk(dir: string, exts: string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((x) => e.name.endsWith(x))) out.push(full);
  }
  return out;
}

function codeOnly(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((l) => {
      const t = l.trim();
      return t !== '' && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');
}

function resolveLocator(p: string): string[] {
  const full = path.join(ROOT, p);
  if (!p.includes('*')) return fs.existsSync(full) ? [full] : [];
  const dir = path.dirname(full);
  if (!fs.existsSync(dir)) return [];
  const pattern = new RegExp('^' + path.basename(full).split('*').map(escapeRe).join('.*') + '$');
  return fs.readdirSync(dir).filter((f) => pattern.test(f)).map((f) => path.join(dir, f));
}

function locatorOf(test: string): string | null {
  const parts = test.split('|');
  if (parts.length < 3) return null;
  const p = parts[2].trim();
  return p.length > 0 && !/\s/.test(p) ? p : null;
}

function expectedPaths(cell: string): string[] {
  const tokens = [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((t) => !/\s/.test(t));
  const out: string[] = [];
  let dir = '';
  for (const t of tokens) {
    if (t.includes('/')) {
      out.push(t.replace('xxx', '*'));
      dir = path.posix.dirname(t);
    } else if (/\.(ts|json|sql)$/.test(t) && dir) {
      out.push(`${dir}/${t}`);
    }
  }
  return out;
}

const STATUS_RE = /^(DONE|TODO|BLOCKED:OQ-\d+|CANCELLED:[\w-]+|SUPERSEDED:GAP-\d+|DEFERRED:GAP-\d+)$/;
const TASK_REF_RE = /\bP\d{2}-(?:T\d{2}-S\d{2}-M\d{2}|RBAC-M\d{2}|ADD-T\d{2}-S\d{2}-M\d{2})\b/g;

interface Task {
  id: string;
  status: string;
  description: string;
  prerequisites: string[];
  test: string;
  description_fa?: string;
}

interface Result {
  area: string;
  subject: string;
  check: string;
  violations: string[];
}

const results: Result[] = [];
function record(area: string, subject: string, check: string, violations: string[]): void {
  results.push({ area, subject, check, violations });
}

const tasks: Task[] = JSON.parse(read(path.join(PLAN_DIR, 'OTOMIX_MicroTask_Plan.tasks.json')));
const taskById = new Map(tasks.map((t) => [t.id, t] as const));
const planMd = read(path.join(PLAN_DIR, 'OTOMIX_MicroTask_Plan.md'));
const addendumMd = read(path.join(PLAN_DIR, 'OTOMIX_MicroTask_Plan_Addendum.md'));
const supplementRaw = fs.readFileSync(path.join(PLAN_DIR, 'OTOMIX_MicroTask_Plan_Supplement.md'));
const supplementMd = supplementRaw.toString('utf-8').replace(/^\uFEFF/, '');
const trackerMd = read(path.join(PLAN_DIR, 'OTOMIX_P05_Execution_Tracker.md'));

interface AddTask {
  id: string;
  mark: string;
  expected: string;
}
const addTasks: AddTask[] = addendumMd
  .split(/^###### /m)
  .slice(1)
  .map((chunk) => {
    const head = /^(P05-ADD-[\w-]+) — \[(.)\]/.exec(chunk);
    const exp = /^\| Expected Outcome \| (.*) \|$/m.exec(chunk);
    return head ? { id: head[1], mark: head[2], expected: exp ? exp[1] : '' } : null;
  })
  .filter((x): x is AddTask => x !== null);

const addIds = new Set(addTasks.map((t) => t.id));

interface TrackerRow {
  id: string;
  status: string;
}
const trackerRows: TrackerRow[] = [];
for (const line of trackerMd.split(/\r?\n/)) {
  const m = /^\|\s*`([^`]+)`\s*\|(.*)\|\s*$/.exec(line);
  if (!m || !/^P\d{2}-/.test(m[1])) continue;
  const cells = m[2].split('|').map((c) => c.trim());
  trackerRows.push({ id: m[1], status: cells[cells.length - 1] });
}

function normTracker(s: string): string {
  if (/^DONE/.test(s)) return 'DONE';
  if (/^TODO/.test(s)) return 'TODO';
  if (/^BLOCKED/.test(s)) return 'BLOCKED';
  if (/^OBSOLETE/.test(s)) return 'OBSOLETE';
  return `OTHER:${s}`;
}
function normJson(s: string): string {
  if (s === 'DONE' || s === 'TODO') return s;
  if (s.startsWith('BLOCKED')) return 'BLOCKED';
  if (/^(CANCELLED|SUPERSEDED)/.test(s)) return 'OBSOLETE';
  return s;
}

describe('Task registry: per-task audit (tasks.json)', () => {
  it.each(tasks)('$id [$status]', (t) => {
    const v: string[] = [];
    if (!STATUS_RE.test(t.status)) v.push(`unrecognized status "${t.status}"`);
    for (const p of t.prerequisites ?? []) {
      const pre = taskById.get(p);
      if (!pre) v.push(`prerequisite ${p} does not exist`);
      else if (t.status === 'DONE' && pre.status !== 'DONE') v.push(`DONE but prerequisite ${p} is ${pre.status}`);
    }
    if (t.status === 'DONE') {
      if (/^\[BLOCKED\]/.test(t.test ?? '')) v.push('DONE but test field records an open decision ([BLOCKED])');
      const loc = locatorOf(t.test ?? '');
      if (!loc) {
        v.push('DONE but test field has no file locator');
      } else {
        const files = resolveLocator(loc);
        if (files.length === 0) v.push(`DONE but test file not found: ${loc}`);
        for (const f of files) {
          if (!/\b(it|test)(\.each)?\s*\(/.test(fs.readFileSync(f, 'utf-8')) && !/\.(proto|rego|bench\.ts)$/.test(f)) {
            v.push(`test file contains no test cases: ${relPath(f)}`);
          }
        }
      }
    }
    if (t.description_fa && /[ØÙÃÂ]/.test(t.description_fa)) {
      v.push('description_fa is mojibake (UTF-8 decoded as Latin-1)');
    }
    record('Task registry', t.id, 'per-task', v);
    expect(v, t.id).toEqual([]);
  });

  it('every task id is unique', () => {
    const counts = new Map<string, number>();
    for (const t of tasks) counts.set(t.id, (counts.get(t.id) ?? 0) + 1);
    const dups = [...counts].filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`);
    record('Task registry', 'tasks.json', 'unique ids', dups);
    expect(dups).toEqual([]);
  });
});

describe('Master plan (.md) vs tasks.json', () => {
  const heads = [...planMd.matchAll(/^#{3,6} ((?:P\d{2}|GATE0|X)-[A-Z0-9-]+).*?\[(.)\]/gm)].map((m) => ({ id: m[1], mark: m[2] }));

  it('[x] markers in the master plan agree with tasks.json DONE status', () => {
    const v: string[] = [];
    for (const h of heads) {
      const t = taskById.get(h.id);
      if (!t) v.push(`${h.id}: heading exists but id missing from tasks.json`);
      else if ((h.mark === 'x') !== (t.status === 'DONE')) v.push(`${h.id}: md [${h.mark}] vs json ${t.status}`);
    }
    record('Master plan', 'OTOMIX_MicroTask_Plan.md', '[x] vs DONE', v);
    expect(v).toEqual([]);
  });

  it('every tasks.json task has a heading in the master plan', () => {
    const mdIds = new Set(heads.map((h) => h.id));
    const missing = tasks.filter((t) => !mdIds.has(t.id)).map((t) => `${t.id} [${t.status}]`);
    record('Master plan', 'OTOMIX_MicroTask_Plan.md', 'json task has md heading', missing);
    expect(missing).toEqual([]);
  });
});

describe('Addendum (P05-ADD): definitions and expected outcomes', () => {
  it('Addendum task ids are unique', () => {
    const counts = new Map<string, number>();
    for (const t of addTasks) counts.set(t.id, (counts.get(t.id) ?? 0) + 1);
    const dups = [...counts].filter(([, n]) => n > 1).map(([id, n]) => `${id} defined ${n}x`);
    record('Addendum', 'Addendum.md', 'unique ids', dups);
    expect(dups).toEqual([]);
  });

  it.each(addTasks.map((t) => [t.id, t] as const))('%s expected outcome files exist', (_id, t) => {
    const v: string[] = [];
    const paths = expectedPaths(t.expected);
    if (paths.length === 0 && !/exit 0/i.test(t.expected)) v.push('no expected outcome path declared');
    for (const p of paths) if (resolveLocator(p).length === 0) v.push(`missing: ${p}`);
    record('Addendum', t.id, 'expected outcome files', v);
    expect(v, t.id).toEqual([]);
  });
});

interface Invariant {
  id: string;
  file: string;
  must?: RegExp[];
  mustNotCode?: RegExp[];
}
const INVARIANTS: Invariant[] = [
  { id: 'P05-ADD-T01-S01-M01', file: 'packages/core/src/config/analysis.ts', must: [/export (interface|type) AnalysisConfig\b/, /export function getAnalysisConfig\b/] },
  { id: 'P05-ADD-T01-S02-M01', file: 'packages/adapter/src/normalize.ts', must: [/export function normalizeInput\b/, /normalization\.forceMono/] },
  { id: 'P05-ADD-T02-S01-M01', file: 'packages/core/src/features/energy.ts', must: [/export function computeEnergy\b/, /getAnalysisConfig\(/] },
  { id: 'P05-ADD-T02-S02-M01', file: 'packages/core/src/features/mixability.ts', must: [/export function computeMixability\b/], mustNotCode: [/throw new \w*Error\([^)]*unmix/i] },
  { id: 'P05-ADD-T02-S03-M01', file: 'packages/core/src/features/camelot-gate.ts', must: [/export function isCamelotCompatible\b/] },
  { id: 'P05-ADD-T02-S04-M01', file: 'packages/core/src/features/compatibility.ts', must: [/export function computeCompatibilityScore\b/] },
  { id: 'P05-ADD-T02-S05-M01', file: 'packages/core/src/features/structure.ts', must: [/export (interface|type) TrackStructure\b/, /export function detectStructure\b/] },
  { id: 'P05-ADD-T03-S01-M01', file: 'packages/core/src/grid/lock-rule.ts', mustNotCode: [/playbackRate/] },
  { id: 'P05-ADD-T03-S02-M01', file: 'packages/core/src/transition/window.ts', mustNotCode: [/\b16\b/] },
  { id: 'P05-ADD-T06-S01-M01', file: 'packages/core/src/registry/worker-registry.ts', must: [/export (class|function) WorkerRegistry\b/] },
  { id: 'P05-ADD-T06-S02-M01', file: 'packages/core/src/repository/global-features.ts', must: [/raw_analysis_data/] },
];

describe('Addendum: review-checkpoint invariants checked against code', () => {
  it.each(INVARIANTS.map((i) => [i.id, i] as const))('%s', (_id, inv) => {
    const v: string[] = [];
    const full = path.join(ROOT, inv.file);
    if (!fs.existsSync(full)) {
      v.push(`file missing: ${inv.file}`);
    } else {
      const src = read(full);
      for (const re of inv.must ?? []) if (!re.test(src)) v.push(`missing pattern ${re}`);
      for (const re of inv.mustNotCode ?? []) if (re.test(codeOnly(src))) v.push(`forbidden code pattern ${re}`);
    }
    record('Addendum invariants', inv.id, inv.file, v);
    expect(v, inv.id).toEqual([]);
  });

  it('P05-ADD-T06-S02-M01: heterogeneous JSONB migration exists', () => {
    const migrations = resolveLocator('packages/db/migrations/*global_features_jsonb.sql');
    const v = migrations.length === 0
      ? ['no *global_features_jsonb.sql migration']
      : migrations.filter((f) => !/jsonb/i.test(read(f))).map((f) => `no jsonb column in ${relPath(f)}`);
    record('Addendum invariants', 'P05-ADD-T06-S02-M01', 'jsonb migration', v);
    expect(v).toEqual([]);
  });

  it('P05-ADD-T01-S02-M01: no package defaults forceMono to true (stereo default)', () => {
    const srcFiles = walk(path.join(ROOT, 'packages'), ['.ts']).filter((f) => f.includes(`${path.sep}src${path.sep}`));
    const v = srcFiles
      .filter((f) => /forceMono\s*(:\s*boolean)?\s*=\s*true/.test(read(f)))
      .map((f) => `forceMono defaults to true in ${relPath(f)}`);
    record('Addendum invariants', 'P05-ADD-T01-S02-M01', 'stereo default', v);
    expect(v).toEqual([]);
  });
});

describe('Tracker (P05 Execution Tracker) consistency', () => {
  it('tracker status agrees with tasks.json and Addendum for every listed id', () => {
    const v: string[] = [];
    for (const row of trackerRows) {
      if (row.id.startsWith('P05-ADD-')) {
        const def = addTasks.find((t) => t.id === row.id);
        if (!def) {
          v.push(`${row.id}: listed in tracker but not defined in Addendum`);
          continue;
        }
        const want = def.mark === 'x' ? 'DONE' : 'TODO';
        if (normTracker(row.status) !== want) v.push(`${row.id}: tracker "${row.status}" vs Addendum [${def.mark}]`);
      } else {
        const t = taskById.get(row.id);
        if (!t) {
          v.push(`${row.id}: listed in tracker but missing from tasks.json`);
          continue;
        }
        if (normTracker(row.status) !== normJson(t.status)) {
          v.push(`${row.id}: tracker "${row.status}" vs tasks.json ${t.status}`);
        }
      }
    }
    record('Tracker', 'OTOMIX_P05_Execution_Tracker.md', 'status agreement', v);
    expect(v).toEqual([]);
  });

  it('tracker working branch and HEAD match the git repository', () => {
    const branch = /\| Working branch \| `([^`]+)`/.exec(trackerMd)?.[1] ?? '';
    const head = /\| HEAD \| `([0-9a-f]+)`/.exec(trackerMd)?.[1] ?? '';
    const git = (args: string[]): string => execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8' }).trim();
    const actualBranch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    const actualHead = git(['rev-parse', 'HEAD']);
    const v: string[] = [];
    if (branch !== actualBranch) v.push(`branch: tracker "${branch}" vs git "${actualBranch}"`);
    if (!head || !actualHead.startsWith(head)) v.push(`HEAD: tracker "${head}" vs git "${actualHead.slice(0, 7)}"`);
    record('Tracker', 'OTOMIX_P05_Execution_Tracker.md', 'branch and HEAD', v);
    expect(v).toEqual([]);
  });

  it('architecture commits listed in the tracker exist in git', () => {
    const row = /\| Architecture commits[^|]*\|([^|]+)\|/.exec(trackerMd)?.[1] ?? '';
    const shas = [...row.matchAll(/`([0-9a-f]{7,40})`/g)].map((m) => m[1]);
    const v = shas.filter((sha) => {
      try {
        execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: ROOT, stdio: 'pipe' });
        return false;
      } catch {
        return true;
      }
    }).map((sha) => `commit not found: ${sha}`);
    record('Tracker', 'OTOMIX_P05_Execution_Tracker.md', 'architecture commits', v);
    expect(shas.length).toBeGreaterThan(0);
    expect(v).toEqual([]);
  });
});

describe('Supplement: integrity and cross-references', () => {
  const entries = supplementMd
    .split(/^### /m)
    .slice(1)
    .map((chunk) => {
      const id = /^\[([A-Z]+-\d+)\]/.exec(chunk)?.[1] ?? '?';
      return { id, chunk, severity: /\[(BLOCKER|HIGH|MEDIUM|LOW|ADVISORY)\]/.exec(chunk)?.[1] ?? '' };
    });

  it('supplement contains no NUL bytes (file corruption)', () => {
    const lines = supplementRaw.toString('latin1').split('\n');
    const v = lines.map((l, i) => (l.includes('\0') ? `line ${i + 1}` : '')).filter(Boolean);
    record('Supplement', 'OTOMIX_MicroTask_Plan_Supplement.md', 'no NUL bytes', v);
    expect(v).toEqual([]);
  });

  it('entry ids are unique and each entry declares a severity', () => {
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.id, (counts.get(e.id) ?? 0) + 1);
    const v = [
      ...[...counts].filter(([, n]) => n > 1).map(([id]) => `duplicate ${id}`),
      ...entries.filter((e) => /^(GAP|CONFLICT)-/.test(e.id) && !e.severity).map((e) => `${e.id} has no severity tag`),
    ];
    record('Supplement', 'entries', 'ids and severity', v);
    expect(v).toEqual([]);
  });

  it('every entry has a Status line as defined by the document legend', () => {
    const v = entries.filter((e) => !/- \*\*Status:\*\*/.test(e.chunk)).map((e) => e.id);
    record('Supplement', 'entries', 'Status line', v.map((id) => `${id} has no Status`));
    expect(v).toEqual([]);
  });

  it('phase tags reference existing phases', () => {
    const phases = new Set([...tasks.map((t) => t.id.slice(0, 3)), 'ALL', 'TBD', 'Pnn']);
    const v: string[] = [];
    for (const e of entries) {
      for (const m of e.chunk.matchAll(/\[PHASE: ([^\]]+)\]/g)) {
        for (const p of m[1].split(',').map((x) => x.trim())) {
          if (!phases.has(p)) v.push(`${e.id}: unknown phase "${p}"`);
        }
      }
    }
    record('Supplement', 'entries', 'phase tags', v);
    expect(v).toEqual([]);
  });

  it('every task reference in the supplement resolves to a real task id', () => {
    const v: string[] = [];
    for (const e of entries) {
      for (const m of e.chunk.matchAll(TASK_REF_RE)) {
        if (!taskById.has(m[0]) && !addIds.has(m[0])) v.push(`${e.id} -> ${m[0]}`);
      }
    }
    record('Supplement', 'entries', 'dangling task references', v);
    expect(v).toEqual([]);
  });

  it('BLOCKER entries do not point at tasks already marked DONE', () => {
    const v: string[] = [];
    for (const e of entries.filter((x) => x.severity === 'BLOCKER')) {
      const refs = new Set([...e.chunk.matchAll(TASK_REF_RE)].map((m) => m[0]));
      for (const r of refs) {
        const t = taskById.get(r);
        if (t && t.status === 'DONE') v.push(`${e.id} references DONE task ${r}`);
      }
    }
    record('Supplement', 'BLOCKER entries', 'no DONE references', v);
    expect(v).toEqual([]);
  });
});

describe('Build health', () => {
  it('packages/core typechecks with exit code 0 (P05-ADD-T01-S03-M01)', () => {
    let code = 0;
    let out = '';
    try {
      execFileSync('npx', ['tsc', '-p', 'packages/core/tsconfig.json', '--noEmit'], {
        cwd: ROOT,
        encoding: 'utf-8',
        stdio: 'pipe',
        shell: true,
        timeout: 280000,
      });
    } catch (e: any) {
      code = typeof e.status === 'number' ? e.status : 1;
      out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }
    const errors = out.split(/\r?\n/).filter((l) => /error TS\d+/.test(l)).map((l) => l.trim());
    record('Build health', 'packages/core', 'tsc --noEmit', code === 0 ? [] : errors.length ? errors : [`exit ${code}`]);
    expect(code, errors.join('\n')).toBe(0);
  }, 300000);
});

afterAll(() => {
  const byArea = new Map<string, { total: number; failed: number }>();
  for (const r of results) {
    const a = byArea.get(r.area) ?? { total: 0, failed: 0 };
    a.total++;
    if (r.violations.length) a.failed++;
    byArea.set(r.area, a);
  }
  const failed = results.filter((r) => r.violations.length > 0);
  const total = results.length;
  const lines: string[] = [
    '# OTOMIX Plan Audit Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Source: \`tools/test/plan-audit.spec.ts\` (run with \`npx vitest run tools/test/plan-audit.spec.ts\`)`,
    '',
    '## Summary',
    '',
    `Checks: ${total} · Passed: ${total - failed.length} · Failed: ${failed.length}`,
    '',
    '| Area | Checks | Failed |',
    '|---|---|---|',
    ...[...byArea].map(([area, s]) => `| ${area} | ${s.total} | ${s.failed} |`),
    '',
    '## Failures',
    '',
    ...failed.map((r) => `- **${r.subject}** (${r.check}): ${r.violations.join('; ')}`),
    '',
    '## Not automatable (manual review required)',
    '',
    '- Essentia 31-feature key mapping vs `Essentia Features.xlsx` sheet 1 (P05-ADD-T03-S03-M01).',
    '- Formula correctness of the skeleton scores (P05-ADD-T02-S01..S04); the tests only check exports and config wiring.',
    '- Behavioural semantics of DONE tasks beyond the locator test (the audit checks that the locator file exists and contains test cases, not that those tests pass).',
    '- Supplement entries carry no Status, so resolution of GAP/CONFLICT items cannot be verified mechanically.',
    '',
  ];
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
});
