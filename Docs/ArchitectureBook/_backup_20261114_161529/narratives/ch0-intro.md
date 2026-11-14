# What is OTOMIX?

**OTOMIX is a beat-based automatic DJ mixing engine.** It takes two or more audio tracks, analyzes their rhythmic structure down to the individual beat, computes a mathematically guaranteed transition plan, and renders the mixed output — all without ever cancelling a transition once started.

## The Problem

Automatic DJ mixing is genuinely hard. A human DJ matches beats by ear, adjusts tempo gradually, aligns phrases, and knows when to cut or blend. Software that tries to replicate this faces four intertwined problems:

- **Beat continuity** — if the outgoing track drifts by 50 ms over 32 beats, the incoming track must compensate or the mix "flams" (audible double-hit).
- **Tempo mismatch** — tracks at 124 BPM and 126 BPM cannot simply be crossfaded; one must be tempo-warped to meet the other.
- **Pitch drift** — tempo warping without pitch correction shifts musical key, creating dissonance.
- **Phase alignment** — even at matched tempo, the kick drums may be offset by a fraction of a beat (the "body lag" behind the transient). This offset must be corrected *during* the transition, not after.

A wrong transition ruins the night. OTOMIX exists to make that impossibility a guarantee: **every transition completes.**

## The Insight: Beat-First

The single architectural discipline that makes OTOMIX work is **beat-first**. Every decision — grid construction, drift correction, crossfade timing, slice boundaries — lands on a beat boundary, never on a wall-clock second.

Wall-clock time is elastic (sample rates drift, buffers underrun, GC pauses). Beat time is absolute. By anchoring all computation to the **Absolute Locked Grid** (a monotonic mapping `t(i)` from beat index `i` to absolute seconds), OTOMIX decouples musical intent from system latency. The transition window is always 64 beats (16 bars at 4/4). The safety crossfade is always 16 beats. The anchor sync fires every 64 beats. These numbers are constants, not configuration.

## One-Line Tour of the 11 Phases

| Phase | Purpose |
|-------|---------|
| **P01 Foundation** | Monorepo, quality gates, branded types (`BPM`, `CamelotKey`, `BeatIndex`), contracts (semver gate, feature registry), resilience (retry + degraded mode), telemetry (structured logging + W3C trace context), timing primitives (high-res clock, 50 ms lookahead scheduler). |
| **P02 Beat-Index Engine** | The Absolute Locked Grid: `t(i)` mapping with drift clamp (±0.05 s), period bounds (±5%), hard anchor sync every 64 beats, pre-kick mapping for negative indices, zero-RAM structural arithmetic (`floorMod`, `beatInBar`, `barIndex`, `blockPosition`, `isBlockBoundary`, `quantumSeconds`, `quantumIndex`). |
| **P03 Dual Grid & Observer** | Attack Grid (spectral flux onset detection) + Body Grid (sub-band RMS peak with group-delay compensation). Phase offset Δφ drives a 4-bar cosine realignment. Runtime Observer watches drift, degrades buffer size one-way, and emits realignment logs. Groove classifier (Straight/Triplet/Swing/Irregular). Universal Transition Guarantee planner with 7 rungs + safety net. |
| **P04 DSP Port & Real-Time Safety** | Executes P03 plans: tempo glide via `AudioParam`, Transition Window Chopping Engine (1/8–1/32 slicing with cosine crossfades, groove-aware boundary shift), RT-safe AudioWorklet (zero alloc, lock-free SPSC ring buffer, per-sample smoothing, denormal flush), EQ/Mastering/Export chain with mock driver. |
| **P05 Feature Extraction** | Essentia.js spectral/temporal features, TF voice/instrumental separation, MAEST embeddings, global track metadata cache keyed by `content_sha256`. |
| **P06 Security & RBAC** | JWT + scopes + tier grants + Row-Level Security on every tenant table. Audit log to P10. |
| **P07 Local Ingestion** | Worker decoders (MP3/WAV/FLAC), deduplication by `content_sha256`, copyright declaration UI. Outputs decoded `Float32Array` + hash to P05. |
| **P08 MixPlan & UI** | React 19 + Redux Toolkit frontend, waveform overlays, recommendation engine, MixPlan generation. Input: catalog + user intent. Output: MixPlan + preview requests to P04. |
| **P09 Export & Set Shop** | XML exporters (Serato, Traktor, Rekordbox), encrypted archives, marketplace listing. Input: completed set from P08. Output: signed download + purchase record. |
| **P10 Observability & Deployment** | OpenTelemetry traces + metrics, Datadog monitors-as-code, K8s Blue/Green, Helm charts, CI hardening. SLO dashboard + runbooks. |
| **P11 Hardening & Acceptance** | 10,000-pairing determinism matrix, zero-RAM heap proof, NFR verification, final evidence bundle for sign-off. |

## What This Book Gives You

This living encyclopedia is **generated from source** — every file path, line number, constant value, and task status comes directly from the codebase and the authoritative plan documents. It serves two audiences simultaneously:

- **Non-experts** (product, design, new hires): Read the narrative chapters (CH0, CH1, P01–P11) for the "why" and the mental models. Analogies first, code references optional.
- **Experts** (engineers, auditors): Drill into any task to see its exact description, test file, spec reference, review checkpoint, and the source symbols it touches. Search for `TRANSITION_WINDOW_BEATS` and land on `packages/core/src/constants/grid.ts:99`. Click a `vscode://` link and open the exact line in your editor.

The book rebuilds automatically after every micro-task commit via `build-book.ps1`. It is always current.