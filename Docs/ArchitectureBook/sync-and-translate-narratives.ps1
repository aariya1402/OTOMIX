$ErrorActionPreference = 'Continue'
[Environment]::CurrentDirectory = (Get-Location).Path
$root = (Get-Location).Path

$logFile = 'Docs\ArchitectureBook\_ollama_run.log'
function Log($msg) {
    $line = '[' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '] ' + $msg
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

function Call-Ollama([string]$prompt) {
    $body = @{
        model = 'qwen3:4b-instruct-2507-q4_K_M'
        prompt = $prompt
        stream = $false
        options = @{ temperature = 0.2; num_predict = 1000; num_ctx = 8192 }
    } | ConvertTo-Json -Depth 5

    for ($try = 1; $try -le 3; $try++) {
        try {
            $resp = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/generate' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 900
            if ($resp.response -and $resp.response.Trim().Length -gt 0) { return $resp.response.Trim() }
        } catch {
            Log ("    ollama attempt " + $try + " failed: " + $_.Exception.Message)
            Start-Sleep -Seconds 5
        }
    }
    return $null
}

$phases = @('P01','P02','P03','P04','P05','P06','P07')
foreach ($phase in $phases) {
    $enPath = "Docs\ArchitectureBook\narratives\$phase\README.md"
    $faPath = "Docs\ArchitectureBook\narratives_fa\$phase\README.md"
    
    if (Test-Path -LiteralPath $enPath) {
        Log ("Translating $phase...")
        $enText = [System.IO.File]::ReadAllText($enPath)
        # Split by headings to chunk
        $chunks = $enText -split '(?m)(?=^## )'
        $faText = ""
        foreach ($chunk in $chunks) {
            if ([string]::IsNullOrWhiteSpace($chunk)) { continue }
            $prompt = "Translate the following English technical text to Persian (Farsi). Preserve ALL inline backticks, identifiers, file paths, function names, task IDs, phase IDs, GAP IDs exactly. Return ONLY the translation, no preamble.`n`n" + $chunk
            $faChunk = Call-Ollama $prompt
            if ($faChunk) {
                $faText += $faChunk + "`n`n"
            } else {
                Log ("  Failed to translate a chunk in $phase")
                $faText += $chunk + "`n`n" # Fallback to English
            }
            Start-Sleep -Seconds 1
        }
        
        $utf8Bom = [System.Text.UTF8Encoding]::new($true)
        [System.IO.File]::WriteAllText((Join-Path $root $faPath), $faText.Trim(), $utf8Bom)
        Log ("  $phase translated and saved.")
    }
}

# Rebuild the book
Log "Rebuilding book..."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'Docs\ArchitectureBook\build-book.ps1'