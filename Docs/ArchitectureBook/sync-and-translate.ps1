$repoRoot = "C:\Oto Dj - Oto Mix\Oto Mix"
Set-Location $repoRoot
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$localUrl = "http://localhost:5000/translate"

function Translate-Text($text) {
    if ([string]::IsNullOrWhiteSpace($text)) { return $text }
    try {
        $body = @{ q = $text; source = "en"; target = "fa"; format = "text" } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri $localUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30
        return $res.translatedText
    } catch { return "[Translation Failed] $text" }
}

Write-Host "=== 1. Translating Tasks in tasks.json ===" -ForegroundColor Cyan
$planJson = "Docs\OtoMix Todo-Plan\OTOMIX_MicroTask_Plan.tasks.json"
$tasks = Get-Content $planJson -Raw -Encoding UTF8 | ConvertFrom-Json

foreach ($t in $tasks) {
    if ($t.description -and -not $t.description_fa) {
        # Translate and add "Simple Explanation" prefix
        $faDesc = Translate-Text -text $t.description
        $t | Add-Member -MemberType NoteProperty -Name "description_fa" -Value "توضیح ساده: $faDesc" -Force
    }
    if ($t.notes -and -not $t.notes_fa) {
        $faNotes = Translate-Text -text $t.notes
        $t | Add-Member -MemberType NoteProperty -Name "notes_fa" -Value $faNotes -Force
    }
}
$tasks | ConvertTo-Json -Depth 10 | Set-Content $planJson -Encoding UTF8
Write-Host "  OK: tasks.json translated." -ForegroundColor Green

Write-Host "=== 2. Translating Narratives & Adding Diagrams ===" -ForegroundColor Cyan
$srcDir = "Docs\ArchitectureBook\narratives"
$dstDir = "Docs\ArchitectureBook\narratives_fa"
if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }

# Add DSP Diagram to P04 README (English)
$p04Path = Join-Path $srcDir "P04\README.md"
$p04Content = Get-Content $p04Path -Raw -Encoding UTF8
if ($p04Content -notmatch 'graph LR') {
    $diagram = @"

## DSP Signal Flow Diagram

\`\`\`mermaid
graph LR
    A[Audio Input] --> B(Gain Normalizer)
    B --> C(Three-Band EQ)
    C --> D(Multiband Compressor)
    D --> E(Lookahead Limiter)
    E --> F[Audio Output / Export]
\`\`\`
"@
    $p04Content += $diagram
    [System.IO.File]::WriteAllText($p04Path, $p04Content, $utf8NoBom)
}

$files = Get-ChildItem $srcDir -Recurse -Filter "*.md"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $parts = $content -split '```'
    for ($i = 0; $i -lt $parts.Length; $i++) {
        if ($i % 2 -eq 0) {
            $paragraphs = $parts[$i] -split "(\r?\n\r?\n)"
            for ($j = 0; $j -lt $paragraphs.Length; $j += 2) {
                if ($paragraphs[$j].Trim() -ne "") {
                    $paragraphs[$j] = Translate-Text -text $paragraphs[$j]
                }
            }
            $parts[$i] = $paragraphs -join ""
        }
    }
    $translatedContent = $parts -join '```'
    $relPath = $file.FullName.Substring((Resolve-Path $srcDir).Path.Length + 1)
    $dstPath = Join-Path $dstDir $relPath
    $dstFolder = Split-Path $dstPath -Parent
    if (-not (Test-Path $dstFolder)) { New-Item -ItemType Directory -Path $dstFolder -Force | Out-Null }
    [System.IO.File]::WriteAllText($dstPath, $translatedContent, $utf8NoBom)
}
Write-Host "  OK: Narratives translated." -ForegroundColor Green

Write-Host "=== 3. Updating build-book.ps1 ===" -ForegroundColor Cyan
$buildScript = "Docs\ArchitectureBook\build-book.ps1"
$bs = [System.IO.File]::ReadAllText($buildScript, [System.Text.Encoding]::UTF8)
if ($bs -notmatch '\$narrativeFaText') {
    $bs = $bs -replace '(\$narrativeText\s*=\s*Get-Content[^\n]+)', '$1`r`n$narrativeFaText = ""; $faPath = $narrativeFile -replace "narratives", "narratives_fa"; if (Test-Path $faPath) { $narrativeFaText = Get-Content $faPath -Raw -Encoding UTF8 }'
    $bs = $bs -replace '(narrative\s*=\s*\$narrativeText)', '$1`r`nnarrative_fa = $narrativeFaText'
    [System.IO.File]::WriteAllText($buildScript, $bs, $utf8NoBom)
}

Write-Host "=== 4. Updating app.js ===" -ForegroundColor Cyan
$appJs = "Docs\ArchitectureBook\app.js"
$js = [System.IO.File]::ReadAllText($appJs, [System.Text.Encoding]::UTF8)
if ($js -notmatch 'description_fa') {
    # Replace task renderer to use description_fa if lang is fa
    $js = $js -replace 'var s = \(task && task.status\) \|\| ''TODO'';', 'var s = (task && task.status) || ''TODO'';'
    $js = $js -replace '(container\.appendChild\(el\(''div'', \{ class: ''t-field'', text: .*? \+ task\.description.*?)\);)', 'const lang = localStorage.getItem("book_lang") || "en"; const desc = lang === "fa" && task.description_fa ? task.description_fa : task.description; $1.replace(/task\.description/g, "desc");'
    
    # Ensure language toggle updates the narrative
    if ($js -notmatch 'phase\.narrative_fa') {
        $js = $js -replace 'renderMarkdown\(t\(phase\.narrative\), narDiv\);', 'const lang = localStorage.getItem("book_lang") || "en"; const text = lang === "fa" && phase.narrative_fa ? phase.narrative_fa : phase.narrative; renderMarkdown(t(text), narDiv);'
    }
    
    $toggleCode = @"

// --- Language Toggle Logic ---
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('lang-toggle');
  if (!btn) return;
  const lang = localStorage.getItem('book_lang') || 'en';
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  btn.textContent = lang === 'fa' ? 'EN' : 'FA';
  btn.onclick = () => {
    const newLang = localStorage.getItem('book_lang') === 'fa' ? 'en' : 'fa';
    localStorage.setItem('book_lang', newLang);
    location.reload();
  };
});
"@
    if ($js -notmatch 'Language Toggle Logic') { $js += $toggleCode }
    [System.IO.File]::WriteAllText($appJs, $js, $utf8NoBom)
}

Write-Host "=== 5. Updating CSS ===" -ForegroundColor Cyan
$cssPath = "Docs\ArchitectureBook\style.css"
$css = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)
$css = $css -replace '(?s)/\* Top Right UI Toggles \*/.*?(?=\z|/\*)', ''
$css += "`r`n#lang-toggle { position: fixed; top: 15px; right: 65px; z-index: 9999; background: var(--bg3); color: var(--fg); border: 1px solid var(--fg3); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-family: sans-serif; font-weight: bold; font-size: 12px; }`r`n[dir='rtl'] #lang-toggle { right: auto; left: 65px; }`r`n"
[System.IO.File]::WriteAllText($cssPath, $css, $utf8NoBom)

Write-Host "=== 6. Rebuilding Book ===" -ForegroundColor Cyan
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $buildScript | Select-Object -Last 1

Write-Host "=== 7. Committing ===" -ForegroundColor Cyan
& git add -A 2>&1 | Out-Null
& git commit -m "feat(book): automated translation, task explanations, and DSP diagram" 2>&1 | Out-Null
& git push origin P04 2>&1 | Out-Null

Write-Host "=== DONE ===" -ForegroundColor Green