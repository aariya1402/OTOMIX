# OTOMIX Full Code Audit — 15-Group Consolidated Log

**Generated**: 2026-11-11
**Branch**: P04
**HEAD**: f6d46ed
**Status**: 15/15 groups analyzed. Fix phase not started.

**Category legend:**
- `VIOLATION` — definite bug (seconds/ms where quanta expected). Must fix.
- `STALE COMMENT` — comment contradicts code. Must update.
- `TYPE GAP` — BPM brand lost in transit. Must fix or document.
- `AMBIGUOUS` — needs owner decision before fix.
- `DOC GAP` — missing JSDoc on public API.
- `DEAD EXPORT` — exported but unused in production.
- `RISK` — potential runtime issue.
- `CORRECTION` — earlier claim refuted by later group.

---

## SUMMARY TOTALS

| Category | Count | IDs |
|---|---|---|
| VIOLATION | 8 | V1-1..V1-5, V5-1, V7-1, V7-2 |
| STALE COMMENT | 6 | C1-1..C1-4, C3-1, C6-1, C8-1 |
| STALE TEST DESC | 1 | C8-2 |
| TYPE GAP | 3 | T2-1, T2-2, T14-1 |
| AMBIGUOUS | 20 | A1-1..A15-2 |
| DOC GAP | 12 | D3-1, D4-1..D4-2, D7-1, D13-1..D13-6, D15-1..D15-2 |
| DEAD EXPORT | 2 | E9-1, E13-1 |
| RISK | 1 | R5-1 |
| CORRECTION | 3 | X2-1, X9-1, X11-1, X12-1 |

---

## GROUP 1 — constants/{grid,timing,scoring}.ts

### VIOLATION (5)
| ID | File:Line | Symbol | Current | Should Be |
|---|---|---|---|---|
| V1-1 | grid.ts:59 | BODY_RMS_WINDOW_MS | 5 ms | quanta or samples |
| V1-2 | grid.ts:60 | BODY_SEARCH_WINDOW_MS | 50 ms | quanta or samples |
| V1-3 | grid.ts:63 | BODY_GROUP_DELAY_MS | 7.3 ms | samples |
| V1-4 | timing.ts:13 | PEARSON_WINDOW_MS | 100 ms | samples or remove (dead) |
| V1-5 | scoring.ts:9 | VOCAL_MEDIAN_S | 1 s | beats or quanta |

### STALE COMMENT (4)
| ID | File:Line | Comment mentions |
|---|---|---|
| C1-1 | grid.ts:1 | DRIFT_MAX_S (old name) |
| C1-2 | grid.ts:4 | IRREGULAR_XFADE_EXTRA_MS (old name) |
| C1-3 | grid.ts:5 | RATE_SLEW_PER_S (old name) |
| C1-4 | grid.ts:7 | IRREGULAR_XFADE_EXTRA_MS (old name) |

### AMBIGUOUS (1)
| ID | Issue |
|---|---|
| A1-1 | GRID_CONSTANTS only 22 of 42 exports in freeze. Missing: BODY_*, REALIGN_*, BEATS_PER_BAR, SAMPLE_RATE, ATTACK_*, TRANSITION_WINDOW_*, SAFETY_XFADE_*, LOG_REALIGN_K, BEAT_EPSILON |

---

## GROUP 2 — types/{bpm,beat-index,camelot}.ts

### TYPE GAP (2)
| ID | File:Line | Field | Current | Should Be |
|---|---|---|---|---|
| T2-1 | transition/types.ts:22 | mappedBpm | number | BPM |
| T2-2 | transition/anchors.ts:19 | bpmSeed | number | BPM |

### AMBIGUOUS (2)
| ID | Issue |
|---|---|
| A2-1 | bpm.ts:12 bounds [60,200] hardcoded, not in constants/ |
| A2-2 | CamelotKey zero production consumer (tests only) |

### CORRECTION (1)
| ID | Original claim | Refuted by |
|---|---|---|
| X2-1 | Cline: M02 blocked because BPM.parse(40) fails | computeGlideTarget only uses Number.isFinite + >0. No BPM.parse call. M02 NOT blocked |

---

## GROUP 3 — grid/{t-of-i,model,period,anchor-sync,phase-offset}.ts

### STALE COMMENT (1)
| ID | File:Line | Comment | Should Be |
|---|---|---|---|
| C3-1 | anchor-sync.ts:25 | DRIFT_MAX_S | DRIFT_MAX_QUANTA |

### DOC GAP (2)
| ID | Symbol |
|---|---|
| D3-1 | getSyncedDrift — driftPerBeat unit undocumented (seconds/beat vs quanta/beat) |
| D3-2 | GridModel.t(i) — takes number, not BeatIndex |

