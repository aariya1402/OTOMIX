# OTOMIX Micro-Task Plan — Supplement: GATE-0 (Pre-P08 Stabilization)

**Document:** `OTOMIX_MicroTask_Plan_Supplement_Gate_P08.md`
**Prepared:** 2026-11-19 05:22 UTC · **Source:** Audit Report of the same date (findings B-01..B-13, R-01..R-13, F-01..F-19)
**Purpose:** close the gap between "P01–P07 done" and the P08 Entry Criteria; add missing micro-tasks; re-baseline stale statuses. **Does not rewrite history** — it overlays the main plan, like `P06-RBAC-M*` and `P07-REG-M*`.
**Language rule:** task fields are English (so `sync-and-translate.ps1` can translate them); explanations are Persian.

---

## A. محل شروع (Where to start / where to paste)

| کار | محل دقیق نسبت به فایل‌های موجود |
|---|---|
| ذخیرهٔ این فایل | `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan_Supplement_Gate_P08.md` (کنار `..._Supplement.md`) |
| ثبت در `OTOMIX_MicroTask_Plan.tasks.json` | همان الگوی RBAC-M / REG-M: همهٔ شناسه‌های این فایل با وضعیت `TODO` |
| Reminder در `OTOMIX_MicroTask_Plan.md` | **درست پیش از خط** `### P08 MixPlan, UI & Redux Architecture` (حدود خط ۲۸۴۵): «Entry criterion: all `GATE0-*` tasks tagged CRITICAL are DONE. See Supplement Gate_P08.» |
| به‌روزرسانی Entry criteria P08 | همان‌جا، به bullet اول: «P03, P04, P05, P06, P07 exit criteria met **and GATE-0 closed**» |
| در `..._Supplement.md` | زیر عنوان `## Maintenance Rules`: یک خط ارجاع «GATE-0 tracked in Supplement_Gate_P08» |
| **اولین قدم اجرا** | `GATE0-DEC-M01` (تصمیم) **و موازی** `GATE0-VER-M01` (خط پایهٔ build/test) |
| **اولین تسک کدنویسی** | `GATE0-VER-M02` (ترتیب پایپ‌لاین ingest) |
| **تسک‌های Plan اصلی که بعد از Gate-0 شروع می‌شوند** | نخست `P08-T04-S02-M01`, `P08-T04-S02-M02` (از همین حالا آزادند)، سپس `P08-T01-S01-M01` (پس از `GATE0-DOC-M03`) |

### A.۲ موج‌های اجرا
| موج | تسک‌ها | شرط عبور |
|---|---|---|
| W0 (موازی) | DEC-M01, DEC-M02, DEC-M03, DOC-M01, VER-M01 | تصمیم‌ها ثبت و وضعیت‌ها بازمبنا شده |
| W1 | VER-M02, P05-M01..M07 | `extract()` واقعی روی ingest؛ بدون placeholder در کاتالوگ |
| W2 | SEC-M01, DOC-M03 | سقف ۵۱۲MB فعال؛ سند UI Bindings آماده |
| W3 | CHK-M01 | اسکریپت Gate-0 سبز |
| موازی با P08 | DOC-M02, VER-M03, SEC-M02..M04, X-* , P08-PRE-M01 | ربطی به شروع P08 ندارند |

**برچسب CRITICAL:** DEC-M01..M03, DOC-M01, DOC-M03, VER-M01, VER-M02, P05-M01..M07, SEC-M01, CHK-M01 (۱۶ مورد از ۲۱ تسک Gate-0).

---

## B. بازمبنایی وضعیت‌ها (بدون کد — فقط به‌روزرسانی Plan/JSON)

| تسک | وضعیت فعلی در Plan-MD | وضعیت پیشنهادی | مستند |
|---|---|---|---|
| `P04-T01-S02-M01` | TODO | DONE (verified) | CONFLICT-008 |
| `P05-T02-S01-M02` | BLOCKED OQ-20 | RESOLVED (`bpmDynamicThresholdBpm=2.0`) | Supplement decision |
| `P05-T02-S02-M03` | BLOCKED OQ-21 | RESOLVED (`loudness_range<3.0`) | Supplement decision |
| `P05-T02-S02-M05`, `-M06` | TODO | SUPERSEDED by D3 | SUPERSEDED-006 |
| `P06-T02-S01-M02`, `P06-T02-S03-M01` | TODO / BLOCKED | SUPERSEDED | GAP-015 |
| `P06-T02-S01-M03`, `P06-T02-S02-M02` | TODO | DONE via `P06-RBAC-M11` / `-M12` | GAP-015 |
| `P06-T03-S01-M01`, `-M02` | TODO | SUPERSEDED by `P06-RBAC-M05`, `-M09` | GAP-015 |
| `P07-T05-S01-M01` | BLOCKED OQ-11 | TODO (OQ-11 resolved 2026-11-14) | GAP-027 |
| `P07-REG-M02` | heading `[x]`, Status TODO | make consistent after verification | audit |
| `P05-ADD-T06-S03-M01` | `[x]` in Addendum | TODO (queue integration open) | Supplement/GAP-030 |

