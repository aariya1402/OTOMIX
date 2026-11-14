# Phase 8 - MixPlan, UI & Redux Architecture

**Status:** 0/18 complete, 2 blocked.

Phase 8 is not yet started. It builds the catalog endpoint and the React/Redux client: normalized library and ordered queue state, the two-column selector with skeleton and empty states, the Starter Track warning, the MixPlan generator (weighted recommendation, tie-breaks, vocal-gated offsets, PlanTransition calls), waveform canvas overlays for vocal zones and pre-kick offsets, and Mix Preview wired to the Runtime Observer through the DSP port. Before starting any UI work, GAP-020 requires authoring the UI binding matrix (UI element -> Redux slice -> catalog field -> Feature Registry field).

## What remains

- **P08-T01-S01-M01** (TODO) - Implement GET /api/v1/catalog/features requiring user:read with cursor pagination (next_cursor, stable (created_at,id) order).
- **P08-T01-S01-M02** (TODO) - Create the normalized library slice (byId, allIds) that keeps unmixable tracks out of the selectable set.
- **P08-T01-S02-M01** (TODO) - Create the ordered queueIndex slice with add, remove and reorder actions where Slot 1 is the Starter Track.
- **P08-T01-S02-M02** (TODO) - Trigger a memoized recomputation of the Absolute Locked Grid timeline on every queue mutation.
- **P08-T02-S01-M01** (TODO) - Render the Left Column library with BPM, Key, Energy Stars and Mixability, showing skeleton placeholders during WASM extraction.
- **P08-T02-S01-M02** (TODO) - Render the Right Column queue with drag-and-drop add/reorder and an explicit empty state.
- **P08-T03-S01-M01** (TODO) - Show the Starter Track warning when the Slot 1 track has harmonic distance 0 (identical key) and tempo delta below 1% relative to adjacent tracks.
- **P08-T04-S01-M02** (TODO) - Combine component scores as 0.40·Mixability + 0.30·Camelot + 0.20·Tempo + 0.10·Energy.
- **P08-T04-S02-M01** (TODO) - Shift a transition window to the nearest instrumental block when it coincides with V_map=1.
- **P08-T04-S02-M02** (TODO) - Implement POST /api/v1/mixplan requiring local:process and invoking PlanTransition with an idempotency key.
- **P08-T04-S02-M03** (TODO) - Build the client that creates TransitionPlanRequest objects for adjacent queue tracks and handles fallback rungs.
- **P08-T04-S02-M04** (TODO) - Build transition nodes dynamically as tracks are added to the queue.
- **P08-T05-S01-M01** (TODO) - Render vocal zones (V_map>0.65) as striped red SVG overlays on the waveform canvas.
- **P08-T05-S01-M02** (TODO) - Render pre-kick offset segments as striped warning overlays.
- **P08-T06-S01-M01** (TODO) - Connect a compiled plan to glide automation, the chopping engine and the DSP port (mock driver in tests) in a preview controller.
- **P08-T06-S01-M02** (TODO) - Attach the Runtime Observer to the preview and surface starvation/degraded-mode state in the UI.
- **P08-T04-S01-M01** (BLOCKED: BLOCKED:OQ-09) - Define the Camelot proximity, tempo-delta and energy-progression component scores (each in [0,1]).
- **P08-T04-S01-M03** (BLOCKED: BLOCKED:OQ-24) - Apply the tie-break: first on Camelot proximity, then strictly limit tempo deltas to below 1%.

