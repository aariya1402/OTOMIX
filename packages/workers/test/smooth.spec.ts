import { describe, it, expect } from 'vitest';
import { OnePoleSmoother } from '../src/smooth';

describe('OnePoleSmoother (P04-T03-S01-M03)', () => {
  it('step 0 -> 1 at 44.1kHz with 20ms tau: monotonic, ~0.632 at 20ms +-2%, no jump > 0.05', () => {
    const sampleRate = 44_100;
    const tau = 0.020;
    const smoother = new OnePoleSmoother(sampleRate, tau, 0);

    const samplesAtTau = Math.round(tau * sampleRate);
    const totalSamples = samplesAtTau * 5;

    let prev = smoother.current;
    let maxJump = 0;
    let monotonic = true;
    let valueAtTau = 0;

    for (let i = 1; i <= totalSamples; i++) {
      const v = smoother.step(1);
      const jump = Math.abs(v - prev);
      if (jump > maxJump) { maxJump = jump; }
      if (v < prev - 1e-12) { monotonic = false; }
      if (i === samplesAtTau) { valueAtTau = v; }
      prev = v;
    }

    // 0.632 at tau, within +-2%
    expect(valueAtTau).toBeGreaterThan(0.632 * 0.98);
    expect(valueAtTau).toBeLessThan(0.632 * 1.02);
    // monotonic non-decreasing
    expect(monotonic).toBe(true);
    // no sample-to-sample jump above 0.05
    expect(maxJump).toBeLessThanOrEqual(0.05);
  });

  it('time constant is a parameter, not a literal', () => {
    const fast = new OnePoleSmoother(44_100, 0.001, 0);
    const slow = new OnePoleSmoother(44_100, 0.100, 0);
    for (let i = 0; i < 100; i++) { fast.step(1); slow.step(1); }
    expect(fast.current).toBeGreaterThan(slow.current);
  });
});