### B.۲ بازاشاره پیش‌نیازها (re-pointing)
| تسک | پیش‌نیاز قدیمی | پیش‌نیاز جدید |
|---|---|---|
| `P07-T03-S02-M02` | `P06-T02-S01-M03` | `P06-RBAC-M11` |
| `P08-T01-S01-M01` | `P06-T02-S01-M03` | `P06-RBAC-M11`, `GATE0-DOC-M03`, `GATE0-P05-M07` |
| `P08-T04-S02-M02` | `P06-T02-S01-M03` | `P06-RBAC-M11` |
| `P09-T01-S01-M04`, `P09-T04-S01-M01` | `P06-T02-S01-M03`, `P06-T03-S01-M02` | `P06-RBAC-M11`, `P06-RBAC-M05` |
| `P09-T03-S01-M01` | OQ-10 | permission keys در کاتالوگ RBAC (GAP-015) |
| `P08-T02-S01-M01` (UI) | — | + `P07-REG-M06` |

---

## C. میکروتسک‌ها

### موج W0 — تصمیم‌ها و خط پایه

###### GATE0-DEC-M01 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-DEC-M01` |
| Description | Owner records the final Mixability semantics (D3 Preference confirmed or amended) and the engineer syncs every document: Spec §4.5/§4.8/§4.9, JSON Schema `class` enum, constants `UNMIXABLE_BELOW`/`MIX_WEIGHTS`, notes of `P08-T01-S01-M02` and `P08-T04-S01-M02`; close `CONFLICT-006`. |
| Expected Outcome | Edited `OTOMIX_Architecture_Spec.md`; `Docs/ArchitectureBook/overrides.json` entries; Supplement entry closing CONFLICT-006. |
| Prerequisites | None |
| Independent Test(s) | **unit** · Vitest · `tools/test/docs-consistency.spec.ts`<br>Input: grep Spec, plan, constants. Expected: no occurrence of "excluded from" / `UNMIXABLE_BELOW` as a filter. Pass: 0 matches. |
| Spec Reference | OTOMIX §4.5 · Addendum D3 · CONFLICT-006 |
| Review Checkpoint | Confirm `AI Agent.MD` Rule 25 text now matches. |
| Notes | Camelot remains the only hard gate. If owner keeps a *soft* low-mixability warning, define it as UI-only (never filtering the library). |

###### GATE0-DEC-M02 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-DEC-M02` |
| Description | Owner picks ONE recommendation formula (Spec 0.6/0.3/0.1, or 0.4M/0.3C/0.2T/0.1E, or config-driven compat score) and answers OQ-09 (component formulas) and OQ-24 (meaning of "strictly limits tempo deltas <1%"). |
| Expected Outcome | Decision block in Supplement; `RECO_WEIGHTS` in `packages/core/src/constants/scoring.ts` and/or `analysis-config.json`; OQ-09/OQ-24 closed. |
| Prerequisites | `GATE0-DEC-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/constants.scoring.spec.ts`<br>Input: import weights. Expected: Σ weights = 1.0 and equals the decided values. Pass: equal. |
| Spec Reference | OTOMIX §4.9 · OQ-09 · OQ-24 |
| Review Checkpoint | Confirm Spec §4.9, plan P01-T02-S01-M03 and P08-T04-S01-M02 state the same numbers. |
| Notes | Unblocks `P08-T04-S01-M01` and `-M03`. |

###### GATE0-DEC-M03 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-DEC-M03` |
| Description | Decide the channel policy: stereo kept for storage with explicit mono downmix for Essentia, or mono default. Update Spec §4.1, `P05-T01-S01-M01`, `P07-T01-S03-M01` and the Addendum accordingly. |
| Expected Outcome | Decision recorded; Addendum `P05-ADD-T01-S02-M01` annotated. |
| Prerequisites | None |
| Independent Test(s) | **unit** · Vitest · `packages/adapter/test/normalize.policy.spec.ts`<br>Input: 48 kHz stereo. Expected: output channels equal the decided policy for storage and for analysis path. Pass: both. |
| Spec Reference | OTOMIX §4.1 · Addendum P05-ADD-T01-S02-M01 |
| Review Checkpoint | Confirm WASM memory estimate (P06-T05) uses the chosen channel count. |
| Notes | Essentia algorithms expect mono; stereo doubles buffer memory. |

