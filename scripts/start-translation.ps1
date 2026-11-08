[CmdletBinding()]
param([switch]$Prepare, [ValidateSet('Start', 'Stop')][string]$Action = 'Start')
$ErrorActionPreference = 'Stop'
$translationRoot = Split-Path -Parent $PSScriptRoot
$translationPython = Join-Path $translationRoot '.codex-tmp/i18n-venv/Scripts/python.exe'
$translationRuntime = Join-Path $translationRoot '.codex-tmp/translation-runtime'
$translationScript = Join-Path $translationRoot 'services/catalog_translation_server.py'
$translationRecord = Join-Path $translationRuntime 'process.json'
New-Item -ItemType Directory -Force -Path $translationRuntime | Out-Null
function Stop-OwnedTranslation {
    if (-not (Test-Path -LiteralPath $translationRecord)) { return }
    $translationSaved = Get-Content -LiteralPath $translationRecord -Raw | ConvertFrom-Json
    $translationOwner = Get-CimInstance Win32_Process -Filter "ProcessId=$($translationSaved.pid)" -ErrorAction SilentlyContinue
    if ($translationOwner -and $translationOwner.CommandLine.Contains($translationScript)) {
        Stop-Process -Id $translationOwner.ProcessId
    }
}
if ($Action -eq 'Stop') { Stop-OwnedTranslation; return }
if ($Prepare) {
    if (-not (Test-Path -LiteralPath $translationPython)) {
        & python -m venv --system-site-packages (Join-Path $translationRoot '.codex-tmp/i18n-venv')
        if ($LASTEXITCODE -ne 0) { throw 'Could not create translation environment.' }
    }
    & $translationPython -m pip install -r (Join-Path $translationRoot 'services/catalog_translation_requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Translation dependencies could not be installed.' }
    & $translationPython (Join-Path $translationRoot 'services/catalog_translation_server.py') --prepare
    if ($LASTEXITCODE -ne 0) { throw 'Translation models could not be prepared.' }
}
if (-not (Test-Path -LiteralPath $translationPython)) {
    throw 'Run scripts/start-translation.ps1 -Prepare once to install the local translation models.'
}
try {
    $translationHealth = Invoke-RestMethod 'http://127.0.0.1:18790/health' -TimeoutSec 2
    if ($translationHealth.service -ne 'campusloop-catalog-translation-v1') { throw 'Port 18790 belongs to another service.' }
    $translationHasher = [System.Security.Cryptography.SHA256]::Create()
    try {
        $translationSource = [System.IO.File]::ReadAllBytes($translationScript) + [System.IO.File]::ReadAllBytes((Join-Path $translationRoot 'services/catalog_translation_glossary.json'))
        $translationRevision = [BitConverter]::ToString($translationHasher.ComputeHash([byte[]]$translationSource)).Replace('-', '').ToLowerInvariant()
    } finally { $translationHasher.Dispose() }
    if ($translationHealth.revision -eq $translationRevision) { return }
    Stop-OwnedTranslation
    if (Get-NetTCPConnection -LocalPort 18790 -State Listen -ErrorAction SilentlyContinue) { throw 'Existing translation service could not be updated.' }
} catch {
    if (Get-NetTCPConnection -LocalPort 18790 -State Listen -ErrorAction SilentlyContinue) { throw }
}
$translationProcess = Start-Process -FilePath $translationPython -WindowStyle Hidden -PassThru -WorkingDirectory $translationRoot `
    -ArgumentList @('"' + $translationScript + '"') `
    -RedirectStandardOutput (Join-Path $translationRuntime 'stdout.log') -RedirectStandardError (Join-Path $translationRuntime 'stderr.log')
@{ pid = $translationProcess.Id; port = 18790 } | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $translationRecord
Write-Host 'Local catalogue translation: http://127.0.0.1:18790'
