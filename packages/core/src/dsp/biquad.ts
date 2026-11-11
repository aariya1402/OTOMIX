// OTOMIX §3.2 · Generic biquad filter (Direct Form II)
export interface BiquadCoeffs {
  b0: number; b1: number; b2: number;
  a1: number; a2: number;
}

export class Biquad {
  private z1 = 0;
  private z2 = 0;
  private c: BiquadCoeffs;

  constructor(c: BiquadCoeffs) {
    this.c = c;
  }

  public setCoeffs(c: BiquadCoeffs): void {
    this.c = c;
  }

  process(x: number): number {
    const y = this.c.b0 * x + this.z1;
    this.z1 = this.c.b1 * x - this.c.a1 * y + this.z2;
    this.z2 = this.c.b2 * x - this.c.a2 * y;
    return y;
  }

  reset(): void { this.z1 = 0; this.z2 = 0; }
}