import { Biquad, BiquadCoeffs } from './biquad';
import type { EqProfile } from '../config/transition-config';

function calcPeakingCoeffs(freq: number, gainDb: number, q: number, sampleRate: number): BiquadCoeffs {
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * (freq / sampleRate);
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = 1 + alpha * A, b1 = -2 * Math.cos(w0), b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A, a1 = -2 * Math.cos(w0), a2 = 1 - alpha / A;
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

export class ThreeBandEq {
  private lowBand: Biquad;
  private midBand: Biquad;
  private highBand: Biquad;
  private profile: EqProfile;
  private sampleRate: number;

  constructor(profile: EqProfile, sampleRate: number) {
    this.profile = profile;
    this.sampleRate = sampleRate;
    
    // Initialize with dummy coeffs, then recalculate
    const dummy = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
    this.lowBand = new Biquad(dummy);
    this.midBand = new Biquad(dummy);
    this.highBand = new Biquad(dummy);
    
    this.recalculate();
  }

  /**
   * Re-calculates coefficients without allocating new Biquad objects (Rule 23).
   */
  private recalculate(): void {
    this.lowBand.setCoeffs(calcLowShelfCoeffs(this.profile.low.frequency, this.profile.low.gainDb, this.profile.low.q, this.sampleRate));
    this.midBand.setCoeffs(calcPeakingCoeffs(this.profile.mid.frequency, this.profile.mid.gainDb, this.profile.mid.q, this.sampleRate));
    this.highBand.setCoeffs(calcHighShelfCoeffs(this.profile.high.frequency, this.profile.high.gainDb, this.profile.high.q, this.sampleRate));
  }

  /**
   * Re-derives coefficients on sample-rate change (Zero allocation).
   */
  public setSampleRate(sampleRate: number): void {
    this.sampleRate = sampleRate;
    this.recalculate();
  }

  /**
   * Updates profile dynamically.
   */
  public updateProfile(profile: EqProfile): void {
    this.profile = profile;
    this.recalculate();
  }

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