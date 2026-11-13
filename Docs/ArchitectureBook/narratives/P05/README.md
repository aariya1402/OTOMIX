# Phase 5 — Feature Extraction & Analysis Pipeline (P05 Addendum)

## What P05 Delivers

P05 transforms decoded audio into a feature registry row. The P05 Addendum (2026-11-12) upgrades the phase with Castle & Moat isolation, Enrichment Pipeline, and Rule 25 / Rule 26 invariants.

## Castle & Moat Architecture (D14)

The core package never imports or executes analysis workers directly. All communication passes through the Engine API Contract boundary.

## Enrichment Pipeline (Hash -> Cache -> Worker -> DB)

1. Global Cache lookup by content_sha256
2. Cache MISS -> resolve worker from WorkerRegistry
3. Run worker via Engine API boundary
4. Persist to Global Cache first, then Tenant Store

## Rule 25 — Mixability-First (CORE MISSION)

The primary mission of OTOMIX is SET BUILDING. Low-mixability tracks MUST NOT enter the set. No repair. The only hard gate is Camelot compatibility.

## Rule 26 — Beat-Index Absolute (RED LINE)

The only unit of musical time is the BEAT. No 'seconds' inside the musical domain. Beat-to-seconds conversion happens only via tOfI and quantumSeconds.

An architecture fitness function runs on every vitest run and fails loudly if the codebase drifts from Rule 25 or Rule 26.


## Energy Stars Mapping (P05-T02-S02-M04)

The raw energy scalar E is mapped to a 1-5 star rating. The 80th percentile (E >= 0.8) is hardcoded as 5 stars per the Spec. All other bands come from AnalysisConfig (e.g., >= 0.6 = 4 stars, >= 0.4 = 3 stars, etc.). Stars are used for UI ranking, not gating.

