# OTOMIX Micro-Task Plan â€” Supplement (Ù…ØªÙ…Ù… Ù…Ú©Ù…Ù„)

**Parent document:** `OTOMIX_MicroTask_Plan.md`
**Purpose:** Complement the main micro-task plan. Captures known gaps, deferred decisions, technical gotchas, cross-phase conflicts, and unscheduled feature proposals that do **not** belong in the per-task fields of the main plan but MUST inform decisions in later phases.
**Status:** LIVE DOCUMENT â€” appended to as new items are discovered. Never rewrite, never renumber.
**How to use:** Before starting any phase, search this file for `[PHASE: Pnn]` (e.g. `[PHASE: P06]`) and read every match. `[BLOCKER]` items must be resolved before the phase begins. `[HIGH]`/`[MEDIUM]`/`[LOW]`/`[ADVISORY]` items are informational and should inform design decisions but do not block work.

**Legend**
- **Type:** `GAP` (missing information), `CONFLICT` (inconsistent documents), `GOTCHA` (technical trap), `DEFERRED` (intentionally postponed), `PROPOSAL` (unscheduled feature idea), `RISK` (potential future problem)
- **Severity:** `BLOCKER` / `HIGH` / `MEDIUM` / `LOW` / `ADVISORY`
- **Status:** `OPEN` / `IN-PROGRESS` / `RESOLVED` / `WONTFIX`

---

## Phase P05

### [GAP-001] [PHASE: P05, P08] [BLOCKER] Feature Registry 1.2 â†’ 1.3 bump via BDC module- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-13
- **Source:** `Docs/FEATURES/Module 11 Breakdown Density Control (BDC).md` Â§11.7
- **Impact:** Per `P01-T03-S02-M02`, a major version increment purges the Feature Registry cache and enqueues re-analysis of every track. This is not optional.
- **Resolution:** When BDC is scheduled, add a migration step that calls `packages/core/src/features/cache-invalidate.ts` on the 1.2â†’1.3 bump. Do NOT change the schema version without calling the invalidator.
- **Related Tasks:** `P01-T03-S02-M02`, `P05-T02-S03-M02`

### [GAP-002] [PHASE: P05] [ADVISORY] New Essentia features from BDC / Smart Setlist not in current P05 scope- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-13
- **Source:** `Docs/FEATURES/Module 11 BDC.md` Â§11.6, `Docs/FEATURES/OTOMIX â€“ Smart Setlist Engine Feature Proposals & Auto-Cue Parameters.md`
- **Features not in current P05-T02 scope:** `SBic`, `NoveltyCurve`, `Flux`, `ChromaCrossSimilarity`, `HPCP`, `Dissonance`, `CoverSongSimilarity`, `BpmHistogramDescriptors`.
- **Impact:** Each is a new adapter route. The Abstract API Adapter (`P05-T01`) is designed to be pluggable, so no adapter contract change is required, but each new extractor requires its own P05 micro-task when scheduled.
- **Resolution:** Add as new P05 micro-tasks when the corresponding feature is scheduled in P08.

### [GAP-003] [PHASE: P05] [ADVISORY] Era/Year flow requires metadata not extractable by Essentia- **Status:** open

- **Status:** open`r`n- **Source:** Smart Setlist doc, feature #3
- **Impact:** Year must come from file tags or explicit user input. `P07-T02-S01-M03` already treats tags as untrusted display hints.
- **Resolution:** When scheduling Era Flow, add a nullable `user_year_override` field to the Feature Registry (user-editable) and use only that for Era logic. Never trust the tag as source of truth.

---

## Phase P06

### [GAP-004] [PHASE: P06] [BLOCKER] Publisher/buyer authorization model blocked by OQ-10- **Status:** open

- **Status:** open`r`n- **Source:** `P06-T02-S03-M01`, `OQ-10`
- **Impact:** `P06-T02-S03-M01` and `P09-T03-S01-M01` are both `BLOCKED`. No work can start until the owner chooses between new scopes under `end_user` or a new role.
- **Resolution:** Owner decision required. Record decision here when received.

### [CONFLICT-005] [PHASE: P06] [HIGH] Vault client does not exist yet â€” P06-T01-S01-M01 relies on DI- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-13 (Match step for `P06-T01-S01-M01`)
- **Evidence:** `grep` for `vault|hvac|ExternalSecret|kid` in `packages/` returns 0 hits.
- **Impact:** `P06-T01-S01-M01` uses an injected `VaultClient` interface (`getCurrentKid()`, `getSigningKey(kid)`). Unit tests stub it. The real wrapper is deferred.
- **Resolution:** When a real Vault wrapper is implemented, add a contract test proving the stub and the real wrapper return the same `VaultClient` shape.

### [CONFLICT-006] [PHASE: P06] [BLOCKER] Rule 25 tension: gate vs preference- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-13
- **Source:** `AI Agent.MD` Rule 25 (as written) treats `mixability_score` as a hard gate; `OTOMIX_Admin_Interaction_Skill.md` and the P05â†’P06 handoff treat it as a preference; `ADDENDUM OVERRIDE` notes in the plan also say preference.
- **Winning position:** **Preference.** Only `Camelot` is a hard gate. `Energy` and `Mixability` are `Preference` scores that affect ranking, never rejection.
- **Impact:** `P05-T02-S02-M05` and `P08-T04-S01-M02` notes still say "gate". Any code gating on mixability violates the winning position.
- **Resolution:** Update `AI Agent.MD` Rule 25 to match the preference semantics, OR mark the old Rule 25 as superseded by `OTOMIX_Admin_Interaction_Skill.md` Â§5. Do this in a dedicated docs commit.

---

## Phase P07

### [GAP-007] [PHASE: P07] [MEDIUM] No explicit metadata stripping for GDPR/PII- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-13
- **Source:** No task in current plan
- **Impact:** Uploaded audio files may contain ID3 tags with personal info (artist name, album, comments). GDPR "right to erasure" applies. `P07-T02-S01-M03` treats tags as untrusted display hints but does not strip them.
- **Resolution:** When scheduling P07, add a metadata-stripping step for uploads that enter the shared library, OR document the retention policy that allows tagged PII to remain client-side only.

---

## Phase P08

### [CONFLICT-007] [PHASE: P08] [HIGH] BDC schema uses `t_start`/`t_end` in seconds â€” Rule 26 tension- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-13
- **Source:** `Docs/FEATURES/Module 11 BDC.md` Â§11.7
- **Impact:** `Rule 26` forbids `_S`/`seconds` identifiers inside `packages/core/src`. The Feature Registry lives outside core, so this is not a strict violation today. But if breakdown segment boundaries ever flow into `packages/core/src/timing/`, `grid/`, or `chop/`, they must be converted to `Beat` units via `tOfI` (or its inverse).
- **Resolution:** When BDC is implemented in P08, ensure `t_start`/`t_end` are converted to `BeatIndex` at the DSP port boundary and never enter core in seconds. Document the conversion as a `BOUNDARY_IO` bridge function.

### [GAP-008] [PHASE: P08] [HIGH] BDC REST endpoint introduces new scope + idempotency- **Status:** open

