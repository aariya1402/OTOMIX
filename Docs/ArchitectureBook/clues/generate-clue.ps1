param(
    [Parameter(Mandatory=$true)][string]$TaskId,
    [string]$CommitSha = "HEAD"
)
$ErrorActionPreference = "Stop"
$cluesDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $cluesDir "..\..\..")).Path
Set-Location $repoRoot

$phase = $TaskId.Substring(0,3)
$clueFile = Join-Path $cluesDir "$phase.md"
if (-not (Test-Path $clueFile)) {
    $hdr = "# $phase Clues`r`n`r`n"
    [System.IO.File]::WriteAllText($clueFile, $hdr, (New-Object System.Text.UTF8Encoding $false))
}

$existing = Get-Content $clueFile -Raw -Encoding UTF8
if ($existing -match [regex]::Escape("## $TaskId ")) {
    Write-Host "SKIP: clue for $TaskId already exists"
    exit 0
}

# Plan metadata from MD
$mdPath = Join-Path $repoRoot "Docs\OtoMix Todo-Plan\OTOMIX_MicroTask_Plan.md"
$mdLines = Get-Content $mdPath -Encoding UTF8
$fields = @{}
for ($i=0; $i -lt $mdLines.Length; $i++) {
    if ($mdLines[$i] -match "^######\s+$([regex]::Escape($TaskId))\s") {
        for ($j=$i+1; $j -lt [Math]::Min($i+25, $mdLines.Length); $j++) {
            if ($mdLines[$j] -match '^######\s') { break }
            if ($mdLines[$j] -match '^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$') {
                $k=$matches[1].Trim(); $v=$matches[2].Trim()
                if ($k -ne 'Field' -and $k -notmatch '^[-: ]+$') { $fields[$k]=$v }
            }
        }
        break
    }
}

# File list from git show
$statOut = git show $CommitSha --stat --oneline 2>&1 | Out-String
$filesChanged = @()
foreach ($line in ($statOut -split "`n")) {
    if ($line -match '^\s+(.+?)\s+\|\s+(\d+)\s+([+-]+)') {
        $filesChanged += [PSCustomObject]@{ Path=$matches[1].Trim(); Count=$matches[2]; Signs=$matches[3] }
    }
}

# New exports from diff
$diffOut = git show $CommitSha -- "packages/" 2>&1 | Out-String
$newExports = @()
foreach ($m in [regex]::Matches($diffOut, '(?m)^\+\s*export\s+(?:async\s+)?(?:function|const|class|interface|type|enum)\s+([A-Za-z_][A-Za-z0-9_]*)')) {
    $newExports += $m.Groups[1].Value
}
$newExports = $newExports | Sort-Object -Unique
$newIt = ([regex]::Matches($diffOut, '(?m)^\+.*\bit\(')).Count

$sha = (git rev-parse --short $CommitSha 2>&1 | Out-String).Trim()
$ts  = Get-Date -Format 'yyyy-MM-dd HH:mm'

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("## $TaskId")
[void]$sb.AppendLine("**Commit**: $sha  |  **Generated**: $ts")
[void]$sb.AppendLine("")
if ($fields['Description'])       { [void]$sb.AppendLine("**What**: $($fields['Description'])") }
if ($fields['Expected Outcome'])  { [void]$sb.AppendLine("**Expected**: $($fields['Expected Outcome'])") }
if ($fields['Independent Test(s)']){ [void]$sb.AppendLine("**Test**: $($fields['Independent Test(s)'])") }
if ($fields['Review Checkpoint']) { [void]$sb.AppendLine("**Review**: $($fields['Review Checkpoint'])") }
[void]$sb.AppendLine("")
[void]$sb.AppendLine("**Files changed**:")
foreach ($f in $filesChanged) { [void]$sb.AppendLine("  - ``$($f.Path)`` ($($f.Signs) $($f.Count))") }
if ($newExports.Count -gt 0) { [void]$sb.AppendLine("**New exports**: $($newExports -join ', ')") }
[void]$sb.AppendLine("**New tests**: $newIt")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")

Add-Content -Path $clueFile -Value $sb.ToString() -Encoding UTF8
Write-Host "OK: clue appended for $TaskId (commit $sha)"