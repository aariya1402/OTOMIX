# Phase 9 — XML Export & Set Shop

## What P09 Delivers

P09 turns a completed `MixPlan` into **portable, playable artifacts** and a marketplace listing.

| Exporter | Format | Target |
|----------|--------|--------|
| **Serato** | `.crate` + XML | Serato DJ Pro / Lite |
| **Traktor** | `.nml` (XML) | Native Instruments Traktor |
| **Rekordbox** | `.xml` + `.pdb` | Pioneer Rekordbox |
| **Universal** | `.json` (OTOMIX native) | Re-import, archival |

**Encryption**: AES-256-GCM per-download, key derived from purchase token (P09-T03).
**Archives**: `.zip` with manifest (SHA-256 of each stem), signed by OTOMIX ED25519 key.
**Marketplace**: Listing metadata (title, description, genre, BPM range, key, duration, preview clip), price tier, revenue split.

**Input**: `MixPlan` + rendered stems (from P04 export chain) + user metadata.
**Output**: Signed download URL + purchase record (to P06/P10 audit).

**Blocked Tasks (2)**:
- OQ-12: Rekordbox `.pdb` binary format reverse-engineering completeness.
- OQ-13: Marketplace revenue split smart contract vs. off-chain ledger.

**Total P09 tasks: All TODO, 2 blocked.**