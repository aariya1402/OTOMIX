# OTOMIX Plan Audit Report

Generated: 2026-11-24T03:54:16.567Z
Source: `tools/test/plan-audit.spec.ts` (run with `npx vitest run tools/test/plan-audit.spec.ts`)

## Summary

Checks: 302 · Passed: 285 · Failed: 17

| Area | Checks | Failed |
|---|---|---|
| Task registry | 259 | 8 |
| Master plan | 2 | 2 |
| Addendum | 18 | 1 |
| Addendum invariants | 13 | 1 |
| Tracker | 3 | 2 |
| Supplement | 6 | 3 |
| Build health | 1 | 0 |

## Failures

- **P04-T03-S01-M05** (per-task): DONE but prerequisite P04-T03-S01-M04 is CANCELLED:Session-Refresh
- **P06-T02-S02-M01** (per-task): DONE but prerequisite P06-T02-S01-M03 is SUPERSEDED:GAP-015
- **P06-T04-S01-M01** (per-task): DONE but prerequisite P06-T02-S01-M03 is SUPERSEDED:GAP-015
- **P06-T05-S01-M01** (per-task): DONE but prerequisite P06-T02-S01-M03 is SUPERSEDED:GAP-015
- **P06-T07-S01-M01** (per-task): DONE but prerequisite P06-T02-S01-M03 is SUPERSEDED:GAP-015
- **P07-T03-S02-M02** (per-task): DONE but prerequisite P06-T02-S01-M03 is SUPERSEDED:GAP-015
- **P07-T05-S01-M01** (per-task): unrecognized status "BLOCKED"
- **P07-REG-M01** (per-task): DONE but prerequisite P07-T05-S01-M01 is BLOCKED
- **OTOMIX_MicroTask_Plan.md** ([x] vs DONE): P07-REG-M01: md [ ] vs json DONE
- **OTOMIX_MicroTask_Plan.md** (json task has md heading): P02-T05-S01-M02 [DONE]; P03-T02-S01-M02 [DONE]; P03-T03-S01-M03 [CANCELLED:Resolved]; P03-T04-S02-M01 [DONE]; P04-T01-S01-M02 [CANCELLED:Legacy-Arch]; P04-T01-S01-M03 [CANCELLED:Legacy-Arch]; P04-T01-S02-M01 [DONE]; P04-T01-S02-M02 [CANCELLED:Legacy-Arch]; P04-T01-S02-M03 [CANCELLED:Legacy-Arch]; P04-T02-S01-M01 [DONE]; P04-T02-S01-M02 [DONE]; P04-T02-S01-M03 [DONE]; P04-T02-S02-M01 [DONE]; P04-T02-S02-M02 [DONE]; P04-T02-S02-M03 [DONE]; P04-T02-S02-M04 [CANCELLED:Legacy-Arch]; P04-T03-S01-M01 [DONE]; P04-T03-S01-M02 [DONE]; P04-T03-S01-M03 [DONE]; P04-T03-S01-M04 [CANCELLED:Session-Refresh]; P04-T03-S01-M05 [DONE]; P04-T03-S02-M01 [DONE]; P04-T03-S02-M02 [DONE]; P04-T04-S01-M01 [DONE]; P04-T04-S01-M02 [DONE]; P04-T04-S02-M01 [DONE]; P04-T04-S02-M02 [DONE]; P04-T04-S02-M03 [DONE]; P04-T04-S02-M04 [DONE]; P04-T04-S02-M05 [DONE]; P04-T04-S03-M01 [DONE]; P04-T04-S03-M02 [DONE]; P05-T02-S01-M02 [DONE]; P05-T02-S02-M01 [DONE]; P05-T02-S02-M03 [DONE]; P05-T02-S02-M05 [DONE]; P05-T02-S02-M06 [DONE]; P05-T03-S01-M03 [DONE]; P05-T04-S01-M01 [DONE]; P05-T04-S01-M03 [DEFERRED:GAP-029]; P06-T02-S03-M01 [SUPERSEDED:GAP-015]; P06-T03-S01-M01 [SUPERSEDED:GAP-015]; P06-T03-S01-M02 [SUPERSEDED:GAP-015]; P06-T04-S01-M01 [DONE]; P06-T04-S02-M01 [DONE]; P06-T04-S02-M02 [DONE]; P06-T04-S02-M03 [DONE]; P06-T04-S02-M04 [DONE]; P06-T05-S01-M01 [DONE]; P06-T05-S01-M02 [DONE]; P06-T05-S01-M03 [DONE]; P06-T06-S01-M01 [DONE]; P06-T06-S01-M02 [DONE]; P06-T06-S01-M03 [DONE]; P06-T07-S01-M01 [DONE]; P06-T07-S01-M02 [DONE]; P06-T07-S01-M03 [DONE]; P07-T01-S01-M01 [DONE]; P07-T01-S02-M01 [DONE]; P07-T01-S02-M02 [DONE]; P07-T01-S03-M01 [DONE]; P07-T02-S01-M01 [DONE]; P07-T02-S01-M02 [DONE]; P07-T02-S01-M03 [DONE]; P07-T02-S01-M04 [DONE]; P07-T02-S02-M01 [DONE]; P07-T03-S01-M01 [DONE]; P07-T03-S02-M01 [DONE]; P07-T03-S02-M02 [DONE]; P07-T03-S02-M03 [DONE]; P07-T03-S02-M04 [DONE]; P07-T04-S01-M01 [DONE]; P07-T04-S01-M02 [DONE]; P07-T05-S01-M01 [BLOCKED]; P08-T01-S01-M01 [TODO]; P08-T01-S01-M02 [TODO]; P08-T01-S02-M01 [TODO]; P08-T01-S02-M02 [TODO]; P08-T02-S01-M01 [TODO]; P08-T02-S01-M02 [TODO]; P08-T03-S01-M01 [TODO]; P08-T04-S01-M01 [BLOCKED:OQ-09]; P08-T04-S01-M02 [TODO]; P08-T04-S01-M03 [BLOCKED:OQ-24]; P08-T04-S02-M01 [TODO]; P08-T04-S02-M02 [TODO]; P08-T04-S02-M03 [TODO]; P08-T04-S02-M04 [TODO]; P08-T05-S01-M01 [TODO]; P08-T05-S01-M02 [TODO]; P08-T06-S01-M01 [TODO]; P08-T06-S01-M02 [TODO]; P09-T01-S01-M01 [TODO]; P09-T01-S01-M02 [TODO]; P09-T01-S01-M03 [TODO]; P09-T01-S01-M04 [TODO]; P09-T01-S02-M01 [TODO]; P09-T01-S02-M02 [TODO]; P09-T01-S02-M03 [TODO]; P09-T01-S02-M04 [TODO]; P09-T01-S02-M05 [BLOCKED:OQ-12]; P09-T02-S01-M01 [TODO]; P09-T02-S01-M02 [TODO]; P09-T02-S02-M01 [TODO]; P09-T02-S02-M02 [TODO]; P09-T02-S02-M03 [TODO]; P09-T02-S02-M04 [TODO]; P09-T02-S03-M01 [BLOCKED:OQ-13]; P09-T03-S01-M01 [BLOCKED:OQ-10]; P09-T03-S01-M02 [TODO]; P09-T04-S01-M01 [TODO]; P09-T04-S01-M02 [TODO]; P10-T01-S01-M01 [TODO]; P10-T01-S01-M02 [TODO]; P10-T01-S02-M01 [TODO]; P10-T01-S02-M02 [TODO]; P10-T02-S01-M01 [TODO]; P10-T02-S01-M02 [TODO]; P10-T03-S01-M01 [TODO]; P10-T03-S01-M02 [TODO]; P10-T04-S01-M01 [TODO]; P10-T04-S01-M02 [TODO]; P10-T04-S02-M01 [TODO]; P10-T04-S02-M02 [TODO]; P10-T04-S02-M03 [TODO]; P10-T04-S02-M04 [TODO]; P10-T05-S01-M01 [TODO]; P10-T05-S01-M02 [TODO]; P10-T05-S01-M03 [TODO]; P10-T05-S01-M04 [TODO]; P10-T05-S01-M05 [TODO]; P10-T06-S01-M01 [TODO]; P11-T01-S01-M01 [TODO]; P11-T01-S02-M01 [TODO]; P11-T01-S02-M02 [TODO]; P11-T01-S02-M03 [TODO]; P11-T02-S01-M01 [TODO]; P11-T02-S01-M02 [TODO]; P11-T03-S01-M01 [TODO]; P11-T03-S01-M02 [TODO]; P11-T03-S01-M03 [BLOCKED:OQ-04]; P11-T03-S01-M04 [TODO]; P11-T03-S01-M05 [TODO]; P11-T04-S01-M01 [TODO]; P11-T04-S01-M02 [TODO]; P11-T04-S01-M03 [TODO]; P11-T05-S01-M01 [TODO]; P11-T05-S01-M02 [TODO]; P11-T05-S01-M03 [TODO]; P11-T05-S01-M04 [TODO]; P11-T06-S01-M01 [TODO]; P11-T07-S01-M01 [TODO]; P11-T07-S01-M02 [TODO]; P11-T07-S01-M03 [TODO]; P05-ADD-T06-S03-M01 [TODO]
- **Addendum.md** (unique ids): P05-ADD-T01-S03-M01 defined 2x
- **P05-ADD-T01-S02-M01** (stereo default): forceMono defaults to true in packages/core/src/audio/normalize.ts
- **OTOMIX_P05_Execution_Tracker.md** (status agreement): P05-ADD-T05-S01-M01: listed in tracker but not defined in Addendum; P05-ADD-T05-S02-M01: listed in tracker but not defined in Addendum; P05-T03-S01-M01..M04: listed in tracker but missing from tasks.json; P05-T04-S01-M03: tracker "OBSOLETE (Moved to Worker background)" vs tasks.json DEFERRED:GAP-029
- **OTOMIX_P05_Execution_Tracker.md** (branch and HEAD): branch: tracker "P07" vs git "P08"; HEAD: tracker "95e289f" vs git "aae0fa4"
- **entries** (ids and severity): duplicate ?
- **entries** (Status line): ? has no Status; ? has no Status; ? has no Status
- **BLOCKER entries** (no DONE references): GAP-001 references DONE task P01-T03-S02-M02; GAP-001 references DONE task P05-T02-S03-M02; CONFLICT-006 references DONE task P05-T02-S02-M05; GAP-015 references DONE task P01-T05-S01-M01; GAP-015 references DONE task P06-T02-S02-M01; GAP-015 references DONE task P06-T01-S01-M01; GAP-015 references DONE task P06-RBAC-M11; GAP-015 references DONE task P05-T02-S01-M02; GAP-015 references DONE task P05-T02-S02-M03; SUPERSEDED-006 references DONE task P05-T02-S02-M06

## Not automatable (manual review required)

- Essentia 31-feature key mapping vs `Essentia Features.xlsx` sheet 1 (P05-ADD-T03-S03-M01).
- Formula correctness of the skeleton scores (P05-ADD-T02-S01..S04); the tests only check exports and config wiring.
- Behavioural semantics of DONE tasks beyond the locator test (the audit checks that the locator file exists and contains test cases, not that those tests pass).
- Supplement entries carry no Status, so resolution of GAP/CONFLICT items cannot be verified mechanically.
