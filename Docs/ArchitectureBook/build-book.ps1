<#>
.SYNOPSIS
    OTOMIX Architecture Book Builder
.DESCRIPTION
    Generates content.js from source of truth: plan MD/JSON, source files, narratives.
    Idempotent, fails loudly on missing inputs.
.NOTES
    Run from Docs/ArchitectureBook/ or repo root.
    Requires Windows PowerShell 5.1+ or PowerShell 7+.
#>

[CmdletBinding()]
param()

# ---- Strict mode ----
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---- Helpers ----
function Write-Log { param([string]$Msg) Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Msg" }
function Write-Err { param([string]$Msg) Write-Error $Msg; exit 1 }
function Fail { param([string]$Msg) Write-Err "FATAL: $Msg" }
function Get-OrEmpty($hashtable, $key) { if ($hashtable.ContainsKey($key)) { return $hashtable[$key] } else { return '' } }

# ---- Locate repo root (walk up for pnpm-workspace.yaml) ----
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = $scriptDir
while ($repoRoot -and -not (Test-Path (Join-Path $repoRoot 'pnpm-workspace.yaml'))) {
    $parent = Split-Path -Parent $repoRoot
    if ($parent -eq $repoRoot) { Fail "Could not find repo root (pnpm-workspace.yaml not found)" }
    $repoRoot = $parent
}
Write-Log "Repo root: $repoRoot"

# ---- Input paths ----
$planMd      = Join-Path $repoRoot 'Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md'
$planJson    = Join-Path $repoRoot 'Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json'
$narrativesDir = Join-Path $scriptDir 'narratives'
$coreSrc     = Join-Path $repoRoot 'packages/core/src'
$contractsSrc = Join-Path $repoRoot 'packages/contracts/src'
$coreTest    = Join-Path $repoRoot 'packages/core/test'
$contractsTest = Join-Path $repoRoot 'packages/contracts/test'
$outputJs    = Join-Path $scriptDir 'content.js'

# ---- Validate inputs ----
foreach ($p in @($planMd, $planJson)) {
    if (-not (Test-Path $p)) { Fail "Missing required file: $p" }
}
if (-not (Test-Path $narrativesDir)) { Fail "Missing narratives directory: $narrativesDir" }

# Required narrative files
$requiredNarratives = @(
    'ch0-intro.md', 'ch1-system-map.md',
    'P01/README.md', 'P02/README.md', 'P03/README.md', 'P04/README.md',
    'P05/README.md', 'P06/README.md', 'P07/README.md', 'P08/README.md',
    'P09/README.md', 'P10/README.md', 'P11/README.md'
)
foreach ($n in $requiredNarratives) {
    $fp = Join-Path $narrativesDir $n
    if (-not (Test-Path $fp)) { Fail "Missing narrative: $fp" }
    if ((Get-Item $fp).Length -eq 0) { Fail "Narrative file is empty: $fp" }
}

# ---- Git info ----
$gitSha = 'unknown'
try { $gitSha = (git -C $repoRoot rev-parse --short HEAD 2>$null).Trim() } catch {}
$currentBranch = 'P04'

# ---- Parse plan JSON (authoritative for status) ----
Write-Log "Parsing plan JSON..."
$planJsonContent = Get-Content $planJson -Raw -Encoding UTF8
$tasksJson = $planJsonContent | ConvertFrom-Json
$taskStatusMap = @{}
$tasksJson | ForEach-Object { $taskStatusMap[$_.id] = $_.status }

# ---- Parse plan MD for task details ----
Write-Log "Parsing plan MD..."
$mdContent = Get-Content $planMd -Raw -Encoding UTF8

# ---- P06-RBAC supplement injection (GAP-015) ----
$suppInjPath = Join-Path $repoRoot 'Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan_Supplement.md'
if (Test-Path $suppInjPath) {
    $suppInj = Get-Content $suppInjPath -Raw -Encoding UTF8
    $rbacRows = [regex]::Matches($suppInj, '\|\s*`(RBAC-M\d+)`\s*(✅ DONE)[^|]*\|\s*([^|]+?)\s*\|')
    if ($rbacRows.Count -gt 0) {
        $suppBlock = "`r`n#### P06-RBAC — Supplement Tasks (GAP-015)`r`n`r`n"
        foreach ($row in $rbacRows) {
            $rid = $row.Groups[1].Value
            $rdesc = $row.Groups[3].Value.Trim()
            $suppBlock += "###### P06-$rid — [x]`r`n`r`n| Field | Value |`r`n|---|---|`r`n| ID | ``P06-$rid`` |`r`n| Description | Supplement: $rdesc |`r`n| Source | ``OTOMIX_MicroTask_Plan_Supplement.md`` §GAP-015 |`r`n`r`n"
        }
        $anchorPos = $mdContent.IndexOf('#### P06 Phase Integration Test Suite')
        if ($anchorPos -gt 0) {
            $mdContent = $mdContent.Substring(0, $anchorPos) + $suppBlock + $mdContent.Substring($anchorPos)
        } else {
            $mdContent += $suppBlock
        }
        Write-Host "Injected $($rbacRows.Count) P06-RBAC-M* tasks from supplement"
    }
}
# ---- End P06-RBAC supplement injection ----

# Em-dash character (U+2014)
$emdash = [char]0x2014

# Split by task headings: ###### Pnn-Tnn-Snn-Mnn — STATUS
$headingRegex = "^######\s+(P\d\d-[A-Z0-9-]+)\s+$emdash\s+(.+)$"
$taskBlocks = [System.Text.RegularExpressions.Regex]::Split($mdContent, $headingRegex, [System.Text.RegularExpressions.RegexOptions]::Multiline)

$tasks = @()
for ($i = 1; $i -lt $taskBlocks.Count; $i += 3) {
    $taskId = $taskBlocks[$i].Trim()
    $statusMd = $taskBlocks[$i+1].Trim()
    $body = $taskBlocks[$i+2]

    # Parse field table
    $fieldRegex = '^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$'
    $fields = @{}
    $body -split "`n" | ForEach-Object {
        if ($_ -match $fieldRegex) {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            if ($key -ne 'Field' -and $key -notmatch '^[-: ]+$') {
                $fields[$key] = $val
            }
        }
    }

    # Status from JSON wins
    $status = if ($taskStatusMap.ContainsKey($taskId)) { $taskStatusMap[$taskId] } else { 'TODO' }

    $tasks += [pscustomobject]@{
        id                  = $taskId
        status              = $status
        status_md           = $statusMd
        description         = (Get-OrEmpty $fields 'Description')
        expected_outcome    = (Get-OrEmpty $fields 'Expected Outcome')
        prerequisites       = ((Get-OrEmpty $fields 'Prerequisites').Split(',', [StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim() })
        test                = (Get-OrEmpty $fields 'Independent Test(s)')
        spec_reference      = (Get-OrEmpty $fields 'Spec Reference')
        review_checkpoint   = (Get-OrEmpty $fields 'Review Checkpoint')
        notes               = (Get-OrEmpty $fields 'Notes')
        md_line             = 0
    }
}
Write-Log "Parsed $($tasks.Count) tasks from MD"

# ---- Extract constants from constants/*.ts ----
Write-Log "Extracting constants..."
$constants = @{ grid = @(); timing = @(); scoring = @() }
$constFiles = @{
    'grid'    = Join-Path $coreSrc 'constants/grid.ts'
    'timing'  = Join-Path $coreSrc 'constants/timing.ts'
    'scoring' = Join-Path $coreSrc 'constants/scoring.ts'
}
foreach ($cat in $constFiles.Keys) {
    $file = $constFiles[$cat]
    if (-not (Test-Path $file)) { Fail "Missing constants file: $file" }
    $lines = Get-Content $file -Encoding UTF8
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match '^\s*export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[^=]+)?=\s*(.+?);?\s*$') {
            $name = $matches[1]
            $val = $matches[2].Trim()
            if ($val.Length -gt 120) { $val = $val.Substring(0,117) + '...' }
            $constants[$cat] += [pscustomobject]@{
                name   = $name
                value  = $val
                file   = "packages/core/src/constants/$($cat).ts"
                line   = $i + 1
                category = $cat
            }
        }
    }
}
Write-Log "Constants: grid=$($constants.grid.Count) timing=$($constants.timing.Count) scoring=$($constants.scoring.Count)"

