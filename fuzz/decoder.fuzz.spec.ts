import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { decodeAll } from '../packages/workers/src/decode';

const FUZZ_DIR = path.resolve(__dirname);
const CORPUS_DIR = path.join(FUZZ_DIR, 'corpus');
const MANIFEST_PATH = path.join(FUZZ_DIR, 'manifest.json');
const TIMEOUT_MS = 5000;
const HEAP_CAP_BYTES = 512 * 1024 * 1024;
const EXPECTED_TOTAL = 300;
const EXPECTED_PER_CLASS = 75;
const CLASSES = ['truncated', 'oversized', 'recursive', 'garbage'] as const;

interface ManifestEntry { file: string; class: string; format: 'wav' | 'mp3' | 'flac'; bytes: number; }
let manifest: ManifestEntry[] = [];

beforeAll(() => {
  if (!fs.existsSync(CORPUS_DIR) || !fs.existsSync(MANIFEST_PATH)) {
    execFileSync('npx', ['tsx', path.join(FUZZ_DIR, 'generate-corpus.ts')], {
      cwd: path.resolve(FUZZ_DIR, '..'),
      stdio: 'inherit',
    });
  }
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
}, 120_000);

describe('Container parser fuzz corpus (P07-T02-S02-M01)', () => {
  it('manifest covers every class with 75 files each', () => {
    expect(manifest.length).toBe(EXPECTED_TOTAL);
    for (const klass of CLASSES) {
      const n = manifest.filter((m) => m.class === klass).length;
      expect(n).toBe(EXPECTED_PER_CLASS);
    }
  });

  it('all 300 files: no timeouts, no heap overrun, no unhandled exceptions', async () => {
    let timedOut = 0;
    let unhandled = 0;
    let badShape = 0;
    let ok = 0;
    const failures: Array<{ file: string; kind: string; error?: string }> = [];

    const gc = (globalThis as any).gc as undefined | (() => void);
    if (gc) gc();
    const heapBefore = process.memoryUsage().heapUsed;
    let peakHeap = heapBefore;

    for (const entry of manifest) {
      const abs = path.join(CORPUS_DIR, entry.file);
      const bytes = new Uint8Array(fs.readFileSync(abs));

      let timedOutThis = false;
      const timer = setTimeout(() => { timedOutThis = true; }, TIMEOUT_MS);

      try {
        const r = await decodeAll(bytes, entry.format, 'fuzz', 'fuzz');
        if (!r || typeof r !== 'object' || (r.ok !== true && r.ok !== false)) {
          badShape++;
          failures.push({ file: entry.file, kind: 'bad-shape', error: JSON.stringify(r).slice(0, 200) });
        } else {
          ok++;
        }
      } catch (e) {
        unhandled++;
        failures.push({ file: entry.file, kind: 'unhandled', error: String(e).slice(0, 300) });
      } finally {
        clearTimeout(timer);
      }

      if (timedOutThis) {
        timedOut++;
        failures.push({ file: entry.file, kind: 'timeout' });
      }

      const heapNow = process.memoryUsage().heapUsed;
      if (heapNow > peakHeap) peakHeap = heapNow;
    }

    if (gc) gc();
    const heapAfter = process.memoryUsage().heapUsed;
    const peakDelta = peakHeap - heapBefore;
    const endDelta = heapAfter - heapBefore;
    const heapOk = peakDelta <= HEAP_CAP_BYTES;

    if (failures.length > 0) {
      console.error('fuzz failures (first 10):', JSON.stringify(failures.slice(0, 10), null, 2));
    }
    console.error(
      `Fuzz summary: ok=${ok} timedOut=${timedOut} unhandled=${unhandled} badShape=${badShape} ` +
      `heapPeakDelta=${peakDelta} heapEndDelta=${endDelta} cap=${HEAP_CAP_BYTES}`,
    );

    expect(timedOut).toBe(0);
    expect(unhandled).toBe(0);
    expect(badShape).toBe(0);
    expect(heapOk).toBe(true);
    expect(ok + timedOut + unhandled + badShape).toBe(EXPECTED_TOTAL);
  }, 1_800_000);
});