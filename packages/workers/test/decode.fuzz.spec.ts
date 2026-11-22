import { Worker } from 'node:worker_threads';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { generateCorpus } from '../../../fuzz/generate-corpus';

type DecodeFormat = 'wav' | 'mp3' | 'flac';

interface ManifestEntry {
  file: string;
  class: string;
  format: DecodeFormat;
}

type DecodeResult =
  | { ok: true; value: { pcm: Float32Array; sampleRate: number; sha256: string } }
  | { ok: false; error: string; message: string };

function isDecodeResult(value: unknown): value is DecodeResult {
  if (typeof value !== 'object' || value === null || !('ok' in value)) return false;
  if (value.ok === true) {
    if (!('value' in value) || typeof value.value !== 'object' || value.value === null) return false;
    return 'pcm' in value.value
      && value.value.pcm instanceof Float32Array
      && 'sampleRate' in value.value
      && typeof value.value.sampleRate === 'number'
      && Number.isFinite(value.value.sampleRate)
      && 'sha256' in value.value
      && typeof value.value.sha256 === 'string';
  }
  return value.ok === false
    && 'error' in value
    && typeof value.error === 'string'
    && 'message' in value
    && typeof value.message === 'string';
}

interface PendingRequest {
  resolve: (result: DecodeResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const ROOT = path.resolve(__dirname, '../../../');
const CORPUS_DIR = path.join(ROOT, 'fuzz', 'corpus');
const MANIFEST_PATH = path.join(ROOT, 'fuzz', 'manifest.json');
const FLAC_FIXTURE_PATH = path.join(__dirname, 'fixtures', '5s-48khz-stereo.flac');
const MP3_FIXTURE_PATH = path.join(__dirname, 'fixtures', '5s-48khz-stereo.mp3');
const WORKER_PATH = path.resolve(__dirname, '../src/decode-worker-entry.ts');
const PER_INPUT_TIMEOUT_MS = 5_000;
const MAIN_HEAP_GROWTH_LIMIT_BYTES = 32 * 1024 * 1024;

beforeAll(() => {
  if (!fs.existsSync(CORPUS_DIR) || !fs.existsSync(MANIFEST_PATH)) {
    generateCorpus(CORPUS_DIR);
  }
}, 120_000);

function isManifestEntry(value: unknown): value is ManifestEntry {
  if (typeof value !== 'object' || value === null) return false;
  if (!('file' in value) || typeof value.file !== 'string') return false;
  if (!('class' in value) || typeof value.class !== 'string') return false;
  return 'format' in value
    && (value.format === 'wav' || value.format === 'mp3' || value.format === 'flac');
}

function readManifest(): ManifestEntry[] {
  if (!fs.existsSync(MANIFEST_PATH) || !fs.existsSync(CORPUS_DIR)) {
    throw new Error('fuzz corpus is missing; run fuzz/generate-corpus.ts first');
  }
  const parsed: unknown = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (!Array.isArray(parsed) || !parsed.every(isManifestEntry)) {
    throw new Error('fuzz manifest has an invalid shape');
  }
  return parsed;
}

function createWorkerClient(worker: Worker) {
  let pending: PendingRequest | null = null;
  let terminalError: Error | null = null;

  function fail(error: Error): void {
    terminalError = error;
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.reject(error);
    pending = null;
  }

  worker.on('message', (message: unknown) => {
    if (!pending) return;
    if (!isDecodeResult(message)) {
      fail(new Error('decode worker returned an invalid response'));
      return;
    }

    const request = pending;
    clearTimeout(request.timer);
    pending = null;
    request.resolve(message);
  });
  worker.on('error', (error) => fail(error));
  worker.on('messageerror', () => fail(new Error('decode worker response could not be deserialized')));
  worker.on('exit', (code) => {
    if (code !== 0) fail(new Error(`decode worker exited with code ${code}`));
  });

  return {
    decode(bytes: Uint8Array, format: DecodeFormat, label: string): Promise<DecodeResult> {
      if (terminalError) return Promise.reject(terminalError);
      if (pending) return Promise.reject(new Error('decode worker already has a pending request'));

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const error = new Error(`decode worker timed out on ${label}`);
          fail(error);
          void worker.terminate();
        }, PER_INPUT_TIMEOUT_MS);
        pending = { resolve, reject, timer };

        try {
          worker.postMessage(
            { bytes, format, trace_id: 'decode-fuzz', span_id: label },
            [bytes.buffer],
          );
        } catch (error) {
          clearTimeout(timer);
          pending = null;
          reject(error instanceof Error ? error : new Error('could not post decode request'));
        }
      });
    },
  };
}

