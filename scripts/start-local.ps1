[CmdletBinding()]
param(
    [ValidateSet('Start', 'Stop', 'Status')][string]$Action = 'Start',
    [switch]$Rebuild,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$composeArgs = @('compose', '--project-directory', $repoRoot, '-p', 'campusloop-local',
    '-f', (Join-Path $repoRoot 'docker-compose.yml'), '-f', (Join-Path $repoRoot 'compose.local.yml'))
$runtimeFolder = Join-Path $repoRoot '.codex-tmp/local-runtime'
$frontendRecord = Join-Path $runtimeFolder 'frontend.json'
$frontendRoot = Join-Path $repoRoot 'frontend'
$vitePath = Join-Path $frontendRoot 'node_modules/vite/bin/vite.js'
$site = 'http://127.0.0.1:5174'

function Invoke-DockerChecked([string[]]$Arguments) {
    & docker @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'Docker command failed. See the error above; no alternate database was selected.' }
}

function Get-SourceFingerprint {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $parts = foreach ($folder in @('backend', 'services', 'scripts', 'schemas', 'contracts', 'data')) {
            Get-ChildItem -LiteralPath (Join-Path $repoRoot $folder) -Recurse -File |
                Where-Object { $_.FullName -notmatch '[\\/](\.venv|venv|__pycache__|\.pytest_cache|\.ruff_cache)[\\/]' -and $_.Name -notlike '.env*' -and $_.Extension -notin @('.pyc', '.pyo') } |
                ForEach-Object { $_.FullName.Substring($repoRoot.Length) + ':' + (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
        }
        $bytes = [Text.Encoding]::UTF8.GetBytes((($parts | Sort-Object) -join "`n"))
        return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant()
    } finally { $sha.Dispose() }
}

function Get-OwnedFrontend {
    if (-not (Test-Path -LiteralPath $frontendRecord)) { return $null }
    $record = Get-Content -LiteralPath $frontendRecord -Raw | ConvertFrom-Json
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($record.pid)" -ErrorAction SilentlyContinue
    if ($process -and $process.CreationDate.ToUniversalTime().ToString('o') -eq $record.createdAt -and $process.CommandLine.Contains($vitePath)) { return $process }
    return $null
}

function Assert-DailyData {
    $apiId = & docker @composeArgs ps -q api
    if (-not $apiId) { throw 'The daily API is not running. Start it with this script.' }
    $apiInfo = (& docker inspect $apiId | ConvertFrom-Json)[0]
    if ('DATABASE_URL=postgresql+psycopg://campusloop:campusloop@db:5432/campusloop' -notin $apiInfo.Config.Env) {
        throw 'Daily API database does not match the fixed configuration. Refusing to open the website.'
    }
    $dbId = & docker @composeArgs ps -q db
    $dbInfo = (& docker inspect $dbId | ConvertFrom-Json)[0]
    if (-not ($dbInfo.Mounts | Where-Object { $_.Name -eq 'campusloop-local-db' -and $_.Destination -eq '/var/lib/postgresql/data' })) {
        throw 'Daily database volume does not match campusloop-local-db.'
    }
    $null = Invoke-WebRequest 'http://127.0.0.1:8001/ready' -UseBasicParsing -TimeoutSec 10
    Write-Host 'Daily database verified: campusloop-local-db / campusloop.'
}

Push-Location $repoRoot
try {
    if ($Action -eq 'Stop') {
        $frontendProcess = Get-OwnedFrontend
        if ($frontendProcess) { Stop-Process -Id $frontendProcess.ProcessId }
        Invoke-DockerChecked ($composeArgs + @('stop'))
        Write-Host 'Stopped. Accounts, listings and images remain in persistent volumes.'
        return
    }
    if ($Action -eq 'Status') {
        Invoke-DockerChecked ($composeArgs + @('ps'))
        Assert-DailyData
        Write-Host "Website: $site/market"
        return
    }
    foreach ($dependency in @('docker', 'node', 'python')) {
        if (-not (Get-Command $dependency -ErrorAction SilentlyContinue)) { throw "Missing command: $dependency" }
    }
    if (-not (Test-Path -LiteralPath $vitePath)) { throw 'Run npm ci in frontend first.' }
    & python backend/scripts/init_local.py
    if ($LASTEXITCODE -ne 0) { throw 'Could not initialise local secrets.' }
    $fingerprint = Get-SourceFingerprint
    $imageId = & docker image ls --filter 'reference=campusloop-local-api:dev' -q
    $imageFingerprint = if ($imageId) { ((& docker image inspect $imageId | ConvertFrom-Json)[0]).Config.Labels.'campusloop.sourceFingerprint' } else { '' }
    if ($Rebuild -or -not $imageId -or $imageFingerprint -ne $fingerprint) {
        Invoke-DockerChecked @('build', '-f', 'backend/Dockerfile', '-t', 'campusloop-local-api:dev',
            '--label', "campusloop.sourceFingerprint=$fingerprint", '.')
    }
    $storageImage = & docker image ls --filter 'reference=campusloop-local-minio:dev' -q
    if (-not $storageImage) {
        Invoke-DockerChecked @('build', '-f', 'Dockerfile.minio', '-t', 'campusloop-local-minio:dev', '.')
    }
    New-Item -ItemType Directory -Force -Path $runtimeFolder | Out-Null
    Invoke-DockerChecked ($composeArgs + @('up', '-d', '--no-build', '--wait', '--wait-timeout', '120'))
    Assert-DailyData
    if (-not (Get-OwnedFrontend)) {
        if (Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue) {
            throw 'Port 5174 is occupied by another process. No alternate port or environment will be selected.'
        }
        $priorBase = $env:VITE_API_BASE_URL
        try {
            $env:VITE_API_BASE_URL = 'http://127.0.0.1:8001'
            $started = Start-Process -FilePath (Get-Command node).Source -WorkingDirectory $frontendRoot -WindowStyle Hidden -PassThru `
                -ArgumentList @(('"' + $vitePath + '"'), '--host', '127.0.0.1', '--port', '5174', '--strictPort') `
                -RedirectStandardOutput (Join-Path $runtimeFolder 'frontend.log') -RedirectStandardError (Join-Path $runtimeFolder 'frontend-error.log')
            $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($started.Id)"
            @{ pid = $started.Id; createdAt = $process.CreationDate.ToUniversalTime().ToString('o') } |
                ConvertTo-Json | Set-Content -LiteralPath $frontendRecord -Encoding UTF8
        } finally { $env:VITE_API_BASE_URL = $priorBase }
    }
    $deadline = (Get-Date).AddSeconds(20)
    do {
        try { $null = Invoke-WebRequest "$site/market" -UseBasicParsing -TimeoutSec 2; break }
        catch { if ((Get-Date) -gt $deadline) { throw 'Frontend did not start. Inspect .codex-tmp/local-runtime/frontend-error.log.' }; Start-Sleep -Milliseconds 250 }
    } while ($true)
    $branch = & git branch --show-current
    $revision = & git rev-parse --short HEAD
    Write-Host "Code: $repoRoot | $branch | $revision"
    Write-Host "Website: $site/market"
    if (-not $NoBrowser) { Start-Process "$site/market" }
} finally { Pop-Location }
