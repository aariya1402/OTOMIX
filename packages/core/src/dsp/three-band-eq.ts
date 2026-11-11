import { Biquad, BiquadCoeffs } from './biquad';
import type { EqProfile } from '../config/transition-config';

/**
 * RBJ Audio EQ Cookbook formulas for calculating Biquad coefficients.
 */
function calcPeakingCoeffs(freq: number, gainDb: number, q: number, sampleRate: number): BiquadCoeffs {
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * (freq / sampleRate);
  const alpha = Math.sin(w0) / (2 * q);

  const b0 = 1 + alpha * A;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha / A;

  return { b0: b0/a0, b1: b1/a0, b2: b2/a0, a1: a1/a0, a2: a2/a0 };
}

function calcLowShelfCoeffs(freq: number, gainDb: number, q: number, sampleRate: number): BiquadCoeffs {
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * (freq / sampleRate);
  const alpha = Math.sin(w0) / (2 * q);
  const cosw0 = Math.cos(w0);
  const sqrtA = Math.sqrt(A);

  const b0 = A * ((A + 1) - (A - 1) * cosw0 + 2 * sqrtA * alpha);
  const b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
  const b2 = A * ((A + 1) - (A - 1) * cosw0 - 2 * sqrtA * alpha);
  const a0 = (A + 1) + (A - 1) * cosw0 + 2 * sqrtA * alpha;
  const a1 = -2 * ((A - 1) + (A + 1) * cosw0);
  const a2 = (A + 1) + (A - 1) * cosw0 - 2 * sqrtA * alpha;

  return { b0: b0/a0, b1: b1/a0, b2: b2/a0, a1: a1/a0, a2: a2/a0 };
}

function calcHighShelfCoeffs(freq: number, gainDb: number, q: number, sampleRate: number): BiquadCoeffs {
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * (freq / sampleRate);
  const alpha = Math.sin(w0) / (2 * q);
  const cosw0 = Math.cos(w0);
  const sqrtA = Math.sqrt(A);

  const b0 = A * ((A + 1) + (A - 1) * cosw0 + 2 * sqrtA * alpha);
  const b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
  const b2 = A * ((A + 1) + (A - 1) * cosw0 - 2 * sqrtA * alpha);
  const a0 = (A + 1) - (A - 1) * cosw0 + 2 * sqrtA * alpha;
  const a1 = 2 * ((A - 1) - (A + 1) * cosw0);
  const a2 = (A + 1) - (A - 1) * cosw0 - 2 * sqrtA * alpha;

  return { b0: b0/a0, b1: b1/a0, b2: b2/a0, a1: a1/a0, a2: a2/a0 };
}

/**
 * Three-band EQ processor.
 * Uses cascaded Biquads (Low Shelf, Peaking, High Shelf).
 * Rule 23: Zero allocations in the process loop.
 * Rule 26: Works on frequency and amplitude, no internal time.
 */
export class ThreeBandEq {
  private lowBand: Biquad;
  private midBand: Biquad;
  private highBand: Biquad;

  constructor(profile: EqProfile, sampleRate: number) {
    this.lowBand = new Biquad(calcLowShelfCoeffs(profile.low.frequency, profile.low.gainDb, profile.low.q, sampleRate));
    this.midBand = new Biquad(calcPeakingCoeffs(profile.mid.frequency, profile.mid.gainDb, profile.mid.q, sampleRate));
    this.highBand = new Biquad(calcHighShelfCoeffs(profile.high.frequency, profile.high.gainDb, profile.high.q, sampleRate));
  }

  /**
   * Processes the buffer in-place using the 3 cascaded biquads.
   * Zero allocations inside the loop.
   */
  public processBuffer(buffer: Float32Array): void {
    for (let i = 0; i < buffer.length; i++) {
      let sample = buffer[i];
      sample = this.lowBand.process(sample);
      sample = this.midBand.process(sample);
      sample = this.highBand.process(sample);
      buffer[i] = sample;
    }
  }

  public reset(): void {
    this.lowBand.reset();
    this.midBand.reset();
    this.highBand.reset();
  }
}