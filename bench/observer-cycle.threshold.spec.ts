// OTOMIX §3.6 · Mother §2.6
import { describe, it, expect, beforeAll } from 'vitest';
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
const P99_THRESHOLD_MS = 1.0;

let states: DeckState[];

beforeAll(() => {
  const cpu = os.cpus()[0];
  console.log(`[THRESHOLD RUNNER] platform=${os.platform()} arch=${os.arch()} cpu="${cpu.model}" cores=${os.cpus().length}`);
  states = [
    { gridTime: 10.000, contextTime: 10.0035, rate: 1.0, bufferSize: 2048, beatOffset: 0 },
    { gridTime: 10.001, contextTime: 10.0045, rate: 1.0, bufferSize: 2048, beatOffset: 0 },
    { gridTime: 10.002, contextTime: 10.0055, rate: 1.0, bufferSize: 2048, beatOffset: 0 },
    { gridTime: 10.003, contextTime: 10.0065, rate: 1.0, bufferSize: 2048, beatOffset: 0 },
  ];
});

describe('Observer Cycle P99 Threshold (P03-T04-S01-M04)', () => {
  it('P99 latency < 1 ms per cycle over 100k cycles (4 decks)', () => {
    const durationsNs: bigint[] = new Array(CYCLES);

    for (let cycle = 0; cycle < CYCLES; cycle++) {
      const start = process.hrtime.bigint();
      for (let d = 0; d < DECKS; d++) {
        const s = states[d];
        const drift = computeDrift(s.gridTime, s.contextTime, 120);
        s.rate = computeNextRate(s.rate, drift, DT, 120);
        const buf = computeBufferSize(s.bufferSize, FRAME_TIME_MS);
        s.bufferSize = buf.bufferSize;
        s.gridTime += DT;
        s.contextTime += DT * s.rate;
        if (s.beatOffset < OBSERVER_REALIGN_BEATS) s.beatOffset++;
        logRealign(s.beatOffset, DELTA_PHI);
      }
      durationsNs[cycle] = process.hrtime.bigint() - start;
    }

    // Sort by duration
    durationsNs.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    const p99Index = Math.floor(CYCLES * 0.99);
    const p99Ns = Number(durationsNs[p99Index]);
    const p99Ms = p99Ns / 1e6;

    const minMs = Number(durationsNs[0]) / 1e6;
    const maxMs = Number(durationsNs[CYCLES - 1]) / 1e6;
    const meanMs = durationsNs.reduce((acc, v) => acc + Number(v), 0) / CYCLES / 1e6;

    console.log(`[P99 RESULT] p99=${p99Ms.toFixed(6)} ms (threshold=${P99_THRESHOLD_MS} ms)`);
    console.log(`[STATS] min=${minMs.toFixed(6)} mean=${meanMs.toFixed(6)} max=${maxMs.toFixed(6)} ms`);

    expect(p99Ms).toBeLessThan(P99_THRESHOLD_MS);
  });
});