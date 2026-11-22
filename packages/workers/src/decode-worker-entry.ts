import { parentPort } from 'node:worker_threads';
import { decodeAll, type DecodeFormat } from './decode.js';

interface DecodeWorkerRequest {
  bytes?: Uint8Array;
  format?: DecodeFormat;
  trace_id?: string;
  span_id?: string;
}

const port = parentPort;
if (!port) {
  throw new Error('decode worker requires a worker_threads parent port');
}

port.on('message', async (request: DecodeWorkerRequest) => {
  if (!(request.bytes instanceof Uint8Array) || !request.format) {
    port.postMessage({
      ok: false,
      error: 'INVALID_ARGUMENT',
      message: 'bytes and format are required',
    });
    return;
  }

  try {
    const result = await decodeAll(
      request.bytes,
      request.format,
      request.trace_id ?? 'decode-worker',
      request.span_id ?? 'decode-worker',
    );
    port.postMessage(result);
  } catch (error) {
    port.postMessage({
      ok: false,
      error: 'DECODE_FAILED',
      message: error instanceof Error ? error.message : 'decode worker failed',
    });
  }
});
