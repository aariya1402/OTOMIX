import { describe, it, expect, beforeEach } from 'vitest';
import { Histogram } from '../src/metrics/histogram';
import { isExtractionDurationCritical } from '../src/metrics/alert';

describe('Extraction Duration Metric (P05-T04-S01-M02)', () => {
  let histogram: Histogram;

  beforeEach(() => {
    histogram = new Histogram();
  });

  it('T1: records 2499 ms at 120 BPM as non-critical', () => {
    const durationMs = 2499;
    const bpm = 120;
    histogram.record(4.998); // approx beats
    expect(histogram.getCount()).toBe(1);
    expect(isExtractionDurationCritical(durationMs, bpm)).toBe(false);
  });

  it('T2: records 2501 ms at 120 BPM as critical', () => {
    const durationMs = 2501;
    const bpm = 120;
    histogram.record(5.002); // approx beats
    expect(histogram.getCount()).toBe(1);
    expect(isExtractionDurationCritical(durationMs, bpm)).toBe(true);
  });

  it('T3: threshold boundary — exactly 2500 ms at 120 BPM is not critical', () => {
    expect(isExtractionDurationCritical(2500, 120)).toBe(false);
  });

  it('T4: dynamic BPM conversion (2501 ms at 60 BPM is critical)', () => {
    // At 60 BPM, 2500 ms = 2.5 beats (threshold). 2501 ms = 2.501 beats.
    expect(isExtractionDurationCritical(2501, 60)).toBe(true);
  });
});