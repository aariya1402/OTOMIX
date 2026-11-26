param([string]$RepoRoot = "C:\Oto Dj - Oto Mix\Oto Mix")
$ErrorActionPreference = 'Stop'
$planPath  = Join-Path $RepoRoot 'Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md'
$tasksPath = Join-Path $RepoRoot 'Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.tasks.json'

$tasks = [System.IO.File]::ReadAllText($tasksPath) | ConvertFrom-Json
if (-not ($tasks -is [System.Array])) { $tasks = @($tasks) }
$ts = @{}; foreach ($t in $tasks) { $ts[[string]$t.id] = [string]$t.status }

$planText = [System.IO.File]::ReadAllText($planPath)
$ps = @{}
foreach ($m in [regex]::Matches($planText, '(?m)^######\s+(P08-[A-Z0-9-]+)\s+[—–-]\s+(.+?)\s*$')) {
    $ps[$m.Groups[1].Value] = $m.Groups[2].Value.Trim()
}
function N([string]$p) {
    if     ($p -match '^DONE')                { 'DONE' }
    elseif ($p -match '^TODO')                { 'TODO' }
    elseif ($p -match '^BLOCKED\s*\(OQ-09\)') { 'BLOCKED:OQ-09' }
    elseif ($p -match '^BLOCKED\s*\(OQ-24\)') { 'BLOCKED:OQ-24' }
    else                                      { "UNKNOWN($p)" }
}
$ids = @(
  'P08-T01-S01-M01','P08-T01-S02-M01','P08-T01-S02-M02','P08-T02-S01-M02',
  'P08-T03-S01-M01','P08-T04-S02-M01','P08-T04-S02-M03','P08-T04-S02-M04',
  'P08-T05-S01-M01','P08-T06-S01-M01','P08-T04-S02-M02','P08-T04-S01-M01','P08-T04-S01-M03'
)
$out = @('=== Three-way sync check ===')
$d = 0
foreach ($id in $ids) {
    $a = N $ps[$id]; $b = $ts[$id]
    $ok = ($a -eq $b); if (-not $ok) { $d++ }
    $out += ('{0}  {1,-18}  plan={2,-14} tasks={3}' -f ($(if($ok){'OK     '}else{'DIVERGE'})), $id, $a, $b)
}
$out += ''
$out += "DIVERGE count: $d  (expected 0)"

Push-Location $RepoRoot
try {
    $dc = & git diff --check 2>&1
    $out += ''; $out += '=== git diff --check (tail) ==='
    if ($dc) { $out += ($dc | Select-Object -Last 3) }
    $out += "exit=$LASTEXITCODE"

    $st = & git status --porcelain
    $out += ''; $out += '=== git status --porcelain ==='
    $out += ($st -join "`n")

    $tsc = $st | Where-Object { $_ -match '\.(ts|tsx)\s' }
    $out += ''; $out += $(if ($tsc) { "GUARD FAIL: ts/tsx modified"; $tsc } else { "Guard: no .ts/.tsx modifications. OK" })

    $rem = Get-ChildItem (Join-Path $RepoRoot 'packages/gateway/src/routes') -Filter '*.bak-*' -ErrorAction SilentlyContinue
    $out += ''; $out += $(if ($rem) { "Routes: $($rem.Count) .bak remain"; $rem.Name } else { "Routes: 0 remaining .bak. OK" })
} finally { Pop-Location }

$rep = $out -join "`n"
Write-Host $rep
$rep | Set-Content (Join-Path $RepoRoot 'OTOMIX_P08_ThreeWay.txt') -Encoding UTF8
Set-Clipboard -Value $rep
Write-Host "`n--- copied to clipboard ---"
