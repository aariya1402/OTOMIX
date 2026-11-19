# OTOMIX Audit — Checkpoint 01
**Date:** 2026-11-19 · **Stage completed:** A (Master Dump read) + B-partial (Plan structure parse)

## Evidence limits (must be stated in final report)
- GitHub repo NOT accessible (ROBOTS_DISALLOWED). No source code, no test output, no tasks.json, no Audit_Report.md were uploaded.
- All findings are DOCUMENT-LEVEL (dump vs plan vs spec). Nothing was executed.

## Findings so far
1. Plan header says "No task is marked DONE" but the body has [x]/DONE markers → header stale.
2. Plan MD status by phase (regex parse, 234 of 238 declared tasks): P01 23/23 done, P02 17+1 resolved/18, P03 21+2 res+1 cancelled/24, P04 21 done+6 cancelled+1 TODO+1 res/29, P05 14 done/21 (+1 task not parsed), P06 6 done/23 parsed (declared 26), P07 0 done/16 (all TODO, 1 BLOCKED OQ-11), P08-P11 all TODO.
3. Dump says P07 ~90% done (JSON) — plan MD shows 0/16 → MD/JSON desync (dump's own audit also flags this).
4. Dump task-ID labels wrong vs plan: P07-T01-S02-M01 is limits (not confine); decode is P07-T01-S03-M01 in packages/workers/src/decode.ts (dump says gateway/adapter decode-worker.ts, 3 locations).
5. P08 entry criteria = P03,P04,P05,P06,P07 exit criteria met → NOT met (P05 open: OQ-20/21 blocked + 4 TODO; P06 16 TODO + OQ-10; P07 plan 0%).
6. Plan tail "Missing Headings (auto-generated)": P06-RBAC-M01..M12 = DONE, but dump says RBAC-M01..M12 NOT STARTED → direct contradiction. P07-REG-M01..M06 exist (only heading [x] on M02 but Status TODO).
7. Spec conflict: Rule 25 (reject low mixability) vs Addendum D3 (preference, not gate) vs plan P08-T01-S01-M02 (selectable = M>=0.40, gate!) vs mixability.ts (no gate).
8. Rule 26 vs identifiers: dump shows tInSeconds/tOutSeconds/alignToSeconds, quantumSeconds in core.
9. Package deps: contracts depends on gateway/core/db (inversion); core depends on db (purity violation).
10. Migrations: plan expects 003_tracks.sql; dump has 003_global_features_jsonb, 007_tracks_source_declaration — no `tracks` table migration visible. 004_rbac still in chain though superseded.
11. Dump route/path mismatch: /catalog/features?track_id= vs plan /api/v1/catalog/features cursor pagination; ingest order in dump inconsistent (confine→decode→sniff).
12. features table CHECKs (bpm 60-200, camelot regex, stars 0-5) vs GAP-023 sentinel inserts; stars 1-5 in code vs 0-5 in DB.

## Next stages
C: re-parse plan with permissive regex (handles `- [ ]` headings), prerequisite integrity (done task with non-done prereq, forward-phase refs, dangling IDs, cycles)
D: Addendum + Supplement (GAP/OQ matrix) 
E: Spec check (Rule 25/26, §8, §9 contracts) vs plan P08
F: Plan-expected files vs dump file index
G: Deliverables: 1 report, 2 supplement todo, 3 plain-language report (FA), 4 user journey (FA, diagrams)