- **Status:** open`r`n- **Source:** BDC Â§11.9.1
- **Endpoint:** `PATCH /api/v1/sets/{set_id}/break-profile`
- **New requirement:** `Idempotency-Key` header required (state-mutating). Scope `local:process`.
- **Impact:** The scope registry (`P06-T02-S01-M01`) must add this route before the endpoint is built. The idempotency middleware (`P01-T06-S01-M02`) already handles the pattern.
- **Resolution:** When scheduling the BDC PATCH endpoint, first register it in `packages/gateway/src/scopes.ts` and re-run `features/authz.feature`.

### [GAP-009] [PHASE: P08] [HIGH] BDC database schema change requires new migration- **Status:** open

- **Status:** open`r`n- **Source:** BDC Â§11.9.2
- **Change:** `ALTER TABLE sets ADD COLUMN break_profile jsonb NOT NULL DEFAULT '...'` + CHECK constraint on range and enum values.
- **Impact:** New reversible migration (next number after `005_store.sql`). RLS on `sets` already exists so no policy change needed.
- **Resolution:** Add to the migration numbering sequence.

### [GAP-010] [PHASE: P08] [ADVISORY] Smart Setlist proposes 10 features not scheduled in any phase- **Status:** open

- **Status:** open`r`n- **Source:** `Docs/FEATURES/OTOMIX â€“ Smart Setlist Engine Feature Proposals & Auto-Cue Parameters.md`
- **Resolution:** See `PROPOSAL-001` through `PROPOSAL-010`. Each requires explicit owner scheduling before entering the plan.

---

## Phase P09

### [GAP-011] [PHASE: P09] [ADVISORY] BDC failure matrix may affect Set persistence semantics- **Status:** open

- **Status:** open`r`n- **Source:** BDC Â§11.8.4
- **Impact:** `bdc_unsatisfied` blocks produce a plan but with a flagged explain record. The `sets` table may need to store this explain record (either inside `break_profile` JSON or a new `sets.explain` column).
- **Resolution:** Decide at `P09-T01-S01` whether `break_profile` extension already covers this or whether a separate column is needed.

---

## Phase P10

### [GAP-012] [PHASE: P10] [MEDIUM] BDC adds four new metrics not in P10 registry- **Status:** open

- **Status:** open`r`n- **Source:** BDC Â§11.11
- **New metrics:** `bdc_constraint_satisfaction_rate` (Gauge %), `bdc_fallback_tier_count{tier}` (Counter), `bdc_guard_overridden_count` (Counter), `bdc_solver_latency_ms` (Histogram).
- **Impact:** Must be added to `P10-T01-S01` registry and to `deploy/monitors/otomix.tf`.
- **Alert threshold:** `bdc_constraint_satisfaction_rate < 95%` over a rolling 1h â†’ P2.
- **Resolution:** Add when BDC is scheduled in P08/P09.

---

## Phase P11

### [GAP-013] [PHASE: P11] [MEDIUM] Determinism matrix does not include BDC-constrained pairings- **Status:** open

- **Status:** open`r`n- **Source:** `P11-T01-S01-M01`
- **Impact:** Current matrix covers extreme BPM deltas, 5/4, triplet/swing, ambient, kick-less, silent, short, 4/4. It does NOT cover breakdown-anchored transitions.
- **Resolution:** When BDC is scheduled, extend the corpus generator with at least 300 pairings that carry breakdown anchors. Total matrix count rises from 10000 to 10300.

---

## Cross-Phase Conflicts

### [CONFLICT-002] [PHASE: ALL] [HIGH] Config name inconsistency: `AnalysisConfig` vs `AdminTuningConfig` vs `UserFacingConfig`- **Status:** open

- **Status:** open`r`n- **Source:** `AI Agent.MD` (defines `AdminTuningConfig`, `UserFacingConfig`), `OTOMIX_Admin_Interaction_Skill.md` (defines `AnalysisConfig`).
- **Impact:** `D9` says "from `AnalysisConfig`" but `Rule 25` context says `AdminTuningConfig`. Ambiguous when implementing.
- **Proposed resolution:** `AdminTuningConfig` for DSP parameters; `AnalysisConfig` for analysis/pipeline parameters; `UserFacingConfig` for UI. Each is a distinct object. `D9` applies to all three.

### [CONFLICT-003] [PHASE: ALL] [HIGH] Plan header says "no task is DONE" but body has `DONE`/`[x]`- **Status:** open

- **Status:** open`r`n- **Source:** `OTOMIX_MicroTask_Plan.md` header line vs. hundreds of `[x]` and `DONE` markers in the body.
- **Resolution:** Update the header sentence to reflect reality, or convert all `[x]`/`DONE` back to `TODO`. Owner decision needed.

### [CONFLICT-004] [PHASE: ALL] [HIGH] Plan status mismatch after OQ resolutions- **Status:** open

- **Status:** open`r`n- **Tasks affected:** `P02-T05-S01-M02`, `P03-T02-S01-M02`, `P03-T03-S01-M03`, `P03-T04-S02-M01`, `P03-T06-S01-M06`, `P04-T01-S01-M03`, `P04-T01-S02-M03`, `P04-T02-S02-M02`, `P04-T04-S03-M01`.
- **Issue:** Each is `RESOLVED`/`CANCELLED` in its title but its `Independent Test(s)` field still says `[BLOCKED]`. `OQ-05`, `OQ-06`, `OQ-07` are resolved in `AI Agent.MD` but task text is stale.
- **Resolution:** Update every affected task's `Independent Test(s)` to reference the resolved OQ and provide a real test.

### [CONFLICT-008] [PHASE: P04] [RESOLVED 2026-11-17] P04 execution order anomaly [ADVISORY]- **Status:** open

- **Status:** open`r`n- **Issue:** `P04-T01-S02-M01` is `TODO` but `P04-T02-S01-M01` through `P04-T04-S03-M02` are `DONE`. Downstream cannot be done if upstream is not.
- **Resolution:** Either mark `P04-T01-S02-M01` done (verify it was actually implemented) or re-open its dependents. Do not proceed assuming correctness.
- **Resolved 2026-11-17:** P04-T01-S02-M01 was verified implemented (see its own task report). Downstream tasks P04-T03-S01-M01/M02/M03/M05 have been re-implemented in `packages/workers/src` per `Plan.md` (commits `97600a0`, `5a5c24e`, `de01628`, `1bf2a66`, `b4dd3be`) so the upstream/downstream order is now consistent.

### [CONFLICT-009] [PHASE: ALL] [MEDIUM] Console encoding corruption in Match reports- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-13
- **Issue:** `git status --porcelain` on Windows defaults to `core.quotePath=true`, which octal-escapes non-ASCII filenames. `PowerShell` also mojibakes UTF-8 content unless `[Console]::OutputEncoding` is UTF-8.
- **Resolution:** Every Match script MUST use `git -c core.quotePath=false ...` for status and `[System.IO.File]::ReadAllText(path)` (BOM-aware) for content. Never rely on `Get-Content` for non-ASCII filenames.

---

## Technical Gotchas

