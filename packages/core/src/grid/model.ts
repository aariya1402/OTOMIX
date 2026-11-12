// OTOMIX §3.1 · Mother §2.1
import { tOfI } from './t-of-i';
import { BPM } from '../types/bpm';

export interface GridSegment {
  startBeat: number;
  bpmSeed: number;
  T0: number;
  delta: number;  // drift in QUANTA (internal musical domain)
}

export type GridState = 'LOCKED' | 'RECOVERY';

export class GridModel {
  private segments: readonly GridSegment[];
  private state: GridState = 'LOCKED';

  constructor(segments: GridSegment[]) {
    if (segments.length === 0) throw new Error('GridModel requires at least one segment');
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].startBeat <= segments[i - 1].startBeat) {
        throw new Error('Segments must be strictly increasing by startBeat');
      }
    }
    this.segments = Object.freeze([...segments]);
  }

  getState(): GridState {
    return this.state;
  }

  enterRecovery(globalAverageBpm: number, T0: number): void {
    if (this.state === 'RECOVERY') return;

    const bpmResult = BPM.parse(globalAverageBpm);
    if (!bpmResult.ok) {
      throw new Error(`Invalid globalAverageBpm: ${globalAverageBpm}`);
    }

    const recoverySegment: GridSegment = {
      startBeat: 1,
      bpmSeed: bpmResult.value,
      T0,
      delta: 0,
    };

    this.segments = Object.freeze([recoverySegment]);
    this.state = 'RECOVERY';
  }

  t(i: number): number {
    const segment = this.findSegment(i);
    return tOfI(i as unknown as import('../types/beat-index').BeatIndex, segment.T0, segment.bpmSeed as unknown as import('../types/bpm').BPM, segment.delta);
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