# ---- Scan source exports (file, line, symbol) ----
Write-Log "Scanning source exports..."
$exports = @()
$srcFiles = Get-ChildItem -Recurse -File -Path $coreSrc, $contractsSrc -Include '*.ts' | Where-Object { $_.Name -notmatch '\.spec\.ts$' }
foreach ($f in $srcFiles) {
    $rel = $f.FullName.Substring($repoRoot.Length + 1).Replace('\', '/')
    $lines = Get-Content $f.FullName -Encoding UTF8
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match '^\s*export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_][A-Za-z0-9_]*)') {
            $exports += [pscustomobject]@{
                file   = $rel
                line   = $i + 1
                symbol = $matches[1]
            }
        }
    }
}
Write-Log "Found $($exports.Count) exported symbols"

# ---- Map test files ----
Write-Log "Mapping test files..."
$testMap = @{}
$testFiles = Get-ChildItem -Recurse -File -Path $coreTest, $contractsTest -Include '*.spec.ts'
foreach ($f in $testFiles) {
    $rel = $f.FullName.Substring($repoRoot.Length + 1).Replace('\', '/')
    $content = Get-Content $f.FullName -Raw -Encoding UTF8
    $itCount = ([regex]::Matches($content, '\bit\s*\(')).Count
    $taskGuess = $null
    $fname = $f.BaseName
    if ($fname -match '(P\d\d-[A-Z0-9-]+)') { $taskGuess = $matches[1] }
    $testMap[$rel] = [pscustomobject]@{
        file       = $rel
        it_count   = $itCount
        task_guess = $taskGuess
    }
}
Write-Log "Mapped $($testMap.Count) test files"

# ---- Load narratives ----
Write-Log "Loading narratives..."
$narratives = @{}
$narrativeFiles = Get-ChildItem -Recurse -File -Path $narrativesDir -Include '*.md'
foreach ($f in $narrativeFiles) {
    $rel = $f.FullName.Substring($narrativesDir.Length + 1).Replace('\', '/')
    $content = Get-Content $f.FullName -Raw -Encoding UTF8
    $narratives[$rel] = $content
}
Write-Log "Loaded $($narratives.Count) narrative files"

# ---- Load i18n ----
Write-Log "Loading i18n..."
$i18n = @{}
$i18nDir = Join-Path $scriptDir 'i18n'
if (Test-Path $i18nDir) {
    $i18nFiles = @(Get-ChildItem -File -Path $i18nDir -Include '*.json' -ErrorAction SilentlyContinue)
    foreach ($f in $i18nFiles) {
        $lang = $f.BaseName
        $content = Get-Content $f.FullName -Raw -Encoding UTF8
        $i18n[$lang] = $content | ConvertFrom-Json
    }
}
$availableLangs = @($i18n.Keys | Sort-Object)
if ($availableLangs.Count -eq 0) { $availableLangs = @('en') }
Write-Log "i18n languages: $($availableLangs -join ', ')"

# ---- Build phases array ----
Write-Log "Building phases..."
$phaseOrder = @('P01','P02','P03','P04','P05','P06','P07','P08','P09','P10','P11')
$phaseTitles = @{
    P01 = 'Phase 1 — Foundation'
    P02 = 'Phase 2 — Beat-Index Engine'
    P03 = 'Phase 3 — Dual Grid & Observer'
    P04 = 'Phase 4 — DSP Port & Real-Time Safety'
    P05 = 'Phase 5 — Feature Extraction & Analysis Pipeline'
    P06 = 'Phase 6 — Security, RBAC & Tenant Isolation'
    P07 = 'Phase 7 — Local Ingestion & Hostile-File Handling'
    P08 = 'Phase 8 — MixPlan, UI & Redux Architecture'
    P09 = 'Phase 9 — Export & Set Shop'
    P10 = 'Phase 10 — Observability, Deployment & DR'
    P11 = 'Phase 11 — Hardening, Determinism Proof & Acceptance'
}
$phaseNarrativeKeys = @{
    P01 = 'P01/README.md'
    P02 = 'P02/README.md'
    P03 = 'P03/README.md'
    P04 = 'P04/README.md'
    P05 = 'P05/README.md'
    P06 = 'P06/README.md'
    P07 = 'P07/README.md'
    P08 = 'P08/README.md'
    P09 = 'P09/README.md'
    P10 = 'P10/README.md'
    P11 = 'P11/README.md'
}

$phases = @()
$phaseIndex = 0
foreach ($phaseId in $phaseOrder) {
    $phaseIndex++
    $phaseTasks = @($tasks | Where-Object { $_.id -like "$phaseId-*" })
    $done = (@($phaseTasks | Where-Object { $_.status -eq 'DONE' })).Count
    $todo = (@($phaseTasks | Where-Object { $_.status -eq 'TODO' })).Count
    $blocked = (@($phaseTasks | Where-Object { $_.status -like 'BLOCKED*' })).Count
    $superseded = (@($phaseTasks | Where-Object { $_.status -like 'SUPERSEDED*' })).Count
    $cancelled = (@($phaseTasks | Where-Object { $_.status -like 'CANCELLED*' })).Count
    $active = $phaseTasks.Count - $superseded - $cancelled

    $taskObjs = @()
    foreach ($t in $phaseTasks) {
        $testFile = $null
        $testCount = 0
        foreach ($tf in $testMap.Keys) {
            if ($testMap[$tf].task_guess -eq $t.id) {
                $testFile = $tf
                $testCount = $testMap[$tf].it_count
                break
            }
        }

        $taskObjs += [pscustomobject]@{
            id                  = $t.id
            status              = $t.status
            description         = @{ en = $t.description }
            expected_outcome    = @{ en = $t.expected_outcome }
            prerequisites       = $t.prerequisites
            test                = @{ en = $t.test }
            spec_reference      = @{ en = $t.spec_reference }
            review_checkpoint   = @{ en = $t.review_checkpoint }
            notes               = @{ en = $t.notes }
            md_line             = $t.md_line
            test_file           = $testFile
            test_count          = $testCount
        }
    }

    $keyFiles = $exports | Where-Object {
        $_.file -like "packages/core/src/*" -and (
            $_.file -like "*$($phaseId.ToLower())*" -or
            $_.file -match "packages/core/src/(constants|types|grid|timing|observer|transition|groove|glide|resilience|telemetry)/"
        )
    } | Select-Object -First 20 | ForEach-Object {
        [pscustomobject]@{
            path  = $_.file
            line  = $_.line
            symbol = $_.symbol
            note   = @{ en = "Exported from $($_.file):$($_.line)" }
        }
    }

    $phaseConstants = @()
    if ($phaseId -in @('P01','P02','P03','P04')) { $phaseConstants += $constants.grid }
    if ($phaseId -in @('P01','P04')) { $phaseConstants += $constants.timing }
    if ($phaseId -in @('P01','P05','P08')) { $phaseConstants += $constants.scoring }

    $phases += [pscustomobject]@{
        id          = $phaseId
        index       = $phaseIndex
        title       = @{ en = $phaseTitles[$phaseId] }
        status      = if ($active -gt 0 -and $done -eq $active -and $blocked -eq 0) { 'done' } elseif ($blocked -gt 0) { 'blocked' } elseif ($done -gt 0) { 'in-progress' } else { 'todo' }
        status_label = @{ en = "$done/$active complete$(if ($blocked -gt 0) { ", " + $blocked + " blocked" })$(if ($superseded -gt 0) { ", " + $superseded + " superseded" })" }
        narrative   = @{ en = (Get-OrEmpty $narratives $phaseNarrativeKeys[$phaseId]) }
        diagram     = @{ en = '' }
        tasks       = $taskObjs
        key_files   = $keyFiles
        constants   = $phaseConstants | ForEach-Object {
            [pscustomobject]@{
                name     = $_.name
                value    = $_.value
                file     = $_.file
                line     = $_.line
                category = $_.category
            }
        }
    }
}# ---- Glossary ----
$glossary = @(
    @{ term = @{ en = 'Anchor' };        definition = @{ en = 'A verified downbeat reference point (Beat 1) where the Absolute Locked Grid timeline is anchored. Hard sync occurs every 16 bars (64 beats) to correct accumulated drift.' } }
    @{ term = @{ en = 'Grid' };          definition = @{ en = 'The Absolute Locked Grid: a piecewise mapping t(i) from beat index i to absolute seconds. Composed of segments (startBeat, bpmSeed, T0, delta). Never throws; monotonic by construction.' } }
    @{ term = @{ en = 'Rung' };          definition = @{ en = 'A transition strategy tier. 7 rungs from normal (RUNG_NONE) to safety net (RUNG_FOUR_BAR_CROSSFADE). Evaluated in order; first match wins. Safety net never throws.' } }
    @{ term = @{ en = 'Chopping' };      definition = @{ en = 'The Transition Window Chopping Engine: slices the 64-beat transition window at 1/8-1/32 beat resolution, applies cosine crossfades at boundaries, shifts for groove, sheds under load.' } }
    @{ term = @{ en = 'Glide' };         definition = @{ en = 'Tempo glide: smooth BPM transition from outgoing to incoming track via AudioParam automation. Target = arithmetic mean (P04-T01-S01-M01). Rate slew-limited to 0.5%/s.' } }
)

# ---- Diagrams (Mermaid source) ----
$diagrams = @{
    phase_dependency = @{ en = @"
graph TD
    P01[P01 Foundation] --> P02
    P01 --> P05
    P01 --> P06
    P02[P02 Beat-Index Engine] --> P03
    P03[P03 Dual Grid & Observer] --> P04
    P03 --> P05
    P03 --> P08
    P04[P04 DSP Port] --> P08
    P04 --> P09
    P05[P05 Feature Extraction] --> P08
    P06[P06 Security & RBAC] --> P07
    P06 --> P08
    P06 --> P09
    P07[P07 Local Ingestion] --> P05
    P08[P08 MixPlan & UI] --> P09
    P09[P09 Export & Set Shop] --> P10
    P10[P10 Observability & Deployment] --> P11
    P11[P11 Hardening & Acceptance]
"@ }
    data_flow = @{ en = @"
graph LR
    A[Audio File] --> B[P07 Ingestion<br/>Worker Decoders]
    B --> C[Float32Array + content_sha256]
    C --> D[P05 Feature Extraction<br/>Essentia.js, TF, MAEST]
    D --> E[Feature Registry Row]
    C --> F[P02 Beat-Index Engine<br/>Attack/Body Grid]
    F --> G[TrackGridParams]
    G --> H[P03 Transition Planner<br/>7 Rungs + Safety Net]
    H --> I[TransitionPlan]
    I --> J[P04 DSP Port<br/>Glide + Chop + RT Callback]
    J --> K[Mixed Audio Output]
    E -.-> L[P08 Recommendation Engine]
    L -.-> M[MixPlan]
    M -.-> J
"@ }
    rung_state_machine = @{ en = @"
stateDiagram-v2
    [*] --> RUNG_NONE: Normal (both have kicks)
    [*] --> RUNG_STATIC_120_GRID: Incoming kick-less
    [*] --> RUNG_SILENT_LOOP: Outgoing < 64 beats
    RUNG_NONE --> RUNG_FOUR_BAR_CROSSFADE: Any error / non-finite
    RUNG_STATIC_120_GRID --> RUNG_FOUR_BAR_CROSSFADE: Any error / non-finite
    RUNG_SILENT_LOOP --> RUNG_FOUR_BAR_CROSSFADE: Any error / non-finite
    RUNG_FOUR_BAR_CROSSFADE --> [*]: Always succeeds
    RUNG_NONE --> RUNG_WSOLA_LEGACY: Phase-coherence fail
    RUNG_NONE --> RUNG_GROOVE_SHIFT: Groove = Swing
    RUNG_NONE --> RUNG_CHOP_SHED: Load shedding triggered
"@ }
}

# ---- Metadata ----
$totalTests = ($testMap.Values | Measure-Object -Property it_count -Sum).Sum
$metadata = [pscustomobject]@{
    generated           = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    version             = '1.0.0'
    current_branch      = $currentBranch
    current_head        = $gitSha
    total_tests         = $totalTests
    primary_language    = 'en'
    available_languages = $availableLangs
}

# ---- Assemble final object ----
$book = [pscustomobject]@{
    metadata  = $metadata
    phases    = $phases
    constants = @{
        grid    = $constants.grid | ForEach-Object { @{ name=$_.name; value=$_.value; file=$_.file; line=$_.line; category=$_.category } }
        timing  = $constants.timing | ForEach-Object { @{ name=$_.name; value=$_.value; file=$_.file; line=$_.line; category=$_.category } }
        scoring = $constants.scoring | ForEach-Object { @{ name=$_.name; value=$_.value; file=$_.file; line=$_.line; category=$_.category } }
    }
    glossary  = $glossary
    diagrams  = $diagrams
}

# ---- Serialize to JSON ----
Write-Log "Serializing to JSON..."
try {
    $json = $book | ConvertTo-Json -Depth 5 -Compress
    Write-Log "JSON serialization complete, length: $($json.Length)"
} catch {
    Write-Err "JSON serialization failed: $($_.Exception.Message)"
}

# ---- Write content.js ----
$header = "// AUTO-GENERATED BY build-book.ps1 -- DO NOT EDIT`nwindow.OTOMIX_BOOK = "
$footer = ";"
$output = $header + $json + $footer

# Write UTF-8 without BOM
[System.IO.File]::WriteAllText($outputJs, $output, (New-Object System.Text.UTF8Encoding($false)))
$sizeKb = [math]::Round((Get-Item $outputJs).Length / 1024, 1)

# ---- Summary ----
$doneTotal = ($tasks | Where-Object { $_.status -eq 'DONE' }).Count
$todoTotal = ($tasks | Where-Object { $_.status -eq 'TODO' }).Count
$blockedTotal = ($tasks | Where-Object { $_.status -like 'BLOCKED*' }).Count

Write-Host ""
Write-Host "=== OTOMIX Architecture Book -- Build Summary ==="
Write-Host "Phases parsed: 11"
Write-Host "Tasks parsed: $($tasks.Count)"
Write-Host "Task statuses: DONE=$doneTotal TODO=$todoTotal BLOCKED=$blockedTotal"
Write-Host "Narratives embedded: $($narratives.Count)"
Write-Host "Constants extracted: $(($constants.grid.Count + $constants.timing.Count + $constants.scoring.Count))"
Write-Host "Source exports indexed: $($exports.Count)"
Write-Host "Test files mapped: $($testMap.Count)"
Write-Host "content.js: $sizeKb KB, written at $outputJs"
Write-Host "=== OK ==="