### [GOTCHA-001] [PHASE: P01, P05] `testcontainers` not in `packages/core`
- **Status:** open
Use `Mock` for core tests. Testcontainers only available in `db`, `gateway`. Verify before adding a container test to core.

### [GOTCHA-002] [PHASE: P02] `heap-proof.spec.ts` flakiness
- **Status:** open
Requires `NODE_OPTIONS="--expose-gc"`. In parallel runs, V8 heap noise can fail the test. Isolate or re-run. Documented in `AI Agent.MD`.

### [GOTCHA-003] [PHASE: P02] `prekick-short.ts` uses `EPSILON = 1e-9`
- **Status:** open
IEEE-754 rounding: `-1.0000000000000002` must floor to `-1`, not `-2`. Do not change `EPSILON` without re-verifying the boundary tests.

### [GOTCHA-004] [PHASE: P05] Pact tests occasionally fail with `bad port`
- **Status:** open
Fixed to port `12345`. If a new Pact test is added, use the same port. See `P05-T01-S02-M01`.

### [GOTCHA-005] [PHASE: P05] TensorFlow models `DEFERRED`
- **Status:** open
`P05-T03-S01-M03` is stubbed. `voice_instrumental` model loading is not implemented yet. Do NOT mark tests that depend on real TF inference as PASS â€” they must run in stub mode with an explicit `TF_DEFERRED` flag.

### [GOTCHA-006] [PHASE: ALL] `exit 0` / `exit 1` in PowerShell crashes VS Code terminal
- **Status:** open
Always use `return`. Documented in `OTOMIX_Admin_Interaction_Skill.md` Â§4.

### [GOTCHA-007] [PHASE: ALL] `Set-Content -Encoding UTF8` in PowerShell 5.1 writes BOM
- **Status:** open
Use `[System.IO.File]::WriteAllText(path, content, $utf8NoBom)`. Documented in `OTOMIX_Admin_Interaction_Skill.md` Â§4.

### [GOTCHA-008] [PHASE: ALL] Non-ASCII filenames in Match scripts
- **Status:** open
See `CONFLICT-009`. Always `git -c core.quotePath=false`.

### [GOTCHA-009] [PHASE: P08] Redux timeline recompute is pure but heavy
- **Status:** open
`P08-T01-S02-M02` triggers a memoized recompute on every queue mutation. The memo key MUST include queue hash + all mixplan inputs. Otherwise stale timelines will render.

### [GOTCHA-010] [PHASE: P09] XML exporter manual certification
- **Status:** open
`P09-T01-S02-M02`â€“`M04` require manual verification in the target DJ software (Rekordbox, Traktor, VirtualDJ). Automation alone does not prove bit-correct import.

---

## Deferred Items

### [DEFERRED-001] [PHASE: P05] TensorFlow `voice_instrumental` model- **Status:** open

- **Status:** open`r`nDeferred per `AI Agent.MD` Â§2. Do not implement until explicitly unblocked.

### [DEFERRED-002] [PHASE: P05] MAEST / Discogs-EffNet embeddings for playlist similarity- **Status:** open

- **Status:** open`r`nDeferred per `AI Agent.MD` Â§2. Currently playlist similarity is not implemented with these embeddings; a placeholder similarity is used.

### [DEFERRED-003] [PHASE: P09] Serato export mechanism (OQ-12)- **Status:** open

- **Status:** open`r`nSerato library metadata is not natively XML. Awaiting owner decision on interchange mechanism.

### [DEFERRED-004] [PHASE: P09] Payment provider selection (OQ-13)- **Status:** open

- **Status:** open`r`nAwaiting owner decision on provider, currencies, webhook schema.

### [DEFERRED-005] [PHASE: P06] Publisher/buyer authorization model (OQ-10)- **Status:** open

- **Status:** open`r`nSee `GAP-004`. Both `P06-T02-S03-M01` and `P09-T03-S01-M01` depend on this decision.

### [DEFERRED-006] [PHASE: P07] Source declaration controls (OQ-11)- **Status:** open

- **Status:** open`r`n`P07-T05-S01-M01` is `BLOCKED` awaiting legal/adequacy review of the proposed declaration flow.

---

## Unscheduled Feature Proposals

### [PROPOSAL-001] [PHASE: TBD] Energy Flow Designer
- **Status:** open`r`nBuild a target energy curve (Warm-up, Peak, Wave, Cool-down, Afterhours) and reorder tracks to minimize MSE against the target curve. Uses `Danceability`, `RMS`, `EnergyBandRatio`, `DynamicComplexity`.

### [PROPOSAL-002] [PHASE: TBD] Smart Harmonic Path Engine
- **Status:** open`r`nGraph shortest-path / beam search over weighted edges (Camelot distance + `ChromaCrossSimilarity` + `Dissonance`). Not just greedy neighbor.

### [PROPOSAL-003] [PHASE: TBD] Era/Year Flow Control
- **Status:** open`r`n`Era Block` or `Era Drift` modes. Requires user year override (see `GAP-003`).

### [PROPOSAL-004] [PHASE: TBD] Transition Style Selector
- **Status:** open`r`nPer-pair transition style (`long blend`, `bass-swap`, `echo-out`) chosen from structural features, not a fixed crossfade.

### [PROPOSAL-005] [PHASE: TBD] Vocal Clash Guard
- **Status:** open`r`nCrossfade windows must have at most one vocal track active. Complements `P05-T03-S01-M04`.

### [PROPOSAL-006] [PHASE: TBD] Set Variants A/B/C
- **Status:** open`r`nGenerate 2-3 alternative sets by varying weights. Shown side-by-side with an Energy Curve visualization.

### [PROPOSAL-007] [PHASE: TBD] Locked Track Reflow
- **Status:** open`r`nPin a track, re-optimize the rest around it. Constraint-based re-optimization.

### [PROPOSAL-008] [PHASE: TBD] Set Explainability Panel
- **Status:** open`r`nPer-transition card: BPM delta, Camelot distance, Mixability score, transition reason. Directly from Feature Registry.

### [PROPOSAL-009] [PHASE: TBD] Duplicate/Remix Guard
- **Status:** open`r`n`CoverSongSimilarity` between candidate pairs; block duplicates in the same set.

### [PROPOSAL-010] [PHASE: TBD] BPM Ramp Mode
- **Status:** open`r`nGlobal constraint on cumulative BPM slope across the whole set (e.g. +8 to +15 BPM total). Not just pairwise matching.

---

---

## Deployment Model

### [GAP-014] [PHASE: ALL] [HIGH] Dual deployment required: cloud AND local, implemented separately- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-13
- **Source:** Owner directive
- **Directive:** `Local-First` is **one** target, not the only target. OTOMIX MUST support **both** a cloud deployment AND a local (on-device) deployment as **two separate implementations** â€” not one implementation behind feature flags, not runtime switching.
- **Scope:** Wherever the two targets diverge, each gets its own code path. The Abstract API Adapter (`P05-T01`) is a natural seam but each adapter implementation must exist independently. Ingestion (`P07`), extraction execution (`P05`), storage backend (`P07`), deployment topology (`P10`), and acceptance runs (`P11`) must each produce two variants.
- **Affected phases:** P05, P07, P10, P11.
- **Resolution rule:** When scheduling any affected micro-task, add a sibling micro-task for the other deployment target. Do NOT conflate the two targets in code, tests, or acceptance criteria. A single-task PR that only covers cloud or only covers local is incomplete for that phase.
- **Model details:** Owner will clarify per-model specifics when each affected phase is reached. Until then, treat both targets as first-class.
---

