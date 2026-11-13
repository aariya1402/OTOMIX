# OTOMIX Micro-Task Plan — Supplement (متمم مکمل)

**Parent document:** `OTOMIX_MicroTask_Plan.md`
**Purpose:** Complement the main micro-task plan. Captures known gaps, deferred decisions, technical gotchas, cross-phase conflicts, and unscheduled feature proposals that do **not** belong in the per-task fields of the main plan but MUST inform decisions in later phases.
**Status:** LIVE DOCUMENT — appended to as new items are discovered. Never rewrite, never renumber.
**How to use:** Before starting any phase, search this file for `[PHASE: Pnn]` (e.g. `[PHASE: P06]`) and read every match. `[BLOCKER]` items must be resolved before the phase begins. `[HIGH]`/`[MEDIUM]`/`[LOW]`/`[ADVISORY]` items are informational and should inform design decisions but do not block work.

**Legend**
- **Type:** `GAP` (missing information), `CONFLICT` (inconsistent documents), `GOTCHA` (technical trap), `DEFERRED` (intentionally postponed), `PROPOSAL` (unscheduled feature idea), `RISK` (potential future problem)
- **Severity:** `BLOCKER` / `HIGH` / `MEDIUM` / `LOW` / `ADVISORY`
- **Status:** `OPEN` / `IN-PROGRESS` / `RESOLVED` / `WONTFIX`

---

## Phase P05

### [GAP-001] [PHASE: P05, P08] [BLOCKER] Feature Registry 1.2 → 1.3 bump via BDC module
- **Discovered:** 2026-11-13
- **Source:** `Docs/FEATURES/Module 11 Breakdown Density Control (BDC).md` §11.7
- **Impact:** Per `P01-T03-S02-M02`, a major version increment purges the Feature Registry cache and enqueues re-analysis of every track. This is not optional.
- **Resolution:** When BDC is scheduled, add a migration step that calls `packages/core/src/features/cache-invalidate.ts` on the 1.2→1.3 bump. Do NOT change the schema version without calling the invalidator.
- **Related Tasks:** `P01-T03-S02-M02`, `P05-T02-S03-M02`

### [GAP-002] [PHASE: P05] [ADVISORY] New Essentia features from BDC / Smart Setlist not in current P05 scope
- **Discovered:** 2026-11-13
- **Source:** `Docs/FEATURES/Module 11 BDC.md` §11.6, `Docs/FEATURES/OTOMIX – Smart Setlist Engine Feature Proposals & Auto-Cue Parameters.md`
- **Features not in current P05-T02 scope:** `SBic`, `NoveltyCurve`, `Flux`, `ChromaCrossSimilarity`, `HPCP`, `Dissonance`, `CoverSongSimilarity`, `BpmHistogramDescriptors`.
- **Impact:** Each is a new adapter route. The Abstract API Adapter (`P05-T01`) is designed to be pluggable, so no adapter contract change is required, but each new extractor requires its own P05 micro-task when scheduled.
- **Resolution:** Add as new P05 micro-tasks when the corresponding feature is scheduled in P08.

### [GAP-003] [PHASE: P05] [ADVISORY] Era/Year flow requires metadata not extractable by Essentia
- **Source:** Smart Setlist doc, feature #3
- **Impact:** Year must come from file tags or explicit user input. `P07-T02-S01-M03` already treats tags as untrusted display hints.
- **Resolution:** When scheduling Era Flow, add a nullable `user_year_override` field to the Feature Registry (user-editable) and use only that for Era logic. Never trust the tag as source of truth.

---

## Phase P06

### [GAP-004] [PHASE: P06] [BLOCKER] Publisher/buyer authorization model blocked by OQ-10
- **Source:** `P06-T02-S03-M01`, `OQ-10`
- **Impact:** `P06-T02-S03-M01` and `P09-T03-S01-M01` are both `BLOCKED`. No work can start until the owner chooses between new scopes under `end_user` or a new role.
- **Resolution:** Owner decision required. Record decision here when received.

