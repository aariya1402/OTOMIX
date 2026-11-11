/**
 * One-pole exponential smoother for audio parameters.
 * Prevents zipper noise and clicks when a parameter changes rapidly.
 * 
 * Rule 23: Zero allocation during process(). Pure primitive math.
 */
export class OnePoleSmoother {
  private currentValue: number;
  private alpha: number;

  constructor(initialValue: number, alpha: number = 0.1) {
    if (alpha <= 0 || alpha > 1) {
      throw new RangeError('alpha must be between 0 (exclusive) and 1 (inclusive)');
    }
    this.currentValue = initialValue;
    this.alpha = alpha;
  }

  public setAlpha(alpha: number): void {
    if (alpha <= 0 || alpha > 1) {
      throw new RangeError('alpha must be between 0 (exclusive) and 1 (inclusive)');
    }
    this.alpha = alpha;
  }

  /**
   * Processes the next target value and returns the smoothed value.
   * y[n] = y[n-1] + alpha * (x[n] - y[n-1])
   * 
   * @param target - the desired parameter value
   * @returns the smoothed parameter value
   */
  public process(target: number): number {
    this.currentValue = this.currentValue + this.alpha * (target - this.currentValue);
    return this.currentValue;
  }

  public getCurrentValue(): number {
    return this.currentValue;
  }
  
  /**
   * Instantly jumps to the target value (bypasses smoothing).
   * Useful for initialization or when switching tracks.
   */
  public snapTo(value: number): void {
    this.currentValue = value;
  }
}