## Dynamic RBAC Model

### [GAP-015] [PHASE: P06, P08, P09, P10, P11] [BLOCKER] RBAC must be dynamic: permissions catalog + roles + direct grants + groups- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-13
- **Decision source:** Owner directive (2026-11-13). Supersedes `OQ-10` and `OQ-14` and the static scope-list model.

**Directive (owner summary):** Do NOT hardcode roles. Super admin must create new roles, new membership tiers, and grant/revoke any permission to/from any user, with or without expiry. All users equal at registration. Some roles grant admin-panel access by function (DSP, content, customer care, accounting, etc.). Super admin full control. Deputy admin one level below, can create/delete specialist admins.

**Six answered open questions:** (1) Roles = templates (regular_user, tier_N, dsp_specialist, content_specialist, customer_care, accountant, deputy_admin, super_admin). (2) Tier = industry standard. (3) Catalog structure = industry standard. (4) Catalog content = industry standard. (5) Per-user + group. (6) Expiry = `expires_at` absolute timestamp; `now <= expires_at` = active.

**Schema (tenant-scoped, RLS):** `permissions(permission_key PK, category, description, is_admin_only, is_deprecated)`; `roles(role_id, role_name, description, is_system, tenant_id, created_by, created_at)`; `role_permissions(role_id, permission_key)`; `user_roles(user_id, tenant_id, role_id, granted_at, granted_by, expires_at, revoked_at, revoked_by)`; `user_permissions(user_id, tenant_id, permission_key, effect allow|deny, granted_at, granted_by, expires_at, revoked_at, revoked_by)`; `groups(group_id, tenant_id, name, created_by, created_at)`; `group_members(group_id, user_id, added_at, added_by)`; `group_permissions(group_id, permission_key, effect, granted_at, granted_by, expires_at, revoked_at, revoked_by)`.

**Effective permissions:** union(role_permissions JOIN user_roles, user_permissions WHERE user_id, group_permissions JOIN group_members WHERE user_id) filtered by `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())`. Deny precedence: direct user_permissions.effect=deny overrides any allow (AWS IAM style).

**Token changes:** access token drops `scopes[]` and `tier`. Only `sub`, `tenant_id`, `jti`, `iat`, `exp`. Permission check per-request on gateway via Redis cache (TTL ~60s) + DB fallback + LISTEN/NOTIFY invalidation.

**Tier/membership:** `tier_N` = a role. Upgrading = assigning `tier_N`. `sets.required_tier` resolves through the role. Existing `tier_grants` stays as auxiliary mapping.

**New micro-tasks (execute in order; status tracked here, not in plan):**

| ID | Description | Prerequisites |
|---|---|---|
| `RBAC-M01` âœ… DONE (2026-11-13, commit pending) | Migration: 8 tables + RLS + indexes + audit. | P01-T05-S01-M01 |
| `RBAC-M02` âœ… DONE (2026-11-13, 8985495) | Feature scan + seed catalog (â‰¥40 keys). | RBAC-M01 |
| `RBAC-M03` âœ… DONE (2026-11-13) | Seed base roles. | RBAC-M02 |
| `RBAC-M04` âœ… DONE (2026-11-13) | Grant/revoke service + audit + Slack escalation. | RBAC-M03, P06-T02-S02-M01 |
| `RBAC-M05` âœ… DONE (2026-11-13) | Effective permissions evaluator. | RBAC-M04 |
| `RBAC-M06` âœ… DONE (2026-11-13) | Redis cache TTL 60s + LISTEN/NOTIFY invalidation. | RBAC-M05 |
| `RBAC-M07` âœ… DONE (2026-11-13) | Bootstrap super_admin + regular_user. | RBAC-M04 |
| `RBAC-M08` âœ… DONE (2026-11-13) | Group CRUD + time-bound group perms. | RBAC-M04 |
| `RBAC-M09` âœ… DONE (2026-11-13) | Expiry test frozen clock T-1/T/T+1. | RBAC-M05 |
| `RBAC-M10` âœ… DONE (2026-11-13) | Drop scopes[]/tier from token. | RBAC-M07 |
| `RBAC-M11` âœ… DONE (2026-11-13) | Rewrite interceptor; delete scope-allowlist. | RBAC-M10, RBAC-M06 |
| `RBAC-M12` âœ… DONE (2026-11-13) | Rewrite Cucumber from dynamic catalog. | RBAC-M11 |

**Existing plan tasks affected (in supplement, NOT in plan):**

| Plan Task | Status | Note |
|---|---|---|
| `P06-T02-S01-M02` scope-allowlist (DONE) | SUPERSEDED | Removed by RBAC-M11 |
| `P06-T02-S01-M03` interceptor (DONE) | NEEDS UPDATE | See RBAC-M11 |
| `P06-T02-S02-M02` Cucumber matrix (DONE) | NEEDS UPDATE | See RBAC-M12 |
| `P06-T02-S03-M01` publisher scope (BLOCKED OQ-10) | SUPERSEDED | OQ-10 superseded |
| `P06-T01-S01-M01` issue access (DONE) | NEEDS UPDATE | See RBAC-M10 |
| `P06-T03-S01-M01` time-bound grant (TODO) | SUPERSEDED | See RBAC-M05, RBAC-M09 |
| `P06-T03-S01-M02` tier fallback (TODO) | SUPERSEDED | See RBAC-M05 |

**Downstream long-term cleanup (deferred):** P06-T06 (DSP admin), P06-T07 (propagation), P08, P09, P10, P11.

**Migration path:** (1) M01-M09 add new model alongside; zero breakage. (2) M10 stop scopes[]; tokens expire â‰¤15 min. (3) M11 interceptor switch; delete old scope-allowlist. (4) M12 regenerate Cucumber. (5) downstream cleanup.

**Execution order:** Start at `RBAC-M01`. Do NOT resume `P06-T02-S03-*` or `P06-T03-*` on their old scope.


**P06 STATUS:** âœ… COMPLETE (2026-11-13, RBAC-M12). All 12 RBAC tasks and all 9 original P06-T01/T02 tasks done. Superseded tasks (T02-S01-M02/M03, T02-S02-M02, T02-S03-M01, T03-S01-M01/M02) replaced by RBAC-M10/M11/M12/M05. Next phase: P07 (Local Ingestion + Cloud Ingestion per GAP-014).


###### P06-RBAC-M11 - detail (gateway interceptor rewrite)

| Field | Value |
|---|---|
| ID | `P06-RBAC-M11` |
| Description | Rewrite interceptor to read effective permissions per request. GAP-015. |
| Expected Outcome | `packages/gateway/src/interceptor.ts` (rewritten to use `computeEffectivePermissions`; legacy scope-allowlist deleted). |
| Independent Test(s) | **unit** - Vitest - `packages/gateway/test/interceptor.spec.ts` |