### [CONFLICT-005] [PHASE: P06] [HIGH] Vault client does not exist yet — P06-T01-S01-M01 relies on DI
- **Discovered:** 2026-11-13 (Match step for `P06-T01-S01-M01`)
- **Evidence:** `grep` for `vault|hvac|ExternalSecret|kid` in `packages/` returns 0 hits.
- **Impact:** `P06-T01-S01-M01` uses an injected `VaultClient` interface (`getCurrentKid()`, `getSigningKey(kid)`). Unit tests stub it. The real wrapper is deferred.
- **Resolution:** When a real Vault wrapper is implemented, add a contract test proving the stub and the real wrapper return the same `VaultClient` shape.

### [CONFLICT-006] [PHASE: P06] [BLOCKER] Rule 25 tension: gate vs preference
- **Discovered:** 2026-11-13
- **Source:** `AI Agent.MD` Rule 25 (as written) treats `mixability_score` as a hard gate; `OTOMIX_Admin_Interaction_Skill.md` and the P05→P06 handoff treat it as a preference; `ADDENDUM OVERRIDE` notes in the plan also say preference.
- **Winning position:** **Preference.** Only `Camelot` is a hard gate. `Energy` and `Mixability` are `Preference` scores that affect ranking, never rejection.
- **Impact:** `P05-T02-S02-M05` and `P08-T04-S01-M02` notes still say "gate". Any code gating on mixability violates the winning position.
- **Resolution:** Update `AI Agent.MD` Rule 25 to match the preference semantics, OR mark the old Rule 25 as superseded by `OTOMIX_Admin_Interaction_Skill.md` §5. Do this in a dedicated docs commit.

---

## Phase P07

### [GAP-007] [PHASE: P07] [MEDIUM] No explicit metadata stripping for GDPR/PII
- **Discovered:** 2026-11-13
- **Source:** No task in current plan
- **Impact:** Uploaded audio files may contain ID3 tags with personal info (artist name, album, comments). GDPR "right to erasure" applies. `P07-T02-S01-M03` treats tags as untrusted display hints but does not strip them.
- **Resolution:** When scheduling P07, add a metadata-stripping step for uploads that enter the shared library, OR document the retention policy that allows tagged PII to remain client-side only.

---

## Phase P08

### [CONFLICT-007] [PHASE: P08] [HIGH] BDC schema uses `t_start`/`t_end` in seconds — Rule 26 tension
- **Discovered:** 2026-11-13
- **Source:** `Docs/FEATURES/Module 11 BDC.md` §11.7
- **Impact:** `Rule 26` forbids `_S`/`seconds` identifiers inside `packages/core/src`. The Feature Registry lives outside core, so this is not a strict violation today. But if breakdown segment boundaries ever flow into `packages/core/src/timing/`, `grid/`, or `chop/`, they must be converted to `Beat` units via `tOfI` (or its inverse).
- **Resolution:** When BDC is implemented in P08, ensure `t_start`/`t_end` are converted to `BeatIndex` at the DSP port boundary and never enter core in seconds. Document the conversion as a `BOUNDARY_IO` bridge function.

### [GAP-008] [PHASE: P08] [HIGH] BDC REST endpoint introduces new scope + idempotency
- **Source:** BDC §11.9.1
- **Endpoint:** `PATCH /api/v1/sets/{set_id}/break-profile`
- **New requirement:** `Idempotency-Key` header required (state-mutating). Scope `local:process`.
- **Impact:** The scope registry (`P06-T02-S01-M01`) must add this route before the endpoint is built. The idempotency middleware (`P01-T06-S01-M02`) already handles the pattern.
- **Resolution:** When scheduling the BDC PATCH endpoint, first register it in `packages/gateway/src/scopes.ts` and re-run `features/authz.feature`.