function createWorker(): Worker {
  return new Worker(WORKER_PATH, {
    execArgv: ['--import', 'tsx'],
    resourceLimits: { maxOldGenerationSizeMb: 512 },
  });
}

describe('container parser worker fuzz corpus (GATE0-SEC-M02)', () => {
  it('rejects invalid WAV input with INVALID_ARGUMENT', async () => {
    const worker = createWorker();
    const client = createWorkerClient(worker);

    try {
      const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0]);
      const result = await client.decode(bytes, 'wav', 'invalid-wav');
      expect(result).toMatchObject({ ok: false, error: 'INVALID_ARGUMENT' });
    } finally {
      await worker.terminate();
    }
  }, 15_000);

  it('decodes a valid MP3 fixture without decoder errors', async () => {
    const worker = createWorker();
    const client = createWorkerClient(worker);

    try {
      const bytes = new Uint8Array(fs.readFileSync(MP3_FIXTURE_PATH));
      const result = await client.decode(bytes, 'mp3', 'valid-mp3-fixture');
      expect(result.ok).toBe(true);
    } finally {
      await worker.terminate();
    }
  }, 15_000);

  it('rejects FLAC sample counts that would require padding beyond one block', async () => {
    const worker = createWorker();
    const client = createWorkerClient(worker);

    try {
      const bytes = new Uint8Array(fs.readFileSync(FLAC_FIXTURE_PATH));
      if (bytes.length < 26) throw new Error('valid FLAC fixture is too short');
      bytes[21] = ((bytes[21] ?? 0) & 0xf0) | 0x0f;
      bytes.fill(0xff, 22, 26);

      const result = await client.decode(bytes, 'flac', 'oversized-flac-sample-count');
      expect(result).toMatchObject({ ok: false, error: 'INVALID_ARGUMENT' });
    } finally {
      await worker.terminate();
    }
  }, 15_000);

  it('processes the full 300-file corpus in a worker capped at 512 MiB while keeping the main heap stable', async () => {
    const manifest = readManifest();
    expect(manifest).toHaveLength(300);

    const forceGc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
    forceGc?.();
    const heapBefore = process.memoryUsage().heapUsed;
    const worker = createWorker();
    const client = createWorkerClient(worker);
    let responses = 0;
    try {
      for (const entry of manifest) {
        const bytes = new Uint8Array(fs.readFileSync(path.join(CORPUS_DIR, entry.file)));
        const result = await client.decode(bytes, entry.format, entry.file);
        expect(typeof result.ok).toBe('boolean');
        if (entry.class === 'truncated' || entry.class === 'oversized') {
          expect(result, `${entry.file} should be rejected as malformed`).toMatchObject({
            ok: false,
            error: 'INVALID_ARGUMENT',
          });
        }
        responses++;
      }
    } finally {
      await worker.terminate();
    }

    forceGc?.();
    const heapAfter = process.memoryUsage().heapUsed;
    expect(responses).toBe(300);
    expect(heapAfter - heapBefore).toBeLessThan(MAIN_HEAP_GROWTH_LIMIT_BYTES);
  }, 1_800_000);
});
