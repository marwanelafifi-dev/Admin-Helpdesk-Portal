[CmdletBinding()]
param(
    [string]$ScriptPath = (Join-Path $PSScriptRoot 'sync-synology-company-portal.ps1'),
    [string]$TaskName = 'Company Portal - Synology Recovery Backup',
    [string]$Time = ''
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) {
    throw "Backup script not found: $ScriptPath"
}

# This task intentionally uses the signed-in Windows account so it can access
# the NAS credential saved in that account's Windows Credential Manager.
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$ScriptPath`" -ScheduledInvocation"
$firstRun = if ($Time) { (Get-Date).Date.Add([TimeSpan]::Parse($Time)) } else { (Get-Date).AddMinutes(1) }
if ($firstRun -le (Get-Date)) { $firstRun = $firstRun.AddDays(1) }
# This Windows version permits repetition on a one-time trigger, not a daily
# trigger. A ten-year repetition window lets the portal control the exact
# daily time without requiring a host-side task update for every change.
$trigger = New-ScheduledTaskTrigger -Once -At $firstRun -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force -ErrorAction Stop | Out-Null
Write-Host "Scheduled '$TaskName' to check every five minutes. The Platform Administration Synology settings select the actual backup time. It runs while $env:USERNAME is signed in."
