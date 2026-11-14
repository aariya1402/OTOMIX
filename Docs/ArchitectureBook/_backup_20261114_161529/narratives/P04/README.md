# Phase 4 - DSP Port & Real-Time Safety

**Status:** 22/29 complete.

Phase 4 executed the plans from Phase 3: tempo-glide automation, the Transition Window Chopping Engine with zero-click crossfades, the real-time-safe audio callback infrastructure (lock-free SPSC ring buffer, one-pole smoothing, denormal flush), and the EQ-Mastering-Exports DSP port (three-band EQ, multi-band compressor, 4x-oversampled look-ahead limiter, loudness normalization, export encoder). All legacy half/double-time tasks were cancelled (per Rule 25). Four legacy tasks remain blocked/cancelled on owner decisions.

## What was delivered

- **P04-T01-S01-M01** - Compute BPM_target=(BPM_out+BPM_in)/2 as the default glide target.
- **P04-T02-S01-M01** - Slice Float32Array audio inside the transition window onto the chopGrid (1/8, 1/16, 1/32) using beat-based boundaries.
- **P04-T02-S01-M02** - Pass audio outside the transition window through without copying or processing.
- **P04-T02-S01-M03** - Shift slice boundaries by Δ_groove when a groove mode is Swing.
- **P04-T02-S02-M01** - Implement F_fade=0.5·(1+cos(π·t/crossfadeBeats)) for t∈[0, crossfadeBeats] applied at slice boundaries.
- **P04-T02-S02-M02** - Enforce crossfadeBeats ≤ chopGrid_fraction / 4 as a pure beat-based comparison (no seconds).
- **P04-T02-S02-M03** - Widen chopGrid from 1/32 to 1/8 under high-load or low-latency edge conditions.
- **P04-T03-S01-M01** - Create the AudioWorkletProcessor skeleton that pre-allocates grid state, slice buffers and smoothing state at preparation time and performs no allocation in process().
- **P04-T03-S01-M02** - Implement a lock-free SPSC ring buffer over SharedArrayBuffer with Atomics for parameter events.
- **P04-T03-S01-M03** - Implement a per-sample one-pole smoother for audio-path parameters.
- **P04-T03-S01-M05** - Flush denormals on the audio thread in feedback and filter state.
- **P04-T03-S02-M01** - Build an RT-safety audit harness that counts heap allocations and lock acquisitions across 10 000 process() calls.
- **P04-T03-S02-M02** - Add an ESLint rule banning new, array/object literals, console and await inside files tagged @rt-safe.
- **P04-T04-S01-M01** - Define the DspPort interface and the AudioParamAutomation schema (target value, time, curve type).
- **P04-T04-S01-M02** - Implement the mock DSP driver and bypass module for headless signal-flow tests.
- **P04-T04-S02-M01** - Implement the three-band EQ as cascaded IIR biquads (Direct Form II transposed) re-deriving coefficients on sample-rate change.
- **P04-T04-S02-M02** - Implement the multi-band compressor (band-split biquads, per-band detector and gain computer).
- **P04-T04-S02-M03** - Implement the look-ahead peak limiter with 4x oversampling and report its algorithmic latency.
- **P04-T04-S02-M04** - Apply input gain normalization from loudness_ebu128 as the first stage of the chain.
- **P04-T04-S02-M05** - Implement the export encoding stage (MP3, WAV, FLAC) outside the real-time callback.
- **P04-T04-S03-M01** - Measure DSP port per-block processing latency against the <10 ms budget.
- **P04-T04-S03-M02** - Implement the degraded-mode path: standard crossfade without micro-chopping (RUNG_STANDARD_CROSSFADE).

## What remains

- **P04-T01-S02-M01** (TODO) - Generate linearRampToValueAtTime automation for both tracks with start/end targets and a ramp duration exactly equal to the transition window.

