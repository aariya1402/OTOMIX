# Phase 3 — Dual Grid & Observer

## Two Grids, One Timeline

P03 builds on P02's Absolute Locked Grid to extract **two complementary rhythmic views** from audio, then fuses them into a **Universal Transition Guarantee** — a transition plan that *never cancels*.

## Attack Grid: Transient Onsets

`extractAttackGrid()` at `packages/core/src/grid/attack.ts:13`:
- 2048-sample Hamming window, 50% hop (1024 samples).
- FFT → spectral flux (positive differential of magnitude above 200 Hz).
- Median + 1.5×MAD threshold, peak-picking with minimum 1-hop separation.
- Returns sample indices of attack onsets.

**Why spectral flux?** It detects *any* sharp onset (kick, snare, hi-hat, vocal consonant) regardless of pitch. The 200 Hz cutoff ignores sub-bass rumble that isn't transient.

## Body Grid: Sub-Bass Energy Peak

`extractBodyGrid()` at `packages/core/src/grid/body.ts:14`:
- 4th-order Butterworth low-pass at 80 Hz (`BODY_CUTOFF_HZ`, `BODY_FILTER_ORDER` from `constants/grid.ts:57–58`).
- Sliding RMS window (5 ms, `BODY_RMS_WINDOW_MS`).
- Search window (50 ms, `BODY_SEARCH_WINDOW_MS`) anchored at attack onset.
- **Group delay compensation** (`BODY_GROUP_DELAY_MS = 7.3` from `constants/grid.ts:63`) — the filtered peak is shifted *earlier* by 7.3 ms to report the true body peak position.
- Returns corrected sample index of maximum sub-band RMS.

**Why body grid?** Kick drums have a transient *attack* (click) followed by a sub-bass *body* (boom). The body lags the attack by ~10–20 ms (Δφ). The Attack Grid finds the click; the Body Grid finds the boom. The offset Δφ is the phase alignment problem.

## Phase Offset Δφ and Cosine Realignment

`phaseOffset()` at `grid/phase-offset.ts:15`: `Δφ = T_body_peak − T_attack_onset`. Positive = body after attack (typical).

`cosineRealign()` at `grid/realign-cosine.ts:18`: 4-bar (16-beat) cosine interpolation:
```
correction(n) = Δφ × (1 − cos(π × n / 16)) / 2
```
- `n = 0` → 0 ms correction (start of realignment).
- `n = 16` → Δφ ms correction (end, fully aligned).
- Monotonic, smooth, mean slope ≈ 1 ms/beat when Δφ = 16 ms.

Trigger: `shouldTriggerRealign()` at `grid/realign-trigger.ts:14` — fires when outgoing sub-band RMS < `BODY_REALIGN_DBFS` (−40 dBFS). Caller **must** ensure crossfade has completed first.

## Runtime Observer: Drift, Degrade, Realign Log

| Observer | File | Purpose |
|----------|------|---------|
| **Drift** | `observer/drift.ts:15` | `computeDrift(gridTime, contextTime) = (context − grid) × 1000` → ms. Positive = context fast. Unit conversion (×1000) happens exactly once here. |
| **Scale** | `observer/scale.ts:10` | PI controller: `desiredRate = 1.0 − sign(drift) × GAIN × excess`. `GAIN = (0.02 × 1000) / (50 − 4) ≈ 0.435`. Rate clamped to `[RATE_MIN, RATE_MAX]` = `[0.98, 1.02]`. Slew limited to `RATE_SLEW_PER_S = 0.005` per second. |
| **Degrade** | `observer/degrade.ts:14` | One-way buffer expansion: if `frameTimeMs > STARVATION_FRAME_MS (10)` → `BUFFER_DEGRADED (4096)`, emit `system.thread.starvation`. No auto-shrink. |
| **Realign Log** | `observer/realign-log.ts:7` | Logarithmic curve: `logRealign(n, Δφ) = Δφ × log1p(k × n/N) / log1p(k)` with `k = LOG_REALIGN_K = 3`, `N = 64` beats. Slower start, faster finish than cosine. |

## Groove Classifier

`classifyGroove()` at `groove/classify.ts:8` — 16 deviation values (one per 16th note in a 4-bar loop):
1. **Straight**: all `|dev| < STRAIGHT_VAR (0.02)`.
2. **Triplet**: odd positions alternate `±(1/3 − 1/4) = ±0.08333…`; even positions small.
3. **Swing**: all odd positions positive, same mean in `[SWING_MIN (0.05), SWING_MAX (0.33)]`; even positions small.
4. **Irregular**: fallback.

Returns `{ mode, confidence: 1.0, swingDisplacement? }`. Used by P04 chopping engine to shift off-beat slice boundaries.

## Universal Transition Guarantee: 7 Rungs + Safety Net

`TransitionRung` at `transition/types.ts:4` (7 values):
```
RUNG_NONE                  // Normal: both tracks have kicks, grids lock
RUNG_STATIC_120_GRID       // Incoming kick-less → map to 120 BPM static grid
RUNG_SILENT_LOOP           // Outgoing too short (< 64 beats) → pad with silence
RUNG_FOUR_BAR_CROSSFADE    // Safety net: grid-independent 4-bar volume crossfade
RUNG_WSOLA_LEGACY          // Legacy WSOLA fallback (phase-coherence predicate fail)
RUNG_GROOVE_SHIFT          // Groove-aware slice boundary adjustment
RUNG_CHOP_SHED             // Load shedding: widen chop grid from 1/32 → 1/8
```

`planTransition()` at `transition/planner.ts:57` routes:
1. Outgoing short (< 64 beats) → `RUNG_SILENT_LOOP` (line 12).
2. Else compute anchors → if incoming kick-less → `RUNG_STATIC_120_GRID` (line 69), else `RUNG_NONE` (line 69).
3. **Catch-all**: any throw → `planSafetyNetCrossfade()` (line 41) — **never throws, always returns valid plan**.
4. **Final guard**: if `alignToSeconds` or `mappedBpm` non-finite → safety net (line 88).

`TRANSITION_WINDOW_BEATS = 64` (from `constants/grid.ts:99`, derived from `TRANSITION_WINDOW_BARS = 16 × BEATS_PER_BAR = 4`). `SAFETY_XFADE_BEATS = 16` (from `constants/grid.ts:101`, `SAFETY_XFADE_BARS = 4 × 4`).

## Test Proof

| Test Suite | Count | What It Proves |
|------------|-------|----------------|
| P03-IT | 8 | Dual Grid extraction, Δφ cosine realignment, groove classifier, transition planner rung routing, safety net catch, observer drift/scale/degrade. |
| Property | 10,000 pairings | `transition.property.spec.ts` — random track pairs, every planner output satisfies: `alignToSeconds` finite, `mappedBpm` ∈ [60, 200], rung ∈ 7 values, safety net never reached for valid inputs. |

**Total P03 tasks: 21/24 complete, 3 blocked (OQ-17, OQ-01, OQ-04).** Blocked tasks concern WSOLA fallback predicate, groove-shift boundary math, and chop-shed threshold calibration — all require spec decisions.