// OTOMIX §8.1 · Histogram Metric (P05-T04-S01-M02)
//
// A simple in-memory histogram for tracking durations.
// Per Rule 26, values are recorded in beats.

export interface MetricRecord {
  readonly value: number; // duration in beats
  readonly timestamp: number;
}

export class Histogram {
  private readonly records: MetricRecord[] = [];

  record(value: number): void {
    this.records.push({ value, timestamp: Date.now() });
  }

  getRecords(): ReadonlyArray<MetricRecord> {
    return this.records;
  }

  getCount(): number {
    return this.records.length;
  }

  clear(): void {
    this.records.length = 0;
  }
}