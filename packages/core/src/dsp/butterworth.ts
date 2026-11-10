// OTOMIX §3.2 · Butterworth low-pass filter (cascaded biquads)
import { Biquad, BiquadCoeffs } from './biquad';

function biquadLowpass(fc: number, fs: number, q: number): BiquadCoeffs {
  const wc = 2 * Math.PI * fc / fs;
  const cosw = Math.cos(wc);
  const sinw = Math.sin(wc);
  const alpha = sinw / (2 * q);

  const b0 = (1 - cosw) / 2;
  const b1 = 1 - cosw;
  const b2 = (1 - cosw) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw;
  const a2 = 1 - alpha;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

export class CascadedButterworth {
  private readonly sections: Biquad[];
  constructor(order: number, fc: number, fs: number) {
    // Standard Butterworth pole angles
    const qs = order === 2 ? [Math.SQRT1_2] :
               order === 4 ? [0.54119610, 1.30656296] :
               order === 6 ? [0.51763809, 0.70710678, 1.93185165] :
               [0.54119610, 1.30656296];
    this.sections = qs.map(q => new Biquad(biquadLowpass(fc, fs, q)));
  }

  process(x: number): number {
    let y = x;
    for (const s of this.sections) y = s.process(y);
    return y;
  }

  reset(): void { this.sections.forEach(s => s.reset()); }
}