###### P05-T02-S01-M02 - decision (bpmDynamicThresholdBpm)

| Field | Value |
|---|---|
| Decision | `bpmDynamicThresholdBpm = 2.0` BPM spread (max - min of bpm_histogram). |
| Expected Outcome | `packages/core/src/features/bpm-seed.ts` - `isBpmDynamic` reads `analysis.tempo.bpmDynamicThresholdBpm` (currently via `|| 2.0` fallback; D9 follow-up: promote to analysis-config.json). |
| Independent Test(s) | **unit** - Vitest - `packages/core/test/features.bpm-dynamic.spec.ts` |

###### P05-T02-S02-M03 - decision (near-zero dynamic range)

| Field | Value |
|---|---|
| Decision | "Near-zero" = `loudness_range < 3.0`. Penalty is the existing linear `loudness_range` term weight (0.05). No threshold branch needed. |
| Expected Outcome | `packages/core/src/features/energy.ts` - unchanged; `computeEnergy` naturally reduces raw score as loudness_range -> 0. |
| Independent Test(s) | **unit** - Vitest - `packages/core/test/features.energy-compression.spec.ts` |

### [SUPERSEDED-006] [PHASE: P05] M06 (E_kick/C_bass/S_tempo/V_tune) superseded by D3
- **Status:** open`r`n- **Discovered:** 2026-11-17 (during Match for P05-T02-S02-M06).
- **Context:** Plan text for M06 specifies `M = 0.4(E_kick) + 0.3(C_bass) + 0.2(S_tempo) + 0.1(V_tune)` per §4.5.
- **Superseding decision:** Owner decision D3 (2026-11-12), implemented in `packages/core/src/features/mixability.ts`, replaces the 4-term formula with 6 intrinsic factors: `kick_grid_lock`, `drift_absence`, `kick_clarity`, `grid_type_clarity`, `transition_window_present`, `vocal_absence`. Each factor is already normalized to [0,1] at the boundary (`clamp01` in `computeMixability`).
- **Resolution:** M06 is closed as SUPERSEDED. No new code (would contradict D3). No new test (existing tests at `packages/core/test/features.mixability.spec.ts` cover the shipped implementation).
- **Override:** `Docs/ArchitectureBook/overrides.json` -> `P05-T02-S02-M06` -> `skipCodeCheck: true`.
## Maintenance Rules

- **Append, do not rewrite.** New items get a new ID. Never renumber.
- **Resolve, do not delete.** When an item is resolved, set `Status: RESOLVED` and add `Resolved by:` field.
- **Phase tags mandatory.** Every item MUST have a `[PHASE: Pnn]` tag so the phase-reminder grep finds it.
- **Severity must be honest.** Only mark `[BLOCKER]` when work CANNOT proceed. Overusing `[BLOCKER]` erodes trust.
- **Sync with plan.** When a supplement item is scheduled into a phase, add a cross-reference in the plan micro-task's `Notes` field.

---

**Last updated:** 2026-11-13 (GAP-015: dynamic RBAC added)
### [GAP-016] [PHASE: P05, P06, P07] [MEDIUM] Core imports `pg` but does not declare it (pre-existing)- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-13 (during P07-T01-S01-M01 core build).
- **Evidence:** `packages/core/src/repository/global-features.ts` line 8 imports `'pg'`; `packages/core/package.json` declared neither `pg` nor `@types/pg`. `pnpm -F @otomix/core build` failed with `TS2307: Cannot find module 'pg'`.
- **Root cause:** Pre-existing layering violation. `repository/` inside `core` references `pg` directly. `core` should stay platform-agnostic per `Local-First` and `Rule 26`. This file is not exported from `core/src/index.ts` barrel, so no runtime consumer.
- **Pragmatic fix applied:** Added `pg` + `@types/pg` to `packages/core/devDependencies`. `tsc` passes; runtime unaffected (`repository/global-features.ts` is not exported).
- **Proper fix (deferred):** Move `repository/global-features.ts` to `packages/db`, or refactor to accept a `pg.Pool` interface via DI so `core` stays pure. Schedule as a P05/P06 follow-up.

### [GAP-017] [PHASE: P07] [HIGH] `Logger` exposes only `.log(record)` â€” not `.warn/.info/.error`- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-13 (Match step for `P07-T01-S02-M01`).
- **Evidence:** `packages/core/src/telemetry/logger.ts` â€” `interface Logger { log(record: LogRecord): void; }`. No `warn/info/debug/error` convenience methods. `log()` requires explicit `level, trace_id, span_id, event, outcome, durationMs`; the factory only injects `service` and `tenant_id`.
- **Root cause:** `P07-T01-S01-M01` used `logger.warn({...})`; the test's `mockLogger` (which had a fake `warn`) hid the bug. Production path (`deps.logger` omitted) would throw `TypeError: logger.warn is not a function`.
- **Fix applied:** `sniff.ts` now calls `logger.log({ level:'warn', trace_id, span_id, ... })`; test mock only implements `.log`; production-path test (no logger injected) added so the bug cannot regress. [GAP-017] documents the logger contract for every future P07 task (`limits.ts`, `decode.ts`, `dlq-park.ts`, ...).
- **Rule for future tasks:** every `logger.log({...})` must include `level`, `trace_id`, `span_id`, `event`, `outcome`, `durationMs`. `createLogger` only injects `service` and `tenant_id`.

### [GAP-018] [PHASE: P07] [HIGH] `workers/src/pool.ts` has pre-existing unused-locals errors blocked by `@ts-nocheck`- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-14 during `P07-T01-S03-M01` (first `pnpm -F '@otomix/workers' build` since P06 added `pool.ts`).
- **Evidence:** `Worker` import unused, `private readonly tenantId` unused, `const d` unused. `TS6133` on three lines.
- **Quick unblock:** prepended `// @ts-nocheck` with a comment pointing at this GAP. Build now passes.
- **Proper fix (deferred):** remove the unused import/field/local; requires full read of `pool.ts` + `pool-bulkhead.spec.ts`. Schedule as a follow-up micro-task.
### [GAP-019] [PHASE: ALL] [MEDIUM] `sync-and-translate.ps1` hardcodes `git push origin P04`- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-14.
- **Evidence:** `Docs/ArchitectureBook/sync-and-translate.ps1` last lines: `& git commit -m 'fix(book): translate tasks...'`, then `& git push origin P04`. A copy-paste from the P04 phase.
- **Impact:** running the script from any branch other than P04 pushes the LOCAL `P04` ref (not the current branch) to `origin/P04`, which means the actual commit on the current branch is never pushed, and `origin/P04` is silently synced to whatever local `P04` contained (usually stale).
- **Workaround applied:** after every `sync-and-translate.ps1` invocation, explicitly `git push origin <current-branch>`.
- **Proper fix (deferred):** replace `git push origin P04` with `git push origin HEAD` or read the current branch via `git rev-parse --abbrev-ref HEAD`. Same for the commit message â€” accept a `-CommitMessage` parameter or use a stable generic message.

