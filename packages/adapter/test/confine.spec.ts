// OTOMIX §5.2 · Mother §1 · GAP-014
import { describe, it, expect } from 'vitest';
import { confineForLocal } from '../src/ingest/confine';

describe('confineForLocal (P07-T01-S02-M02)', () => {
  it('valid file handle -> ok', () => {
    const r = confineForLocal({ kind: 'file', name: 'track.wav' });
    expect(r.ok).toBe(true);
  });
  it('directory handle -> rejected', () => {
    const r = confineForLocal({ kind: 'directory', name: 'root' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('INVALID_ARGUMENT');
  });
  it('null handle -> rejected', () => {
    const r = confineForLocal(null as any);
    expect(r.ok).toBe(false);
  });
  it('injected warn called on reject', () => {
    const warnings: any[] = [];
    confineForLocal({ kind: 'directory', name: 'root' }, (w) => warnings.push(w));
    expect(warnings.length).toBe(1);
    expect(warnings[0].event).toBe('ingest.confine_rejected');
  });
});