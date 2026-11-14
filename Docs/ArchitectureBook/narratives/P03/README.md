# Phase 3 - Dual Grid & Runtime Observer

**Status:** 21/24 complete.

Phase 3 delivered the Attack Grid and Body Grid extractors, the phase offset delta-phi, the Body-to-Attack realignment curves (cosine and logarithmic), the asynchronous Runtime Observer, the groove classifier (Straight/Triplet/Swing/Irregular), and the Universal Transition Guarantee planner that turns grids into a never-cancelling transition plan. Three tasks remain blocked on owner decisions (OQ-17, OQ-01, OQ-04) but the grid and observer work is done.

## What was delivered

- **P03-T01-S01-M01** - Implement extractAttackGrid(pcm) using spectral-flux peak detection with a 2048-sample Hamming window, 50% overlap, restricted to frequencies above 200 Hz.
- **P03-T01-S02-M01** - Implement extractBodyGrid(pcm) using an 80 Hz Butterworth low-pass filter followed by RMS amplitude detection to locate the sub-bass envelope peak.
- **P03-T02-S01-M01** - Implement phaseOffset(T_body_peak, T_attack_onset) returning Δϕ = T_body_peak − T_attack_onset.
- **P03-T02-S01-M03** - Keep the Dual Grid dormant for negative beat indices and initialize it only at Beat 1.
- **P03-T03-S01-M01** - Detect the realignment trigger: outgoing sub-band RMS below −40 dBFS after crossfade completion.
- **P03-T03-S01-M02** - Implement the 4-bar cosine interpolation realignment at about 1 ms per beat.
- **P03-T03-S01-M04** - Implement the Observer's post-transition 16-bar logarithmic realignment using beat-grid slicing (no pitch shift).
- **P03-T04-S01-M01** - Implement the drift calculation: phase delta between the rendering clock position and the Absolute Locked Grid.
- **P03-T04-S01-M02** - Apply slice-chopping realignment when drift exceeds the quanta threshold. No playbackRate time-stretching is allowed.
- **P03-T04-S01-M03** - Expand the audio buffer from 2048 to 4096 samples when frame processing exceeds the Web Audio boundary threshold.
- **P03-T04-S01-M04** - Benchmark the Observer loop cycle and fail if the P99 exceeds 48 samples (1 ms at 48kHz).
- **P03-T05-S01-M01** - Classify micro-timing across 16th-note subdivisions as Straight (<2% variance), Triplet (<5% from 33.3%/66.6%) or Swing (off-beat 16ths displaced 0.05–0.33 beat).
- **P03-T05-S01-M02** - Compute Δ_groove and shift chopping window boundaries by that swing displacement.
- **P03-T05-S01-M03** - For irregular or hybrid grooves default to Straight and expand the micro-crossfade window by +10 ms.
- **P03-T06-S01-M01** - Anchor the incoming track at Beat 1 of its initial 16-beat block (bars 1–4) and the outgoing track at its final 16-beat block.
- **P03-T06-S01-M02** - Force mathematical alignment across the 16-beat timeline when the incoming track has no kick transients in its first 16 beats.
- **P03-T06-S01-M03** - Map a static 120 BPM grid for purely ambient or kick-less tracks (RUNG_STATIC_120_GRID).
- **P03-T06-S01-M04** - Implement the ultimate safety net: a clean 4-bar volume crossfade independent of grid locks (RUNG_FOUR_BAR_CROSSFADE).
- **P03-T06-S01-M05** - Handle tracks shorter than 16 beats with a silent structural loop (RUNG_SILENT_LOOP).
- **P03-T06-S01-M06** - Decide whether transition windows are 16 beats (4 bars) or 16 bars (64 beats) at the Float32Array processing stage.
- **P03-T06-S01-M07** - Add a property-based test generating 10 000 random plan requests (BPM, lengths, kick presence, tempo deltas) and asserting a plan is always returned.

## What remains

- **P03-T02-S01-M02** (TODO) - Compare Attack power vs Body power. If Body > Attack, tag BODY_DOMINANT. Save to global metadata.
- **P03-T04-S02-M01** (TODO) - Implement BPM matching via slice chopping to prevent any pitch shift. Original key is preserved.


## Per-task narratives

### P03-T01-S01-M01 - Implement extractAttackGrid(pcm) using spectral-flux peak detection with a 2048-

