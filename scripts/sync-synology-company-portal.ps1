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
$historyPath = Join-Path $AppDataPath 'synology-backup-history.json'
$historyLimit = 50
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

function Test-GzipFile {
    param([Parameter(Mandatory)][string]$Path)
    $file = [System.IO.File]::OpenRead($Path)
    try {
        $gzip = [System.IO.Compression.GzipStream]::new($file, [System.IO.Compression.CompressionMode]::Decompress, $false)
        try {
            $buffer = New-Object byte[] 65536
            while ($gzip.Read($buffer, 0, $buffer.Length) -gt 0) { }
        } finally {
            $gzip.Dispose()
        }
    } finally {
        $file.Dispose()
    }
}

function Add-VerifiedHistory {
    param(
        [Parameter(Mandatory)]$Entry
    )

    $existingEntries = @()
    if (Test-Path -LiteralPath $historyPath -PathType Leaf) {
        try {
            $saved = Get-Content -LiteralPath $historyPath -Raw | ConvertFrom-Json
            if ($null -ne $saved.entries) { $existingEntries = @($saved.entries) }
        } catch {
            # A damaged history must not hide a newly verified recovery backup.
            $existingEntries = @()
        }
    }

    $history = [ordered]@{
        version = 1
        entries = @((@($Entry) + @($existingEntries)) | Select-Object -First $historyLimit)
    }
    $temporary = "$historyPath.$PID.tmp"
    $history | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $temporary -Encoding utf8
    Move-Item -LiteralPath $temporary -Destination $historyPath -Force
}

