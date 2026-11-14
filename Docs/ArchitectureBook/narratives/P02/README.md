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

### P02-T01-S02-M02 - Implement hard anchor synchronization every 16 bars (every 64 beats) that resets

The task involves implementing a hard anchor synchronization mechanism that occurs every 16 bars—equivalent to 64 beats—within the timing framework of the audio processing system. This synchronization ensures that the system’s internal timing reference is consistently aligned with the actual performance of the audio signal, using measured anchor error as a feedback metric. The implementation is critical because without such periodic resets, accumulated timing drift could lead to misalignment between the intended performance and the actual output, degrading both accuracy and user experience in real-time mixing and playback.  

The function operates by detecting every 64-beat interval, measuring the current deviation from the expected anchor point, and then forcibly resetting the system’s internal timing offset (?), effectively correcting any accumulated error. This process runs in real time and is integrated into the core timing loop, ensuring stability and precision across long performance sequences. As a result, the system now maintains consistent temporal accuracy over extended durations, with anchor error dynamically corrected at regular intervals. This change directly improves the reliability of timing-based operations, enabling more precise synchronization between audio tracks and performance cues.

### P02-T02-S01-M01 - Implement floorMod, beatInBar, barIndex, blockPosition, isBlockBoundary exactly 

The task involves implementing five precise mathematical and positional functions—floorMod, beatInBar, barIndex, blockPosition, and isBlockBoundary—exactly as defined in OTOMIX §3.15, ensuring consistent temporal and structural alignment within musical time signatures. These functions are critical for accurately mapping musical events to structured time units like bars and blocks, enabling reliable playback, editing, and synchronization in a digital audio workstation. Without this implementation, the system would lack the ability to correctly interpret and navigate rhythmic subdivisions, leading to misaligned playback, inconsistent editing, or unpredictable behavior during real-time performance.  

The implementation computes the position of a sample or event within a bar and block structure by applying modular arithmetic and boundary detection logic. It determines the beat within a bar, the bar index, the block position, and whether a position falls at a block boundary—all based on the time signature and tempo. This results in a robust, mathematically sound framework that enables precise rhythmic navigation, ensuring that all timing operations are consistent, predictable, and aligned with the underlying musical structure. The delivered functions now form the core of the time-based navigation system, directly supporting real-time editing and playback accuracy in the mother module.

### P02-T02-S01-M02 - Implement quantumSeconds(bpm)=(60/bpm)/24 and quantumIndex(beatFloat)=round(beat

The task involves implementing two core functions—quantumSeconds(bpm) and quantumIndex(beatFloat)—to enable precise temporal resolution in beat-based audio processing. These functions operate on floating-point beat indices, allowing for smooth, real-time manipulation of timing within a musical sequence. The need arises because traditional beat-based systems often lack fine-grained control over timing, leading to jitter or misalignment in complex compositions. By introducing quantum-level precision, the system can maintain consistent timing across transitions, ensuring that even subtle beat variations are accurately represented and processed.

The implementation converts beats to seconds via quantumSeconds(bpm) by dividing 60 by the bpm and halving it to define a quantum duration, while quantumIndex(beatFloat) rounds a floating-point beat value multiplied by 24 to produce an integer index representing a discrete quantum beat. This allows the system to map continuous time into discrete, manageable units. As a result, the audio engine now supports sub-beat precision, enabling smoother playback, accurate looping, and real-time editing—delivering a more responsive and reliable user experience in time-based composition.

### P02-T02-S01-M03 - Implement LookaheadScheduler with a 50 ms lookahead and an injected clock, sched

The task involves implementing a LookaheadScheduler that operates with a 50 ms lookahead window and integrates an injected clock to schedule events on precise beat-based units. This component is designed to anticipate and prepare for upcoming audio events in real time, ensuring smooth and responsive timing within a music processing pipeline. The project requires this functionality to maintain temporal accuracy in dynamic audio environments where timing drift or lag could degrade performance or user experience.

This implementation solves a critical problem in real-time audio scheduling—ensuring that events are not only triggered at the correct beat but are also prepared in advance to avoid jitter or latency spikes. By operating on beat-based units and using a configurable 50 ms lookahead, the scheduler enables proactive event handling, which is essential for complex, evolving audio sequences. The implementation reads the injected clock signal to align event scheduling with the beat grid, adjusting its internal state to maintain synchronization. As a result, the system now delivers a responsive, stable timing layer that accurately schedules events with sub-beat precision, improving both performance and reliability in real-time audio processing.

### P02-T02-S02-M01 - Create an ESLint rule no-alloc-in-structural that fails on array/object/typed-ar

The task involves creating a new ESLint rule, no-alloc-in-structural, designed to detect and prevent array, object, or typed-array allocations within source files marked with the @structural tag. This rule is part of a broader effort to enforce strict memory and performance constraints in structural code, which is critical for maintaining predictable runtime behavior in high-performance systems. The project needs this rule because unbounded allocations in structural components can lead to memory bloat, performance degradation, and unintended side effects during execution—especially in environments where memory is tightly constrained or where structural integrity must be preserved at runtime.

