# OTOMIX P05 — Execution Tracker

**Document:** `OTOMIX_P05_Execution_Tracker.md`
**Location:** `Docs/OtoMix Todo-Plan/`
**Purpose:** Macro-sequence, task inventory, session log, and pending decisions for Phase P05 (including the Addendum).
**Related files:**
- `OTOMIX_MicroTask_Plan.md` (original tasks, baseline)
- `OTOMIX_MicroTask_Plan_Addendum.md` (new & overridden tasks)

---

## 1. Current State

| Item | Value |
|---|---|
| Working branch | `feature/p05-arch-upgrade` |
| Base branch (task list) | `P05` at `716419c` (clean, no arch changes) |
| Architecture commits (on feature branch) | `15fe180`, `d196a44`, `e5511a7` |
| HEAD | `e5511a7` |
| Dist state | `packages/core/dist` is manually patched; full `tsc --build` fails with ~100 errors |
| Blocked tests (aggregate) | `npx tsc -p packages/core/tsconfig.json` returns non-zero |

---

## 2. Task Inventory

### 2.1 Addendum tasks

| ID | Title | Prereq | Status |
|---|---|---|---|
| `P05-ADD-T01-S01-M01` | AdminConfig Layer | — | DONE (`d196a44`) |
| `P05-ADD-T01-S02-M01` | Stereo normalizeInput | T01-S01 | DONE (`e5511a7`) |
| `P05-ADD-T01-S03-M01` | TypeScript Build Debt (~100 errors) | — | DONE (e5511a7+) |
| `P05-ADD-T02-S01-M01` | Energy skeleton (extended) | Essentia 31 features | DONE (7017176+) |
| `P05-ADD-T02-S02-M01` | Mixability skeleton (preference) | Energy + grid | DONE (1aade59+) |
| `P05-ADD-T02-S03-M01` | Camelot Gate | `CamelotKey` from P01 | DONE (bc13750+) |
| `P05-ADD-T02-S04-M01` | Compatibility Score | Mixability + Camelot | DONE (f3d90ba+) |
| `P05-ADD-T02-S05-M01` | Structure stub | independent | DONE (47fa009+) |
| `P05-ADD-T03-S01-M01` | Grid Locking rule | grid primitives | DONE (b757c3f+) |
| `P05-ADD-T03-S02-M01` | Transition Window (variable) | AdminConfig | DONE (57bac8e+) |
| `P05-ADD-T03-S03-M01` | Essentia 31 Features (26 non-TF) | normalizeInput, Essentia | DONE (4862b16+) |
| `P05-ADD-T04-S01-M01` | Starter Track (Redux) | Compatibility | TODO |
| `P05-ADD-T04-S02-M01` | Live Re-eval (drag-reorder) | Starter Track | TODO |
| `P05-ADD-T05-S01-M01` | Engine API Contract | contracts pkg | DONE (db7035f+) |
| `P05-ADD-T05-S02-M01` | Isolated Worker | Engine API + extract | DONE |
| `P05-ADD-T06-S01-M01` | Worker Registry | AdminConfig | TODO |
| `P05-ADD-T06-S02-M01` | Heterogeneous Storage | Worker Registry | TODO |
| `P05-ADD-T06-S03-M01` | Enrichment Pipeline | Heterogeneous Storage | TODO |

### 2.2 Original P05 tasks

| ID | Title | Status |
|---|---|---|
| `P05-T01-S01-M01` | normalizeInput | DONE (overridden by ADD-T01-S02) |
| `P05-T01-S02-M01` | map.ts + Pact | DONE |
| `P05-T01-S03-M01` | extract.ts (release) | DONE |
| `P05-T01-S03-M02` | mem-check | DONE |
| `P05-T01-S03-M03` | fallback-rms | DONE |
| `P05-T02-S01-M01` | BPM seed | TODO |
| `P05-T02-S01-M02` | Static vs Dynamic | BLOCKED (OQ-20) |
| `P05-T02-S02-M01` | Energy formula | TODO (overridden by ADD-T02-S01) |
| `P05-T02-S02-M02` | Silence E=0 | TODO |
| `P05-T02-S02-M03` | Compression penalty | BLOCKED (OQ-21) |
| `P05-T02-S02-M04` | Stars from percentile | TODO |
| `P05-T02-S02-M05` | Mixability formula | TODO (overridden by ADD-T02-S02) |
| `P05-T02-S02-M06` | Normalize mix factors | BLOCKED (OQ-22) |
| `P05-T02-S03-M01` | Interpolation | TODO |
| `P05-T02-S03-M02` | Cache invalidation | TODO |
| `P05-T03-S01-M01..M04` | Vocal map | TODO |
| `P05-T04-S01-M01` | extract() orchestrator | TODO (overridden by ADD-T06-S03) |
| `P05-T04-S01-M02` | Metric 2500ms | TODO |
| `P05-T04-S01-M03` | Benchmark 1.5x | TODO |