###### GATE0-DOC-M01 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-DOC-M01` |
| Description | Apply section B (status flips and prerequisite re-pointing) to `OTOMIX_MicroTask_Plan.md` and `OTOMIX_MicroTask_Plan.tasks.json`; regenerate the MD from JSON, not the reverse. |
| Expected Outcome | Updated plan files; `tools/scripts/plan-sync.ts` (one-way JSON→MD). |
| Prerequisites | None |
| Independent Test(s) | **unit** · Vitest · `tools/test/plan-sync.spec.ts`<br>Input: JSON fixture with 3 statuses. Expected: MD shows identical statuses; round-trip stable. Pass: byte-equal. |
| Spec Reference | CONFLICT-003, CONFLICT-004 |
| Review Checkpoint | Re-run the audit: "DONE with non-done prerequisite" count must be 0. |
| Notes | Fix header sentence "No task is marked DONE". |

###### GATE0-VER-M01 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-VER-M01` |
| Description | Run the Verification Pack (Audit Report §12) and store results: build status per package, test totals (pass/fail/skip/flaky), grep outputs. |
| Expected Outcome | `reports/baseline-<date>.json` and `reports/baseline-<date>.md`. |
| Prerequisites | None |
| Independent Test(s) | **build** · pnpm · `pnpm -r build` → exit 0; `pnpm -r test` → record counts. |
| Spec Reference | Audit Report §12 |
| Review Checkpoint | Upload both files to the next audit session to upgrade `[needs verification]` findings. |
| Notes | PowerShell: avoid `exit` inside scripts (GOTCHA-006); use `git -c core.quotePath=false`. |

### موج W1 — ترتیب ingest و واقعی‌سازی داده

###### GATE0-VER-M02 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-VER-M02` |
| Description | Verify and enforce the ingest order in `ingest-local.ts`: rate-limit → auth/permission → sniff → limits → confine → decode (sandboxed) → tags → dedup → commit. Add a test that fails if `decode` runs before `sniff`. |
| Expected Outcome | `packages/gateway/src/routes/ingest-local.ts` (order fixed if needed); `packages/gateway/test/ingest-order.spec.ts`. |
| Prerequisites | `GATE0-VER-M01` |
| Independent Test(s) | **integration** · Vitest + supertest · `packages/gateway/test/ingest-order.spec.ts`<br>Input: a file with `.mp3` name and ZIP magic bytes; spy on decoder. Expected: 400 INVALID_ARGUMENT and decoder never invoked; flood of 11 requests yields 429 before any body read. Pass: all. |
| Spec Reference | OTOMIX §5.3 · P07-T01-S01..S03 |
| Review Checkpoint | Confirm gateway/UI main thread never imports container decoders (P07-T02-S01-M01). |
| Notes | Audit finding B-02. |

###### GATE0-P05-M01 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-P05-M01` |
| Description | Normalize Mixability weights so Σ = 1.0 (or document and test the intentional saturation) and add an invariant test over `analysis-config.json`. |
| Expected Outcome | `packages/core/src/config/analysis-config.json`; `packages/core/test/config.weights-sum.spec.ts`. |
| Prerequisites | `GATE0-DEC-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/config.weights-sum.spec.ts`<br>Input: config. Expected: Σ(mixability.weights)=1.0 ±1e-9, same for energy. Pass: both. |
| Spec Reference | Addendum P05-ADD-T01-S01-M01 · D9 |
| Review Checkpoint | Confirm a perfect track scores 1.0 and a 0.83-everywhere track does not saturate. |
| Notes | Audit finding B-03 (current sum 1.20). |

###### GATE0-P05-M02 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-P05-M02` |
| Description | Apply the `GATE0-DEC-M03` policy: fix `forceMono` default in `core/audio/normalize.ts`, and keep exactly one `normalizeInput` implementation (the other re-exports it). |
| Expected Outcome | `packages/core/src/audio/normalize.ts` and `packages/adapter/src/normalize.ts` (single source). |
| Prerequisites | `GATE0-DEC-M03` |
| Independent Test(s) | **unit** · Vitest · `packages/adapter/test/normalize.spec.ts`<br>Input: 48 kHz stereo, default config; then `forceMono=true`. Expected: channels per policy; both import paths return identical output. Pass: both. |
| Spec Reference | OTOMIX §4.1 |
| Review Checkpoint | Confirm no second copy of `normalizeInput` remains. |
| Notes | Audit finding B-04, F-10. |

###### GATE0-P05-M03 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-P05-M03` |
| Description | Complete `computeEnergy` (replace skeleton) with all components and weights from `AnalysisConfig`; implements `P05-T02-S02-M01`. |
| Expected Outcome | `packages/core/src/features/energy.ts`. |
| Prerequisites | `GATE0-P05-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/features.energy.full.spec.ts`<br>Input: 3 fixture feature sets (low, mid, high energy). Expected: strictly increasing scalars within [0,1]; stars monotonic. Pass: all. |
| Spec Reference | OTOMIX §4.3 |
| Review Checkpoint | Confirm no component is hardcoded to 0 and `loudness_range<3.0` is read from config. |
| Notes | Flip `P05-T02-S02-M01` to DONE. |

