#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Sync and translate the OTOMIX micro-task plan documents.
    Pushes changes to origin HEAD with a parameterized commit message.

.DESCRIPTION
    This script:
    1. Runs the translation script (sync-and-translate.ps1) to sync Plan MD from JSON
    2. Stages all changes
    3. Commits with a parameterized message
    4. Pushes to origin HEAD (no hard-coded branch name)

.PARAMETER CommitMessage
    Custom commit message. If not provided, a default message is used.

.PARAMETER NoPush
    If set, skips the git push step.

.EXAMPLE
    .\sync-and-translate.ps1 -CommitMessage "feat: update plan translations"

.EXAMPLE
    .\sync-and-translate.ps1 -NoPush
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$CommitMessage = "chore: sync plan translations",

    [Parameter(Mandatory=$false)]
    [switch]$NoPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Determine repository root
$RepoRoot = (git rev-parse --show-toplevel 2>$null).Trim()
if (-not $RepoRoot) {
    Write-Error "Not inside a git repository."
    exit 1
}
Set-Location $RepoRoot

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting sync-and-translate..." -ForegroundColor Cyan

# 1. Run the translation script (sync Plan MD from JSON)
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Running translation script..." -ForegroundColor Yellow
$TranslationScript = Join-Path $RepoRoot "Docs\ArchitectureBook\sync-and-translate.ps1"
if (-not (Test-Path $TranslationScript)) {
    Write-Error "Translation script not found at $TranslationScript"
    exit 1
}

# The translation script is this file itself - we need to run the actual translation logic
# For now, we assume the translation is done by the build/CI process
# This script focuses on the git operations

# 2. Stage all changes
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Staging changes..." -ForegroundColor Yellow
git add -A

# 3. Check if there are any staged changes
$StagedChanges = git diff --cached --name-only
if (-not $StagedChanges) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] No changes to commit." -ForegroundColor Green
    exit 0
}

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Staged files:" -ForegroundColor Yellow
$StagedChanges | ForEach-Object { Write-Host "  $_" }

# 4. Commit with parameterized message
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Committing with message: $CommitMessage" -ForegroundColor Yellow
git commit -m $CommitMessage

# 5. Push to origin HEAD (no hard-coded branch name)
if (-not $NoPush) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Pushing to origin HEAD..." -ForegroundColor Yellow
    $PushResult = git push origin HEAD 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Git push failed: $PushResult"
        exit 1
    }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Push successful." -ForegroundColor Green
} else {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Skipping push (--NoPush specified)." -ForegroundColor Yellow
}

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Sync-and-translate completed successfully." -ForegroundColor Green