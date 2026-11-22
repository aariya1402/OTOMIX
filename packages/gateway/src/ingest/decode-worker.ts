// OTOMIX §5.2 · Mother §1 · GAP-014
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Worker } from 'node:worker_threads';

export type DecodeFormat = 'mp3' | 'wav' | 'flac' | 'unknown';
export interface DecodeValue { pcm: Float32Array; sampleRate: number; sha256: string; }
export type DecodeResult =
  | { ok: true; value: DecodeValue }
  | { ok: false; error: 'INVALID_ARGUMENT' | 'DECODE_FAILED' | 'TIMEOUT' | 'OOM'; message: string };

export interface DecodeWorkerDeps { workerPath?: string; timeoutMs?: number; }

const DECODE_WORKER_MAX_OLD_SPACE_MB = 512;

export function runDecodeWorker(bytes: Uint8Array, format: DecodeFormat, deps: DecodeWorkerDeps = {}): Promise<DecodeResult> {
  return new Promise((resolve) => {
    let workerPath = deps.workerPath;
    if (!workerPath) {
      workerPath = path.resolve(__dirname, '../../../workers/dist/decode-worker-entry.js');
      if (!fs.existsSync(workerPath)) {
        resolve({ ok: false, error: 'DECODE_FAILED', message: 'worker entry not found' });
        return;
      }
    }
    const w = new Worker(workerPath, {
      resourceLimits: { maxOldGenerationSizeMb: DECODE_WORKER_MAX_OLD_SPACE_MB },
    });
    const timer = setTimeout(() => { w.terminate(); resolve({ ok: false, error: 'TIMEOUT', message: 'decode exceeded timeout' }); }, deps.timeoutMs ?? 5 * 60 * 1000);
    w.once('message', (msg: any) => { clearTimeout(timer); w.terminate(); resolve(msg); });
    w.once('error', (err) => {
      clearTimeout(timer);
      w.terminate();
      const error = 'code' in err && err.code === 'ERR_WORKER_OUT_OF_MEMORY' ? 'OOM' : 'DECODE_FAILED';
      resolve({ ok: false, error, message: err.message });
    });
    const copy = new Uint8Array(bytes.length); copy.set(bytes);
    w.postMessage({ bytes: copy, format }, [copy.buffer]);
  });
}