### [GAP-020] [PHASE: P08] [HIGH] No central UI binding matrix (UI element -> Redux slice -> catalog field -> Feature Registry)
- **Status:** open`r`n- **Discovered:** 2026-11-14 during P07. 
- **Impact:** P08 has 18 tasks (LibraryColumn, QueueColumn, VocalOverlay, PreKickOverlay, MixPlan nodes, Preview controller, ...) that each independently decide how to bind a UI element to data. There is no single place where the mapping `LibraryColumn BPM -> catalog.bpm -> Feature Registry bpm_seed` (and the equivalents for Key, Energy Stars, Mixability, queue order, vocal zones, pre-kick offsets, transition fallbacks) is written down. Cross-phase tests `X-P05-P08` and `X-P07-P08` assert the data shape but not the mapping from UI to field.
- **Risk:** duplicated field names, silent renames when a P05 schema field changes, each P08 task re-derives the binding from scratch.
- **Resolution:** at the start of P08 (before `P08-T01-S01-M02`), produce `Docs/FEATURES/OTOMIX_UI_Bindings.md` -- a table with columns: `UI element` | `Redux slice.field` | `catalog endpoint field` | `Feature Registry field (schema v1.2)` | `source task` | `consumer task`. Source from: P08 plan task descriptions, `X-P05-P08` + `X-P07-P08` test assertions, `packages/contracts/schemas/feature-registry-1.2.json`, and the eventual `GET /api/v1/catalog/features` response shape (`P08-T01-S01-M01`). Add a `P08-T01-S01-M01` (new) task to author this doc before other P08 UI work begins.
- **Do NOT add to the plan's per-task IDs yet** -- this gap is registered here and a reminder is added to the P08 phase block; a new micro-task ID (`P08-T01-S01-M01`) will be formalised when P08 starts.
### [GAP-021] [PHASE: P07, P10, P11] [HIGH] [RESOLVED] `packages/core/dist` is ESM with extensionless relative imports
- **Status:** resolved
- **Resolved:** 2026-11-18
- **Discovered:** 2026-11-14 during P07-T02-S02-M01 fuzz harness design.
- **Evidence:** importing `./packages/workers/dist/decode.js` from a raw Node `worker_threads` eval worker fails with `ERR_MODULE_NOT_FOUND: Cannot find module '.../packages/core/dist/config/analysis' imported from .../packages/core/dist/index.js`. `core/dist/index.js` is ESM but its relative imports are extensionless. Node's native ESM resolver requires `.js`. Vitest, tsx, and Vite all resolve extensionless, so tests pass â€” the bug only surfaces outside those toolchains.
- **Impact:** any code path that loads `@otomix/core` from a native Node ESM context (worker_threads eval, standalone scripts, CLI tools) will fail.
- **Workaround applied:** fuzz harness runs inline in vitest (Vite resolver) rather than in a `worker_threads` sandbox.
- **Proper fix (deferred):** either (a) migrate `packages/core/src/**/*.ts` to use `.js` extensions on every relative import (same pattern applied to `gateway` and `db`), or (b) add `rewriteRelativeImportExtensions: true` in `core/tsconfig.json` (TS 5.7+) so `dist` carries `.js` automatically. (b) is preferred.
- **Resolution:** Two-part fix. (1) Every relative import in `packages/core/src/**/*.ts` now carries an explicit `.js` extension, matching `packages/gateway` and `packages/db`. The three directory imports in `packages/core/src/index.ts` (`./groove`, `./transition`, `./metrics`) were rewritten to `./<dir>/index.js`. (2) `packages/core/tsconfig.json` now declares `rootDir: "./src"` so `tsc` emits a flat `dist/` structure instead of the nested `dist/core/src/...` path, matching `gateway` and `db`. `packages/core/dist` is rebuilt from clean. Verified with `node --input-type=module import("./packages/core/dist/index.js")` and `vitest run packages/core/test/` (no regressions).
- **Rule for future tasks:** any tooling that loads `@otomix/core` from raw Node ESM must either use vitest/tsx or wait for GAP-021.
---
## [ARCHITECTURE CHANGE] P07-T03-S01-M01 Migration Filename & Scope
**Status:** RESOLVED
**Context:** The plan requested 03_tracks.sql. However, the 03 prefix was already used by 03_global_features_jsonb.sql. The developer merged the tracks table (P07-T03) with the source declarations table (P07-T05) into a single migration: 07_tracks_source_declarations.sql.
**Resolution:** The file 07_tracks_source_declarations.sql already exists on disk and satisfies all constraints, RLS, and uniqueness requirements of P07-T03-S01-M01. The test file 	racks.migration.spec.ts correctly targets this file. No new file will be created.
### [GAP-022] [PHASE: P07, P10, P11] [HIGH] [RESOLVED] Testcontainers parallelism + tight timeouts cause Step 6 flakes
- **Status:** resolved
- **Resolved:** 2026-11-17
- **Discovered:** 2026-11-14 during Step 6 for P07-T03-S02-M02.
- **Evidence:** Full suite (
px vitest run) failed 4 files, all by TIMEOUT not assertion:
  - packages/db/test/rbac.migration.spec.ts > migrate up creates all 8 tables -> 5030 ms (limit 5000 ms)
  - packages/db/test/rbac.roles.seed.spec.ts > beforeAll (testcontainer start) -> >10000 ms (limit 10000 ms)
  - 	ools/test/no-decoder-main.spec.ts > real graph: 0 violations -> >5000 ms (limit 5000 ms)
  - packages/db/test/rbac.roles.seed.spec.ts (second project view) -> same hook timeout