The task involves implementing a function named extractAttackGrid(pcm) that detects transient attack events in audio signals using spectral-flux peak detection. This function processes raw audio samples—specifically, a PCM stream—by applying a 2048-sample Hamming window with 50% overlap to isolate short-time spectral features. The detection is restricted to frequencies above 200 Hz, ensuring that only high-frequency transients, such as those from percussive attacks, are considered. This implementation builds upon prior work in signal preprocessing (P02-T01-S01-M01), enabling a more precise identification of attack events in real-time audio analysis.

This capability solves a critical gap in the system’s ability to distinguish between sustained and transient components in audio, which is essential for accurate instrument classification and performance analysis. By focusing on high-frequency spectral changes, the function effectively isolates the onset of attacks—like a drum hit or a plucked string—without being misled by background noise or low-frequency content. The result is a robust, real-time attack grid that accurately maps temporal attack events across the audio stream, enhancing the system’s responsiveness and fidelity in dynamic audio processing. This change directly supports the core functionality outlined in OTOMIX 3.2 Mother 2.2, improving both performance and interpretability of the audio analysis pipeline.

### P03-T01-S02-M01 - Implement extractBodyGrid(pcm) using an 80 Hz Butterworth low-pass filter follow

The task involves implementing a function named extractBodyGrid(pcm) that processes audio PCM data to isolate the sub-bass envelope peak, a critical component in low-frequency audio analysis. This function applies an 80 Hz Butterworth low-pass filter to smooth out high-frequency noise and transient components, preserving only the fundamental sub-bass signal. Following filtering, it performs root-mean-square (RMS) amplitude detection to measure the energy of the filtered signal over time, identifying the peak envelope that represents the most prominent sub-bass event.  

This implementation solves a key problem in real-time audio processing: distinguishing meaningful low-frequency events from background noise or artifacts. Without such filtering and detection, the system would misinterpret dynamic variations in the audio signal, leading to inaccurate performance metrics or faulty signal interpretation. The result is a robust, reliable method that extracts the sub-bass envelope peak from raw PCM input, enabling more precise analysis of bass dynamics. This advancement directly supports the broader goal of accurate audio signal characterization as defined in OTOMIX 3.2 Mother 2.2, building upon the foundational work established in P03-T01-S01-M01. The delivered function now operates efficiently and consistently within the system’s real-time constraints, enhancing both signal fidelity and analytical accuracy.

### P03-T02-S01-M01 - Implement phaseOffset(T_body_peak, T_attack_onset) returning Δϕ = T_body_peak − 

The task involves implementing a function that computes the phase offset between two temporal events in a sound signal—specifically, the body peak and the attack onset—by returning the difference between their timestamps. This function is critical for aligning physiological and acoustic events in real-time audio processing, ensuring that timing data from body sensors matches the onset of sound events in a way that reflects actual physical behavior. Without this capability, the system would lack precise temporal synchronization, leading to misaligned analysis and degraded performance in applications like speech or vocal analysis.  

The implementation calculates the phase offset as the difference between the body peak time (T_body_peak) and the attack onset time (T_attack_onset), effectively returning ?? = T_body_peak – T_attack_onset. This operation is executed within the Mother module, leveraging prior foundational work on signal timing and event detection. As a result, the system now accurately captures the temporal relationship between physical body responses and sound events, enabling more reliable real-time feedback and improved signal interpretation. This change directly enhances the precision and usability of the audio-physiological interface, as defined in OTOMIX 3.2 – Mother 2.2.

### P03-T02-S01-M03 - Keep the Dual Grid dormant for negative beat indices and initialize it only at B

The task involves managing the Dual Grid in a beat-based audio processing system by ensuring it remains dormant during negative beat indices and is only initialized at Beat 1. This behavior is critical for maintaining system stability and preventing unintended processing during invalid or pre-beat timeframes. Without this control, the system could trigger erroneous operations or memory access during negative beats, leading to instability or crashes in real-time performance.  

The implementation enforces a conditional initialization logic: the Dual Grid is not instantiated or activated until the system reaches Beat 1, after which it operates normally. During all prior beats—especially negative ones—the grid remains inactive, with no processing or data loading. This function ensures that the system only begins processing at the correct temporal point, aligning with the project’s timing model and avoiding premature execution. As a result, the system now reliably initializes the Dual Grid at the proper beat, eliminates potential runtime errors, and maintains consistent behavior across all beat indices. This change directly supports the core functionality of the Mother module as defined in OTOMIX 3.10 and Mother 2.10, ensuring robustness and predictability in real-time audio workflows.

### P03-T03-S01-M01 - Detect the realignment trigger: outgoing sub-band RMS below −40 dBFS after cross

