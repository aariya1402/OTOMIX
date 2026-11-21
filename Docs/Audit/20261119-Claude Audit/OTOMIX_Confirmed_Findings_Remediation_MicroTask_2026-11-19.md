# OTOMIX Confirmed Findings Remediation Micro-Task

**Task ID:** `AUDIT-2026-11-19-M01`  
**Status:** TODO  
**Prepared:** 2026-11-19  
**Source:** `OTOMIX_Audit_Report_2026-11-19_05-19.md`, `OTOMIX_Checkpoint_02_2026-11-19.md`, Gate-P08 supplement, and direct workspace inspection on 2026-11-19.  
**Purpose:** remediate findings confirmed against the current source tree and make the validation evidence repeatable before P08 proceeds.

> **Sizing note:** This is a tracking task, not a single small code change. It spans ingest, persistence, core configuration, worker safety, database constraints, architecture boundaries, and plan integrity. Execute the work packages below as separate reviewed changes; do not close this task until all applicable acceptance criteria pass. Do not mark any existing plan task DONE without its own required evidence.

## Goal Contract

- **Must do:** Remove or clearly quarantine placeholder feature data; enforce bounded and ordered ingest validation; fix the BPM dynamic-threshold fallback; remove the worker-pool type-check bypass; reconcile the normalization policy after owner decision; reconcile dynamic RBAC with legacy user constraints; remove core-to-database implementation dependencies; repair proven Plan/JSON/status inconsistencies; record reproducible validation evidence.
- **Must not do:** Invent owner decisions for Mixability semantics, recommendation weights/formulas, or mono/stereo policy; change unrelated dirty-worktree files; treat unavailable Docker/Testcontainers as a passing test; resolve findings disproven by source inspection as if they were bugs.
- **Preserve:** Existing API behavior except where a confirmed defect requires a reviewed contract correction; tenant isolation, RLS, idempotency, and outbox transaction semantics.
- **Done means:** Every confirmed item below is fixed or explicitly blocked on a named owner decision, the focused checks pass, the plan audit has no confirmed structural violations, and evidence is attached under this audit folder.

## Confirmed Findings and Work Packages

### CF-01 — Placeholder features are indistinguishable from analyzed features

**Evidence:** Initially confirmed in `commit.ts` and Catalog queries. Remediation now adds `analysis_status`, marks ingest-created feature rows `placeholder`, filters both Catalog reads to `complete`, and upserts validated extraction results in `FeaturesExtractionRepository`. Migration 009 conservatively keeps all pre-existing rows as `placeholder` because non-empty JSON alone does not prove provenance.

**Work:** Add a reversible migration using the next free migration number; model `placeholder`, `pending`, and `complete` explicitly; ensure catalog/recommendation reads exclude non-complete rows by default; wire the actual enrichment outcome so a row becomes `complete` only after validated extracted features are persisted. Define safe backfill behavior for existing rows and preserve RLS.

**Acceptance:** A database integration test proves placeholder/pending rows are absent from default catalog results, complete rows are visible, state transitions are correct, migration up/down works, and RLS still isolates tenants. An ingest integration test proves real extracted values replace placeholders and duplicate uploads reuse the existing result without duplicate worker execution.

**Remaining blocker:** `engine-isolated.ts` still returns static mock features and ingest only constructs an `s3://` key; no real EngineRunner/worker consumer or storage upload is wired. Do not mark rows complete from the current mock engine.

### CF-02 — Ingest buffers the request before validating its contents

**Evidence:** `ingest-local.ts` previously buffered without a cap and did not invoke the existing limiter. It now applies per-user rate limiting before stream collection, stores chunks only up to the configured byte cap, then sniffs before decoding. The route-level test proves an oversized chunked request is rejected without decoder invocation.

**Work:** Enforce a bounded request-body size while streaming; verify the mounted route order for authentication/permission and rate limiting; then apply sniff, declared limits, path/storage confinement, sandboxed decode, tag extraction, deduplication, and commit in the agreed order. Avoid buffering an unbounded body or invoking the decoder for rejected input.

