$repoRoot = "C:\Oto Dj - Oto Mix\Oto Mix"
Set-Location $repoRoot
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$ollamaUrl = "http://localhost:11434/api/generate"
$modelName = "llama3" # اگر مدل دیگری دارید (مثل qwen2.5) اینجا تغییر دهید

function Translate-Ollama($text) {
    if ([string]::IsNullOrWhiteSpace($text)) { return $text }
    try {
        $prompt = "Translate the following English text to Persian (Farsi). Return ONLY the translated text, do not add any explanations or quotes. Text: `n$text"
        $body = @{
            model = $modelName
            prompt = $prompt
            stream = $false
        } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri $ollamaUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 120
        return $res.response.Trim()
    } catch { 
        Write-Host "Ollama API Error!" -ForegroundColor Red
        return "[Translation Failed] $text" 
    }
}

Write-Host "=== 1. Translating Tasks (This may take a few minutes) ===" -ForegroundColor Cyan
$planJson = "Docs\OtoMix Todo-Plan\OTOMIX_MicroTask_Plan.tasks.json"
$tasks = Get-Content $planJson -Raw -Encoding UTF8 | ConvertFrom-Json

$count = 0
foreach ($t in $tasks) {
    if ($t.description -and -not $t.description_fa) {
        $faDesc = Translate-Ollama -text $t.description
        $t | Add-Member -MemberType NoteProperty -Name "description_fa" -Value "توضیح ساده: $faDesc" -Force
        $count++
        if ($count % 5 -eq 0) { Write-Host "  Translated $count tasks..." -ForegroundColor Yellow }
    }
    if ($t.notes -and -not $t.notes_fa) {
        $faNotes = Translate-Ollama -text $t.notes
        $t | Add-Member -MemberType NoteProperty -Name "notes_fa" -Value $faNotes -Force
    }
}
$tasks | ConvertTo-Json -Depth 10 | Set-Content $planJson -Encoding UTF8
Write-Host "  OK: tasks.json translated." -ForegroundColor Green

Write-Host "=== 2. Fixing UI & Rebuilding Book ===" -ForegroundColor Cyan
$appJs = "Docs\ArchitectureBook\app.js"
$js = [System.IO.File]::ReadAllText($appJs, [System.Text.Encoding]::UTF8)
if ($js -notmatch 'description_fa') {
    $js = $js -replace '(container\.appendChild\(el\(''div'', \{ class: ''t-field'', text: .*? \+ task\.description.*?)\);)', 'const lang = localStorage.getItem("book_lang") || "en"; const desc = lang === "fa" && task.description_fa ? task.description_fa : task.description; $1.replace(/task\.description/g, "desc");'
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

# Fix CSS and HTML
$cssPath = "Docs\ArchitectureBook\style.css"
$css = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)
$css = $css -replace '(?s)/\* Top Right UI Toggles \*/.*?(?=\z|/\*)', ''
$css += "`r`n#lang-toggle { position: fixed; top: 15px; right: 65px; z-index: 9999; background: var(--bg3); color: var(--fg); border: 1px solid var(--fg3); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-family: sans-serif; font-weight: bold; font-size: 12px; }`r`n[dir='rtl'] #lang-toggle { right: auto; left: 65px; }`r`n"
[System.IO.File]::WriteAllText($cssPath, $css, $utf8NoBom)

$htmlPath = "Docs\ArchitectureBook\index.html"
$html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
$html = $html -replace '<button id="lang-toggle"[^>]*>', '<button id="lang-toggle">'
[System.IO.File]::WriteAllText($htmlPath, $html, $utf8NoBom)

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "Docs\ArchitectureBook\build-book.ps1" | Select-Object -Last 1

Write-Host "=== 3. Committing ===" -ForegroundColor Cyan
& git add -A 2>&1 | Out-Null
& git commit -m "feat(book): translate tasks via Ollama API and fix UI toggle position" 2>&1 | Out-Null
& git push origin P04 2>&1 | Out-Null

Write-Host "=== DONE ===" -ForegroundColor Green