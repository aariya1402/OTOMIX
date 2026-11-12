# OTOMIX Micro-Task Plan — P05 Addendum

**Document:** `OTOMIX_MicroTask_Plan_Addendum.md`
**Baseline:** `OTOMIX_Architecture_Spec.md` and the owner's decisions recorded in the 2026-11-12 conversation.
**Purpose:** This document supplements `OTOMIX_MicroTask_Plan.md` with new and corrected micro-tasks for Phase P05. It overrides conflicting tasks in the main plan.
**Strategy:** Skeleton-first. Full algorithms deferred.

---

## P05-ADD-T01 Configuration & Normalization

### P05-ADD-T01-S01 AdminConfig Layer

###### P05-ADD-T01-S01-M01 — [x]

| Field | Value |
|---|---|
| ID | `P05-ADD-T01-S01-M01` |
| Description | Create the `AnalysisConfig` interface and a default JSON object. No numeric value in P05 is allowed to be hardcoded. All thresholds, weights, and booleans (e.g., `forceMono`, `energyWeights`, `mixabilityWeights`) must be injected via this config. |
| Expected Outcome | `packages/core/src/config/analysis.ts` and `analysis-config.json`. |
| Prerequisites | `P01-T02-S01-M03` |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/config.analysis.spec.ts`<br>Input: import config. Expected: default config contains keys for energy, mixability, transition, and normalization. Pass: exact key presence. |
| Spec Reference | Owner decision (2026-11-12) |
| Review Checkpoint | Confirm no scoring logic file imports hardcoded constants directly; they must consume `AnalysisConfig`. |

### P05-ADD-T01-S02 Input Normalization (Stereo default)

###### P05-ADD-T01-S02-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T01-S02-M01` |
| Description | Refactor `normalizeInput` to resample to 44.1 kHz without forcing a mono downmix. It must return a stereo buffer by default. A `forceMono` flag from `AnalysisConfig` (default false) controls downmixing. |
| Expected Outcome | `packages/adapter/src/normalize.ts` (updated). |
| Prerequisites | `P05-ADD-T01-S01-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/adapter/test/normalize.spec.ts`<br>Input: 48 kHz stereo. Expected: output channels = 2. Input: 48 kHz stereo + `forceMono=true`. Expected: output channels = 1. Pass: both. |
| Spec Reference | OTOMIX §4.1 · Owner decision (2026-11-12) |
| Review Checkpoint | Confirm `normalizeInput` consumes `AnalysisConfig.forceMono` rather than a hardcoded boolean. |

---

## P05-ADD-T02 Core Analysis Factors (Skeleton & Interfaces)

### P05-ADD-T02-S01 Energy

###### P05-ADD-T02-S01-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T02-S01-M01` |
| Description | Implement the skeleton for the expanded `computeEnergy` function. The formula must encompass kick strength, groove/danceability, polyphony/density, and quiet-vs-loud contrast, using weights from `AnalysisConfig`. Return a value in `[0,1]`. |
| Expected Outcome | `packages/core/src/features/energy.ts`. |
| Prerequisites | `P05-ADD-T01-S01-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/features.energy.spec.ts`<br>Input: raw Essentia features. Expected: `computeEnergy` accepts the expanded feature object and returns a scalar. Pass: type check and range check. |
| Spec Reference | OTOMIX §4.3 · Owner decision (2026-11-12) |
| Review Checkpoint | Confirm no specific component is hardcoded to zero; all weights come from `AnalysisConfig`. |

### P05-ADD-T02-S02 Mixability (Preference-based)

###### P05-ADD-T02-S02-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T02-S02-M01` |
| Description | Implement the skeleton for `computeMixability`. This is a PREFERENCE score, NOT a gate. It must accept: kick grid lock, absence of drift, kick clarity, valid transition window presence, absence of vocal in that window, and kick clarity (Attack vs Body). Weights from `AnalysisConfig`. |
| Expected Outcome | `packages/core/src/features/mixability.ts`. |
| Prerequisites | `P05-ADD-T01-S01-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/features.mixability.spec.ts`<br>Input: perfect features vs poor features. Expected: score is higher for perfect, lower for poor. Pass: score is a float in `[0,1]`. |
| Spec Reference | OTOMIX §4.5 · Owner decision (2026-11-12) |
| Review Checkpoint | Confirm the function returns a score and never throws an "unmixable" exception or returns a hard boolean gate. |

### P05-ADD-T02-S03 Harmonic Gate

