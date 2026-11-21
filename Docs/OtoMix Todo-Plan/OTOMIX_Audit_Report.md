# OTOMIX Plan Audit Report

Generated: 2026-11-21T14:12:42.078Z
Source: `tools/test/plan-audit.spec.ts` (run with `npx vitest run tools/test/plan-audit.spec.ts`)

## Summary

Checks: 345 · Passed: 322 · Failed: 23

| Area | Checks | Failed |
|---|---|---|
| Task registry | 302 | 14 |
| Master plan | 2 | 2 |
| Addendum | 18 | 2 |
| Addendum invariants | 13 | 2 |
| Tracker | 3 | 0 |
| Supplement | 6 | 3 |
| Build health | 1 | 0 |

## Failures

- **P04-T03-S01-M05** (per-task): DONE but prerequisite P04-T03-S01-M04 is CANCELLED:Session-Refresh
- **P05-T02-S02-M05** (per-task): unrecognized status "SUPERSEDED:SUPERSEDED-006"
- **P05-T02-S02-M06** (per-task): unrecognized status "SUPERSEDED:SUPERSEDED-006"
- **P05-T04-S01-M01** (per-task): DONE but prerequisite P05-T02-S02-M05 is SUPERSEDED:SUPERSEDED-006
- **P06-T02-S02-M02** (per-task): test file contains no test cases: features/authz.feature
- **P08-T04-S02-M03** (per-task): DONE but prerequisite P08-T04-S02-M02 is TODO; DONE but prerequisite P08-T01-S02-M01 is TODO
- **GATE0-DEC-M01** (per-task): DONE but test file not found: tools/test/docs-consistency.spec.ts
- **GATE0-DEC-M03** (per-task): DONE but test file not found: packages/adapter/test/normalize.policy.spec.ts
- **GATE0-VER-M01** (per-task): DONE but test field has no file locator
- **GATE0-P05-M06** (per-task): DONE but test file not found: packages/db/test/features-analysis-status.spec.ts
- **GATE0-DOC-M03** (per-task): DONE but test file not found: tools/test/ui-bindings.spec.ts
- **GATE0-CHK-M01** (per-task): DONE but prerequisite GATE0-DOC-M01 is TODO
- **GATE0-SEC-M03** (per-task): DONE but test field has no file locator
- **X-DR-M01** (per-task): DONE but prerequisite GATE0-DOC-M01 is TODO
- **OTOMIX_MicroTask_Plan.md** ([x] vs DONE): P06-T02-S01-M03: md [ ] vs json DONE; P06-T02-S02-M02: md [ ] vs json DONE; GATE0-DEC-M01: md [ ] vs json DONE; GATE0-DEC-M02: md [ ] vs json DONE; GATE0-DEC-M03: md [ ] vs json DONE; GATE0-DOC-M03: md [ ] vs json DONE; GATE0-VER-M01: md [ ] vs json DONE; GATE0-VER-M02: md [ ] vs json DONE; GATE0-P05-M01: md [ ] vs json DONE; GATE0-P05-M02: md [ ] vs json DONE; GATE0-P05-M03: md [ ] vs json DONE; GATE0-P05-M04: md [ ] vs json DONE; GATE0-P05-M05: md [ ] vs json DONE; GATE0-P05-M06: md [ ] vs json DONE; GATE0-P05-M07: md [ ] vs json DONE; GATE0-SEC-M01: md [ ] vs json DONE; GATE0-SEC-M03: md [ ] vs json DONE; GATE0-CHK-M01: md [ ] vs json DONE; X-OPS-M01: md [ ] vs json DONE; X-DR-M01: md [ ] vs json DONE; P07-REG-M01: md [ ] vs json DONE; P07-REG-M03: md [ ] vs json DONE; P07-REG-M04: md [ ] vs json DONE
- **OTOMIX_MicroTask_Plan.md** (json task has md heading): P02-T05-S01-M02 [DONE]; P03-T02-S01-M02 [DONE]; P03-T03-S01-M03 [CANCELLED:Resolved]; P03-T04-S02-M01 [DONE]; P04-T01-S01-M02 [CANCELLED:Legacy-Arch]; P04-T01-S01-M03 [CANCELLED:Legacy-Arch]; P04-T01-S02-M01 [DONE]; P04-T01-S02-M02 [CANCELLED:Legacy-Arch]; P04-T01-S02-M03 [CANCELLED:Legacy-Arch]; P04-T02-S01-M01 [DONE]; P04-T02-S01-M02 [DONE]; P04-T02-S01-M03 [DONE]; P04-T02-S02-M01 [DONE]; P04-T02-S02-M02 [DONE]; P04-T02-S02-M03 [DONE]; P04-T02-S02-M04 [CANCELLED:Legacy-Arch]; P04-T03-S01-M01 [DONE]; P04-T03-S01-M02 [DONE]; P04-T03-S01-M03 [DONE]; P04-T03-S01-M04 [CANCELLED:Session-Refresh]; P04-T03-S01-M05 [DONE]; P04-T03-S02-M01 [DONE]; P04-T03-S02-M02 [DONE]; P04-T04-S01-M01 [DONE]; P04-T04-S01-M02 [DONE]; P04-T04-S02-M01 [DONE]; P04-T04-S02-M02 [DONE]; P04-T04-S02-M03 [DONE]; P04-T04-S02-M04 [DONE]; P04-T04-S02-M05 [DONE]; P04-T04-S03-M01 [DONE]; P04-T04-S03-M02 [DONE]; P05-T02-S02-M01 [DONE]; P05-T02-S02-M03 [DONE]; P05-T02-S02-M05 [SUPERSEDED:SUPERSEDED-006]; P05-T02-S02-M06 [SUPERSEDED:SUPERSEDED-006]; P05-T03-S01-M03 [DONE]; P05-T04-S01-M01 [DONE]; P05-T04-S01-M03 [DEFERRED:GAP-029]; P06-T02-S03-M01 [SUPERSEDED:GAP-015]; P06-T03-S01-M01 [SUPERSEDED:GAP-015]; P06-T03-S01-M02 [SUPERSEDED:GAP-015]; P06-T04-S01-M01 [DONE]; P06-T04-S02-M01 [DONE]; P06-T04-S02-M02 [DONE]; P06-T04-S02-M03 [DONE]; P06-T04-S02-M04 [DONE]; P06-T05-S01-M01 [DONE]; P06-T05-S01-M02 [DONE]; P06-T05-S01-M03 [DONE]; P06-T06-S01-M01 [DONE]; P06-T06-S01-M02 [DONE]; P06-T06-S01-M03 [DONE]; P06-T07-S01-M01 [DONE]; P06-T07-S01-M02 [DONE]; P06-T07-S01-M03 [DONE]; P07-T01-S01-M01 [DONE]; P07-T01-S02-M01 [DONE]; P07-T01-S02-M02 [DONE]; P07-T01-S03-M01 [DONE]; P07-T02-S01-M01 [DONE]; P07-T02-S01-M02 [DONE]; P07-T02-S01-M03 [DONE]; P07-T02-S01-M04 [DONE]; P07-T02-S02-M01 [DONE]; P07-T03-S01-M01 [DONE]; P07-T03-S02-M01 [DONE]; P07-T03-S02-M02 [DONE]; P07-T03-S02-M03 [DONE]; P07-T03-S02-M04 [DONE]; P07-T04-S01-M01 [DONE]; P07-T04-S01-M02 [DONE]; P07-T05-S01-M01 [DONE]; P08-T01-S01-M01 [TODO]; P08-T01-S01-M02 [TODO]; P08-T01-S02-M01 [TODO]; P08-T01-S02-M02 [TODO]; P08-T02-S01-M01 [TODO]; P08-T02-S01-M02 [TODO]; P08-T03-S01-M01 [TODO]; P08-T04-S01-M01 [BLOCKED:OQ-09]; P08-T04-S01-M02 [TODO]; P08-T04-S01-M03 [BLOCKED:OQ-24]; P08-T04-S02-M01 [DONE]; P08-T04-S02-M02 [TODO]; P08-T04-S02-M03 [DONE]; P08-T04-S02-M04 [TODO]; P08-T05-S01-M01 [TODO]; P08-T05-S01-M02 [TODO]; P08-T06-S01-M01 [TODO]; P08-T06-S01-M02 [TODO]; P09-T01-S01-M01 [TODO]; P09-T01-S01-M02 [TODO]; P09-T01-S01-M03 [TODO]; P09-T01-S01-M04 [TODO]; P09-T01-S02-M01 [TODO]; P09-T01-S02-M02 [TODO]; P09-T01-S02-M03 [TODO]; P09-T01-S02-M04 [TODO]; P09-T01-S02-M05 [BLOCKED:OQ-12]; P09-T02-S01-M01 [TODO]; P09-T02-S01-M02 [TODO]; P09-T02-S02-M01 [TODO]; P09-T02-S02-M02 [TODO]; P09-T02-S02-M03 [TODO]; P09-T02-S02-M04 [TODO]; P09-T02-S03-M01 [BLOCKED:OQ-13]; P09-T03-S01-M01 [BLOCKED:OQ-10]; P09-T03-S01-M02 [TODO]; P09-T04-S01-M01 [TODO]; P09-T04-S01-M02 [TODO]; P10-T01-S01-M01 [TODO]; P10-T01-S01-M02 [TODO]; P10-T01-S02-M01 [TODO]; P10-T01-S02-M02 [TODO]; P10-T02-S01-M01 [TODO]; P10-T02-S01-M02 [TODO]; P10-T03-S01-M01 [TODO]; P10-T03-S01-M02 [TODO]; P10-T04-S01-M01 [TODO]; P10-T04-S01-M02 [TODO]; P10-T04-S02-M01 [TODO]; P10-T04-S02-M02 [TODO]; P10-T04-S02-M03 [TODO]; P10-T04-S02-M04 [TODO]; P10-T05-S01-M01 [TODO]; P10-T05-S01-M02 [TODO]; P10-T05-S01-M03 [TODO]; P10-T05-S01-M04 [TODO]; P10-T05-S01-M05 [TODO]; P10-T06-S01-M01 [TODO]; P11-T01-S01-M01 [TODO]; P11-T01-S02-M01 [TODO]; P11-T01-S02-M02 [TODO]; P11-T01-S02-M03 [TODO]; P11-T02-S01-M01 [TODO]; P11-T02-S01-M02 [TODO]; P11-T03-S01-M01 [TODO]; P11-T03-S01-M02 [TODO]; P11-T03-S01-M03 [BLOCKED:OQ-04]; P11-T03-S01-M04 [TODO]; P11-T03-S01-M05 [TODO]; P11-T04-S01-M01 [TODO]; P11-T04-S01-M02 [TODO]; P11-T04-S01-M03 [TODO]; P11-T05-S01-M01 [TODO]; P11-T05-S01-M02 [TODO]; P11-T05-S01-M03 [TODO]; P11-T05-S01-M04 [TODO]; P11-T06-S01-M01 [TODO]; P11-T07-S01-M01 [TODO]; P11-T07-S01-M02 [TODO]; P11-T07-S01-M03 [TODO]; P05-ADD-T06-S03-M01 [TODO]; GATE0-P05-M06-CLOUD [TODO]; GATE0-P05-M06-LOCAL [TODO]; GATE0-P05-M07-CLOUD [TODO]; GATE0-P05-M07-LOCAL [TODO]; GATE0-VER-M01-CLOUD [TODO]; GATE0-VER-M01-LOCAL [TODO]; P07-T05-S01-M01-CLOUD [TODO]; P07-T05-S01-M01-LOCAL [TODO]; P07-REG-M02-CLOUD [TODO]; P07-REG-M02-LOCAL [TODO]
- **Addendum.md** (unique ids): P05-ADD-T01-S03-M01 defined 2x
- **P05-ADD-T06-S02-M01** (expected outcome files): missing: packages/core/src/repository/global-features.ts
- **P05-ADD-T06-S02-M01** (packages/core/src/repository/global-features.ts): file missing: packages/core/src/repository/global-features.ts
- **P05-ADD-T01-S02-M01** (stereo default): forceMono defaults to true in packages/core/src/audio/normalize.ts
- **entries** (ids and severity): duplicate ?
- **entries** (Status line): ? has no Status; ? has no Status; ? has no Status
- **BLOCKER entries** (no DONE references): GAP-001 references DONE task P01-T03-S02-M02; GAP-001 references DONE task P05-T02-S03-M02; GAP-015 references DONE task P01-T05-S01-M01; GAP-015 references DONE task P06-T02-S02-M01; GAP-015 references DONE task P06-T02-S01-M03; GAP-015 references DONE task P06-T02-S02-M02; GAP-015 references DONE task P06-T01-S01-M01; GAP-015 references DONE task P06-RBAC-M11; GAP-015 references DONE task P05-T02-S01-M02; GAP-015 references DONE task P05-T02-S02-M03; GAP-027 references DONE task P07-T05-S01-M01

## Not automatable (manual review required)

- Essentia 31-feature key mapping vs `Essentia Features.xlsx` sheet 1 (P05-ADD-T03-S03-M01).
- Formula correctness of the skeleton scores (P05-ADD-T02-S01..S04); the tests only check exports and config wiring.
- Behavioural semantics of DONE tasks beyond the locator test (the audit checks that the locator file exists and contains test cases, not that those tests pass).
- Supplement entries carry no Status, so resolution of GAP/CONFLICT items cannot be verified mechanically.