**Acceptance:** An integration test proves oversized uploads are rejected before full buffering, mismatched extension/magic bytes are rejected before decoder invocation, and the mounted request path applies authentication/permission and rate limiting before body processing. Valid supported audio still reaches commit.

### CF-03 — BPM dynamic threshold ignores config and treats zero as absent

**Evidence:** `packages/core/src/features/bpm-seed.ts` reads `(cfg as any).bpmDynamicThresholdBpm || 2.0`; `packages/core/src/config/analysis-config.json` has no `bpmDynamicThresholdBpm` entry under `tempo`.

**Work:** Add and validate the decided threshold in `AnalysisConfig`; remove the unsafe cast; use nullish fallback semantics so a configured zero is respected.

**Acceptance:** The BPM-dynamic unit test covers configured threshold, configured zero, missing/invalid config if supported, and the existing static/dynamic/empty histogram cases.

### CF-04 — Worker pool disables TypeScript checks

**Evidence:** `packages/workers/src/pool.ts` begins with `// @ts-nocheck`; `Worker` is unused and `tenantId` is assigned but unused. The `d` local is used for the cast that calls `onEvent`, so it must not be deleted without inspecting the actual type and tests.

**Work:** Remove the pragma and genuinely unused code; replace unsafe casts only where required to satisfy the declared `DegradedModeController` contract. Keep per-tenant pool ownership and saturation behavior unchanged.

**Acceptance:** `pnpm -F @otomix/workers build` passes without `@ts-nocheck`; `pool-bulkhead.spec.ts` passes; a source scan finds no `@ts-nocheck` in this file.

### CF-05 — Audio normalization has duplicate implementations and conflicting defaults

**Evidence:** `packages/adapter/src/normalize.ts` reads `config.normalization.forceMono` (currently `false`), while `packages/core/src/audio/normalize.ts` defaults `forceMono` to `true`. Both define normalization behavior. This is a confirmed contract conflict; the intended storage/analysis channel policy remains an owner decision.

**Work:** Obtain and record the owner decision for stored channels versus analysis channels. Then establish one implementation with an explicit mono analysis path, make other import paths re-export/delegate, and align Spec, Addendum, and tests.

**Acceptance:** A 48 kHz stereo fixture proves the chosen storage and analysis channel counts; all supported import paths produce identical results for the same explicit policy; there is one implementation owner.

**Blocker:** Do not change the default policy until the owner records the decision.

### CF-06 — Legacy users role/tier contract needs an owner decision

**Evidence:** `001_core.sql` constrains `users.role` to four fixed roles and `users.tier` to `(1,2)`. `004_rbac.sql` creates dynamic RBAC tables but does not drop those constraints. Current `UserRepository` still writes both columns, and `packages/access/src/token/types.ts` defines `Tier = 1 | 2`; therefore, the audit's claim that dropping only the database checks enables dynamic roles/tiers is not confirmed.

**Work:** Owner/architecture decision first: declare whether `users.role/tier` are legacy identity metadata or part of the active authorization contract. Only if they are retired, update all consumers and then add a reversible migration to remove the checks. Preserve RLS and do not replace authorization with client-supplied role/tier values.

**Acceptance:** The recorded contract, repository/token types, migration behavior, and integration tests agree. If the owner retains the current contract, close this finding as not a defect without removing the checks.

**Status:** BLOCKED on owner/architecture decision; do not add the migration yet.

### CF-07 — Core imports database implementation details

**Evidence:** `packages/core/src/pipeline/extract.ts` imports `Pool` from `pg` and `withTenant` from `@otomix/db`; `packages/core/src/repository/global-features.ts` imports `Pool` from `pg`.

**Work:** Move persistence ownership to `packages/db` or introduce a lower-level port owned by core with database implementation in `db`. Keep transaction, tenant-scoping, and extracted-feature validation behavior unchanged.

**Acceptance:** Core builds without runtime or package dependency on `pg`/`@otomix/db`; the extraction and global-features tests pass; the dependency graph has no `core -> db` edge.

### CF-08 — Plan audit detects status and prerequisite inconsistencies

**Evidence:** The current full Vitest run reported failures in `tools/test/plan-audit.spec.ts`, including DONE tasks with cancelled/superseded prerequisites and Markdown markers that disagree with `tasks.json`. `P07-REG` status updates are currently not consistently reflected across both representations.

