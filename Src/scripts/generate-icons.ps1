# Generates ImageMix app/tray/logo icons using System.Drawing.
# Output: Src/build/icons/{icon.png, tray.png, logo.png, icon.ico}
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path (Split-Path -Parent $here) 'build\icons'
if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

function New-RoundedPath([int]$w, [int]$h, [int]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc(0, 0, $d, $d, 180, 90)
  $path.AddArc($w - $d, 0, $d, $d, 270, 90)
  $path.AddArc($w - $d, $h - $d, $d, $d, 0, 90)
  $path.AddArc(0, $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-Logo([int]$size, [bool]$circle) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::Transparent)

  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $c1 = [System.Drawing.Color]::FromArgb(255, 91, 95, 199)   # indigo
  $c2 = [System.Drawing.Color]::FromArgb(255, 196, 77, 184)  # magenta
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)

  if ($circle) {
    $g.FillEllipse($brush, 0, 0, ($size - 1), ($size - 1))
  } else {
    $radius = [int]($size * 0.22)
    $path = New-RoundedPath $size $size $radius
    $g.FillPath($brush, $path)
    $path.Dispose()
  }

  # "IM" monogram
  $fontSize = [single]($size * 0.42)
  $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textRect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
  $g.DrawString('IM', $font, $white, $textRect, $fmt)

  $brush.Dispose(); $font.Dispose(); $white.Dispose(); $fmt.Dispose(); $g.Dispose()
  return $bmp
}

# icon.png (256 rounded square)
$icon = Draw-Logo 256 $false
$icon.Save((Join-Path $outDir 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)

# tray.png (32 rounded square)
$tray = Draw-Logo 32 $false
$tray.Save((Join-Path $outDir 'tray.png'), [System.Drawing.Imaging.ImageFormat]::Png)

# logo.png (256 circle for the floating bubble)
$logo = Draw-Logo 256 $true
$logo.Save((Join-Path $outDir 'logo.png'), [System.Drawing.Imaging.ImageFormat]::Png)

# icon.ico (wrap the 256 PNG into a single-entry ICO)
$pngPath = Join-Path $outDir 'icon.png'
$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$ico = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ico)
# ICONDIR
$bw.Write([UInt16]0)      # reserved
$bw.Write([UInt16]1)      # type = icon
$bw.Write([UInt16]1)      # count
# ICONDIRENTRY
$bw.Write([Byte]0)        # width 0 => 256
$bw.Write([Byte]0)        # height 0 => 256
$bw.Write([Byte]0)        # color count
$bw.Write([Byte]0)        # reserved
$bw.Write([UInt16]1)      # planes
$bw.Write([UInt16]32)     # bit count
$bw.Write([UInt32]$pngBytes.Length) # bytes in resource
$bw.Write([UInt32]22)     # offset (6 + 16)
$bw.Write($pngBytes)
$bw.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $outDir 'icon.ico'), $ico.ToArray())
$bw.Dispose(); $ico.Dispose()

$icon.Dispose(); $tray.Dispose(); $logo.Dispose()
Write-Host "Generated icons in $outDir"
Get-ChildItem $outDir | Select-Object Name, Length
