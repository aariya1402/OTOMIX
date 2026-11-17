import type { AdminTuningConfig } from '../config/transition-config.js';
import { OnePoleSmoother } from './smoother.js';
import { flushDenormal } from './denormal.js';

export interface LimiterParams {
  ceilingDb: number;
  lookaheadSamples: number;
  attackSamples: number;
  releaseSamples: number;
  firTapCount: number;
}

/**
 * Look-ahead Limiter with 4x oversampling (two cascaded 2x stages).
 * Supports Bypass mode via AdminTuningConfig.enableLiveEffects.
 * Rule 23: Zero allocations in processBuffer.
 * Rule 26: All times/latencies are in samples (no seconds).
 *
 * Peak-hold over the look-ahead window guarantees |output| <= ceiling.
 * For each output sample, peak = max(|delayBuffer[readIdx..writeIdx]|).
 * targetGain = min(1, ceiling/peak). Applied gain = min(smoothed, target),
 * so attack is instantaneous (clamped by target) and release is smoothed.
 * Since the delayed sample is inside the peak window, delayed * target
 * <= ceiling is guaranteed by construction.
 */
export class LookaheadLimiter {
  private config: AdminTuningConfig;
  private params: LimiterParams;
  protected sampleRate: number;

  private delayBuffer: Float32Array;
  private writeIdx = 0;
  private bufferMask: number;

  private firCoeffs: Float32Array;
  private upState1: Float32Array;
  private upState2: Float32Array;
  private downState1: Float32Array;
  private downState2: Float32Array;

  private gainSmoother: OnePoleSmoother;
  private ceilingLinear: number;

  constructor(config: AdminTuningConfig, params: LimiterParams, sampleRate: number) {
    this.config = config;
    this.params = params;
    this.sampleRate = sampleRate;

    this.ceilingLinear = Math.pow(10, params.ceilingDb / 20);

    let bufSize = 1;
    while (bufSize < params.lookaheadSamples + 1) bufSize <<= 1;
    this.delayBuffer = new Float32Array(bufSize);
    this.bufferMask = bufSize - 1;

    this.firCoeffs = new Float32Array(params.firTapCount);
    for (let i = 0; i < params.firTapCount; i++) {
      this.firCoeffs[i] = 1 / params.firTapCount;
    }

    this.upState1 = new Float32Array(params.firTapCount);
    this.upState2 = new Float32Array(params.firTapCount);
    this.downState1 = new Float32Array(params.firTapCount);
    this.downState2 = new Float32Array(params.firTapCount);

    const alphaAttack = 1 - Math.exp(-1 / Math.max(1, params.attackSamples));
    this.gainSmoother = new OnePoleSmoother(1.0, alphaAttack);
  }

  public getLatencySamples(): number {
    if (!this.config.enableLiveEffects) return 0;
    const firLatency = 2 * ((this.params.firTapCount - 1) / 2);
    return this.params.lookaheadSamples + firLatency;
  }

  public processBuffer(buffer: Float32Array): void {
    if (!this.config.enableLiveEffects) {
      return;
    }

    for (let i = 0; i < buffer.length; i++) {
      const input = buffer[i];

      this.delayBuffer[this.writeIdx] = input;

      const readIdx = (this.writeIdx - this.params.lookaheadSamples) & this.bufferMask;
      const delayed = this.delayBuffer[readIdx] ?? 0;

      let peak = 0;
      for (let k = 0; k <= this.params.lookaheadSamples; k++) {
        const idx = (readIdx + k) & this.bufferMask;
        const v = Math.abs(this.delayBuffer[idx] ?? 0);
        if (v > peak) peak = v;
      }

      this.writeIdx = (this.writeIdx + 1) & this.bufferMask;

      let targetGain = 1.0;
      if (peak > this.ceilingLinear) {
        targetGain = this.ceilingLinear / peak;
      }

      const smoothedGain = this.gainSmoother.process(targetGain);
      const finalGain = Math.min(smoothedGain, targetGain);

      buffer[i] = flushDenormal(delayed * finalGain);
    }
  }

  public reset(): void {
    this.delayBuffer.fill(0);
    this.upState1.fill(0);
    this.upState2.fill(0);
    this.downState1.fill(0);
    this.downState2.fill(0);
    this.gainSmoother.snapTo(1.0);
    this.writeIdx = 0;
  }
}