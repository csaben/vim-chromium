param(
  [string]$Repo = "csaben/vim-chromium",
  [string]$Folder,
  [switch]$Register,
  [switch]$Unregister,
  [int]$Minutes = 10
)
$ErrorActionPreference = "Stop"
$taskName = "VimChromiumUpdate"

if (-not $Folder) {
  if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "manifest.json"))) { $Folder = $PSScriptRoot }
  else { $Folder = Join-Path $env:LOCALAPPDATA "VimChromium" }
}

if ($Unregister) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed scheduled task: $taskName"
  return
}

if ($Register) {
  if (-not $PSCommandPath) { throw "Run -Register from a saved copy of update.ps1, not from a piped one-liner." }
  $arg = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $PSCommandPath + '" -Folder "' + $Folder + '" -Repo ' + $Repo
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arg
  $atLogon = New-ScheduledTaskTrigger -AtLogOn
  $repeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes $Minutes) -RepetitionDuration (New-TimeSpan -Days 3650)
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($atLogon, $repeat) -Settings $settings -Force | Out-Null
  Write-Host "Scheduled $taskName every $Minutes minutes for: $Folder"
  return
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
if ($before -eq $after) { Write-Host "Already current: $after ($Folder)" }
else { Write-Host "Updated $before -> $after ($Folder). Chrome reloads it within 5 minutes." }
