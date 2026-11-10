// OTOMIX §3.9 · Mother §2.9 — P03-IT: beat-based phase integration
// RULE: Every assertion is beat-centric.
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { planTransition } from '../src/transition/planner';
import { computeTransitionAnchors, TrackGridParams } from '../src/transition/anchors';
import { TransitionRung } from '../src/transition/types';
import { extractAttackGrid } from '../src/grid/attack';
import { STATIC_GRID_BPM, TRANSITION_WINDOW_BEATS, SAMPLE_RATE } from '../src/constants/grid';

const VALID_RUNGS: readonly TransitionRung[] = [
  'RUNG_NONE',
  'RUNG_GLOBAL_AVG_BPM',
  'RUNG_STATIC_120_GRID',
  'RUNG_FOUR_BAR_CROSSFADE',
  'RUNG_SILENT_LOOP',
  'RUNG_STANDARD_CROSSFADE',
  'RUNG_WSOLA_LEGACY',
];

const makeTrack = (overrides: Partial<TrackGridParams> = {}): TrackGridParams => ({
  T0: 0.25,
  bpmSeed: 120,
  duration: 100,
  hasKick: true,
  preKickBeats: 0,
  ...overrides,
});

const beatsToSeconds = (beats: number, bpm: number): number => beats * (60 / bpm);
const beatPeriod = (bpm: number): number => 60 / bpm;
const totalBeats = (track: TrackGridParams): number =>
  Math.floor(track.duration / beatPeriod(track.bpmSeed));