### [GAP-009] [PHASE: P08] [HIGH] BDC database schema change requires new migration
- **Source:** BDC §11.9.2
- **Change:** `ALTER TABLE sets ADD COLUMN break_profile jsonb NOT NULL DEFAULT '...'` + CHECK constraint on range and enum values.
- **Impact:** New reversible migration (next number after `005_store.sql`). RLS on `sets` already exists so no policy change needed.
- **Resolution:** Add to the migration numbering sequence.

### [GAP-010] [PHASE: P08] [ADVISORY] Smart Setlist proposes 10 features not scheduled in any phase
- **Source:** `Docs/FEATURES/OTOMIX – Smart Setlist Engine Feature Proposals & Auto-Cue Parameters.md`
- **Resolution:** See `PROPOSAL-001` through `PROPOSAL-010`. Each requires explicit owner scheduling before entering the plan.

---

## Phase P09

### [GAP-011] [PHASE: P09] [ADVISORY] BDC failure matrix may affect Set persistence semantics
- **Source:** BDC §11.8.4
- **Impact:** `bdc_unsatisfied` blocks produce a plan but with a flagged explain record. The `sets` table may need to store this explain record (either inside `break_profile` JSON or a new `sets.explain` column).
- **Resolution:** Decide at `P09-T01-S01` whether `break_profile` extension already covers this or whether a separate column is needed.

---

## Phase P10

### [GAP-012] [PHASE: P10] [MEDIUM] BDC adds four new metrics not in P10 registry
- **Source:** BDC §11.11
- **New metrics:** `bdc_constraint_satisfaction_rate` (Gauge %), `bdc_fallback_tier_count{tier}` (Counter), `bdc_guard_overridden_count` (Counter), `bdc_solver_latency_ms` (Histogram).
- **Impact:** Must be added to `P10-T01-S01` registry and to `deploy/monitors/otomix.tf`.
- **Alert threshold:** `bdc_constraint_satisfaction_rate < 95%` over a rolling 1h → P2.
- **Resolution:** Add when BDC is scheduled in P08/P09.

---

## Phase P11

### [GAP-013] [PHASE: P11] [MEDIUM] Determinism matrix does not include BDC-constrained pairings
- **Source:** `P11-T01-S01-M01`
- **Impact:** Current matrix covers extreme BPM deltas, 5/4, triplet/swing, ambient, kick-less, silent, short, 4/4. It does NOT cover breakdown-anchored transitions.
- **Resolution:** When BDC is scheduled, extend the corpus generator with at least 300 pairings that carry breakdown anchors. Total matrix count rises from 10000 to 10300.

---

## Cross-Phase Conflicts

### [CONFLICT-001] [PHASE: ALL] [BLOCKER] `AI Agent.MD` claims `OTOMIX_Architecture_Spec.md` is missing — it exists
- **Discovered:** 2026-11-13
- **Evidence:** `Docs/OTOMIX_Architecture_Spec.md` is present (1573 lines). §7.4 and §7.5 verified by direct read during `P06-T01-S01-M01` Match.
- **Impact:** Any AI agent assumption that the spec is missing is wrong. Citations to §-numbered sections are valid.
- **Resolution:** Correct the "Missing Spec File" note in `AI Agent.MD` in a dedicated docs commit.

### [CONFLICT-002] [PHASE: ALL] [HIGH] Config name inconsistency: `AnalysisConfig` vs `AdminTuningConfig` vs `UserFacingConfig`
- **Source:** `AI Agent.MD` (defines `AdminTuningConfig`, `UserFacingConfig`), `OTOMIX_Admin_Interaction_Skill.md` (defines `AnalysisConfig`).
- **Impact:** `D9` says "from `AnalysisConfig`" but `Rule 25` context says `AdminTuningConfig`. Ambiguous when implementing.
- **Proposed resolution:** `AdminTuningConfig` for DSP parameters; `AnalysisConfig` for analysis/pipeline parameters; `UserFacingConfig` for UI. Each is a distinct object. `D9` applies to all three.

