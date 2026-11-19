# OTOMIX Audit — Checkpoint 02 (analysis complete; deliverables pending)
**Stamp:** 2026-11-19 ~05:30 UTC · **State:** all analysis done; next = write 4 deliverables.
Resume rule: if this chat is cut, upload this file + Checkpoint_01 + the 5 source docs and say "continue from Checkpoint 02: write deliverables 1..4".

## Evidence limits
Repo not reachable (robots). No code/tests/tasks.json/Audit_Report uploaded. Everything below = document-level (Dump vs Plan vs Addendum vs Supplement vs Spec). Nothing executed. Dump task-ID labels proved unreliable (see F-DUMP).

## Phase completion (plan-MD strict → re-baselined using Supplement evidence)
P01 100→100 · P02 100→100 · P03 100→100 · P04 96→100 · P05 64→80 · P06 47→59 · P07 5→5 (code present for 10/12 expected files; plan MD stale) · P08 0 · P09-P11 0.
Plan has 256 unique task IDs (238 declared + 12 RBAC + 6 REG). Header "no task DONE" is false.

## Verified-by-documents key findings (ID → severity)
F-01 CRITICAL  Ingest writes PLACEHOLDER features (bpm=120,key=1A,E=.5,M=.5,stars=3) — GAP-023; enrichment wiring P05-ADD-T06-S03-M01 is TODO (Supplement) though Addendum says [x]. P08 would run on fake data; all tracks mutually Camelot-compatible, same BPM, M=.5>0.4.
F-02 CRITICAL  P08 gate = only 3 upstream tasks after re-baseline: P05-T02-S02-M01 (Energy full), P05-T03-S01-M03 (V_map fallback, DEFERRED), P05-T04-S01-M01 (extract validated+wired). 16/18 P08 tasks depend on them. Only P08-T04-S02-M01 and -M02 are free.
F-03 CRITICAL  3 different recommendation formulas: Spec §4.9 and plan P01-T02-S01-M03 RECO_WEIGHTS=[.6,.3,.1]; plan P08-T04-S01-M02 and Dump = .40M+.30C+.20T+.10E; Addendum compat score = 7 weighted inputs. OQ-09 (component formulas) + OQ-24 (tie-break) block P08-T04-S01-M01/M03.
F-04 HIGH      Mixability gate-vs-preference: Spec §4.5/4.8/4.9 + constants UNMIXABLE_BELOW=.4 + P08-T01-S01-M02 (selectable M>=.40) = GATE; Addendum D3 + CONFLICT-006 + code = PREFERENCE. CONFLICT-006 still "open". Dump repeats the old Rule 25.
F-05 HIGH      Mixability weights in dump JSON sum to 1.20 (not 1.0) → clamp saturation; verify analysis-config.json; add sum==1 test.
F-06 HIGH      Dump says RBAC-M01..M12 NOT STARTED and P06 60% blocked; Supplement says RBAC-M01..M12 DONE and "P06 COMPLETE (2026-11-13)". But P06-T04..T07 (sandbox 512MB WASM cap, CSP, Vault, pod hardening, DSP admin propagation) = TODO in plan, though dek.ts/rotate.ts/namespaced-clients.ts/audit.ts/dsp-parameters.ts exist per dump. OQ-10/OQ-14 superseded by GAP-015 but P09-T03-S01-M01 still BLOCKED by OQ-10.
F-07 HIGH      P07 hostile-file defense done without its prereq P06-T05-S01-M02 (WASM 512MB cap) and fuzz harness runs inline in vitest, not in worker_threads sandbox (GAP-021 workaround).
F-08 HIGH      6 DONE tasks with non-done prereqs (P04-T03-S01-M05, P04-T04-S01-M01, P05-T02-S02-M02, P05-T02-S02-M04, P05-T04-S01-M02, P06-T02-S02-M01) + Addendum ADD-T03-S01-M01 and ADD-T06-S03-M01 depend on TODO P05-T04-S01-M01.
F-09 HIGH      Layering: core imports pg (repository/global-features.ts, GAP-016); contracts depends on gateway/core/db; core->db. Duplicated modules: confine (core/adapter/gateway), decode-worker (adapter/gateway; plan says workers/src/decode.ts), normalize (core/audio + adapter).
F-10 HIGH      normalize: Spec §4.1 + P05-T01-S01-M01 + P07-T01-S03-M01 = mono 44.1k; Addendum = stereo default (forceMono=false); Audit says core/audio/normalize.ts defaults forceMono=true (bug). Decision needed; Essentia needs mono.
F-11 MEDIUM    workers/src/pool.ts (per-tenant bulkhead, security-relevant) has // @ts-nocheck (GAP-018). Logger contract (GAP-017) hid a prod bug behind a mock → mock-contract risk.
F-12 MEDIUM    Rate limit in-memory per-process (GAP-024); no evidence of brute-force/bombing limits on OTP endpoints (spec'd 3/10min in GAP-027 REG-M04).
F-13 MEDIUM    Dump route names deviate from GAP-027 (/auth/google/start, /auth/otp/send, /auth/telegram/verify) and lack /api/v1 prefix; catalog route in dump (?track_id=) vs plan (/api/v1/catalog/features cursor). Extra auth-email-otp route not in GAP-027 scope.
F-14 MEDIUM    Dual deployment (GAP-014): each P05/P07/P10/P11 task needs a cloud+local sibling; none scheduled → scope doubles.
F-15 MEDIUM    Addendum ADD-T04-S01/S02 (ui/src/state/mixplan.ts, reorder.ts) marked [x] but Dump says UI "minimal" → possible false-done. REG-M06 (auth UI) is an undeclared prereq of P08 UI.
F-16 MEDIUM    Migrations: plan names 003_tracks/005_store; actual 003_global_features_jsonb, 005_admin_audit_default_partition, 007_tracks_source_declaration(s) (tracks merged with P07-T05, though T05 is OQ-11 'BLOCKED' stale — OQ-11 resolved 2026-11-14), 004_rbac superseded but still in chain; GAP-009 expects number after 005_store.
F-17 LOW       Dump mislabels: GAP-022 (really Testcontainers flake), P05-ADD-T04-S01-M01 (really Starter Track Redux, not extract), P05-ADD-T03-S01-M01 (really lock-rule, not bpmSeed), P07-T01-S02-M01 (limits, not confine). Dump timestamp 'Z' ≠ container clock. Dump claims ~1200 lines (actual 1041).
F-18 LOW       Mermaid in dump: `tOfI[tOfI(i,...)]` label with parentheses is invalid Mermaid unless quoted.
F-19 LOW       Stale statuses to flip: P04-T01-S02-M01 (verified per CONFLICT-008), P05-T02-S01-M02 & -S02-M03 (decisions recorded: bpmDynamicThresholdBpm=2.0, loudness_range<3.0), P05-T02-S02-M05/M06 (SUPERSEDED-006), P06-T02-S01-M02/M03, -S02-M02, -S03-M01, P06-T03-S01-M01/M02 (SUPERSEDED/NEEDS UPDATE per GAP-015), P07-T05-S01-M01 (OQ-11 resolved).

## Tests (plan-level; nothing run)
Planned: unit 149, integration 57, contract 3, benchmark 4, property 1, component 3, e2e 2, load 1; 18 stubs without test spec (12 RBAC + 6 REG); 18 [blocked]. Known flakes: heap-proof (GOTCHA-002), Pact 'bad port' (GOTCHA-004), Testcontainers parallelism (GAP-022). Audit_Report (per dump): 302 checks / 287 pass / 15 fail. P08 (core mission) has only 1 e2e + 3 component tests planned.

## Conformance (46 documented checks, P=1,H=.5,F=0): TOTAL 52% (P14/H20/F12)
Core engine 81 · Scoring/Features 38 · Security 56 · Ingestion 67 · Structure/Process 25. Detail in /tmp/work/conformance.json (regenerate from list in report).

## P08 readiness
Strict (entry criteria as written): NOT MET. Re-baselined: CONDITIONAL — 3 upstream tasks + 2 owner decisions (OQ-09, OQ-24) + 1 spec-conflict decision (gate vs preference, formula, mono/stereo) + REG-M06.

## Deliverables to write (UTC stamp 2026-11-19_05-16 used in names)
1 OTOMIX_Audit_Report_2026-11-19_05-16.md  2 OTOMIX_MicroTask_Plan_Supplement_Gate_P08_2026-11-19.md  3 OTOMIX_Plain_Report_FA_2026-11-19.md  4 OTOMIX_User_Journey_FA_2026-11-19.md
