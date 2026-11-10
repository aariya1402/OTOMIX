// OTOMIX §2.5; §9.3 · Mother §1; Add. §3; Add. §1–§2
import { describe, it, expect, vi } from 'vitest';
import { retry } from '../src/resilience/retry';

// Real timers with small delays. The spec's default (base=200, cap=5000)
// is covered by the same code path; we shrink the numbers to keep the test
// fast (<200ms) without touching setTimeout globally (which broke Vitest
// internals in an earlier attempt).

describe('retry', () => {
  it('idempotent=true: 4 total attempts, real delays applied', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    const t0 = Date.now();

    await expect(
      retry(fn, { idempotent: true, rng: () => 0.5, baseMs: 30, capMs: 1000 }),
    ).rejects.toThrow('boom');

    const elapsed = Date.now() - t0;
    expect(fn).toHaveBeenCalledTimes(4);
    // rng=0.5, base=30 → delays 15, 30, 60 ms ≈ 105 ms (+ timer granularity).
    // Assert a lower bound to prove delays actually happened, and an upper
    // bound to catch hangs.
    expect(elapsed).toBeGreaterThanOrEqual(80);
    expect(elapsed).toBeLessThan(2000);
  });

  it('idempotent=false: exactly 1 attempt, no delay', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    const t0 = Date.now();

    await expect(
      retry(fn, { idempotent: false }),
    ).rejects.toThrow('boom');

    const elapsed = Date.now() - t0;
    expect(fn).toHaveBeenCalledTimes(1);
    expect(elapsed).toBeLessThan(100);
  });
});