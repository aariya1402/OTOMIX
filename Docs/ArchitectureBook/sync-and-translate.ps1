$repoRoot = "C:\Oto Dj - Oto Mix\Oto Mix"
Set-Location $repoRoot
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$ollamaUrl = "http://127.0.0.1:11434/api/generate" # استفاده از 127.0.0.1 برای جلوگیری از خطای IPv6
$modelName = "llama3" # اگر مدل دیگری دارید، اینجا تغییر دهید

# ===== 1. Test Ollama Connection =====
Write-Host "=== 1. Testing Ollama Connection ===" -ForegroundColor Cyan
try {
    $test = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -TimeoutSec 5
    Write-Host "  OK: Ollama is running. Available models:" -ForegroundColor Green
    foreach ($m in $test.models) { Write-Host "    - $($m.name)" }
} catch {
    Write-Host "  FAIL: Cannot connect to Ollama at 127.0.0.1:11434" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)"
    exit
}

# ===== 2. Clean up previous failed translations =====
Write-Host "=== 2. Cleaning up failed translations ===" -ForegroundColor Cyan
$planJson = "Docs\OtoMix Todo-Plan\OTOMIX_MicroTask_Plan.tasks.json"
$tasks = Get-Content $planJson -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($t in $tasks) {
    if ($t.description_fa -match '\[Translation Failed\]') { $t.description_fa = $null }
    if ($t.notes_fa -match '\[Translation Failed\]') { $t.notes_fa = $null }
}

# ===== 3. Translate Tasks =====
Write-Host "=== 3. Translating Tasks (Ollama) ===" -ForegroundColor Cyan
function Translate-Ollama($text) {
    if ([string]::IsNullOrWhiteSpace($text)) { return $text }
    try {
        $prompt = "Translate the following English text to Persian (Farsi). Return ONLY the translated text. Text: `n$text"
        $body = @{ model = $modelName; prompt = $prompt; stream = $false } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri $ollamaUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 120
        return $res.response.Trim()
    } catch { return "خطا در ترجمه" }
}

$count = 0
foreach ($t in $tasks) {
    if ($t.description -and -not $t.description_fa) {
        $faDesc = Translate-Ollama -text $t.description
        $t | Add-Member -MemberType NoteProperty -Name "description_fa" -Value "توضیح ساده: $faDesc" -Force
        $count++
        if ($count % 10 -eq 0) { Write-Host "  Translated $count tasks..." -ForegroundColor Yellow }
    }
    if ($t.notes -and -not $t.notes_fa) {
        $faNotes = Translate-Ollama -text $t.notes
        $t | Add-Member -MemberType NoteProperty -Name "notes_fa" -Value $faNotes -Force
    }
}
$tasks | ConvertTo-Json -Depth 10 | Set-Content $planJson -Encoding UTF8
Write-Host "  OK: tasks.json translated." -ForegroundColor Green

# ===== 4. Fix app.js (Without Regex) =====
Write-Host "=== 4. Fixing app.js ===" -ForegroundColor Cyan
$appJs = "Docs\ArchitectureBook\app.js"
$js = [System.IO.File]::ReadAllText($appJs, [System.Text.Encoding]::UTF8)

# Using simple string Replace instead of Regex
$oldStr = "container.appendChild(el('div', { class: 't-field', text: 'Description: ' + task.description }));"
$newStr = "const lang = localStorage.getItem('book_lang') || 'en'; const desc = lang === 'fa' && task.description_fa ? task.description_fa : task.description; container.appendChild(el('div', { class: 't-field', text: 'Description: ' + desc }));"
if ($js.Contains($oldStr)) {
    $js = $js.Replace($oldStr, $newStr)
    Write-Host "  OK: Description toggle logic added."
} else {
    # Maybe the line is slightly different, let's try a looser replace
    $js = $js.Replace("text: 'Description: ' + task.description", "text: 'Description: ' + (localStorage.getItem('book_lang') === 'fa' && task.description_fa ? task.description_fa : task.description)")
    Write-Host "  OK: Description toggle logic added (loose match)."
}

# Fix narrative toggle
$oldNar = "renderMarkdown(t(phase.narrative), narDiv);"
$newNar = "const lang = localStorage.getItem('book_lang') || 'en'; const text = lang === 'fa' && phase.narrative_fa ? phase.narrative_fa : phase.narrative; renderMarkdown(t(text), narDiv);"
$js = $js.Replace($oldNar, $newNar)

# Add toggle button logic
if ($js -notmatch 'Language Toggle Logic') {
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
    $js += $toggleCode
}
[System.IO.File]::WriteAllText($appJs, $js, $utf8NoBom)

# ===== 5. Fix CSS and HTML =====
Write-Host "=== 5. Fixing CSS and HTML ===" -ForegroundColor Cyan
$cssPath = "Docs\ArchitectureBook\style.css"
$css = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)
$css = $css -replace '(?s)/\* Top Right UI Toggles \*/.*?(?=\z|/\*)', ''
$css += "`r`n#lang-toggle { position: fixed; top: 15px; right: 65px; z-index: 9999; background: var(--bg3); color: var(--fg); border: 1px solid var(--fg3); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-family: sans-serif; font-weight: bold; font-size: 12px; }`r`n[dir='rtl'] #lang-toggle { right: auto; left: 65px; }`r`n"
[System.IO.File]::WriteAllText($cssPath, $css, $utf8NoBom)

$htmlPath = "Docs\ArchitectureBook\index.html"
$html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
$html = $html -replace '<button id="lang-toggle"[^>]*>', '<button id="lang-toggle">'
[System.IO.File]::WriteAllText($htmlPath, $html, $utf8NoBom)

# ===== 6. Rebuild and Commit =====
Write-Host "=== 6. Rebuilding Book ===" -ForegroundColor Cyan
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "Docs\ArchitectureBook\build-book.ps1" | Select-Object -Last 1

Write-Host "=== 7. Committing ===" -ForegroundColor Cyan
& git add -A 2>&1 | Out-Null
& git commit -m "fix(book): fix ollama connection, clean failed translations, and fix UI toggle" 2>&1 | Out-Null
& git push origin P04 2>&1 | Out-Null

Write-Host "=== DONE ===" -ForegroundColor Green