###### GATE0-P05-M04 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-P05-M04` |
| Description | Un-defer the minimal slice of `P05-T03-S01-M03`: `V_map = 0` fallback with flag `vocal_map_assumed_zero=true` when no vocal model is available (no TensorFlow dependency). |
| Expected Outcome | `packages/core/src/vocal/fallback.ts`. |
| Prerequisites | None |
| Independent Test(s) | **unit** · Vitest · `packages/core/test/vocal.fallback.spec.ts`<br>Input: model loader that throws. Expected: V_map all zeros and flag true; no exception. Pass: both. |
| Spec Reference | OTOMIX §4.4, §4.7 |
| Review Checkpoint | Confirm the TensorFlow model itself stays DEFERRED-001. |
| Notes | Required by 16 of 18 P08 tasks through the plan graph. |

###### GATE0-P05-M05 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-P05-M05` |
| Description | Validate `pipeline/extract.ts` against the Feature Registry schema (contract test), complete `P05-T04-S01-M01`, and make `isBpmDynamic` read `analysis.tempo.bpmDynamicThresholdBpm` with `??` (no `|| 2.0`). |
| Expected Outcome | `packages/core/src/pipeline/extract.ts`, `packages/core/src/features/bpm-seed.ts`, `analysis-config.json`. |
| Prerequisites | `GATE0-P05-M02`, `GATE0-P05-M03`, `GATE0-P05-M04` |
| Independent Test(s) | **contract** · Vitest · `packages/core/test/pipeline.extract.contract.spec.ts`<br>Input: stubbed Essentia output for 3 tracks. Expected: output validates against registry schema; threshold 0 is respected. Pass: both. |
| Spec Reference | OTOMIX §4.2, §4.8 |
| Review Checkpoint | Confirm RMS fallback still returns on Essentia crash. |
| Notes | Audit finding B-06. Flip `P05-T04-S01-M01` and re-verify `P05-T04-S01-M02`. |

###### GATE0-P05-M06 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-P05-M06` |
| Description | Add a reversible migration with `analysis_status` (`placeholder` / `pending` / `complete`) on `features`; ingest writes `placeholder`; catalog and recommender exclude `placeholder` rows by default. |
| Expected Outcome | `packages/db/migrations/009_features_analysis_status.sql` (next free number — check ledger) and catalog query update. |
| Prerequisites | `GATE0-VER-M01` |
| Independent Test(s) | **integration** · Vitest + Testcontainers PostgreSQL · `packages/db/test/features-analysis-status.spec.ts`<br>Input: insert placeholder and complete rows. Expected: catalog returns only complete; migration down/up works; RLS intact. Pass: all. |
| Spec Reference | GAP-023 · OTOMIX §9.6 |
| Review Checkpoint | Confirm existing rows are back-filled as `placeholder` where `registry_json='{}'`. |
| Notes | Audit finding B-01. |

###### GATE0-P05-M07 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-P05-M07` |
| Description | Wire `runEnrichment()` into the ingest flow; API answers 202/200 with resource id before analysis completes; worker result updates the features row to `complete`; identical second request hits cache. Replaces the placeholder block in `commit.ts`. |
| Expected Outcome | `packages/gateway/src/ingest/ingest-local.ts`, `packages/gateway/src/ingest/commit.ts`, queue consumer. |
| Prerequisites | `GATE0-P05-M05`, `GATE0-P05-M06`, `GATE0-VER-M02` |
| Independent Test(s) | **integration** · Vitest + Testcontainers PostgreSQL + Redis · `packages/gateway/test/ingest-enrichment.spec.ts`<br>Input: upload one fixture MP3 twice. Expected: first call returns before completion; row becomes `complete` with real bpm/key; second call causes no worker invocation. Pass: all three. |
| Spec Reference | GAP-023 · GAP-030 · P05-ADD-T06-S03-M01 |
| Review Checkpoint | Confirm failure moves the job to DLQ `otomix.dlq` after 1+3 attempts. |
| Notes | Closes the open part of GAP-030; flips `P05-ADD-T06-S03-M01` (Addendum `[x]` becomes true). |

### موج W2 — امنیت و سند UI

###### GATE0-SEC-M01 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-SEC-M01` |
| Description | Implement `P06-T05-S01-M02`: WASM memory hard maximum 512 MB (8192 pages) for analysis/decode workers. |
| Expected Outcome | `packages/workers/src/wasm-memory.ts`. |
| Prerequisites | `GATE0-DEC-M03` |
| Independent Test(s) | **unit** · Vitest · `packages/workers/test/wasm-memory.spec.ts`<br>Input: request growth beyond 8192 pages. Expected: RangeError / controlled rejection, process alive. Pass: both. |
| Spec Reference | OTOMIX §5.3, §7 |
| Review Checkpoint | Confirm the decode worker (`P07-T01-S03-M01`) uses it. |
| Notes | Audit finding F-07: P07 decode was completed without this prerequisite. |

