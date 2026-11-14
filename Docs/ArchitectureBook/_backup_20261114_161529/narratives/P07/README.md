# Phase 7 — Local Ingestion & Hostile-File Handling

Phase 7 is the front door: every audio file entering OTOMIX must pass a format sniffer, a size/duration limit, a directory-confinement check, a worker decoder, a static-import guard, a malformed-container classifier, and a tag extractor that flags PII. By the end of P07-T02 all of these are in place. P07-T03 (dedup + endpoint), P07-T04 (DLQ) and P07-T05 (source declarations) remain.

## GAP-014 — dual deployment

Per GAP-014 every affected micro-task produces two implementations plus a shared pure core:

- pure logic in `packages/core/src/ingest/*` and `packages/core/src/audio/normalize.ts`,
- cloud wrapper in `packages/gateway/src/ingest/*` (Node, `logger.log`, `worker_threads`),
- local wrapper in `packages/adapter/src/ingest/*` (browser, `WarnSink`, `Worker`).

`sniffForGateway` / `sniffForLocal`, `createSizeLimitMiddleware` / `checkLimitsForLocal`, `confineForGateway` / `confineForLocal`, `extractTagsForGateway` / `extractTagsForLocal` all share a pure predicate in `core` and otherwise diverge deliberately.

## P07-T01 — sniff, limits, confine, decode

`core/src/ingest/sniff.ts` detects FLAC (`fLaC`), WAV (`RIFF`+`WAVE`), MP3 (`ID3` or MPEG frame sync), never via `path.extname`. GAP-017 was discovered here: the cloud wrapper originally used `logger.warn(...)` while the real `Logger` interface exposes only `.log(record)`. The fix (`b45539e`) makes the wrapper call `logger.log({ level: 'warn', trace_id, span_id, ... })` and adds a production-path test.

`core/src/ingest/limits.ts` exports `DEFAULT_LIMITS` (500 MB, 4 h) and `checkLimits`. The gateway middleware checks `Content-Length` before reading any body and byte-counts chunked requests, aborting with `req.destroy()`.

`core/src/ingest/confine.ts` implements `isWithinRoot(candidateRealPath, rootRealPath)` using only string operations. `confineForGateway` resolves both with `fs.realpathSync`; `confineForLocal` accepts a `HandleLike` that only a user-picked File System Access handle satisfies. TOCTOU between `realpathSync` and open is accepted per the §5.3 threat model (contents are sniffed + decoded in a sandbox).

`packages/workers/src/decode.ts` implements `decodeAll(bytes, format, trace_id, span_id)`. WAV is parsed inline. MP3 uses `mpg123-decoder`; FLAC uses `@wasm-audio-decoders/flac`. `normalizeChannels` in `core/src/audio/normalize.ts` downmixes to mono and resamples to 44.1 kHz. SHA-256 is computed over canonical PCM. `STREAMINFO.total_samples` is authoritative: `decodeFlac` trims padding when the decoder returns more and zero-pads when it returns fewer.

## P07-T02 — hostile-file defense

`P07-T02-S01-M01` enforces `no-decoder-on-main` with dependency-cruiser. `.dependency-cruiser.cjs` blocks `packages/(gateway|ui)/src` from importing `packages/workers/src/decode*`, `mpg123-decoder` or `@wasm-audio-decoders/*`. Runtime wrappers (`decode-worker.ts`) are not affected — they use `require.resolve` / Worker URL, which dependency-cruiser cannot see statically. `tools/test/no-decoder-main.spec.ts` runs the real graph (0 violations) and a synthetic temp file in `packages/gateway/src` that imports `decode` (>=1 violation) to prove the rule is live. The violation counter walks `modules[].dependencies[]` looking for `valid === false` with non-empty `rules`, because depcruise v16 no longer exposes `summary.violations` as a plain number.

`P07-T02-S01-M02` classifies malformed containers as non-retryable. `core/src/ingest/reject.ts` (pure) `classifyDecodeFailure(format, bytes, errorMessage?)` returns `{ ok: false, error: 'INVALID_ARGUMENT', reason, retryable: false }` with reason `TRUNCATED_HEADER` / `INVALID_FRAME_SYNC` / `BAD_STREAMINFO` / `UNKNOWN_PARSE_FAILURE`. `core/src/resilience/retry.ts` gained an optional `isRetryable?: (err) => boolean` — default `undefined` preserves the existing `idempotent`-only behavior, and the new test proves 1 attempt when `isRetryable: () => false`. `gateway/src/ingest/reject.ts` logs `ingest.rejected` at warn. DLQ (P07-T04) will consume the `RejectReason` taxonomy.

