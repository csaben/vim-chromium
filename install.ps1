param([string]$Repo = "csaben/vim-chromium")
$ErrorActionPreference = "Stop"
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("vim-chromium-" + [guid]::NewGuid())
$archive = Join-Path $temp "source.zip"
$null = New-Item -ItemType Directory -Path $temp
try {
  Invoke-WebRequest -UseBasicParsing "https://github.com/$Repo/archive/refs/heads/main.zip" -OutFile $archive
  Expand-Archive -LiteralPath $archive -DestinationPath $temp
  $folder = Join-Path $temp "vim-chromium-main"
  Write-Host "Downloaded extension to: $folder"
  Write-Host "Open chrome://extensions, enable Developer mode, choose Load unpacked, and select that folder."
} finally { Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue }
