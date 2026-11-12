# OTOMIX Local-First Architecture Addendum

**Decision Date:** 2026-11-13
**Status:** APPROVED (Supersedes the Server-First ingestion model in `OTOMIX_Architecture_Spec.md`)
**Affects:** P05 (Feature Extraction), P07 (Local Ingestion), P08 (MixPlan / UI), P09 (Export / Set Shop)

## 1. Core Architectural Shift: Local-First
The original architecture spec suggested uploading audio files to an AWS M5.large server for analysis. This is officially **OBSOLETE**. 
OTOMIX is now a **Local-First** application:
- **No audio files are ever uploaded to the server for analysis.**
- The user's browser (or desktop agent) reads the local file system directly.
- Feature extraction, mixing, mastering, and rendering all happen entirely on the user's machine.

## 2. Local Analysis & Feature Extraction
- **File Access:** The `UI` uses the `File System Access API` (or a desktop agent) to read the user's local library (MP3, WAV, FLAC) without uploading.
- **Processing:** Audio decoding and feature extraction are performed inside a `Web Worker` running `Essentia.js` (`WASM`).
- **Storage:** The extracted metadata (`JSON`) is stored locally in the browser's `IndexedDB`. This ensures instant library loading on refresh without re-analysis.

## 3. Local Mixing, Mastering & Rendering
- **Playback & Mixing:** All `DSP` tasks (EQ, Filtering, Transition Window Chopping) are handled by `Web Audio API` and `AudioWorklet` on the user's CPU.
- **Mastering:** The final mix is processed through the `EQ-Mastering-Exports` port locally.
- **Rendering:** Final export to `MP3`, `WAV`, or `FLAC` is done using `OfflineAudioContext` (and `WebCodecs API`/`FFmpeg.wasm`). The final file is saved directly to the user's hard drive.

## 4. The Role of the Server (Cloud Sync & Auth)
The server is stripped down to a lightweight `API` and database:
- **Authentication:** `JWT` for user login.
- **Metadata Sync:** The server only stores `JSON` metadata (track names, BPM, Key, Energy). When a user analyzes a track locally, the metadata is synced to the server in the background.
- **Cross-Device Access:** A user can log in from another device, download the metadata, and if they have the audio files locally, the system will instantly link them.

## 5. Future Cloud Tier (Hybrid Model)
For premium users (Cloud Subscription), we will introduce the `CloudStorageAdapter`:
- Audio files can be uploaded to `Cloudflare R2` or `AWS S3`.
- Users can stream and mix from the cloud on any device.
- The core `DSP` and `Core` logic will remain unchanged; only the `Storage` and `File Reader` adapters will swap from Local to Cloud.

## 6. Impact on Future Tasks (P07, P08, P09)
- **P07 (Ingestion):** Must implement `File System Access API` and local `IndexedDB` caching.
- **P08 (UI):** Must use `Web Worker` (not `node:worker_threads`) for the `Isolated Worker`.
- **P09 (Export):** Must use `OfflineAudioContext` for final rendering instead of server-side encoding.