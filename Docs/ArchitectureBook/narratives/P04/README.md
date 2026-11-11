# Phase 4 — DSP Port & Real-Time Safety

P04 is where the `TransitionPlan` becomes sound. It executes the transition plans produced by P03 through the actual audio engine: tempo-glide automation, the Transition Window Chopping Engine, real-time-safe DSP infrastructure, and the EQ-Mastering-Exports port. All callback code follows the no-lock/no-allocation/no-syscall real-time contract (Rule 23), and all musical time is expressed in beats only (Rule 26).

## Why P04 Exists

P04 bridges the gap between high-level musical planning and low-level audio output. P02/P03 build grids, anchors, drift correction, and transition plans; P04 renders those plans into sample-accurate audio. It delivers:

- **Tempo-glide automation** — smooth BPM transitions between outgoing and incoming tracks.
- **Transition Window Chopping Engine** — slice-and-crossfade at 1/8–1/32 beat resolution inside the 64-beat transition window.
- **Real-time-safe audio callback** — zero allocation, lock-free parameter passing, per-sample smoothing, denormal flushing.
- **DSP port (EQ–Mastering–Exports)** — 3-band EQ, multiband compression, 4×-oversampled look-ahead limiter, gain normalization, WAV/MP3 export, and a degraded-mode standard crossfade safety net.

## Major Capabilities

### Tempo Glide Automation (P04-T01)

`computeGlideTarget(bpmOut, bpmIn)` at `packages/core/src/glide/target.ts:14` computes the default glide target as `(bpmOut + bpmIn) * 0.5` — the arithmetic mean of outgoing and incoming BPM. It validates that both inputs are finite (throws `TypeError`) and positive (throws `RangeError`). The AudioWorklet uses this value to set the glide `AudioParam` target. Clue P04-T01-S01-M01 confirmed exact results: `(120,128)→124`, `(90,90)→90`.

### Transition Window Chopping Engine (P04-T02)

Slices `Float32Array` audio inside the 64-beat transition window (`TRANSITION_WINDOW_BEATS = 64` at `constants/grid.ts:58`) onto a `chopGrid` of 1/8, 1/16, or 1/32 beat:

- `chop/slice.ts:21` — `computeSliceBoundaries()` writes boundary beat positions into a caller-supplied `Float32Array`; zero-allocation, deterministic, no seconds produced internally.
- `chop/passthrough.ts:5` — `isOutsideTransitionWindow()` and `getPassthroughAudio()` pass audio through with zero-copy `subarray()` views outside the window.
- `chop/groove-shift.ts:11` — `applySwingToSliceBoundaries()` shifts odd-index (off-beat) boundaries by `Δ_groove` when groove mode is `Swing`; on-beats unchanged.
- `chop/crossfade-bound.ts:16` — `isCrossfadeValid()` enforces `crossfadeBeats ≤ (1/chopGrid) / 4` as a pure beat comparison.
- `chop/widen-grid.ts:16` — `widenChopGridIfNeeded()` widens 1/32→1/8 under high CPU load to prevent dropouts.

Cosine crossfade `F_fade = 0.5 × (1 + cos(π × t / crossfadeBeats))` is applied at slice boundaries for `t ∈ [0, crossfadeBeats]`.

### RT-Safe AudioWorklet Infrastructure (P04-T03)

`packages/core/src/dsp/worklet-skeleton.ts:14` — `OtomixWorkletProcessor` pre-allocates all state (temp buffer, slice buffers, smoothing state) in the constructor; `process()` performs zero allocation. `dsp/spsc-ring-buffer.ts:8` — `SpscRingBuffer` provides lock-free SPSC communication between the UI (producer) and AudioWorklet (consumer) via `SharedArrayBuffer` + `Atomics`. `dsp/smoother.ts:7` — `OnePoleSmoother` applies per-sample exponential smoothing to gain, filter cutoff, and pan. `dsp/denormal.ts:5` — `flushDenormal()` / `flushDenormalBuffer()` flush sub-normal values to prevent CPU spikes.

### DSP Port & Effects Chain (P04-T04)

`dsp/port.ts:13` — `DspPort` interface (`initialize`, `start`, `stop`, `scheduleTransition`, `flush`, `setDegraded`, `isDegraded`) plus `AudioParamAutomation` schema (`paramId`, `targetValue`, `time` in beats, `curve`). `dsp/mock-driver.ts:11` — `MockDspDriver` implements `DspPort` for headless Node.js testing without an `AudioContext`.