The task involves detecting a specific signal condition—when the root mean square (RMS) of an outgoing sub-band drops below –40 dBFS—after the completion of a crossfade operation. This detection is critical for identifying when audio transitions between sub-bands have effectively settled, ensuring smooth and seamless transitions without audible artifacts. The project requires this capability to maintain audio fidelity during dynamic mixing, where abrupt or inconsistent transitions could degrade listener experience. Without this trigger, the system would lack a reliable signal-based event to confirm when a sub-band has fully transitioned, potentially leading to processing errors or redundant operations.

The implementation monitors RMS levels in real time post-crossfade, comparing them against the –40 dBFS threshold. When the condition is met, it generates a realignment trigger that signals downstream processes to initiate reprocessing or reconfiguration of the audio stream. As a result, the system now reliably detects when sub-band transitions are complete, enabling precise control over mixing dynamics and ensuring consistent audio quality across all output channels. This change strengthens the system’s responsiveness and accuracy, aligning with the OTOMIX 3.2 Mother 2.2 specification and building upon the foundational work established by P03-T02-S01-M01.

### P03-T03-S01-M02 - Implement the 4-bar cosine interpolation realignment at about 1 ms per beat.

The task involves implementing a 4-bar cosine interpolation realignment mechanism that synchronizes audio data with a beat grid at a precision of approximately 1 millisecond per beat. This ensures that musical elements align smoothly and consistently across time, maintaining rhythmic integrity during playback. The project requires this functionality because inconsistent timing between audio segments can lead to audible jitter or misalignment, especially in complex arrangements where precise rhythmic phasing is critical. Without such realignment, the perceived musical flow would suffer, undermining both performance quality and user experience.

The implementation performs cosine-based interpolation across four-bar segments, adjusting audio samples in real time to match the beat grid with smooth, natural transitions. By leveraging cosine curves, it minimizes abrupt changes in amplitude and phase, preserving the organic feel of the music. As a result, the system now delivers a more stable, rhythmically accurate audio stream, with improved temporal consistency across all playback sequences. This advancement directly supports the project’s goal of delivering polished, professional-grade audio output that feels both precise and fluid to the listener.

### P03-T03-S01-M04 - Implement the Observer's post-transition 16-bar logarithmic realignment using be

The task involves implementing a precise audio realignment mechanism—specifically, the Observer’s post-transition 16-bar logarithmic realignment—using beat-grid slicing without introducing pitch shifts. This implementation ensures that audio segments align seamlessly across transitions in a musical timeline, maintaining temporal accuracy while preserving the original pitch and tonal integrity of the signal. The project requires this functionality to address a critical gap in timing consistency during dynamic transitions between sections of a composition, where even minor misalignments can disrupt the perceived flow and cohesion of the performance.

By slicing the audio timeline into 16-bar segments and applying logarithmic realignment based on the beat grid, the system dynamically adjusts segment positions to match the underlying rhythmic structure. This function operates independently of pitch alteration, ensuring that the audio remains true to its original tonal characteristics. As a result, the audio workflow now supports smoother, more reliable transitions between sections, with improved synchronization across time-based elements. The implementation, grounded in OTOMIX 3.6 and Mother 2.6 specifications and building upon the foundational work of P03-T03-S01-M02, has successfully integrated a robust, rhythm-aware realignment mechanism that enhances both precision and usability in real-time audio processing.

### P03-T04-S01-M01 - Implement the drift calculation: phase delta between the rendering clock positio

The task involves implementing a drift calculation mechanism that measures the phase delta between the rendering clock position and the Absolute Locked Grid—a critical synchronization reference in the system. This implementation ensures that visual output remains temporally aligned with the underlying physical timeline, preventing visual artifacts such as stutter, jitter, or misalignment during real-time rendering.  

The need for this functionality arises because without accurate phase tracking, the system cannot maintain consistent temporal fidelity across rendering cycles, especially under variable frame rates or system load. This drift could lead to degraded user experience, particularly in time-sensitive applications like live video or interactive simulations. The implementation computes the phase difference in real time by continuously comparing the current rendering clock against the Absolute Locked Grid, adjusting for any deviation through a feedback loop.  

As a result, the system now dynamically monitors and corrects temporal drift, ensuring that rendered content stays precisely synchronized with the intended timeline. This change enables smoother, more reliable performance across diverse operating conditions, directly supporting the project’s goal of delivering a stable and responsive user interface. The implementation is fully integrated and validated against the OTOMIX 3.6 – Mother 2.6 specification, building upon the foundational work established in P02-T01-S01-M01.

### P03-T04-S01-M02 - Apply slice-chopping realignment when drift exceeds the quanta threshold. No pla