### AMBIGUOUS (1)
| ID | Issue |
|---|---|
| A3-1 | getSyncedDrift returns seconds (not quanta). Cline classified as BOUNDARY_WEB_AUDIO. Disputed: drift is internal musical quantity, should be quanta |

---

## GROUP 4 — grid/{attack,body,fft,hamming,dual-grid}.ts

### DOC GAP (2)
| ID | Symbol |
|---|---|
| D4-1 | extractAttackGrid no JSDoc |
| D4-2 | extractBodyGrid no JSDoc |

### AMBIGUOUS (2)
| ID | Issue |
|---|---|
| A4-1 | BODY_RMS_WINDOW_MS = 5ms — musical window or fixed physical window? Should scale with tempo? |
| A4-2 | BODY_SEARCH_WINDOW_MS = 50ms — same question |

Note: V1-1, V1-2 overlap A4-1, A4-2. Body.ts consumption is at module-load (once), so runtime is fine — but architectural unit decision remains.

---

## GROUP 5 — grid/{prekick-map,prekick-short,realign-cosine,realign-trigger}.ts

### VIOLATION (1)
| ID | File:Line | Symbol | Current | Should Be |
|---|---|---|---|---|
| V5-1 | realign-cosine.ts:18-21 | cosineRealign deltaPhi/correction | ms | quanta |

### RISK (1)
| ID | File:Line | Issue |
|---|---|---|
| R5-1 | prekick-short.ts:10-12 | BeatIndex.parse throw in hot path — should return Result or silent fallback |

### DOC GAP (1)
| ID | Symbol |
|---|---|
| D5-1 | getPreKickTime segment walk without inline comments |

### AMBIGUOUS (1)
| ID | Issue |
|---|---|
| A5-1 | All 4 functions in this group have zero production consumer |

---

## GROUP 6 — transition/{types,anchors,planner,index}.ts

### STALE COMMENT (1)
| ID | File:Line | Comment | Should Be |
|---|---|---|---|
| C6-1 | anchors.ts:14 | totalBeats - 15 | totalBeats - 63 |

### AMBIGUOUS (3)
| ID | Issue |
|---|---|
| A6-1 | RUNG_GLOBAL_AVG_BPM unreachable (reserved for future?) |
| A6-2 | RUNG_STANDARD_CROSSFADE unreachable (reserved for P04-T04-S03-M02) |
| A6-3 | RUNG_WSOLA_LEGACY unreachable (reserved for P04-T02-S02-M04) |

---

## GROUP 7 — observer/{drift,scale,degrade,realign-log}.ts

### VIOLATION (2)
| ID | File:Line | Symbol | Current | Should Be |
|---|---|---|---|---|
| V7-1 | realign-log.ts | logRealign deltaPhi | ms | quanta |
| V7-2 | bench/observer-cycle.bench.ts:41,42 | computeDrift/computeNextRate calls | missing bpm arg | add bpm |

### DOC GAP (1)
| ID | Symbol |
|---|---|
| D7-1 | scale.ts:computeNextRate no JSDoc |

---

## GROUP 8 — groove/{classify,delta,irregular,types,index}.ts

### STALE COMMENT (1)
| ID | File:Line | Comment |
|---|---|---|
| C8-1 | irregular.ts:16-21 | IRREGULAR_XFADE_EXTRA_MS + baseCrossfadeMs + "milliseconds" |

### STALE TEST DESC (1)
| ID | File:Line | Description |
|---|---|---|
| C8-2 | groove.irregular.spec.ts:57 | "adds 10 ms" but asserts 5.48 quanta |

### AMBIGUOUS (1)
| ID | Issue |
|---|---|
| A8-1 | groove module zero production consumer (tests only) |

---

## GROUP 9 — anchor/{classify,fallback,pearson,realign}.ts

### DEAD EXPORT (1)
| ID | File:Line | Export |
|---|---|---|
| E9-1 | pearson.ts:53 | PEARSON_WINDOW_MS re-exported but unused in computation |

### AMBIGUOUS (1)
| ID | Issue |
|---|---|
| A9-1 | anchor module zero production consumer (tests only, except internal pearson→classify) |

### CORRECTION (1)
| ID | Original claim | Refuted by |
|---|---|---|
| X9-1 | Cline (Group 1): FALLBACK_TRANSIENT_DBFS, CORR_MIN, SHAPE_VAR_MAX "no consumer" | All 3 consumed in anchor/{fallback,classify}.ts |

---

## GROUP 10 — timing/{clock,quantum,scheduler,structure}.ts

### AMBIGUOUS (3)
| ID | Issue |
|---|---|
| A10-1 | quantumSeconds zero production caller (drift.ts uses local var) |
| A10-2 | PerformanceClock never instantiated (scheduler injects Clock but no provider) |
| A10-3 | timing module zero production consumer |

---

## GROUP 11 — resilience/{retry,degraded}.ts

