# OTOMIX Architecture Book

A live status book for the OTOMIX task plan. Every number comes from physical evidence on disk
(plan files, source files, git history, recorded Vitest and tsc runs). Nothing is estimated.

## Open it (Go Live)

1. In a PowerShell terminal at the repository root, start the watcher and leave it running:

   ```powershell
   node .\Docs\ArchitectureBook\scan.cjs --watch
   ```

   It rewrites `book-data.js` whenever a plan, source, test, clue or evidence file changes.
2. In VS Code, right-click `Docs/ArchitectureBook/index.html` and choose **Open with Live Server**
   (the Go Live button). Live Server reloads the page when `book-data.js` changes.
3. First time only, record a baseline of test and compiler results (takes a few minutes):

   ```powershell
   node .\Docs\ArchitectureBook\task-check.cjs all
   ```

## Views

| Route | Content |
|---|---|
| `#/` | Dashboard: overall percent, one card per phase (stacked colour bar, task chips) |
| `#/phase/P01` | Phase tasks, filters, compiler/test findings and plan gaps (Supplement) |
| `#/task/<ID>` | Files with path:line, symbols, tests, tsc, dependencies, commits, issues |
| `#/defects` | Every defect, grouped by phase, with Report and Verify buttons |

Colours: green = verified 100 percent, yellow = in progress or unproven, red = failing or disproved,
grey = not started, blue = blocked, striped = cancelled or superseded (excluded from totals).

## The fix loop

1. Click **Report** on a task. The page copies a PowerShell command; paste it into a terminal.
   The command runs the task's Vitest files and the `tsc` projects of the packages it touches,
   cross-checks the plan against the disk and copies a plain-text report to the clipboard.
2. Give the report to an external AI, apply the fixes it proposes.
3. Click **Verify** and run the copied command. It re-runs the checks. When the task has no open issues it prints
   `RESOLVED` and the task leaves the defect list; otherwise it prints `STILL OPEN` and copies a fresh report.
4. Repeat until the task is green.

## Where the data comes from

| Evidence | Source |
|---|---|
| Task list, status, prerequisites, registry test locator | `Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json` |
| Expected outcome, review checkpoint, definition line | `OTOMIX_MicroTask_Plan.md`, `OTOMIX_MicroTask_Plan_Addendum.md` (Addendum tasks are added when not in the registry) |
| Gaps, conflicts, deferred items | `OTOMIX_MicroTask_Plan_Supplement.md` (`GAP`, `CONFLICT`, `DEFERRED`); referenced paths are checked against the disk |
| Files linked to a task | Paths declared in the plan; files changed by commits whose subject names the task (`git log`); `clues/*.md`; source files citing the task ID (only files citing at most 3 tasks) |
| Symbols | Identifiers in backticks and `NAME=` constants in the plan text, looked up as declarations in the source |
| Test and tsc results | `evidence.json`, written by `task-check.cjs` |
| Dependencies | Relative and `@otomix/*` imports of the linked files, plan prerequisites and their reverse |

`OTOMIX_Audit_Report.md` is not used: it is a stale snapshot whose failures are mostly encoding noise in a translated field.

## Completion percent

Each applicable check contributes its weight times its result; the percent is normalised over applicable checks.

| Check | Weight |
|---|---|
| Declared files exist (or linked implementation files when none are declared) | 25 |
| Symbols named in the plan are declared in the source | 25 |
| Declared test file exists | 15 |
| Test files have a fresh passing Vitest run | 20 |
| `tsc --noEmit` is clean for the task's files (fresh run) | 15 |

A run is fresh only if it is newer than every related file (the test, its relative imports, the task's source files, and for tsc
any file in the package). Editing a file therefore lowers the percent until the check is run again.
Registry `DONE` alone never gives a percent. A task is green only at 100 percent with no open issue.

Test failures caused by a missing Docker or container runtime are classified as `env` (not verifiable here), not as code failures.

## False symbols

If a flagged symbol is a plan-text token and not code, list it in `overrides.json`:

```json
{ "P01-T02-S01-M02": { "ignoreSymbols": ["EXAMPLE_NAME"], "note": "reason" } }
```

`ignoreFiles` works the same way for a declared path that is wrong in the plan.

## Commands

| Command | Purpose |
|---|---|
| `node .\Docs\ArchitectureBook\scan.cjs` | Rebuild `book-data.js` once |
| `node .\Docs\ArchitectureBook\scan.cjs --watch` | Rebuild on every change |
| `node .\Docs\ArchitectureBook\task-check.cjs report <ID>` | Run checks, copy report to clipboard |
| `node .\Docs\ArchitectureBook\task-check.cjs verify <ID>` | Re-run checks, report whether the task is resolved |
| `node .\Docs\ArchitectureBook\task-check.cjs all` | Run the whole suite and every tsc project once |

## Files

`index.html`, `app.js`, `style.css` (viewer) | `scan.cjs` (data builder and watcher) | `task-check.cjs` (checks and reports) |
`book-data.js` and `evidence.json` (generated) | `overrides.json` (manual exceptions) | `clues/` (per-task commit records).
