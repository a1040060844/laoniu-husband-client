param(
    [ValidateSet("390x844", "376x806", "314x706")]
    [string]$Size = "390x844",
    [string]$GodotExe = "",
    [switch]$EditorOnly,
    [switch]$GameOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($GodotExe)) {
    $GodotExe = Join-Path $projectRoot "..\..\..\tools\Godot-4.7.1\Godot_v4.7.1-stable_win64.exe"
}
$GodotExe = (Resolve-Path $GodotExe).Path

$parts = $Size -split "x"
if ($parts.Count -ne 2) {
    throw "Size must be one of 390x844, 376x806, 314x706."
}

$projectRoot = (Resolve-Path $projectRoot).Path
$projectCommand = $projectRoot.Replace("\", "/")

try {
    $existing = @(Get-CimInstance Win32_Process -ErrorAction Stop |
        Where-Object {
            $_.CommandLine -and $_.CommandLine.Contains($projectRoot)
        })
    if ($existing.Count -gt 0) {
        $pids = ($existing | ForEach-Object { $_.ProcessId }) -join ", "
        throw "A Godot process already targets this project (PID $pids). Close it before starting the deterministic harness."
    }
} catch [System.Management.Automation.CommandNotFoundException] {
    Write-Warning "Win32_Process inspection is unavailable; continuing without duplicate-process detection."
}

$envValues = @{
    "GODOT_MCP_EDITOR_PORT" = "6551"
    "GODOT_MCP_RUNTIME_PORT" = "6571"
    "GODOT_MCP_LSP_PORT" = "6005"
    "GODOT_MCP_PROJECT_PATH" = $projectRoot
}

function Test-LocalPortBusy {
    param([int]$Port)
    try {
        $listeners = @(Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction Stop)
        return $listeners.Count -gt 0
    } catch [System.Management.Automation.CommandNotFoundException] {
        $probe = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return [bool]$probe
    } catch {
        return $false
    }
}

foreach ($port in @(6551, 6571, 6005)) {
    if (Test-LocalPortBusy -Port $port) {
        throw "Deterministic MCP startup refused: local port $port is already occupied. Close the owning editor/runtime and retry; no fallback port will be scanned."
    }
}

function Start-GodotChild {
    param(
        [string]$Arguments,
        [string]$Label
    )

    $info = [System.Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $GodotExe
    $info.Arguments = $Arguments
    $info.WorkingDirectory = $projectRoot
    $info.UseShellExecute = $false
    foreach ($entry in $envValues.GetEnumerator()) {
        $info.Environment[$entry.Key] = $entry.Value
    }

    $process = [System.Diagnostics.Process]::Start($info)
    if ($null -eq $process) {
        throw "Unable to start $Label."
    }
    Write-Output "$Label started: PID=$($process.Id)"
}

if (-not $GameOnly) {
    Start-GodotChild `
        -Arguments "--editor --path `"$projectCommand`" --lsp-port 6005" `
        -Label "Godot editor"
}

if (-not $EditorOnly) {
    Start-GodotChild `
        -Arguments "--path `"$projectCommand`" --debug-window-size=$Size" `
        -Label "Godot runtime ($Size)"
}

Write-Output "MCP ports: editor=6551 runtime=6571 lsp=6005"
Write-Output "Project: $projectRoot"
Write-Output "The Codex MCP server must use the matching .mcp.json from this project root."
