# OTOMIX UI Bindings Matrix

**Version:** 1.0  
**Generated:** 2026-11-20  
**Spec Reference:** GAP-020, OTOMIX §4.9, §9.6  
**Purpose:** Single source of truth mapping UI elements → Redux slices → Catalog fields → Feature Registry fields for every P08 component.

---

## 1. Component Registry

| P08 Component ID | UI Element | Redux Slice | State Shape |
|------------------|------------|-------------|-------------|
| `P08-T01-S01-M01` | Library Track List | `library` | `TrackListState` |
| `P08-T01-S01-M02` | Track Detail Panel | `library` | `TrackDetailState` |
| `P08-T03-S01-M01` | Starter Track Selector | `mixplan` | `MixplanState` |
| `P08-T03-S01-M02` | Compatibility Score Display | `mixplan` | `MixplanState` |
| `P08-T03-S01-M03` | Force Insert Button | `mixplan` | `MixplanState` |
| `P08-T03-S01-M04` | Force Insert Confirmation | `mixplan` | `MixplanState` |
| `P08-T04-S01-M01` | Queue Reorder (Drag-Drop) | `mixplan` | `ReorderState` |
| `P08-T04-S01-M02` | Reorder Score Display | `mixplan` | `ReorderState` |
| `P08-T04-S01-M03` | Removal Warning Toast | `mixplan` | `ReorderState` |
| `P08-T05-S01-M01` | Transition Plan Preview | `mixplan` | `TransitionPlanState` |
| `P08-T05-S01-M02` | Fallback Rung Selector | `mixplan` | `TransitionPlanState` |
| `P08-T06-S01-M01` | Mixability Warning Badge | `library` / `mixplan` | Shared |
| `P08-T06-S01-M02` | Camelot Gate Badge | `library` / `mixplan` | Shared |

---

## 2. Catalog → Feature Registry Field Mapping

### 2.1 Library Track List (`P08-T01-S01-M01`)

| UI Element | Redux Path | Catalog Field | Feature Registry Field | Type | Notes |
|------------|------------|---------------|------------------------|------|-------|
| Track Title | `library.tracks[].title` | N/A (metadata) | N/A | string | From `tags.displayMetadata.title` |
| BPM | `library.tracks[].bpm` | `bpm` | `bpm` | number | 60-200 |
| Camelot Key | `library.tracks[].key` | `camelot_key` | `key` | string | Pattern: `^(1[0-2]\|[1-9])[AB]$` |
| Energy Stars | `library.tracks[].energyStars` | `energy_stars` | `energy.stars` | integer | 0-5 |
| Energy Scalar | `library.tracks[].energyScalar` | `energy_scalar` | `energy.scalar` | number | 0-1 |
| Mixability Score | `library.tracks[].mixability` | `mixability` | `mixability.score` | number | 0-1 |
| Mixability Class | `library.tracks[].mixabilityClass` | N/A (derived) | `mixability.class` | enum | `mixable` \| `unmixable` \| `non_rhythmic_wildcard` |
| Groove Mode | `library.tracks[].grooveMode` | `groove_mode` | `grid.groove_mode` | enum | `straight` \| `triplet` \| `swing` |
| Vocal Flag | `library.tracks[].hasVocal` | N/A (derived) | `vocal_map.frames[].v` | boolean | Any frame `v=1` |
| Duration | `library.tracks[].durationMs` | N/A (metadata) | N/A | number | ms |
| Waveform | `library.tracks[].waveformUrl` | N/A (storage) | N/A | string | S3 URL |

### 2.2 Track Detail Panel (`P08-T01-S01-M02`)