**Work:** Use `tasks.json` as the status source of truth; resolve each reported mismatch against implementation/test evidence; update Markdown from JSON using the repository's supported sync path. Re-point superseded prerequisites only when the replacement task is proven equivalent. Keep unsupported tasks TODO/BLOCKED/SUPERSEDED as appropriate.

**Acceptance:** `pnpm vitest run tools/test/plan-audit.spec.ts --no-color` passes with zero mismatched status markers, zero DONE tasks with unresolved prerequisites, zero duplicate IDs, and zero dangling prerequisites. No broad task completion claims are inferred from file existence alone.

## Owner Decisions (Not Agent-Closable)

These are tracked as decision gates, not silently converted into implementation choices:

1. Mixability is a preference or a hard gate; align Spec, plan, and UI once decided.
2. Recommendation formula and component formulas for OQ-09.
3. Meaning of the `<1%` tempo-delta rule for OQ-24 (filter, tie-break/order, or both).
4. Stored-channel and analysis-channel policy for CF-05.

Any task whose acceptance depends on these decisions remains blocked until the owner records the answer.

## Findings Excluded as Not Confirmed by Current Disk

- **Mixability weights sum to 1.20:** not confirmed. Current `analysis-config.json` weights sum to 1.00.
- **Energy implementation is only a skeleton:** not confirmed. `computeEnergy` currently computes nine configured factors and clamps the result.
- **Catalog has no pagination:** not confirmed. The current handler implements cursor pagination and a bounded limit.
- **RBAC migration never created dynamic tables:** not confirmed. `004_rbac.sql` creates them; the separate legacy user CHECK constraints are tracked in CF-06.
- **Any other finding based only on the historical Dump:** do not implement until reproduced against current source or runtime evidence.

## Verification Pack

Run focused checks after each work package, then the required repository checks:

```powershell
pnpm -r build
pnpm vitest run tools/test/plan-audit.spec.ts --no-color
pnpm test
```

The full suite is not green until Testcontainers-backed tests execute in an environment with a supported container runtime. If that runtime is unavailable, record those tests as **NOT RUN / BLOCKED**, not PASS; keep the existing prerequisite and plan-audit failures visible.

## Completion Record

| Work package | Status | Evidence / run link |
| --- | --- | --- |
| CF-01 | IN PROGRESS | Migration 009, complete-only catalog, placeholder marking, and extraction upsert implemented. Focused checks: 8/8; catalog: 3/3; migration: 14/14. Enrichment consumer/storage upload remain blocked: `engine-isolated.ts` returns static mock features and ingest only constructs an `s3://` key. |
| CF-02 | IN PROGRESS | `ingest-local.spec.ts` 5/5 and `ratelimit.spec.ts` 3/3 pass. Body cap and pre-read limiter are implemented. Still verify the mounted server route order and declared-duration handling; no duration-in-seconds audio parameter was added. |
| CF-03 | DONE | `pnpm vitest run packages/core/test/features.bpm-dynamic.spec.ts --no-color` — 5/5 pass; regression observed red first (2 failures). |
| CF-04 | DONE | `pnpm -F @otomix/workers build` and `pool-bulkhead.spec.ts` — 4/4 pass; `@ts-nocheck` and unused `Worker`/tenant field removed. |
| CF-05 | BLOCKED: owner decision | |
| CF-06 | BLOCKED: owner/architecture decision | Existing runtime and token types still use `role` and `Tier = 1 | 2`; dropping DB checks alone would not enable dynamic tiers. |
| CF-07 | DONE | Core no longer imports `pg`, `@otomix/db`, or the DB repository. Extraction persistence and global-feature repository now live in `packages/db`; focused tests 11/11 and Core/DB/Gateway builds passed. |
| CF-08 | TODO | |

**Parent task may be closed only when:** all unblocked work packages pass their acceptance criteria, CF-05's owner decision is recorded and implemented, the plan audit has zero confirmed structural failures, and required Testcontainers tests have run successfully or are explicitly accepted as a release blocker by the owner.
