# Group 1 — Cross-check of Cline's claims

Generated: 2026-11-11 13:37:03

| Claim | Cline says | Actual | Verdict |
|---|---|---|---|
| grid.ts line count | 31 exports across 101 lines | 101 | Actual file has 101 lines |
| timing.ts line count | 12 exports | 27 | Actual file has 27 lines |
| scoring.ts line count | 7 exports | 21 | Actual file has 21 lines |
| grid.ts exports | 31 | 42 | Actual: 42 |
| timing.ts exports | 13 (then said 12) | 13 | Actual: 13 |
| scoring.ts exports | 7 | 8 | Actual: 8 |
| Total exports | 51 | 63 | Actual: 63 |
| GRID_CONSTANTS freeze entries | 24 | 22 | Actual: 22 |
| TIMING_CONSTANTS freeze entries | 12 | 11 | Actual: 11 |
| Q3.5: (0.005/48)*48 == 0.005 | EQUAL | 0.0050000000000000001 | Actual: 0.0050000000000000001 vs 0.005 = True |
| Old symbol DRIFT_MAX_S | 0 | 0 | Actual: 0 non-comment hits |
| Old symbol IRREGULAR_XFADE_EXTRA_MS | 0 | 0 | Actual: 0 non-comment hits |
| Old symbol RATE_SLEW_PER_S | 0 | 0 | Actual: 0 non-comment hits |
| Old symbol OBSERVER_MAX_EXPECTED_DRIFT_MS | 0 | 0 | Actual: 0 non-comment hits |
| Old symbol DRIFT_THRESHOLD_MS | 0 | 0 | Actual: 0 non-comment hits |
| BODY_GROUP_DELAY_MS usages | grid/body.ts:12 | 3 | Actual: packages/core/src/constants/grid.ts:63, packages/core/src/grid/body.ts:6, packages/core/src/grid/body.ts:12 |
