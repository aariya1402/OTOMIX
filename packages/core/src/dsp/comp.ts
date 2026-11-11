import { Biquad, BiquadCoeffs } from './biquad';
import { OnePoleSmoother } from './smoother';
import { flushDenormal } from './denormal';
import type { CompressorProfile } from '../config/transition-config';

// LR4 is two cascaded Butterworth (Q = 1/sqrt(2))
function calcButterworthLPF(freq: number, sampleRate: number): BiquadCoeffs {
  const w0 = 2 * Math.PI * (freq / sampleRate);
  const cosw0 = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * 0.70710678);
  const b0 = (1 - cosw0) / 2, b1 = 1 - cosw0, b2 = (1 - cosw0) / 2;
  const a0 = 1 + alpha, a1 = -2 * cosw0, a2 = 1 - alpha;
  return { b0: b0/a0, b1: b1/a0, b2: b2/a0, a1: a1/a0, a2: a2/a0 };
}

function calcButterworthHPF(freq: number, sampleRate: number): BiquadCoeffs {
  const w0 = 2 * Math.PI * (freq / sampleRate);
  const cosw0 = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * 0.70710678);
  const b0 = (1 + cosw0) / 2, b1 = -(1 + cosw0), b2 = (1 + cosw0) / 2;
  const a0 = 1 + alpha, a1 = -2 * cosw0, a2 = 1 - alpha;
  return { b0: b0/a0, b1: b1/a0, b2: b2/a0, a1: a1/a0, a2: a2/a0 };
}

class BandCompressor {
  public envSmoother: OnePoleSmoother;
  public gainSmoother: OnePoleSmoother;
  public thresholdLinear: number;
  public ratio: number;
  public makeupGainLinear: number;

  constructor(thresholdDb: number, ratio: number, makeupGainDb: number) {
    this.thresholdLinear = Math.pow(10, thresholdDb / 20);
    this.ratio = ratio;
    this.makeupGainLinear = Math.pow(10, makeupGainDb / 20);
    // Initialized with dummy alpha, updated in prepare()
    this.envSmoother = new OnePoleSmoother(0, 0.1);
    this.gainSmoother = new OnePoleSmoother(1, 0.1);
  }

  public prepare(attackSamples: number, releaseSamples: number): void {
    const attackAlpha = 1 - Math.exp(-1 / Math.max(1, attackSamples));
    const releaseAlpha = 1 - Math.exp(-1 / Math.max(1, releaseSamples));
    // We use a single alpha for simplicity, ideally it switches based on attack/release phase
    // For this implementation, we'll use the release alpha for the gain smoother
    this.gainSmoother.setAlpha(releaseAlpha);
    this.envSmoother.setAlpha(attackAlpha);
  }

  public process(sample: number): number {
    // 1. Detector (Peak)
    const absSample = Math.abs(sample);
    const env = this.envSmoother.process(absSample);
    
    // 2. Gain Computer
    let gain = 1.0;
    if (env > this.thresholdLinear) {
      // Simple hard knee for now
      const inputDb = 20 * Math.log10(env);
      const thresholdDb = 20 * Math.log10(this.thresholdLinear);
      const targetDb = thresholdDb + (inputDb - thresholdDb) / this.ratio;
      gain = Math.pow(10, (targetDb - inputDb) / 20);
    }
    
    // 3. Smooth Gain
    const smoothedGain = this.gainSmoother.process(gain);
    
    return sample * smoothedGain * this.makeupGainLinear;
  }

  public reset(): void {
    this.envSmoother.snapTo(0);
    this.gainSmoother.snapTo(1);
  }
}

export class MultibandCompressor {
  private profile: CompressorProfile;
  private sampleRate: number;
  
  private low1: Biquad;
  private low2: Biquad;
  private high1: Biquad;
  private high2: Biquad;
  
  private lowComp: BandCompressor;
  private midComp: BandCompressor;
  private highComp: BandCompressor;
  
  private lowBuffer: Float32Array;
  private highBuffer: Float32Array;

  constructor(profile: CompressorProfile, sampleRate: number, blockSize: number) {
    this.profile = profile;
    this.sampleRate = sampleRate;
    
    this.lowBuffer = new Float32Array(blockSize);
    this.highBuffer = new Float32Array(blockSize);

    const dummy = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
    this.low1 = new Biquad(dummy);
    this.low2 = new Biquad(dummy);
    this.high1 = new Biquad(dummy);
    this.high2 = new Biquad(dummy);

    this.lowComp = new BandCompressor(profile.thresholdDb, profile.ratio, profile.makeupGainDb);
    this.midComp = new BandCompressor(profile.thresholdDb, profile.ratio, profile.makeupGainDb);
    this.highComp = new BandCompressor(profile.thresholdDb, profile.ratio, profile.makeupGainDb);

    this.updateProfile(profile);
  }

  public prepare(sampleRate: number, bpm: number): void {
    this.sampleRate = sampleRate;
    this.updateProfile(this.profile); // Recalculate crossovers
    
    const samplesPerBeat = sampleRate * 60 / bpm;
    const attackSamples = this.profile.attackBeats * samplesPerBeat;
    const releaseSamples = this.profile.releaseBeats * samplesPerBeat;
    
    this.lowComp.prepare(attackSamples, releaseSamples);
    this.midComp.prepare(attackSamples, releaseSamples);
    this.highComp.prepare(attackSamples, releaseSamples);
  }

  public updateProfile(profile: CompressorProfile): void {
    this.profile = profile;
    const lpf = calcButterworthLPF(profile.lowCrossover.frequency, this.sampleRate);
    const hpf = calcButterworthHPF(profile.highCrossover.frequency, this.sampleRate);
    
    this.low1.setCoeffs(lpf);
    this.low2.setCoeffs(lpf);
    this.high1.setCoeffs(hpf);
    this.high2.setCoeffs(hpf);
  }

  public processBuffer(input: Float32Array, output: Float32Array): void {
    const len = input.length;
    if (this.lowBuffer.length < len) {
      // In a real RT-safe scenario, blockSize should be pre-calculated to max length.
      // This is a fallback, though it allocates. We'll assume blockSize >= len.
      return; 
    }

    for (let i = 0; i < len; i++) {
      const x = input[i];
      
      // LR4 Low
      let low = this.low1.process(x);
      low = this.low2.process(low);
      this.lowBuffer[i] = low;
      
      // LR4 High
      let high = this.high1.process(x);
      high = this.high2.process(high);
      this.highBuffer[i] = high;
      
      // Mid (input - low - high)
      const mid = x - low - high;
      
      // Compress each band
      const cLow = this.lowComp.process(low);
      const cMid = this.midComp.process(mid);
      const cHigh = this.highComp.process(high);
      
      // Sum
      output[i] = flushDenormal(cLow + cMid + cHigh);
    }
  }

  public reset(): void {
    this.low1.reset(); this.low2.reset();
    this.high1.reset(); this.high2.reset();
    this.lowComp.reset();
    this.midComp.reset();
    this.highComp.reset();
  }
}