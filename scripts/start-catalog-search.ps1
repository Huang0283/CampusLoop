[CmdletBinding()]
param(
    [ValidateSet('Start', 'Stop', 'Status')][string]$Action = 'Start',
    [ValidateSet('daily', 'business', 'permission')][string]$Namespace = 'daily',
    [string]$RunId = 'run2'
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$recordDir = Join-Path $repo '.codex-tmp/local-runtime'
$recordPath = Join-Path $recordDir $(if ($Namespace -eq 'daily') { 'catalog-search.json' } else { "catalog-search-$Namespace.json" })
$catalogPort = @{ daily = 18789; business = 18790; permission = 18791 }[$Namespace]
$warmPort = @{ daily = 8001; business = 18024; permission = 18025 }[$Namespace]
if ($RunId -notmatch '^[a-z0-9][a-z0-9-]{0,19}$') { throw 'Invalid audit run ID.' }
$tokenFile = if ($Namespace -eq 'daily') { Join-Path $repo '.env' } else { Join-Path $repo ".codex-tmp/audit/$Namespace/$RunId/.env.audit" }
$runtimePython = Join-Path $env:USERPROFILE '.cache/campusloop/catalog-runtime/Scripts/python.exe'
$model = Join-Path $env:USERPROFILE '.cache/campusloop/bge-small-zh-v1.5-7999e1d'
$sourceHash = (Get-FileHash -LiteralPath (Join-Path $repo 'services/catalog_semantic_server.py') -Algorithm SHA256).Hash
function Stop-OwnedSearch($owned) {
    # A Windows venv launcher can have a child Python process owning the socket.
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$($owned.ProcessId)" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine.Contains('services.catalog_semantic_server') -and $_.CommandLine.Contains($tokenFile) } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
    Stop-Process -Id $owned.ProcessId -ErrorAction SilentlyContinue
}
$owner = $null
if (Test-Path -LiteralPath $recordPath) {
    $record = Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
    $candidate = Get-CimInstance Win32_Process -Filter "ProcessId=$($record.pid)" -ErrorAction SilentlyContinue
    if ($candidate -and $candidate.CreationDate.ToUniversalTime().ToString('o') -eq $record.createdAt -and $candidate.CommandLine.Contains('services.catalog_semantic_server') -and $candidate.CommandLine.Contains($tokenFile)) { $owner = $candidate }
}
if ($Action -eq 'Stop') {
    if ($owner) { Stop-OwnedSearch $owner }
    return
}
if ($Action -eq 'Status') {
    if (-not $owner) { throw 'Local catalog model is not running.' }
    Invoke-RestMethod "http://127.0.0.1:$catalogPort/health" -TimeoutSec 3
    return
}
if ($owner -and $record.sourceHash -ne $sourceHash) {
    Stop-OwnedSearch $owner
    $owner = $null
}
if (-not $owner) {
    if (Get-NetTCPConnection -LocalPort $catalogPort -State Listen -ErrorAction SilentlyContinue) { throw "Catalog port $catalogPort belongs to another process." }
    if (-not (Test-Path -LiteralPath $runtimePython)) { throw 'Missing isolated catalog-runtime. See docs/development/catalog-search-local.md.' }
    New-Item -ItemType Directory -Force -Path $recordDir | Out-Null
    $process = Start-Process -FilePath $runtimePython -WorkingDirectory $repo -WindowStyle Hidden -PassThru `
        -ArgumentList @('-m', 'services.catalog_semantic_server', '--model-dir', ('"' + $model + '"'), '--token-file', ('"' + $tokenFile + '"'), '--port', $catalogPort, '--warm-api', "http://127.0.0.1:$warmPort") `
        -RedirectStandardOutput (Join-Path $recordDir "catalog-search-$Namespace.log") -RedirectStandardError (Join-Path $recordDir "catalog-search-$Namespace-error.log")
    $info = Get-CimInstance Win32_Process -Filter "ProcessId=$($process.Id)"
    @{ pid=$process.Id; createdAt=$info.CreationDate.ToUniversalTime().ToString('o'); sourceHash=$sourceHash } | ConvertTo-Json | Set-Content -LiteralPath $recordPath -Encoding UTF8
}
$until = (Get-Date).AddSeconds(55)
do {
    try {
        $health = Invoke-RestMethod "http://127.0.0.1:$catalogPort/health" -TimeoutSec 2
        if ($health.ready -and $health.version -eq 'live-bge-small-zh-v1') {
            $listener = Get-NetTCPConnection -LocalPort $catalogPort -State Listen | Select-Object -First 1
            $actual = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
            if (-not $actual.CommandLine.Contains('services.catalog_semantic_server') -or -not $actual.CommandLine.Contains($tokenFile)) { throw 'Unexpected catalog process identity.' }
            @{ pid=$actual.ProcessId; createdAt=$actual.CreationDate.ToUniversalTime().ToString('o'); sourceHash=$sourceHash } | ConvertTo-Json | Set-Content -LiteralPath $recordPath -Encoding UTF8
            Write-Host "Local Chinese semantic search ready: $Namespace."
            return
        }
    } catch { }
    if ((Get-Date) -gt $until) { throw 'Catalog model did not start. Inspect .codex-tmp/local-runtime/catalog-search-error.log.' }
    Start-Sleep -Milliseconds 300
} while ($true)