### [CONFLICT-003] [PHASE: ALL] [HIGH] Plan header says "no task is DONE" but body has `DONE`/`[x]`
- **Source:** `OTOMIX_MicroTask_Plan.md` header line vs. hundreds of `[x]` and `DONE` markers in the body.
- **Resolution:** Update the header sentence to reflect reality, or convert all `[x]`/`DONE` back to `TODO`. Owner decision needed.

### [CONFLICT-004] [PHASE: ALL] [HIGH] Plan status mismatch after OQ resolutions
- **Tasks affected:** `P02-T05-S01-M02`, `P03-T02-S01-M02`, `P03-T03-S01-M03`, `P03-T04-S02-M01`, `P03-T06-S01-M06`, `P04-T01-S01-M03`, `P04-T01-S02-M03`, `P04-T02-S02-M02`, `P04-T04-S03-M01`.
- **Issue:** Each is `RESOLVED`/`CANCELLED` in its title but its `Independent Test(s)` field still says `[BLOCKED]`. `OQ-05`, `OQ-06`, `OQ-07` are resolved in `AI Agent.MD` but task text is stale.
- **Resolution:** Update every affected task's `Independent Test(s)` to reference the resolved OQ and provide a real test.

### [CONFLICT-008] [PHASE: P04] [HIGH] P04 execution order anomaly
- **Issue:** `P04-T01-S02-M01` is `TODO` but `P04-T02-S01-M01` through `P04-T04-S03-M02` are `DONE`. Downstream cannot be done if upstream is not.
- **Resolution:** Either mark `P04-T01-S02-M01` done (verify it was actually implemented) or re-open its dependents. Do not proceed assuming correctness.

### [CONFLICT-009] [PHASE: ALL] [MEDIUM] Console encoding corruption in Match reports
- **Discovered:** 2026-11-13
- **Issue:** `git status --porcelain` on Windows defaults to `core.quotePath=true`, which octal-escapes non-ASCII filenames. `PowerShell` also mojibakes UTF-8 content unless `[Console]::OutputEncoding` is UTF-8.
- **Resolution:** Every Match script MUST use `git -c core.quotePath=false ...` for status and `[System.IO.File]::ReadAllText(path)` (BOM-aware) for content. Never rely on `Get-Content` for non-ASCII filenames.

---

## Technical Gotchas

### [GOTCHA-001] [PHASE: P01, P05] `testcontainers` not in `packages/core`
Use `Mock` for core tests. Testcontainers only available in `db`, `gateway`. Verify before adding a container test to core.

### [GOTCHA-002] [PHASE: P02] `heap-proof.spec.ts` flakiness
Requires `NODE_OPTIONS="--expose-gc"`. In parallel runs, V8 heap noise can fail the test. Isolate or re-run. Documented in `AI Agent.MD`.

### [GOTCHA-003] [PHASE: P02] `prekick-short.ts` uses `EPSILON = 1e-9`
IEEE-754 rounding: `-1.0000000000000002` must floor to `-1`, not `-2`. Do not change `EPSILON` without re-verifying the boundary tests.

### [GOTCHA-004] [PHASE: P05] Pact tests occasionally fail with `bad port`
Fixed to port `12345`. If a new Pact test is added, use the same port. See `P05-T01-S02-M01`.

### [GOTCHA-005] [PHASE: P05] TensorFlow models `DEFERRED`
`P05-T03-S01-M03` is stubbed. `voice_instrumental` model loading is not implemented yet. Do NOT mark tests that depend on real TF inference as PASS — they must run in stub mode with an explicit `TF_DEFERRED` flag.

### [GOTCHA-006] [PHASE: ALL] `exit 0` / `exit 1` in PowerShell crashes VS Code terminal
Always use `return`. Documented in `OTOMIX_Admin_Interaction_Skill.md` §4.

### [GOTCHA-007] [PHASE: ALL] `Set-Content -Encoding UTF8` in PowerShell 5.1 writes BOM
Use `[System.IO.File]::WriteAllText(path, content, $utf8NoBom)`. Documented in `OTOMIX_Admin_Interaction_Skill.md` §4.