The effects chain, all `AdminTuningConfig`-driven:

- `dsp/input-gain.ts:15` — `GainNormalizer` aligns loudness to target LUFS with `OnePoleSmoother` and denormal flush.
- `dsp/three-band-eq.ts:43` — `ThreeBandEq` with low/mid/high Biquad shelves (Direct Form II), coefficient recalculation without new allocations.
- `dsp/comp.ts:77` — `MultibandCompressor` with LR4 (Butterworth 4th-order) crossovers splitting low/mid/high bands.
- `dsp/limiter.ts:19` — `LookaheadLimiter` with 4× oversampling and look-ahead delay buffer; bypasses entirely when `enableLiveEffects=false` (zero latency).
- `dsp/encoder.ts:8` — `ExportEncoder` (offline, not @rt-safe) writes native WAV; MP3/FLAC stubs deferred to P09.
- `dsp/degraded-crossfade.ts:4` — `applyDegradedCrossfade()` linear gain ramp for `RUNG_STANDARD_CROSSFADE` safety-net mode with no micro-chopping.

## Key Files

| File | Purpose |
|------|---------|
| `packages/core/src/glide/target.ts:14` | `computeGlideTarget()` — arithmetic mean BPM glide target |
| `packages/core/src/chop/slice.ts:21` | `computeSliceBoundaries()` — chop-grid slice boundaries |
| `packages/core/src/chop/passthrough.ts:5` | Zero-copy passthrough outside transition window |
| `packages/core/src/chop/groove-shift.ts:11` | Swing groove offset on off-beat boundaries |
| `packages/core/src/chop/crossfade-bound.ts:16` | Crossfade validity (beat-domain bound) |
| `packages/core/src/chop/widen-grid.ts:16` | Load-shedding grid widening |
| `packages/core/src/dsp/worklet-skeleton.ts:14` | AudioWorkletProcessor skeleton (zero-alloc process) |
| `packages/core/src/dsp/spsc-ring-buffer.ts:8` | Lock-free SPSC ring buffer (SharedArrayBuffer + Atomics) |
| `packages/core/src/dsp/smoother.ts:7` | OnePoleSmoother for per-sample parameter smoothing |
| `packages/core/src/dsp/denormal.ts:5` | Denormal flushing to prevent CPU spikes |
| `packages/core/src/dsp/port.ts:13` | `DspPort` interface + `AudioParamAutomation` schema |
| `packages/core/src/dsp/mock-driver.ts:11` | Headless MockDspDriver implementing DspPort |
| `packages/core/src/dsp/input-gain.ts:15` | GainNormalizer (LUFS alignment) |
| `packages/core/src/dsp/three-band-eq.ts:43` | 3-band EQ (Biquad shelves) |
| `packages/core/src/dsp/comp.ts:77` | MultibandCompressor (LR4 crossovers) |
| `packages/core/src/dsp/limiter.ts:19` | 4× oversampled look-ahead limiter |
| `packages/core/src/dsp/encoder.ts:8` | WAV/MP3/FLAC export encoder (offline) |
| `packages/core/src/dsp/degraded-crossfade.ts:4` | Standard crossfade for degraded mode |
| `packages/core/src/config/transition-config.ts` | `AdminTuningConfig`, `UserFacingConfig`, `TransitionProfile` |
| `packages/core/src/transition/planner.ts:41` | `planSafetyNetCrossfade()` — 4-bar safety net |
| `packages/core/src/transition/types.ts:4` | `TransitionRung` / `TransitionPlan` types |

## Constants

**`packages/core/src/constants/grid.ts`** (42 frozen entries in `GRID_CONSTANTS`):

| Constant | Value | Role |
|----------|-------|------|
| `GLIDE_MAX` | 0.08 | Max 8% tempo change per transition |
| `RATE_MIN` / `RATE_MAX` | 0.98 / 1.02 | Playback rate bounds |
| `RATE_SLEW_PER_QUANTA` | 0.005/48 | Max rate change per quantum |
| `SAFETY_XFADE_BEATS` | 16 | 4-bar safety crossfade |
| `TRANSITION_WINDOW_BEATS` | 64 | 16-bar transition window |
| `QUANTUM_DIVISOR` | 24 | Quanta per beat |
| `CHOP_CROSSFADE_BEATS` | 0.015625 | 1/64 beat slice overlap |

**`packages/core/src/constants/timing.ts`**:

