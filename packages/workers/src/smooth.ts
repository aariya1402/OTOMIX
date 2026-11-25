// @rt-safe
/**
 * P04-T03-S01-M03 - Per-sample one-pole smoother for audio-path parameters.
 * y[n] = y[n-1] + alpha * (x[n] - y[n-1])
 * alpha = 1 - exp(-1 / (tauSeconds * sampleRate))   (time constant is a parameter, never a literal)
 */

export class OnePoleSmoother {
  private readonly alpha: number;
  private value: number;

  constructor(sampleRate: number, timeConstantSeconds: number, initial: number = 0) {
    if (!(sampleRate > 0)) {
      throw new Error('OnePoleSmoother: sampleRate must be > 0');
    }
    if (!(timeConstantSeconds > 0)) {
      throw new Error('OnePoleSmoother: timeConstantSeconds must be > 0');
    }
    this.alpha = 1 - Math.exp(-1 / (timeConstantSeconds * sampleRate));
    this.value = initial;
  }

  public get current(): number {
    return this.value;
  }

  public step(target: number): number {
    this.value += this.alpha * (target - this.value);
    return this.value;
  }

  public reset(value: number): void {
    this.value = value;
  }
}