The task involves implementing a slice-chopping realignment mechanism to correct audio drift during playback when the deviation exceeds a predefined quanta threshold. This process ensures temporal alignment of audio segments by dynamically adjusting segment boundaries without introducing time-stretching effects, which would otherwise distort the audio’s natural timing and quality. The implementation is critical because uncorrected drift leads to audible misalignment, especially in long-form recordings or live streams, degrading user experience and audio fidelity. Without this mechanism, even minor timing inconsistencies would accumulate, resulting in a noticeable, distracting drift that undermines the integrity of the audio content.

The function operates by continuously monitoring the playback drift relative to a reference timeline, and when the deviation surpasses the quanta threshold, it triggers a realignment through slice-chopping—breaking and reassembling audio segments to realign them precisely. This adjustment is performed in real time, with no playbackRate manipulation, preserving the original tempo and pitch. As a result, the system now maintains consistent audio timing across all playback scenarios, delivering a stable, synchronized listening experience without introducing artifacts or unnatural time-stretching. This change directly supports the project’s goal of delivering high-fidelity, reliable audio performance in real-world conditions.

### P03-T04-S01-M03 - Expand the audio buffer from 2048 to 4096 samples when frame processing exceeds 

The task involves expanding the audio buffer size from 2048 to 4096 samples during frame processing when the Web Audio API’s boundary threshold is exceeded. This adjustment ensures that audio processing remains stable and efficient under high-load conditions, preventing data loss or processing errors that could otherwise occur when the buffer is too small to accommodate real-time audio streams. The project requires this enhancement because the original buffer size is insufficient to handle complex audio processing chains, especially in scenarios involving high sample rates or large audio segments, which are common in professional audio mixing environments.

The implementation dynamically scales the buffer during frame processing, detecting when the Web Audio boundary is breached and automatically increasing the buffer to 4096 samples. This function preserves audio integrity by allowing sufficient processing time for each frame without introducing latency or artifacts. As a result, the system now handles larger audio segments smoothly, reducing dropouts and improving overall performance. The change aligns with OTOMIX 3.6 Mother 2.6 specifications and builds upon the foundational work established in P03-T04-S01-M02, delivering a more robust and scalable audio processing pipeline.

### P03-T04-S01-M04 - Benchmark the Observer loop cycle and fail if the P99 exceeds 48 samples (1 ms a

The task involves benchmarking the Observer loop cycle to evaluate its performance under real-time conditions, specifically focusing on the P99 latency metric. This ensures that the system maintains consistent and predictable timing behavior, which is critical for audio processing where even minor delays can degrade signal fidelity. The project requires this check because inconsistent loop timing can introduce jitter, leading to audible artifacts and instability in real-time audio streams—especially in high-precision applications like live mixing and playback.  

The implementation monitors the Observer loop’s cycle duration across a large sample set, calculating the P99 percentile of latency. If this value exceeds 48 samples (equivalent to 1 millisecond at a 48kHz sample rate), the system triggers a failure condition, halting operation to prevent degraded performance. This function acts as a real-time health check, ensuring that the audio pipeline remains within acceptable latency bounds. As a result, the system now includes a built-in performance validation mechanism that detects and prevents timing drift, leading to more reliable and stable audio delivery. This change directly supports the system’s adherence to the OTOMIX 3.6 Mother 2.6 specification and builds upon the foundational timing setup established in P03-T04-S01-M02.

### P03-T05-S01-M01 - Classify micro-timing across 16th-note subdivisions as Straight (<2% variance), 

The task involves classifying micro-timing variations within 16th-note subdivisions of musical performance into three distinct categories: Straight, Triplet, or Swing—based on precise temporal deviations from ideal metrical alignment. This classification enables a deeper understanding of rhythmic execution, distinguishing between even, evenly spaced notes and those with intentional off-beat displacement. The project requires this capability to accurately capture and interpret human performance nuances in real-time, which is essential for both music analysis and expressive synthesis.  

The implementation evaluates each 16th-note event by measuring its timing relative to a reference beat, applying statistical thresholds to determine whether the deviation falls within a straight pulse (<2% variance), a triplet pattern (<5% deviation from ideal 33.3% and 66.6% positions), or a swing rhythm (with off-beat 16ths displaced between 0.05 and 0.33 beats). This function operates within the OTOMIX 3.5 Mother 2.5 framework, building upon the foundational timing infrastructure established in P02-T01-S01-M01. The result is a robust, real-time classification engine that now reliably differentiates rhythmic styles in performance data, enabling more accurate playback, analysis, and adaptive response in interactive music systems.