###### GATE0-DOC-M03 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-DOC-M03` |
| Description | Author `Docs/FEATURES/OTOMIX_UI_Bindings.md`: UI element → Redux slice → catalog field → Feature Registry field, for every P08 component. |
| Expected Outcome | `Docs/FEATURES/OTOMIX_UI_Bindings.md`. |
| Prerequisites | `GATE0-DEC-M01`, `GATE0-DEC-M02` |
| Independent Test(s) | **unit** · Vitest · `tools/test/ui-bindings.spec.ts`<br>Input: parse the file. Expected: every P08 component id appears; every catalog field exists in registry schema. Pass: 100%. |
| Spec Reference | GAP-020 |
| Review Checkpoint | Confirm the catalog response shape of `P08-T01-S01-M01` matches the column "catalog field". |
| Notes | Mandatory before `P08-T01-S01-M01`. |

### موج W3 — گیت

###### GATE0-CHK-M01 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-CHK-M01` |
| Description | Gate-0 exit script: re-run prerequisite analysis, assert all CRITICAL tasks DONE, assert catalog fixture contains only `complete` rows with non-placeholder values. |
| Expected Outcome | `tools/scripts/gate0-check.ts`. |
| Prerequisites | all CRITICAL `GATE0-*` tasks |
| Independent Test(s) | **integration** · Vitest · `tools/test/gate0-check.spec.ts`<br>Input: fixture plan with one open CRITICAL task. Expected: exit code non-zero and the task listed. Pass: both. |
| Spec Reference | P08 Entry criteria |
| Review Checkpoint | Attach the script output to the P08 kickoff note. |
| Notes | Do not call `exit` inside PowerShell wrappers (GOTCHA-006). |

### موازی با P08 — پاک‌سازی و سخت‌سازی

###### GATE0-DOC-M02 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-DOC-M02` |
| Description | Plan hygiene: remove the duplicate `P05-ADD-T01-S03-M01` in the Addendum; fix `P07-REG-M02` heading/status mismatch; fix the invalid Mermaid label in docs; align Config names (CONFLICT-002). |
| Expected Outcome | Edited Addendum, Plan, Dump generator template. |
| Prerequisites | `GATE0-DOC-M01` |
| Independent Test(s) | **unit** · Vitest · `tools/test/plan-lint.spec.ts`<br>Input: plan files. Expected: no duplicate IDs; heading status equals Status field. Pass: 0 violations. |
| Spec Reference | CONFLICT-002, -003 |
| Review Checkpoint | Re-run the project audit: failed checks drop from 15 to ≤ 11. |
| Notes | — |

###### GATE0-VER-M03 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-VER-M03` |
| Description | Verify Addendum UI tasks `P05-ADD-T04-S01-M01` and `-S02-M01`: files `packages/ui/src/state/mixplan.ts`, `reorder.ts` and their tests must exist and pass; otherwise flip to TODO. |
| Expected Outcome | Verified or corrected statuses. |
| Prerequisites | `GATE0-VER-M01` |
| Independent Test(s) | **unit** · Vitest · `packages/ui/test/mixplan.score.spec.ts`, `reorder.score.spec.ts` (must pass or task reverts). |
| Spec Reference | Addendum P05-ADD-T04 |
| Review Checkpoint | Confirm no duplicate ownership with P08-T03-S01-M01 (Starter warning). |
| Notes | Audit finding F-15. |

###### GATE0-SEC-M02 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-SEC-M02` |
| Description | Return the container-parser fuzz harness (`P07-T02-S02-M01`) to a real `worker_threads` sandbox now that GAP-021 is resolved. |
| Expected Outcome | `packages/workers/test/decode.fuzz.spec.ts` (sandboxed). |
| Prerequisites | `GATE0-SEC-M01` |
| Independent Test(s) | **integration** · Vitest · `packages/workers/test/decode.fuzz.spec.ts`<br>Input: truncated frames, oversized chunk sizes, recursive tags. Expected: worker rejects with INVALID_ARGUMENT; main process memory stable. Pass: all. |
| Spec Reference | OTOMIX §5.3 · GAP-021 |
| Review Checkpoint | Confirm the harness no longer runs inline in Vitest. |
| Notes | — |

###### GATE0-SEC-M03 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-SEC-M03` |
| Description | Remove `// @ts-nocheck` from `packages/workers/src/pool.ts`: delete unused import/field/local, keep `pool-bulkhead.spec.ts` green. |
| Expected Outcome | `packages/workers/src/pool.ts`. |
| Prerequisites | None |
| Independent Test(s) | **build** · tsc · `pnpm -F @otomix/workers build` → exit 0 without pragma; `pool-bulkhead.spec.ts` passes. |
| Spec Reference | GAP-018 |
| Review Checkpoint | `rg "@ts-nocheck" packages` returns 0. |
| Notes | Security-relevant file (per-tenant bulkhead). |

