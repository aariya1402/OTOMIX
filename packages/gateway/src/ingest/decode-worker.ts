// OTOMIX §5.2 · Mother §1 · GAP-014
import { Worker } from 'node:worker_threads';

export type DecodeFormat = 'mp3' | 'wav' | 'flac' | 'unknown';
export interface DecodeValue { pcm: Float32Array; sampleRate: number; sha256: string; }
export type DecodeResult =
  | { ok: true; value: DecodeValue }
  | { ok: false; error: 'INVALID_ARGUMENT' | 'DECODE_FAILED' | 'TIMEOUT' | 'OOM'; message: string };

export interface DecodeWorkerDeps { workerPath?: string; timeoutMs?: number; }

export function runDecodeWorker(bytes: Uint8Array, format: DecodeFormat, deps: DecodeWorkerDeps = {}): Promise<DecodeResult> {
  return new Promise((resolve) => {
    let workerPath = deps.workerPath;
    if (!workerPath) {
      try { workerPath = require.resolve('@otomix/workers/dist/decode-worker-entry.js'); }
      catch { resolve({ ok: false, error: 'DECODE_FAILED', message: 'worker entry not found' }); return; }
    }
    const w = new Worker(workerPath);
    const timer = setTimeout(() => { w.terminate(); resolve({ ok: false, error: 'TIMEOUT', message: 'decode exceeded timeout' }); }, deps.timeoutMs ?? 5 * 60 * 1000);
    w.once('message', (msg: any) => { clearTimeout(timer); w.terminate(); resolve(msg); });
    w.once('error', (err) => { clearTimeout(timer); w.terminate(); resolve({ ok: false, error: 'DECODE_FAILED', message: err.message }); });
    const copy = new Uint8Array(bytes.length); copy.set(bytes);
    w.postMessage({ bytes: copy, format }, [copy.buffer]);
  });
}