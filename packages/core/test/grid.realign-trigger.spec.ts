// OTOMIX §3.2 · Mother §2.2
import { describe, it, expect } from 'vitest';
import { shouldTriggerRealign } from '../src/grid/realign-trigger';
import { BODY_REALIGN_DBFS } from '../src/constants/grid';

describe('shouldTriggerRealign (P03-T03-S01-M01)', () => {
  it('trigger fires only when RMS is strictly below -40 dBFS', () => {
    const results = [
      shouldTriggerRealign(-35),
      shouldTriggerRealign(-39.9),
      shouldTriggerRealign(-40.1),
    ];

    const trueCount = results.filter(r => r).length;
    expect(trueCount).toBe(1);
    expect(results[0]).toBe(false);
    expect(results[1]).toBe(false);
    expect(results[2]).toBe(true);
  });

  it('exactly -40 dBFS does NOT trigger (strict comparison)', () => {
    expect(shouldTriggerRealign(BODY_REALIGN_DBFS)).toBe(false);
    expect(BODY_REALIGN_DBFS).toBe(-40);
  });

  it('values far below threshold trigger', () => {
    expect(shouldTriggerRealign(-50)).toBe(true);
    expect(shouldTriggerRealign(-60)).toBe(true);
    expect(shouldTriggerRealign(-100)).toBe(true);
  });

  it('values at or above threshold do not trigger', () => {
    expect(shouldTriggerRealign(-39.999)).toBe(false);
    expect(shouldTriggerRealign(-30)).toBe(false);
    expect(shouldTriggerRealign(0)).toBe(false);
  });
});