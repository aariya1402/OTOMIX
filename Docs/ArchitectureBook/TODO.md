# OTOMIX Task Tracker

Auto-generated from `OTOMIX_MicroTask_Plan.tasks.json`, `OTOMIX_MicroTask_Plan.md` and git history.
Each task lists technical specs, attachments, influential values, relationships, and run status.

**Snapshot:** 2026-11-14 13:41 | total=250 | DONE=128 | TODO=99 | BLOCKED=10 | SUPERSEDED=6

## 🎯 Next (ready to start)

### `P02-T05-S01-M02`

| Field | Value |
|---|---|
| Status | `TODO` (all prerequisites DONE) |
| Phase | P02 (17/18 done) |
| Description | Implement pre-kick gap ≥ 1 bar: shift `T0` backward in exact 4-beat multiples so the kick aligns with a primary downbeat (Beat 5 or Beat 9). |
| Expected Outcome | Blocked until the numbering convention is confirmed. |
| Prerequisites | `P02-T05-S01-M01` |
| Independent Test(s) | **[BLOCKED]** Decision needed: exact index numbering for the shifted anchor (examples 'Beat −5, −9' vs kick at 'Beat 5 or 9') given skip-zero indexing; provide a worked example. |
| Spec Reference | OTOMIX §3.10 · Mother §2.10 |
| Review Checkpoint | After the decision, re-read §3.10 and Appendix A item A8. |
| Notes | OQ-07 resolved 2026-11-11: pre-kick gap is -3, -2, -1, 0. |

**Technical specs:**
- Expected files (from Expected Outcome): Blocked until the numbering convention is confirmed.
- Test file (from Independent Test): **[BLOCKED]** Decision needed: exact index numbering for the shifted anchor (examples 'Beat −5, −9' vs kick at 'Beat 5 or 9') given skip-zero indexing; provide a worked example.
- Spec sections: OTOMIX §3.10 · Mother §2.10

**Relationships:**
- Depends on: `P02-T05-S01-M01` (DONE)
- Blocks: (nothing directly)

---

## 🚧 Ready to start (all prerequisites DONE)

- `P03-T02-S01-M02` — Default to the Attack Grid only for tracks devoid of a strong kick body.
- `P03-T04-S02-M01` — Decide whether Runtime Drift Compensation must also satisfy the ±0.05 semitone bound given its [0.98, 1.02] range.
- `P04-T01-S02-M01` — Generate `linearRampToValueAtTime` automation for both tracks with start/end targets and a ramp duration exactly equal to the transition window.
- `P05-T02-S01-M01` — Derive `BPM_seed` by K-means clustering of the local tempo histogram and validate it against the highest structural energy peak.
- `P05-T02-S02-M01` — Compute `E=0.4·Rhythm+0.3·Dynamics+0.2·Loudness+0.1·Spectral` with each component Min-Max normalized to [0,1].
- `P05-T02-S03-M01` — Interpolate missing features with the global dataset median for the dominant genre and list them in `interpolated_fields`.
- `P05-T02-S03-M02` — Purge cached registries and enqueue re-analysis on a major version increment of the extraction models.
- `P05-T03-S01-M01` — Binarize vocal probabilities with `V_map[t]=1` only when the probability is strictly greater than 0.65.
- `P05-T03-S01-M04` — Shift a transition to the nearest contiguous 16-beat block where `ΣV_map=0`.
- `P07-T03-S01-M01` — Create migration `003_tracks.sql` for `tracks` per §9.11 with CHECKs, unique `(tenant_id, owner_id, content_sha256)` and RLS.
- `P07-T04-S01-M01` — Park a job in `otomix.dlq` after one attempt plus the 3-retry maximum, recording failure reason and trace id.
- `P08-T04-S02-M02` — Implement `POST /api/v1/mixplan` requiring `local:process` and invoking `PlanTransition` with an idempotency key.
- `P09-T01-S01-M01` — Create migration `004_sets_exports.sql` for `sets` and `export_jobs` per §9.11 with CHECKs, the unique `(tenant_id,set_id,target,schema_version)` constraint and RLS.
- `P09-T01-S01-M03` — Compute exported grid and cue positions from the Attack Grid using `t(i)` at 16-beat and 16-bar boundaries.
- `P09-T02-S01-M01` — Define `PaymentProviderPort` (signature verification, event parsing) with an HMAC reference implementation and a fake provider for tests.
- `P09-T03-S01-M02` — Render landing pages from structured content with sanitization and serve them under the strict CSP.
- `P09-T04-S01-M01` — Implement the two-tier approval workflow where requester and approver must be different principals.
- `P10-T01-S01-M01` — Emit `core.dsp.latency`, `core.observer.cycle_duration`, `core.transition.failure_rate`, `core.degraded_mode.active` and `system.thread.starvation` from the code paths that own them.
- `P10-T02-S01-M01` — Verify the span chain browser → Node gateway → gRPC → Core Command → WASM worker with W3C `traceparent` propagation.
- `P10-T03-S01-M01` — Configure retention: 90-day hot storage for application logs and 7 years for admin audit logs.
- `P10-T03-S01-M02` — Implement event-driven cache invalidation with PostgreSQL `LISTEN/NOTIFY`, a TTL backstop and single-flight reloads.
- `P10-T04-S01-M01` — Provide Blue/Green Deployments and a Service selector switch for the Core and Gateway.
- `P10-T04-S02-M02` — Wrap LaunchDarkly evaluation so flag state is snapshotted outside the audio thread, falls back to the safe shipping behavior and can act as a kill switch.
- `P10-T05-S01-M02` — Replicate blobs across dual geographic zones with immutable locks preventing deletion for 30 days after ingestion.
- `P11-T01-S01-M01` — Build a seeded generator for 10 000 diverse headless pairings covering extreme tempo deltas, 5/4 signatures, dense triplet/swing permutations, 120-second ambient intro pads, kick-less tracks, silent tracks, tracks shorter than 16 beats and standard 4/4.
- `P11-T02-S01-M01` — Run the heap-proof harness for 4-, 8- and 16-bar block resolution on 1-minute and 120-minute timelines and assert 0 retained bytes of persistent array allocation.
- `P11-T03-S01-M01` — Build the phase-inversion null-test harness at transition intersections to detect phase cancellation and transient softening.
- `P11-T03-S01-M05` — Make the RT-safety audit a blocking CI job (0 allocations, 0 locks in 10 000 `process()` calls).
- `P11-T05-S01-M01` — Implement the BDD cross-tenant suite for the six attacks: forged `tenant_id` parameter, cross-tenant token replay, direct SQL as the application role, cache-key collision probe, unmounted-route access and forbidden scope issuance.
- `P11-T05-S01-M03` — Run a nightly IAM fuzz of role escalation and scope enforcement.
- `P11-T05-S01-M04` — Drill the CVSS gate end to end: a build with a 7.0 finding must stop the deployment pipeline.
- `P11-T06-S01-M01` — Enforce 90% branch coverage for the Core Engine and 100% for Rights/Access modules in CI with a report artifact.

## ⏳ Pending (blocked by other TODO)

### P05

- `P05-T02-S02-M02` — blocked by: `
- `P05-T02-S02-M04` — blocked by: `
- `P05-T02-S02-M05` — blocked by: `
- `P05-T03-S01-M02` — blocked by: `
- `P05-T03-S01-M03` — blocked by: `
- `P05-T04-S01-M01` — blocked by: `
- `P05-T04-S01-M02` — blocked by: `
- `P05-T04-S01-M03` — blocked by: `

### P07

- `P07-T03-S02-M01` — blocked by: `
- `P07-T03-S02-M02` — blocked by: `
- `P07-T03-S02-M03` — blocked by: `
- `P07-T03-S02-M04` — blocked by: `
- `P07-T04-S01-M02` — blocked by: `

### P08

- `P08-T01-S01-M01` — blocked by: `
- `P08-T01-S01-M02` — blocked by: `
- `P08-T01-S02-M01` — blocked by: `
- `P08-T01-S02-M02` — blocked by: `
- `P08-T02-S01-M01` — blocked by: `
- `P08-T02-S01-M02` — blocked by: `
- `P08-T03-S01-M01` — blocked by: `
- `P08-T04-S01-M02` — blocked by: `
- `P08-T04-S02-M01` — blocked by: `
- `P08-T04-S02-M03` — blocked by: `
- `P08-T04-S02-M04` — blocked by: `
- `P08-T05-S01-M01` — blocked by: `
- `P08-T05-S01-M02` — blocked by: `
- `P08-T06-S01-M01` — blocked by: `
- `P08-T06-S01-M02` — blocked by: `

### P09

- `P09-T01-S01-M02` — blocked by: `
- `P09-T01-S01-M04` — blocked by: `
- `P09-T01-S02-M01` — blocked by: `
- `P09-T01-S02-M02` — blocked by: `
- `P09-T01-S02-M03` — blocked by: `
- `P09-T01-S02-M04` — blocked by: `
- `P09-T02-S01-M02` — blocked by: `
- `P09-T02-S02-M01` — blocked by: `
- `P09-T02-S02-M02` — blocked by: `
- `P09-T02-S02-M03` — blocked by: `
- `P09-T02-S02-M04` — blocked by: `
- `P09-T04-S01-M02` — blocked by: `

### P10

- `P10-T01-S01-M02` — blocked by: `
- `P10-T01-S02-M01` — blocked by: `
- `P10-T01-S02-M02` — blocked by: `
- `P10-T02-S01-M02` — blocked by: `
- `P10-T04-S01-M02` — blocked by: `
- `P10-T04-S02-M01` — blocked by: `
- `P10-T04-S02-M03` — blocked by: `
- `P10-T04-S02-M04` — blocked by: `
- `P10-T05-S01-M01` — blocked by: `
- `P10-T05-S01-M03` — blocked by: `
- `P10-T05-S01-M04` — blocked by: `
- `P10-T05-S01-M05` — blocked by: `
- `P10-T06-S01-M01` — blocked by: `

### P11

- `P11-T01-S02-M01` — blocked by: `
- `P11-T01-S02-M02` — blocked by: `
- `P11-T01-S02-M03` — blocked by: `
- `P11-T02-S01-M02` — blocked by: `
- `P11-T03-S01-M02` — blocked by: `
- `P11-T03-S01-M04` — blocked by: `
- `P11-T04-S01-M01` — blocked by: `
- `P11-T04-S01-M02` — blocked by: `
- `P11-T04-S01-M03` — blocked by: `
- `P11-T05-S01-M02` — blocked by: `
- `P11-T07-S01-M01` — blocked by: `
- `P11-T07-S01-M02` — blocked by: `
- `P11-T07-S01-M03` — blocked by: `

## 🔴 Blocked by owner decision (OQ)

- **OQ-04** — tasks: `
- **OQ-09** — tasks: `
- **OQ-10** — tasks: `
- **OQ-11** — tasks: `
- **OQ-12** — tasks: `
- **OQ-13** — tasks: `
- **OQ-20** — tasks: `
- **OQ-21** — tasks: `
- **OQ-22** — tasks: `
- **OQ-24** — tasks: `

## ✅ Completed (newest first)

### `P06-RBAC-M01`

- **Commit:** `5e51837` (2026-11-14 13:22:53 +0330)
- **Files changed:** 2
  - `Docs/ArchitectureBook/build-book.ps1`
  - `Docs/ArchitectureBook/content.js`
- **Description:** Migration: 8 RBAC tables (permissions, roles, role_permissions, user_roles, user_permissions, groups, group_members, group_permissions) + RLS + indexes + audit. GAP-015.
- **Influential identifiers:** `
- **GAP references:** `

### `P07-T02-S02-M01`

