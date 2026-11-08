param([int]$Limit = 0, [string]$IndexName = 'index.json', [string]$OutputName = 'ocr.jsonl')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType=WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType=WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
function Await($Operation, [Type]$ResultType) {
    $task = $asTask.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $task.GetAwaiter().GetResult()
}
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (-not $engine) { throw 'No local OCR language is available.' }
$index = Get-Content -LiteralPath (Join-Path $PSScriptRoot $IndexName) -Raw -Encoding UTF8 | ConvertFrom-Json
$outPath = Join-Path $PSScriptRoot $OutputName
$done = @{}
if (Test-Path -LiteralPath $outPath) {
    Get-Content -LiteralPath $outPath -Encoding UTF8 | ForEach-Object { $r = $_ | ConvertFrom-Json; if (-not $r.error) { $done[$r.path] = $true } }
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
$writer = New-Object System.IO.StreamWriter($outPath, $true, $utf8)
$count = 0
try {
    foreach ($item in $index) {
        if ($done.ContainsKey($item.path)) { continue }
        try {
            $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($item.path)) ([Windows.Storage.StorageFile])
            $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
            try {
                $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
                $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
                try {
                    $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
                    $lines = @($result.Lines | ForEach-Object {
                        @{ text = $_.Text; words = @($_.Words | ForEach-Object {
                            @{ text = $_.Text; x = $_.BoundingRect.X; y = $_.BoundingRect.Y; w = $_.BoundingRect.Width; h = $_.BoundingRect.Height }
                        }) }
                    })
                    $record = @{batch=$item.batch; image=$item.image; path=$item.path; text=$result.Text; lines=$lines}
                    $writer.WriteLine(($record | ConvertTo-Json -Compress -Depth 7))
                } finally { $bitmap.Dispose() }
            } finally { $stream.Dispose() }
        } catch {
            $writer.WriteLine((@{batch=$item.batch; image=$item.image; path=$item.path; error=$_.Exception.Message} | ConvertTo-Json -Compress))
        }
        $writer.Flush()
        $count++
        if ($count % 25 -eq 0) { Write-Output "OCR completed $count images" }
        if ($Limit -gt 0 -and $count -ge $Limit) { break }
    }
} finally { $writer.Dispose() }
Write-Output "OCR finished $count images"
