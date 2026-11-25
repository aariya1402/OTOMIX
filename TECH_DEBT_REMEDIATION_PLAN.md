# OTOMIX Technical Debt Remediation Plan
**Generated:** 2026-11-24  
**Status:** Ready for Dev agent execution  
**Branch:** P08 (current)

---

## 🎯 Executive Summary

| Category | Count | Priority |
|----------|-------|----------|
| **BLOCKER** | 4 | 🔴 Critical — must resolve before P08/P09 |
| **HIGH** | 7 | 🟠 Urgent — before P10/P11 |
| **MEDIUM** | 3 | 🟡 Before production |
| **Plan Audit Failures** | 13 | 📋 Cleanup |

---

## 🔴 Phase 1: BLOCKER Resolution (Week 1-2)

### 1.1 GAP-015: RBAC Dynamic Model — Fix 7 DONE tasks with SUPERSEDED prerequisites
**Owner:** Dev  
**Effort:** 3-4 days  
**Files:** `packages/access/src/rbac/`, `packages/gateway/src/interceptor.ts`, `packages/gateway/src/routes/`

**Tasks:**
- [ ] **RBAC-15.1** Audit 7 tasks with `SUPERSEDED:GAP-015` prerequisite:
  - `P06-T02-S02-M01` (scope-allowlist → remove)
  - `P06-T04-S01-M01` (interceptor → rewrite for dynamic permissions)
  - `P06-T05-S01-M01` (time-bound grants → use dynamic model)
  - `P06-T07-S01-M01` (DSP propagation → use dynamic perms)
  - `P07-T03-S02-M02` (declarations → dynamic perms)
  - + 2 more from audit report
- [ ] **RBAC-15.2** Rewrite/remove each task to use dynamic permissions model:
  - `GrantService` + `GroupsService` + `RbacCache` already implemented
  - `Interceptor` must call `getEffectivePermissions()` per request
  - Remove legacy `scope-allowlist` from `scopes.ts`
- [ ] **RBAC-15.3** Update Cucumber features (`features/authz.feature`) to use dynamic catalog
- [ ] **RBAC-15.4** Fix Plan Audit failures (13 failures, mostly SUPERSEDED prerequisites)
- [ ] **RBAC-15.5** Run tests: `pnpm test --filter @otomix/access --filter @otomix/gateway`

**Acceptance:** All 7 tasks re-validated on dynamic model; Plan Audit passes (0 failures)

---

### 1.2 GAP-004: Publisher/Buyer Authorization — Owner Decision (OQ-10)
**Owner:** Dev + Product Owner  
**Effort:** 1 day (decision) + 2 days implementation  
**Files:** `packages/gateway/src/routes/`, `packages/gateway/src/scopes.ts`

**Decision Required:**
- **Option A:** New scopes under `end_user` (e.g., `publisher:manage`, `buyer:purchase`)
- **Option B:** New roles (`publisher`, `buyer`) with dynamic permissions

**Tasks:**
- [ ] **GAP-004.1** Present options to Owner; record decision in `Supplement.md`
- [ ] **GAP-004.2** Add chosen scopes/roles to `scopes.ts` and RBAC seed
- [ ] **GAP-004.3** Implement blocked endpoints:
  - `P06-T02-S03-M01` (publisher scope)
  - `P09-T03-S01-M01` (publisher sets)
- [ ] **GAP-004.4** Update Cucumber features for new auth model

**Acceptance:** Both blocked tasks unblocked; endpoints functional

---

### 1.3 CONFLICT-006: Rule 25 — Gate vs Preference Cleanup
**Owner:** Dev  
**Effort:** 1 day  
**Files:** `packages/core/src/features/mixability.ts`, `packages/core/src/transition/planner.ts`, docs

**Tasks:**
- [ ] **CONFLICT-006.1** Verify code: `planner.ts` does NOT use mixability as gate (only Camelot in `camelot-gate.ts`)
- [ ] **CONFLICT-006.2** Update `AI Agent.MD` Rule 25 to match "Preference" semantics
- [ ] **CONFLICT-006.3** Update task notes in `P05-T02-S02-M05`, `P08-T04-S01-M02` from "gate" → "preference"
- [ ] **CONFLICT-006.4** Add comment in `mixability.ts` header referencing winning position

**Acceptance:** No code uses mixability as gate; docs consistent

---

### 1.4 GAP-001: Feature Registry 1.2 → 1.3 Bump via BDC
**Owner:** Dev  
**Effort:** 2 days (part of P08 BDC implementation)  
**Files:** `packages/core/src/features/cache-invalidate.ts`, P08 BDC tasks

**Tasks:**
- [ ] **GAP-001.1** Implement BDC module (P08) — includes schema migration
- [ ] **GAP-001.2** In migration step, call `purgeOlderMajorVersions(invalidator, "1.3")`
- [ ] **GAP-001.3** Verify cache invalidation triggers re-analysis of all tracks
- [ ] **GAP-001.4** Add integration test for version bump scenario

**Acceptance:** BDC scheduled; version bump triggers cache purge + re-analysis