### [GOTCHA-008] [PHASE: ALL] Non-ASCII filenames in Match scripts
See `CONFLICT-009`. Always `git -c core.quotePath=false`.

### [GOTCHA-009] [PHASE: P08] Redux timeline recompute is pure but heavy
`P08-T01-S02-M02` triggers a memoized recompute on every queue mutation. The memo key MUST include queue hash + all mixplan inputs. Otherwise stale timelines will render.

### [GOTCHA-010] [PHASE: P09] XML exporter manual certification
`P09-T01-S02-M02`–`M04` require manual verification in the target DJ software (Rekordbox, Traktor, VirtualDJ). Automation alone does not prove bit-correct import.

---

## Deferred Items

### [DEFERRED-001] [PHASE: P05] TensorFlow `voice_instrumental` model
Deferred per `AI Agent.MD` §2. Do not implement until explicitly unblocked.

### [DEFERRED-002] [PHASE: P05] MAEST / Discogs-EffNet embeddings for playlist similarity
Deferred per `AI Agent.MD` §2. Currently playlist similarity is not implemented with these embeddings; a placeholder similarity is used.

### [DEFERRED-003] [PHASE: P09] Serato export mechanism (OQ-12)
Serato library metadata is not natively XML. Awaiting owner decision on interchange mechanism.

### [DEFERRED-004] [PHASE: P09] Payment provider selection (OQ-13)
Awaiting owner decision on provider, currencies, webhook schema.

### [DEFERRED-005] [PHASE: P06] Publisher/buyer authorization model (OQ-10)
See `GAP-004`. Both `P06-T02-S03-M01` and `P09-T03-S01-M01` depend on this decision.

### [DEFERRED-006] [PHASE: P07] Source declaration controls (OQ-11)
`P07-T05-S01-M01` is `BLOCKED` awaiting legal/adequacy review of the proposed declaration flow.

---

## Unscheduled Feature Proposals

### [PROPOSAL-001] [PHASE: TBD] Energy Flow Designer
Build a target energy curve (Warm-up, Peak, Wave, Cool-down, Afterhours) and reorder tracks to minimize MSE against the target curve. Uses `Danceability`, `RMS`, `EnergyBandRatio`, `DynamicComplexity`.

### [PROPOSAL-002] [PHASE: TBD] Smart Harmonic Path Engine
Graph shortest-path / beam search over weighted edges (Camelot distance + `ChromaCrossSimilarity` + `Dissonance`). Not just greedy neighbor.

### [PROPOSAL-003] [PHASE: TBD] Era/Year Flow Control
`Era Block` or `Era Drift` modes. Requires user year override (see `GAP-003`).

### [PROPOSAL-004] [PHASE: TBD] Transition Style Selector
Per-pair transition style (`long blend`, `bass-swap`, `echo-out`) chosen from structural features, not a fixed crossfade.

### [PROPOSAL-005] [PHASE: TBD] Vocal Clash Guard
Crossfade windows must have at most one vocal track active. Complements `P05-T03-S01-M04`.

### [PROPOSAL-006] [PHASE: TBD] Set Variants A/B/C
Generate 2-3 alternative sets by varying weights. Shown side-by-side with an Energy Curve visualization.

### [PROPOSAL-007] [PHASE: TBD] Locked Track Reflow
Pin a track, re-optimize the rest around it. Constraint-based re-optimization.

### [PROPOSAL-008] [PHASE: TBD] Set Explainability Panel
Per-transition card: BPM delta, Camelot distance, Mixability score, transition reason. Directly from Feature Registry.

### [PROPOSAL-009] [PHASE: TBD] Duplicate/Remix Guard
`CoverSongSimilarity` between candidate pairs; block duplicates in the same set.

### [PROPOSAL-010] [PHASE: TBD] BPM Ramp Mode
Global constraint on cumulative BPM slope across the whole set (e.g. +8 to +15 BPM total). Not just pairwise matching.