- **Commit:** `9e585eb` (2026-11-14 12:33:22 +0330)
- **Files changed:** 1
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
- **Description:** Add a container-parser fuzz corpus (truncated frames, oversized chunk sizes, recursive tag structures) run in CI with a time and heap cap.

### `P07-T02-S01-M03`

- **Commit:** `a886499` (2026-11-14 12:22:06 +0330)
- **Files changed:** 10
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `packages/adapter/src/index.ts`
  - `packages/adapter/src/ingest/tags.ts`
  - `packages/adapter/test/tags.spec.ts`
  - `packages/core/src/index.ts`
  - `packages/core/src/ingest/tags.ts`
  - `packages/core/test/ingest/tags.spec.ts`
  - `packages/gateway/src/index.ts`
  - `packages/gateway/src/ingest/tags.ts`
  - `packages/gateway/test/tags.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Treat embedded tags (title, BPM, key) as untrusted display hints that never override analysis output.
- **Influential identifiers:** `

### `P07-T02-S01-M02`

- **Commit:** `8f0a428` (2026-11-14 12:10:28 +0330)
- **Files changed:** 8
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `packages/core/src/index.ts`
  - `packages/core/src/ingest/reject.ts`
  - `packages/core/src/resilience/retry.ts`
  - `packages/core/test/retry.spec.ts`
  - `packages/gateway/src/index.ts`
  - `packages/gateway/src/ingest/reject.ts`
  - `packages/gateway/test/reject.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Reject malformed or truncated containers with INVALID_ARGUMENT and never retry deterministic parse failures.
- **Influential identifiers:** `

### `P07-T02-S01-M01`

- **Commit:** `339fb6a` (2026-11-14 11:38:49 +0330)
- **Files changed:** 6
  - `.dependency-cruiser.cjs`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `package.json`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
  - `tools/test/no-decoder-main.spec.ts`
- **Test files:** `
- **Description:** Ensure the gateway and UI main thread never import container decoders (header sniffing only).

### `P07-T01-S01-M01`

- **Commit:** `6063383` (2026-11-14 00:38:11 +0330)
- **Files changed:** 6
  - `Docs/ArchitectureBook/clues/RBA.md`
  - `Docs/ArchitectureBook/clues/archive/P06_20261114_003647.md`
  - `Docs/ArchitectureBook/clues/archive/P07_20261114_003647.md`
  - `Docs/ArchitectureBook/content.js`
  - `Docs/ArchitectureBook/narratives/P06/README.md`
  - `Docs/ArchitectureBook/narratives/P07/README.md`
- **Description:** Detect MP3, WAV and FLAC by magic bytes and container parse (ID3/MPEG sync, `RIFF…WAVE`, `fLaC`), never by extension, and log extension mismatches.
- **Influential identifiers:** `

### `P07-T01-S03-M01`

- **Commit:** `c69c217` (2026-11-14 00:31:17 +0330)
- **Files changed:** 2
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan_Supplement.md`
- **Description:** Decode to PCM, down-mix to mono and resample to 44.1 kHz via the P05 `normalizeInput`, running the decoder inside a worker.
- **Influential identifiers:** `

### `P07-T01-S02-M02`

- **Commit:** `0dfe139` (2026-11-14 00:02:14 +0330)
- **Files changed:** 1
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
- **Description:** Confine directory access to the granted root, resolving symlinks and rejecting `..` traversal.

### `P07-T01-S02-M01`

- **Commit:** `58db74f` (2026-11-13 23:57:55 +0330)
- **Files changed:** 1
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
- **Description:** Reject files over 500 MB or 4 hours of audio with INVALID_ARGUMENT, checking size while streaming.
- **Influential identifiers:** `

### `P06-T07-S01-M03`

- **Commit:** `b1dd536` (2026-11-13 18:54:02 +0330)
- **Files changed:** 9
  - `packages/db/migrations/006_dsp_parameters.sql`
  - `packages/db/src/dsp-parameters-repository.ts`
  - `packages/db/src/index.ts`
  - `packages/gateway/package.json`
  - `packages/gateway/src/dsp-propagate.ts`
  - `packages/gateway/src/routes/dsp-parameters.ts`
  - `packages/gateway/test/dsp-propagate.spec.ts`
  - `pnpm-lock.yaml`
  - `vitest.workspace.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Propagate parameter updates via the outbox as signed messages with a per-tenant monotonic sequence.

### `P06-T07-S01-M02`

- **Commit:** `9093395` (2026-11-13 18:35:15 +0330)
- **Files changed:** 7
  - `packages/access/src/audit.ts`
  - `packages/access/src/index.ts`
  - `packages/access/test/audit.spec.ts`
  - `packages/db/migrations/001_core.sql`
  - `packages/gateway/src/routes/dsp-parameters.ts`
  - `packages/gateway/test/dsp-parameters-audit.spec.ts`
  - `vitest.workspace.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Write a 7-year-retained admin audit record for every parameter change.

### `P06-T07-S01-M01`

- **Commit:** `be230f6` (2026-11-13 18:27:40 +0330)
- **Files changed:** 5
  - `packages/gateway/src/config/dsp-params.ts`
  - `packages/gateway/src/index.ts`
  - `packages/gateway/src/routes/dsp-parameters.ts`
  - `packages/gateway/src/store/dsp-parameters-store.ts`
  - `packages/gateway/test/dsp-parameters.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement `PATCH /api/v1/dsp/parameters` validating `chopGrid ∈ {1/8,1/16,1/32}` and numeric `crossfadeBeats`.
- **Influential identifiers:** `

### `P06-T06-S01-M03`

- **Commit:** `6c83dfe` (2026-11-13 18:21:44 +0330)
- **Files changed:** 9
  - `deploy/base/README.md`
  - `deploy/base/deployment.yaml`
  - `deploy/base/kustomization.yaml`
  - `deploy/base/namespace.yaml`
  - `deploy/base/networkpolicy.yaml`
  - `policy/pod-hardening.rego`
  - `policy/testdata/unhardened-namespace.yaml`
  - `policy/testdata/unhardened-pod.yaml`
  - `tools/test/ci-pod-hardening.spec.ts`
- **Test files:** `
- **Description:** Harden pods: non-root, read-only root filesystem, dropped capabilities and default-deny NetworkPolicies.

### `P01-T01-S02-M02`

- **Commit:** `661c63d` (2026-11-13 18:00:17 +0330)
- **Files changed:** 3
  - `.github/workflows/ci.yml`
  - `package.json`
  - `tools/test/ci-snyk.spec.ts`
- **Test files:** `
- **Description:** Implement `scripts/cvss-gate.ts` that exits non-zero when any scanner finding has CVSS ≥ 7.0 and wire it as a blocking CI step.
- **Influential identifiers:** `

### `P06-T06-S01-M02`

- **Commit:** `661c63d` (2026-11-13 18:00:17 +0330)
- **Files changed:** 3
  - `.github/workflows/ci.yml`
  - `package.json`
  - `tools/test/ci-snyk.spec.ts`
- **Test files:** `
- **Description:** Run Snyk dependency scanning on every build and block on findings per the CVSS gate.
- **Influential identifiers:** `

### `P06-T06-S01-M01`

- **Commit:** `ef5c9e5` (2026-11-13 17:56:14 +0330)
- **Files changed:** 9
  - `.github/workflows/policy-check.yml`
  - `deploy/secrets/README.md`
  - `deploy/secrets/external-secret.yaml`
  - `deploy/secrets/kustomization.yaml`
  - `deploy/secrets/secrets-template.yaml`
  - `package.json`
  - `policy/secrets.rego`
  - `policy/testdata/plaintext-secret.yaml`
  - `tools/scripts/conftest-check.js`
- **Description:** Back Kubernetes Secrets with HashiCorp Vault (ExternalSecret references only; no plaintext data in manifests).

### `P06-T05-S01-M01`

- **Commit:** `dde6b27` (2026-11-13 17:49:36 +0330)
- **Files changed:** 1
  - `packages/workers/test/worker-isolation.spec.ts`
- **Test files:** `
- **Description:** Emit CSP headers with strict `script-src` and `worker-src` allow-lists plus `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`.

### `P06-T05-S01-M03`

- **Commit:** `dde6b27` (2026-11-13 17:49:36 +0330)
- **Files changed:** 1
  - `packages/workers/test/worker-isolation.spec.ts`
- **Test files:** `
- **Description:** Verify analysis workers run unprivileged: no DOM, no credentials and no network beyond the message channel.
- **Influential identifiers:** `

### `P06-T05-S01-M02`

- **Commit:** `49ce3c0` (2026-11-13 17:42:48 +0330)
- **Files changed:** 4
  - `packages/workers/src/constants.ts`
  - `packages/workers/src/index.ts`
  - `packages/workers/src/wasm-memory.ts`
  - `packages/workers/test/wasm-memory.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Create WASM memory with a hard maximum of 512 MB (8 192 pages of 64 KiB) for analysis workers.

### `P06-T04-S02-M04`

- **Commit:** `3e3a520` (2026-11-13 17:31:22 +0330)
- **Files changed:** 3
  - `packages/db/src/index.ts`
  - `packages/db/src/namespaced-clients.ts`
  - `packages/db/test/namespaced.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Enforce the `otomix:` Redis prefix, `otomix/` storage prefix and `otomix.*` topic names through wrapper clients.

### `P06-T04-S02-M03`

- **Commit:** `21d106c` (2026-11-13 17:26:08 +0330)
- **Files changed:** 4
  - `packages/access/src/crypto/dek.ts`
  - `packages/access/src/crypto/rotate.ts`
  - `packages/access/src/index.ts`
  - `packages/access/test/rotate.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement the 90-day key rotation job that re-wraps DEKs and keeps old ciphertext readable.

### `P06-T04-S02-M02`

- **Commit:** `5adde1e` (2026-11-13 17:18:38 +0330)
- **Files changed:** 4
  - `packages/access/src/constants.ts`
  - `packages/access/src/crypto/dek.ts`
  - `packages/access/src/index.ts`
  - `packages/access/test/dek.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement per-tenant data-encryption keys (envelope encryption) for audio storage.

### `P06-T04-S02-M01`

- **Commit:** `9055cd7` (2026-11-13 17:05:23 +0330)
- **Files changed:** 6
  - `packages/workers/package.json`
  - `packages/workers/src/constants.ts`
  - `packages/workers/src/index.ts`
  - `packages/workers/src/pool.ts`
  - `packages/workers/test/pool-bulkhead.spec.ts`
  - `pnpm-lock.yaml`
- **Test files:** `
- **Exports added:** `
- **Description:** Create a dedicated per-tenant worker pool with a bulkhead that prevents another tenant's pool from being drained.

### `P06-T04-S01-M01`

- **Commit:** `8ec95f5` (2026-11-13 16:52:40 +0330)
- **Files changed:** 3
  - `packages/gateway/src/interceptor.ts`
  - `packages/gateway/src/route-table.ts`
  - `packages/gateway/test/unmounted.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Ensure `/ddex`, `/rights`, `/dsr` and stream-license routes are not mounted and return HTTP 404.

### `P06-T02-S02-M01`

- **Commit:** `66352be` (2026-11-13 16:43:10 +0330)
- **Files changed:** 4
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan_Supplement.md`
  - `features/step_definitions/authz.steps.ts`
  - `features/support/world.ts`
  - `tools/scripts/generate-authz-feature.ts`
- **Description:** Fire a Slack webhook payload on any role escalation or emergency scope grant.

### `P06-T02-S01-M01`

- **Commit:** `66352be` (2026-11-13 16:43:10 +0330)
- **Files changed:** 4
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan_Supplement.md`
  - `features/step_definitions/authz.steps.ts`
  - `features/support/world.ts`
  - `tools/scripts/generate-authz-feature.ts`
- **Description:** Create the route scope registry declaring explicit required scopes per endpoint (no catch-all `*`) and a static test failing on any route without one.