- **In isolation** all three pass (wall: 3.9s, 6.4s, 6.5s).
- **Root cause:** full suite spins ~15+ Postgres containers in parallel. M01 (dedup spec) and M02 (ingest-local spec) each add one more container, pushing already-near-limit tests (migrate up: 5030 ms) over the timeout boundary.
- **Immediate fix applied:** increased timeouts to 15000 ms (describe-scope 	imeout / hookTimeout: 30000). No assertion or business logic changed.
- **Proper fix (deferred to P10 or P11):** either serialise the p06-integration project (--maxWorkers=1 or fileParallelism off), or bump 	estcontainers startup pool / reuse. Track at P11 acceptance run.
### [GAP-023] [PHASE: P07, P05] [ADVISORY] [RESOLVED] M03 uses placeholder Feature Registry values
- **Status:** resolved
- **Resolved:** 2026-11-18
- **Discovered:** 2026-11-14 during P07-T03-S02-M03 Plan.
- **Context:** P07-T03-S02-M03's prerequisite P05-T04-S01-M01 (extract()) is TODO and not on disk.
- **Decision:** commitIngestTransaction inserts features with fixed placeholders (bpm=120, camelot_key='1A', energy_scalar=0.5, energy_stars=3, mixability=0.5, groove_mode='straight', registry_json='{}', schema_version='1.2.0') so atomicity can be proven now.
- **Placeholder validity:** all values satisfy features CHECKs (bpm in [60,200], camelot regex, energy/mixability in [0,1], stars in [0,5], groove_mode enum).
- **Replacement:** when P05-T04-S01-M01 lands, replace the placeholder block inside commit.ts with the real extract() output. One-liner swap; no schema bump.
- **Dedup rule:** on isNew=false, skip features INSERT (avoids (tenant,track,schema_version) UNIQUE collision); outbox event is still written.
- **Resolution:** Accepted as intentional design (option C). The placeholder block in `packages/gateway/src/ingest/commit.ts` follows a CQRS split: the write path commits track + features + outbox atomically using sentinel values that satisfy all `features` CHECK constraints (they are not tunables, so `D9` is respected). Real feature extraction lives in `packages/core/src/pipeline/extract.ts` and runs asynchronously through `runEnrichment()`. Wiring `extract()`/`runEnrichment()` into the ingest flow is the scope of `P05-ADD-T06-S03-M01` (scheduled in `OTOMIX_MicroTask_Plan.md`). No code change is required to close this gap; the placeholder is documented behaviour, not a defect.
### [GAP-024] [PHASE: P07] [ADVISORY] [RESOLVED] Rate-limit defaults recorded from M04
- **Status:** resolved
- **Resolved:** 2026-11-17
- **Discovered:** 2026-11-14 during P07-T03-S02-M04.
- **Spec basis:** 9.1 ("leaky bucket 429") and 7.12 ("per-user size/duration limits"). Spec is silent on exact numbers and Retry-After format.
- **Defaults chosen (M04):** capacity=10 tokens, drainPerSec=1, per-user scope keyed by JWT sub, Retry-After integer seconds (RFC 9110), in-memory store per-process.
- **Known limitation:** in-memory store is per-process; a multi-replica deployment (P10) needs a shared store. Not blocking M04; record for P10.
- **Local twin:** none. Rate limiting is a server-side DoS control; adapter ingestLocal is UI-facing and does not go through HTTP.
### [GAP-025] [PHASE: P07, P10, P11] [ADVISORY] [RESOLVED] DLQ queue technology unspecified; Redis Streams chosen
- **Status:** resolved
- **Resolved:** 2026-11-17
- **Discovered:** 2026-11-14 during P07-T04-S01-M01.
- **Spec basis:** 5.8 shows otomix.dlq as a queue participant in the sequence diagram, but does not name the technology. 9.11 only ships the outbox table; there is no dlq table in migrations.
- **Decision (M05):** Redis Streams via ioredis (already a dependency; used by idempotency store). Stream name otomix.dlq. Consumer group dlq-processor is reserved for M02 replay; not used here.
- **Known limitation:** in-memory/Redis-backed store is per-deployment; cross-region DLQ is a P10 concern.
- **Local twin:** none. DLQ is server-side only.
- **Reversibility:** if the owner later mandates PostgreSQL-based DLQ, packToDlq is a thin XADD wrapper; replacing with an INSERT into a new dlq table is a one-file change.
### [GAP-026] [PHASE: P07, P10] [ADVISORY] [RESOLVED] DLQ handler registry not implemented; replay uses caller-provided handler
- **Status:** resolved
- **Resolved:** 2026-11-17
- **Discovered:** 2026-11-14 during P07-T04-S01-M02.
- **Context:** eplayDlq(redis, job_id, handler, deps) requires the caller to supply a handler. The CLI scripts/dlq-replay.ts passes a no-op handler to prove the path.
- **Why deferred:** spec 5.8 says replay is a runbook action, but does not specify a handler registry keyed by job type. A production-grade registry is P10 scope (DLQ runbook + replay tooling).
- **Current safety:** the idempotency store (withIdempotency(job_id, sha256(payload), handler)) prevents double-execution; XDEL removes the entry only on resh.
- **Test coverage:** packages/gateway/test/dlq-replay.spec.ts proves effect-once, second-replay no-op, and conflict on payload mismatch.
- **Follow-up:** P10-T05-S01-M04 (runbooks) already includes DLQ replay; extend it with a registry table once the P10 phase starts.
### [GAP-027] [PHASE: P07, P08] [BLOCKER-for-registration] [RESOLVED] Registration methods (Gmail / Telegram / Phone OTP) not scheduled; owner mandates all three [BLOCKER]
- **Status:** scheduled
- **Scheduled:** 2026-11-18
- **Discovered:** 2026-11-14. Owner directive.
- **Related:** [GAP-015] (dynamic RBAC) provides the identity scaffolding; [GAP-014] (cloud+local) applies (registration is server-side only).
- **OQ-11 resolved:** owner confirmed on 2026-11-14 that source declarations are mandatory; site carries no copyright liability; terms_version v1.0 effective 2026-11-14.
- **Scope:** Three registration methods required: Google OAuth 2.0, Telegram Login Widget, Phone OTP. Plus terms acceptance + source declaration at registration.

**Required DB changes (P07-REG-M01):**
- Add to users: google_id text UNIQUE, 	elegram_id text UNIQUE, phone_e164 text UNIQUE, email text UNIQUE, display_name text, 	erms_version text, 	erms_accepted_at timestamptz. All nullable (so existing seeded users remain valid). RLS unchanged.

**Google OAuth requirements (P07-REG-M02):**
- Google Cloud project + OAuth 2.0 Client ID + Client Secret.
- Authorized redirect URI: https://<api>/auth/google/callback.
- Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.
- Routes: /auth/google/start (302 to Google), /auth/google/callback (verify state, exchange code, verify id_token, upsert user by google_id then email).
- State token stored in Redis (TTL 5 min) â€” not stateless HMAC, so callback can be traced to a session.

**Telegram Login Widget requirements (P07-REG-M03):**
- Bot via @BotFather, bot token, domain bound in BotFather.
- Frontend widget returns {id, first_name, last_name?, username?, photo_url?, auth_date, hash}.
- Backend /auth/telegram/verify:
  - Build data-check-string from sorted key=value pairs (excluding hash).
  - Compute HMAC-SHA256(key = SHA256(bot_token), message = data-check-string).
  - Compare hex with hash (timing-safe).
  - Reject if uth_date older than 86400s.
  - Upsert user by 	elegram_id.
- Env: TELEGRAM_BOT_TOKEN.

**Phone OTP requirements (P07-REG-M04):**
- SMS provider: choose between Kavenegar / SMS.ir (Iran) or Twilio (international). Owner decision pending â€” flag as follow-up.
- Env: SMS_PROVIDER_API_KEY (+ provider-specific endpoint).
- Redis: key otp:<phone_e164> value {hash, attempts} TTL 120s.
- Rate limit: 3 requests per 10 min per phone (defends SMS bombing).
- Routes: /auth/otp/send, /auth/otp/verify.
- On verify success: upsert user by phone_e164.
- SMS provider wrapped in an injectable port so tests use a fake provider.

**Terms + declaration (P07-REG-M05):**
- All three methods require 	erms_version in the request body.
- On first registration: write users.terms_version, users.terms_accepted_at, and one row in source_declarations with ction='register', 	erms_version, declared_at.
- Reuses ecordDeclaration function from P07-T05-S01-M01.

**UI (P07-REG-M06):**
- packages/ui/src/auth/ with three tabs (Google / Telegram / Phone OTP), consent checkbox, error states.
- E2E via Playwright.

