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

