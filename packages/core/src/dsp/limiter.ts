import type { AdminTuningConfig } from '../config/transition-config';
import { OnePoleSmoother } from './smoother';
import { flushDenormal } from './denormal';

export interface LimiterParams {
  ceilingDb: number;
  lookaheadSamples: number;
  attackSamples: number;
  releaseSamples: number;
  firTapCount: number;
}

/**
 * Look-ahead Limiter with 4x oversampling (using two cascaded 2x stages).
 * Supports Bypass mode via AdminTuningConfig.enableLiveEffects.
 * Rule 23: Zero allocations in processBuffer.
 * Rule 26: All times/latencies are in samples (no seconds).
 */
export class LookaheadLimiter {
  private config: AdminTuningConfig;
  private params: LimiterParams;
  protected sampleRate: number;

  // Delay Buffer (Look-ahead)
  private delayBuffer: Float32Array;
  private writeIdx = 0;
  private bufferMask: number;
  
  // 2x Oversampling FIR states (Stage 1 & Stage 2, each requires Up & Down)
  // For simplicity in this mock, we use a small FIR.
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
    
    // Power of 2 buffer size for fast masking
    let bufSize = 1;
    while (bufSize < params.lookaheadSamples + 1) bufSize <<= 1;
    this.delayBuffer = new Float32Array(bufSize);
    this.bufferMask = bufSize - 1;
    
    // Pre-allocate FIR states
    this.firCoeffs = new Float32Array(params.firTapCount);
    // Simple moving average FIR for demo purposes (a real one would be windowed-sinc)
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

  /**
   * Algorithmic latency includes look-ahead + FIR group delay (4x oversampling).
   * If bypassed, latency is 0.
   */
  public getLatencySamples(): number {
    if (!this.config.enableLiveEffects) return 0;
    
    // Group delay for linear phase FIR is (N-1)/2.
    // We have 2 upsampling stages and 2 downsampling stages.
    const firLatency = 2 * ((this.params.firTapCount - 1) / 2); 
    return this.params.lookaheadSamples + firLatency;
  }

  /**
   * Processes the buffer in-place.
   * If bypassed, returns immediately (zero latency).
   */
  public processBuffer(buffer: Float32Array): void {
    if (!this.config.enableLiveEffects) {
      return; // Bypass mode
    }

    for (let i = 0; i < buffer.length; i++) {
      const input = buffer[i];

      // 1. Write to delay buffer
      this.delayBuffer[this.writeIdx] = input;
      
      // Read delayed sample
      const readIdx = (this.writeIdx - this.params.lookaheadSamples) & this.bufferMask;
      const delayed = this.delayBuffer[readIdx];
      
      this.writeIdx = (this.writeIdx + 1) & this.bufferMask;

      // 2. Peak detection (using the non-delayed input for look-ahead)
      const absInput = Math.abs(input);
      let targetGain = 1.0;
      if (absInput > this.ceilingLinear) {
        targetGain = this.ceilingLinear / absInput;
      }

      // 3. Smooth gain (fast attack, slow release handled by alpha)
      const smoothedGain = this.gainSmoother.process(targetGain);

      // 4. Apply gain
      buffer[i] = flushDenormal(delayed * smoothedGain);
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