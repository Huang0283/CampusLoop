[CmdletBinding()]
param(
    [ValidateSet('Start', 'Stop', 'Status')][string]$Action = 'Start',
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$demoRoot = Split-Path -Parent $PSScriptRoot
$demoArgs = @('compose', '--project-directory', $demoRoot, '-p', 'campusloop-demo',
    '-f', (Join-Path $demoRoot 'docker-compose.yml'), '-f', (Join-Path $demoRoot 'compose.demo.yml'))
$demoRuntime = Join-Path $demoRoot '.codex-tmp/demo-runtime'
$demoRecord = Join-Path $demoRuntime 'frontend.json'
$demoVite = Join-Path $demoRoot 'frontend/node_modules/vite/bin/vite.js'

function Invoke-DemoDocker([string[]]$Arguments) {
    & docker @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'Demo Docker command failed; daily data was not selected.' }
}
function Get-DemoFrontend {
    if (-not (Test-Path -LiteralPath $demoRecord)) { return $null }
    $record = Get-Content -LiteralPath $demoRecord -Raw | ConvertFrom-Json
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($record.pid)" -ErrorAction SilentlyContinue
    if ($process -and $process.CreationDate.ToUniversalTime().ToString('o') -eq $record.createdAt -and $process.CommandLine.Contains($demoVite)) { return $process }
    return $null
}
Push-Location $demoRoot
try {
    if ($Action -eq 'Stop') {
        $process = Get-DemoFrontend
        if ($process) { Stop-Process -Id $process.ProcessId }
        Invoke-DemoDocker ($demoArgs + @('stop'))
        return
    }
    if ($Action -eq 'Status') {
        Invoke-DemoDocker ($demoArgs + @('ps'))
        Write-Host 'Synthetic demo: http://127.0.0.1:5198 | API: http://127.0.0.1:18026'
        return
    }
    if (-not (Test-Path -LiteralPath $demoVite)) { throw 'Run npm ci in frontend first.' }
    & python backend/scripts/init_local.py
    if ($LASTEXITCODE -ne 0) { throw 'Local configuration could not be initialized.' }
    if (-not (& docker image ls --filter 'reference=campusloop-local-minio:dev' -q)) {
        Invoke-DemoDocker @('build', '-f', 'Dockerfile.minio', '-t', 'campusloop-local-minio:dev', '.')
    }
    Invoke-DemoDocker ($demoArgs + @('up', '-d', '--build', '--wait', '--wait-timeout', '180'))
    $apiId = & docker @demoArgs ps -q api
    $apiInfo = (& docker inspect $apiId | ConvertFrom-Json)[0]
    if ('DATABASE_URL=postgresql+psycopg://campusloop:campusloop@db:5432/campusloop_demo' -notin $apiInfo.Config.Env) { throw 'Unexpected demo database.' }
    New-Item -ItemType Directory -Force -Path $demoRuntime | Out-Null
    if (-not (Get-DemoFrontend)) {
        if (Get-NetTCPConnection -LocalPort 5198 -State Listen -ErrorAction SilentlyContinue) { throw 'Demo port 5198 is occupied.' }
        $priorApi = $env:VITE_API_BASE_URL
        $priorDemo = $env:VITE_DEMO_MODE
        try {
            $env:VITE_API_BASE_URL = 'http://127.0.0.1:18026'
            $env:VITE_DEMO_MODE = 'true'
            $started = Start-Process -FilePath (Get-Command node).Source -WorkingDirectory (Join-Path $demoRoot 'frontend') -WindowStyle Hidden -PassThru `
                -ArgumentList @(('"' + $demoVite + '"'), '--host', '127.0.0.1', '--port', '5198', '--strictPort') `
                -RedirectStandardOutput (Join-Path $demoRuntime 'frontend.log') -RedirectStandardError (Join-Path $demoRuntime 'frontend-error.log')
            $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($started.Id)"
            @{ pid = $started.Id; createdAt = $process.CreationDate.ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $demoRecord -Encoding UTF8
        } finally { $env:VITE_API_BASE_URL = $priorApi; $env:VITE_DEMO_MODE = $priorDemo }
    }
    $deadline = (Get-Date).AddSeconds(20)
    do {
        try { $null = Invoke-WebRequest 'http://127.0.0.1:5198' -UseBasicParsing -TimeoutSec 2; break }
        catch { if ((Get-Date) -gt $deadline) { throw 'Demo frontend did not start; inspect its runtime log.' }; Start-Sleep -Milliseconds 250 }
    } while ($true)
    Write-Host 'Synthetic demo: http://127.0.0.1:5198 | API: http://127.0.0.1:18026'
    Write-Host 'Daily data stays at 5174 / 8001. Demo initialization preserves existing demo edits.'
    Write-Host "Branch: $(& git branch --show-current) | $(& git rev-parse --short HEAD)"
    if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:5198' }
} finally { Pop-Location }
