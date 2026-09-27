[CmdletBinding()]
param(
    [string]$NasRoot = '\\192.168.2.204\Si-Ware Apps\Company Portal',
    [string]$AppDataPath = (Join-Path $env:USERPROFILE 'admin-helpdesk-data'),
    [int]$RetentionDays = 180,
    [switch]$PruneSynologyBackups,
    [switch]$ScheduledInvocation
)

$ErrorActionPreference = 'Stop'

function Invoke-RobocopySafe {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string]$Destination,
        [string[]]$ExtraArguments = @()
    )

    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    & robocopy.exe $Source $Destination /E /Z /FFT /R:3 /W:10 /COPY:DAT /DCOPY:DAT /XJ @ExtraArguments
    if ($LASTEXITCODE -ge 8) {
        throw "Copy to '$Destination' failed (Robocopy exit code $LASTEXITCODE)."
    }
}

$configPath = Join-Path $AppDataPath 'synology-backup.json'
$config = $null
if (Test-Path -LiteralPath $configPath -PathType Leaf) {
    try { $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json } catch { $config = $null }
}

function Set-ConfigValue {
    param([Parameter(Mandatory)][string]$Name, $Value)
    if ($null -eq $config) { return }
    if ($null -eq $config.PSObject.Properties[$Name]) {
        $config | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
    } else {
        $config.$Name = $Value
    }
}

function Save-ConfigState {
    if ($null -eq $config) { return }
    $temporary = "$configPath.$PID.tmp"
    $config | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $temporary -Encoding utf8
    Move-Item -LiteralPath $temporary -Destination $configPath -Force
}

if ($null -ne $config) {
    if ($config.nasRoot -is [string] -and $config.nasRoot.StartsWith('\\')) { $NasRoot = $config.nasRoot }
    if ($config.retentionDays -is [int] -and $config.retentionDays -ge 30) { $RetentionDays = $config.retentionDays }
    if ($config.pruneOldBackups -is [bool]) { $PruneSynologyBackups = [bool]$config.pruneOldBackups }

    if ($ScheduledInvocation) {
        if ($config.enabled -ne $true) { exit 0 }
        $now = Get-Date
        $requestedAt = if ($config.runRequestedAt -is [string]) { $config.runRequestedAt } else { $null }
        $requestPending = $requestedAt -and ($requestedAt -ne $config.lastRequestHandledAt)
        $scheduledDue = $config.scheduleTime -eq $now.ToString('HH:mm')
        if (-not $requestPending -and -not $scheduledDue) { exit 0 }
        Set-ConfigValue -Name 'lastStartedAt' -Value $now.ToString('o')
        Save-ConfigState
    }
}

if ($RetentionDays -lt 30) {
    throw 'RetentionDays must be at least 30.'
}

if (-not (Get-Command docker.exe -ErrorAction SilentlyContinue)) {
    throw 'Docker Desktop is required to create the PostgreSQL recovery dump.'
}

if (-not (Test-Path -LiteralPath $AppDataPath -PathType Container)) {
    throw "Portal data folder not found: $AppDataPath"
}

# The NAS password is deliberately not accepted as a script parameter. Save the
# restricted NAS account once in Windows Credential Manager for 192.168.2.204.
if (-not (Test-Path -LiteralPath $NasRoot -PathType Container)) {
    throw "Cannot access '$NasRoot'. Add the NAS account for 192.168.2.204 to Windows Credential Manager, then run this again."
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dataDestination = Join-Path $NasRoot 'data'
$postgresDestination = Join-Path $NasRoot 'postgres'
$manifestDestination = Join-Path $NasRoot 'manifests'
$stage = Join-Path $env:TEMP ("company-portal-synology-$timestamp")
$dumpFile = "company-portal-$timestamp.sql.gz"
$containerDump = "/tmp/$dumpFile"
$localDump = Join-Path $stage $dumpFile

New-Item -ItemType Directory -Force -Path $stage, $dataDestination, $postgresDestination, $manifestDestination | Out-Null

try {
    # A logical dump is portable and consistent. Never copy PostgreSQL's live
    # Docker volume directly while the database is running.
    $dumpCommand = 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip -c > "' + $containerDump + '"'
    & docker.exe exec company-portal-db sh -c $dumpCommand
    if ($LASTEXITCODE -ne 0) {
        throw 'PostgreSQL dump failed.'
    }

    & docker.exe cp "company-portal-db:$containerDump" $localDump
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $localDump -PathType Leaf)) {
        throw 'Could not copy the PostgreSQL dump from the database container.'
    }

    Invoke-RobocopySafe -Source $AppDataPath -Destination $dataDestination -ExtraArguments @('/XD', 'synology-staging')
    Copy-Item -LiteralPath $localDump -Destination (Join-Path $postgresDestination $dumpFile) -Force

    $manifest = [ordered]@{
        createdAt        = (Get-Date).ToString('o')
        appDataSource    = $AppDataPath
        dataDestination  = $dataDestination
        postgresDump     = (Join-Path $postgresDestination $dumpFile)
        databaseContainer = 'company-portal-db'
        note             = 'Portal files copied without deletion mirroring; PostgreSQL is a logical gzip-compressed pg_dump.'
    } | ConvertTo-Json
    Set-Content -LiteralPath (Join-Path $manifestDestination "backup-$timestamp.json") -Value $manifest -Encoding utf8

    Set-ConfigValue -Name 'lastSuccessAt' -Value (Get-Date).ToString('o')
    Set-ConfigValue -Name 'lastFailureAt' -Value $null
    Set-ConfigValue -Name 'lastFailureMessage' -Value $null
    Set-ConfigValue -Name 'lastPostgresDump' -Value (Join-Path $postgresDestination $dumpFile)
    if ($ScheduledInvocation -and $requestedAt) { Set-ConfigValue -Name 'lastRequestHandledAt' -Value $requestedAt }
    Save-ConfigState

    if ($PruneSynologyBackups) {
        $cutoff = (Get-Date).AddDays(-$RetentionDays)
        Get-ChildItem -LiteralPath $postgresDestination -File -Filter 'company-portal-*.sql.gz' |
            Where-Object { $_.LastWriteTime -lt $cutoff } |
            Remove-Item -Force
        Get-ChildItem -LiteralPath $manifestDestination -File -Filter 'backup-*.json' |
            Where-Object { $_.LastWriteTime -lt $cutoff } |
            Remove-Item -Force
    }

    Write-Host "Synology recovery backup completed: $NasRoot"
}
catch {
    if ($ScheduledInvocation -and $requestedAt) { Set-ConfigValue -Name 'lastRequestHandledAt' -Value $requestedAt }
    Set-ConfigValue -Name 'lastFailureAt' -Value (Get-Date).ToString('o')
    Set-ConfigValue -Name 'lastFailureMessage' -Value $_.Exception.Message
    Save-ConfigState
    throw
}
finally {
    & docker.exe exec company-portal-db rm -f $containerDump 2>$null | Out-Null
    if (Test-Path -LiteralPath $stage) {
        Remove-Item -LiteralPath $stage -Recurse -Force
    }
}