### `P06-T01-S02-M02`

- **Commit:** `eb9692a` (2026-11-13 13:45:22 +0330)
- **Files changed:** 6
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `packages/access/src/index.ts`
  - `packages/access/src/token/refresh.ts`
  - `packages/access/src/token/revoke-user.ts`
  - `packages/access/test/token.revoke-user.spec.ts`
  - `vitest.workspace.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** On role revocation, revoke every active session/family for the user globally.

### `P06-T01-S02-M01`

- **Commit:** `2ae6a60` (2026-11-13 13:37:23 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `packages/access/src/index.ts`
  - `packages/access/src/token/denylist.ts`
  - `packages/access/test/token.denylist.spec.ts`
  - `vitest.workspace.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Write revoked `jti`/family ids to a Redis deny-list (TTL to natural expiry) and check it in the gateway interceptor on every request.

### `P06-T01-S01-M02`

- **Commit:** `543baf2` (2026-11-13 13:29:08 +0330)
- **Files changed:** 8
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `packages/access/package.json`
  - `packages/access/src/index.ts`
  - `packages/access/src/token/refresh.ts`
  - `packages/access/src/token/types.ts`
  - `packages/access/test/token.refresh.spec.ts`
  - `pnpm-lock.yaml`
  - `vitest.workspace.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Issue refresh tokens (7 days) with rotation: each use returns a new token and invalidates the previous; reuse of an invalidated token revokes the whole family.

### `P01-T05-S01-M03`

- **Commit:** `744f51a` (2026-11-13 13:17:51 +0330)
- **Files changed:** 8
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `packages/access/package.json`
  - `packages/access/src/index.ts`
  - `packages/access/src/token/issue.ts`
  - `packages/access/src/token/types.ts`
  - `packages/access/test/token.issue.spec.ts`
  - `pnpm-lock.yaml`
  - `vitest.workspace.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement `withTenant(tx, tenantId)` using `set_config('app.tenant_id', $1, true)` (transaction-local) and make the gateway repository layer require it.

### `P06-T01-S01-M01`

- **Commit:** `744f51a` (2026-11-13 13:17:51 +0330)
- **Files changed:** 8
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `packages/access/package.json`
  - `packages/access/src/index.ts`
  - `packages/access/src/token/issue.ts`
  - `packages/access/src/token/types.ts`
  - `packages/access/test/token.issue.spec.ts`
  - `pnpm-lock.yaml`
  - `vitest.workspace.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Issue access tokens (15 minutes) carrying `sub`, `tenant_id`, `scopes[]`, `tier`, `jti`, `exp`.

### `P01-T03-S02-M02`

- **Commit:** `69f968b` (2026-11-13 13:01:54 +0330)
- **Files changed:** 6
  - `Docs/.Agents/OTOMIX_Admin_Interaction_Skill.md`
  - `Docs/FEATURES/Module 11 Breakdown Density Control (BDC).docx`
  - `Docs/FEATURES/Module 11 Breakdown Density Control (BDC).md`
  - `Docs/FEATURES/OTOMIX ΓÇô Smart Setlist Engine Feature Proposals & Auto-Cue Parameters.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan_Supplement.md`
- **Description:** Implement a SemVer gate for `schema_version`: accept `1.2.x`, flag a major bump as `PURGE_AND_REANALYZE`, reject other minors.
- **Influential identifiers:** `

### `P05-T01-S03-M03`

- **Commit:** `d75e7cf` (2026-11-12 13:27:42 +0330)
- **Files changed:** 2
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
- **Description:** On worker crash or a module timeout above 5000 ms, route the buffer through Web Audio RMS analyzer nodes and return a basic feature set without stalling the queue.
- **Influential identifiers:** `

### `P05-T01-S03-M02`

- **Commit:** `3d69c7b` (2026-11-12 13:16:55 +0330)
- **Files changed:** 1
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
- **Description:** Add a `performance.memory` before/after check and a leak regression test over repeated extractions.

### `P05-T01-S03-M01`

- **Commit:** `0e06316` (2026-11-12 13:03:23 +0330)
- **Files changed:** 1
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
- **Description:** Wrap every extraction in `try/finally` that calls `releaseResult`.

### `P05-T01-S02-M01`

- **Commit:** `6d3c037` (2026-11-12 12:56:06 +0330)
- **Files changed:** 1
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
- **Description:** Bind adapter input/output to JSON Schema Draft 7 and enforce SemVer compatibility when mapping engine JSON to the registry.

### `P05-T01-S01-M01`

- **Commit:** `0735342` (2026-11-12 12:14:57 +0330)
- **Files changed:** 1
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
- **Description:** Implement `normalizeInput(AudioBuffer)` resampling to 44.1 kHz and down-mixing to a mono `Float32Array`.

### `P04-T04-S03-M01`

- **Commit:** `f72f2ca` (2026-11-11 23:50:24 +0330)
- **Files changed:** 9
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/dsp/degraded-crossfade.ts`
  - `packages/core/src/dsp/mock-driver.ts`
  - `packages/core/src/dsp/port.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/dsp-degraded.spec.ts`
  - `packages/core/test/dsp-latency.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Measure DSP port algorithmic latency: sum `getLatencySamples()` from all DSP stages and verify total <= 0.010 * sampleRate (<10 ms).
- **Influential identifiers:** `

### `P04-T04-S02-M05`

- **Commit:** `f972afa` (2026-11-11 23:18:36 +0330)
- **Files changed:** 6
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/dsp/encoder.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/dsp-encoder.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement the export encoding stage (MP3, WAV, FLAC) outside the real-time callback.
- **Influential identifiers:** `

### `P04-T04-S02-M04`

- **Commit:** `f969298` (2026-11-11 23:09:19 +0330)
- **Files changed:** 6
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/dsp/input-gain.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/dsp-input-gain.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Apply input gain normalization from `loudness_ebu128` as the first stage of the chain.

### `P04-T04-S02-M03`

- **Commit:** `c0fab94` (2026-11-11 22:57:21 +0330)
- **Files changed:** 8
  - `Docs/.Agents/AI Agent.MD`
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/config/transition-config.ts`
  - `packages/core/src/dsp/limiter.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/dsp-limiter.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement the look-ahead peak limiter with 4x oversampling and report its algorithmic latency.

### `P04-T04-S02-M02`

- **Commit:** `4fa92e0` (2026-11-11 22:47:30 +0330)
- **Files changed:** 9
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/config/transition-config.ts`
  - `packages/core/src/dsp/comp.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/dsp-comp.spec.ts`
  - `packages/core/test/dsp-mock.spec.ts`
  - `packages/core/test/dsp.port.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement the multi-band compressor (band-split biquads, per-band detector and gain computer).

### `P04-T04-S02-M01`

- **Commit:** `e96f6d0` (2026-11-11 22:24:57 +0330)
- **Files changed:** 4
  - `Docs/ArchitectureBook/content.js`
  - `packages/core/src/dsp/biquad.ts`
  - `packages/core/src/dsp/three-band-eq.ts`
  - `packages/core/test/dsp.eq.spec.ts`
- **Test files:** `
- **Description:** Implement the three-band EQ as cascaded IIR biquads (Direct Form II transposed) re-deriving coefficients on sample-rate change.
- **Influential identifiers:** `

### `P04-T04-S01-M02`

- **Commit:** `5a55017` (2026-11-11 22:03:57 +0330)
- **Files changed:** 6
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/dsp/mock-driver.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/dsp-mock.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement the mock DSP driver and bypass module for headless signal-flow tests.
- **Influential identifiers:** `

### `P04-T04-S01-M01`

- **Commit:** `039284b` (2026-11-11 21:55:31 +0330)
- **Files changed:** 7
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/dsp/port.schema.json`
  - `packages/core/src/dsp/port.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/dsp.port.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Define the `DspPort` interface and the `AudioParamAutomation` schema (target value, time, curve type).

### `P04-T03-S02-M02`

- **Commit:** `1696505` (2026-11-11 21:43:07 +0330)
- **Files changed:** 7
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/dsp/worklet-skeleton.ts`
  - `tools/eslint-rules/rt-safe.js`
  - `tools/eslint-rules/test/rt-safe.spec.ts`
  - `vitest.config.ts`
- **Test files:** `
- **Description:** Add an ESLint rule banning `new`, array/object literals, `console` and `await` inside files tagged `@rt-safe`.

### `P04-T03-S02-M01`

- **Commit:** `cda1fac` (2026-11-11 21:28:53 +0330)
- **Files changed:** 5
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `tools/rt-audit/fixtures/allocating-processor.ts`
  - `tools/rt-audit/test/audit.spec.ts`
- **Test files:** `
- **Description:** Build an RT-safety audit harness that counts heap allocations and lock acquisitions across 10 000 `process()` calls.

### `P04-T03-S01-M05`

- **Commit:** `4d5e774` (2026-11-11 21:15:56 +0330)
- **Files changed:** 6
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/dsp/denormal.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/dsp.denormal.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Flush denormals on the audio thread in feedback and filter state.

### `P04-T03-S01-M03`

- **Commit:** `d1af7e7` (2026-11-11 20:38:54 +0330)
- **Files changed:** 6
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/dsp/smoother.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/dsp.smoother.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement a per-sample one-pole smoother for audio-path parameters.

### `P04-T03-S01-M02`

- **Commit:** `4dc23ef` (2026-11-11 20:35:55 +0330)
- **Files changed:** 4
  - `Docs/ArchitectureBook/content.js`
  - `packages/core/src/dsp/spsc-ring-buffer.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/dsp.spsc-ring-buffer.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement a lock-free SPSC ring buffer over `SharedArrayBuffer` with `Atomics` for parameter events.
- **Influential identifiers:** `

### `P04-T03-S01-M01`

- **Commit:** `b688595` (2026-11-11 20:20:12 +0330)
- **Files changed:** 7
  - `Docs/.Agents/AI Agent.MD`
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/dsp/worklet-skeleton.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/worklet-skeleton.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Create the `AudioWorkletProcessor` skeleton that pre-allocates grid state, slice buffers and smoothing state at preparation time and performs no allocation in `process()`.

### `P04-T02-S02-M03`

- **Commit:** `1f07bf2` (2026-11-11 19:52:41 +0330)
- **Files changed:** 6
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/chop/widen-grid.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/chop.widen-grid.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Widen `chopGrid` from 1/32 to 1/8 under high-load or low-latency edge conditions.

### `P04-T02-S02-M02`

- **Commit:** `ee27764` (2026-11-11 19:45:00 +0330)
- **Files changed:** 5
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/chop/crossfade-bound.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/chop.crossfade-bound.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Enforce `crossfadeBeats ≤ chopGrid_fraction / 4` as a pure beat-based comparison (no seconds).

### `P04-T02-S01-M03`

- **Commit:** `905ece6` (2026-11-11 19:07:39 +0330)
- **Files changed:** 6
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/chop/groove-shift.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/chop.groove-shift.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Shift slice boundaries by `Δ_groove` when a groove mode is Swing.

### `P04-T02-S01-M02`

- **Commit:** `1ee5b61` (2026-11-11 18:45:23 +0330)
- **Files changed:** 2
  - `Docs/ArchitectureBook/content.js`
  - `packages/core/src/chop/passthrough.ts`
- **Description:** Pass audio outside the transition window through without copying or processing.

### `P04-T02-S01-M01`

- **Commit:** `4107b33` (2026-11-11 18:41:24 +0330)
- **Files changed:** 3
  - `Docs/ArchitectureBook/content.js`
  - `packages/core/src/chop/slice.ts`
  - `packages/core/test/chop.slice.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Slice `Float32Array` audio inside the transition window onto the chopGrid (1/8, 1/16, 1/32) using beat-based boundaries.

