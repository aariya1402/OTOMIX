# Phase 4 — DSP Port & Real-Time Safety

**Why P04 Exists:**
Phase 4 delivers the actual audio processing engine for OTOMIX. It bridges the high-level musical planning (from P03/P08) with the low-level Web Audio API. The primary goal is to execute sample-accurate transitions (chopping, EQ, compression, limiting) while strictly adhering to zero-allocation real-time safety rules and absolute beat-index timing.

## Major Capabilities

**1. The DspPort & AudioWorklet Engine**
We established the `DspPort` interface as the contract between the planner and the audio engine. The `AudioWorkletProcessor` skeleton was built to process audio in 128-sample blocks without ever allocating memory (Rule 23). A `MockDspDriver` allows us to run headless signal-flow tests in Node.js without an AudioContext.

**2. The DSP Effects Chain**
The audio path consists of several cascaded modules, all driven by dynamic `TransitionProfile` presets:
*   **Gain Normalizer:** Aligns incoming track loudness to -14 LUFS.
*   **Three-Band EQ:** Uses cascaded IIR Biquads (Direct Form II) to apply smooth frequency cuts/boosts.
*   **Multiband Compressor:** Employs Linkwitz-Riley (LR4) crossovers to split the signal into low/mid/high bands, applying independent envelope detection to prevent clipping.
*   **Look-ahead Limiter:** A 4x oversampled peak limiter that catches inter-sample peaks. It respects the `enableLiveEffects` directive, allowing it to bypass entirely (zero latency) during live playback to save CPU.

**3. Transition & Chopping Engine**
The system slices audio onto the `chopGrid` (1/8, 1/16, 1/32 beat). Slices are shifted dynamically for Swing grooves (`Δ_groove`). A cosine crossfade is applied at the overlapping slice boundaries, ensuring seamless transitions with no silence gaps or audible clicks.

**4. Export Encoder**
A native WAV encoder (with stubs for MP3/FLAC) allows offline rendering of the final mix, strictly isolated from the real-time audio callback.

## Safety & Constants
*   **RT-Safety:** All hot-path files are tagged `@rt-safe` and enforced by a custom ESLint rule (`tools/eslint-rules/rt-safe.js`) banning `new`, literals, and `console`.
*   **Latency:** Verified via `dsp-latency.spec.ts` that total algorithmic latency (look-ahead + FIR) remains well under the 10ms budget (441 samples at 44.1kHz).
*   **Denormals:** Flushed at the output stage to prevent CPU spikes.

## OQ Resolutions
*   **OQ-05:** Confirmed that "<10ms" refers to Algorithmic Latency, not per-block CPU time.
*   **OQ-06:** Renamed `crossfadeMs` to `crossfadeBeats` (pure beat domain).

## Test Coverage
Phase 4 added over 100 tests, including allocation-free checks, LUFS gain math, Biquad frequency response, compressor gain reduction, and limiter ceiling verification. All 550 tests in the repository pass.