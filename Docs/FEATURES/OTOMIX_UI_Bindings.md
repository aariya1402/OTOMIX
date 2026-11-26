# OTOMIX P08 UI Binding Matrix

**Status:** Binding reference for P08 MixPlan/UI implementation  
**Scope:** P08 only  
**Schema source:** Feature Registry v1.2 (`packages/contracts/schemas/feature-registry-1.2.json`)  
**Catalog source:** `GET /api/v1/catalog/features` implemented by `P08-T01-S01-M01`  
**Current implementation note:** Binding names below follow code that already exists. Where a P08 component or preview field is not implemented yet, it is marked `planned` or `TBD` rather than inferred.

## Binding rules

- The normalized UI library owns display fields in `LibraryState.byId`; Redux queues store track IDs only.
- Catalog rows are mapped into `LibraryTrack` fields by P08-T01-S01-M02. Do not copy catalog objects into the queue slice.
- Catalog `registry_json` is the source for nested Feature Registry fields; top-level catalog columns are the denormalized P08 display/projection values.
- Timeline timing fields currently used by `packages/ui/src/state/timeline.ts` are defaults because `T0`, `deltaQuanta`, and duration are not present on `LibraryTrack`; they are `TBD` until their catalog/registry mapping is implemented.
- A compatibility score is a computed UI/MixPlan value, not a field on the catalog response or Feature Registry v1.2.
- `TBD` means no binding is established by existing code. `planned` means the P08 plan establishes the UI surface but has not implemented or exposed it yet.

## Matrix

| UI Element | Redux Slice/State | Catalog Field | Feature Registry Field | P08 Task ID |
|---|---|---|---|---|
| Library list | `library.byId`; `library.allIds` | `items[]` with `track_id`, `bpm`, `camelot_key`, `energy_stars`, `mixability`, `groove_mode`, `registry_json`, `analyzed_at` | `track_id`; `bpm`; `key`; `energy.stars`; `mixability.score`; `grid.groove_mode`; `registry_json` is the containing payload | P08-T01-S01-M01; P08-T01-S01-M02 |
| BPM | `LibraryTrack.bpm`; `library.byId[trackId].bpm` | `bpm` | `bpm` and `grid.bpm_seed` | P08-T01-S01-M02; P08-T02-S01-M01 |
| Camelot/Key | `LibraryTrack.camelotKey`; `library.byId[trackId].camelotKey` | `camelot_key` | `key` | P08-T01-S01-M02; P08-T02-S01-M01; P08-T04-S01-M01 |
| Energy Stars | `LibraryTrack.energyStars`; `library.byId[trackId].energyStars` | `energy_stars` | `energy.stars` | P08-T01-S01-M02; P08-T02-S01-M01; P08-T04-S01-M02 |
| Mixability | `LibraryTrack.mixability`; `library.byId[trackId].mixability`; `UNMIXABLE_THRESHOLD=0.4` | `mixability` | `mixability.score`; `mixability.class` classifies wildcard/unmixable | P08-T01-S01-M02; P08-T02-S01-M01; P08-T04-S01-M02 |
| Queue | `queue.queueIds` stores ordered track IDs only | Queue membership resolves to `items[].track_id`; no direct queue field on catalog response | `TBD`: queue order is UI state, not a Feature Registry field | P08-T01-S02-M01; P08-T02-S01-M02 |
| Starter Track | `queue.queueIds[0]`; `mixplan.starter`; `MixplanState.compatibility_score` | `TBD`: resolved by `track_id` from catalog items; no dedicated starter catalog field | `TBD`: starter selection is derived UI state; `key` and adjacent track `grid.bpm_seed` may feed warning logic | P08-T03-S01-M01; P08-T02-S01-M02 |
| Vocal Overlay | `planned`: P08 waveform overlay state/component input; no Redux slice exists yet | `TBD`: planned to use the track's catalog payload; no dedicated top-level catalog vocal field | `vocal_map.frames[].v=1`; render/evaluation uses `vocal_map.threshold=0.65` | P08-T05-S01-M01 |
| Pre-kick Overlay | Implemented as a standalone SVG overlay; not mounted because no waveform canvas/state exists yet | `TBD`: no dedicated top-level catalog pre-kick column; may be available only in `registry_json` | Pre-kick segments (`startBeat`, `bpmSeed`) from `grid.pre_kick_beats`; negative beat indices are converted to waveform seconds using `T0` | P08-T05-S01-M02 |
| Mix Preview | `PreviewController` in `packages/ui/src/preview/controller.ts`; `MixPlanApp.previewController` subscribes to observer status (not Redux state) | `TBD`: receives a compiled MixPlan result; catalog BPM/key/mixability tracks remain referenced through queue/library IDs | Runtime Observer reports frame time, buffer size, starvation and degraded mode through a dedicated worker bridge; no direct registry field exists for preview playback state | P08-T06-S01-M01; P08-T06-S01-M02 |
| Timeline | `timeline.selectTimeline(state={ queue, library })`; `TimelinePoint.beatIndex`, `absoluteTime`, `trackId` | Catalog `bpm`; `TBD` for T0, `deltaQuanta`, and duration | `grid.bpm_seed`; `grid.t0_seconds`; `grid.delta_phi_seconds`; duration is not defined by v1.2 | P08-T01-S02-M02 |
| Compatibility Score | `mixplan.compatibility_score`; `StarterCandidate.compatibilityScore`; `reorder.ts` recomputes adjacent scores | `TBD`: computed value, not returned by catalog | `TBD`: derived from `mixability.score`, `key`, `bpm/grid.bpm_seed`, and `energy.scalar`/`energy.stars`; Feature Registry has no `compatibility_score` field | P08-T04-S01-M01; P08-T04-S01-M02; P08-T04-S01-M03 |
| Transition nodes | `planned`: P08 MixPlan node state; no stable Redux field exists in the current UI exports | `TBD`: built from adjacent `items[].track_id` references and `POST /api/v1/mixplan` response | `TBD`: adjacent track bindings use `bpm`, `key`, `grid.*`, `vocal_map.frames[]`; final fallback/rung is in the MixPlan response | P08-T04-S02-M03; P08-T04-S02-M04 |
| Starter warning | `planned`: P08 warning state/module; `mixplan.warnings`/`fault` may surface the result | BPM/key resolved through each adjacent queue track's catalog item | `key`; `grid.bpm_seed`; tempo delta is computed from adjacent BPM seed values | P08-T03-S01-M01 |
| Preview degraded state | `PreviewController.getObserverState()` / `subscribeObserver()`; `MixPlanApp.previewController` | `TBD`: preview runtime state is not catalog data | Runtime Observer state is delivered from the observer worker; starvation switches the preview DSP buffer from 2048 to 4096 samples and latches degraded mode | P08-T06-S01-M02 |

