// OTOMIX 5.1; 5.2; 5.3 - Mother 1 - GAP-014
// Local twin of POST /api/v1/ingest/local. UI-facing function, no HTTP, no DB.
// Deps injected so the orchestration is testable without coupling to wrapper signatures.

export interface LocalIngestInput {
  bytes: Uint8Array;
  filename: string;
  durationSeconds?: number;
}

export interface LocalIngestResult {
  format: string;
  sampleRate: number;
  pcm: Float32Array;
  sha256: string;
  durationMs: number;
  displayMetadata: Record<string, unknown>;
}

export interface LocalIngestDeps {
  sniff: (
    bytes: Uint8Array,
    filename: string,
    ctx: { trace_id: string; span_id: string },
  ) => { format: string };
  checkLimits: (input: { size: number; durationSeconds?: number }) => void;
  decode: (
    bytes: Uint8Array,
    format: string,
  ) => Promise<
    | { ok: true; value: { pcm: Float32Array; sampleRate: number; sha256: string } }
    | { ok: false; message: string }
  >;
  extractTags: (
    bytes: Uint8Array,
    format: string,
    ctx: { trace_id: string; span_id: string },
  ) => { displayMetadata: Record<string, unknown> };
}

export class LocalIngestError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'LocalIngestError';
  }
}

function newId(): string {
  const chars = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) {
    s += chars[Math.floor(Math.random() * 16)];
  }
  return s;
}

export async function ingestLocal(
  input: LocalIngestInput,
  deps: LocalIngestDeps,
): Promise<LocalIngestResult> {
  const traceId = newId();
  const spanId = newId();

  const sniffed = deps.sniff(input.bytes, input.filename, {
    trace_id: traceId,
    span_id: spanId,
  });
  if (sniffed.format === 'unknown') {
    throw new LocalIngestError('INVALID_ARGUMENT', 'Unsupported audio format');
  }

  deps.checkLimits({ size: input.bytes.length, ...(input.durationSeconds !== undefined ? { durationSeconds: input.durationSeconds } : {}) });

  const decoded = await deps.decode(input.bytes, sniffed.format);
  if (!decoded.ok) {
    throw new LocalIngestError('INVALID_ARGUMENT', decoded.message);
  }

  const tags = deps.extractTags(input.bytes, sniffed.format, {
    trace_id: traceId,
    span_id: spanId,
  });

  const durationMs = Math.round((decoded.value.pcm.length / decoded.value.sampleRate) * 1000);

  return {
    format: sniffed.format,
    sampleRate: decoded.value.sampleRate,
    pcm: decoded.value.pcm,
    sha256: decoded.value.sha256,
    durationMs,
    displayMetadata: tags.displayMetadata,
  };
}