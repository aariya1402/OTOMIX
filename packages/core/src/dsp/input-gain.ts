import type { AdminTuningConfig } from '../config/transition-config';
import { OnePoleSmoother } from './smoother';
import { flushDenormal } from './denormal';

export interface GainNormalizerParams {
  targetLufs: number;
}

/**
 * Normalizes input gain based on loudness_ebu128.
 * Operates at the very beginning of the DSP chain.
 * Rule 23: Zero allocation in process loop.
 * Rule 26: Pure amplitude, no time involved.
 */
export class GainNormalizer {
  private config: AdminTuningConfig;
  private targetLufs: number;
  private gainLinear: number;
  private gainSmoother: OnePoleSmoother;

  constructor(config: AdminTuningConfig, params: GainNormalizerParams, currentLufs: number) {
    this.config = config;
    this.targetLufs = params.targetLufs;
    
    const gainDb = this.targetLufs - currentLufs;
    this.gainLinear = Math.pow(10, gainDb / 20);
    
    // Pre-allocate smoother (fast attack for quick startup)
    this.gainSmoother = new OnePoleSmoother(this.gainLinear, 0.01);
    this.gainSmoother.snapTo(this.gainLinear);
  }

  public getLatencySamples(): number {
    return 0; // Pure gain, zero latency
  }

  public processBuffer(buffer: Float32Array): void {
    if (!this.config.enableLiveEffects) {
      return; // Bypass mode
    }

    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = flushDenormal(buffer[i] * this.gainSmoother.process(this.gainLinear));
    }
  }

  public reset(): void {
    this.gainSmoother.snapTo(this.gainLinear);
  }
}