###### P05-ADD-T02-S03-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T02-S03-M01` |
| Description | Implement `isCamelotCompatible(keyA, keyB)`. This is the ONLY hard gate in the system. It returns true/false based on standard Camelot wheel compatibility. |
| Expected Outcome | `packages/core/src/features/camelot-gate.ts`. |
| Prerequisites | `P01-T03-S01-M02` |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/features.camelot-gate.spec.ts`<br>Input: '8A' & '8A' (true), '8A' & '9A' (true), '8A' & '2B' (false). Expected: exact boolean matches. |
| Spec Reference | OTOMIX §4.9 · Owner decision (2026-11-12) |
| Review Checkpoint | Confirm no other function claims to be a hard gate. |

### P05-ADD-T02-S04 Compatibility Score (Pairwise)

###### P05-ADD-T02-S04-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T02-S04-M01` |
| Description | Implement the skeleton for `computeCompatibilityScore(trackA, trackB)`. Inputs: mixability of both, camelot proximity, tempo delta, energy smoothness, structural match, window cleanliness, grid-type match. Weights from `AnalysisConfig`. |
| Expected Outcome | `packages/core/src/features/compatibility.ts`. |
| Prerequisites | `P05-ADD-T02-S02-M01`, `P05-ADD-T02-S03-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/features.compatibility.spec.ts`<br>Input: two compatible tracks and two incompatible tracks. Expected: score is a float in `[0,1]`. Pass: type check and range check. |
| Spec Reference | Owner decision (2026-11-12) |
| Review Checkpoint | Confirm this is a pairwise score, not a per-track score. |

### P05-ADD-T02-S05 Structure Detection

###### P05-ADD-T02-S05-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T02-S05-M01` |
| Description | Define the `TrackStructure` interface (intro, outro, verse, chorus, drop, break, bridge, build-up). Implement a stub function `detectStructure(audioBuffer)` that returns the interface with empty/default values. |
| Expected Outcome | `packages/core/src/features/structure.ts`. |
| Prerequisites | None |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/features.structure.spec.ts`<br>Input: any buffer. Expected: returns object matching `TrackStructure` interface. Pass: structural check. |
| Spec Reference | Owner decision (2026-11-12) |
| Review Checkpoint | Confirm the function is a stub for now; no actual DSP is implemented yet. |

---

## P05-ADD-T03 Analysis Pipeline & Grid Rules

### P05-ADD-T03-S01 Grid Locking (Analysis only)

###### P05-ADD-T03-S01-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T03-S01-M01` |
| Description | Enforce the rule: "Grid locks to kick". During analysis, if drift exists, adjust the grid to match the kick, not the other way around. Document and enforce that runtime realignment (cut/stretch) is forbidden. |
| Expected Outcome | `packages/core/src/grid/lock-rule.ts` |
| Prerequisites | `P05-T04-S01-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/grid.lock-rule.spec.ts`<br>Input: a mock analysis object with kick drift. Expected: the grid is shifted to align with the kick. Pass: exact grid shift calculation. |
| Spec Reference | OTOMIX §3.4 · Owner decision (2026-11-12) |
| Review Checkpoint | Confirm no code path introduces a runtime `playbackRate` stretch for drift. |

### P05-ADD-T03-S02 Transition Window

###### P05-ADD-T03-S02-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T03-S02-M01` |
| Description | Update the transition window logic to accept a user-defined duration. The default is 16 bars (configurable via `AnalysisConfig`), but the window can be overridden per transition. |
| Expected Outcome | `packages/core/src/transition/window.ts`. |
| Prerequisites | `P05-ADD-T01-S01-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/transition.window.spec.ts`<br>Input: default config, custom length config. Expected: returns correct beat counts for each. Pass: matches configs. |
| Spec Reference | OTOMIX §3.8 · Owner decision (2026-11-12) |
| Review Checkpoint | Confirm no hardcoded `16` remains in the window logic. |

### P05-ADD-T03-S03 Essentia 31-Feature Extraction

###### P05-ADD-T03-S03-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T03-S03-M01` |
| Description | Expand the extraction adapter to capture all 31 features listed in `Essentia Features.xlsx`. Ensure the output schema matches the updated Feature Registry. |
| Expected Outcome | `packages/adapter/src/extract-features.ts`. |
| Prerequisites | `P05-ADD-T01-S02-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/adapter/test/extract-features.spec.ts`<br>Input: stubbed Essentia output. Expected: all 31 keys are mapped correctly to the registry output. Pass: key presence check. |
| Spec Reference | Owner decision (2026-11-12) |
| Review Checkpoint | Cross-check the extracted keys against sheet 1 of `Essentia Features.xlsx`. |

---

## P05-ADD-T04 UI & Application (P08 overlap)

### P05-ADD-T04-S01 Starter Track & Force Insert

