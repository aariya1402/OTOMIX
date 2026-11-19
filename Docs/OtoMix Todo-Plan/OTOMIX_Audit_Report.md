# OTOMIX Plan Audit Report

Generated: 2026-11-19T13:52:21.385Z
Source: `tools/test/plan-audit.spec.ts` (run with `npx vitest run tools/test/plan-audit.spec.ts`)

## Summary

Checks: 335 · Passed: 287 · Failed: 48

| Area | Checks | Failed |
|---|---|---|
| Task registry | 292 | 39 |
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
- **GATE0-DEC-M01** (per-task): prerequisite None | does not exist
- **GATE0-DEC-M02** (per-task): prerequisite `GATE0-DEC-M01` | does not exist
- **GATE0-DEC-M03** (per-task): prerequisite None | does not exist
- **GATE0-DOC-M01** (per-task): prerequisite None | does not exist
- **GATE0-VER-M01** (per-task): prerequisite None | does not exist
- **GATE0-VER-M02** (per-task): prerequisite `GATE0-VER-M01` | does not exist
- **GATE0-P05-M01** (per-task): prerequisite `GATE0-DEC-M01` | does not exist
- **GATE0-P05-M02** (per-task): prerequisite `GATE0-DEC-M03` | does not exist
- **GATE0-P05-M03** (per-task): prerequisite `GATE0-P05-M01` | does not exist
- **GATE0-P05-M04** (per-task): prerequisite None | does not exist
- **GATE0-P05-M05** (per-task): prerequisite `GATE0-P05-M02` does not exist; prerequisite `GATE0-P05-M03` does not exist; prerequisite `GATE0-P05-M04` | does not exist
- **GATE0-P05-M06** (per-task): prerequisite `GATE0-VER-M01` | does not exist
- **GATE0-P05-M07** (per-task): prerequisite `GATE0-P05-M05` does not exist; prerequisite `GATE0-P05-M06` does not exist; prerequisite `GATE0-VER-M02` | does not exist
- **GATE0-SEC-M01** (per-task): prerequisite `GATE0-DEC-M03` | does not exist
- **GATE0-DOC-M03** (per-task): prerequisite `GATE0-DEC-M01` does not exist; prerequisite `GATE0-DEC-M02` | does not exist
- **GATE0-CHK-M01** (per-task): prerequisite all CRITICAL `GATE0-*` tasks | does not exist
- **GATE0-DOC-M02** (per-task): prerequisite `GATE0-DOC-M01` | does not exist
- **GATE0-VER-M03** (per-task): prerequisite `GATE0-VER-M01` | does not exist
- **GATE0-SEC-M02** (per-task): prerequisite `GATE0-SEC-M01` | does not exist
- **GATE0-SEC-M03** (per-task): prerequisite None | does not exist
- **GATE0-SEC-M04** (per-task): prerequisite `P06-RBAC-M06` | does not exist
- **X-ARC-M01** (per-task): prerequisite None | does not exist
- **X-ARC-M02** (per-task): prerequisite None | does not exist
- **X-ARC-M03** (per-task): prerequisite `GATE0-VER-M02` does not exist; prerequisite `GATE0-P05-M02` | does not exist
- **X-ARC-M04** (per-task): prerequisite `GATE0-P05-M06` | does not exist
- **X-ARC-M05** (per-task): prerequisite `GATE0-VER-M01` | does not exist
- **X-TST-M01** (per-task): prerequisite `GATE0-P05-M01` | does not exist
- **X-TST-M02** (per-task): prerequisite None | does not exist
- **X-TST-M03** (per-task): prerequisite `GATE0-P05-M07` | does not exist
- **X-SEC-M01** (per-task): prerequisite `P07-REG-M04` | does not exist
- **X-OPS-M01** (per-task): prerequisite None | does not exist
- **X-DR-M01** (per-task): prerequisite `GATE0-DOC-M01` | does not exist
- **P08-PRE-M01** (per-task): prerequisite `GATE0-CHK-M01` does not exist; prerequisite `P07-REG-M06` | does not exist
- **OTOMIX_MicroTask_Plan.md** ([x] vs DONE): P07-REG-M01: md [ ] vs json DONE; P07-REG-M03: md [ ] vs json DONE; P07-REG-M04: md [ ] vs json DONE
- **OTOMIX_MicroTask_Plan.md** (json task has md heading): P02-T05-S01-M02 [DONE]; P03-T02-S01-M02 [DONE]; P03-T03-S01-M03 [CANCELLED:Resolved]; P03-T04-S02-M01 [DONE]; P04-T01-S01-M02 [CANCELLED:Legacy-Arch]; P04-T01-S01-M03 [CANCELLED:Legacy-Arch]; P04-T01-S02-M01 [DONE]; P04-T01-S02-M02 [CANCELLED:Legacy-Arch]; P04-T01-S02-M03 [CANCELLED:Legacy-Arch]; P04-T02-S01-M01 [DONE]; P04-T02-S01-M02 [DONE]; P04-T02-S01-M03 [DONE]; P04-T02-S02-M01 [DONE]; P04-T02-S02-M02 [DONE]; P04-T02-S02-M03 [DONE]; P04-T02-S02-M04 [CANCELLED:Legacy-Arch]; P04-T03-S01-M01 [DONE]; P04-T03-S01-M02 [DONE]; P04-T03-S01-M03 [DONE]; P04-T03-S01-M04 [CANCELLED:Session-Refresh]; P04-T03-S01-M05 [DONE]; P04-T03-S02-M01 [DONE]; P04-T03-S02-M02 [DONE]; P04-T04-S01-M01 [DONE]; P04-T04-S01-M02 [DONE]; P04-T04-S02-M01 [DONE]; P04-T04-S02-M02 [DONE]; P04-T04-S02-M03 [DONE]; P04-T04-S02-M04 [DONE]; P04-T04-S02-M05 [DONE]; P04-T04-S03-M01 [DONE]; P04-T04-S03-M02 [DONE]; P05-T02-S01-M02 [DONE]; P05-T02-S02-M01 [DONE]; P05-T02-S02-M03 [DONE]; P05-T02-S02-M05 [DONE]; P05-T02-S02-M06 [DONE]; P05-T03-S01-M03 [DONE]; P05-T04-S01-M01 [DONE]; P05-T04-S01-M03 [DEFERRED:GAP-029]; P06-T02-S03-M01 [SUPERSEDED:GAP-015]; P06-T03-S01-M01 [SUPERSEDED:GAP-015]; P06-T03-S01-M02 [SUPERSEDED:GAP-015]; P06-T04-S01-M01 [DONE]; P06-T04-S02-M01 [DONE]; P06-T04-S02-M02 [DONE]; P06-T04-S02-M03 [DONE]; P06-T04-S02-M04 [DONE]; P06-T05-S01-M01 [DONE]; P06-T05-S01-M02 [DONE]; P06-T05-S01-M03 [DONE]; P06-T06-S01-M01 [DONE]; P06-T06-S01-M02 [DONE]; P06-T06-S01-M03 [DONE]; P06-T07-S01-M01 [DONE]; P06-T07-S01-M02 [DONE]; P06-T07-S01-M03 [DONE]; P07-T01-S01-M01 [DONE]; P07-T01-S02-M01 [DONE]; P07-T01-S02-M02 [DONE]; P07-T01-S03-M01 [DONE]; P07-T02-S01-M01 [DONE]; P07-T02-S01-M02 [DONE]; P07-T02-S01-M03 [DONE]; P07-T02-S01-M04 [DONE]; P07-T02-S02-M01 [DONE]; P07-T03-S01-M01 [DONE]; P07-T03-S02-M01 [DONE]; P07-T03-S02-M02 [DONE]; P07-T03-S02-M03 [DONE]; P07-T03-S02-M04 [DONE]; P07-T04-S01-M01 [DONE]; P07-T04-S01-M02 [DONE]; P07-T05-S01-M01 [DONE]; P08-T01-S01-M01 [TODO]; P08-T01-S01-M02 [TODO]; P08-T01-S02-M01 [TODO]; P08-T01-S02-M02 [TODO]; P08-T02-S01-M01 [TODO]; P08-T02-S01-M02 [TODO]; P08-T03-S01-M01 [TODO]; P08-T04-S01-M01 [BLOCKED:OQ-09]; P08-T04-S01-M02 [TODO]; P08-T04-S01-M03 [BLOCKED:OQ-24]; P08-T04-S02-M01 [TODO]; P08-T04-S02-M02 [TODO]; P08-T04-S02-M03 [TODO]; P08-T04-S02-M04 [TODO]; P08-T05-S01-M01 [TODO]; P08-T05-S01-M02 [TODO]; P08-T06-S01-M01 [TODO]; P08-T06-S01-M02 [TODO]; P09-T01-S01-M01 [TODO]; P09-T01-S01-M02 [TODO]; P09-T01-S01-M03 [TODO]; P09-T01-S01-M04 [TODO]; P09-T01-S02-M01 [TODO]; P09-T01-S02-M02 [TODO]; P09-T01-S02-M03 [TODO]; P09-T01-S02-M04 [TODO]; P09-T01-S02-M05 [BLOCKED:OQ-12]; P09-T02-S01-M01 [TODO]; P09-T02-S01-M02 [TODO]; P09-T02-S02-M01 [TODO]; P09-T02-S02-M02 [TODO]; P09-T02-S02-M03 [TODO]; P09-T02-S02-M04 [TODO]; P09-T02-S03-M01 [BLOCKED:OQ-13]; P09-T03-S01-M01 [BLOCKED:OQ-10]; P09-T03-S01-M02 [TODO]; P09-T04-S01-M01 [TODO]; P09-T04-S01-M02 [TODO]; P10-T01-S01-M01 [TODO]; P10-T01-S01-M02 [TODO]; P10-T01-S02-M01 [TODO]; P10-T01-S02-M02 [TODO]; P10-T02-S01-M01 [TODO]; P10-T02-S01-M02 [TODO]; P10-T03-S01-M01 [TODO]; P10-T03-S01-M02 [TODO]; P10-T04-S01-M01 [TODO]; P10-T04-S01-M02 [TODO]; P10-T04-S02-M01 [TODO]; P10-T04-S02-M02 [TODO]; P10-T04-S02-M03 [TODO]; P10-T04-S02-M04 [TODO]; P10-T05-S01-M01 [TODO]; P10-T05-S01-M02 [TODO]; P10-T05-S01-M03 [TODO]; P10-T05-S01-M04 [TODO]; P10-T05-S01-M05 [TODO]; P10-T06-S01-M01 [TODO]; P11-T01-S01-M01 [TODO]; P11-T01-S02-M01 [TODO]; P11-T01-S02-M02 [TODO]; P11-T01-S02-M03 [TODO]; P11-T02-S01-M01 [TODO]; P11-T02-S01-M02 [TODO]; P11-T03-S01-M01 [TODO]; P11-T03-S01-M02 [TODO]; P11-T03-S01-M03 [BLOCKED:OQ-04]; P11-T03-S01-M04 [TODO]; P11-T03-S01-M05 [TODO]; P11-T04-S01-M01 [TODO]; P11-T04-S01-M02 [TODO]; P11-T04-S01-M03 [TODO]; P11-T05-S01-M01 [TODO]; P11-T05-S01-M02 [TODO]; P11-T05-S01-M03 [TODO]; P11-T05-S01-M04 [TODO]; P11-T06-S01-M01 [TODO]; P11-T07-S01-M01 [TODO]; P11-T07-S01-M02 [TODO]; P11-T07-S01-M03 [TODO]; P05-ADD-T06-S03-M01 [TODO]; GATE0-DEC-M01 [TODO]; GATE0-DEC-M02 [TODO]; GATE0-DEC-M03 [TODO]; GATE0-DOC-M01 [TODO]; GATE0-VER-M01 [TODO]; GATE0-VER-M02 [TODO]; GATE0-P05-M01 [TODO]; GATE0-P05-M02 [TODO]; GATE0-P05-M03 [TODO]; GATE0-P05-M04 [TODO]; GATE0-P05-M05 [TODO]; GATE0-P05-M06 [TODO]; GATE0-P05-M07 [TODO]; GATE0-SEC-M01 [TODO]; GATE0-DOC-M03 [TODO]; GATE0-CHK-M01 [TODO]; GATE0-DOC-M02 [TODO]; GATE0-VER-M03 [TODO]; GATE0-SEC-M02 [TODO]; GATE0-SEC-M03 [TODO]; GATE0-SEC-M04 [TODO]; X-ARC-M01 [TODO]; X-ARC-M02 [TODO]; X-ARC-M03 [TODO]; X-ARC-M04 [TODO]; X-ARC-M05 [TODO]; X-TST-M01 [TODO]; X-TST-M02 [TODO]; X-TST-M03 [TODO]; X-SEC-M01 [TODO]; X-OPS-M01 [TODO]; X-DR-M01 [TODO]; P08-PRE-M01 [TODO]
- **Addendum.md** (unique ids): P05-ADD-T01-S03-M01 defined 2x
- **P05-ADD-T01-S02-M01** (stereo default): forceMono defaults to true in packages/core/src/audio/normalize.ts
- **OTOMIX_P05_Execution_Tracker.md** (status agreement): P05-ADD-T05-S01-M01: listed in tracker but not defined in Addendum; P05-ADD-T05-S02-M01: listed in tracker but not defined in Addendum; P05-T03-S01-M01..M04: listed in tracker but missing from tasks.json; P05-T04-S01-M03: tracker "OBSOLETE (Moved to Worker background)" vs tasks.json DEFERRED:GAP-029
- **OTOMIX_P05_Execution_Tracker.md** (branch and HEAD): branch: tracker "P07" vs git "debug-7"; HEAD: tracker "95e289f" vs git "157f660"
- **entries** (ids and severity): duplicate ?
- **entries** (Status line): ? has no Status; ? has no Status; ? has no Status
- **BLOCKER entries** (no DONE references): GAP-001 references DONE task P01-T03-S02-M02; GAP-001 references DONE task P05-T02-S03-M02; CONFLICT-006 references DONE task P05-T02-S02-M05; GAP-015 references DONE task P01-T05-S01-M01; GAP-015 references DONE task P06-T02-S02-M01; GAP-015 references DONE task P06-T01-S01-M01; GAP-015 references DONE task P06-RBAC-M11; GAP-015 references DONE task P05-T02-S01-M02; GAP-015 references DONE task P05-T02-S02-M03; SUPERSEDED-006 references DONE task P05-T02-S02-M06; GAP-027 references DONE task P07-T05-S01-M01

## Not automatable (manual review required)

- Essentia 31-feature key mapping vs `Essentia Features.xlsx` sheet 1 (P05-ADD-T03-S03-M01).
- Formula correctness of the skeleton scores (P05-ADD-T02-S01..S04); the tests only check exports and config wiring.
- Behavioural semantics of DONE tasks beyond the locator test (the audit checks that the locator file exists and contains test cases, not that those tests pass).
- Supplement entries carry no Status, so resolution of GAP/CONFLICT items cannot be verified mechanically.
