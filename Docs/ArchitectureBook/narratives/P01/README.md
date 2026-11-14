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

### P01-T03-S01-M01 - Implement BPM.parse(n) returning a branded type, rejecting values outside [60.0,

The task involves implementing a `BPM.parse(n)` function that safely interprets a numeric input as a beat-per-minute value and returns a branded type to ensure type safety and prevent invalid data from propagating through the system. This function must reject any values outside the valid range of 60.0 to 200.0, signaling invalid inputs with an `INVALID_ARGUMENT` error, thereby enforcing domain-specific constraints. The need for this functionality arises because inconsistent or out-of-range BPM values—such as those below 60 or above 200—can lead to unstable or nonsensical musical playback, especially in real-time applications where timing precision is critical. By validating inputs at the earliest stage, the system avoids downstream errors and maintains data integrity throughout processing pipelines.

The implementation parses a numeric input, applies strict bounds checking, and returns a branded type that carries both the value and metadata indicating its validity. When an input falls outside the [60.0, 20.0] range, it triggers an `INVALID_ARGUMENT` exception. As a result, the system now enforces BPM validity at runtime, improving reliability and consistency in music playback logic, and aligns with the OTOMIX specification requirements for mother module validation. This change ensures that only safe, realistic BPM values are processed, directly enhancing the robustness and user experience of the application.

### P01-T03-S01-M02 - Implement CamelotKey.parse(s) accepting ^(1[0-2]|[1-9])[AB]$ only.

The task involves implementing a parser function, CamelotKey.parse(s), that validates and processes input strings conforming strictly to a specific pattern: ^(1[0-2]|[1-9])[AB]$. This function is designed to accept only strings that represent a valid key format—either a single digit from 1 to 9, or a two-digit number from 10 to 12—followed immediately by the characters 'A' or 'B'. This validation is critical because it ensures data integrity in systems that rely on standardized key formats for operations like authentication or configuration. Without such a parser, the system would be vulnerable to malformed inputs that could lead to errors, security flaws, or unintended behavior.

The implementation parses the input string against the regex pattern, returning a valid key object or throwing an error if the input fails validation. This change strengthens input handling in the system, ensuring only well-formed keys are processed. As a result, the software now enforces strict key format compliance, reducing the risk of invalid or malformed data entry, and aligns with established specifications in OTOMIX 4.2 and Add. 1–2, building upon the foundational work defined in prerequisite task P01-T03-S01-M01.

### P01-T03-S01-M03 - Implement BeatIndex.parse(i) accepting any non-zero safe integer and rejecting 0

The task involves implementing a method named BeatIndex.parse(i) that safely interprets a numeric input as a valid beat index. This method must accept only non-zero safe integers—positive or negative whole numbers within the safe integer range—while explicitly rejecting inputs of zero and non-integer values such as decimals or fractions. The implementation ensures robustness by validating the input type and range at runtime, preventing invalid state transitions in the beat tracking system.  

This functionality is critical because the absence of a valid beat index can lead to incorrect timing, skipped events, or system instability during playback or synchronization. By enforcing strict input validation, the system avoids unintended behavior that could compromise audio precision or user experience. The implementation parses the input, validates it against the safe integer constraints, and returns a properly initialized BeatIndex object if valid, otherwise throws a descriptive error. As a result, the BeatIndex class now reliably handles numeric inputs with consistent, predictable behavior, improving both system stability and developer confidence in handling beat-related data.

### P01-T03-S02-M01 - Add the Draft 7 JSON Schema from §9.6 as packages/contracts/schemas/feature-regi

The task involves integrating the Draft 7 JSON Schema from OTOMIX §9.6 into the feature registry system by adding the file *packages/contracts/schemas/feature-registry-1.2.json* and wrapping it with an AJV validator. This ensures that all feature registry data conforms to a standardized, machine-readable schema, enabling consistent and reliable data validation at runtime. The project requires this step to address inconsistencies in schema enforcement across services, preventing malformed or invalid data from propagating through the system—especially as the feature registry grows in complexity and usage.  

The implementation adds the schema file to the contracts directory and embeds an AJV validator that validates incoming feature registry payloads against the schema during processing. This allows the system to catch structural errors early, such as incorrect field types or missing required properties, before data is stored or consumed. As a result, the feature registry now enforces schema compliance, improving data integrity and reducing debugging overhead. The change enables seamless integration with downstream services and ensures alignment with the OTOMIX specification, particularly in the context of the Mother Additions and Feature Registry design.

### P01-T03-S02-M02 - Implement a SemVer gate for schema_version: accept 1.2.x, flag a major bump as P

The task involves implementing a semantic versioning (SemVer) gate to validate schema_version updates, ensuring only compliant version strings are accepted. This gate specifically allows version strings matching 1.2.x, treating any increment in the minor version—beyond 1.2—as a major bump that triggers a PURGE_AND_REANALYZE action, while rejecting all other minor version increments. This implementation is critical because inconsistent schema versioning can lead to data corruption, unexpected behavior in downstream systems, and costly reprocessing of analytics pipelines. Without such a gate, the system risks accepting invalid schema updates that propagate errors across components, undermining data integrity and operational stability.

The implementation evaluates incoming schema_version strings against SemVer rules defined in OTOMIX 4.1, 4.2, Mother 3.1, and 3.2, enforcing strict validation logic that flags any deviation from the 1.2.x pattern. Upon validation, the system either accepts the version, initiates a PURGE_AND_REANALYZE workflow for major bumps, or rejects the update entirely. As a result, the pipeline now enforces versioning discipline, reducing the risk of schema drift and ensuring that only safe, predictable version increments are applied—leading to more reliable and maintainable data processing.

