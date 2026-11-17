// OTOMIX §5.2 · Mother §1 · GAP-014
export type DecodeFormat = 'mp3' | 'wav' | 'flac' | 'unknown';
export interface DecodeValue { pcm: Float32Array; sampleRate: number; sha256: string; }
export type DecodeResult =
  | { ok: true; value: DecodeValue }
  | { ok: false; error: 'INVALID_ARGUMENT' | 'DECODE_FAILED' | 'TIMEOUT' | 'OOM'; message: string };

export function runDecodeWorkerLocal(bytes: Uint8Array, format: DecodeFormat, workerUrl: string): Promise<DecodeResult> {
  return new Promise((resolve) => {
    let w: Worker;
    try { w = new Worker(workerUrl, { type: 'module' }); }
    catch (err) { resolve({ ok: false, error: 'DECODE_FAILED', message: (err as Error).message }); return; }
    w.onmessage = (ev: MessageEvent) => { w.terminate(); resolve(ev.data as DecodeResult); };
    w.onerror = (ev) => { w.terminate(); resolve({ ok: false, error: 'DECODE_FAILED', message: String(ev.message) }); };
    const copy = new Uint8Array(bytes.length); copy.set(bytes);
    w.postMessage({ bytes: copy, format }, [copy.buffer]);
  });
}