| Constant | Value | Role |
|----------|-------|------|
| `LOOKAHEAD_MS` | 50 | Smoothing look-ahead (50 ms) |
| `SCHED_ACCURACY_MS` | 2 | Scheduling accuracy |
| `PORT_BUFFER_SAMPLES` | 1024 | DSP port buffer size |
| `PORT_LATENCY_MS` | 10 | Port latency budget |

**`packages/core/src/constants/scoring.ts`**:

| Constant | Value | Role |
|----------|-------|------|
| `MIXABILITY_WEIGHTS` | [0.30, 0.20, 0.20, 0.15, 0.15] | kick_drift, bpm_clarity, bpm_accuracy, freq_clarity, overall_quality |

## Blocked Tasks (OQs)

The following P04 tasks remain flagged pending owner decisions:

| Task | Blocked By | Issue |
|------|-----------|-------|
| P04-T03-S01-M01 | OQ-18 | AudioWorklet pre-allocation sizing for variable slice counts |
| P04-T03-S01-M02 | OQ-03 | SPSC ring buffer capacity formula under backpressure |
| P04-T04-S01-M01 | OQ-05 | Mastering chain loudness target (LUFS) spec |

OQ-06 (the crossfade unit was renamed to pure beats) was resolved 2026-11-11. Exit criteria require OQ-03, OQ-05, OQ-18, OQ-19 recorded and their tasks flagged.

## Test Coverage

P04 unit tests (Vitest) under `packages/core/test/`:

- `glide.target.spec.ts` — 6 tests: exact averages, TypeError/RangeError on NaN/Infinity/non-positive, float precision.
- `chop.slice.spec.ts` — 12 tests: 1/8/16/32 grids, uniform widths, zero-length range, inverted/invalid grid errors, buffer reuse, `beatSpanToSamples`.
- `chop.crossfade-bound.spec.ts` — 4 tests: valid/invalid crossfade on grids 8/16/32, negative rejection.
- `chop.groove-shift.spec.ts` — 8 tests: Straight/Triplet/Irrregular no-shift, Swing off-beat shift, count edge cases, large swing reordering, zero-allocation void return.
- `chop.widen-grid.spec.ts` — 3 tests: keep below threshold, widen at/above threshold, edge cases 0 and 1.
- `chop.passthrough.spec.ts` — 6 tests: before/after/inside/straddling window, zero-copy subarray.
- `dsp.port.spec.ts` — 12 tests: MockDspPort initialize/start/stop/scheduleTransition/flush, automation curves.
- `dsp.spsc-ring-buffer.spec.ts` — 4 tests: FIFO order, overflow/wrap, zero-allocation loop.
- `dsp.smoother.spec.ts` — 6 tests: smoothing curve, alpha change, snapTo, invalid alpha.
- `dsp.denormal.spec.ts` — 5 tests: normal passthrough, denormal flush, threshold boundary, in-place buffer flush.
- `dsp.eq.spec.ts` — 7 tests: init, flat 0dB, low-cut attenuation, sample-rate change, profile update, reset.
- `dsp-limiter.spec.ts` — 4 tests: bypass when disabled, latency reporting, ceiling limiting, reset.
- `dsp-comp.spec.ts` — 6 tests: below-threshold no reduction, above-threshold gain reduction, crossover re-split, makeup gain, reset.
- `dsp-input-gain.spec.ts` — 7 tests: boost/attenuate to LUFS, bypass, tolerance, zero-allocation loop, denormal flush, 0 latency.
- `dsp-degraded.spec.ts` — 1 test: standard crossfade in degraded mode.
- `dsp-mock.spec.ts` — 6 tests: MockDspDriver initialize/start/stop/schedule/flush/process/bypass/headless.
- `dsp-encoder.spec.ts` — 5 tests: WAV header, MP3/FLAC stubs, empty buffer rejection, invalid sample rate.
- `dsp-latency.spec.ts` — 1 test: total algorithmic latency ≤ 441 samples (<10ms at 44.1kHz).
- `worklet-skeleton.spec.ts` — 2 tests: init with admin config, passthrough outside transition.
- `constants.grid.spec.ts` — 3 tests: all 42 values, frozen.
- `constants.timing.spec.ts` — 2 tests: all timing values, frozen.
- `constants.scoring.spec.ts` — 4 tests: all scoring values, MIXABILITY_WEIGHTS sum, frozen.

All P04 tests pass; total repository test suite is green (550+ tests).