---

## 3. Proposed Execution Sequence

The user selected "skeleton first; algorithms later". Sequence below respects the build blocker.

| # | Task | Reason |
|---|---|---|
| 1 | `P05-ADD-T01-S03-M01` (Build Debt) | Nothing builds without it. Blocks every other `core` addition. |
| 2 | `P05-ADD-T02-S03-M01` (Camelot Gate) | Simplest real gate; zero dependency on build (single new file). |
| 3 | `P05-ADD-T02-S05-M01` (Structure stub) | Independent; interface + stub only. |
| 4 | `P05-ADD-T03-S03-M01` (Essentia 31 Features) | Prerequisite for energy & mixability skeletons. |
| 5 | `P05-ADD-T02-S01-M01` (Energy skeleton) | Depends on Essentia features. |
| 6 | `P05-ADD-T02-S02-M01` (Mixability skeleton) | Depends on Energy + grid. |
| 7 | `P05-ADD-T02-S04-M01` (Compatibility Score) | Depends on Mixability + Camelot. |
| 8 | `P05-ADD-T03-S01-M01` (Grid Locking) | Locks in the analysis-only drift rule. |
| 9 | `P05-ADD-T03-S02-M01` (Transition Window) | Variable window from AdminConfig. |
| 10 | `P05-ADD-T05-S01-M01` (Engine API Contract) | Contracts only; no `core` import. |
| 11 | `P05-ADD-T05-S02-M01` (Isolated Worker) | Builds on Engine API + existing extract. |
| 12 | `P05-ADD-T06-S01-M01` (Worker Registry) | Builds on AdminConfig + isolated worker. |
| 13 | `P05-ADD-T06-S02-M01` (Heterogeneous Storage) | Builds on Worker Registry. |
| 14 | `P05-ADD-T06-S03-M01` (Enrichment Pipeline) | Builds on Heterogeneous Storage. |
| 15 | `P05-ADD-T04-S01-M01` (Starter Track Redux) | UI; depends on Compatibility. |
| 16 | `P05-ADD-T04-S02-M01` (Live Re-eval) | Depends on Starter Track. |

Original tasks (`P05-T02-*`, `P05-T03-*`) will be interleaved where the Addendum does not override them.

---

## 4. Pending Owner Decisions (Resolved 2026-11-12)

| Ref | Decision |
|---|---|
| D-A | Sequence accepted. Start with Build Debt, then Camelot Gate. |
| D-B | Original overridden tasks remain in place as `[OVERRIDDEN]` (underlying layer). |
| D-C | Pragmatic build debt fix: disable `noUncheckedIndexedAccess` locally; fix structural errors; log strict-mode debt for P11. |
| D-D | `OTOMIX_Master_Skills.md` deleted (duplicate of Cline skills directory). |
| D-E | `dist.bak_p05_s02` deleted (safety backup no longer needed). |

## 5. Session Log

Short, appendable. Each session appends one block: date, scope, outcome.

### 2026-11-12 — Setup

- Created `feature/p05-arch-upgrade` branch (3 arch commits).
- Reset `P05` to `716419c` (clean task-list state); force-pushed to origin.
- Applied `AdminConfig` layer and stereo `normalizeInput`; discovered ~100 pre-existing TS errors; logged as `P05-ADD-T01-S03-M01`.
- Created this tracker.

---

**End of Tracker.**