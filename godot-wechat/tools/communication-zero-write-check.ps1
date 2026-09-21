param(
    [string]$GodotExe = "",
    [string]$Proxy = "http://127.0.0.1:7897",
    [switch]$SkipStateGuard
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($GodotExe)) {
    $GodotExe = Join-Path $projectRoot "..\..\..\tools\Godot-4.7.1\Godot_v4.7.1-stable_win64_console.exe"
}
$GodotExe = (Resolve-Path $GodotExe).Path
$acceptanceDir = Join-Path $projectRoot ".acceptance"
New-Item -ItemType Directory -Force -Path $acceptanceDir | Out-Null
$logPath = Join-Path $acceptanceDir "communication-state-test.log"
$reportPath = Join-Path $acceptanceDir "communication-zero-write-report.json"

function Invoke-StateGuard {
    param([ValidateSet("before", "after")][string]$Mode)
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "acceptance-state-guard.ps1") `
        -Mode $Mode -Proxy $Proxy
    if ($LASTEXITCODE -ne 0) {
        throw "State guard $Mode failed with exit code $LASTEXITCODE. Communication acceptance stopped."
    }
}

if (-not $SkipStateGuard) {
    Invoke-StateGuard -Mode before
}

Remove-Item -LiteralPath $logPath -Force -ErrorAction SilentlyContinue
$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $GodotExe --headless --path $projectRoot --log-file $logPath --script res://src/communication_state_transforms_test.gd --quit 2>$null | Out-Null
$godotExit = $LASTEXITCODE
$ErrorActionPreference = $previousErrorAction
$logText = if (Test-Path $logPath) { Get-Content -LiteralPath $logPath -Raw } else { "" }
$pass = $godotExit -eq 0 -and $logText.Contains("Communication state transforms: PASS") -and
    -not ($logText -match "SCRIPT ERROR|Parser Error|Invalid assignment|Invalid access")
if (-not $pass) {
    throw "Communication state test failed. Inspect $logPath"
}

if (-not $SkipStateGuard) {
    Invoke-StateGuard -Mode after
}

$report = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    godotExitCode = $godotExit
    pureTransforms = "pass"
    stateGuard = if ($SkipStateGuard) { "skipped" } else { "before_after_equal" }
    writesAllowed = $false
    log = $logPath
}
$report | ConvertTo-Json | Set-Content -LiteralPath $reportPath -Encoding UTF8
Write-Output "Communication zero-write check passed: $reportPath"
