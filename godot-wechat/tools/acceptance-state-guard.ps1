param(
    [ValidateSet("before", "after")]
    [string]$Mode,
    [string]$ApiBase = "https://www.laoniulaoge.cn",
    [string]$SnapshotPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($SnapshotPath)) {
    $SnapshotPath = Join-Path $projectRoot ".acceptance\state-fingerprint.json"
}
$snapshotDir = Split-Path -Parent $SnapshotPath
New-Item -ItemType Directory -Path $snapshotDir -Force | Out-Null

function Get-Field {
    param(
        [AllowNull()]
        [object]$Object,
        [string]$Name
    )
    if ($null -eq $Object) { return $null }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    return $property.Value
}

function Get-SortedObjects {
    param(
        [AllowNull()]
        [object]$Value,
        [string]$Key = "id"
    )
    if ($null -eq $Value) { return @() }
    return @($Value | Sort-Object -Property @{ Expression = { [string](Get-Field $_ $Key) } })
}

function Get-Projection {
    param([object]$Payload)

    $state = Get-Field $Payload "state"
    if ($null -eq $state) {
        throw "GET /api/state did not return a state object."
    }

    $tasks = @(Get-SortedObjects (Get-Field $state "tasks")) | ForEach-Object {
        [ordered]@{
            id = Get-Field $_ "id"
            status = Get-Field $_ "status"
            submittedAt = Get-Field $_ "submittedAt"
            submitNote = Get-Field $_ "submitNote"
            confirmedAt = Get-Field $_ "confirmedAt"
            rewardedAt = Get-Field $_ "rewardedAt"
        }
    }

    $logs = @(Get-SortedObjects (Get-Field $state "logs"))
    $benefits = @(Get-SortedObjects (Get-Field $state "benefits"))
    $notifications = @(Get-SortedObjects (Get-Field $state "notifications"))
    $chatMessages = @(Get-SortedObjects (Get-Field $state "chatMessages"))
    $allowances = @(Get-SortedObjects (Get-Field $state "monthlyAllowances"))

    return [ordered]@{
        revision = Get-Field $Payload "revision"
        tasks = @($tasks)
        logs = [ordered]@{
            count = $logs.Count
            ids = @($logs | ForEach-Object { Get-Field $_ "id" })
        }
        benefits = @($benefits)
        notifications = @($notifications)
        chatMessages = @($chatMessages)
        monthlyAllowances = @($allowances)
    }
}

$uri = "$($ApiBase.TrimEnd('/'))/api/state"
Write-Output "Reading state fingerprint from $uri"
$response = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $uri -Headers @{ Accept = "application/json" }
$payload = $response.Content | ConvertFrom-Json
$projection = Get-Projection $payload
$json = $projection | ConvertTo-Json -Depth 40 -Compress
$sha = [System.Security.Cryptography.SHA256]::Create()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$hash = ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()

$record = [ordered]@{
    capturedAt = [DateTime]::UtcNow.ToString("o")
    apiBase = $ApiBase
    fingerprint = $hash
    projection = $projection
}

if ($Mode -eq "before") {
    $record | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $SnapshotPath -Encoding UTF8
    Write-Output "State guard baseline saved: $SnapshotPath"
    Write-Output "Fingerprint: $hash"
    exit 0
}

if (-not (Test-Path -LiteralPath $SnapshotPath)) {
    throw "Baseline not found: $SnapshotPath"
}
$before = Get-Content -LiteralPath $SnapshotPath -Raw | ConvertFrom-Json
$beforeFingerprint = [string](Get-Field $before "fingerprint")
if ($beforeFingerprint -ne $hash) {
    Write-Error "STATE GUARD FAILED: before=$beforeFingerprint after=$hash"
    $record | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath (Join-Path $snapshotDir "state-fingerprint-after.json") -Encoding UTF8
    exit 2
}

Write-Output "State guard passed: fingerprint unchanged ($hash)"
