# Phase 7 — Local Ingestion & Hostile-File Handling

## What P07 Delivers

P07 is the **airlock** — every user-uploaded file passes through here before touching the analysis pipeline.

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **Decoders** | Worker threads (off main thread) | MP3 (libmpg123/WASM), WAV (PCM), FLAC (libflac/WASM). Output: `Float32Array` at 44.1 kHz mono. |
| **Deduplication** | `content_sha256` (Web Crypto API) | Stream hash during decode. If hash exists in catalog → reject duplicate, return existing track ID. |
| **Hostile-File Handling** | Size limits, timeout, sandbox | Max 500 MB / 10 min. Decode timeout 30 s. Worker terminated on OOM or hang. |
| **Copyright Declaration** | UI modal + signed attestation | User must declare rights before ingestion completes. Stored as metadata on track. |

**Input**: User-uploaded `File` / `Blob`.
**Output**: Decoded `Float32Array` + `content_sha256` → P05 Feature Extraction.

**Blocked Task (1)**:
- OQ-11: Copyright declaration UX flow — modal vs. separate page, legal text versioning.

**Total P07 tasks: All TODO, 1 blocked.**