---

## 🟠 Phase 2: HIGH Priority (Week 3-4)

### 2.1 CONFLICT-005: Vault Client Implementation
**Files:** `packages/access/src/token/issue.ts`, new `packages/access/src/vault/`

**Tasks:**
- [ ] Implement `VaultClient` interface (`getCurrentKid()`, `getSigningKey(kid)`)
- [ ] Add contract test: stub vs real wrapper return same shape
- [ ] Integrate with token issuance (`issueAccessToken`)

---

### 2.2 CONFLICT-007: BDC Schema — Rule 26 Compliance
**Files:** `Docs/FEATURES/Module 11 BDC.md`, P08 implementation

**Tasks:**
- [ ] Ensure `t_start`/`t_end` in BDC schema converted to `BeatIndex` at DSP boundary
- [ ] Document `BOUNDARY_IO` bridge function
- [ ] No seconds identifiers in `packages/core/src/`

---

### 2.3 GAP-014: Dual Deployment (Cloud + Local)
**Scope:** Architecture-wide  
**Tasks:**
- [ ] Document divergence points (ingestion, extraction, storage, deployment)
- [ ] Create separate adapter implementations per target
- [ ] CI/CD pipelines for both targets

---

### 2.4 GAP-016: Core `pg` Dependency Declaration
**File:** `packages/core/package.json`
```json
"dependencies": {
  "@otomix/db": "workspace:*",
  "pg": "^8.11.0"  // ADD THIS
}
```

---

### 2.5 GAP-017: Logger Methods (.warn/.info/.error)
**File:** `packages/core/src/telemetry/logger.ts`
```typescript
export interface Logger {
  log(record: LogRecord): void;
  info(record: Omit<LogRecord, 'level'>): void;
  warn(record: Omit<LogRecord, 'level'>): void;
  error(record: Omit<LogRecord, 'level'>): void;
}
```

---

### 2.6 GAP-018: Workers Pool `@ts-nocheck` Removal
**File:** `packages/workers/src/pool.ts`
- [ ] Fix unused locals: `Worker`, `tenantId`, `d` in `maybeDegrade()`
- [ ] Remove `@ts-nocheck`
- [ ] Verify `pnpm lint --filter @otomix/workers` passes

---

### 2.7 GAP-020: Central UI Binding Matrix
**File:** `packages/ui/src/` (new document)
- [ ] Create `UI_BINDING_MATRIX.md` mapping:
  - UI Element → Redux Slice → Catalog Field → Feature Registry

---

## 🟡 Phase 3: MEDIUM Priority (Week 5)

### 3.1 GAP-019: `sync-and-translate.ps1` Hardcoded Branch
**File:** `tools/scripts/sync-and-translate.ps1`
- [ ] Replace `git push origin P04` with dynamic branch detection

### 3.2 GAP-029 / GAP-003: Reference Runner Benchmark
**Files:** `bench/`, `bench/observer-cycle.bench.ts`
- [ ] Implement benchmark for P05-T04-S01-M03

---

## 📋 Phase 4: Plan Audit Cleanup (Ongoing)

**File:** `Docs\OtoMix Todo-Plan\OTOMIX_Audit_Report.md` (13 failures)

**Tasks:**
- [ ] Fix 6 tasks with SUPERSEDED prerequisites (part of GAP-015)
- [ ] Fix 1 task with CANCELLED prerequisite (`P04-T03-S01-M05`)
- [ ] Fix duplicate ID in Addendum (`P05-ADD-T01-S03-M01`)
- [ ] Fix forceMono default in `normalize.ts` (Addendum vs code)
- [ ] Fix tracker status mismatches (6 items)
- [ ] Fix header vs body mismatch in `OTOMIX_MicroTask_Plan.md`

---

## 📦 Execution Order Summary

| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| **1** | BLOCKERs | GAP-015, GAP-004, CONFLICT-006, GAP-001 |
| **2** | HIGH | Vault, BDC/Rule26, Dual Deploy, pg dep, Logger, Pool, UI Matrix |
| **3** | MEDIUM | Sync script, Benchmarks |
| **4** | AUDIT | 13 Plan Audit failures |

---

## 🚀 Quick Start for Dev Agent

```bash
# 1. Start with GAP-015 (highest impact)
cd packages/access/src/rbac
# Audit 7 SUPERSEDED tasks

# 2. Run tests baseline
pnpm test --filter @otomix/access --filter @otomix/gateway

# 3. Check current lint/build status
pnpm -r lint
pnpm -r build
```

---

## 📝 Notes for Dev

- **Branch:** Work on `P08` or create feature branches per task
- **Testing:** Run `pnpm test` after each task; `pnpm -r build` before PR
- **Documentation:** Update `Supplement.md` with resolutions as you go
- **Plan Audit:** Re-run `npx vitest run tools/test/plan-audit.spec.ts` after each fix

---

**Prepared by:** QA Agent (Ivy)  
**Date:** 2026-11-24  
**Next Review:** After Sprint 1 completion