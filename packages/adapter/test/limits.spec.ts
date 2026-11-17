// OTOMIX §5.2 · Mother §1 · GAP-014
import { describe, it, expect } from 'vitest';
import { checkLimitsForLocal } from '../src/ingest/limits';

function fakeBlob(size: number): Blob {
  // Duck-typed stub: preserves exact size for both OK and SIZE tests.
  // No allocation, works whether or not global Blob exists.
  return { size } as unknown as Blob;
}

describe('checkLimitsForLocal (P07-T01-S02-M01)', () => {
  it('valid blob + duration -> ok', () => {
    const blob = fakeBlob(1024);
    const r = checkLimitsForLocal(blob, 10, { maxBytes: 2048, maxDurationSec: 60 });
    expect(r.ok).toBe(true);
  });

  it('oversized blob -> SIZE reject', () => {
    const blob = fakeBlob(4096);
    const r = checkLimitsForLocal(blob, 10, { maxBytes: 1024, maxDurationSec: 60 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('SIZE');
  });

  it('over-duration -> DURATION reject', () => {
    const blob = fakeBlob(100);
    const r = checkLimitsForLocal(blob, 120, { maxBytes: 1024, maxDurationSec: 60 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('DURATION');
  });

  it('injected warn called on reject', () => {
    const warnings: any[] = [];
    const blob = fakeBlob(4096);
    checkLimitsForLocal(blob, 10, { maxBytes: 1024, maxDurationSec: 60 }, (w) => warnings.push(w));
    expect(warnings.length).toBe(1);
    expect(warnings[0].event).toBe('ingest.limit_exceeded');
    expect(warnings[0].reason).toBe('SIZE');
  });
});