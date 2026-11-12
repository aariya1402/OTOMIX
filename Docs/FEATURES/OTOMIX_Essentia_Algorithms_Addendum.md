# OTOMIX – Essentia Algorithms & Feature Mapping Addendum

**Decision Date:** 2026-11-13
**Source of Truth:** `Essentia_Library_OTOMIX.xlsx` (Sheet 1: Essentia Algorithms)
**Status:** APPROVED as the definitive feature extraction map for P05, P07, P08, and P09.

## 1. Implemented in Phase P05 (Feature Extraction)
Based on the Excel document's recommendations:
- **Tempo & Rhythm:** `RhythmExtractor2013` (used for `BPM Seed`), `Danceability`, and `OnsetRate` are mapped to the 9-factor `Energy` formula.
- **Tonal & Harmonic:** The `Key` extraction uses the `Tri-profile consensus`. **CRITICAL NOTE:** The Excel sheet recommends giving a higher weight to the `EDMA` profile for EDM tracks. This must be reflected in the `AnalysisConfig`.
- **Spectral & Loudness:** `SpectralCentroidTime`, `EnergyBandRatio` (for `kick_strength`), `LoudnessEBUR128`, and `DynamicComplexity` are mapped to the `Energy` vector.
- **Vocal Map:** `voice_instrumental` (TensorFlow) is mapped to `VocalMap`. (Currently stubbed; deferred to later phases).

## 2. To be Added in Phase P07 (Ingestion & Quality Control)
- **Silence Trimming:** Use `StartStopSilence` and `EffectiveDuration` to trim silence before locking the `Grid`. This ensures `Beat #0` aligns with the first real transient.
- **File QC (Hostile Files):** Implement `ClickDetector`, `SaturationDetector`, `DiscontinuityDetector`, and `TruePeakDetector` in the local ingestion pipeline. If a file fails these checks, it should be flagged or rejected with `INVALID_ARGUMENT`.

## 3. To be Added in Phase P08 (Smart Setlist Engine)
- **Structure Detection (Auto-Cue):** Use `SBic` and `NoveltyCurve` to replace the `detectStructure` Stub. This is the core engine for `Intro`, `Drop`, `Breakdown` detection and `Auto-Cue` XML generation.
- **Advanced Harmonic Matching:** Use `ChromaCrossSimilarity` to find the optimal overlap point between two tracks (beyond simple `Camelot`).
- **De-duplication:** Use `CoverSongSimilarity` for the Remix/Duplicate Guard feature to prevent playing two versions of the same track in one set.
- **Similarity Embeddings (Optional):** `MAEST` or `Discogs-EffNet` for track recommendation. **Note:** These are heavy `TensorFlow` models. They should only be run on the client-side if the user's device has enough CPU/RAM, or deferred to the Cloud Tier.

## 4. To be Added in Phase P09 (Export & Mastering)
- **Mastering Check:** Use `TruePeakDetector` and `ReplayGain` for final mix export safety to prevent clipping.

## 5. Proposed UI/UX Feature for Phase P08: Hover-to-Preview Radar Chart
Based on the owner's directive (2026-11-13), the `UI` must include a highly interactive feature for the Set Builder:

- **Contextual Drop-Zone Comparison:** While a DJ drags a track (`Track X`) from the library over the active set queue, a popup appears next to the cursor.
- **Visual Overlay:** The popup displays a `Radar Chart` (Spider Chart) overlaying the 9-factor `Energy` fingerprint of `Track X` with the fingerprints of the adjacent tracks (`Track A` and `Track B`).
- **Instant Metrics:** Alongside the chart, it shows the live `Compatibility Score`, `BPM` delta, `Camelot` distance, and `Vocal Clash` warnings.
- **Dynamic Recalculation:** As the user moves the cursor up or down the queue, the overlay instantly recalculates and updates for the new adjacent tracks.
- **Architecture Fit:** This is 100% `Local-First`. The `UI` (using `React` and `d3.js` or `recharts`) reads the pre-computed 9-factor data directly from `IndexedDB` and calls `computeCompatibilityScore` from `packages/core` in real-time, with zero server latency.