## Current catalog-to-slice projection

The existing P08 projection is:

- `feature_id`, `track_id`, `tenant_id`, `schema_version`, `analyzed_at` are catalog record metadata.
- `bpm` maps to `LibraryTrack.bpm`.
- `camelot_key` maps to `LibraryTrack.camelotKey`.
- `energy_stars` maps to `LibraryTrack.energyStars`.
- `mixability` maps to `LibraryTrack.mixability`.
- `groove_mode` and `registry_json` provide the remaining catalog/Feature Registry-backed context.
- `queueIds` remain normalized IDs and do not duplicate library fields.

`isWildcard` is derived from registry/mixability classification or catalog data classification. It is not an independent catalog column or Feature Registry v1.2 field name; existing UI code currently receives it in `LibraryTrack`.

## Internal consistency checks

- Library fields and component labels match `packages/ui/src/state/library.ts` and `packages/ui/src/components/LibraryColumn.tsx`.
- Queue state and queue slot behavior match `packages/ui/src/state/queue.ts` and `packages/ui/src/components/QueueColumn.tsx`.
- Timeline inputs match `packages/ui/src/state/timeline.ts`; its unresolved T0, deltaQuanta, and duration inputs are documented as `TBD`, not invented.
- Compatibility score fields match `packages/ui/src/state/mixplan.ts` and `packages/ui/src/mixplan/score.ts`.
- Feature Registry names match `packages/contracts/schemas/feature-registry-1.2.json`.
- Catalog top-level names match `packages/gateway/src/repository/features-repository.ts` and `GET /api/v1/catalog/features`.