###### GATE0-SEC-M04 — TODO

| Field | Value |
|---|---|
| ID | `GATE0-SEC-M04` |
| Description | Prove the permission cache fails closed: Redis down, LISTEN/NOTIFY lost, and TTL expiry after revoke. |
| Expected Outcome | `packages/access/test/rbac.cache-failclosed.spec.ts`. |
| Prerequisites | `P06-RBAC-M06` |
| Independent Test(s) | **integration** · Vitest + Testcontainers Redis/PostgreSQL · same file<br>Input: grant, cache, revoke, stop Redis. Expected: next request re-checks DB or denies; never serves a revoked permission after invalidation. Pass: all. |
| Spec Reference | GAP-015 · auth-and-authorization discipline |
| Review Checkpoint | Document the maximum staleness window (≤ 60 s TTL if invalidation is lost). |
| Notes | Audit finding B-09. |

### Cross-cutting (X-*) — موازی

###### X-ARC-M01 — TODO

| Field | Value |
|---|---|
| ID | `X-ARC-M01` |
| Description | Move `packages/core/src/repository/global-features.ts` into `packages/db`; remove `pg` and the `core→db` dependency (GAP-016 proper fix). |
| Expected Outcome | `packages/db/src/global-features-repository.ts`; `packages/core/package.json` without `pg`. |
| Prerequisites | None |
| Independent Test(s) | **integration** · Vitest + Testcontainers PostgreSQL · `packages/db/test/global-features.spec.ts` (unchanged assertions). |
| Spec Reference | GAP-016 · Rule 26 |
| Review Checkpoint | `rg "from 'pg'" packages/core/src` returns 0. |
| Notes | Core must stay platform-agnostic. |

###### X-ARC-M02 — TODO

| Field | Value |
|---|---|
| ID | `X-ARC-M02` |
| Description | Make `@otomix/contracts` a leaf (no imports from gateway/core/db/access) and add a circular-dependency check to CI. |
| Expected Outcome | `packages/contracts/package.json`, `.github/workflows/ci.yml` step with `madge --circular`. |
| Prerequisites | None |
| Independent Test(s) | **build** · madge · `npx madge --circular --extensions ts packages/*/src` → 0 cycles. |
| Spec Reference | OTOMIX §2.8 |
| Review Checkpoint | Confirm shared types moved to a lower package or duplicated as schema only. |
| Notes | Audit finding E1. |

###### X-ARC-M03 — TODO

| Field | Value |
|---|---|
| ID | `X-ARC-M03` |
| Description | Single owner for `confine`, `decode`, `normalize`: keep one implementation (plan locations: `gateway/ingest/confine.ts`, `workers/src/decode.ts`), delete or re-export the others. |
| Expected Outcome | Removed duplicates in `core/ingest`, `adapter/ingest`, `gateway/ingest`. |
| Prerequisites | `GATE0-VER-M02`, `GATE0-P05-M02` |
| Independent Test(s) | **unit** · Vitest · `tools/test/no-duplicate-modules.spec.ts`<br>Input: file tree. Expected: each of the three basenames appears once outside re-export files. Pass: equal. |
| Spec Reference | OTOMIX §5.2 |
| Review Checkpoint | Confirm P07-T02-S01-M01 (gateway never imports decoders) still holds. |
| Notes | Audit finding D9. |

###### X-ARC-M04 — TODO

| Field | Value |
|---|---|
| ID | `X-ARC-M04` |
| Description | Create a migration ledger (`packages/db/migrations/LEDGER.md`: number, file, task, status) and a reversible migration that drops legacy `users.role` and `users.tier` CHECKs (superseded by dynamic RBAC and `tier_N` roles). |
| Expected Outcome | `LEDGER.md`; next-numbered migration. |
| Prerequisites | `GATE0-P05-M06` |
| Independent Test(s) | **integration** · Vitest + Testcontainers PostgreSQL · `packages/db/test/users-rbac-compat.spec.ts`<br>Input: insert user with tier 3 and a role created at runtime. Expected: succeeds; down migration restores. Pass: both. |
| Spec Reference | GAP-015 · GAP-009 |
| Review Checkpoint | Confirm RLS policies are untouched and BDC migration number (GAP-009) follows the ledger. |
| Notes | Audit findings B-05, F-16. |

###### X-ARC-M05 — TODO

