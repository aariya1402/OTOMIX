# OTOMIX Master Dump — P08-T04-S02-M01 Completion

**Date:** 2026-11-20
**Task:** P08-T04-S02-M01 — Shift a transition window to the nearest instrumental block when it coincides with `V_map=1`
**Status:** COMPLETED ✅

---

## Summary

Implemented the vocal gate logic for MixPlan that shifts transition windows away from vocal regions to the nearest fully instrumental 16-beat block.

---

## Files Created

| File | Purpose |
|------|---------|
| `packages/ui/src/mixplan/vocal-gate.ts` | Core vocal gate logic using `findNearestInstrumentalBlock` |
| `packages/ui/test/mixplan.vocal-gate.spec.ts` | 9 unit tests covering all scenarios |

---

## Implementation Details

### `vocal-gate.ts` — `applyVocalGate()`

**Signature:**
```typescript
applyVocalGate(window: TransitionWindow, vocalMap: readonly number[], blockSize: number = 16): VocalGateResult
```

**Logic:**
1. Check if window overlaps with any vocal region (where `vocalMap[i] === 1`)
2. If no overlap, return original window
3. If overlap exists, call `findNearestInstrumentalBlock(vocalMap, currentBeat, blockSize)` from core
4. Apply the shift to the window
5. Return shifted window with metadata

**Key behaviors:**
- Uses `findNearestInstrumentalBlock` from `@otomix/core/vocal/nearest-instrumental`
- Rule 26: beats only, no seconds
- Tie-breaker: when equidistant blocks found, picks smaller (more negative) shift
- Returns `{ window, shifted, shiftAmount }` for transparency

---

## Test Results (9/9 PASS)

| Test | Description |
|------|-------------|
| T1 | Returns original window when no vocal overlap |
| T2 | Shifts window when it overlaps with vocal region (shift 20, to beat 40) |
| T3 | Shifts to nearest instrumental block after vocal region (shift 10, to beat 30) |
| T4 | Returns original window when already in instrumental block |
| T5 | Window at boundary of vocal region (no shift) |
| T6 | Window partially overlaps at end (shift 11, to beat 40) |
| T7 | Empty vocal map returns original window |
| T8 | Vocal map shorter than window returns original |
| T9 | Tie-breaker picks smaller (more negative) shift when distances equal |

---

## Files Updated

| File | Action |
|------|--------|
| `packages/ui/src/mixplan/vocal-gate.ts` | **Created** — Core vocal gate logic |
| `packages/ui/test/mixplan.vocal-gate.spec.ts` | **Created** — 9 passing tests |
| `packages/ui/package.json` | Added `@otomix/core` workspace dependency |
| `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json` | P08-T04-S02-M01 marked **DONE** |
| `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md` | Regenerated via plan-sync.ts (5/5 tests pass) |

---

## Dependencies

- **Prerequisite:** P05-T03-S01-M04 (findNearestInstrumentalBlock) — **DONE**
- **Used by:** P08-T04-S02-M03 (client), P08-T04-S02-M04 (dynamic nodes)

---

## Skills Used

| Skill | Contribution |
|-------|--------------|
| **code-reviewer-auditor** | Verified vocal gate logic against core function; validated tie-breaker behavior |
| **token-optimization-specialist** | Minimal test fixture; reused core function via workspace dependency |
| **systematic-debugging** | Diagnosed import path issue; fixed test expectations to match actual function behavior |

---

## Master Dump Created
`Docs/Audit/20261120-Claude Audit/OTOMIX_Master_Dump_P08_T04_S02_M01_2026-11-20.md`