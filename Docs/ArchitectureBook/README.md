# OTOMIX Architecture Book

A living HTML encyclopedia of the OTOMIX architecture. Generated from source — always current.

## What This Book Is

This is a **single-page application** (no server required) that documents every phase, micro-task, module, constant, and dependency of the OTOMIX beat-based automatic DJ mixing engine. It serves two audiences:

- **Non-experts** (product, design, new hires): Read the narrative chapters (CH0, CH1, P01–P11) for the "why" and mental models.
- **Experts** (engineers, auditors): Drill into any task to see exact description, test file, spec reference, review checkpoint, and resolved `file:line` links to source symbols.

## How to Open

**No build step required for viewing.** Just double-click `index.html` in your browser, or:

```bash
# From repo root
start Docs/ArchitectureBook/index.html
```

Or serve locally (optional):
```bash
cd Docs/ArchitectureBook
npx serve .
```

## How to Rebuild After Changes

After any micro-task commit (or when you modify narratives, add constants, etc.):

```bash
# From repo root (PowerShell 7+)
pwsh -File Docs/ArchitectureBook/build-book.ps1
```

This regenerates `content.js` from:
- `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md` (task details)
- `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json` (authoritative status)
- `packages/core/src/**/*.ts` and `packages/contracts/src/**/*.ts` (exports, constants)
- `packages/core/test/**/*.spec.ts` and `packages/contracts/test/**/*.spec.ts` (test map)
- `Docs/ArchitectureBook/narratives/**/*.md` (narrative chapters)

The script is **idempotent** — safe to run repeatedly.

## How to Add a Narrative

1. Create a Markdown file under `narratives/`:
   - Phase chapter: `narratives/P01/README.md`, `narratives/P02/README.md`, etc.
   - Task detail (optional): `narratives/P01/P01-T01-S01-M01.md`
2. Rebuild: `pwsh -File build-book.ps1`

The narrative will appear in the corresponding phase view.

## How to Add a Language (i18n)

1. Create `i18n/xx.json` with the same keys as English content (structure only for MVP):
   ```json
   { "Phase 1 — Foundation": "Fase 1 — Fundación" }
   ```
2. Rebuild: `pwsh -File build-book.ps1`
3. The language will appear in `available_languages` and the `LANG` selector (future UI).

## Source of Truth

| Source | Purpose |
|--------|---------|
| `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md` | Human-readable task breakdown with field tables |
| `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json` | Machine-readable task status (authoritative) |
| `packages/core/src/**/*.ts` | Core engine source — exports, constants, types |
| `packages/contracts/src/**/*.ts` | Contracts — schemas, validation, semver gate |
| `packages/core/test/**/*.spec.ts` | Core test specifications |
| `packages/contracts/test/**/*.spec.ts` | Contracts test specifications |
| `Docs/.Agents/AI Agent.MD` | Rules, OQ decisions, block list |

## Auto-Update Workflow

Per Rule 10 of `AI Agent.MD`: after every micro-task commit, the orchestrator runs `build-book.ps1` automatically. The book is always current with the latest commit.

## Features

- **Collapsible TOC** with progress badges per phase
- **Full-text search** (press `/`) across tasks, constants, narratives, source symbols
- **Hash-based routing**: `#/P01`, `#/P01/P01-T01-S01-M01`, `#/constants`, `#/glossary`
- **Dark/Light theme** with persistence
- **Mermaid.js diagrams** for architecture graphs
- **vscode:// links** — click any `file:line` to open in VS Code
- **Responsive** — mobile-friendly with slide-out sidebar
- **Print stylesheet** — clean PDF export
- **Accessible** — ARIA labels, keyboard navigation, semantic HTML

## Validation Checklist

After rebuild, verify:

1. `index.html` opens with zero JS errors
2. `content.js` exists with all 11 phases
3. TOC shows correct counts (P01 23/23, P02 17/18+1 blocked, P03 21/24+3 blocked, P04 1/29+4 blocked, etc.)
4. Clicking P03 shows narrative + full task table
5. Clicking `P03-T06-S01-M01` shows task detail with file:line links
6. Search "anchor" returns results across multiple phases
7. Search "TRANSITION_WINDOW_BEATS" returns constant at `packages/core/src/constants/grid.ts:99`
8. Mermaid diagrams on CH1 and P03 render
9. Theme toggle persists across reloads
10. `build-book.ps1` exits 0 with summary block

## License

MIT — same as OTOMIX core.