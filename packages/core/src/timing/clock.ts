// OTOMIX §3.3 · Clock abstraction for injected time source
export interface Clock {
  /** Current time in seconds */
  now(): number;
}

/** Default implementation using performance.now() */
export class PerformanceClock implements Clock {
  now(): number {
    return performance.now() / 1000;
  }
}