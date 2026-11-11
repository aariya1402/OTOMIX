import { describe, it, expect, beforeAll } from 'vitest';
import { OtomixWorkletProcessor } from '../../../packages/core/src/dsp/worklet-skeleton';
import { AllocatingProcessor } from '../fixtures/allocating-processor';
import { AdminTuningConfig } from '../../../packages/core/src/config/transition-config';

const ITERATIONS = 10_000;
const HEAP_DELTA_THRESHOLD_BYTES = 4096; // Allow 4KB for V8 internal noise

describe('RT-safety audit (P04-T03-S02-M01)', () => {
  let processor: OtomixWorkletProcessor;
  let inputs: Float32Array[][];
  let outputs: Float32Array[][];

  beforeAll(() => {
    const config: AdminTuningConfig = {
      chopGrid: 32,
      crossfadeBeats: 0.015625,
      rateMin: 0.98,
      rateMax: 1.02,
      swingThreshold: 0.05
    };
    processor = new OtomixWorkletProcessor(config, 128);

    const bufferSize = 128;
    const inputChannel = new Float32Array(bufferSize).fill(0.5);
    const outputChannel = new Float32Array(bufferSize).fill(0);
    inputs = [[inputChannel]];
    outputs = [[outputChannel]];
  });

  it('should allocate zero heap in process() over 10,000 calls', () => {
    // Check if global.gc is available (requires --expose-gc)
    if (typeof global.gc !== 'function') {
      throw new Error('global.gc is not available. Run vitest with NODE_OPTIONS="--expose-gc"');
    }

    // Warm-up
    for (let i = 0; i < 100; i++) {
      processor.process(inputs, outputs, i % 64, 16);
    }

    global.gc();
    const before = process.memoryUsage().heapUsed;

    for (let i = 0; i < ITERATIONS; i++) {
      processor.process(inputs, outputs, i % 64, 16);
    }

    const after = process.memoryUsage().heapUsed;
    const delta = after - before;

    expect(delta).toBeLessThanOrEqual(HEAP_DELTA_THRESHOLD_BYTES);
  });

  it('should detect >= 1 allocation in a deliberately allocating fixture', () => {
    if (typeof global.gc !== 'function') {
      throw new Error('global.gc is not available. Run vitest with NODE_OPTIONS="--expose-gc"');
    }

    const allocatingProcessor = new AllocatingProcessor();

    // Warm-up
    for (let i = 0; i < 100; i++) {
      allocatingProcessor.process(inputs, outputs);
    }

    global.gc();
    const before = process.memoryUsage().heapUsed;

    for (let i = 0; i < ITERATIONS; i++) {
      allocatingProcessor.process(inputs, outputs);
    }

    const after = process.memoryUsage().heapUsed;
    const delta = after - before;

    // It should allocate at least 10,000 * 128 * 4 bytes (~5MB)
    expect(delta).toBeGreaterThan(0);
  });

  it('should perform zero blocking operations in process()', () => {
    let atomicsWaitCalls = 0;
    const originalWait = Atomics.wait;
    
    // Instrument Atomics.wait
    Atomics.wait = (...args: any[]) => {
      atomicsWaitCalls++;
      return originalWait.apply(Atomics, args as [Int32Array, number, number]);
    };

    try {
      for (let i = 0; i < ITERATIONS; i++) {
        processor.process(inputs, outputs, i % 64, 16);
      }
    } finally {
      Atomics.wait = originalWait;
    }

    expect(atomicsWaitCalls).toBe(0);
  });
});