// OTOMIX §3.6 · Mother §2.6
import { bench, describe, beforeAll } from 'vitest';
import * as os from 'os';
import { computeDrift } from '../packages/core/src/observer/drift';
import { computeNextRate } from '../packages/core/src/observer/scale';
import { computeBufferSize } from '../packages/core/src/observer/degrade';
import { logRealign, OBSERVER_REALIGN_BEATS } from '../packages/core/src/observer/realign-log';

interface DeckState {
  gridTime: number;
  contextTime: number;
  rate: number;
  bufferSize: number;
  beatOffset: number;
}

const DECKS = 4;
const CYCLES = 100000;
const DT = 1 / 60;
const FRAME_TIME_MS = 5;
const DELTA_PHI = 40;

let states: DeckState[];

beforeAll(() => {
  const cpu = os.cpus()[0];
  console.log(`[BENCH RUNNER] platform=${os.platform()} arch=${os.arch()} cpu="${cpu.model}" cores=${os.cpus().length}`);
  states = [
    { gridTime: 10.000, contextTime: 10.0035, rate: 1.0, bufferSize: 2048, beatOffset: 0 },
    { gridTime: 10.001, contextTime: 10.0045, rate: 1.0, bufferSize: 2048, beatOffset: 0 },
    { gridTime: 10.002, contextTime: 10.0055, rate: 1.0, bufferSize: 2048, beatOffset: 0 },
    { gridTime: 10.003, contextTime: 10.0065, rate: 1.0, bufferSize: 2048, beatOffset: 0 },
  ];
});

describe('Observer Cycle Benchmark (4 decks x 100k cycles)', () => {
  bench('4 decks x 100k cycles', () => {
    for (let cycle = 0; cycle < CYCLES; cycle++) {
      for (let d = 0; d < DECKS; d++) {
        const s = states[d];
        const driftQuanta = computeDrift(s.gridTime, s.contextTime, 120);
        s.rate = computeNextRate(s.rate, driftQuanta, DT, 120);
        const buf = computeBufferSize(s.bufferSize, FRAME_TIME_MS);
        s.bufferSize = buf.bufferSize;
        s.gridTime += DT;
        s.contextTime += DT * s.rate;
        if (s.beatOffset < OBSERVER_REALIGN_BEATS) s.beatOffset++;
        logRealign(s.beatOffset, DELTA_PHI);
      }
    }
  });
});