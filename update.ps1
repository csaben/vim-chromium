param([string]$Repo = "csaben/vim-chromium", [string]$Folder)
$ErrorActionPreference = "Stop"

# One-off refresh of the extension files on disk. The extension itself watches those files and
# reloads within about a second, so there is nothing to schedule and no browser step afterwards.

if (-not $Folder) {
  if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "manifest.json"))) { $Folder = $PSScriptRoot }
  else { $Folder = Join-Path $env:LOCALAPPDATA "VimChromium" }
}

function Get-ExtVersion([string]$path) {
  $file = Join-Path $path "manifest.json"
  if (Test-Path $file) { return (Get-Content -Raw $file | ConvertFrom-Json).version }
  return "none"
}

$before = Get-ExtVersion $Folder

if (Test-Path (Join-Path $Folder ".git")) {
  & git -C $Folder pull --ff-only --quiet
  if ($LASTEXITCODE -ne 0) { throw "git pull failed in $Folder (local changes? run git status there)" }
} else {
  $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("vim-chromium-" + [guid]::NewGuid())
  $archive = Join-Path $temp "source.zip"
  $null = New-Item -ItemType Directory -Path $temp
  try {
    Invoke-WebRequest -UseBasicParsing "https://github.com/$Repo/archive/refs/heads/main.zip" -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath $temp
    $null = New-Item -ItemType Directory -Force -Path $Folder
    Copy-Item -Path (Join-Path $temp "vim-chromium-main/*") -Destination $Folder -Recurse -Force
  } finally { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue }
}

$after = Get-ExtVersion $Folder
if ($before -eq $after) { Write-Host "Files refreshed, version unchanged: $after ($Folder)" }
else { Write-Host "Updated $before -> $after ($Folder)" }
Write-Host "Chrome reloads the extension by itself within a second or two."
