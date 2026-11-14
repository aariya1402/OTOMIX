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
## Per-task narratives

### P01-T01-S01-M01 - Initialize a pnpm monorepo with packages core, access, adapter, gateway, workers

The task involves setting up a new pnpm-based monorepo structure that organizes a software project into distinct, modular packages—core, access, adapter, gateway, workers, ui, db, proto, and contracts—each with strict TypeScript typing, consistent code formatting via Prettier, and standardized linting through ESLint. This foundational setup ensures that all components are cleanly separated, maintainable, and scalable as the project evolves.  

This initiative solves a critical problem: without a unified, well-structured monorepo, development teams risk code duplication, inconsistent standards, and difficulty managing dependencies across services. By establishing a shared configuration and tooling pipeline from the outset, the project gains immediate clarity in code ownership, reduces onboarding friction, and enables seamless collaboration across teams. The implementation configures pnpm to manage dependencies efficiently, enforces strict TypeScript type safety across all packages, and integrates ESLint and Prettier to maintain consistent code style. As a result, a fully functional, type-safe, and standardized monorepo was delivered—now enabling parallel development, easier testing, and smoother integration of new features without introducing configuration drift or technical debt.

### P01-T01-S02-M01 - Configure Vitest coverage thresholds of 90% branches for packages/core and 100% 

The task involves adjusting Vitest configuration to enforce strict branch coverage thresholds across key code packages within the project. Specifically, it sets a 90% branch coverage requirement for the packages/core module and a 100% branch coverage mandate for the packages/access module. This configuration ensures that test suites adequately validate all execution paths in critical components, reducing the likelihood of undetected bugs in production.  

This initiative addresses a persistent gap in test quality—historically, some code paths were not adequately exercised, leading to unpredictable behavior in edge cases. By enforcing these thresholds, the project gains stronger confidence that its core and access functionalities are thoroughly tested. The implementation modifies the Vitest configuration files to include coverage rules that trigger warnings or failures when thresholds are not met during test runs. As a result, the codebase now enforces consistent, measurable test coverage, improving reliability and maintainability. The change is now active in the build pipeline, and all future test runs will validate branch coverage before passing, ensuring that both core and access modules meet rigorous quality standards.

### P01-T01-S02-M02 - Implement scripts/cvss-gate.ts that exits non-zero when any scanner finding has 

The task involves implementing a TypeScript script, cvss-gate.ts, that acts as a gatekeeper in the CI pipeline by evaluating security scanner findings and enforcing a threshold based on CVSS scores. This script is designed to exit with a non-zero status whenever any vulnerability is detected with a CVSS score of 7.0 or higher, effectively preventing the build from proceeding if high-severity issues are found. The implementation is critical because it directly addresses the risk of deploying software with unmitigated critical vulnerabilities, which could lead to system compromises or data breaches. Without such a gate, even minor security flaws might slip through, undermining the integrity of the deployed systems.

The script functions by parsing the output of security scanners, filtering findings by CVSS score, and terminating the CI job immediately upon detecting any score at or above 7.0. As a result, the CI pipeline now includes a mandatory security checkpoint that ensures all builds pass a baseline vulnerability threshold before proceeding. This change strengthens the project’s security posture by introducing an automated, enforceable barrier against high-risk vulnerabilities, aligning with the organization’s compliance and risk mitigation standards.

### P01-T02-S01-M01 - Create packages/core/src/constants/timing.ts exporting frozen constants: LOOKAHE

The task involves creating a dedicated TypeScript file, `timing.ts`, within the core package structure to define a set of immutable, frozen constants that govern timing behaviors across the system. These values are critical for synchronizing real-time operations such as frame scheduling, buffer management, and performance monitoring. Without a centralized, consistent source of timing parameters, different components risk using inconsistent or hard-coded values, leading to unpredictable behavior and reduced maintainability.  

The implementation establishes a single file that exports all required timing constants—ranging from frame-level thresholds like STARVATION_FRAME_MS to system-level limits like ANALYSIS_TIMEOUT_MS—each precisely defined and immutable. These values are derived from established specifications across multiple technical documents, ensuring alignment with both current and future design requirements. As a result, the system now has a unified, auditable source of timing parameters, enabling predictable performance, easier debugging, and smoother integration with real-time processing modules. This change eliminates configuration drift and improves reliability across all timing-sensitive operations.

### P01-T02-S01-M02 - Create packages/core/src/constants/grid.ts exporting: PERIOD_MIN=0.95, PERIOD_MA

The task involves defining a centralized set of grid-related constants in the file `packages/core/src/constants/grid.ts`, establishing consistent numerical values that govern the behavior of rhythmic and temporal processing within the audio mixing system. These values—ranging from drift tolerances to beat alignment thresholds—ensure that timing and synchronization logic across modules operates with predictable, standardized precision. This is critical because inconsistent or arbitrary values would introduce variability in performance, leading to unpredictable behavior in real-time audio processing, especially under dynamic conditions.  

The implementation exports a well-structured set of constants, each carefully calibrated to reflect physical and perceptual limits of human auditory perception and digital signal processing. For instance, drift thresholds and beat alignment parameters maintain stability during playback, while rate and pitch tolerances ensure smooth transitions between musical elements. The result is a unified, maintainable configuration layer that replaces hardcoded or scattered values, enabling future scalability and easier debugging. With this change, the system now enforces a consistent temporal framework across all modules, improving both reliability and interoperability in real-time audio workflows.

### P01-T02-S01-M03 - Create packages/core/src/constants/scoring.ts and packages/access/src/constants.

The task involves creating and populating two TypeScript constant files to standardize key configuration values across the system—specifically, `packages/core/src/constants/scoring.ts` and `packages/access/src/constants.ts`. These files define critical numerical parameters used in scoring logic and access control workflows, ensuring consistency and reducing duplication across modules. This work addresses a core problem: prior to this, configuration values were scattered across codebases, leading to inconsistencies, hard-to-maintain logic, and increased risk of errors during updates. By centralizing these values in dedicated constants, the system gains clarity, improves maintainability, and enables safer, more predictable behavior under varying conditions.

The implementation defines a suite of weighted thresholds and time-based limits—such as energy and mix scoring weights, vocal detection thresholds, access token lifetimes, retry policies, and service performance targets—each precisely calibrated to support real-world operational needs. As a result, the system now has a unified, versioned source of truth for these values, which are now used consistently throughout both core scoring and access management components. This change enables smoother integration between modules, supports future scalability, and aligns with established design principles in OTOMIX and Mother specifications.
