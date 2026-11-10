// OTOMIX §8.2 · Mother §9.1; Add. §7
// W3C Trace Context propagation for REST, gRPC, and postMessage.
import { randomBytes } from 'node:crypto';

export interface TraceContext {
  version: string;      // 2 hex
  traceId: string;      // 32 hex
  spanId: string;       // 16 hex (my own span)
  parentId: string | null; // 16 hex (my parent's span, null if root)
  flags: string;        // 2 hex
}

export interface ExtractedContext {
  version: string;
  traceId: string;
  parentId: string;     // the caller's span ID (my parent)
  flags: string;
}

export interface Carrier {
  traceparent?: string | string[];
  [key: string]: string | string[] | undefined;
}

const TRACEPARENT_REGEX = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const ZERO_TRACE = '0'.repeat(32);
const ZERO_SPAN = '0'.repeat(16);

function defaultTraceRng(): string {
  return randomBytes(16).toString('hex');
}

function defaultSpanRng(): string {
  return randomBytes(8).toString('hex');
}

export function generateTraceId(rng: () => string = defaultTraceRng): string {
  for (let i = 0; i < 16; i++) {
    const id = rng();
    if (/^[0-9a-f]{32}$/.test(id) && id !== ZERO_TRACE) return id;
  }
  throw new Error('generateTraceId: rng did not produce a valid 32-hex non-zero ID');
}

export function generateSpanId(rng: () => string = defaultSpanRng): string {
  for (let i = 0; i < 16; i++) {
    const id = rng();
    if (/^[0-9a-f]{16}$/.test(id) && id !== ZERO_SPAN) return id;
  }
  throw new Error('generateSpanId: rng did not produce a valid 16-hex non-zero ID');
}

export function parseTraceparent(header: string): ExtractedContext | null {
  const match = TRACEPARENT_REGEX.exec(header);
  if (!match) return null;
  const [, version, traceId, parentId, flags] = match;
  if (traceId === ZERO_TRACE || parentId === ZERO_SPAN) return null;
  return { version, traceId, parentId, flags };
}

export function formatTraceparent(ctx: { version: string; traceId: string; spanId: string; flags: string }): string {
  return `${ctx.version}-${ctx.traceId}-${ctx.spanId}-${ctx.flags}`;
}

function getHeader(carrier: Carrier): string | undefined {
  const v = carrier.traceparent;
  if (Array.isArray(v)) return v[0];
  return v;
}

export function inject(carrier: Carrier, ctx: TraceContext): void {
  // The wire format's parent_id field carries MY span ID (I am the parent of the receiver).
  carrier.traceparent = formatTraceparent({
    version: ctx.version,
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    flags: ctx.flags,
  });
}

export function extract(carrier: Carrier): ExtractedContext | null {
  const header = getHeader(carrier);
  if (!header) return null;
  return parseTraceparent(header);
}

export function newChildSpan(parent: ExtractedContext, spanRng: () => string = defaultSpanRng): TraceContext {
  return {
    version: parent.version,
    traceId: parent.traceId,
    spanId: generateSpanId(spanRng),
    parentId: parent.parentId,
    flags: parent.flags,
  };
}

export function newRootSpan(
  traceRng: () => string = defaultTraceRng,
  spanRng: () => string = defaultSpanRng,
  flags = '01',
): TraceContext {
  return {
    version: '00',
    traceId: generateTraceId(traceRng),
    spanId: generateSpanId(spanRng),
    parentId: null,
    flags,
  };
}