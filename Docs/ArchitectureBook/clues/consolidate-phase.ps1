param(
    [Parameter(Mandatory=$true)][string]$Phase,
    [switch]$Archive
)
$ErrorActionPreference = "Stop"
$cluesDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $cluesDir "..\..\..")).Path
Set-Location $repoRoot

$clueFile = Join-Path $cluesDir "$Phase.md"
if (-not (Test-Path $clueFile)) {
    Write-Host "FAIL: $clueFile not found"; exit 1
}
$content = Get-Content $clueFile -Raw -Encoding UTF8
$count = ([regex]::Matches($content, '(?m)^##\s+P\d\d-')).Count
if ($count -eq 0) { Write-Host "FAIL: no clues in $Phase.md"; exit 1 }

if (-not $Archive) {
    Write-Host "=== CLINE PROMPT for $Phase narrative consolidation ==="
    Write-Host ""
    Write-Host "/system skill activate otomix-agent code-reviewer-auditor system-architecture token-optimization-specialist frontend-design"
    Write-Host ""
    Write-Host "### TASK"
    Write-Host "Consolidate $count clues from Docs/ArchitectureBook/clues/$Phase.md into Docs/ArchitectureBook/narratives/$Phase/README.md."
    Write-Host ""
    Write-Host "### STEPS"
    Write-Host "1. Read clues/$Phase.md in full."
    Write-Host "2. For each clue, read the source files it references to verify context."
    Write-Host "3. Rewrite narratives/$Phase/README.md (~500 words, English, markdown) covering:"
    Write-Host "   - Why $Phase exists and what it delivers"
    Write-Host "   - Major capabilities (weave each clue's What + Why into a coherent story)"
    Write-Host "   - Key files with file:line refs"
    Write-Host "   - Constants used (from constants/grid.ts, timing.ts, scoring.ts)"
    Write-Host "   - Blocked tasks with OQ IDs"
    Write-Host "   - Test coverage summary"
    Write-Host "4. HALT after writing the narrative. Do NOT modify any other file."
    Write-Host ""
    Write-Host "### AFTER CLINE COMPLETES"
    Write-Host "Run:  pwsh -File Docs/ArchitectureBook/clues/consolidate-phase.ps1 -Phase $Phase -Archive"
    exit 0
}

# Archive mode
$archiveFile = Join-Path $archiveDir "$($Phase)_$(Get-Date -Format 'yyyyMMdd_HHmmss').md"
Move-Item $clueFile $archiveFile
$reset = "# $Phase Clues`r`n`r`n<!-- Archived after consolidation. New clues will be appended below. -->`r`n`r`n"
[System.IO.File]::WriteAllText($clueFile, $reset, (New-Object System.Text.UTF8Encoding $false))

# Rebuild book
$bookBuild = Join-Path $cluesDir "..\build-book.ps1"
if (Test-Path $bookBuild) { & pwsh -NoProfile -File $bookBuild | Out-Null }

Write-Host "OK: archived to $archiveFile"
Write-Host "OK: clues/$Phase.md reset"
Write-Host "OK: book rebuilt"
Write-Host ""
Write-Host "Next: git add clues/archive/ clues/$Phase.md content.js; git commit -m 'docs($Phase): consolidate phase narrative'"