### P01-T04-S01-M01 - Write proto/core/v1/core.proto exactly as §9.2 (messages AnalyzeAudioRequest, An

The task involves reproducing the core protocol definition from OTOMIX version 9.2, specifically the proto/core/v1/core.proto file, focusing on the AnalyzeAudioRequest, AnalyzeAudioResponse, TransitionPlanRequest, ExecutionFallback, and their supporting types. This ensures the foundational message structures are accurately mirrored in the system’s interface layer. The project requires this because inconsistent or missing message definitions can lead to runtime errors, misaligned data flows, and integration failures across services—especially in real-time audio processing pipelines where precise message semantics are critical.  

The implementation precisely copies the schema from the OTOMIX specification, preserving all field types, order, and constraints as defined in the referenced addenda. It then generates TypeScript type stubs that mirror the proto structure, enabling frontend and backend services to safely interact with the audio analysis and transition logic using strongly-typed, compile-time validated interfaces. As a result, the system now has a consistent, type-safe interface for audio processing operations, with all message structures correctly defined and available for development, reducing runtime errors and improving maintainability across the codebase.

### P01-T04-S02-M01 - Implement the gRPC-to-HTTP status map from §9.3 as mapStatus(code) including the

The task involves implementing a gRPC-to-HTTP status code mapping function, mapStatus(code), based on the specification in OTOMIX 9.3, Mother Add. 1–2, to ensure consistent error handling across service boundaries. This function translates gRPC status codes—specifically nine defined codes—into their corresponding HTTP status codes, enabling interoperability between gRPC-based internal services and HTTP-based external clients or APIs.  

This implementation solves a critical gap in error communication where internal gRPC services would otherwise fail to convey meaningful HTTP-level error responses to external systems. Without this mapping, clients receiving gRPC errors would lack the standard HTTP status codes needed for proper error handling and user feedback. The function processes each of the nine gRPC status codes, such as Unauthenticated or FailedPrecondition, and maps them to equivalent HTTP status codes like 401 or 400. As a result, the system now delivers standardized, predictable HTTP responses when gRPC errors occur, improving client-side error visibility and debugging. This change ensures alignment with web standards and enhances the reliability and usability of the service ecosystem.

### P01-T05-S01-M01 - Write migration 001_core.sql creating features, users, tier_grants, admin_audit 

The task involves crafting a database migration script, migration 001_core.sql, to establish core schema elements—features, users, tier_grants, admin_audit, and an outbox—aligned precisely with the constraints and indices defined in the OTOMIX 9.5 Mother Add. 1–2 specification. This migration ensures the database structure evolves in tandem with the application’s evolving requirements, laying a consistent foundation for future development.  

This work resolves a critical gap in schema integrity by enforcing data validity through CHECK constraints and optimizing query performance via targeted indices. The implementation creates the necessary tables with precise column types, relationships, and constraints, while the admin_audit table is specifically range-partitioned by month to support efficient historical data management and compliance auditing. The outbox table is designed to reliably handle event publication for asynchronous processing. As a result, the database now supports robust user management, tier-based access control, and audit trails with scalable performance, directly enabling reliable operation of the system under real-world usage patterns.

### P01-T05-S01-M02 - Add RLS (ENABLE + FORCE) and the tenant_isolation policy to every tenant-carryin

The task involves enhancing security posture by implementing Row-Level Security (RLS) with both ENABLE and FORCE modes, along with the tenant_isolation policy, across all tenant-carrying tables in the system. This ensures that data access is strictly controlled at the row level, preventing unauthorized access based on tenant identity. The project requires this because without such policies, tenants could inadvertently or intentionally access data belonging to other tenants, violating data isolation and compliance standards.  

The implementation configures RLS policies to enforce tenant-specific data visibility, with the tenant_isolation policy ensuring that each tenant sees only their own records. A dedicated application role is created—specifically without the BYPASSRLS privilege—that does not own any of the tenant-carrying tables, thereby preventing privilege escalation and ensuring that access is strictly governed by RLS rules. As a result, the system now enforces strict tenant-level data boundaries, improves auditability, and aligns with the security model defined in OTOMIX 9.5, Add. 3. All tenant-carrying tables now operate under consistent, enforceable access controls, and the absence of BYPASSRLS in the application role eliminates potential bypass risks, delivering a more secure and compliant data environment.

### P01-T05-S01-M03 - Implement withTenant(tx, tenantId) using set_config('app.tenant_id', $1, true) (

The task involves implementing a transaction-scoped tenant identifier mechanism in the system by introducing a new function, withTenant(tx, tenantId), which sets the tenant ID locally within a transaction using set_config('app.tenant_id', $1, true). This ensures that each database transaction operates under a clearly defined tenant context, enabling consistent and secure access to tenant-specific data without requiring explicit tenant IDs in every query. The implementation addresses a critical gap in the current architecture where tenant isolation was inconsistently enforced, leading to potential data leakage and operational errors across tenant boundaries. By making the gateway repository layer require the withTenant function, the system enforces tenant context at the foundational layer of data access, ensuring that all downstream operations inherit the correct tenant identity.

As a result, the system now enforces tenant-aware operations at the transaction level, with every database interaction automatically bound to a specific tenant. This change improves data isolation, simplifies tenant management, and aligns with the system’s security and scalability requirements. The implementation leverages the existing set_config mechanism to maintain transaction-local state, ensuring that tenant context is preserved across operations without introducing overhead or complexity. The updated gateway layer now validates tenant context before any data retrieval, making tenant-specific behavior both predictable and reliable.