### `P03-T03-S01-M04`

- **Commit:** `eaead45` (2026-11-11 18:11:26 +0330)
- **Files changed:** 2
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
- **Description:** Implement the Observer's post-transition 16-bar logarithmic realignment using beat-grid slicing (no pitch shift).

### `P03-T04-S01-M04`

- **Commit:** `eaead45` (2026-11-11 18:11:26 +0330)
- **Files changed:** 2
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
- **Description:** Benchmark the Observer loop cycle and fail if the P99 exceeds 48 samples (1 ms at 48kHz).
- **Influential identifiers:** `

### `P03-T04-S01-M03`

- **Commit:** `eaead45` (2026-11-11 18:11:26 +0330)
- **Files changed:** 2
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
- **Description:** Expand the audio buffer from 2048 to 4096 samples when frame processing exceeds the Web Audio boundary threshold.

### `P03-T04-S01-M02`

- **Commit:** `eaead45` (2026-11-11 18:11:26 +0330)
- **Files changed:** 2
  - `Docs/ArchitectureBook/content.js`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
- **Description:** Apply slice-chopping realignment when drift exceeds the quanta threshold. No playbackRate time-stretching is allowed.

### `P04-T01-S01-M01`

- **Commit:** `e206c68` (2026-11-11 12:07:22 +0330)
- **Files changed:** 1
  - `Docs/ArchitectureBook/clues/P04.md`
- **Description:** Compute `BPM_target=(BPM_out+BPM_in)/2` as the default glide target.

### `P03-T06-S01-M07`

- **Commit:** `7f95a8d` (2026-11-10 23:03:03 +0330)
- **Files changed:** 7
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `package.json`
  - `packages/core/src/transition/planner.ts`
  - `packages/core/test/transition.property.spec.ts`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
- **Test files:** `
- **Exports added:** `
- **Description:** Add a property-based test generating 10 000 random plan requests (BPM, lengths, kick presence, tempo deltas) and asserting a plan is always returned.
- **Influential identifiers:** `

### `P03-T06-S01-M05`

- **Commit:** `eba2418` (2026-11-10 22:45:19 +0330)
- **Files changed:** 6
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/transition/planner.ts`
  - `packages/core/src/transition/types.ts`
  - `packages/core/test/transition.forced.spec.ts`
  - `packages/core/test/transition.short.spec.ts`
- **Test files:** `
- **Description:** Handle tracks shorter than 16 beats with a silent structural loop (RUNG_SILENT_LOOP).
- **Influential identifiers:** `

### `P03-T06-S01-M04`

- **Commit:** `8012512` (2026-11-10 22:17:21 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/constants/grid.ts`
  - `packages/core/src/transition/planner.ts`
  - `packages/core/test/transition.safety.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement the ultimate safety net: a clean 4-bar volume crossfade independent of grid locks (RUNG_FOUR_BAR_CROSSFADE).
- **Influential identifiers:** `

### `P03-T06-S01-M03`

- **Commit:** `72908d8` (2026-11-10 22:07:54 +0330)
- **Files changed:** 6
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/transition/anchors.ts`
  - `packages/core/src/transition/planner.ts`
  - `packages/core/src/transition/types.ts`
  - `packages/core/test/transition.static120.spec.ts`
- **Test files:** `
- **Description:** Map a static 120 BPM grid for purely ambient or kick-less tracks (RUNG_STATIC_120_GRID).
- **Influential identifiers:** `

### `P03-T06-S01-M02`

- **Commit:** `0524bed` (2026-11-10 22:00:38 +0330)
- **Files changed:** 7
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/index.ts`
  - `packages/core/src/transition/index.ts`
  - `packages/core/src/transition/planner.ts`
  - `packages/core/src/transition/types.ts`
  - `packages/core/test/transition.forced.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Force mathematical alignment across the 16-beat timeline when the incoming track has no kick transients in its first 16 beats.

### `P03-T06-S01-M01`

- **Commit:** `9d5afd2` (2026-11-10 21:48:26 +0330)
- **Files changed:** 6
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/constants/grid.ts`
  - `packages/core/src/index.ts`
  - `packages/core/src/transition/anchors.ts`
  - `packages/core/test/transition.anchors.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Anchor the incoming track at Beat 1 of its initial 16-beat block (bars 1–4) and the outgoing track at its final 16-beat block.

### `P03-T05-S01-M03`

- **Commit:** `231dccd` (2026-11-10 21:38:17 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/groove/index.ts`
  - `packages/core/src/groove/irregular.ts`
  - `packages/core/test/groove.irregular.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** For irregular or hybrid grooves default to Straight and expand the micro-crossfade window by +10 ms.

### `P03-T05-S01-M02`

- **Commit:** `dce183d` (2026-11-10 21:29:30 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/groove/delta.ts`
  - `packages/core/src/groove/index.ts`
  - `packages/core/test/groove.delta.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Compute `Δ_groove` and shift chopping window boundaries by that swing displacement.

### `P03-T05-S01-M01`

- **Commit:** `900b50e` (2026-11-10 21:22:14 +0330)
- **Files changed:** 7
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/groove/classify.ts`
  - `packages/core/src/groove/index.ts`
  - `packages/core/src/groove/types.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/groove.classify.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Classify micro-timing across 16th-note subdivisions as Straight (<2% variance), Triplet (<5% from 33.3%/66.6%) or Swing (off-beat 16ths displaced 0.05–0.33 beat).

### `P03-T04-S01-M01`

- **Commit:** `3916edf` (2026-11-10 20:31:27 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/index.ts`
  - `packages/core/src/observer/drift.ts`
  - `packages/core/test/observer.drift.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement the drift calculation: phase delta between the rendering clock position and the Absolute Locked Grid.

### `P03-T03-S01-M02`

- **Commit:** `b90dae5` (2026-11-10 19:57:46 +0330)
- **Files changed:** 6
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/constants/grid.ts`
  - `packages/core/src/grid/realign-cosine.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/grid.realign-cosine.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement the 4-bar cosine interpolation realignment at about 1 ms per beat.

### `P03-T03-S01-M01`

- **Commit:** `eb50b6a` (2026-11-10 19:52:41 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/grid/realign-trigger.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/grid.realign-trigger.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Detect the realignment trigger: outgoing sub-band RMS below −40 dBFS after crossfade completion.
- **Influential identifiers:** `

### `P03-T02-S01-M03`

- **Commit:** `6be0509` (2026-11-10 19:47:21 +0330)
- **Files changed:** 7
  - `.clineignore`
  - `.gitignore`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/grid/dual-grid.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/grid.dormant.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Keep the Dual Grid dormant for negative beat indices and initialize it only at Beat 1.

### `P03-T02-S01-M01`