`P07-T02-S01-M03` treats embedded tags as untrusted display hints. `core/src/ingest/tags.ts` parses WAV LIST-INFO (chunk IDs are exactly 4 bytes — IKEY not ICKEY), MP3 ID3v2 (TIT2/TPE1/TALB/TBPM/TKEY) + ID3v1 fallback, and FLAC Vorbis comments (TITLE/ARTIST/ALBUM/COMMENT/BPM/KEY). `DisplayMetadata` is a distinct type from `RegistryFields`. The gateway test proves registry safety behaviorally: tag BPM=999 fails `BPM.parse` (out of [60, 200]); tag key=99Z fails `CamelotKey.parse`; analysis BPM=128 and key=8A both pass. If a future caller spreads `displayMetadata` into the registry, the validators reject it. Wrappers log `ingest.tags_stripped` at warn when `hasPii` (artist/album/comment present).

`P07-T02-S02-M01` adds the deterministic fuzz corpus. `fuzz/generate-corpus.ts` uses Mulberry32 seeded `0x07000001` and emits 300 files across 4 classes x 75 each x 3 formats: truncated, oversized, recursive, garbage. `fuzz/decoder.fuzz.spec.ts` runs the corpus inline via vitest (Vite resolver — see GAP-021) with per-file 5 s timeout, peak-heap delta cap of 512 MB, and zero-tolerance for unhandled exceptions or bad-shaped results. `vitest.workspace.ts` adds a `fuzz` project that does NOT extend root config — `extends` deep-merges `test.include` and pulls the whole repo into the fuzz project. `.github/workflows/fuzz.yml` runs nightly at 02:00 UTC plus manual dispatch.

## GAP-018 — pool.ts @ts-nocheck

`packages/workers/src/pool.ts` (added in P06) had three unused-locals errors that surfaced during the first `pnpm -F @otomix/workers build`. A temporary `// @ts-nocheck` unblocks the build; the proper refactor is deferred to a follow-up micro-task.

## GAP-019 — sync-and-translate.ps1 hardcoded push

`Docs/ArchitectureBook/sync-and-translate.ps1` ends with `git push origin P04`, a copy-paste from the P04 phase. Any invocation from another branch pushes the local P04 ref instead of the current branch. Workaround: explicitly `git push origin <branch>` after every invocation. Proper fix deferred.

## GAP-020 — no central UI binding matrix

`P08` has 18 UI tasks that each independently decide how to bind a UI element to data. `X-P05-P08` and `X-P07-P08` assert data shape but not the UI-to-field mapping. Resolution: `Docs/FEATURES/OTOMIX_UI_Bindings.md` must be authored at the start of `P08-T01` with columns UI element / Redux slice / catalog field / Feature Registry field. Registered as a plan reminder on `P08-T01-S01-M01`.

## GAP-021 — core/dist is ESM with extensionless imports

`packages/core/dist/index.js` uses ESM but its relative imports have no `.js` extension (e.g. `from './config/analysis'`). Node's native ESM resolver rejects them; vitest, tsx and Vite all resolve. The fuzz harness originally ran in `worker_threads` with a 512 MB heap cap and failed with `ERR_MODULE_NOT_FOUND` for this reason; it now runs inline. Proper fix (deferred): either add `.js` to all relative imports in `packages/core/src/**/*.ts` or set `rewriteRelativeImportExtensions: true` in `core/tsconfig.json`. The same rule applies to any future CLI / DLQ replay / worker code that loads `@otomix/core` from raw Node ESM.

## What's next

`P07-T03-S01-M01` (tracks migration) begins the persistence layer for ingestion: `tracks` table with CHECK constraints, RLS, and a UNIQUE `(tenant_id, owner_id, content_sha256)`. Deduplication (`P07-T03-S02-M01`), the `POST /api/v1/ingest/local` endpoint (`P07-T03-S02-M02`), transactional commit (`P07-T03-S02-M03`) and rate limiting (`P07-T03-S02-M04`) follow. DLQ (`P07-T04`) and source declarations (`P07-T05`) close the phase.