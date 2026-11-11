# Phase 1 — Foundation

## Why P01 Exists

Before OTOMIX can analyze a single beat, it needs a **trustworthy foundation**: a monorepo with strict quality gates, types that make invalid states unrepresentable, contracts that version and validate every data structure, resilience patterns that distinguish transient from permanent failures, telemetry that correlates every log line across service boundaries, and timing primitives that hit sub-millisecond targets in JavaScript.

P01 delivers all of this in **23 micro-tasks**, every one complete.

## Branded Types Trio: Compile-Time Guards, Zero Runtime Cost

OTOMIX uses **TypeScript branded types** (nominal typing via `unique symbol`) for three domain primitives. They are ordinary `number` or `string` at runtime but distinct types at compile time. Invalid values cannot be constructed without passing through a `parse()` validator.

| Type | File | Validator | Constraint |
|------|------|-----------|------------|
| `BPM` | `packages/core/src/types/bpm.ts:10` | `BPM.parse(n)` | Finite, 60.0–200.0 |
| `CamelotKey` | `packages/core/src/types/camelot.ts:12` | `CamelotKey.parse(s)` | Regex `^(1[0-2]\|[1-9])[AB]$` (1A–12B) |
| `BeatIndex` | `packages/core/src/types/beat-index.ts:10` | `BeatIndex.parse(i)` | Safe integer, ≠ 0 (beat 0 is not assigned per §3.10) |

Each returns a discriminated union `{ ok: true; value: T } | { ok: false; error: 'INVALID_ARGUMENT'; message: string }`. Callers **must** handle the `ok: false` branch — the type system enforces it. Zero runtime overhead; the brand erases to `number`/`string` in emitted JS.

## Contracts: Semver Gate + Feature Registry Validation

**Semver Gate** (`packages/contracts/src/semver-gate.ts:10`): Every feature registry carries a schema version (`major.minor.patch`). `validateSchemaVersion()` enforces:
- Format: exactly three numeric components, no leading zeros.
- Major > 1 → `PURGE_AND_REANALYZE` (breaking change, full re-analysis required).
- Major < 1 → `REJECT`.
- Major = 1, minor = 2 → `ACCEPT` (only 1.2.x is supported).
- Major = 1, minor ≠ 2 → `REJECT`.

This gate runs **before** any other phase touches the registry. It is the first line of defense against schema drift.

**Feature Registry Validation** (`packages/contracts/src/validate.ts:21`): Uses AJV with a compiled JSON Schema (`packages/contracts/schemas/feature-registry-1.2.json`). Registers a custom `uuid` format (RFC 4122). Returns the same discriminated union shape as the branded types.

## Resilience: Two Layers, Two Concerns

| Layer | File | Purpose |
|-------|------|---------|
| **Retry** | `packages/core/src/resilience/retry.ts:31` | Bounded exponential backoff for **transient** failures (network blips, temporary lock contention). Configurable max attempts, base delay, jitter. |
| **Degraded Mode** | `packages/core/src/resilience/degraded.ts:55` | **Permanent** degradation controller. When a subsystem (e.g., feature extraction) exceeds its error budget, the controller flips a global `degraded` flag. Consumers read the flag and switch to fallback behavior (e.g., skip MAEST embeddings, use cached features only). One-way: no auto-recovery; requires operator intervention. |

Retry handles "try again." Degraded handles "stop trying, operate reduced."

## Telemetry: Structured + Trace Context

**Structured Logger** (`packages/core/src/telemetry/logger.ts:105`): JSON lines with level, timestamp, message, and a `context` object. Automatic **redaction** of sensitive keys (`token`, `password`, `secret`, `authorization`, `cookie`, `set-cookie`) — values replaced with `"[REDACTED]"` before serialization. Every log line includes `trace_id` and `span_id` when a W3C `traceparent` header is present.

**Trace Propagation** (`packages/core/src/telemetry/propagation.ts:97`): Extracts/injects `traceparent` and `tracestate` headers per W3C Trace Context spec. `extractTraceContext(headers)` → `{ traceId, parentId, traceFlags, traceState }`. `injectTraceContext(ctx, headers)` mutates headers. This enables end-to-end distributed tracing from ingestion (P07) through extraction (P05) to mixing (P04) to export (P09).

## Timing Primitives: The Sub-Millisecond Foundation

**High-Res Clock** (`packages/core/src/timing/clock.ts:8`): Wraps `performance.now()` with a monotonic guard. Returns milliseconds as `number`. Used by every component that needs "now."

**Lookahead Scheduler** (`packages/core/src/timing/scheduler.ts:19`): The **only** way to hit sub-ms targets in JavaScript. Instead of scheduling work *at* its deadline, the scheduler queues work **50 ms early** (`LOOKAHEAD_MS = 50` from `constants/timing.ts:2`) and executes it with **2 ms accuracy** (`SCHED_ACCURACY_MS = 2` from `constants/timing.ts:3`). The 50 ms window absorbs GC pauses, main-thread contention, and timer slack. The 2 ms accuracy is the contract: if the scheduler fires >2 ms late, it emits a `scheduler.late` telemetry event.

## Test Outcome

| Test Suite | Count | Scope |
|------------|-------|-------|
| P01-IT | 2 | Cross-phase integration: monorepo workspace resolution, coverage thresholds, CVSS gate. |
| X-P01-P02 | 3 | Branded types flow into GridModel construction. |
| X-P01-P05 | 2 | Semver gate blocks incompatible registry before extraction. |
| X-P01-P06 | 1 | Trace context propagates through retry/degraded boundaries. |

**Total P01 tasks: 23/23 complete.** Every constant is frozen (`Object.freeze`). Every validator returns a discriminated union. Every resilience policy is tested. Every telemetry field is documented.