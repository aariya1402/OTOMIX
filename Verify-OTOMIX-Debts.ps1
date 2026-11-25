#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ProjectRoot = (Get-Location).Path,
    [switch]$SkipSlowChecks
)
$ErrorActionPreference = 'Continue'

function J { param([string]$R) Join-Path $ProjectRoot $R }
function T {
    param([string]$P)
    if (-not $P) { return $null }
    if (-not (Test-Path -LiteralPath $P -PathType Leaf)) { return $null }
    try { [IO.File]::ReadAllText((Resolve-Path -LiteralPath $P).Path) } catch { $null }
}
function GJ {
    param([string]$P)
    $t = T $P
    if (-not $t) { return $null }
    try { return $t | ConvertFrom-Json } catch { return $null }
}
function FT {
    param([string]$Pattern, [string[]]$FallbackDirs = @())
    Push-Location $ProjectRoot
    try {
        $rel = & git ls-files -- $Pattern 2>$null | Select-Object -First 1
        if ($rel) { return (Join-Path $ProjectRoot $rel) }
    } catch {}
    finally { Pop-Location }
    foreach ($d in $FallbackDirs) {
        $p = J $d
        if (Test-Path -LiteralPath $p -PathType Leaf) { return $p }
    }
    $rootFile = J ([IO.Path]::GetFileName($Pattern))
    if (Test-Path -LiteralPath $rootFile) { return $rootFile }
    return $null
}
$R = New-Object System.Collections.ArrayList
function Rep {
    param([string]$Id, [string]$Claim, [string]$Status, [string]$Detail='')
    $c = switch ($Status) { 'CONFIRMED'{'Red'} 'NOT-FOUND'{'Green'} 'INCONCLUSIVE'{'Yellow'} default{'DarkGray'} }
    Write-Host ""
    Write-Host "[$Id] " -ForegroundColor Yellow -NoNewline
    Write-Host $Claim -ForegroundColor White
    Write-Host "    -> " -NoNewline
    Write-Host $Status -ForegroundColor $c -NoNewline
    if ($Detail) { Write-Host "  ($Detail)" -ForegroundColor DarkGray } else { Write-Host "" }
    [void]$R.Add([pscustomobject]@{Id=$Id; Status=$Status; Detail=$Detail})
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Magenta
Write-Host "  OTOMIX Technical Debt Claim Verifier" -ForegroundColor Magenta
Write-Host "  Root: $ProjectRoot" -ForegroundColor DarkGray
Write-Host "================================================================" -ForegroundColor Magenta
if (-not (Test-Path -LiteralPath $ProjectRoot)) { Write-Host "FATAL: root not found" -ForegroundColor Red; return }
$pkgs = J 'packages'

Write-Host ""; Write-Host "--- CRITICAL ---" -ForegroundColor Cyan

# #1
$missing = @(); $checked = 0
if (Test-Path -LiteralPath $pkgs) {
    Get-ChildItem -LiteralPath $pkgs -Directory -EA SilentlyContinue | ForEach-Object {
        $j = GJ (Join-Path $_.FullName 'package.json')
        if ($j) {
            $checked++
            $names = @()
            if ($j.scripts) { $names = @($j.scripts.PSObject.Properties.Name) }
            if (-not ($names -contains 'lint') -and -not ($names -contains 'format')) { $missing += $_.Name }
        }
    }
}
if ($checked -eq 0) { Rep '#1' 'No lint/format in packages' 'SKIPPED' 'no package.json parsed' }
elseif ($missing.Count -gt 0) { Rep '#1' 'No lint/format in packages' 'CONFIRMED' "missing in $($missing.Count) of ${checked}: $($missing -join ', ')" }
else { Rep '#1' 'No lint/format in packages' 'NOT-FOUND' "all $checked packages have lint/format" }

# #2
$lf = $null
foreach ($lc in @('pnpm-lock.yaml','package-lock.json','yarn.lock')) {
    $p = J $lc
    if (Test-Path -LiteralPath $p) { $lf = $p; break }
}
if ($lf) {
    $lt = T $lf
    if ($lt -match '(?i)madge') { Rep '#2' 'madge not installed' 'NOT-FOUND' "madge IS in $([IO.Path]::GetFileName($lf))" }
    else { Rep '#2' 'madge not installed' 'CONFIRMED' "madge NOT in $([IO.Path]::GetFileName($lf))" }
} else { Rep '#2' 'madge not installed' 'SKIPPED' 'no lockfile' }

# #3
$tst = T (J 'tsconfig.json')
if ($tst) {
    $mm = [regex]::Matches($tst, '(?m)^\s*"module"\s*:')
    if ($mm.Count -gt 1) { Rep '#3' 'Duplicate module key in tsconfig' 'CONFIRMED' "$($mm.Count) module keys" }
    elseif ($mm.Count -eq 1) { Rep '#3' 'Duplicate module key in tsconfig' 'NOT-FOUND' 'only 1 module key' }
    else { Rep '#3' 'Duplicate module key in tsconfig' 'INCONCLUSIVE' 'no module key' }
} else { Rep '#3' 'Duplicate module key in tsconfig' 'SKIPPED' 'tsconfig.json not found' }

# #4
$corePj = GJ (J 'packages\core\package.json')
$pgDec = $false
if ($corePj) {
    $deps = @()
    foreach ($k in @('dependencies','devDependencies','peerDependencies')) {
        if ($corePj.$k) { $deps += @($corePj.$k.PSObject.Properties.Name) }
    }
    $pgDec = ($deps -contains 'pg')
}
$pgImp = 0
$cs = J 'packages\core\src'
if (Test-Path -LiteralPath $cs) {
    Get-ChildItem -LiteralPath $cs -Recurse -Filter '*.ts' -File -EA SilentlyContinue | ForEach-Object {
        $t = T $_.FullName
        if ($t -and $t -match "from\s+['`"]pg['`"]") { $pgImp++ }
    }
}
if ($pgImp -eq 0) { Rep '#4' 'core imports pg, not declared' 'NOT-FOUND' 'pg not imported in core/src' }
elseif ($pgDec) { Rep '#4' 'core imports pg, not declared' 'NOT-FOUND' 'pg declared' }
else { Rep '#4' 'core imports pg, not declared' 'CONFIRMED' "imported in $pgImp file(s), not declared" }

# #5
$tf = FT 'tasks.json' @('tasks.json')
if ($tf) { Rep '#5' 'RBAC incomplete' 'INCONCLUSIVE' "tasks.json at $tf - manual review" }
else { Rep '#5' 'RBAC incomplete' 'SKIPPED' 'tasks.json not found' }

# #6
$acc = J 'packages\access'
$vr = 0; $vi = 0
if (Test-Path -LiteralPath $acc) {
    Get-ChildItem -LiteralPath $acc -Recurse -Filter '*.ts' -File -EA SilentlyContinue | ForEach-Object {
        $t = T $_.FullName
        if ($t) {
            if ($t -match 'VaultClient') { $vr++ }
            if ($t -match 'class\s+\w+\s+(implements|extends)\s+\w*Vault\w*') { $vi++ }
        }
    }
    if ($vr -eq 0) { Rep '#6' 'VaultClient stub only' 'NOT-FOUND' 'no references' }
    elseif ($vi -eq 0) { Rep '#6' 'VaultClient stub only' 'CONFIRMED' "ref in $vr file(s), no impl class" }
    else { Rep '#6' 'VaultClient stub only' 'NOT-FOUND' "$vi impl(s) found" }
} else { Rep '#6' 'VaultClient stub only' 'SKIPPED' 'packages/access not found' }

Write-Host ""; Write-Host "--- HIGH ---" -ForegroundColor Cyan

# #7
$lg = T (J 'packages\core\src\telemetry\logger.ts')
if ($lg) {
    $w = $lg -match '(?m)^\s*(public\s+)?warn\s*\('
    $i = $lg -match '(?m)^\s*(public\s+)?info\s*\('
    $e = $lg -match '(?m)^\s*(public\s+)?error\s*\('
    if (-not ($w -or $i -or $e)) { Rep '#7' 'Logger only .log()' 'CONFIRMED' 'only .log()' }
    else {
        $p = @(); if ($w){$p+='warn'}; if ($i){$p+='info'}; if ($e){$p+='error'}
        Rep '#7' 'Logger only .log()' 'NOT-FOUND' "also has: $($p -join ', ')"
    }
} else { Rep '#7' 'Logger only .log()' 'SKIPPED' 'logger.ts not found' }

# #8
$pl = T (J 'packages\workers\src\pool.ts')
if ($pl) {
    if ($pl -match '(?m)^\s*//\s*@ts-nocheck') { Rep '#8' '@ts-nocheck in pool.ts' 'CONFIRMED' 'found' }
    else { Rep '#8' '@ts-nocheck in pool.ts' 'NOT-FOUND' 'absent' }
} else { Rep '#8' '@ts-nocheck in pool.ts' 'SKIPPED' 'pool.ts not found' }

# #9
$cn = @{}
foreach ($d in @((J 'packages\core\src'), (J 'packages\gateway\src'))) {
    if (Test-Path -LiteralPath $d) {
        Get-ChildItem -LiteralPath $d -Recurse -Filter '*.ts' -File -EA SilentlyContinue | ForEach-Object {
            $t = T $_.FullName
            if ($t) {
                foreach ($n in @('AnalysisConfig','AdminTuningConfig','UserFacingConfig')) {
                    if ($t -match "\b$n\b") {
                        if (-not $cn.ContainsKey($n)) { $cn[$n]=0 }
                        $cn[$n]++
                    }
                }
            }
        }
    }
}
if ($cn.Count -ge 2) {
    $s = ($cn.Keys | ForEach-Object { "$_($($cn[$_]))" }) -join ', '
    Rep '#9' 'Config name mismatch' 'CONFIRMED' "$($cn.Count): $s"
} elseif ($cn.Count -eq 1) { Rep '#9' 'Config name mismatch' 'NOT-FOUND' 'only one name' }
else { Rep '#9' 'Config name mismatch' 'INCONCLUSIVE' 'none found' }

# #10
$mh = @()
if (Test-Path -LiteralPath $cs) {
    Get-ChildItem -LiteralPath $cs -Recurse -Filter '*.ts' -File -EA SilentlyContinue | ForEach-Object {
        $t = T $_.FullName
        if ($t -and $t -match 'mixability_score') { $mh += $_.Name }
    }
}
if ($mh.Count -eq 0) { Rep '#10' 'Rule 25 (mixability_score)' 'NOT-FOUND' 'not in core/src' }
else { Rep '#10' 'Rule 25 (mixability_score)' 'INCONCLUSIVE' "in $($mh.Count) file(s)" }

# #11
$bh = @()
if (Test-Path -LiteralPath $cs) {
    Get-ChildItem -LiteralPath $cs -Recurse -Filter '*.ts' -File -EA SilentlyContinue | ForEach-Object {
        $t = T $_.FullName
        if ($t -and $t -match '\bt_start\b|\bt_end\b') { $bh += $_.Name }
    }
}
if ($bh.Count -eq 0) { Rep '#11' 'Rule 26 (t_start/t_end)' 'NOT-FOUND' 'not in core/src' }
else { Rep '#11' 'Rule 26 (t_start/t_end)' 'CONFIRMED' "in: $(($bh|Sort-Object -Unique) -join ', ')" }

# #12
Rep '#12' 'Dual deployment' 'SKIPPED' 'design-level'

# #13
if (T (J 'packages\core\src\features\cache-invalidate.ts')) {
    Rep '#13' 'Registry 1.2->1.3 bump' 'INCONCLUSIVE' 'file exists, manual review'
} else { Rep '#13' 'Registry 1.2->1.3 bump' 'SKIPPED' 'file not found' }

# #14
$gw = J 'packages\gateway'
$pb = 0
if (Test-Path -LiteralPath $gw) {
    Get-ChildItem -LiteralPath $gw -Recurse -Filter '*.ts' -File -EA SilentlyContinue | ForEach-Object {
        $t = T $_.FullName
        if ($t -and ($t -match '(?i)publisher' -or $t -match '(?i)buyer')) { $pb++ }
    }
    if ($pb -eq 0) { Rep '#14' 'Publisher/buyer authz' 'CONFIRMED' 'no refs' }
    else { Rep '#14' 'Publisher/buyer authz' 'INCONCLUSIVE' "$pb ref(s)" }
} else { Rep '#14' 'Publisher/buyer authz' 'SKIPPED' 'gateway not found' }

Write-Host ""; Write-Host "--- MEDIUM ---" -ForegroundColor Cyan

# #15
if ($SkipSlowChecks) { Rep '#15' 'CRLF warnings' 'SKIPPED' 'disabled' }
else {
    Push-Location $ProjectRoot
    try {
        $eol = & git ls-files --eol 2>&1 | Out-String
        $n = ([regex]::Matches($eol, 'i/crlf')).Count
        if ($n -gt 0) { Rep '#15' 'CRLF warnings' 'CONFIRMED' "$n file(s) CRLF" }
        else { Rep '#15' 'CRLF warnings' 'NOT-FOUND' 'all LF' }
    } catch { Rep '#15' 'CRLF warnings' 'INCONCLUSIVE' 'git error' }
    finally { Pop-Location }
}

# #16
if ($SkipSlowChecks) { Rep '#16' 'ffmpeg not on PATH' 'SKIPPED' 'disabled' }
else {
    $ff = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($ff) { Rep '#16' 'ffmpeg not on PATH' 'NOT-FOUND' "at $($ff.Source)" }
    else { Rep '#16' 'ffmpeg not on PATH' 'CONFIRMED' 'not found' }
}

# #17
$tc = @()
if (Test-Path -LiteralPath $pkgs) {
    Get-ChildItem -LiteralPath $pkgs -Directory -EA SilentlyContinue | ForEach-Object {
        $j = GJ (Join-Path $_.FullName 'package.json')
        if ($j) {
            $d = @()
            foreach ($k in @('dependencies','devDependencies')) {
                if ($j.$k) { $d += @($j.$k.PSObject.Properties.Name) }
            }
            if ($d -contains 'testcontainers') { $tc += $_.Name }
        }
    }
}
$tcs = @($tc | Sort-Object)
if ($tcs.Count -eq 0) { Rep '#17' 'testcontainers scope' 'NOT-FOUND' 'not declared' }
elseif (($tcs -join ',') -eq 'db,gateway') { Rep '#17' 'testcontainers scope' 'CONFIRMED' "matches: $($tcs -join ', ')" }
else { Rep '#17' 'testcontainers scope' 'CONFIRMED' "actually in: $($tcs -join ', ')" }

# #18
$sf = FT '*sync-and-translate.ps1' @('tools\scripts\sync-and-translate.ps1', 'scripts\sync-and-translate.ps1', 'sync-and-translate.ps1')
if ($sf) {
    $t = T $sf
    if ($t -match 'git\s+push\s+origin\s+P04') { Rep '#18' 'sync hardcodes P04' 'CONFIRMED' 'P04' }
    elseif ($t -match 'git\s+push\s+origin\s+(\S+)') {
        $b = [regex]::Match($t, 'git\s+push\s+origin\s+(\S+)').Groups[1].Value
        Rep '#18' 'sync hardcodes P04' 'NOT-FOUND' "branch: $b"
    } else { Rep '#18' 'sync hardcodes P04' 'NOT-FOUND' 'no hardcoded push' }
} else { Rep '#18' 'sync hardcodes P04' 'NOT-FOUND' 'file not found' }

# #19
$ui = J 'packages\ui'
if (Test-Path -LiteralPath $ui) {
    $mf = @()
    Get-ChildItem -LiteralPath $ui -Recurse -Include '*.ts','*.tsx' -File -EA SilentlyContinue | ForEach-Object {
        if ($_.Name -match 'binding|matrix|catalog') { $mf += $_.Name }
    }
    if ($mf.Count -eq 0) { Rep '#19' 'UI binding matrix' 'INCONCLUSIVE' 'no candidate' }
    else { Rep '#19' 'UI binding matrix' 'INCONCLUSIVE' "candidates: $($mf -join ', ')" }
} else { Rep '#19' 'UI binding matrix' 'SKIPPED' 'packages/ui not found' }

# #20
$mfiles = @()
Push-Location $ProjectRoot
try {
    $rels = & git ls-files -- '*Match*.md' 2>$null | Select-Object -First 10
    foreach ($r in $rels) { $p = Join-Path $ProjectRoot $r; if (Test-Path -LiteralPath $p) { $mfiles += $p } }
} catch {}
finally { Pop-Location }
if ($mfiles.Count -eq 0) { Rep '#20' 'Console encoding' 'SKIPPED' 'no Match reports' }
else {
    $bad = 0
    foreach ($f in $mfiles) {
        $t = T $f
        if ($t -and ($t -match 'Ã©|Ã¢|â€|Ã¼|Ã¶|Ã¤')) { $bad++ }
    }
    if ($bad -gt 0) { Rep '#20' 'Console encoding' 'CONFIRMED' "mojibake in $bad" }
    else { Rep '#20' 'Console encoding' 'NOT-FOUND' "clean ($($mfiles.Count) files)" }
}

Write-Host ""; Write-Host "--- LOW / ADVISORY ---" -ForegroundColor Cyan

# #21
Rep '#21' 'DONE = locator only' 'SKIPPED' 'semantic'

# #22
$dd = J 'packages\core\dist'
if (Test-Path -LiteralPath $dd) {
    $dn = @(Get-ChildItem -LiteralPath $dd -Recurse -File -EA SilentlyContinue).Count
    Rep '#22' 'core/dist patched' 'INCONCLUSIVE' "dist has $dn file(s) - run tsc --build"
} else { Rep '#22' 'core/dist patched' 'NOT-FOUND' 'no dist' }

# #23
$nm = T (J 'packages\core\src\audio\normalize.ts')
if ($nm) {
    if ($nm -match 'forceMono\s*:\s*boolean\s*=\s*true') { Rep '#23' 'forceMono defaults true' 'CONFIRMED' 'forceMono: boolean = true' }
    elseif ($nm -match 'forceMono\s*[=:]\s*true') { Rep '#23' 'forceMono defaults true' 'CONFIRMED' 'forceMono = true' }
    elseif ($nm -match 'forceMono\s*[=:]\s*false') { Rep '#23' 'forceMono defaults true' 'NOT-FOUND' 'forceMono = false' }
    elseif ($nm -match 'forceMono') { Rep '#23' 'forceMono defaults true' 'INCONCLUSIVE' 'referenced, default unclear' }
    else { Rep '#23' 'forceMono defaults true' 'NOT-FOUND' 'not referenced' }
} else { Rep '#23' 'forceMono defaults true' 'SKIPPED' 'normalize.ts not found' }

# #24
$af = FT '*OTOMIX_MicroTask_Plan_Addendum.md' @('Docs\OtoMix Todo-Plan\OTOMIX_MicroTask_Plan_Addendum.md')
if ($af) {
    $t = T $af
    $defs = @()
    foreach ($line in ($t -split "`r?`n")) {
        if ($line -match '^\s*#{1,6}\s+(P\d{2}-ADD-T\d{2}-S\d{2}-M\d{2})') { $defs += $Matches[1] }
        elseif ($line -match '^\s*\|\s*(P\d{2}-ADD-T\d{2}-S\d{2}-M\d{2})') { $defs += $Matches[1] }
    }
    $dups = @($defs | Group-Object | Where-Object { $_.Count -gt 1 })
    if ($dups.Count -gt 0) {
        $l = ($dups | ForEach-Object { "$($_.Name) x$($_.Count)" }) -join ', '
        Rep '#24' 'Duplicate ID in Addendum' 'CONFIRMED' $l
    } else { Rep '#24' 'Duplicate ID in Addendum' 'NOT-FOUND' "no dups ($($defs.Count) defs)" }
} else { Rep '#24' 'Duplicate ID in Addendum' 'SKIPPED' 'not found' }

# #25
$pf = FT '*OTOMIX_MicroTask_Plan.md' @('Docs\OtoMix Todo-Plan\OTOMIX_MicroTask_Plan.md')
if ($pf) {
    $t = T $pf
    $hn = $t -match '(?i)(no\s+task\s+is\s+done|no\s+tasks?\s+(are\s+)?done)'
    $bd = $t -match '\[x\]'
    if ($hn -and $bd) { Rep '#25' 'Plan header vs body' 'CONFIRMED' 'header denies, body has [x]' }
    elseif ($hn) { Rep '#25' 'Plan header vs body' 'INCONCLUSIVE' 'header denies, no [x]' }
    else { Rep '#25' 'Plan header vs body' 'NOT-FOUND' 'no contradiction' }
} else { Rep '#25' 'Plan header vs body' 'SKIPPED' 'plan not found' }

# #26
$tf2 = FT 'tasks.json' @('tasks.json')
if ($tf2) {
    $t = T $tf2
    $n = ([regex]::Matches($t, '"(RESOLVED|CANCELLED)"[^}]*"\[BLOCKED\]"')).Count
    if ($n -gt 0) { Rep '#26' 'Status mismatch' 'CONFIRMED' "$n mismatch(es)" }
    else { Rep '#26' 'Status mismatch' 'NOT-FOUND' 'none' }
} else { Rep '#26' 'Status mismatch' 'SKIPPED' 'tasks.json not found' }

Write-Host ""
Write-Host "================================================================" -ForegroundColor Magenta
Write-Host "  SUMMARY" -ForegroundColor Magenta
Write-Host "================================================================" -ForegroundColor Magenta
foreach ($s in @('CONFIRMED','NOT-FOUND','INCONCLUSIVE','SKIPPED')) {
    $c = @($R | Where-Object { $_.Status -eq $s }).Count
    $col = switch ($s) { 'CONFIRMED'{'Red'} 'NOT-FOUND'{'Green'} 'INCONCLUSIVE'{'Yellow'} default{'DarkGray'} }
    Write-Host ("  {0,-14}: {1}" -f $s, $c) -ForegroundColor $col
}
Write-Host "  Total         : $($R.Count)" -ForegroundColor White
Write-Host ""
Write-Host "  Confirmed debts:" -ForegroundColor White
$R | Where-Object { $_.Status -eq 'CONFIRMED' } | ForEach-Object {
    Write-Host ("    [{0}] {1}" -f $_.Id, $_.Detail) -ForegroundColor Red
}
