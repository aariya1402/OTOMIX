# OTOMIX P08-T04-S02-M02 Implementation Report

## 1. Decision Verification

| Decision | Status | Evidence / result |
|---|---|---|
| D1 — T0 | Verified | `registry_json.grid.t0_seconds` is defined by the registry schema; missing, invalid, or `{}` registry data maps to T0 0 with `missing_t0`. Current ingest placeholder writes `{}` in `packages/gateway/src/ingest/commit.ts:57`. |
| D2 — BPM | Verified | `features.bpm` is NOT NULL and range-checked in `packages/db/migrations/001_core.sql:7`. The adapter uses `FeatureRow.bpm`; registry `bpm_seed` is ignored. |
| D3 — Duration | Verified | `tracks.duration_ms` is positive and NOT NULL in `packages/db/migrations/007_tracks_source_declarations.sql:12`. Adapter uses `duration_ms / 1000`; the gateway ingest persists milliseconds in `packages/gateway/src/ingest/dedup.ts:78-82`. |
| D4 — hasKick | Verified / P09 | P03 does not store an authoritative boolean or beat-position kick field in the registry. `hasKick` is omitted as `undefined`; `kick_status_unknown` is the fallback reason. P03 kick extraction exists as transient/grid logic, but no persisted `hasKick` source was found. |
| D5 — Anchors and fallback | Verified | Adapter calls both core functions and uses outgoing/incoming anchors exactly as specified. `drift_seconds` is always 0. Rung mapping and fallback priority are implemented in `packages/gateway/src/routes/mixplan-adapter.ts`. |
| D6 — Tenant idempotency | Verified | Redis keys are now tenant-scoped as `otomix:idem:<tenantId>:<key>`. MixPlan passes `req.body.tenant_id` to `withIdempotency`. |

## 2. P03 Kick Discovery

- P03 task text defines kick-less/static-grid behavior in [OTOMIX_MicroTask_Plan.md](/c:/Oto%20Dj%20-%20Oto%20Mix/Oto%20Mix/Docs/OtoMix%20Todo-Plan/OTOMIX_MicroTask_Plan.md:1274).
- Core P03 detects attack/grid information but exposes no persisted `hasKick` boolean: [attack.ts](/c:/Oto%20Dj%20-%20Oto%20Mix/Oto%20Mix/packages/core/src/grid/attack.ts:66), [planner.ts](/c:/Oto%20Dj%20-%20Oto%20Mix/Oto%20Mix/packages/core/src/transition/planner.ts:64).
- The registry schema has `pre_kick_beats`, but no `has_kick` or kick-position array: [feature-registry-1.2.json](/c:/Oto%20Dj%20-%20Oto%20Mix/Oto%20Mix/packages/contracts/schemas/feature-registry-1.2.json:13).
- `beats_position` is explicitly a file-position-in-seconds field, not beat-based kick status: [extract-features.ts](/c:/Oto%20Dj%20-%20Oto%20Mix/Oto%20Mix/packages/adapter/src/extract-features.ts:12).
- Result: no authoritative kick source found. The adapter sets `hasKick` to `undefined` and reports `kick_status_unknown`.

## 3. Implementation Summary

Files touched:

- `packages/gateway/src/idempotency/store.ts`
- `packages/gateway/src/routes/mixplan.ts`
- `packages/gateway/src/routes/mixplan-adapter.ts` (new)
- `packages/gateway/test/idem-store.spec.ts`
- `packages/gateway/test/mixplan-adapter.spec.ts` (new)
- `packages/gateway/test/mixplan.spec.ts`
  - tenant mismatch test: `403`
  - missing track or feature test: `404`
- Tenant mismatch now returns `403`; missing track or feature now returns `404` through `MixPlanTrackNotFoundError`.

Protected files were not edited: gateway bootstrap/index, core index/planner/anchors/types, UI files, ingest commit, plan files, and tasks JSON.

The adapter:

- resolves incoming and outgoing features tenant-scoped through `findAll(tenantId)`;
- resolves track duration through an injected `TrackRepository`;
- reads T0 with `{}`/missing fallback handling;
- uses `features.bpm`;
- converts duration from milliseconds to seconds;
- omits `hasKick` to preserve the core `undefined` behavior;
- calls `planTransition` and `computeTransitionAnchors`;
- builds P08 anchors and fallback data.

Production remains not fully mounted because `bootstrap.mts` does not inject `planTransition` and the protected bootstrap/index files were not changed.

## 4. Test Results

Gateway:

```text
pnpm exec vitest run packages/gateway/test/mixplan.spec.ts packages/gateway/test/mixplan-adapter.spec.ts packages/gateway/test/idem-store.spec.ts
Test Files: 4 passed
Tests: 20 passed
```

Core:

```text
pnpm exec vitest run packages/core/test/transition.short.spec.ts packages/core/test/transition.anchors.spec.ts packages/core/test/transition.static120.spec.ts packages/core/test/transition.forced.spec.ts
Test Files: 4 passed
Tests: 24 passed
```

Gateway build:

```text
pnpm --filter @otomix/gateway build
$ tsc
Exit: 0
```

## 5. P09 Handoff

P09 or a dedicated P09 task must establish an authoritative `hasKick` source using one of:

1. a `features.has_kick` column plus migration and extraction pipeline;
2. populated `registry_json.grid.has_kick` via an ingest/commit fix;
3. existing P03 kick-detection output mapped into persisted beat or boolean metadata.

The drift model remains P09; P08 continues to emit `drift_seconds: 0`.

## 6. Open Questions

- `TrackRepository` is not currently implemented by the gateway repository layer. A tenant-scoped implementation and database wiring are required.
- `bootstrap.mts` must inject both `IdempotencyStore` and the adapter-backed `planTransition`; protected index/bootstrap files require a separate authorized implementation step.
- The fallback `plan.reason` priority is fourth, but `hasKick` remains unknown in P08, so `kick_status_unknown` wins before unknown-rung or plan reason.
- Tenant isolation is implemented in the Redis key and tested for replay separation.

## 7. Final Session — Wiring + Integration

- Created `packages/gateway/src/repository/track-repository.ts` with tenant-scoped `findByTrackId` SQL and positive-duration filtering.
- Added `packages/gateway/test/track-repository.spec.ts`: 4 tests passed.
- Added production wiring in `packages/gateway/src/bootstrap.mts`: `TrackRepository`, `FeaturesRepository`, `createMixPlanAdapter`, and `createIdempotencyStore` are now injected into `createGatewayApp`.
- Exported the adapter and track repository from `packages/gateway/src/index.ts`; no protected handler logic was changed.
- Added `packages/gateway/test/mixplan.integration.spec.ts` using PostgreSQL and Redis testcontainers: 10 tests passed.
- Final gateway verification: 6 test files, 34 tests passed.
- Final core verification: 4 test files, 24 tests passed.
- Gateway build: `pnpm --filter @otomix/gateway build` passed.
- Production wiring no longer leaves `planTransition` absent: route construction now includes interceptor, idempotency store, and adapter-backed plan transition.
- `P08-T04-S02-M02` is `DONE` in both `OTOMIX_MicroTask_Plan.md` and `OTOMIX_MicroTask_Plan.tasks.json`.
- Plan markdown BOM remains `EF-BB-BF`; tasks JSON remains no BOM.

P09 remains open for an authoritative `hasKick` source and a production drift model. P08 still emits `drift_seconds: 0` and `kick_status_unknown` only when T0 is present and no unknown-rung condition applies.
