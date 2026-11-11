import { describe, it, expect } from 'vitest';
import { TIMING_CONSTANTS } from '../src/constants/timing';

describe('Timing Constants', () => {
  it('should have all values correctly defined', () => {
    expect(TIMING_CONSTANTS.LOOKAHEAD_MS).toBe(50);
    expect(TIMING_CONSTANTS.SCHED_ACCURACY_MS).toBe(2);
    expect(TIMING_CONSTANTS.DRIFT_THRESHOLD_QUANTA).toBe(0.192);
    expect(TIMING_CONSTANTS.STARVATION_FRAME_MS).toBe(10);
    expect(TIMING_CONSTANTS.BUFFER_NORMAL).toBe(2048);
    expect(TIMING_CONSTANTS.BUFFER_DEGRADED).toBe(4096);
    expect(TIMING_CONSTANTS.PORT_BUFFER_SAMPLES).toBe(1024);
    expect(TIMING_CONSTANTS.PORT_LATENCY_MS).toBe(10);
    expect(TIMING_CONSTANTS.ANALYSIS_TIMEOUT_MS).toBe(5000);
    expect(TIMING_CONSTANTS.EXTRACTION_ALERT_MS).toBe(2500);
    expect(TIMING_CONSTANTS.OBSERVER_CYCLE_MS).toBe(1);
  });

  it('should be frozen', () => {
    expect(Object.isFrozen(TIMING_CONSTANTS)).toBe(true);
  });
});
