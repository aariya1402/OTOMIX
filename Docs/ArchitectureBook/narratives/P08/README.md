# Phase 8 — MixPlan, UI & Redux Architecture

## What P08 Delivers

P08 is the **user-facing product**: a React 19 + Redux Toolkit application where users build, preview, and export DJ sets.

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19, TypeScript, Vite | Waveform canvas, timeline, track library, transition preview. |
| **State** | Redux Toolkit + RTK Query | Normalized cache: tracks, features, mix plans, user prefs. Optimistic updates. |
| **Recommendation** | Content-based (MAEST cosine) + Collaborative (implicit MF) | "Next track" suggestions with harmonic compatibility (Camelot wheel), energy flow, groove match. |
| **MixPlan** | DSL → JSON | Ordered track list + transition overrides (rung, crossfade duration, EQ snapshots). |
| **Preview** | Web Audio API → P04 DSP Port | Real-time preview of any transition in the plan. |

**Input**: Catalog (from P05/P07) + User intent (drag-drop, "smart mix" button).
**Output**: `MixPlan` (JSON) + Preview audio requests → P04.

**Blocked Tasks (2)**:
- OQ-09: Recommendation cold-start — new user with no history.
- OQ-24: MixPlan DSL versioning — forward/backward compatibility.

**Total P08 tasks: All TODO, 2 blocked.**