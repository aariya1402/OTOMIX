# Phase 5 — Feature Extraction & Analysis Pipeline

## What P05 Delivers

P05 transforms decoded audio (`Float32Array` + `content_sha256` from P07) into a **feature registry row** — a structured, versioned document that powers recommendation (P08), harmonic mixing, and energy profiling.

| Extractor | Technology | Output |
|-----------|------------|--------|
| **Spectral/Temporal** | Essentia.js (WASM) | 200+ descriptors: spectral centroid, rolloff, flux, MFCC, chroma, rhythm patterns, loudness (EBU R128). |
| **Voice/Instrumental** | TensorFlow.js model | Binary mask + separated stems (optional). Threshold: `VOCAL_THRESHOLD = 0.65` (from `constants/scoring.ts:8`). |
| **Embeddings** | MAEST (Music Audio Embedding with Self-Supervised Training) | 512-d vector for similarity search. |
| **Global Metadata** | Aggregation | `content_sha256` (dedup key), duration, average BPM, key (Camelot), energy profile, vocal presence, groove mode. |

**Cache Key**: `content_sha256` — identical audio content ⇒ identical features (deterministic). Re-analysis only on schema version bump (P01 semver gate).

**Input**: Decoded `Float32Array` at 44.1 kHz (`SAMPLE_RATE` from `constants/grid.ts:75`), mono or stereo (downmixed to mono for analysis).

**Output**: `FeatureRegistryV1_2` row (validated by `packages/contracts/src/validate.ts:21` against `feature-registry-1.2.json`).

**Blocked Tasks (3)**:
- OQ-20: Essentia.js WASM heap sizing (512 MB limit from `constants/scoring.ts` `WASM_HEAP_MB`).
- OQ-21: TF.js model quantization (int8 vs float32) trade-off.
- OQ-22: MAEST embedding version pinning (which release to vendor).

**Total P05 tasks: All TODO, 3 blocked.**