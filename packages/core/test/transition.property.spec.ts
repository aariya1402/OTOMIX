// OTOMIX §3.9; §10.1 · Mother §2.9; §8.1; Add. §5
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { planTransition } from '../src/transition/planner';
import { TransitionRung } from '../src/transition/types';
import { TrackGridParams } from '../src/transition/anchors';

const VALID_RUNGS: readonly TransitionRung[] = [
  'RUNG_NONE',
  'RUNG_GLOBAL_AVG_BPM',
  'RUNG_STATIC_120_GRID',
  'RUNG_FOUR_BAR_CROSSFADE',
  'RUNG_SILENT_LOOP',
  'RUNG_STANDARD_CROSSFADE',
  'RUNG_WSOLA_LEGACY',
];

const normalTrack = fc.record<TrackGridParams>({
  T0: fc.double({ min: -10, max: 1000, noNaN: true, noInfinity: true }),
  bpmSeed: fc.double({ min: 60, max: 200, noNaN: true, noInfinity: true }),
  duration: fc.double({ min: 1, max: 600, noNaN: true, noInfinity: true }),
  hasKick: fc.option(fc.boolean(), { nil: undefined }),
  preKickBeats: fc.option(fc.integer({ min: -100, max: 100 }), { nil: undefined }),
});

const chaosTrack = fc.record<TrackGridParams>({
  T0: fc.oneof(
    fc.double({ min: -1e6, max: 1e6, noNaN: true, noInfinity: true }),
    fc.constant(NaN),
    fc.constant(Infinity),
    fc.constant(-Infinity)
  ),
  bpmSeed: fc.oneof(
    fc.double({ min: 0.1, max: 500, noNaN: true, noInfinity: true }),
    fc.constant(NaN),
    fc.constant(Infinity),
    fc.constant(-Infinity),
    fc.constant(0),
    fc.constant(-120)
  ),
  duration: fc.oneof(
    fc.double({ min: 0, max: 3600, noNaN: true, noInfinity: true }),
    fc.constant(NaN),
    fc.constant(Infinity),
    fc.constant(-Infinity),
    fc.constant(0)
  ),
  hasKick: fc.option(fc.boolean(), { nil: undefined }),
  preKickBeats: fc.option(fc.integer({ min: -100, max: 100 }), { nil: undefined }),
});

function checkProperty(
  incoming: TrackGridParams,
  outgoing: TrackGridParams
): { exceptions: number; invalidRung: number; nonFinite: number } {
  const counters = { exceptions: 0, invalidRung: 0, nonFinite: 0 };
  try {
    const plan = planTransition(incoming, outgoing);
    if (!VALID_RUNGS.includes(plan.rung)) counters.invalidRung++;
    if (!Number.isFinite(plan.alignToSeconds) || !Number.isFinite(plan.mappedBpm)) counters.nonFinite++;
  } catch {
    counters.exceptions++;
  }
  return counters;
}

describe('Universal Transition Guarantee — Property-Based (P03-T06-S01-M07)', () => {
  it('normal pairings: 10,000 cases, zero exceptions (seed 42)', () => {
    const total = { exceptions: 0, invalidRung: 0, nonFinite: 0 };
    fc.assert(
      fc.property(normalTrack, normalTrack, (incoming, outgoing) => {
        const r = checkProperty(incoming, outgoing);
        total.exceptions += r.exceptions;
        total.invalidRung += r.invalidRung;
        total.nonFinite += r.nonFinite;
      }),
      { numRuns: 10000, seed: 42 }
    );
    expect(total.exceptions).toBe(0);
    expect(total.invalidRung).toBe(0);
    expect(total.nonFinite).toBe(0);
  }, 120000);

  it('chaos pairings: 10,000 cases, zero exceptions (seed 42)', () => {
    const total = { exceptions: 0, invalidRung: 0, nonFinite: 0 };
    fc.assert(
      fc.property(chaosTrack, chaosTrack, (incoming, outgoing) => {
        const r = checkProperty(incoming, outgoing);
        total.exceptions += r.exceptions;
        total.invalidRung += r.invalidRung;
        total.nonFinite += r.nonFinite;
      }),
      { numRuns: 10000, seed: 42 }
    );
    expect(total.exceptions).toBe(0);
    expect(total.invalidRung).toBe(0);
    expect(total.nonFinite).toBe(0);
  }, 120000);

  it('REVIEW CHECKPOINT: chaos pairings, seed 43, zero exceptions', () => {
    const total = { exceptions: 0, invalidRung: 0, nonFinite: 0 };
    fc.assert(
      fc.property(chaosTrack, chaosTrack, (incoming, outgoing) => {
        const r = checkProperty(incoming, outgoing);
        total.exceptions += r.exceptions;
        total.invalidRung += r.invalidRung;
        total.nonFinite += r.nonFinite;
      }),
      { numRuns: 10000, seed: 43 }
    );
    expect(total.exceptions).toBe(0);
    expect(total.invalidRung).toBe(0);
    expect(total.nonFinite).toBe(0);
  }, 120000);
});