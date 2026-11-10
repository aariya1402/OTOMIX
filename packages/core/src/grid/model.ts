// OTOMIX §3.1 · Mother §2.1
import { tOfI } from './t-of-i';

export interface GridSegment {
  startBeat: number;
  bpmSeed: number;
  T0: number;
  delta: number;
}

export class GridModel {
  private readonly segments: GridSegment[];

  constructor(segments: GridSegment[]) {
    if (segments.length === 0) throw new Error('GridModel requires at least one segment');
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].startBeat <= segments[i - 1].startBeat) {
        throw new Error('Segments must be strictly increasing by startBeat');
      }
    }
    this.segments = Object.freeze([...segments]);
  }

  t(i: number): number {
    const segment = this.findSegment(i);
    return tOfI(i, segment.T0, segment.bpmSeed, segment.delta);
  }

  private findSegment(i: number): GridSegment {
    let lo = 0, hi = this.segments.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.segments[mid].startBeat <= i) lo = mid + 1;
      else hi = mid - 1;
    }
    return this.segments[hi];
  }
}