// OTOMIX Architecture Fitness Function — Rule 25 & Rule 26 permanent guard
// Runs on every `npx vitest run`. Fails loudly if the codebase drifts from
// the Beat-Index Absolute rule (Rule 26) or the Mixability-First rule (Rule 25).
//
// This file is the single source of truth for what seconds identifiers are
// allowed. Adding a new _MS/_S/_ms/_s/*Seconds identifier to packages/core/src/
// requires editing RULE_26_ALLOWLIST below — i.e., an explicit, reviewable
// decision, not an accidental drift.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { GRID_CONSTANTS } from '../src/constants/grid';
import { DRIFT_THRESHOLD_QUANTA } from '../src/constants/timing';
import { VOCAL_MEDIAN_BEATS } from '../src/constants/scoring';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const REPO_ROOT = path.resolve(__dirname, '../../..');
const CORE_SRC = path.resolve(REPO_ROOT, 'packages/core/src');
const CORE_TEST = path.resolve(REPO_ROOT, 'packages/core/test');
const RULES_AI = path.resolve(REPO_ROOT, 'Docs/.Agents/AI Agent.MD');
const RULES_CLINE = path.resolve(REPO_ROOT, '.clinerules/OTOMIX_Cline_Rules.md');
const README_P04 = path.resolve(
  REPO_ROOT,
  'Docs/ArchitectureBook/narratives/P04/README.md',
);

// ---------------------------------------------------------------------------
// Rule 26 — explicit allowlist
//
// Every identifier below is a DELIBERATE, documented exception to Rule 26.
// Categories:
//   - Web Audio boundary constants (scheduling, lookahead, latency)
//   - File I/O boundary params (transition plan file positions)
//   - Bridge function (quantumSeconds)
//   - Web Audio boundary function params (clock reads passed through)
// ---------------------------------------------------------------------------
const RULE_26_ALLOWLIST: ReadonlySet<string> = new Set([
  'LOOKAHEAD_MS',
  'SCHED_ACCURACY_MS',
  'STARVATION_FRAME_MS',
  'PORT_LATENCY_MS',
  'ANALYSIS_TIMEOUT_MS',
  'EXTRACTION_ALERT_MS',
  'OBSERVER_CYCLE_MS',
  'DEFAULT_BASE_MS',
  'DEFAULT_CAP_MS',
  'tInSeconds',
  'tOutSeconds',
  'alignToSeconds',
  'quantumSeconds',
  'gridTimeSeconds',
  'contextTimeSeconds',
  'dtSeconds',
]);

// ---------------------------------------------------------------------------
// Rule 26 scanner — string-aware, comment-aware
// ---------------------------------------------------------------------------
const SUFFIX_PATTERN = /\b[A-Za-z][A-Za-z0-9_]*_(?:MS|S|ms|s)\b/g;
const CAMEL_SECONDS_PATTERN = /\b[A-Za-z][A-Za-z0-9_]*Seconds\b/g;

function cleanLine(line: string): string {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('*') || trimmed.startsWith('/*')) {
    return ' '.repeat(line.length);
  }

  let out = '';
  let inString: '"' | "'" | '`' | null = null;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inString === null) {
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = ch;
        out += ' ';
      } else if (ch === '/' && line[i + 1] === '/') {
        out += ' '.repeat(line.length - i);
        break;
      } else {
        out += ch;
      }
    } else {
      if (ch === '\\') {
        out += '  ';
        i++;
      } else if (ch === inString) {
        inString = null;
        out += ' ';
      } else {
        out += ' ';
      }
    }
  }

  return out;
}

export function scanTextForViolations(
  text: string,
): Array<{ line: number; identifier: string }> {
  const violations: Array<{ line: number; identifier: string }> = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const cleaned = cleanLine(lines[i]);
    const ids = new Set<string>();
    let m: RegExpExecArray | null;

    SUFFIX_PATTERN.lastIndex = 0;
    while ((m = SUFFIX_PATTERN.exec(cleaned)) !== null) ids.add(m[0]);

    CAMEL_SECONDS_PATTERN.lastIndex = 0;
    while ((m = CAMEL_SECONDS_PATTERN.exec(cleaned)) !== null) ids.add(m[0]);

    for (const id of ids) {
      if (!RULE_26_ALLOWLIST.has(id)) {
        violations.push({ line: i + 1, identifier: id });
      }
    }
  }

  return violations;
}

