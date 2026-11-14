# Phase 9 - XML Export & Set Shop

**Status:** 0/20 complete, 3 blocked.

Phase 9 is not yet started. It persists compiled sets, generates tier-gated DJ-software XML metadata for Rekordbox, Traktor, VirtualDJ and Serato from the Attack Grid, implements the Set Shop purchase handler (provider-neutral port, signed webhooks, transactional entitlements, idempotent bundle generation, signed expiring downloads, lossless gating), publisher landing pages with safe rendering, and the two-tier takedown workflow. Four tasks are blocked on owner decisions (OQ-10, OQ-12, OQ-13).

## What remains

- **P09-T01-S01-M01** (TODO) - Create migration 004_sets_exports.sql for sets and export_jobs per §9.11 with CHECKs, the unique (tenant_id,set_id,target,schema_version) constraint and RLS.
- **P09-T01-S01-M02** (TODO) - Implement POST/GET /api/v1/sets requiring local:process, rejecting unknown or unmixable track ids.
- **P09-T01-S01-M03** (TODO) - Compute exported grid and cue positions from the Attack Grid using t(i) at 16-beat and 16-bar boundaries.
- **P09-T01-S01-M04** (TODO) - Implement POST /api/v1/exports/xml with local:process, tier or grant gating, idempotent job creation and an asynchronous job.
- **P09-T01-S02-M01** (TODO) - Record the current vendor format field mappings (Rekordbox, Traktor, VirtualDJ, Serato) with source URLs and verification dates.
- **P09-T01-S02-M02** (TODO) - Implement the Rekordbox exporter and a golden-file test.
- **P09-T01-S02-M03** (TODO) - Implement the Traktor exporter and a golden-file test.
- **P09-T01-S02-M04** (TODO) - Implement the VirtualDJ exporter and a golden-file test.
- **P09-T02-S01-M01** (TODO) - Define PaymentProviderPort (signature verification, event parsing) with an HMAC reference implementation and a fake provider for tests.
- **P09-T02-S01-M02** (TODO) - Create migration 005_store.sql for purchases and entitlements per §9.11 with unique (tenant_id,provider_event_id) and RLS.
- **P09-T02-S02-M01** (TODO) - Implement POST /api/v1/store/webhooks/payment that verifies the signature, deduplicates by provider_event_id and writes purchase, entitlement and outbox rows in one transaction.
- **P09-T02-S02-M02** (TODO) - Generate download bundles in MP3, WAV and FLAC idempotently per (purchase_id, format) from the DSP port encoder.
- **P09-T02-S02-M03** (TODO) - Issue signed, expiring, single-purchase-scoped download links.
- **P09-T02-S02-M04** (TODO) - Gate lossless (WAV, FLAC) bundles by tier or active grant.
- **P09-T03-S01-M02** (TODO) - Render landing pages from structured content with sanitization and serve them under the strict CSP.
- **P09-T04-S01-M01** (TODO) - Implement the two-tier approval workflow where requester and approver must be different principals.
- **P09-T04-S01-M02** (TODO) - Execute an approved takedown by removing public availability of the listing or landing page, idempotently, with an audit record.
- **P09-T01-S02-M05** (BLOCKED: BLOCKED:OQ-12) - Implement the Serato exporter.
- **P09-T02-S03-M01** (BLOCKED: BLOCKED:OQ-13) - Implement the concrete payment-provider adapter and settlement currency handling.
- **P09-T03-S01-M01** (BLOCKED: BLOCKED:OQ-10) - Implement the publisher panel API for sets, landing pages and asset bundles under a publisher namespace.