---

---

## Deployment Model

### [GAP-014] [PHASE: ALL] [HIGH] Dual deployment required: cloud AND local, implemented separately
- **Discovered:** 2026-11-13
- **Source:** Owner directive
- **Directive:** `Local-First` is **one** target, not the only target. OTOMIX MUST support **both** a cloud deployment AND a local (on-device) deployment as **two separate implementations** — not one implementation behind feature flags, not runtime switching.
- **Scope:** Wherever the two targets diverge, each gets its own code path. The Abstract API Adapter (`P05-T01`) is a natural seam but each adapter implementation must exist independently. Ingestion (`P07`), extraction execution (`P05`), storage backend (`P07`), deployment topology (`P10`), and acceptance runs (`P11`) must each produce two variants.
- **Affected phases:** P05, P07, P10, P11.
- **Resolution rule:** When scheduling any affected micro-task, add a sibling micro-task for the other deployment target. Do NOT conflate the two targets in code, tests, or acceptance criteria. A single-task PR that only covers cloud or only covers local is incomplete for that phase.
- **Model details:** Owner will clarify per-model specifics when each affected phase is reached. Until then, treat both targets as first-class.
---

## Dynamic RBAC Model

### [GAP-015] [PHASE: P06, P08, P09, P10, P11] [BLOCKER] RBAC must be dynamic: permissions catalog + roles + direct grants + groups
- **Discovered:** 2026-11-13
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
| `RBAC-M01` ✅ DONE (2026-11-13, commit pending) | Migration: 8 tables + RLS + indexes + audit. | P01-T05-S01-M01 |
| `RBAC-M02` ✅ DONE (2026-11-13, 8985495) | Feature scan + seed catalog (≥40 keys). | RBAC-M01 |
| `RBAC-M03` ✅ DONE (2026-11-13) | Seed base roles. | RBAC-M02 |
| `RBAC-M04` ✅ DONE (2026-11-13) | Grant/revoke service + audit + Slack escalation. | RBAC-M03, P06-T02-S02-M01 |
| `RBAC-M05` | Effective permissions evaluator. | RBAC-M04 |
| `RBAC-M06` | Redis cache TTL 60s + LISTEN/NOTIFY invalidation. | RBAC-M05 |
| `RBAC-M07` | Bootstrap super_admin + regular_user. | RBAC-M04 |
| `RBAC-M08` | Group CRUD + time-bound group perms. | RBAC-M04 |
| `RBAC-M09` | Expiry test frozen clock T-1/T/T+1. | RBAC-M05 |
| `RBAC-M10` | Drop scopes[]/tier from token. | RBAC-M07 |
| `RBAC-M11` | Rewrite interceptor; delete scope-allowlist. | RBAC-M10, RBAC-M06 |
| `RBAC-M12` | Rewrite Cucumber from dynamic catalog. | RBAC-M11 |

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

**Migration path:** (1) M01-M09 add new model alongside; zero breakage. (2) M10 stop scopes[]; tokens expire ≤15 min. (3) M11 interceptor switch; delete old scope-allowlist. (4) M12 regenerate Cucumber. (5) downstream cleanup.

**Execution order:** Start at `RBAC-M01`. Do NOT resume `P06-T02-S03-*` or `P06-T03-*` on their old scope.


## Maintenance Rules

- **Append, do not rewrite.** New items get a new ID. Never renumber.
- **Resolve, do not delete.** When an item is resolved, set `Status: RESOLVED` and add `Resolved by:` field.
- **Phase tags mandatory.** Every item MUST have a `[PHASE: Pnn]` tag so the phase-reminder grep finds it.
- **Severity must be honest.** Only mark `[BLOCKER]` when work CANNOT proceed. Overusing `[BLOCKER]` erodes trust.
- **Sync with plan.** When a supplement item is scheduled into a phase, add a cross-reference in the plan micro-task's `Notes` field.

---

**Last updated:** 2026-11-13 (GAP-015: dynamic RBAC added)