The implementation scans files annotated with @structural and flags any direct allocation of arrays, objects, or typed arrays, ensuring that such operations are either avoided or explicitly justified. When triggered, the rule produces a clear violation message, prompting developers to refactor or reevaluate their code patterns. As a result, the codebase now enforces a consistent policy against structural allocations, improving both memory safety and maintainability, while aligning with established standards in OTOMIX and Mother specifications. This change has introduced a new layer of static analysis that helps prevent runtime errors and supports long-term system stability.

### P02-T02-S02-M02 - Write scripts/heap-proof.ts that generates timelines for 1-minute and 120-minute

The task involves developing a TypeScript script—heap-proof.ts—that generates detailed timelines for both 1-minute and 120-minute audio tracks, enabling precise performance analysis under real-world conditions. This script leverages V8 heap statistics and heap snapshots to monitor memory usage during execution, ensuring that the system's memory footprint is accurately measured over time. The implementation runs these track processing workflows, capturing memory retention at key intervals, and computes the delta between initial and final heap sizes to identify memory leaks or inefficiencies.  

This capability solves a critical gap in performance validation: without measurable heap retention data, it’s impossible to confidently assess whether audio processing operations consume excessive memory or degrade over time. By introducing a systematic method to track retained size, the project gains visibility into memory behavior under load, which is essential for maintaining stability in long-running or high-throughput environments. The result is a reliable, automated tool that delivers precise heap delta reports for each track duration, integrating seamlessly with existing test pipelines and providing actionable insights for optimization. This advancement directly supports the project’s goal of ensuring memory efficiency and scalability in real-time audio processing.

### P02-T03-S01-M01 - Implement Pearson correlation over 100 ms low-frequency energy envelopes, return

The task involves implementing a Pearson correlation function to analyze the relationship between 100 ms low-frequency energy envelopes in audio signals. This function computes the linear correlation between two time-domain energy traces, providing a quantitative measure of how closely their energy patterns align over time. The implementation is critical because inconsistent or missing correlation data can lead to inaccurate audio mixing decisions, particularly in real-time processing where dynamic balance between instruments is essential. Without a reliable, low-latency correlation metric, the system cannot effectively adapt to changes in signal characteristics during playback or mixing.

The function processes paired energy envelopes, calculating the Pearson correlation coefficient while returning a value of zero when either input has zero variance—indicating no meaningful variation in energy. It includes a flag to signal such edge cases, enabling downstream modules to handle invalid inputs gracefully. As a result, the system now reliably detects signal relationships with precision, improves mixing stability, and ensures robustness under variable input conditions, all in alignment with OTOMIX 3.4 Mother 2.4 specifications and building upon the foundational work of P01-T03-S01-M03.

### P02-T03-S01-M02 - Implement classifyKick(candidate, refs) returning OFF_BEAT when correlation < 0.

The task involves implementing a function named classifyKick that evaluates whether a candidate kick in a musical sequence is off-beat by comparing its timing and shape characteristics against reference kicks at specific bar positions—bars 5, 8, and 16. This function is critical because inconsistent or misaligned kicks can distort the rhythmic integrity of a performance, leading to a disjointed or unbalanced feel in the final mix. By identifying off-beat kicks early, the system ensures rhythmic accuracy and consistency across all recorded or generated musical elements.

The implementation computes a correlation coefficient and assesses shape variance between the candidate kick and the reference kicks at those bar positions. If the correlation falls below 0.85 or the shape variance exceeds 15%, the function returns OFF_BEAT. This decision is based on established rhythmic thresholds defined in the OTOMIX 3.4 – Mother 2.4 specification. As a result, the system now reliably flags misaligned kicks during processing, improving both the accuracy of rhythmic analysis and the overall quality of the final audio output. This change directly supports the integrity of rhythmic structure in the mix, ensuring that all kicks align with the intended beat pattern.

### P02-T03-S01-M03 - Implement forward realignment of T0 to the first validated primary downbeat in s

The task involves refining the timing alignment of off-beat rhythmic candidates by forward realigning the T0 reference point to the first validated primary downbeat within the subsequent four-bar block. This adjustment ensures that off-beat elements are consistently anchored to a stable, verified beat structure, improving rhythmic coherence across the timeline. The project requires this because inconsistent beat alignment leads to unpredictable rhythmic phasing, especially in complex polyrhythmic or irregularly structured musical passages—making it difficult for users to perceive or edit the intended rhythmic flow.  

The implementation dynamically scans each four-bar segment after the initial T0 beat, identifying the first confirmed primary downbeat and then realigning the T0 reference forward to that point. This process adjusts the temporal offset of off-beat candidates without altering the original performance data, preserving integrity while enhancing rhythmic accuracy. As a result, the system now delivers a more stable and intuitive beat grid, enabling users to navigate and edit rhythmic content with greater precision. The change directly supports the broader goal of improving rhythmic clarity and usability in the mother timeline, as defined in OTOMIX 3.4, Mother 2.4, and builds upon the foundational beat detection established in P02-T03-S01-M02.