### AMBIGUOUS (1)
| ID | Issue |
|---|---|
| A11-1 | resilience module zero production consumer |

### CORRECTION (1)
| ID | Original claim | Refuted by |
|---|---|---|
| X11-1 | My prompt: DEFAULT_BASE_MS/DEFAULT_CAP_MS are exports | They are module-private const (not exported) |

---

## GROUP 12 — telemetry/{logger,propagation}.ts

### AMBIGUOUS (1)
| ID | Issue |
|---|---|
| A12-1 | telemetry module zero production consumer |

### CORRECTION (1)
| ID | Original claim | Refuted by |
|---|---|---|
| X12-1 | My prompt: LogRecord has timestamp field | LogRecord has no timestamp. sanitizeRecord synthesizes ts ISO field |

---

## GROUP 13 — dsp/{biquad,butterworth}.ts

### DEAD EXPORT (1)
| ID | File | Export |
|---|---|---|
| E13-1 | biquad.ts | Biquad — exported but only used by butterworth.ts (same package) |

### DOC GAP (6)
| ID | Symbol |
|---|---|
| D13-1 | Biquad |
| D13-2 | BiquadCoeffs |
| D13-3 | Biquad.process() |
| D13-4 | Biquad.reset() |
| D13-5 | CascadedButterworth |
| D13-6 | biquadLowpass |

### AMBIGUOUS (1)
| ID | Issue |
|---|---|
| A13-1 | Zero direct tests for dsp/biquad.ts, dsp/butterworth.ts, grid/fft.ts, grid/hamming.ts |

---

## GROUP 14 — glide/target.ts + index.ts

### TYPE GAP (1)
| ID | File:Line | Field | Current | Should Be |
|---|---|---|---|---|
| T14-1 | glide/target.ts:14 | computeGlideTarget return | number | BPM |

### AMBIGUOUS (3)
| ID | Issue |
|---|---|
| A14-1 | index.ts export bloat (37 export * from, zero selective) |
| A14-2 | Zero barrel integration test |
| A14-3 | computeGlideTarget zero production consumer (until M02) |

---

## GROUP 15 — contracts/{index,semver-gate,types,validate}.ts

### DOC GAP (2)
| ID | Symbol |
|---|---|
| D15-1 | validateSchemaVersion |
| D15-2 | validateRegistry |

### AMBIGUOUS (2)
| ID | Issue |
|---|---|
| A15-1 | validateSchemaVersion and validateRegistry independent (schema JSON duplicates semver regex ^1\.2\.\d+$) |
| A15-2 | contracts package zero production consumer |

---

## KNOWN RELATIONSHIPS (preliminary — to be verified by Cline)

### Cluster 1: Quantum conversion (delta unit)
- V5-1 (cosineRealign ms) + V7-1 (realign-log ms) + A3-1 (getSyncedDrift seconds) + A10-1 (quantumSeconds dead)
- All touch "delta correction unit". Coordinated fix likely.

### Cluster 2: BPM brand
- T2-1 (mappedBpm) + T2-2 (bpmSeed) + T14-1 (computeGlideTarget return)
- All need same refactor. Will break glide.target.spec.ts + transition tests if applied.

### Cluster 3: body.ts constants
- V1-1 (BODY_RMS_WINDOW_MS) + V1-2 (BODY_SEARCH_WINDOW_MS) + V1-3 (BODY_GROUP_DELAY_MS) + A4-1 + A4-2
- All in grid/body.ts consumption chain.

### Cluster 4: GRID_CONSTANTS freeze
- A1-1 — 20 missing constants. If freeze is completed, may need coordinated update to constants.grid.spec.ts.

### Cluster 5: Production consumer gaps
- A5-1 + A8-1 + A9-1 + A10-3 + A11-1 + A12-1 + A14-3 + A15-2
- 8 modules. Wiring decision affects P04-P10 architecture.

### Cluster 6: Barrel / export strategy
- A1-1 (freeze) + A14-1 (export bloat) + A14-2 (no barrel test)
- All about "what's public".

### Cluster 7: Realignment unit chain
- phaseOffset() → cosineRealign() → realign-log.ts:logRealign() → getSyncedDrift()
- Full chain unit consistency needs coordinated review.

### Cluster 8: Zero test coverage
- A13-1 (dsp internals) + A14-2 (barrel)
- Test coverage gaps.

---

## FIX PHASES (proposed, pending Cline relationship analysis)

**Phase A — Pre-work (no code changes)**
1. Read this log carefully
2. Get Cline relationship analysis (Phase B below)
3. Owner decisions on 20 AMBIGUOUS items

**Phase B — Cline relationship analysis**
(separate prompt)

**Phase C — Fix in dependency order**
(after Cline returns dependency graph)

---

## STATUS
**Waiting for Cline relationship analysis** (prompt in next message).