if ($null -ne $config) {
    if ($config.nasRoot -is [string] -and $config.nasRoot.StartsWith('\\')) { $NasRoot = $config.nasRoot }
    if ($config.retentionDays -is [int] -and $config.retentionDays -ge 30) { $RetentionDays = $config.retentionDays }
    if ($config.pruneOldBackups -is [bool]) { $PruneSynologyBackups = [bool]$config.pruneOldBackups }

    if ($ScheduledInvocation) {
        $now = Get-Date
        if ($config.scheduleUpdatedAt -is [string] -and $config.scheduleUpdatedAt -ne $config.lastAppliedScheduleUpdatedAt) {
            Set-ConfigValue -Name 'lastHostConfigAppliedAt' -Value $now.ToString('o')
            Set-ConfigValue -Name 'lastAppliedScheduleUpdatedAt' -Value $config.scheduleUpdatedAt
            Save-ConfigState
        }
        if ($config.enabled -ne $true) { exit 0 }
        $requestedAt = if ($config.runRequestedAt -is [string]) { $config.runRequestedAt } else { $null }
        $requestPending = $requestedAt -and ($requestedAt -ne $config.lastRequestHandledAt)
        $frequency = if ($config.scheduleFrequency -in @('daily', 'weekly', 'monthly', 'yearly')) { $config.scheduleFrequency } else { 'daily' }
        $scheduleTime = if ($config.scheduleTime -match '^([01]\d|2[0-3]):[0-5]\d$') { [TimeSpan]::Parse($config.scheduleTime) } else { [TimeSpan]::Parse('02:30') }
        $scheduledDue = $false
        $scheduledPeriod = $null
        if ($now.TimeOfDay -ge $scheduleTime) {
            switch ($frequency) {
                'daily' { $scheduledDue = $true; $scheduledPeriod = $now.ToString('yyyy-MM-dd') }
                'weekly' {
                    $weekday = if ($config.scheduleWeekday -is [int] -and $config.scheduleWeekday -ge 0 -and $config.scheduleWeekday -le 6) { $config.scheduleWeekday } else { 0 }
                    if ([int]$now.DayOfWeek -ge $weekday) { $scheduledDue = $true; $scheduledPeriod = 'week-' + $now.Date.AddDays(-[int]$now.DayOfWeek).ToString('yyyy-MM-dd') }
                }
                'monthly' {
                    $day = if ($config.scheduleDay -is [int] -and $config.scheduleDay -ge 1 -and $config.scheduleDay -le 31) { $config.scheduleDay } else { 1 }
                    if ($now.Day -ge [Math]::Min($day, [DateTime]::DaysInMonth($now.Year, $now.Month))) { $scheduledDue = $true; $scheduledPeriod = $now.ToString('yyyy-MM') }
                }
                'yearly' {
                    $month = if ($config.scheduleMonth -is [int] -and $config.scheduleMonth -ge 1 -and $config.scheduleMonth -le 12) { $config.scheduleMonth } else { 1 }
                    $day = if ($config.scheduleDay -is [int] -and $config.scheduleDay -ge 1 -and $config.scheduleDay -le 31) { $config.scheduleDay } else { 1 }
                    if (($now.Month -gt $month) -or ($now.Month -eq $month -and $now.Day -ge [Math]::Min($day, [DateTime]::DaysInMonth($now.Year, $month)))) { $scheduledDue = $true; $scheduledPeriod = $now.ToString('yyyy') }
                }
            }
        }
        $alreadyScheduled = $scheduledPeriod -and $config.lastScheduledPeriod -eq $scheduledPeriod
        if (-not $requestPending -and (-not $scheduledDue -or $alreadyScheduled)) { exit 0 }
        if (-not $requestPending) {
            Set-ConfigValue -Name 'lastScheduledPeriod' -Value $scheduledPeriod
        }
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
    Test-GzipFile -Path $localDump

    # Local scheduled JSON snapshots are derived artifacts. The recovery copy
    # needs live portal data and its dedicated PostgreSQL dump, not a second
    # transfer of every large local archive or its temporary write file.
    Invoke-RobocopySafe -Source $AppDataPath -Destination $dataDestination -ExtraArguments @('/XD', 'synology-staging', 'backups', '/XF', '*.partial')
    $nasDump = Join-Path $postgresDestination $dumpFile
    Copy-Item -LiteralPath $localDump -Destination $nasDump -Force
    if (-not (Test-Path -LiteralPath $nasDump -PathType Leaf) -or (Get-Item -LiteralPath $nasDump).Length -le 0) {
        throw 'PostgreSQL dump is missing or empty on Synology.'
    }
    Test-GzipFile -Path $nasDump

    $sourceAttachmentCount = @(Get-ChildItem -LiteralPath (Join-Path $AppDataPath 'attachments') -File -Recurse -ErrorAction SilentlyContinue).Count
    $destinationAttachmentCount = @(Get-ChildItem -LiteralPath (Join-Path $dataDestination 'attachments') -File -Recurse -ErrorAction SilentlyContinue).Count
    $dumpHash = (Get-FileHash -LiteralPath $nasDump -Algorithm SHA256).Hash.ToLowerInvariant()
    $manifestPath = Join-Path $manifestDestination "backup-$timestamp.json"

    $manifest = [ordered]@{
        version          = 2
        verified         = $true
        createdAt        = (Get-Date).ToString('o')
        appDataDestination = $dataDestination
        postgresDump     = $nasDump
        postgresDumpSha256 = $dumpHash
        postgresDumpBytes = (Get-Item -LiteralPath $nasDump).Length
        sourceAttachmentCount = $sourceAttachmentCount
        destinationAttachmentCount = $destinationAttachmentCount
        databaseContainer = 'company-portal-db'
        note             = 'Live portal data copied without deletion mirroring; local derived backup archives excluded; PostgreSQL is a gzip-validated logical pg_dump.'
    } | ConvertTo-Json
    Set-Content -LiteralPath $manifestPath -Value $manifest -Encoding utf8

    $trigger = if (-not $ScheduledInvocation -or $requestPending) { 'manual' } else { 'scheduled' }
    Add-VerifiedHistory -Entry ([ordered]@{
        createdAt = (Get-Date).ToString('o')
        trigger = $trigger
        postgresDump = $nasDump
        postgresDumpBytes = (Get-Item -LiteralPath $nasDump).Length
        postgresDumpSha256 = $dumpHash
        manifest = $manifestPath
        appDataDestination = $dataDestination
        sourceAttachmentCount = $sourceAttachmentCount
        destinationAttachmentCount = $destinationAttachmentCount
    })

    Set-ConfigValue -Name 'lastSuccessAt' -Value (Get-Date).ToString('o')
    Set-ConfigValue -Name 'lastFailureAt' -Value $null
    Set-ConfigValue -Name 'lastFailureMessage' -Value $null
    Set-ConfigValue -Name 'lastPostgresDump' -Value $nasDump
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