- **Commit:** `2148db8` (2026-11-10 19:41:37 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/grid/phase-offset.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/grid.phase-offset.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement `phaseOffset(T_body_peak, T_attack_onset)` returning `Δϕ = T_body_peak − T_attack_onset`.

### `P03-T01-S02-M01`

- **Commit:** `5bb6b4c` (2026-11-10 19:35:36 +0330)
- **Files changed:** 10
  - `Docs/.Agents/AI Agent.MD`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/constants/grid.ts`
  - `packages/core/src/dsp/biquad.ts`
  - `packages/core/src/dsp/butterworth.ts`
  - `packages/core/src/grid/body.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/grid.body.spec.ts`
  - `scripts/heap-proof.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement `extractBodyGrid(pcm)` using an 80 Hz Butterworth low-pass filter followed by RMS amplitude detection to locate the sub-bass envelope peak.
- **Influential identifiers:** `

### `P03-T01-S01-M01`

- **Commit:** `072b287` (2026-11-10 19:20:35 +0330)
- **Files changed:** 0
- **Description:** Implement `extractAttackGrid(pcm)` using spectral-flux peak detection with a 2048-sample Hamming window, 50% overlap, restricted to frequencies above 200 Hz.

### `P02-T05-S01-M03`

- **Commit:** `99f4c38` (2026-11-10 17:14:31 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/grid/prekick-map.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/grid.prekick-map.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement the localized pre-kick tempo map for long variable-tempo introductions, counting backwards from `T0`.

### `P02-T05-S01-M01`

- **Commit:** `b73d8e9` (2026-11-10 17:06:44 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/grid/prekick-short.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/grid.prekick-short.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement pre-kick gap < 1 bar: assign the kick downbeat Beat 1 and earlier frames Beat −1, −2, −3.

### `P02-T04-S01-M02`

- **Commit:** `4fef469` (2026-11-10 17:00:19 +0330)
- **Files changed:** 4
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/grid/model.ts`
  - `packages/core/test/grid.recovery.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement the lock-failure recovery state: fall back to the track's global average BPM and disable micro-adjustments (Δ≡0).
- **Influential identifiers:** `

### `P02-T04-S01-M01`

- **Commit:** `d303994` (2026-11-10 16:56:24 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/grid/model.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/grid.piecewise.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement a piecewise `GridModel` with BPM_seed updates at predefined structural boundaries and continuity at each boundary.

### `P02-T03-S01-M04`

- **Commit:** `5777985` (2026-11-10 16:47:40 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/anchor/fallback.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/anchor.fallback.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement the fallback anchor: when no kick is found at bars 5, 8 or 16 (or the track is kick-less), anchor at the first transient exceeding −12 dBFS.

### `P02-T03-S01-M03`

- **Commit:** `f3a511b` (2026-11-10 16:43:22 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/anchor/realign.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/anchor.realign.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement forward realignment of `T0` to the first validated primary downbeat in subsequent 4-bar blocks for OFF_BEAT candidates.
- **Influential identifiers:** `

### `P02-T03-S01-M02`

- **Commit:** `7517a5d` (2026-11-10 16:34:25 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/anchor/classify.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/anchor.classify.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement `classifyKick(candidate, refs)` returning OFF_BEAT when correlation < 0.85 or shape variance > 15% against the kicks at bars 5, 8 and 16.
- **Influential identifiers:** `

### `P02-T03-S01-M01`

- **Commit:** `2fbfaaf` (2026-11-10 16:25:13 +0330)
- **Files changed:** 6
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/anchor/pearson.ts`
  - `packages/core/src/constants/timing.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/anchor.pearson.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement Pearson correlation over 100 ms low-frequency energy envelopes, returning 0 for zero-variance inputs with a flag.

### `P02-T02-S02-M02`

- **Commit:** `58abc2a` (2026-11-10 16:14:48 +0330)
- **Files changed:** 4
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `scripts/heap-proof.ts`
  - `scripts/test/heap-proof.spec.ts`
- **Test files:** `
- **Description:** Write `scripts/heap-proof.ts` that generates timelines for 1-minute and 120-minute tracks and reports the retained-size delta using V8 heap statistics and a heap snapshot.

### `P02-T02-S02-M01`

- **Commit:** `31bc474` (2026-11-10 16:05:23 +0330)
- **Files changed:** 7
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/timing/quantum.ts`
  - `packages/core/src/timing/structure.ts`
  - `tools/eslint-rules/no-alloc-in-structural.js`
  - `tools/eslint-rules/verify.js`
  - `tools/test/no-alloc.spec.ts`
- **Test files:** `
- **Description:** Create an ESLint rule `no-alloc-in-structural` that fails on array/object/typed-array allocation inside files tagged `@structural`.

### `P02-T02-S01-M03`

- **Commit:** `11e31aa` (2026-11-10 15:54:12 +0330)
- **Files changed:** 6
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/index.ts`
  - `packages/core/src/timing/clock.ts`
  - `packages/core/src/timing/scheduler.ts`
  - `packages/core/test/timing.scheduler.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement `LookaheadScheduler` with a 50 ms lookahead and an injected clock, scheduling events on beat-based units.

### `P02-T02-S01-M02`

- **Commit:** `650cfdb` (2026-11-10 15:32:47 +0330)
- **Files changed:** 6
  - `.clinerules`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/index.ts`
  - `packages/core/src/timing/quantum.ts`
  - `packages/core/test/timing.quantum.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement `quantumSeconds(bpm)=(60/bpm)/24` and `quantumIndex(beatFloat)=round(beatFloat·24)`, operating on floating-point beat indices.

### `P02-T02-S01-M01`

- **Commit:** `14723e0` (2026-11-10 15:25:53 +0330)
- **Files changed:** 0
- **Description:** Implement `floorMod`, `beatInBar`, `barIndex`, `blockPosition`, `isBlockBoundary` exactly as §3.15.

### `P02-T01-S02-M02`

- **Commit:** `eadc5da` (2026-11-10 14:54:22 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/grid/anchor-sync.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/grid.anchor-sync.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement hard anchor synchronization every 16 bars (every 64 beats) that resets Δ to the measured anchor error.

### `P02-T01-S02-M01`

- **Commit:** `3b43803` (2026-11-10 14:26:41 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/grid/period.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/grid.period.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement `boundPeriod(measured, seedPeriod)` constraining the result to [0.95, 1.05]×seedPeriod.

### `P02-T01-S01-M02`

- **Commit:** `7ac89ba` (2026-11-10 14:11:27 +0330)
- **Files changed:** 4
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/grid/t-of-i.ts`
  - `packages/core/test/grid.delta-clamp.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Clamp `delta` to ±0.05 s inside `tOfI` and increment counter `core.grid.delta_clamped` when clamping occurs.

### `P02-T01-S01-M01`

- **Commit:** `bd507e0` (2026-11-10 13:59:23 +0330)
- **Files changed:** 6
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/grid/t-of-i.ts`
  - `packages/core/src/index.ts`
  - `packages/core/test/grid.t-of-i.spec.ts`
  - `vitest.workspace.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement `tOfI(i, T0, bpmSeed, delta)` as `T0 + n·(60/bpmSeed) + delta` with n=i−1 for i≥1 and n=i for i≤−1.

### `P01-T01-S01-M01`

- **Commit:** `5778482` (2026-11-10 13:32:04 +0330)
- **Files changed:** 2
  - `Docs/Claude/P01_Audit_Prompt_for_Cline.md`
  - `Docs/Claude/p01-phase.spec.ts`
- **Test files:** `
- **Description:** Initialize a pnpm monorepo with packages `core`, `access`, `adapter`, `gateway`, `workers`, `ui`, `db`, `proto`, `contracts`, strict TypeScript, ESLint and Prettier.

### `P01-T08-S01-M02`

- **Commit:** `36c4a57` (2026-11-10 11:46:34 +0330)
- **Files changed:** 5
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/core/src/index.ts`
  - `packages/core/src/telemetry/propagation.ts`
  - `packages/core/test/propagation.spec.ts`
- **Test files:** `
- **Exports added:** `
- **Description:** Implement W3C `traceparent` propagation across REST headers, gRPC metadata and a `postMessage` envelope into Web Workers.
- **Influential identifiers:** `

### `P01-T08-S01-M01`

- **Commit:** `e80c5ef` (2026-11-10 11:45:27 +0330)
- **Files changed:** 0
- **Description:** Implement the JSON logger with required fields (ts, level, service, tenant_id, trace_id, span_id, event, outcome, country, duration_ms), edge PII masking and country truncation to ISO 3166-1 Alpha-2.
- **Influential identifiers:** `

### `P01-T07-S02-M01`

- **Commit:** `07930e7` (2026-11-10 11:35:34 +0330)
- **Files changed:** 0
- **Description:** Implement `DegradedModeController` entering on pool exhaustion or worker failure and exiting on recovery, exposing `core.degraded_mode.active`.

### `P01-T07-S01-M01`

- **Commit:** `92a83c4` (2026-11-10 11:29:11 +0330)
- **Files changed:** 0
- **Description:** Implement `retry(fn, {idempotent})` with at most 3 retries, base 200 ms, multiplier 2, full jitter, 5 000 ms cap, and a hard refusal to retry non-idempotent calls.

### `P01-T06-S02-M01`

- **Commit:** `70632dd` (2026-11-10 11:14:57 +0330)
- **Files changed:** 0
- **Description:** Implement a receiver dedup store keyed by `message_id` (TTL ≥ 24 h) with per-tenant monotonic `sequence` ordering and signature validation performed before the dedup write.

### `P01-T06-S01-M02`

- **Commit:** `b358772` (2026-11-10 10:33:51 +0330)
- **Files changed:** 0
- **Description:** Implement the Redis store: `SET NX` with an in-progress marker, 24 h TTL, request fingerprint; same key and fingerprint replays the stored response, different fingerprint returns ABORTED/409.
- **Influential identifiers:** `

### `P01-T06-S01-M01`

- **Commit:** `8cfa273` (2026-11-10 10:22:27 +0330)
- **Files changed:** 0
- **Description:** Implement middleware validating `Idempotency-Key` as UUIDv4 on POST/PUT/PATCH/DELETE; missing or malformed returns INVALID_ARGUMENT/400.
- **Influential identifiers:** `

### `P01-T05-S01-M02`

- **Commit:** `6ed84bd` (2026-11-09 22:29:29 +0330)
- **Files changed:** 0
- **Description:** Add RLS (`ENABLE` + `FORCE`) and the `tenant_isolation` policy to every tenant-carrying table and create an application role without BYPASSRLS that does not own the tables.
- **Influential identifiers:** `

### `P01-T05-S01-M01`

- **Commit:** `82fed22` (2026-11-09 20:53:55 +0330)
- **Files changed:** 9
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/db/migrations/001_core.sql`
  - `packages/db/package.json`
  - `packages/db/src/migrate.ts`
  - `packages/db/test/migrate.spec.ts`
  - `packages/db/tsconfig.json`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
- **Test files:** `
- **Description:** Write migration `001_core.sql` creating `features`, `users`, `tier_grants`, `admin_audit` (range-partitioned by month) and `outbox` exactly per §9.5 CHECK constraints and indices.
- **Influential identifiers:** `

### `P01-T04-S02-M01`

- **Commit:** `f53c574` (2026-11-09 20:04:35 +0330)
- **Files changed:** 0
- **Description:** Implement the gRPC-to-HTTP status map from §9.3 as `mapStatus(code)` including the nine listed codes.

### `P01-T04-S01-M01`

- **Commit:** `3d1618e` (2026-11-09 19:25:14 +0330)
- **Files changed:** 9
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/proto/buf.gen.yaml`
  - `packages/proto/buf.yaml`
  - `packages/proto/package.json`
  - `packages/proto/proto/core/v1/core.proto`
  - `packages/proto/src/generated/proto/core/v1/core_pb.ts`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
- **Exports added:** `
- **Description:** Write `proto/core/v1/core.proto` exactly as §9.2 (messages `AnalyzeAudioRequest`, `AnalyzeAudioResponse`, `TransitionPlanRequest`, `ExecutionFallback` and the supporting types) and generate TypeScript stubs.

### `P01-T03-S02-M01`

- **Commit:** `9606977` (2026-11-09 18:23:44 +0330)
- **Files changed:** 11
  - `Docs/OtoMix Todo-Plan/AI Agent.MD`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`
  - `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json`
  - `packages/contracts/package.json`
  - `packages/contracts/schemas/feature-registry-1.2.json`
  - `packages/contracts/src/index.ts`
  - `packages/contracts/src/types.ts`
  - `packages/contracts/src/validate.ts`
  - `packages/contracts/test/registry-schema.spec.ts`
  - `packages/contracts/tsconfig.json`
  - `pnpm-lock.yaml`
- **Test files:** `
- **Exports added:** `
- **Description:** Add the Draft 7 JSON Schema from §9.6 as `packages/contracts/schemas/feature-registry-1.2.json` with an AJV validator wrapper.
- **Influential identifiers:** `

### `P01-T03-S01-M01`

- **Commit:** (not found by `git log --grep`)
- **Description:** Implement `BPM.parse(n)` returning a branded type, rejecting values outside [60.0, 200.0] with INVALID_ARGUMENT.
- **Influential identifiers:** `

### `P01-T01-S02-M01`

- **Commit:** (not found by `git log --grep`)
- **Description:** Configure Vitest coverage thresholds of 90% branches for `packages/core` and 100% branches for `packages/access`.

### `P06-RBAC-M03`

- **Commit:** (not found by `git log --grep`)
- **Description:** Seed base roles (regular_user, tier_N, dsp_specialist, content_specialist, customer_care, accountant, deputy_admin, super_admin). GAP-015.
- **Influential identifiers:** `
- **GAP references:** `

### `P06-RBAC-M12`

- **Commit:** (not found by `git log --grep`)
- **Description:** Regenerate Cucumber authorization matrix from the dynamic catalog. GAP-015.
- **Influential identifiers:** `
- **GAP references:** `

### `P01-T03-S01-M02`

- **Commit:** (not found by `git log --grep`)
- **Description:** Implement `CamelotKey.parse(s)` accepting `^(1[0-2]\|[1-9])[AB]$` only.

### `P01-T02-S01-M03`

- **Commit:** (not found by `git log --grep`)
- **Description:** Create `packages/core/src/constants/scoring.ts` and `packages/access/src/constants.ts` exporting: ENERGY_WEIGHTS=[0.4,0.3,0.2,0.1], MIX_WEIGHTS=[0.4,0.3,0.2,0.1], UNMIXABLE_BELOW=0.4, VOCAL_THRESHOLD=0.65, VOCAL_MEDIAN_S=1, RECO_WEIGHTS=[0.6,0.3,0.1], TEMPO_DELTA_LIMIT=0.01, WASM_HEAP_MB=512, ACCESS_TTL_MIN=15, REFRESH_TTL_DAYS=7, KEY_ROTATION_DAYS=90, IDEMPOTENCY_TTL_H=24, MAX_RETRIES=3, RPO_MIN=15, RTO_MIN=60, SLO=0.999.
- **Influential identifiers:** `

### `P04-T02-S02-M01`

- **Commit:** (not found by `git log --grep`)
- **Description:** Implement `F_fade=0.5·(1+cos(π·t/crossfadeBeats))` for t∈[0, crossfadeBeats] applied at slice boundaries.

### `P06-RBAC-M09`

- **Commit:** (not found by `git log --grep`)
- **Description:** Expiry test with frozen clock (T-1ms / T / T+1ms). GAP-015.
- **Influential identifiers:** `
- **GAP references:** `

### `P06-RBAC-M10`

- **Commit:** (not found by `git log --grep`)
- **Description:** Drop scopes[] and tier from access token; token carries identity only. GAP-015.
- **Influential identifiers:** `
- **GAP references:** `

### `P01-T02-S01-M02`

- **Commit:** (not found by `git log --grep`)
- **Description:** Create `packages/core/src/constants/grid.ts` exporting: PERIOD_MIN=0.95, PERIOD_MAX=1.05, DRIFT_MAX_S=0.05, ANCHOR_SYNC_BARS=16, BODY_REALIGN_DBFS=-40, FALLBACK_TRANSIENT_DBFS=-12, CORR_MIN=0.85, SHAPE_VAR_MAX=0.15, STRAIGHT_VAR=0.02, TRIPLET_VAR=0.05, SWING_MIN=0.05, SWING_MAX=0.33, IRREGULAR_XFADE_EXTRA_MS=10, STATIC_GRID_BPM=120, SAFETY_XFADE_BARS=4, QUANTUM_DIVISOR=24, GLIDE_MAX=0.08, PITCH_NODE_SEMITONES=1, REALIGN_MAX_SEMITONES=0.05, RATE_MIN=0.98, RATE_MAX=1.02, RATE_SLEW_PER_S=0.005.
- **Influential identifiers:** `

### `P01-T02-S01-M01`

- **Commit:** (not found by `git log --grep`)
- **Description:** Create `packages/core/src/constants/timing.ts` exporting frozen constants: LOOKAHEAD_MS=50, SCHED_ACCURACY_MS=2, DRIFT_THRESHOLD_MS=4, STARVATION_FRAME_MS=10, BUFFER_NORMAL=2048, BUFFER_DEGRADED=4096, PORT_BUFFER_SAMPLES=1024, PORT_LATENCY_MS=10, ANALYSIS_TIMEOUT_MS=5000, EXTRACTION_ALERT_MS=2500, OBSERVER_CYCLE_MS=1.
- **Influential identifiers:** `

### `P06-RBAC-M08`

- **Commit:** (not found by `git log --grep`)
- **Description:** Group CRUD + time-bound group permissions. GAP-015.
- **Influential identifiers:** `
- **GAP references:** `

### `P06-RBAC-M07`

- **Commit:** (not found by `git log --grep`)
- **Description:** Bootstrap super_admin + regular_user. GAP-015.
- **Influential identifiers:** `
- **GAP references:** `

### `P06-RBAC-M05`

- **Commit:** (not found by `git log --grep`)
- **Description:** Effective permissions evaluator (union of role + user + group grants, deny precedence, expiry filter). GAP-015.
- **Influential identifiers:** `
- **GAP references:** `

### `P04-T04-S03-M02`

- **Commit:** (not found by `git log --grep`)
- **Description:** Implement the degraded-mode path: standard crossfade without micro-chopping (RUNG_STANDARD_CROSSFADE).
- **Influential identifiers:** `

### `P06-RBAC-M06`

- **Commit:** (not found by `git log --grep`)
- **Description:** Redis cache (60s TTL) + PostgreSQL LISTEN/NOTIFY invalidation for effective permissions. GAP-015.
- **Influential identifiers:** `
- **GAP references:** `

### `P06-RBAC-M11`

- **Commit:** (not found by `git log --grep`)
- **Description:** Rewrite interceptor to read effective permissions per request. GAP-015.
- **Influential identifiers:** `
- **GAP references:** `

### `P01-T03-S01-M03`

- **Commit:** (not found by `git log --grep`)
- **Description:** Implement `BeatIndex.parse(i)` accepting any non-zero safe integer and rejecting 0 and non-integers.

### `P03-T06-S01-M06`

- **Commit:** (not found by `git log --grep`)
- **Description:** Decide whether transition windows are 16 beats (4 bars) or 16 bars (64 beats) at the Float32Array processing stage.

### `P06-RBAC-M02`

- **Commit:** (not found by `git log --grep`)
- **Description:** Permissions catalog seed (>=40 keys) + drift detector. GAP-015.
- **Influential identifiers:** `
- **GAP references:** `

### `P06-RBAC-M04`

- **Commit:** (not found by `git log --grep`)
- **Description:** Grant/revoke service with audit + Slack escalation. GAP-015.
- **Influential identifiers:** `
- **GAP references:** `

## 📋 By phase

### P01 — 23/23 done
- [x] `P01-T01-S01-M01` — Initialize a pnpm monorepo with packages `core`, `access`, `adapter`, `gatewa...
- [x] `P01-T01-S02-M01` — Configure Vitest coverage thresholds of 90% branches for `packages/core` and ...
- [x] `P01-T01-S02-M02` — Implement `scripts/cvss-gate.ts` that exits non-zero when any scanner finding...
- [x] `P01-T02-S01-M01` — Create `packages/core/src/constants/timing.ts` exporting frozen constants: LO...
- [x] `P01-T02-S01-M02` — Create `packages/core/src/constants/grid.ts` exporting: PERIOD_MIN=0.95, PERI...
- [x] `P01-T02-S01-M03` — Create `packages/core/src/constants/scoring.ts` and `packages/access/src/cons...
- [x] `P01-T03-S01-M01` — Implement `BPM.parse(n)` returning a branded type, rejecting values outside [...
- [x] `P01-T03-S01-M02` — Implement `CamelotKey.parse(s)` accepting `^(1[0-2]\|[1-9])[AB]$` only.
- [x] `P01-T03-S01-M03` — Implement `BeatIndex.parse(i)` accepting any non-zero safe integer and reject...
- [x] `P01-T03-S02-M01` — Add the Draft 7 JSON Schema from §9.6 as `packages/contracts/schemas/feature-...
- [x] `P01-T03-S02-M02` — Implement a SemVer gate for `schema_version`: accept `1.2.x`, flag a major bu...
- [x] `P01-T04-S01-M01` — Write `proto/core/v1/core.proto` exactly as §9.2 (messages `AnalyzeAudioReque...
- [x] `P01-T04-S02-M01` — Implement the gRPC-to-HTTP status map from §9.3 as `mapStatus(code)` includin...
- [x] `P01-T05-S01-M01` — Write migration `001_core.sql` creating `features`, `users`, `tier_grants`, `...
- [x] `P01-T05-S01-M02` — Add RLS (`ENABLE` + `FORCE`) and the `tenant_isolation` policy to every tenan...
- [x] `P01-T05-S01-M03` — Implement `withTenant(tx, tenantId)` using `set_config('app.tenant_id', $1, t...
- [x] `P01-T06-S01-M01` — Implement middleware validating `Idempotency-Key` as UUIDv4 on POST/PUT/PATCH...
- [x] `P01-T06-S01-M02` — Implement the Redis store: `SET NX` with an in-progress marker, 24 h TTL, req...
- [x] `P01-T06-S02-M01` — Implement a receiver dedup store keyed by `message_id` (TTL ≥ 24 h) with per-...
- [x] `P01-T07-S01-M01` — Implement `retry(fn, {idempotent})` with at most 3 retries, base 200 ms, mult...
- [x] `P01-T07-S02-M01` — Implement `DegradedModeController` entering on pool exhaustion or worker fail...
- [x] `P01-T08-S01-M01` — Implement the JSON logger with required fields (ts, level, service, tenant_id...
- [x] `P01-T08-S01-M02` — Implement W3C `traceparent` propagation across REST headers, gRPC metadata an...

### P02 — 17/18 done
- [x] `P02-T01-S01-M01` — Implement `tOfI(i, T0, bpmSeed, delta)` as `T0 + n·(60/bpmSeed) + delta` with...
- [x] `P02-T01-S01-M02` — Clamp `delta` to ±0.05 s inside `tOfI` and increment counter `core.grid.delta...
- [x] `P02-T01-S02-M01` — Implement `boundPeriod(measured, seedPeriod)` constraining the result to [0.9...
- [x] `P02-T01-S02-M02` — Implement hard anchor synchronization every 16 bars (every 64 beats) that res...
- [x] `P02-T02-S01-M01` — Implement `floorMod`, `beatInBar`, `barIndex`, `blockPosition`, `isBlockBound...
- [x] `P02-T02-S01-M02` — Implement `quantumSeconds(bpm)=(60/bpm)/24` and `quantumIndex(beatFloat)=roun...
- [x] `P02-T02-S01-M03` — Implement `LookaheadScheduler` with a 50 ms lookahead and an injected clock, ...
- [x] `P02-T02-S02-M01` — Create an ESLint rule `no-alloc-in-structural` that fails on array/object/typ...
- [x] `P02-T02-S02-M02` — Write `scripts/heap-proof.ts` that generates timelines for 1-minute and 120-m...
- [x] `P02-T03-S01-M01` — Implement Pearson correlation over 100 ms low-frequency energy envelopes, ret...
- [x] `P02-T03-S01-M02` — Implement `classifyKick(candidate, refs)` returning OFF_BEAT when correlation...
- [x] `P02-T03-S01-M03` — Implement forward realignment of `T0` to the first validated primary downbeat...
- [x] `P02-T03-S01-M04` — Implement the fallback anchor: when no kick is found at bars 5, 8 or 16 (or t...
- [x] `P02-T04-S01-M01` — Implement a piecewise `GridModel` with BPM_seed updates at predefined structu...
- [x] `P02-T04-S01-M02` — Implement the lock-failure recovery state: fall back to the track's global av...
- [x] `P02-T05-S01-M01` — Implement pre-kick gap < 1 bar: assign the kick downbeat Beat 1 and earlier f...
- [ ] `P02-T05-S01-M02` — Implement pre-kick gap ≥ 1 bar: shift `T0` backward in exact 4-beat multiples...
- [x] `P02-T05-S01-M03` — Implement the localized pre-kick tempo map for long variable-tempo introducti...

### P03 — 21/24 done
- [x] `P03-T01-S01-M01` — Implement `extractAttackGrid(pcm)` using spectral-flux peak detection with a ...
- [x] `P03-T01-S02-M01` — Implement `extractBodyGrid(pcm)` using an 80 Hz Butterworth low-pass filter f...
- [x] `P03-T02-S01-M01` — Implement `phaseOffset(T_body_peak, T_attack_onset)` returning `Δϕ = T_body_p...
- [ ] `P03-T02-S01-M02` — Default to the Attack Grid only for tracks devoid of a strong kick body.
- [x] `P03-T02-S01-M03` — Keep the Dual Grid dormant for negative beat indices and initialize it only a...
- [x] `P03-T03-S01-M01` — Detect the realignment trigger: outgoing sub-band RMS below −40 dBFS after cr...
- [x] `P03-T03-S01-M02` — Implement the 4-bar cosine interpolation realignment at about 1 ms per beat.
- [-] `P03-T03-S01-M03` — Decide whether the §3.2 4-bar cosine curve and the §3.6 16-bar logarithmic sh...
- [x] `P03-T03-S01-M04` — Implement the Observer's post-transition 16-bar logarithmic realignment using...
- [x] `P03-T04-S01-M01` — Implement the drift calculation: phase delta between the rendering clock posi...
- [x] `P03-T04-S01-M02` — Apply slice-chopping realignment when drift exceeds the quanta threshold. No ...
- [x] `P03-T04-S01-M03` — Expand the audio buffer from 2048 to 4096 samples when frame processing excee...
- [x] `P03-T04-S01-M04` — Benchmark the Observer loop cycle and fail if the P99 exceeds 48 samples (1 m...
- [ ] `P03-T04-S02-M01` — Decide whether Runtime Drift Compensation must also satisfy the ±0.05 semiton...
- [x] `P03-T05-S01-M01` — Classify micro-timing across 16th-note subdivisions as Straight (<2% variance...
- [x] `P03-T05-S01-M02` — Compute `Δ_groove` and shift chopping window boundaries by that swing displac...
- [x] `P03-T05-S01-M03` — For irregular or hybrid grooves default to Straight and expand the micro-cros...
- [x] `P03-T06-S01-M01` — Anchor the incoming track at Beat 1 of its initial 16-beat block (bars 1–4) a...
- [x] `P03-T06-S01-M02` — Force mathematical alignment across the 16-beat timeline when the incoming tr...
- [x] `P03-T06-S01-M03` — Map a static 120 BPM grid for purely ambient or kick-less tracks (RUNG_STATIC...
- [x] `P03-T06-S01-M04` — Implement the ultimate safety net: a clean 4-bar volume crossfade independent...
- [x] `P03-T06-S01-M05` — Handle tracks shorter than 16 beats with a silent structural loop (RUNG_SILEN...
- [x] `P03-T06-S01-M06` — Decide whether transition windows are 16 beats (4 bars) or 16 bars (64 beats)...
- [x] `P03-T06-S01-M07` — Add a property-based test generating 10 000 random plan requests (BPM, length...

### P04 — 22/29 done
- [x] `P04-T01-S01-M01` — Compute `BPM_target=(BPM_out+BPM_in)/2` as the default glide target.
- [-] `P04-T01-S01-M02` — Apply halving or doubling to `BPM_in` when a half-time/double-time flag is se...
- [-] `P04-T01-S01-M03` — Define the criterion that detects half-time/double-time structural differences.
- [ ] `P04-T01-S02-M01` — Generate `linearRampToValueAtTime` automation for both tracks with start/end ...
- [-] `P04-T01-S02-M02` — Clamp `playbackRate` to ±8% of nominal.
- [-] `P04-T01-S02-M03` — Trigger the secondary WebAssembly pitch-shifting node when the shift exceeds ...
- [x] `P04-T02-S01-M01` — Slice `Float32Array` audio inside the transition window onto the chopGrid (1/...
- [x] `P04-T02-S01-M02` — Pass audio outside the transition window through without copying or processing.
- [x] `P04-T02-S01-M03` — Shift slice boundaries by `Δ_groove` when a groove mode is Swing.
- [x] `P04-T02-S02-M01` — Implement `F_fade=0.5·(1+cos(π·t/crossfadeBeats))` for t∈[0, crossfadeBeats] ...
- [x] `P04-T02-S02-M02` — Enforce `crossfadeBeats ≤ chopGrid_fraction / 4` as a pure beat-based compari...
- [x] `P04-T02-S02-M03` — Widen `chopGrid` from 1/32 to 1/8 under high-load or low-latency edge conditi...
- [-] `P04-T02-S02-M04` — Trigger the legacy WSOLA fallback only when a phase-coherence predicate fails...
- [x] `P04-T03-S01-M01` — Create the `AudioWorkletProcessor` skeleton that pre-allocates grid state, sl...
- [x] `P04-T03-S01-M02` — Implement a lock-free SPSC ring buffer over `SharedArrayBuffer` with `Atomics...
- [x] `P04-T03-S01-M03` — Implement a per-sample one-pole smoother for audio-path parameters.
- [-] `P04-T03-S01-M04` — Apply `crossfadeBeats` and `chopGrid` updates only at the next slice boundary.
- [x] `P04-T03-S01-M05` — Flush denormals on the audio thread in feedback and filter state.
- [x] `P04-T03-S02-M01` — Build an RT-safety audit harness that counts heap allocations and lock acquis...
- [x] `P04-T03-S02-M02` — Add an ESLint rule banning `new`, array/object literals, `console` and `await...
- [x] `P04-T04-S01-M01` — Define the `DspPort` interface and the `AudioParamAutomation` schema (target ...
- [x] `P04-T04-S01-M02` — Implement the mock DSP driver and bypass module for headless signal-flow tests.
- [x] `P04-T04-S02-M01` — Implement the three-band EQ as cascaded IIR biquads (Direct Form II transpose...
- [x] `P04-T04-S02-M02` — Implement the multi-band compressor (band-split biquads, per-band detector an...
- [x] `P04-T04-S02-M03` — Implement the look-ahead peak limiter with 4x oversampling and report its alg...
- [x] `P04-T04-S02-M04` — Apply input gain normalization from `loudness_ebu128` as the first stage of t...
- [x] `P04-T04-S02-M05` — Implement the export encoding stage (MP3, WAV, FLAC) outside the real-time ca...
- [x] `P04-T04-S03-M01` — Measure DSP port algorithmic latency: sum `getLatencySamples()` from all DSP ...
- [x] `P04-T04-S03-M02` — Implement the degraded-mode path: standard crossfade without micro-chopping (...

### P05 — 5/22 done
- [x] `P05-T01-S01-M01` — Implement `normalizeInput(AudioBuffer)` resampling to 44.1 kHz and down-mixin...
- [x] `P05-T01-S02-M01` — Bind adapter input/output to JSON Schema Draft 7 and enforce SemVer compatibi...
- [x] `P05-T01-S03-M01` — Wrap every extraction in `try/finally` that calls `releaseResult`.
- [x] `P05-T01-S03-M02` — Add a `performance.memory` before/after check and a leak regression test over...
- [x] `P05-T01-S03-M03` — On worker crash or a module timeout above 5000 ms, route the buffer through W...
- [ ] `P05-T02-S01-M01` — Derive `BPM_seed` by K-means clustering of the local tempo histogram and vali...
- [B] `P05-T02-S01-M02` — Determine static versus dynamic BPM from `bpm_histogram`.
- [ ] `P05-T02-S02-M01` — Compute `E=0.4·Rhythm+0.3·Dynamics+0.2·Loudness+0.1·Spectral` with each compo...
- [ ] `P05-T02-S02-M02` — Return E=0 and a rating of 0 for totally silent structural blocks.
- [B] `P05-T02-S02-M03` — Apply a proportional penalty to the Dynamics component for near-zero dynamic ...
- [ ] `P05-T02-S02-M04` — Map E to a 1–5 star rating by dataset percentile with E above the 80th percen...
- [ ] `P05-T02-S02-M05` — Compute `M=0.4·E_kick+0.3·C_bass+0.2·S_tempo+0.1·V_tune`, flag M<0.4 as unmix...
- [B] `P05-T02-S02-M06` — Normalize `E_kick`, `C_bass`, `S_tempo` and `V_tune` to [0,1] from their sign...
- [ ] `P05-T02-S03-M01` — Interpolate missing features with the global dataset median for the dominant ...
- [ ] `P05-T02-S03-M02` — Purge cached registries and enqueue re-analysis on a major version increment ...
- [ ] `P05-T03-S01-M01` — Binarize vocal probabilities with `V_map[t]=1` only when the probability is s...
- [ ] `P05-T03-S01-M02` — Apply a 1-second median smoothing filter to the binary vocal map.
- [ ] `P05-T03-S01-M03` — Fall back to `V_map=0` when the TensorFlow model fails to load or crashes and...
- [ ] `P05-T03-S01-M04` — Shift a transition to the nearest contiguous 16-beat block where `ΣV_map=0`.
- [ ] `P05-T04-S01-M01` — Implement `extract()` that runs the adapter, computes all registry fields, va...
- [ ] `P05-T04-S01-M02` — Emit `core.wasm.extraction_duration` and raise a critical event when extracti...
- [ ] `P05-T04-S01-M03` — Benchmark extraction at under 1.5x real-time for a 4-minute 320 kbps MP3 on a...

### P06 — 32/32 done
- [x] `P06-RBAC-M01` — Migration: 8 RBAC tables (permissions, roles, role_permissions, user_roles, u...
- [x] `P06-RBAC-M02` — Permissions catalog seed (>=40 keys) + drift detector. GAP-015.
- [x] `P06-RBAC-M03` — Seed base roles (regular_user, tier_N, dsp_specialist, content_specialist, cu...
- [x] `P06-RBAC-M04` — Grant/revoke service with audit + Slack escalation. GAP-015.
- [x] `P06-RBAC-M05` — Effective permissions evaluator (union of role + user + group grants, deny pr...
- [x] `P06-RBAC-M06` — Redis cache (60s TTL) + PostgreSQL LISTEN/NOTIFY invalidation for effective p...
- [x] `P06-RBAC-M07` — Bootstrap super_admin + regular_user. GAP-015.
- [x] `P06-RBAC-M08` — Group CRUD + time-bound group permissions. GAP-015.
- [x] `P06-RBAC-M09` — Expiry test with frozen clock (T-1ms / T / T+1ms). GAP-015.
- [x] `P06-RBAC-M10` — Drop scopes[] and tier from access token; token carries identity only. GAP-015.
- [x] `P06-RBAC-M11` — Rewrite interceptor to read effective permissions per request. GAP-015.
- [x] `P06-RBAC-M12` — Regenerate Cucumber authorization matrix from the dynamic catalog. GAP-015.
- [x] `P06-T01-S01-M01` — Issue access tokens (15 minutes) carrying `sub`, `tenant_id`, `scopes[]`, `ti...
- [x] `P06-T01-S01-M02` — Issue refresh tokens (7 days) with rotation: each use returns a new token and...
- [x] `P06-T01-S02-M01` — Write revoked `jti`/family ids to a Redis deny-list (TTL to natural expiry) a...
- [x] `P06-T01-S02-M02` — On role revocation, revoke every active session/family for the user globally.
- [x] `P06-T02-S01-M01` — Create the route scope registry declaring explicit required scopes per endpoi...
- [-] `P06-T02-S01-M02` — Implement the OTOMIX issuable-scope allow-list: reject issuance of `ddex:*`, ...
- [-] `P06-T02-S01-M03` — Implement the gateway interceptor enforcing required scopes and returning PER...
- [x] `P06-T02-S02-M01` — Fire a Slack webhook payload on any role escalation or emergency scope grant.
- [-] `P06-T02-S02-M02` — Generate a Cucumber authorization matrix from the registry (role × endpoint) ...
- [-] `P06-T02-S03-M01` — Define and enforce `publisher:manage` and `store:purchase` scopes (or a dedic...
- [-] `P06-T03-S01-M01` — Evaluate time-bound grants in UTC: a grant is active while `Timestamp_current...
- [-] `P06-T03-S01-M02` — On expiry return the user to base-tier capabilities automatically.
- [x] `P06-T04-S01-M01` — Ensure `/ddex`, `/rights`, `/dsr` and stream-license routes are not mounted a...
- [x] `P06-T04-S02-M01` — Create a dedicated per-tenant worker pool with a bulkhead that prevents anoth...
- [x] `P06-T04-S02-M02` — Implement per-tenant data-encryption keys (envelope encryption) for audio sto...
- [x] `P06-T04-S02-M03` — Implement the 90-day key rotation job that re-wraps DEKs and keeps old cipher...
- [x] `P06-T04-S02-M04` — Enforce the `otomix:` Redis prefix, `otomix/` storage prefix and `otomix.*` t...
- [x] `P06-T05-S01-M01` — Emit CSP headers with strict `script-src` and `worker-src` allow-lists plus `...
- [x] `P06-T05-S01-M02` — Create WASM memory with a hard maximum of 512 MB (8 192 pages of 64 KiB) for ...
- [x] `P06-T05-S01-M03` — Verify analysis workers run unprivileged: no DOM, no credentials and no netwo...
- [x] `P06-T06-S01-M01` — Back Kubernetes Secrets with HashiCorp Vault (ExternalSecret references only;...
- [x] `P06-T06-S01-M02` — Run Snyk dependency scanning on every build and block on findings per the CVS...
- [x] `P06-T06-S01-M03` — Harden pods: non-root, read-only root filesystem, dropped capabilities and de...
- [x] `P06-T07-S01-M01` — Implement `PATCH /api/v1/dsp/parameters` validating `chopGrid ∈ {1/8,1/16,1/3...
- [x] `P06-T07-S01-M02` — Write a 7-year-retained admin audit record for every parameter change.
- [x] `P06-T07-S01-M03` — Propagate parameter updates via the outbox as signed messages with a per-tena...

### P07 — 8/16 done
- [x] `P07-T01-S01-M01` — Detect MP3, WAV and FLAC by magic bytes and container parse (ID3/MPEG sync, `...
- [x] `P07-T01-S02-M01` — Reject files over 500 MB or 4 hours of audio with INVALID_ARGUMENT, checking ...
- [x] `P07-T01-S02-M02` — Confine directory access to the granted root, resolving symlinks and rejectin...
- [x] `P07-T01-S03-M01` — Decode to PCM, down-mix to mono and resample to 44.1 kHz via the P05 `normali...
- [x] `P07-T02-S01-M01` — Ensure the gateway and UI main thread never import container decoders (header...
- [x] `P07-T02-S01-M02` — Reject malformed or truncated containers with INVALID_ARGUMENT and never retr...
- [x] `P07-T02-S01-M03` — Treat embedded tags (title, BPM, key) as untrusted display hints that never o...
- [x] `P07-T02-S02-M01` — Add a container-parser fuzz corpus (truncated frames, oversized chunk sizes, ...
- [ ] `P07-T03-S01-M01` — Create migration `003_tracks.sql` for `tracks` per §9.11 with CHECKs, unique ...
- [ ] `P07-T03-S02-M01` — De-duplicate tracks per tenant and owner by SHA-256 of the canonical decoded ...
- [ ] `P07-T03-S02-M02` — Implement `POST /api/v1/ingest/local` requiring `local:process` and a valid `...
- [ ] `P07-T03-S02-M03` — Commit the track row, Feature Registry row and outbox event in one transaction.
- [ ] `P07-T03-S02-M04` — Apply a leaky-bucket rate limit returning HTTP 429 with `Retry-After` on inge...
- [ ] `P07-T04-S01-M01` — Park a job in `otomix.dlq` after one attempt plus the 3-retry maximum, record...
- [ ] `P07-T04-S01-M02` — Replay DLQ messages idempotently by job id via a runbook command.
- [B] `P07-T05-S01-M01` — Record user source declarations (ingest, publish, export) with terms version ...

### P08 — 0/18 done
- [ ] `P08-T01-S01-M01` — Implement `GET /api/v1/catalog/features` requiring `user:read` with cursor pa...
- [ ] `P08-T01-S01-M02` — Create the normalized library slice (`byId`, `allIds`) that keeps unmixable t...
- [ ] `P08-T01-S02-M01` — Create the ordered `queueIndex` slice with add, remove and reorder actions wh...
- [ ] `P08-T01-S02-M02` — Trigger a memoized recomputation of the Absolute Locked Grid timeline on ever...
- [ ] `P08-T02-S01-M01` — Render the Left Column library with BPM, Key, Energy Stars and Mixability, sh...
- [ ] `P08-T02-S01-M02` — Render the Right Column queue with drag-and-drop add/reorder and an explicit ...
- [ ] `P08-T03-S01-M01` — Show the Starter Track warning when the Slot 1 track has harmonic distance 0 ...
- [B] `P08-T04-S01-M01` — Define the Camelot proximity, tempo-delta and energy-progression component sc...
- [ ] `P08-T04-S01-M02` — Combine component scores as `0.40·Mixability + 0.30·Camelot + 0.20·Tempo + 0....
- [B] `P08-T04-S01-M03` — Apply the tie-break: first on Camelot proximity, then strictly limit tempo de...
- [ ] `P08-T04-S02-M01` — Shift a transition window to the nearest instrumental block when it coincides...
- [ ] `P08-T04-S02-M02` — Implement `POST /api/v1/mixplan` requiring `local:process` and invoking `Plan...
- [ ] `P08-T04-S02-M03` — Build the client that creates `TransitionPlanRequest` objects for adjacent qu...
- [ ] `P08-T04-S02-M04` — Build transition nodes dynamically as tracks are added to the queue.
- [ ] `P08-T05-S01-M01` — Render vocal zones (`V_map>0.65`) as striped red SVG overlays on the waveform...
- [ ] `P08-T05-S01-M02` — Render pre-kick offset segments as striped warning overlays.
- [ ] `P08-T06-S01-M01` — Connect a compiled plan to glide automation, the chopping engine and the DSP ...
- [ ] `P08-T06-S01-M02` — Attach the Runtime Observer to the preview and surface starvation/degraded-mo...

### P09 — 0/20 done
- [ ] `P09-T01-S01-M01` — Create migration `004_sets_exports.sql` for `sets` and `export_jobs` per §9.1...
- [ ] `P09-T01-S01-M02` — Implement `POST/GET /api/v1/sets` requiring `local:process`, rejecting unknow...
- [ ] `P09-T01-S01-M03` — Compute exported grid and cue positions from the Attack Grid using `t(i)` at ...
- [ ] `P09-T01-S01-M04` — Implement `POST /api/v1/exports/xml` with `local:process`, tier or grant gati...
- [ ] `P09-T01-S02-M01` — Record the current vendor format field mappings (Rekordbox, Traktor, VirtualD...
- [ ] `P09-T01-S02-M02` — Implement the Rekordbox exporter and a golden-file test.
- [ ] `P09-T01-S02-M03` — Implement the Traktor exporter and a golden-file test.
- [ ] `P09-T01-S02-M04` — Implement the VirtualDJ exporter and a golden-file test.
- [B] `P09-T01-S02-M05` — Implement the Serato exporter.
- [ ] `P09-T02-S01-M01` — Define `PaymentProviderPort` (signature verification, event parsing) with an ...
- [ ] `P09-T02-S01-M02` — Create migration `005_store.sql` for `purchases` and `entitlements` per §9.11...
- [ ] `P09-T02-S02-M01` — Implement `POST /api/v1/store/webhooks/payment` that verifies the signature, ...
- [ ] `P09-T02-S02-M02` — Generate download bundles in MP3, WAV and FLAC idempotently per `(purchase_id...
- [ ] `P09-T02-S02-M03` — Issue signed, expiring, single-purchase-scoped download links.
- [ ] `P09-T02-S02-M04` — Gate lossless (WAV, FLAC) bundles by tier or active grant.
- [B] `P09-T02-S03-M01` — Implement the concrete payment-provider adapter and settlement currency handl...
- [B] `P09-T03-S01-M01` — Implement the publisher panel API for sets, landing pages and asset bundles u...
- [ ] `P09-T03-S01-M02` — Render landing pages from structured content with sanitization and serve them...
- [ ] `P09-T04-S01-M01` — Implement the two-tier approval workflow where requester and approver must be...
- [ ] `P09-T04-S01-M02` — Execute an approved takedown by removing public availability of the listing o...

### P10 — 0/20 done
- [ ] `P10-T01-S01-M01` — Emit `core.dsp.latency`, `core.observer.cycle_duration`, `core.transition.fai...
- [ ] `P10-T01-S01-M02` — Emit the OTOMIX metrics `otomix.ingest.duration`, `otomix.ingest.rejected_fil...
- [ ] `P10-T01-S02-M01` — Define Datadog monitors as code: critical when extraction exceeds 2500 ms, cr...
- [ ] `P10-T01-S02-M02` — Define OTOMIX monitors: DLQ depth sustained non-zero, webhook signature-failu...
- [ ] `P10-T02-S01-M01` — Verify the span chain browser → Node gateway → gRPC → Core Command → WASM wor...
- [ ] `P10-T02-S01-M02` — Configure tail-based sampling: 100% of errors and of spans over alert thresho...
- [ ] `P10-T03-S01-M01` — Configure retention: 90-day hot storage for application logs and 7 years for ...
- [ ] `P10-T03-S01-M02` — Implement event-driven cache invalidation with PostgreSQL `LISTEN/NOTIFY`, a ...
- [ ] `P10-T04-S01-M01` — Provide Blue/Green Deployments and a Service selector switch for the Core and...
- [ ] `P10-T04-S01-M02` — Configure the HPA to target 60% CPU.
- [ ] `P10-T04-S02-M01` — Automate rollback when 5xx exceeds 1% within 5 minutes of a deploy or the aud...
- [ ] `P10-T04-S02-M02` — Wrap LaunchDarkly evaluation so flag state is snapshotted outside the audio t...
- [ ] `P10-T04-S02-M03` — Define the guarded-rollout config: stages 1% (1 h), 10% (24 h), 50% (24 h), 1...
- [ ] `P10-T04-S02-M04` — Create the OTOMIX flag inventory (`otomix.export.<target>-xml-v2`, `core.dsp....
- [ ] `P10-T05-S01-M01` — Configure asynchronous cross-region PostgreSQL replication with an RPO monito...
- [ ] `P10-T05-S01-M02` — Replicate blobs across dual geographic zones with immutable locks preventing ...
- [ ] `P10-T05-S01-M03` — Schedule quarterly chaos experiments (pod termination and network partition o...
- [ ] `P10-T05-S01-M04` — Write the runbooks for regional failover, thread-starvation degraded mode and...
- [ ] `P10-T05-S01-M05` — Run a staging DR drill and record RPO and RTO measurements.
- [ ] `P10-T06-S01-M01` — Add synthetic probes and a 99.9% monthly SLO dashboard with burn-rate alerts.

### P11 — 0/22 done
- [ ] `P11-T01-S01-M01` — Build a seeded generator for 10 000 diverse headless pairings covering extrem...
- [ ] `P11-T01-S02-M01` — Implement the headless runner that executes planner and executor with mock DS...
- [ ] `P11-T01-S02-M02` — Evaluate pass criteria: 0% out-of-bounds errors, 0% cancellations, 100% grid-...
- [ ] `P11-T01-S02-M03` — Schedule the full 10 000-pairing run daily in CI and upload the failing-pair ...
- [ ] `P11-T02-S01-M01` — Run the heap-proof harness for 4-, 8- and 16-bar block resolution on 1-minute...
- [ ] `P11-T02-S01-M02` — Measure CPU overhead of timing computation per active thread and assert below...
- [ ] `P11-T03-S01-M01` — Build the phase-inversion null-test harness at transition intersections to de...
- [ ] `P11-T03-S01-M02` — Verify post-transition realignment keeps pitch displacement within ±0.05 semi...
- [B] `P11-T03-S01-M03` — Verify Runtime Drift Compensation against the ±0.05 semitone bound.
- [ ] `P11-T03-S01-M04` — Gate any optimized (for example SIMD) build against the scalar reference with...
- [ ] `P11-T03-S01-M05` — Make the RT-safety audit a blocking CI job (0 allocations, 0 locks in 10 000 ...
- [ ] `P11-T04-S01-M01` — Run a k6 load of 500 concurrent extraction requests per region with HPA at 60...
- [ ] `P11-T04-S01-M02` — Run a continuous high-concurrency memory soak of the chop engine and Runtime ...
- [ ] `P11-T04-S01-M03` — Run the extraction benchmark on the pinned M5.large runner for a 4-minute 320...
- [ ] `P11-T05-S01-M01` — Implement the BDD cross-tenant suite for the six attacks: forged `tenant_id` ...
- [ ] `P11-T05-S01-M02` — Write the bi-annual penetration-test scope and engagement checklist (RBAC esc...
- [ ] `P11-T05-S01-M03` — Run a nightly IAM fuzz of role escalation and scope enforcement.
- [ ] `P11-T05-S01-M04` — Drill the CVSS gate end to end: a build with a 7.0 finding must stop the depl...
- [ ] `P11-T06-S01-M01` — Enforce 90% branch coverage for the Core Engine and 100% for Rights/Access mo...
- [ ] `P11-T07-S01-M01` — Build the acceptance runner that maps every OTOMIX §10.9 row to executable te...
- [ ] `P11-T07-S01-M02` — Generate the evidence bundle for the four §10.7 criteria with artifact links ...
- [ ] `P11-T07-S01-M03` — Produce the sign-off report listing every BLOCKED task with its owner decisio...

## Notes on this tracker

- **Ready** = all prerequisites in 	asks.json are DONE (or SUPERSEDED/CANCELLED).
- **Pending** = at least one prerequisite is still TODO.
- **Blocked** = status is BLOCKED:OQ-nn; see Open Questions in the supplement.
- **Files / exports** for DONE tasks come from the commit whose message contains the task ID. If no such commit exists, they are marked *not found*.
- **Influential identifiers** are uppercase tokens (e.g. MAX_RETRIES, DRIFT_THRESHOLD_MS) found in the task description.
- **GAP references** are extracted from the task description.
- To advance a task: edit its status in OTOMIX_MicroTask_Plan.tasks.json, then re-run the generator (this file). The tracker rebuilds.
- See also the **Phase** sections in the main book for phase-level narratives.
