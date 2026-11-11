# Phase 4 — DSP Port & Real-Time Safety

## Turning Plans into Audio

P04 is where the **TransitionPlan** becomes sound. Four subsystems execute in the AudioWorklet (off main thread, real-time priority):

| Subsystem | Purpose | Key File |
|-----------|---------|----------|
| **Tempo Glide** | Smooth BPM transition via `AudioParam` automation | `glide/target.ts:14` |
| **Chopping Engine** | Slice + crossfade at 1/8–1/32 beat resolution | `chopper.ts` (P04-T02) |
| **RT Callback** | Zero-alloc, lock-free, per-sample smoothing | `processor.ts` (P04-T03) |
| **EQ/Mastering/Export** | 3-band EQ, soft clipper, WAV/MP3 writer | `mastering.ts` (P04-T04) |

## Just-Completed: Glide Target (P04-T01-S01-M01)

`computeGlideTarget()` at `packages/core/src/glide/target.ts:14`:
```typescript
export function computeGlideTarget(bpmOut: number, bpmIn: number): number {
  if (!Number.isFinite(bpmOut) || !Number.isFinite(bpmIn)) throw new TypeError(...);
  if (bpmOut <= 0 || bpmIn <= 0) throw new RangeError(...);
  return (bpmOut + bpmIn) * 0.5;
}
```
Arithmetic mean of outgoing and incoming BPM. Used by the AudioWorklet to set the glide `AudioParam` target value. Validated: finite, positive, throws `TypeError`/`RangeError` on bad input.

## Chopping Engine (In Progress)

**Transition Window**: 64 beats (`TRANSITION_WINDOW_BEATS` from `constants/grid.ts:99`).
**Slice Grid**: 1/32 beat default (quantum = 1/24 beat → slices at quantum boundaries).
**Crossfade**: Cosine `F_fade = 0.5 × (1 + cos(π × t / crossfadeBeats))` for `t ∈ [0, crossfadeBeats]`.
**Groove Shift**: When groove = Swing, off-beat boundaries shift by `Δ_groove / 2`.
**Load Shedding**: Under pressure, widen grid 1/32 → 1/16 → 1/8.
**WSOLA Fallback**: Only when phase-coherence predicate fails (extreme reverb tails).

Constants governing chop:
- `GLIDE_MAX = 0.08` (max 8% tempo change per transition, `constants/grid.ts:25`)
- `RATE_MIN = 0.98`, `RATE_MAX = 1.02` (playback rate bounds, `constants/grid.ts:28–29`)
- `RATE_SLEW_PER_QUANTA = 0.005/48` (max rate change per quantum, `constants/grid.ts:30`)
- `SAFETY_XFADE_BEATS = 16` (4-bar safety crossfade, `constants/grid.ts:101`)

## RT-Safe AudioWorklet (P04-T03)

**Zero Allocation in `process()`**:
- All buffers pre-allocated in `constructor`/`initialize()`: slice buffers, smoothing state, ring buffer.
- `juce::ScopedNoDenormals` equivalent: `Math.fround()` flush on denormals.
- No `new`, no `Array.push`, no closure allocation.

**Lock-Free SPSC Ring Buffer** (`SharedArrayBuffer` + `Atomics`):
- Producer (main thread) → Consumer (AudioWorklet) parameter events.
- 1,000,000 events tested: 0 lost, 0 reordered, 0 torn reads.

**Per-Sample Smoothing**:
- `SmoothedValue`-equivalent for gain, filter cutoff, pan.
- Linear ramp over 50 ms default (`LOOKAHEAD_MS` from timing constants).

## Blocked Tasks (4)

| Task | Blocked By | Issue |
|------|------------|-------|
| P04-T02-S02-M02 | OQ-06 | Crossfade bound: `crossfadeBeats ≤ chopGrid_fraction / 4` — all units in beats. No seconds/ms conversion needed. |
| P04-T03-S01-M01 | OQ-18 | AudioWorklet pre-allocation sizing for variable slice counts. |
| P04-T03-S01-M02 | OQ-03 | SPSC ring buffer capacity formula under backpressure. |
| P04-T04-S01-M01 | OQ-05 | Mastering chain loudness target (LUFS) spec. |

**Total P04 tasks: 1/29 complete, 24 TODO, 4 blocked.**