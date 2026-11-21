import { describe, it, expect } from 'vitest';
import { attachPreviewObserver } from '../src/preview/observer-bridge';

describe('P08-T06-S01-M02 preview observer bridge', () => {
  it('switches to degraded buffer and starvation state at 12 ms', () => {
    const observer = attachPreviewObserver(2048);
    const state = observer.observe(12);
    expect(state.bufferSize).toBe(4096);
    expect(state.starvation).toBe(true);
    expect(state.degraded).toBe(true);
  });
});
