$repoRoot = "C:\Oto Dj - Oto Mix\Oto Mix"
Set-Location $repoRoot
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$ollamaUrl = "http://127.0.0.1:11434/api/generate"
$modelName = "qwen3:4b-instruct-2507-q4_K_M" # مدل صحیح شما

Write-Host "=== 1. Translating Tasks with correct model ===" -ForegroundColor Cyan
$planJson = "Docs\OtoMix Todo-Plan\OTOMIX_MicroTask_Plan.tasks.json"
$tasks = Get-Content $planJson -Raw -Encoding UTF8 | ConvertFrom-Json

# پاکسازی ترجمه‌های ناموفق قبلی
foreach ($t in $tasks) {
    if ($t.description_fa -match '\[Translation Failed\]|خطا در ترجمه') { $t.description_fa = $null }
    if ($t.notes_fa -match '\[Translation Failed\]|خطا در ترجمه') { $t.notes_fa = $null }
}

function Translate-Ollama($text) {
    if ([string]::IsNullOrWhiteSpace($text)) { return $text }
    try {
        $prompt = "You are a professional translator. Translate the following English text to Persian (Farsi). Return ONLY the translated text, without any extra words or explanations. Text: `n$text"
        $body = @{ model = $modelName; prompt = $prompt; stream = $false; options = @{ temperature = 0.1 } } | ConvertTo-Json
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
        if ($count % 5 -eq 0) { Write-Host "  Translated $count tasks..." -ForegroundColor Yellow }
    }
    if ($t.notes -and -not $t.notes_fa) {
        $faNotes = Translate-Ollama -text $t.notes
        $t | Add-Member -MemberType NoteProperty -Name "notes_fa" -Value $faNotes -Force
    }
}
$tasks | ConvertTo-Json -Depth 10 | Set-Content $planJson -Encoding UTF8
Write-Host "  OK: tasks.json fully translated." -ForegroundColor Green

Write-Host "=== 2. Rebuilding Book ===" -ForegroundColor Cyan
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "Docs\ArchitectureBook\build-book.ps1" | Select-Object -Last 1

Write-Host "=== 3. Committing ===" -ForegroundColor Cyan
& git add -A 2>&1 | Out-Null
& git commit -m "fix(book): translate tasks with correct qwen3 model" 2>&1 | Out-Null
& git push origin P04 2>&1 | Out-Null

Write-Host "=== DONE ===" -ForegroundColor Green