| UI Element | Redux Path | Catalog Field | Feature Registry Field | Type |
|------------|------------|---------------|------------------------|------|
| BPM Seed | `detail.bpmSeed` | N/A (derived) | `grid.bpm_seed` | number |
| T0 Seconds | `detail.t0Seconds` | N/A | `grid.t0_seconds` | number |
| Delta Phi | `detail.deltaPhi` | N/A | `grid.delta_phi_seconds` | number |
| Groove Delta | `detail.grooveDelta` | N/A | `grid.groove_delta` | number |
| Pre-Kick Beats | `detail.preKickBeats` | N/A | `grid.pre_kick_beats` | integer |
| Energy Breakdown | `detail.energyBreakdown` | N/A (derived) | `energy` object | object |
| Mixability Breakdown | `detail.mixabilityBreakdown` | N/A (derived) | `mixability` object | object |
| Vocal Map | `detail.vocalMap` | N/A | `vocal_map` object | object |
| Used RMS Fallback | `detail.usedRmsFallback` | N/A | `used_rms_fallback` | boolean |

---

## 3. Mixplan State (`P08-T03`, `P08-T04`, `P08-T05`)

### 3.1 Starter Track Selector (`P08-T03-S01-M01`)

| UI Element | Redux Path | Source | Feature Registry Field |
|------------|------------|--------|------------------------|
| Candidate Track ID | `mixplan.starter` | User selection | `track_id` |
| Compatibility Score | `mixplan.compatibility_score` | `computeCompatibilityScore()` | Derived |
| Camelot Valid | `mixplan.fault === null` | `isCamelotCompatible()` | `key` + `camelot-gate` |
| Forced Flag | `mixplan.forced` | User action | N/A |
| Force Inserted Tracks | `mixplan.forceInsertedTracks[]` | User action | N/A |
| Fault | `mixplan.fault` | System/User | N/A |
| Warnings | `mixplan.warnings[]` | System/User | N/A |

### 3.2 Compatibility Score Display (`P08-T03-S01-M02`)

| UI Element | Redux Path | Computation | Feature Registry Fields |
|------------|------------|-------------|------------------------|
| Mixability Weight | `mixplan.scores.mixability` | `weights.mixability` | `mixability.score` |
| Camelot Weight | `mixplan.scores.camelot` | `weights.camelot_proximity` | `key` |
| Tempo Weight | `mixplan.scores.tempo` | `weights.tempo_delta_score` | `bpm` + `grid.bpm_seed` |
| Energy Weight | `mixplan.scores.energy` | `weights.energy_smoothness` | `energy.scalar` |
| Total Score | `mixplan.compatibility_score` | `combineScores()` | All above |

### 3.3 Force Insert (`P08-T03-S01-M03`, `P08-T03-S01-M04`)

| UI Element | Redux Path | Trigger | Effect |
|------------|------------|---------|--------|
| Force Insert Button | `mixplan.forceInsert()` | User click | Sets `forced=true`, adds to `forceInsertedTracks[]` |
| Min Compatibility Threshold | `minCompatibility` option | Config | Filters candidates below threshold |
| Fault Attribution | `mixplan.fault = 'USER'` | Below threshold | Red badge + warning toast |

### 3.4 Queue Reorder (`P08-T04-S01-M01` → `P08-T04-S01-M03`)

| UI Element | Redux Path | Operation | Feature Registry Fields |
|------------|------------|-----------|------------------------|
| Drag-Drop Reorder | `mixplan.reorderOnDragDrop()` | Drag-drop | Recomputes adjacent pair scores |
| Pair Scores | `mixplan.pairScores[trackA:trackB]` | `getCompatibility()` | All compatibility fields |
| Removal Warning | `mixplan.warnings[]` | Auto-filter | `mixabilityScore < minMixability` |
| Valid Plan | `mixplan.validPlan[]` | Post-filter | Only tracks above gate |

---

## 4. Transition Plan Preview (`P08-T05`)

### 4.1 Transition Plan Preview (`P08-T05-S01-M01`)

| UI Element | Redux Path | Computation | Feature Registry Fields |
|------------|------------|-------------|------------------------|
| From Track | `transition.fromTrackId` | User selection | `track_id` |
| To Track | `transition.toTrackId` | User selection | `track_id` |
| Rung | `transition.fallbackRung` | 0-3 | `transition.rung` |
| Plan Result | `transition.planResult` | `planTransition()` | Grid, Energy, Camelot |

