// OTOMIX §3.6 · Mother §2.6
import { describe, it, expect } from 'vitest';
import { computeDrift } from '../src/observer/drift';
import { QUANTUM_DIVISOR } from '../src/constants/grid';

describe('computeDrift (P03-T04-S01-M01)', () => {
  const BPM = 120;
  const quantumSec = (60 / BPM) / QUANTUM_DIVISOR;  // ~0.0208333s

  it('primary case: context 3.5ms ahead of grid -> 0.168 quanta', () => {
    const result = computeDrift(10.000, 10.0035, BPM);
    expect(result).toBeCloseTo(0.0035 / quantumSec, 6);
  });

  it('negative drift when context is behind grid -> -0.096 quanta', () => {
    const result = computeDrift(10.000, 9.998, BPM);
    expect(result).toBeCloseTo(-0.002 / quantumSec, 6);
  });

  it('zero drift when context matches grid', () => {
    expect(computeDrift(10.000, 10.000, BPM)).toBeCloseTo(0, 9);
  });

  it('scales with BPM: same seconds drift -> different quanta', () => {
    const result60 = computeDrift(0, 0.01, 60);
    const result120 = computeDrift(0, 0.01, 120);
    expect(result120).toBeCloseTo(2 * result60, 6);
  });

  it('throws on non-positive BPM', () => {
    expect(() => computeDrift(0, 0.01, 0)).toThrow(RangeError);
    expect(() => computeDrift(0, 0.01, -120)).toThrow(RangeError);
  });
});