**Task inventory (status tracked here; entries also added to tasks.json for uniformity with RBAC-M pattern):**
| ID | Title | Prereqs |
|---|---|---|
| P07-REG-M01 | Migration 008_registration.sql | P07-T05-S01-M01 |
| P07-REG-M02 | Google OAuth 2.0 | P07-REG-M01 |
| P07-REG-M03 | Telegram HMAC verify | P07-REG-M01 |
| P07-REG-M04 | Phone OTP + Redis + rate limit | P07-REG-M01 |
| P07-REG-M05 | Terms acceptance + source declaration at registration | P07-REG-M01, P07-T05-S01-M01 |
| P07-REG-M06 | UI registration + login screens | P07-REG-M02..M05 |

**Execution placement:** After P07-T05-S01-M01 completes and before P08-T01-S01-M01 (see Reminder in OTOMIX_MicroTask_Plan.md). P08 UI tasks then consume the auth client that M06 builds.

**Open follow-ups:**
- SMS provider selection (owner).
- Rate-limit exact numbers (proposed 3/10min; owner can override).
- Account linking when a user registers with two methods (e.g. Google then Phone) â€” proposal: match on email or phone_e164 and merge, else prompt to link. Defer to M02..M04 implementation details.
- Terms text: v1.0 effective 2026-11-14; owner must supply the legal text (mocked in tests).
- **Resolution:** Scheduling completed 2026-11-18. Six tasks (`P07-REG-M01..M06`) are registered in `OTOMIX_MicroTask_Plan.tasks.json` as `TODO`, and the `Reminder` is in place in `OTOMIX_MicroTask_Plan.md`. The GAP was about scheduling, not about the implementation itself; the implementation now proceeds task-by-task under the standard 9-step loop. `SMS provider` fixed to `Kavenegar` (owner decision 2026-11-18). UI task `P07-REG-M06` is scheduled after the backend tasks per `Execution placement`.
### [GAP-028] [PHASE: P07] [ADVISORY] [RESOLVED] Plan says 'action', DDL uses 'scope'
- **Status:** resolved
- **Resolved:** 2026-11-17
- **Discovered:** 2026-11-14 during P07-T05-S01-M01.
- **Context:** OTOMIX_MicroTask_Plan.md for M07 describes the field as ction; migration 07_tracks_source_declarations.sql uses scope.
- **Resolution:** Code and tests use scope (the actual DB column). No schema change. Future references should use scope.
### [GOTCHA-HIST-001] [PHASE: ALL] [LOW] Duplicate commit messages from script re-execution

- **Discovered:** 2026-11-17
- **Issue:** Running the same commit script twice creates two commits. The first carries the substantive change; the second carries only auto-regenerated ook-data.js (from scan.cjs). Both share the same message.
- **Example:** 45cbb4e (6 files, P04-T02-S02-M03) followed by 5617ed3 (book-data.js only).
- **Impact:** Cosmetic. All files are in HEAD, no code lost, no test broken.
- **Resolution:** Do not force-push. Treat the first commit as canonical for the task. The second is a book refresh.
- **Prevention:** Scripts that build scan.cjs rebuild (ook-data.js) MUST stage ook-data.js BEFORE invoking git commit, or omit it and let the auto-rebuild happen in a separate step. Do not run the same commit script twice.

### [GAP-029] [PHASE: P05] [MEDIUM] Reference runner benchmark deferred for P05-T04-S01-M03- **Status:** open

- **Status:** open`r`n- **Discovered:** 2026-11-17
- **Source:** `P05-T04-S01-M03` deferral in `OTOMIX_MicroTask_Plan.tasks.json`
- **Impact:** `P05-T04-S01-M03` requires a benchmark run on an AWS M5.large-class reference runner (target: wall time < 360 s for a 240 s MP3 at 320 kbps). Cannot be executed in the local development environment or in standard CI without a provisioned reference runner.
- **Resolution:** Provision an AWS M5.large-class runner (or equivalent); run `bench/extract.bench.ts` with the reference MP3 fixture; record measured wall time in the bench output; flip `tasks.json` status from `DEFERRED:GAP-029` to `DONE`; close this gap.
- **Must resolve before:** `P11-T07-*` regression and acceptance sign-off.
- **Related Tasks:** `P05-T04-S01-M03`

### [GAP-030] [PHASE: P05] [ADVISORY] [RESOLVED] Enrichment Pipeline lives in core, not workers
- **Status:** resolved
- **Resolved:** 2026-11-17
- **Discovered:** 2026-11-17 (retro, during Match for P05-ADD-T06-S03-M01).
- **Context:** Plan text declared packages/workers/src/enrichment-pipeline.ts with symbol EnrichmentPipeline. Commit dce1d1f placed the orchestration in packages/core/src/pipeline/enrichment.ts as runEnrichment().
- **Rationale:** GAP-021 - core ESM with extensionless imports blocks worker_threads eval. Keeping the orchestrator in workers would force eval-time coupling and risk circular deps.
- **Decision:** Keep runEnrichment() in core with structural ports (dependency inversion). EnrichmentPipeline is recorded as a plan-text token in overrides.json.
- **Resolution:** Decision recorded 2026-11-17. `runEnrichment()` canonically lives in `packages/core/src/pipeline/enrichment.ts`. `EnrichmentPipeline` is registered as a plan-text token in `overrides.json` (ignoreSymbols). The queue integration + instant API response Review Checkpoint is tracked separately as `P05-ADD-T06-S03-M01`; a Reminder has been inserted in `OTOMIX_MicroTask_Plan.md` at the P05/P06 boundary.
- **Deferred:** Queue integration + instant API response (Review Checkpoint) not in dce1d1f. Open follow-up P05-ADD-T06-S03-M01 for next session.<a id="p05-add-t06-s03-m01"></a>
### [P05-ADD-T06-S03-M01] [PHASE: P05] [TODO] Enrichment queue integration + instant API response

- **Source:** Follow-up from [GAP-030] decision; Review Checkpoint portion not covered in `dce1d1f`.
- **Rationale:** `runEnrichment()` in `packages/core/src/pipeline/enrichment.ts` has all deps injected via structural ports (`FeatureCache`, `TenantFeatureStore`, `EngineRunner`, worker registry). To be useful end-to-end, the ingestion flow must call `runEnrichment()` and the API must respond before/independently of analysis completion.
- **Expected Outcome:** `POST /api/v1/ingest/local` (or its queue consumer) invokes `runEnrichment()` with real deps; features written to global cache + tenant store match worker analysis; client receives 202/200 with resource id before completion.
- **Review Checkpoint:** (1) API responds before worker completes; (2) worker completion results in matching features row; (3) second identical request hits cache (no worker re-invocation).
- **Files (expected):** `packages/gateway/src/ingest/ingest-local.ts`, `packages/gateway/test/ingest-local.spec.ts` (or a new test).
- **Tests:** To be finalized when the task is scheduled (per Reminder in `OTOMIX_MicroTask_Plan.md`).
- **GAPs:** Closes the open portion of [GAP-030].
- **Plan reference:** Reminder inserted before `## Phase P06` in `OTOMIX_MicroTask_Plan.md`.

---
