# Phase 7 — Local Ingestion & Hostile-File Handling

Phase 7 is the front door: every audio file entering OTOMIX must pass a format sniffer, a size/duration limit, a directory-confinement check, and a decoder that produces canonical 44.1 kHz mono PCM. So far the phase has landed P07-T01 in full (four micro-tasks). P07-T02 (hostile-file defense and the `no-decoder-on-main` rule) is next.

## GAP-014 — dual deployment

Per GAP-014 in `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan_Supplement.md`, every affected micro-task produces two implementations. The pattern that landed:

- pure logic in `packages/core/src/ingest/*` and `packages/core/src/audio/normalize.ts`,
- cloud wrapper in `packages/gateway/src/ingest/*` (Node, `logger.log`, `worker_threads`),
- local wrapper in `packages/adapter/src/ingest/*` (browser, `WarnSink`, `Worker`).

None of the three conflate the two deployment targets. `sniffForGateway` and `sniffForLocal` share `sniffContainer` but are otherwise independent. `createSizeLimitMiddleware` streams `IncomingMessage`; `checkLimitsForLocal` reads `Blob.size`. `confineForGateway` uses `fs.realpathSync`; `confineForLocal` accepts a `HandleLike` that only a user-picked File System Access handle can satisfy. `runDecodeWorker` spawns `worker_threads`; `runDecodeWorkerLocal` spawns `Worker`.

## P07-T01-S01-M01 — content-based format sniffing

`packages/core/src/ingest/sniff.ts` detects FLAC (`fLaC` at 0), WAV (`RIFF` at 0 + `WAVE` at 8) and MP3 (`ID3` at 0 or MPEG frame sync `0xFFEx`), never via `path.extname`. Each wrapper logs `ingest.ext_mismatch` when the extension disagrees with the detected format.

GAP-017 was discovered here: the cloud wrapper originally used `logger.warn(...)`, but the real `Logger` interface exposes only `.log(record)` (`packages/core/src/telemetry/logger.ts`). The test's `mockLogger` hid the bug. The fix (`b45539e`) makes `sniff.ts` call `logger.log({ level: 'warn', trace_id, span_id, ... })`; a new production-path test prevents regressions.

## P07-T01-S02-M01 — size and duration limits

`packages/core/src/ingest/limits.ts` exports `DEFAULT_LIMITS` (500 MB, 4 h) and a pure `checkLimits(size, durationSec, config)`. The gateway middleware checks `Content-Length` before reading any body and byte-counts chunked requests, aborting with `req.destroy()` when either budget is exceeded. Duration is read from the client-supplied `X-Audio-Duration-Seconds`; container-derived duration is deferred to `P07-T01-S03-M01`.

## P07-T01-S02-M02 — directory confinement

`packages/core/src/ingest/confine.ts` implements `isWithinRoot(candidateRealPath, rootRealPath)` using only string operations (forward-slash normalisation, case-sensitive prefix). `confineForGateway` resolves both paths with `fs.realpathSync` and calls `isWithinRoot`. Traversal (`../../etc/passwd`) fails as `NOT_FOUND` because the resolved path does not exist; a symlink pointing outside the root fails as `SYMLINK_ESCAPE`. TOCTOU between `realpathSync` and file open is accepted per the §5.3 threat model (contents are sniffed and decoded in a sandbox; a path race bypasses neither gate).

## P07-T01-S03-M01 — worker decoder

`packages/workers/src/decode.ts` implements `decodeAll(bytes, format, trace_id, span_id)`. WAV is parsed inline (RIFF/WAVE, int16 + float32 PCM). MP3 uses `mpg123-decoder`; FLAC uses `@wasm-audio-decoders/flac`. The FLAC decoder pads the last frame to a full block; `decodeAll` reads `STREAMINFO.total_samples` and trims (or zero-pads when the decoder drops the last partial block) before normalization. `normalizeChannels` in `packages/core/src/audio/normalize.ts` downmixes to mono and resamples to 44.1 kHz. SHA-256 is computed over canonical PCM.

Fixtures are 5 s 48 kHz stereo WAV/MP3/FLAC under `packages/workers/test/fixtures/`, generated once with ffmpeg-static. The MP3 tolerance (±2304 samples) covers LAME encoder delay; FLAC after trim is ±1; WAV is ±1.

## GAP-018 — `@ts-nocheck` on `packages/workers/src/pool.ts`

The first `pnpm -F '@otomix/workers' build` since P06 surfaced three unused-locals errors in `pool.ts` (`Worker` import, `private readonly tenantId`, `const d`). P06 only ran `gateway` build, so this was not caught. A temporary `// @ts-nocheck` was added with a comment; the proper refactor is tracked as GAP-018 and scheduled as a follow-up micro-task.

## What's next

P07-T02-S01-M01 (`no-decoder-on-main`) adds a dependency-cruiser rule that forbids `packages/gateway` and `packages/ui` from importing `packages/workers` decoders on the main thread. P07-T02-S02 (fuzz corpus), P07-T03 (dedup + endpoint), P07-T04 (DLQ) and P07-T05 (source declarations) follow.