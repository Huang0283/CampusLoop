[CmdletBinding()]
param([ValidateSet('Start', 'Stop', 'Status')][string]$Action = 'Start')
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$recordDir = Join-Path $repo '.codex-tmp/local-runtime'
$recordPath = Join-Path $recordDir 'catalog-search.json'
$runtimePython = Join-Path $env:USERPROFILE '.cache/campusloop/catalog-runtime/Scripts/python.exe'
$model = Join-Path $env:USERPROFILE '.cache/campusloop/bge-small-zh-v1.5-7999e1d'
$sourceHash = (Get-FileHash -LiteralPath (Join-Path $repo 'services/catalog_semantic_server.py') -Algorithm SHA256).Hash
function Stop-OwnedSearch($owned) {
    # A Windows venv launcher can have a child Python process owning the socket.
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$($owned.ProcessId)" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine.Contains('services.catalog_semantic_server') -and $_.CommandLine.Contains((Join-Path $repo '.env')) } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
    Stop-Process -Id $owned.ProcessId -ErrorAction SilentlyContinue
}
$owner = $null
if (Test-Path -LiteralPath $recordPath) {
    $record = Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
    $candidate = Get-CimInstance Win32_Process -Filter "ProcessId=$($record.pid)" -ErrorAction SilentlyContinue
    if ($candidate -and $candidate.CreationDate.ToUniversalTime().ToString('o') -eq $record.createdAt -and $candidate.CommandLine.Contains('services.catalog_semantic_server') -and $candidate.CommandLine.Contains((Join-Path $repo '.env'))) { $owner = $candidate }
}
if ($Action -eq 'Stop') {
    if ($owner) { Stop-OwnedSearch $owner }
    return
}
if ($Action -eq 'Status') {
    if (-not $owner) { throw 'Local catalog model is not running.' }
    Invoke-RestMethod 'http://127.0.0.1:18789/health' -TimeoutSec 3
    return
}
if ($owner -and $record.sourceHash -ne $sourceHash) {
    Stop-OwnedSearch $owner
    $owner = $null
}
if (-not $owner) {
    if (Get-NetTCPConnection -LocalPort 18789 -State Listen -ErrorAction SilentlyContinue) { throw 'Catalog port 18789 belongs to another process.' }
    if (-not (Test-Path -LiteralPath $runtimePython)) { throw 'Missing isolated catalog-runtime. See docs/development/catalog-search-local.md.' }
    New-Item -ItemType Directory -Force -Path $recordDir | Out-Null
    $process = Start-Process -FilePath $runtimePython -WorkingDirectory $repo -WindowStyle Hidden -PassThru `
        -ArgumentList @('-m', 'services.catalog_semantic_server', '--model-dir', ('"' + $model + '"'), '--token-file', ('"' + (Join-Path $repo '.env') + '"')) `
        -RedirectStandardOutput (Join-Path $recordDir 'catalog-search.log') -RedirectStandardError (Join-Path $recordDir 'catalog-search-error.log')
    $info = Get-CimInstance Win32_Process -Filter "ProcessId=$($process.Id)"
    @{ pid=$process.Id; createdAt=$info.CreationDate.ToUniversalTime().ToString('o'); sourceHash=$sourceHash } | ConvertTo-Json | Set-Content -LiteralPath $recordPath -Encoding UTF8
}
$until = (Get-Date).AddSeconds(55)
do {
    try {
        $health = Invoke-RestMethod 'http://127.0.0.1:18789/health' -TimeoutSec 2
        if ($health.ready -and $health.version -eq 'live-bge-small-zh-v1') {
            $listener = Get-NetTCPConnection -LocalPort 18789 -State Listen | Select-Object -First 1
            $actual = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
            if (-not $actual.CommandLine.Contains('services.catalog_semantic_server') -or -not $actual.CommandLine.Contains((Join-Path $repo '.env'))) { throw 'Unexpected catalog process identity.' }
            @{ pid=$actual.ProcessId; createdAt=$actual.CreationDate.ToUniversalTime().ToString('o'); sourceHash=$sourceHash } | ConvertTo-Json | Set-Content -LiteralPath $recordPath -Encoding UTF8
            Write-Host 'Local Chinese semantic search ready.'
            return
        }
    } catch { }
    if ((Get-Date) -gt $until) { throw 'Catalog model did not start. Inspect .codex-tmp/local-runtime/catalog-search-error.log.' }
    Start-Sleep -Milliseconds 300
} while ($true)
