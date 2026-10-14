$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing.Common

function Format-Point([single]$taskValue) {
    $taskValue.ToString('0.###', [System.Globalization.CultureInfo]::InvariantCulture)
}

function Read-Glyph([string]$taskText, [string]$taskFamily) {
    $taskFont = [System.Drawing.FontFamily]::new($taskFamily)
    $taskPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    try {
        $taskPath.AddString($taskText, $taskFont, 0, 100, [System.Drawing.PointF]::new(0,0), [System.Drawing.StringFormat]::GenericTypographic)
        $taskBounds = $taskPath.GetBounds()
        $taskPoints = $taskPath.PathPoints
        $taskTypes = $taskPath.PathTypes
        $taskBuilder = [System.Text.StringBuilder]::new()
        for ($taskIndex = 0; $taskIndex -lt $taskPoints.Length; $taskIndex++) {
            $taskKind = $taskTypes[$taskIndex] -band 7
            $taskPair = (Format-Point $taskPoints[$taskIndex].X) + ',' + (Format-Point $taskPoints[$taskIndex].Y)
            if ($taskKind -eq 0) { [void]$taskBuilder.Append('M' + $taskPair) }
            elseif ($taskKind -eq 1) { [void]$taskBuilder.Append('L' + $taskPair) }
            elseif ($taskKind -eq 3) {
                $taskPairB = (Format-Point $taskPoints[$taskIndex+1].X) + ',' + (Format-Point $taskPoints[$taskIndex+1].Y)
                $taskPairC = (Format-Point $taskPoints[$taskIndex+2].X) + ',' + (Format-Point $taskPoints[$taskIndex+2].Y)
                [void]$taskBuilder.Append('C' + $taskPair + ' ' + $taskPairB + ' ' + $taskPairC)
                $taskIndex += 2
            }
            if (($taskTypes[$taskIndex] -band 128) -ne 0) { [void]$taskBuilder.Append('Z') }
        }
        return @{ path = $taskBuilder.ToString(); bounds = @($taskBounds.X,$taskBounds.Y,$taskBounds.Width,$taskBounds.Height) }
    } finally {
        $taskPath.Dispose()
        $taskFont.Dispose()
    }
}

$taskGlyphs = @{}
foreach ($taskChar in '一二三四五六七八九萬'.ToCharArray()) {
    $taskGlyphs[[string]$taskChar] = Read-Glyph ([string]$taskChar) 'KaiTi'
}
$taskLabelCharacters = '四川麻将牌面校对万条筒一二三四五六七八九清晰独立素材数字图案逐张核验原创绘制'.ToCharArray() | Select-Object -Unique
foreach ($taskChar in $taskLabelCharacters) {
    $taskGlyphs['label-' + [string]$taskChar] = Read-Glyph ([string]$taskChar) 'Microsoft YaHei'
}
$taskAssetRoot = Join-Path $PSScriptRoot '..\assets\tiles'
New-Item -ItemType Directory -Path $taskAssetRoot -Force | Out-Null
$taskGlyphs | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $taskAssetRoot 'glyphs.json')
'Exported actual Chinese glyph outlines.'