describe('P03-IT: Phase 3 Integration Test Suite (beat-based)', () => {

  it('P03-IT-1: RUNG_NONE preserves integer beat index and exact 64-beat window', () => {
    const incoming = makeTrack({ T0: 1.0, bpmSeed: 120, duration: 180, hasKick: true });
    const outgoing = makeTrack({ T0: 0.25, bpmSeed: 120, duration: 200 });

    const plan = planTransition(incoming, outgoing);
    expect(plan.rung).toBe('RUNG_NONE');

    const bpOut = beatPeriod(outgoing.bpmSeed);
    const totalOut = totalBeats(outgoing);

    expect(Number.isInteger(plan.outBeatIndex)).toBe(true);
    expect(Number.isInteger(plan.inBeatIndex)).toBe(true);
    expect(plan.outBeatIndex).toBe(totalOut - TRANSITION_WINDOW_BEATS + 1);
    expect(plan.outBeatIndex + (TRANSITION_WINDOW_BEATS - 1)).toBe(totalOut);

    const derivedT = outgoing.T0 + (plan.outBeatIndex - 1) * bpOut;
    expect(plan.tOutSeconds).toBeCloseTo(derivedT, 9);
    expect((plan.tOutSeconds - outgoing.T0) / bpOut + 1).toBe(plan.outBeatIndex);
  });

  it('P03-IT-2: RUNG_STATIC_120_GRID preserves integer beat grid while remapping BPM', () => {
    const incoming = makeTrack({ T0: 1.0, bpmSeed: 124, duration: 180, hasKick: false });
    const outgoing = makeTrack({ T0: 0.25, bpmSeed: 120, duration: 200 });

    const plan = planTransition(incoming, outgoing);
    expect(plan.rung).toBe('RUNG_STATIC_120_GRID');
    expect(plan.mappedBpm).toBe(STATIC_GRID_BPM);

    expect(Number.isInteger(plan.outBeatIndex)).toBe(true);
    expect(Number.isInteger(plan.inBeatIndex)).toBe(true);

    const bpOut = beatPeriod(outgoing.bpmSeed);
    expect((plan.tOutSeconds - outgoing.T0) / bpOut + 1).toBe(plan.outBeatIndex);
    expect(plan.outBeatIndex + (TRANSITION_WINDOW_BEATS - 1)).toBe(totalBeats(outgoing));
  });

  it('P03-IT-3: RUNG_SILENT_LOOP pads to exactly 64 beats (padding + real == 64)', () => {
    const incoming = makeTrack({ T0: 10, bpmSeed: 100, duration: 200, hasKick: true });
    const outgoing = makeTrack({ T0: 0, bpmSeed: 120, duration: beatsToSeconds(10, 120) });

    const plan = planTransition(incoming, outgoing);
    expect(plan.rung).toBe('RUNG_SILENT_LOOP');
    expect(plan.paddingBeats).toBeDefined();
    expect(Number.isInteger(plan.paddingBeats)).toBe(true);
    expect(Number.isInteger(plan.outBeatIndex)).toBe(true);
    expect(plan.outBeatIndex).toBe(1);

    const realBeats = totalBeats(outgoing);
    expect(realBeats + (plan.paddingBeats as number)).toBe(TRANSITION_WINDOW_BEATS);
  });

  it('P03-IT-4: Boundary 63/64/65 beats produce beat-exact rung windows', () => {
    const incoming = makeTrack({ T0: 10, bpmSeed: 100, duration: 200, hasKick: true });
    const BPM = 120;

    const out63 = makeTrack({ duration: beatsToSeconds(63, BPM), bpmSeed: BPM });
    const out64 = makeTrack({ duration: beatsToSeconds(64, BPM), bpmSeed: BPM });
    const out65 = makeTrack({ duration: beatsToSeconds(65, BPM), bpmSeed: BPM });

    const p63 = planTransition(incoming, out63);
    expect(p63.rung).toBe('RUNG_SILENT_LOOP');
    expect(p63.paddingBeats).toBe(1);
    expect(Number.isInteger(p63.outBeatIndex)).toBe(true);

    const p64 = planTransition(incoming, out64);
    expect(p64.rung).toBe('RUNG_NONE');
    expect(p64.outBeatIndex).toBe(1);

    const p65 = planTransition(incoming, out65);
    expect(p65.rung).toBe('RUNG_NONE');
    expect(p65.outBeatIndex).toBe(2);
  });

  it('P03-IT-5: RUNG_FOUR_BAR_CROSSFADE returns beat-1 anchors at STATIC_GRID_BPM', () => {
    const incoming = makeTrack({ T0: 0, bpmSeed: NaN, duration: 100, hasKick: true });
    const outgoing = makeTrack({ T0: 0, bpmSeed: 120, duration: 100 });

    const plan = planTransition(incoming, outgoing);
    expect(plan.rung).toBe('RUNG_FOUR_BAR_CROSSFADE');

    expect(plan.inBeatIndex).toBe(1);
    expect(plan.outBeatIndex).toBe(1);
    expect(Number.isInteger(plan.inBeatIndex)).toBe(true);
    expect(Number.isInteger(plan.outBeatIndex)).toBe(true);
    expect(plan.mappedBpm).toBe(STATIC_GRID_BPM);
    expect(plan.tInSeconds).toBe(0);
    expect(plan.tOutSeconds).toBe(0);
    expect(plan.alignToSeconds).toBe(0);
  });

  it('P03-IT-6: synthetic PCM kicks -> beat-quantized attack peaks', () => {
    // SAMPLE_RATE = 44100 (confirmed by diagnostic); samplesPerBeat at 120 BPM = 22050
    const BPM = 120;
    const NUM_BEATS = 8;
    const samplesPerBeat = SAMPLE_RATE * (60 / BPM);
    const totalSamples = Math.round(samplesPerBeat * NUM_BEATS);

    const pcm = new Float32Array(totalSamples);
    for (let k = 1; k < NUM_BEATS; k++) {
      const idx = Math.round(k * samplesPerBeat);
      if (idx >= 1 && idx + 1 < totalSamples) {
        pcm[idx - 1] = 0.5;
        pcm[idx] = 1.0;
        pcm[idx + 1] = 0.5;
      }
    }

    // FIX: pass SAMPLE_RATE as 2nd arg (signature: extractAttackGrid(pcm, sampleRate))
    const attackPeaks = extractAttackGrid(pcm, SAMPLE_RATE);

    expect(attackPeaks.length).toBeGreaterThan(0);
    const peaksArr = Array.from(attackPeaks as ArrayLike<number>);
    expect(peaksArr.every(p => Number.isFinite(p) && p >= 0)).toBe(true);

    // BEAT-BASED assertion: consecutive peaks must be ≈ samplesPerBeat apart (≈ 1 beat)
    const sorted = peaksArr.slice().sort((a, b) => a - b);
    if (sorted.length >= 2) {
      for (let i = 1; i < sorted.length; i++) {
        const gapInBeats = (sorted[i] - sorted[i - 1]) / samplesPerBeat;
        const nearestIntBeat = Math.round(gapInBeats);
        expect(nearestIntBeat).toBeGreaterThanOrEqual(1);
        expect(Math.abs(gapInBeats - nearestIntBeat)).toBeLessThan(0.1);
      }
    }

    // Chain into planner: peaks -> TrackGridParams -> plan, beat indices remain integers
    const derivedTrack = makeTrack({
      T0: 0,
      bpmSeed: BPM,
      duration: sorted.length * beatPeriod(BPM),
      hasKick: true,
    });
    const plan = planTransition(makeTrack(), derivedTrack);
    expect(Number.isInteger(plan.outBeatIndex)).toBe(true);
    expect(Number.isInteger(plan.inBeatIndex)).toBe(true);
  });

  it('P03-IT-7: anchors -> plan preserves integer beat indices (chain consistency)', () => {
    const incoming = makeTrack({ T0: 1.0, bpmSeed: 120, duration: 180, hasKick: true });
    const outgoing = makeTrack({ T0: 0.25, bpmSeed: 120, duration: 200 });

    const anchors = computeTransitionAnchors(incoming, outgoing);
    const plan = planTransition(incoming, outgoing);

    expect(Number.isInteger(anchors.inBeatIndex)).toBe(true);
    expect(Number.isInteger(anchors.outBeatIndex)).toBe(true);

    expect(plan.inBeatIndex).toBe(anchors.inBeatIndex);
    expect(plan.outBeatIndex).toBe(anchors.outBeatIndex);
    expect(plan.tInSeconds).toBeCloseTo(anchors.tInSeconds, 9);
    expect(plan.tOutSeconds).toBeCloseTo(anchors.tOutSeconds, 9);

    const bpOut = beatPeriod(outgoing.bpmSeed);
    const bpIn = beatPeriod(incoming.bpmSeed);
    expect((plan.tOutSeconds - outgoing.T0) / bpOut + 1).toBe(plan.outBeatIndex);
    expect((plan.tInSeconds - incoming.T0) / bpIn + 1).toBe(plan.inBeatIndex);
  });

  it('P03-IT-8: Chaos inputs -> every plan keeps integer beat indices', () => {
    const chaosTrack = fc.record<TrackGridParams>({
      T0: fc.oneof(fc.double({ min: -1e6, max: 1e6, noNaN: true, noInfinity: true }), fc.constant(NaN), fc.constant(Infinity), fc.constant(-Infinity)),
      bpmSeed: fc.oneof(fc.double({ min: 0.1, max: 500, noNaN: true, noInfinity: true }), fc.constant(NaN), fc.constant(Infinity), fc.constant(-Infinity), fc.constant(0), fc.constant(-120)),
      duration: fc.oneof(fc.double({ min: 0, max: 3600, noNaN: true, noInfinity: true }), fc.constant(NaN), fc.constant(Infinity), fc.constant(-Infinity), fc.constant(0)),
      hasKick: fc.option(fc.boolean(), { nil: undefined }),
      preKickBeats: fc.option(fc.integer({ min: -100, max: 100 }), { nil: undefined }),
    });

    let violations = 0;
    fc.assert(
      fc.property(chaosTrack, chaosTrack, (incoming, outgoing) => {
        try {
          const plan = planTransition(incoming, outgoing);
          if (!VALID_RUNGS.includes(plan.rung)) violations++;
          if (!Number.isInteger(plan.inBeatIndex)) violations++;
          if (!Number.isInteger(plan.outBeatIndex)) violations++;
          if (plan.rung === 'RUNG_FOUR_BAR_CROSSFADE') {
            if (plan.inBeatIndex !== 1 || plan.outBeatIndex !== 1) violations++;
            if (plan.mappedBpm !== STATIC_GRID_BPM) violations++;
          }
        } catch {
          violations++;
        }
      }),
      { numRuns: 100, seed: 42 }
    );
    expect(violations).toBe(0);
  }, 30000);
});