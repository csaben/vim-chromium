param([string]$Repo = "csaben/vim-chromium")
$ErrorActionPreference = "Stop"
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("vim-chromium-" + [guid]::NewGuid())
$folder = Join-Path $env:LOCALAPPDATA "VimChromium"
$archive = Join-Path $temp "source.zip"
$null = New-Item -ItemType Directory -Path $temp
try {
  Invoke-WebRequest -UseBasicParsing "https://github.com/$Repo/archive/refs/heads/main.zip" -OutFile $archive
  Expand-Archive -LiteralPath $archive -DestinationPath $temp
  $source = Join-Path $temp "vim-chromium-main"
  $null = New-Item -ItemType Directory -Force -Path $folder
  Copy-Item -Path (Join-Path $source '*') -Destination $folder -Recurse -Force
  Write-Host "Downloaded extension to: $folder"
  Write-Host "Open chrome://extensions, enable Developer mode, choose Load unpacked, and select that folder."
} finally { Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue }
