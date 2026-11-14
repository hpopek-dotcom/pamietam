# Renders icons/icon.svg to the PNG sizes iOS and the PWA need, using headless Chrome.
# The iOS app icon (1024) is flattened onto an opaque background: iOS rejects transparency.
param([string]$Svg = (Join-Path $PSScriptRoot '..\icons\icon.svg'))

$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$iconsDir = Split-Path -Parent (Resolve-Path $Svg)
$svgText = [IO.File]::ReadAllText((Resolve-Path $Svg))
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('pamietam-icons-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp | Out-Null
Add-Type -AssemblyName System.Drawing

try {
  foreach ($size in 180, 192, 512, 1024) {
    $html = Join-Path $tmp "icon-$size.html"
    $page = "<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style></head><body>$svgText</body></html>"
    [IO.File]::WriteAllText($html, $page, (New-Object System.Text.UTF8Encoding $false))
    $raw = Join-Path $tmp "raw-$size.png"
    $chromeArgs = @('--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
      "`"--user-data-dir=$tmp\profile`"", "--window-size=$size,$size", "`"--screenshot=$raw`"", "`"file:///$($html -replace '\\','/')`"")
    Start-Process -FilePath $chrome -ArgumentList $chromeArgs -Wait -WindowStyle Hidden
    if (-not (Test-Path $raw)) { throw "Chrome nie wyrenderowal $raw" }

    # Flatten onto the icon's own corner-free background so no transparent pixels remain.
    $src = [System.Drawing.Image]::FromFile($raw)
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear($src.GetPixel([int]($size / 2), 2))
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose(); $src.Dispose()
    $bmp.Save((Join-Path $iconsDir "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "icon-$size.png"
  }
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