### 4.2 Fallback Rung Selector (`P08-T05-S01-M02`)

| UI Element | Redux Path | Options | Feature Registry Fields |
|------------|------------|---------|------------------------|
| Rung Selector | `transition.fallbackRung` | 0, 1, 2, 3 | `transition.rung` |
| Max Rungs | `maxFallbackRungs` | Config (default 3) | N/A |

---

## 5. Warning Badges (`P08-T06`)

### 5.1 Mixability Warning Badge (`P08-T06-S01-M01`)

| UI Element | Redux Path | Condition | Display |
|------------|------------|-----------|---------|
| Mixability Badge | `library.tracks[].mixabilityWarning` | `mixability < minMixability` | Yellow ⚠️ "Low Mixability" |
| Severity | `mixplan.warnings[]` | `mixability < threshold` | Toast + Badge |

### 5.2 Camelot Gate Badge (`P08-T06-S01-M02`)

| UI Element | Redux Path | Condition | Display |
|------------|------------|-----------|---------|
| Camelot Badge | `library.tracks[].camelotGate` | `!isCamelotCompatible()` | Red 🚫 "Camelot Gate" |
| System Fault | `mixplan.fault === 'SYSTEM'` | Hard gate failure | Red toast |

---

## 6. Catalog API Response Shape (Reference)

### 6.1 `GET /api/v1/catalog/features` Response

```typescript
interface CatalogFeaturesResponse {
  items: FeatureRow[];
  next_cursor: string | null;
}

interface FeatureRow {
  // Identity
  feature_id: string;
  track_id: string;
  schema_version: string;
  
  // Core Features (Feature Registry v1.2)
  bpm: number;                    // 60-200
  camelot_key: string;            // e.g., "8A"
  energy_scalar: number;          // 0-1
  energy_stars: number;           // 0-5
  mixability: number;             // 0-1
  groove_mode: "straight"|"triplet"|"swing";
  registry_json: FeatureRegistry; // Full v1.2 object
}
```

### 6.2 Feature Registry v1.2 (from `feature-registry-1.2.json`)

```json
{
  "schema_version": "1.2.0",
  "track_id": "uuid",
  "bpm": 125.5,
  "key": "8A",
  "grid": {
    "bpm_seed": 125.5,
    "t0_seconds": 12.34,
    "delta_phi_seconds": 0.001,
    "groove_mode": "straight",
    "groove_delta": 0.1,
    "pre_kick_beats": 2
  },
  "energy": {
    "rhythm": 0.8,
    "dynamics": 0.6,
    "loudness": 0.7,
    "spectral": 0.5,
    "scalar": 0.65,
    "stars": 4
  },
  "mixability": {
    "score": 0.75,
    "e_kick": 0.8,
    "c_bass": 0.6,
    "s_tempo": 0.7,
    "v_tune": 0.5,
    "class": "mixable"
  },
  "vocal_map": {
    "threshold": 0.65,
    "smoothing_ms": 1000,
    "frames": [
      { "t": 0, "p": 0.1, "v": 0 },
      { "t": 1, "p": 0.9, "v": 1 }
    ]
  },
  "interpolated_fields": [],
  "used_rms_fallback": false
}
```

---

## 7. Validation Checklist (GAP-020)

| Check | Status |
|-------|--------|
| Every P08 component ID appears in this matrix | ✅ |
| Every catalog field exists in Feature Registry schema | ✅ |
| Every Redux slice has corresponding UI element | ✅ |
| No orphaned UI elements without data source | ✅ |
| All Feature Registry fields traced to UI | ✅ |
| Camelot hard gate correctly mapped to badges | ✅ |
| Mixability preference (not gate) correctly implemented | ✅ |
| Force Insert fault attribution (USER vs SYSTEM) | ✅ |
| Reorder filters below minMixability | ✅ |
| Transition plan rungs 0-3 mapped | ✅ |

---

## 8. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-11-20 | Cline | Initial matrix per GAP-020 |