| Field | Value |
|---|---|
| ID | `X-ARC-M05` |
| Description | Align auth routes to GAP-027 and the `/api/v1` convention (`/auth/google/start`, `/auth/google/callback`, `/auth/telegram/verify`, `/auth/otp/send`, `/auth/otp/verify`); decide and document `auth-email-otp`. |
| Expected Outcome | Gateway route files + contract schemas. |
| Prerequisites | `GATE0-VER-M01` |
| Independent Test(s) | **contract** · Vitest + supertest · `packages/gateway/test/auth-routes.contract.spec.ts`<br>Input: route table. Expected: exact path set. Pass: equal. |
| Spec Reference | GAP-027 · P07-REG-M02..M04 |
| Review Checkpoint | Confirm the catalog route is `/api/v1/catalog/features` with cursor pagination. |
| Notes | Audit finding F-13. |

###### X-TST-M01 — TODO

| Field | Value |
|---|---|
| ID | `X-TST-M01` |
| Description | Add property-based tests (fast-check): `tOfI` monotonicity and clamp, `GridModel` segment boundaries, Mixability and Compatibility ranges [0,1] for all inputs, weights invariant. |
| Expected Outcome | `packages/core/test/property/*.spec.ts`. |
| Prerequisites | `GATE0-P05-M01` |
| Independent Test(s) | **property** · Vitest + fast-check · `packages/core/test/property/grid.spec.ts`<br>Input: 10,000 random cases (fixed seed). Expected: no counterexample. Pass: 0 failures. |
| Spec Reference | OTOMIX §3.1 · P11 determinism |
| Review Checkpoint | Confirm seed is recorded for reproducibility. |
| Notes | Supports P11 proof. |

###### X-TST-M02 — TODO

| Field | Value |
|---|---|
| ID | `X-TST-M02` |
| Description | Contract tests for every shared Mock (Logger first): a mock must satisfy the real interface type and behavior (GAP-017 pattern). |
| Expected Outcome | `packages/core/test/mocks.contract.spec.ts`. |
| Prerequisites | None |
| Independent Test(s) | **unit** · Vitest · same file<br>Input: mock logger. Expected: only methods of the real `Logger` exist. Pass: equal. |
| Spec Reference | GAP-017 |
| Review Checkpoint | Confirm production-path tests exist for each injected dependency. |
| Notes | — |

###### X-TST-M03 — TODO

| Field | Value |
|---|---|
| ID | `X-TST-M03` |
| Description | End-to-end integration test of the whole pipeline: upload → sniff → decode → extract → commit → enrich → catalog. |
| Expected Outcome | `packages/gateway/test/pipeline.e2e.spec.ts`. |
| Prerequisites | `GATE0-P05-M07` |
| Independent Test(s) | **integration** · Vitest + Testcontainers · same file<br>Input: 3 fixture files (MP3, WAV, FLAC) plus 1 hostile file. Expected: 3 catalog rows `complete`; hostile rejected; DLQ empty. Pass: all. |
| Spec Reference | OTOMIX §5.1 |
| Review Checkpoint | Confirm no placeholder values appear in results. |
| Notes | Missing per Dump §9.3. |

###### X-SEC-M01 — TODO

| Field | Value |
|---|---|
| ID | `X-SEC-M01` |
| Description | Redis-backed rate limiting for auth endpoints (OTP send 3/10 min per phone, verify attempts cap) and make the ingest limiter store-pluggable. |
| Expected Outcome | `packages/gateway/src/ratelimit/redis-store.ts`. |
| Prerequisites | `P07-REG-M04` |
| Independent Test(s) | **integration** · Vitest + Testcontainers Redis · `packages/gateway/test/ratelimit-redis.spec.ts`<br>Input: 4 OTP sends within 10 min. Expected: 4th returns 429 with Retry-After; two app instances share the count. Pass: both. |
| Spec Reference | GAP-024 · GAP-027 |
| Review Checkpoint | Confirm limiter keyed by phone and IP, not by JWT sub only. |
| Notes | Audit finding B-07. |

###### X-OPS-M01 — TODO

| Field | Value |
|---|---|
| ID | `X-OPS-M01` |
| Description | Fix `sync-and-translate.ps1` (`git push origin HEAD`, parameterized message) and add a pre-commit guard that aborts if unrelated files are staged. |
| Expected Outcome | `Docs/ArchitectureBook/sync-and-translate.ps1`, `.githooks/pre-commit`. |
| Prerequisites | None |
| Independent Test(s) | **unit** · Pester/Vitest · `tools/test/sync-script.spec.ts`<br>Input: script text. Expected: no hard-coded branch name. Pass: 0 matches. |
| Spec Reference | GAP-019 · GOTCHA-HIST-002 |
| Review Checkpoint | Confirm one branch per agent session. |
| Notes | — |

###### X-DR-M01 — TODO

