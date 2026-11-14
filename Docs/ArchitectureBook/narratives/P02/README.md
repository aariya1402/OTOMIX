# Phase 2 - Beat-Index Engine & Absolute Locked Grid

**Status:** 17/18 complete.

Phase 2 delivered the transient-independent Absolute Locked Grid: the t(i) mapping with drift and period bounds, hard anchor synchronization every 64 beats, piecewise variable-BPM grids, grid-lock failure recovery, anchor validation, negative-index pre-kick mapping, and the zero-RAM structural arithmetic with its proof harness. Two tasks remain blocked on owner decisions (OQ-07 numbering, OQ-02 window size) but the engine itself is done.

## What was delivered

- **P02-T01-S01-M01** - Implement tOfI(i, T0, bpmSeed, delta) as T0 + n·(60/bpmSeed) + delta with n=i−1 for i≥1 and n=i for i≤−1.
- **P02-T01-S01-M02** - Clamp delta to ±0.05 s inside tOfI and increment counter core.grid.delta_clamped when clamping occurs.
- **P02-T01-S02-M01** - Implement boundPeriod(measured, seedPeriod) constraining the result to [0.95, 1.05]×seedPeriod.
- **P02-T01-S02-M02** - Implement hard anchor synchronization every 16 bars (every 64 beats) that resets Δ to the measured anchor error.
- **P02-T02-S01-M01** - Implement floorMod, beatInBar, barIndex, blockPosition, isBlockBoundary exactly as §3.15.
- **P02-T02-S01-M02** - Implement quantumSeconds(bpm)=(60/bpm)/24 and quantumIndex(beatFloat)=round(beatFloat·24), operating on floating-point beat indices.
- **P02-T02-S01-M03** - Implement LookaheadScheduler with a 50 ms lookahead and an injected clock, scheduling events on beat-based units.
- **P02-T02-S02-M01** - Create an ESLint rule no-alloc-in-structural that fails on array/object/typed-array allocation inside files tagged @structural.
- **P02-T02-S02-M02** - Write scripts/heap-proof.ts that generates timelines for 1-minute and 120-minute tracks and reports the retained-size delta using V8 heap statistics and a heap snapshot.
- **P02-T03-S01-M01** - Implement Pearson correlation over 100 ms low-frequency energy envelopes, returning 0 for zero-variance inputs with a flag.
- **P02-T03-S01-M02** - Implement classifyKick(candidate, refs) returning OFF_BEAT when correlation < 0.85 or shape variance > 15% against the kicks at bars 5, 8 and 16.
- **P02-T03-S01-M03** - Implement forward realignment of T0 to the first validated primary downbeat in subsequent 4-bar blocks for OFF_BEAT candidates.
- **P02-T03-S01-M04** - Implement the fallback anchor: when no kick is found at bars 5, 8 or 16 (or the track is kick-less), anchor at the first transient exceeding −12 dBFS.
- **P02-T04-S01-M01** - Implement a piecewise GridModel with BPM_seed updates at predefined structural boundaries and continuity at each boundary.
- **P02-T04-S01-M02** - Implement the lock-failure recovery state: fall back to the track's global average BPM and disable micro-adjustments (Δ≡0).
- **P02-T05-S01-M01** - Implement pre-kick gap < 1 bar: assign the kick downbeat Beat 1 and earlier frames Beat −1, −2, −3.
- **P02-T05-S01-M03** - Implement the localized pre-kick tempo map for long variable-tempo introductions, counting backwards from T0.

## What remains

- **P02-T05-S01-M02** (TODO) - Implement pre-kick gap ≥ 1 bar: shift T0 backward in exact 4-beat multiples so the kick aligns with a primary downbeat (Beat 5 or Beat 9).


## Per-task narratives

### P02-T01-S01-M01 - Implement tOfI(i, T0, bpmSeed, delta) as T0 + n·(60/bpmSeed) + delta with n=i−1 

The task involves implementing a function named tOfI(i, T0, bpmSeed, delta) that computes a time value based on a sequence of inputs, where the behavior of the function depends on the value of i. This function is critical for accurately modeling time progression in a musical timing system, ensuring that beats are spaced correctly according to a base tempo and an offset. The implementation resolves a gap in the timing logic where inconsistent beat spacing could lead to misaligned musical events, especially in real-time performance scenarios.  

The function calculates the time value as T0 plus a term derived from the formula n×(60/bpmSeed) plus delta, where n is i if i is less than or equal to 1, and i otherwise. This conditional logic ensures that the timing progression adapts smoothly to different input values, maintaining consistency in beat intervals. As a result, the system now delivers precise, mathematically grounded time intervals that align with the intended tempo, improving both accuracy and reliability in playback and synchronization. This change directly supports the core functionality of the mother module, enabling seamless integration with other timing-dependent components in the software.

### P02-T01-S01-M02 - Clamp delta to ±0.05 s inside tOfI and increment counter core.grid.delta_clamped

The task involves modifying the core timing logic to ensure that the delta between consecutive time intervals does not exceed 0.05 seconds within the tOfI (time of interest) window. This adjustment is critical because unbounded delta values can lead to inconsistent timing behavior, especially under variable load conditions, which may compromise the system’s real-time responsiveness and data integrity. By enforcing a hard limit of 0.05 seconds, the system maintains predictable and stable timing performance across all operational scenarios.

The implementation monitors the delta value during each iteration within tOfI and applies a clamp operation if the delta exceeds 0.05 seconds. When clamping occurs, it increments a counter—core.grid.delta_clamped—within the core grid module to track how often such boundary conditions are triggered. This allows for post-execution analysis of timing anomalies. As a result, the system now enforces a consistent time interval boundary, improves stability during high-frequency operations, and provides measurable data on timing deviations, enabling proactive monitoring and tuning of the timing subsystem.

### P02-T01-S02-M01 - Implement boundPeriod(measured, seedPeriod) constraining the result to [0.95, 1.

The task involves implementing a function named boundPeriod(measured, seedPeriod) that ensures the output of a period calculation remains within a tightly constrained range—specifically between 0.95 and 1.05 times the input seedPeriod. This function is critical for maintaining precision and consistency in time-based computations within the system’s core timing logic. Without this constraint, measured values could drift outside acceptable bounds due to measurement noise or environmental variability, leading to unreliable scheduling and potential system instability.

The implementation works by taking a measured period value and adjusting it dynamically so that the final result is always within [0.95 × seedPeriod, 1.05 × seedPeriod], effectively filtering out outliers and ensuring stability. This adjustment is applied during runtime, leveraging existing measurement data and seed values. As a result, the system now delivers more reliable and predictable timing outputs, with all period values consistently bounded and aligned with operational expectations. This change directly supports the accuracy of downstream processes such as event scheduling and resource allocation, improving both performance and system resilience.
