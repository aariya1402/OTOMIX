// OTOMIX 4.4; 4.7 - GOTCHA-005
import { describe, it, expect } from 'vitest';
import { buildZeroVocalMap, tryBuildVocalMap } from '../src/vocal/fallback';

describe('vocal fallback (P05-T03-S01-M03)', () => {
  it('buildZeroVocalMap returns zeroed map with the flag set', () => {
    const r = buildZeroVocalMap(10, 'test reason');
    expect(r.vMap.length).toBe(10);
    expect(r.vMap.every((v) => v === 0)).toBe(true);
    expect(r.vocalMapAssumedZero).toBe(true);
    expect(r.reason).toBe('test reason');
  });

  it('tryBuildVocalMap returns loader output when loader succeeds', async () => {
    const r = await tryBuildVocalMap(3, async () => new Float32Array([0, 1, 0]));
    expect(r.vocalMapAssumedZero).toBe(false);
    expect(Array.from(r.vMap)).toEqual([0, 1, 0]);
  });

  it('tryBuildVocalMap falls back on loader rejection', async () => {
    const r = await tryBuildVocalMap(4, async () => {
      throw new Error('TF_LOAD_FAILED');
    });
    expect(r.vocalMapAssumedZero).toBe(true);
    expect(r.vMap.length).toBe(4);
    expect(r.vMap.every((v) => v === 0)).toBe(true);
    expect(r.reason).toContain('TF_LOAD_FAILED');
  });

  it('buildZeroVocalMap rejects negative frame count', () => {
    expect(() => buildZeroVocalMap(-1, 'x')).toThrow();
  });
});