###### P05-ADD-T04-S01-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T04-S01-M01` |
| Description | Implement the Redux logic for Starter Track and Force Insert. The state must store the `compatibility_score` and expose it to the UI to show ranking and fault attribution. |
| Expected Outcome | `packages/ui/src/state/mixplan.ts`. |
| Prerequisites | `P05-ADD-T02-S04-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/ui/test/mixplan.score.spec.ts`<br>Input: user adds a Starter Track, then force-inserts a bad track. Expected: state contains compatibility score and a warning flag. Pass: state shape matches. |
| Spec Reference | OTOMIX §4.9 · Owner decision (2026-11-12) |
| Review Checkpoint | Confirm the UI can distinguish between system error and user fault (force-insert). |

### P05-ADD-T04-S02 Live Re-evaluation

###### P05-ADD-T04-S02-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T04-S02-M01` |
| Description | Implement live recalculation of `compatibility_score` when the user drags and drops tracks to reorder the queue in the UI. |
| Expected Outcome | `packages/ui/src/state/reorder.ts`. |
| Prerequisites | `P05-ADD-T04-S01-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/ui/test/reorder.score.spec.ts`<br>Input: reorder action. Expected: the selector recomputes `compatibility_score` for the affected tracks only. Pass: exact computation. |
| Spec Reference | OTOMIX §4.9 · Owner decision (2026-11-12) |
| Review Checkpoint | Confirm only affected pairs are recomputed (performance check). |

---
**End of Addendum.**
---

## P05-ADD-T06 Extensible Background Enrichment (The Castle & Moat Pattern)

### P05-ADD-T06-S01 Worker Registry (Pluggable Gates)

###### P05-ADD-T06-S01-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T06-S01-M01` |
| Description | Implement a `WorkerRegistry` that allows dynamic registration of analysis workers (gates). A worker can be a local WASM module (e.g., Essentia) or an external API client (e.g., Spotify metadata fetcher). The registry stores the worker's ID, input type, and output schema. |
| Expected Outcome | `packages/core/src/registry/worker-registry.ts` and Admin Dashboard endpoint to register/unregister workers. |
| Prerequisites | `P05-ADD-T01-S01-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/registry.workers.spec.ts`<br>Input: register two mock workers (one local, one API). Expected: registry returns their metadata and can resolve them by ID. Pass: exact match. |
| Spec Reference | Owner decision (2026-11-12) |
| Review Checkpoint | Confirm the registry is agnostic to the worker's internal implementation. |

### P05-ADD-T06-S02 Heterogeneous Feature Storage

###### P05-ADD-T06-S02-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T06-S02-M01` |
| Description | Expand the `GlobalFeatureRepository` to support heterogeneous data. Instead of strict columns, use a JSONB column (e.g., `raw_analysis_data`) to store arbitrary key-value pairs returned by registered workers (numbers for BPM, strings for artists, objects for Spotify API). The core `Feature Registry` will still project the required fields for the mix engine. |
| Expected Outcome | `packages/db/migrations/xxx_global_features_jsonb.sql` and `packages/core/src/repository/global-features.ts`. |
| Prerequisites | `P05-ADD-T06-S01-M01` |
| Independent Test(s) | **integration** · Vitest + Testcontainers PostgreSQL · `packages/db/test/global-features.spec.ts`<br>Input: insert a feature row with mixed types (number, string, JSON object). Expected: data is stored and retrieved without loss. Pass: deep equality. |
| Spec Reference | Owner decision (2026-11-12) |
| Review Checkpoint | Confirm the database schema doesn't require a migration every time a new worker is added. |

### P05-ADD-T06-S03 Background Enrichment Pipeline

###### P05-ADD-T06-S03-M01 — TODO

| Field | Value |
|---|---|
| ID | `P05-ADD-T06-S03-M01` |
| Description | Implement the `EnrichmentPipeline`. When a track is requested, if `raw_analysis_data` is missing or stale, the API returns the RMS fallback immediately and enqueues a job. The pipeline worker picks up the job, sends it through all registered workers (Essentia, Spotify, etc.), and merges the results into `raw_analysis_data`. |
| Expected Outcome | `packages/workers/src/enrichment-pipeline.ts` and queue integration. |
| Prerequisites | `P05-ADD-T06-S02-M01`, `P05-T04-S01-M01` |
| Independent Test(s) | **integration** · Vitest + worker_threads · `packages/workers/test/enrichment.spec.ts`<br>Input: a track hash with no data. Expected: returns fallback, enqueues job, job runs both mock workers, updates DB. Pass: DB contains data after job. |
| Spec Reference | Owner decision (2026-11-12) |
| Review Checkpoint | Confirm the API response is instant (does not wait for the analysis to finish). |

---
**End of Addendum.**