| Field | Value |
|---|---|
| ID | `X-DR-M01` |
| Description | Create sibling task stubs for GAP-014 (cloud + local) for every P05/P07 task still open and a template for P10/P11, so no PR claims a phase done with only one target. |
| Expected Outcome | Table in this Supplement (`## D`), plus JSON entries. |
| Prerequisites | `GATE0-DOC-M01` |
| Independent Test(s) | **unit** · Vitest · `tools/test/gap014-siblings.spec.ts`<br>Input: tasks.json. Expected: each tagged task has a sibling id. Pass: 100%. |
| Spec Reference | GAP-014 |
| Review Checkpoint | Owner confirms per-model specifics when each phase is reached. |
| Notes | Roughly doubles P07/P10/P11 effort — plan capacity accordingly. |

###### P08-PRE-M01 — TODO

| Field | Value |
|---|---|
| ID | `P08-PRE-M01` |
| Description | Add a Playwright skeleton for the core journey (login → upload → library → queue → plan → preview) with a mock DSP driver; P08 tasks extend it. |
| Expected Outcome | `packages/ui/e2e/core-journey.spec.ts`. |
| Prerequisites | `GATE0-CHK-M01`, `P07-REG-M06` |
| Independent Test(s) | **e2e** · Playwright · same file<br>Input: seeded tenant with 3 complete tracks. Expected: queue shows 3 tracks and a computed timeline. Pass: equal. |
| Spec Reference | OTOMIX §4.9 |
| Review Checkpoint | Confirm the plan has more than 1 e2e for P08 (currently 1). |
| Notes | P08 has only 1 e2e + 3 component tests today. |

---

## D. رجیستر انتقال به فازهای بعد (بدون میکروتسک؛ فقط ثبت)

| ID | موضوع | فاز | اقدام |
|---|---|---|---|
| OQ-12 | Serato metadata | P09 | تصمیم مالک؛ `P09-T01-S02-M05` |
| OQ-13 | درگاه پرداخت | P09 | تصمیم مالک؛ `P09-T02-S03-M01` |
| CONFLICT-005 | Vault واقعی | P06/P10 | wrapper + contract test با stub |
| GAP-029 | Runner مرجع AWS M5 | P11 | تدارک زیرساخت پیش از `P11-T07-*` |
| GAP-014 | استقرار دوگانه | P10/P11 | بخش X-DR-M01 |
| P06-T04-S01-M01, P06-T05-S01-M01/M03, P06-T06-* | 404 حقوقی، CSP، ایزولاسیون worker، K8s/Snyk | P06→P10 | پس از تأیید وضعیت کد موجود |
| GAP-009 | `break_profile` BDC | P08 | شماره از LEDGER |
| GAP-001 | Registry 1.3 | P05/P08 | فقط با فراخوانی `cache-invalidate.ts` |

---

### D.1. GAP-014 دوگانه‌سازی (Sibling Task Register)

Every open P05/P07 task gets a **cloud** and **local** sibling so no single-target PR can close a phase.  
A template row is included for future P10/P11 tasks.

| Original Task ID | Cloud Sibling ID | Local Sibling ID | Status | Notes |
|---|---|---|---|---|
| `GATE0-P05-M06` | `GATE0-P05-M06-CLOUD` | `GATE0-P05-M06-LOCAL` | TODO | Migration with `analysis_status` |
| `GATE0-P05-M07` | `GATE0-P05-M07-CLOUD` | `GATE0-P05-M07-LOCAL` | TODO | Wire `runEnrichment()` into ingest |
| `GATE0-VER-M01` | `GATE0-VER-M01-CLOUD` | `GATE0-VER-M01-LOCAL` | TODO | Verification Pack baseline |
| `P07-T05-S01-M01` | `P07-T05-S01-M01-CLOUD` | `P07-T05-S01-M01-LOCAL` | TODO | Fuzz harness in worker_threads |
| `P07-REG-M02` | `P07-REG-M02-CLOUD` | `P07-REG-M02-LOCAL` | TODO | Registration heading/status sync |

**P10/P11 Template (apply when new tasks are created):**

| Original Task ID | Cloud Sibling ID | Local Sibling ID | Status | Notes |
|---|---|---|---|---|
| `P10-TXX-SXX-MXX` | `P10-TXX-SXX-MXX-CLOUD` | `P10-TXX-SXX-MXX-LOCAL` | TEMPLATE | Cloud vs local deployment |
| `P11-TXX-SXX-MXX` | `P11-TXX-SXX-MXX-CLOUD` | `P11-TXX-SXX-MXX-LOCAL` | TEMPLATE | Cloud vs local deployment |

---

## E. چک‌لیست خروج Gate-0
- [ ] ۱۶ تسک CRITICAL = DONE
- [ ] `GATE0-CHK-M01` سبز
- [ ] ۵ تصمیم مالک ثبت و Spec/Plan یکسان
- [ ] شمار «DONE با پیش‌نیاز ناتمام» = ۰
- [ ] کاتالوگ فقط ردیف `complete` برمی‌گرداند

**پایان متمم.**
