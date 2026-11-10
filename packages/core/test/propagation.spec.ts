// OTOMIX §8.2 · Mother §9.1; Add. §7
import { describe, it, expect } from 'vitest';
import {
  inject,
  extract,
  newChildSpan,
  newRootSpan,
  parseTraceparent,
  formatTraceparent,
  TraceContext,
} from '../src/telemetry/propagation';

const TRACE_ID = 'a'.repeat(32);
const ROOT_SPAN = 'b'.repeat(16);
const CHILD_SPAN = 'c'.repeat(16);

function makeRoot(): TraceContext {
  return {
    version: '00',
    traceId: TRACE_ID,
    spanId: ROOT_SPAN,
    parentId: null,
    flags: '01',
  };
}

describe('W3C traceparent propagation (P01-T08-S01-M02)', () => {
  it('propagates through postMessage and creates child span', () => {
    const root = makeRoot();

    // Inject into postMessage envelope
    const envelope: { traceparent?: string; data: unknown } = { data: { foo: 'bar' } };
    inject(envelope, root);
    expect(envelope.traceparent).toBe(`00-${TRACE_ID}-${ROOT_SPAN}-01`);

    // Extract on the other side
    const extracted = extract(envelope);
    expect(extracted).not.toBeNull();
    expect(extracted!.traceId).toBe(TRACE_ID);
    expect(extracted!.parentId).toBe(ROOT_SPAN);
    expect(extracted!.flags).toBe('01');
    expect(extracted!.version).toBe('00');

    // Create child span: NEW spanId, parent = ROOT_SPAN
    const child = newChildSpan(extracted!, () => CHILD_SPAN);
    expect(child.traceId).toBe(TRACE_ID);          // same trace
    expect(child.parentId).toBe(ROOT_SPAN);        // original as parent
    expect(child.spanId).toBe(CHILD_SPAN);         // NEW span id
    expect(child.spanId).not.toBe(root.spanId);    // definitely different
    expect(child.flags).toBe('01');
    expect(child.version).toBe('00');
  });

  it('round-trips a canonical traceparent', () => {
    const canonical = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const parsed = parseTraceparent(canonical);
    expect(parsed).not.toBeNull();
    const formatted = formatTraceparent({
      version: parsed!.version,
      traceId: parsed!.traceId,
      spanId: parsed!.parentId,  // wire format field
      flags: parsed!.flags,
    });
    expect(formatted).toBe(canonical);
  });

  it('rejects malformed traceparent', () => {
    expect(parseTraceparent('garbage')).toBeNull();
    expect(parseTraceparent('')).toBeNull();
    expect(parseTraceparent('00')).toBeNull();
    expect(parseTraceparent('00-zzzz')).toBeNull();
    // all-zero trace_id
    expect(parseTraceparent(`00-${'0'.repeat(32)}-${ROOT_SPAN}-01`)).toBeNull();
    // all-zero parent_id
    expect(parseTraceparent(`00-${TRACE_ID}-${'0'.repeat(16)}-01`)).toBeNull();
    // missing flags
    expect(parseTraceparent(`00-${TRACE_ID}-${ROOT_SPAN}`)).toBeNull();
    // extra fields
    expect(parseTraceparent(`00-${TRACE_ID}-${ROOT_SPAN}-01-extra`)).toBeNull();
  });

  it('injects and extracts via REST headers', () => {
    const root = makeRoot();
    const headers: Record<string, string> = {};
    inject(headers, root);
    expect(headers.traceparent).toBe(`00-${TRACE_ID}-${ROOT_SPAN}-01`);

    const extracted = extract(headers);
    expect(extracted).not.toBeNull();
    expect(extracted!.traceId).toBe(TRACE_ID);
    expect(extracted!.parentId).toBe(ROOT_SPAN);
  });

  it('works with gRPC Metadata-style carrier (string[] values)', () => {
    const root = makeRoot();
    const metadata: { traceparent?: string[] } = { traceparent: [`00-${TRACE_ID}-${ROOT_SPAN}-01`] };
    const extracted = extract(metadata);
    expect(extracted).not.toBeNull();
    expect(extracted!.traceId).toBe(TRACE_ID);
    expect(extracted!.parentId).toBe(ROOT_SPAN);
  });

  it('newRootSpan generates non-null parent', () => {
    const root = newRootSpan(
      () => TRACE_ID,
      () => ROOT_SPAN,
    );
    expect(root.version).toBe('00');
    expect(root.traceId).toBe(TRACE_ID);
    expect(root.spanId).toBe(ROOT_SPAN);
    expect(root.parentId).toBeNull();
    expect(root.flags).toBe('01');
  });
});