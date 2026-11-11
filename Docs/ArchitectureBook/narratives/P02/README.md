# Phase 2 — Beat-Index Engine

## The Heartbeat of OTOMIX

`GridModel` (`packages/core/src/grid/model.ts:14`) is the heartbeat of OTOMIX. It turns raw audio into a **beat-perfect timeline** — the Absolute Locked Grid. Every downstream phase (P03, P04, P08) consumes `GridModel.t(i)` to know "where is beat *i* in absolute seconds?"

## Core Components

| Component | File | Purpose |
|-----------|------|---------|
| **GridModel** | `grid/model.ts:14` | Piecewise grid: segments of `(startBeat, bpmSeed, T0, delta)`. Binary search lookup (`findSegment`), state machine (`LOCKED` ↔ `RECOVERY`). |
| **tOfI** | `grid/t-of-i.ts:28` | The bridge: `t(i) = T0 + n × (60 / bpmSeed) + delta`. Clamps `delta` to `±DRIFT_MAX_S` (±0.05 s) and increments `deltaClampedCount` counter. |
| **Anchor Sync** | `grid/anchor-sync.ts:5` | `ANCHOR_SYNC_INTERVAL_BEATS = 64` (16 bars × 4 beats). `getSyncedDrift(beat, driftPerBeat)` computes piecewise drift: linear before first sync, held at measured error between syncs, clamped to `±DRIFT_MAX_S`. |
| **Period Bounds** | `grid/period.ts:13` | `boundPeriod(measured, seedPeriod)` constrains to `[PERIOD_MIN, PERIOD_MAX] × seedPeriod` = `[0.95, 1.05] × seedPeriod` (inclusive). |
| **Structural Arithmetic** | `timing/structure.ts:8` | Zero-RAM: `floorMod`, `beatInBar`, `barIndex`, `blockPosition`, `isBlockBoundary`. All O(1), no allocation. |
| **Quantum Timing** | `timing/quantum.ts:12` | `quantumSeconds(bpm) = (60/bpm)/24`, `quantumIndex(beatFloat) = round(beatFloat × 24)`. 1/24-beat resolution. |
| **Pre-Kick Map** | `grid/prekick-map.ts:8` | Negative indices (i ≤ -1) map to pre-kick audio via piecewise segments. Binary search + backward walk. Beat 0 is explicitly rejected (§3.10). |

## Critical Invariant

**`t(i)` is strictly monotonic across the entire track.**  
For any `i < j`: `t(i) < t(j)`. This holds because:
- `period = 60 / bpmSeed > 0` (BPM ∈ [60, 200] via `BPM.parse`).
- `delta` is clamped to `±0.05` s, but `period ≥ 0.3` s (at 200 BPM), so `period > 2 × DRIFT_MAX_S`.
- Anchor sync resets drift to the *measured* error, never extrapolating beyond `DRIFT_MAX_S`.

## Test Proof

| Test Suite | Count | What It Proves |
|------------|-------|----------------|
| P02-IT | 15 | `tOfI` clamp + counter, `boundPeriod` edges, anchor sync at beats 64/128/192, structural arithmetic table, quantum math, pre-kick map binary search, GridModel recovery transition. |
| X-P02-P03 | 6 | GridModel output feeds Dual Grid, phase offset, transition planner. |

**Total P02 tasks: 17/18 complete, 1 blocked (OQ-07).** The blocked task (`P02-T05-S01-M02`) concerns an edge case in dormant-grid recovery that requires a spec decision.