function walkDir(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      results.push(...walkDir(full, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

function readSrc(relPath: string): string {
  const full = path.join(CORE_SRC, relPath);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing source file: ${relPath}`);
  }
  return fs.readFileSync(full, 'utf-8');
}

// ---------------------------------------------------------------------------
// Section A — Rule 26 scanner self-test
// ---------------------------------------------------------------------------
describe('Rule 26 scanner — self-test', () => {
  it('detects _ms suffix in code', () => {
    const v = scanTextForViolations('function foo(duration_ms: number) {}');
    expect(v.some((x) => x.identifier === 'duration_ms')).toBe(true);
  });

  it('detects _MS suffix in code', () => {
    const v = scanTextForViolations('const x = DRIFT_MAX_S + 1;');
    expect(v.some((x) => x.identifier === 'DRIFT_MAX_S')).toBe(true);
  });

  it('detects *Seconds camelCase in code', () => {
    const v = scanTextForViolations('const x = driftSeconds + 1;');
    expect(v.some((x) => x.identifier === 'driftSeconds')).toBe(true);
  });

  it('ignores identifiers inside line comments', () => {
    const v = scanTextForViolations('const x = 1; // duration_ms was removed');
    expect(v).toHaveLength(0);
  });

  it('ignores identifiers inside string literals', () => {
    const v = scanTextForViolations('const x = "duration_ms";');
    expect(v).toHaveLength(0);
  });

  it('ignores allowlisted identifiers', () => {
    const v = scanTextForViolations(
      'const x = LOOKAHEAD_MS + tInSeconds + quantumSeconds(bpm);',
    );
    expect(v).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Section B — Rule 26 source scan
// ---------------------------------------------------------------------------
describe('Rule 26 — no unauthorized seconds identifiers in packages/core/src/', () => {
  it('scans every .ts file under packages/core/src/', () => {
    const files = walkDir(CORE_SRC, '.ts');
    expect(files.length).toBeGreaterThan(20);

    const violations: Array<{ file: string; line: number; identifier: string }> =
      [];

    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      const found = scanTextForViolations(content);
      for (const item of found) {
        violations.push({
          file: path.relative(REPO_ROOT, f).replace(/\\/g, '/'),
          line: item.line,
          identifier: item.identifier,
        });
      }
    }

    if (violations.length > 0) {
      const detail = violations
        .map((v) => `  ${v.file}:${v.line} -> ${v.identifier}`)
        .join('\n');
      throw new Error(
        `Rule 26 violations found (${violations.length}):\n${detail}\n\n` +
          `Fix the code OR add the identifier to RULE_26_ALLOWLIST in this test ` +
          `with a comment explaining why it is at a boundary.`,
      );
    }

    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Section C — Constants
// ---------------------------------------------------------------------------
describe('Constants — quanta/samples discipline', () => {
  it('GRID_CONSTANTS has exactly 41 entries', () => {
    expect(Object.keys(GRID_CONSTANTS)).toHaveLength(42);
  });

  it('QUANTUM_DIVISOR = 24', () => {
    expect(GRID_CONSTANTS.QUANTUM_DIVISOR).toBe(24);
    expect(GRID_CONSTANTS.QUANTUM_DIVISOR).toBe(24);
  });

  it('DRIFT_MAX_QUANTA = 2.4', () => {
    expect(GRID_CONSTANTS.DRIFT_MAX_QUANTA).toBe(2.4);
  });

  it('IRREGULAR_XFADE_EXTRA_QUANTA = 0.48', () => {
    expect(GRID_CONSTANTS.IRREGULAR_XFADE_EXTRA_QUANTA).toBe(0.48);
  });

  it('RATE_SLEW_PER_QUANTA = 0.005 / 48', () => {
    expect(GRID_CONSTANTS.RATE_SLEW_PER_QUANTA).toBeCloseTo(0.005 / 48, 12);
  });

  it('OBSERVER_MAX_EXPECTED_DRIFT_QUANTA = 2.4', () => {
    expect(GRID_CONSTANTS.OBSERVER_MAX_EXPECTED_DRIFT_QUANTA).toBe(2.4);
  });

  it('BODY_*_SAMPLES have integer sample values', () => {
    expect(GRID_CONSTANTS.BODY_RMS_WINDOW_SAMPLES).toBe(221);
    expect(GRID_CONSTANTS.BODY_SEARCH_WINDOW_SAMPLES).toBe(2205);
    expect(GRID_CONSTANTS.BODY_GROUP_DELAY_SAMPLES).toBe(322);
  });

  it('DRIFT_THRESHOLD_QUANTA = 0.192', () => {
    expect(DRIFT_THRESHOLD_QUANTA).toBeCloseTo(0.192, 12);
  });

  it('VOCAL_MEDIAN_BEATS is a positive number', () => {
    expect(typeof VOCAL_MEDIAN_BEATS).toBe('number');
    expect(VOCAL_MEDIAN_BEATS).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Section D — Function signatures
// ---------------------------------------------------------------------------
describe('Function signatures — quanta discipline', () => {
  it('getSyncedDrift uses driftQuantaPerBeat (not driftPerBeat)', () => {
    const src = readSrc('grid/anchor-sync.ts');
    const m = src.match(/export function getSyncedDrift\s*\(([^)]*)\)/s);
    expect(m).not.toBeNull();
    expect(m![1]).toContain('driftQuantaPerBeat');
    expect(m![1]).not.toContain('driftPerBeat');
  });

  it('tOfI accepts a deltaQuanta param', () => {
    const src = readSrc('grid/t-of-i.ts');
    const m = src.match(/export function tOfI\s*\(([^)]*)\)/s);
    expect(m).not.toBeNull();
    expect(m![1].toLowerCase()).toContain('deltaquanta');
  });

  it('cosineRealign uses a quanta param', () => {
    const src = readSrc('grid/realign-cosine.ts');
    const m = src.match(/export function cosineRealign\s*\(([^)]*)\)/s);
    expect(m).not.toBeNull();
    expect(m![1].toLowerCase()).toContain('quanta');
  });

  it('logRealign uses a quanta param', () => {
    const src = readSrc('observer/realign-log.ts');
    const m = src.match(/export function logRealign\s*\(([^)]*)\)/s);
    expect(m).not.toBeNull();
    expect(m![1].toLowerCase()).toContain('quanta');
  });

  it('computeDrift takes only boundary seconds params + bpm', () => {
    const src = readSrc('observer/drift.ts');
    const m = src.match(/export function computeDrift\s*\(([^)]*)\)/s);
    expect(m).not.toBeNull();
    const params = m![1];
    expect(params).toContain('gridTimeSeconds');
    expect(params).toContain('contextTimeSeconds');
    expect(params).toContain('bpm');
    expect(src).not.toMatch(/\bconst\s+driftSeconds\b/);
    expect(src).not.toMatch(/\bconst\s+quantumSeconds\s*=/);
    expect(src).toMatch(/quantumSeconds\s*\(/);
  });

  it('computeNextRate uses a quanta param', () => {
    const src = readSrc('observer/scale.ts');
    const m = src.match(/export function computeNextRate\s*\(([^)]*)\)/s);
    expect(m).not.toBeNull();
    expect(m![1].toLowerCase()).toContain('quanta');
  });
});

// ---------------------------------------------------------------------------
// Section E — Rules files
// ---------------------------------------------------------------------------
describe('Rules files — Rule 25 + Rule 26 registered', () => {
  it('AI Agent.MD contains Rule 25 (Mixability-First) and Rule 26 (Beat-Index)', () => {
    expect(fs.existsSync(RULES_AI)).toBe(true);
    const c = fs.readFileSync(RULES_AI, 'utf-8');
    expect(c).toMatch(/Rule 25[^\n]*Mixability-First/);
    expect(c).toMatch(/Rule 26[^\n]*Beat-Index/);
    expect(c).toMatch(/nothing in the project called seconds|NO such thing as seconds/i);
  });

  it('OTOMIX_Cline_Rules.md contains Rule 25 and Rule 26', () => {
    expect(fs.existsSync(RULES_CLINE)).toBe(true);
    const c = fs.readFileSync(RULES_CLINE, 'utf-8');
    expect(c).toMatch(/Rule 25[^\n]*Mixability-First/);
    expect(c).toMatch(/Rule 26[^\n]*Beat-Index/);
  });
});

// ---------------------------------------------------------------------------
// Section F — Test file hygiene
// ---------------------------------------------------------------------------
describe('Test file hygiene', () => {
  it('no driftPerBeat identifier remains in any .spec.ts', () => {
    const files = walkDir(CORE_TEST, '.spec.ts');
    const offenders: string[] = [];
    for (const f of files) {
      if (f.endsWith('architecture.compliance.spec.ts')) continue;
      const c = fs.readFileSync(f, 'utf-8');
      const stripped = c
        .split(/\r?\n/)
        .map(cleanLine)
        .join('\n');
      if (/\bdriftPerBeat\b/.test(stripped)) {
        offenders.push(path.relative(REPO_ROOT, f).replace(/\\/g, '/'));
      }
    }
    expect(offenders).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Section G — Documentation hygiene
// ---------------------------------------------------------------------------
describe('Documentation hygiene — P04 narrative', () => {
  it('README P04 has no stale RATE_SLEW_PER_S or crossfadeMs', () => {
    expect(fs.existsSync(README_P04)).toBe(true);
    const c = fs.readFileSync(README_P04, 'utf-8');
    expect(c).not.toMatch(/\bRATE_SLEW_PER_S\b/);
    expect(c).not.toMatch(/\bcrossfadeMs\b/);
  });
});