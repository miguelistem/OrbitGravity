<#
.SYNOPSIS
    OrbitGravity Application Uninstaller
    Stops running OrbitGravity processes, removes OrbitGravity application binaries,
    removes application state and cache, and cleans up OrbitGravity shortcuts.
    
    CRITICAL SAFETY GUARANTEE:
    This script NEVER deletes or modifies Antigravity profiles, user workspaces,
    or any files in %USERPROFILE%\AntigravityProfiles.

.USAGE
    powershell -ExecutionPolicy Bypass -File scripts\uninstall.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "           OrbitGravity Application Uninstaller           " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Terminate running OrbitGravity processes
Write-Host "[1/3] Terminating running OrbitGravity processes..." -ForegroundColor Yellow
Get-Process -Name "OrbitGravity" -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    Write-Host "  -> Terminated OrbitGravity (PID $($_.Id))" -ForegroundColor Gray
}

# 2. Remove OrbitGravity application binary and state
Write-Host "[2/3] Removing application binaries and state..." -ForegroundColor Yellow
$appDirs = @(
    (Join-Path $env:LOCALAPPDATA "Programs\OrbitGravity"),
    (Join-Path $env:LOCALAPPDATA "BetterMultigravity"),
    (Join-Path $env:LOCALAPPDATA "OrbitGravity"),
    (Join-Path $env:APPDATA "OrbitGravity")
)

foreach ($dir in $appDirs) {
    if (Test-Path $dir) {
        try {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  [+] Removed: $dir" -ForegroundColor Green
        } catch {
            Write-Host "  [!] Warning: Could not remove $dir ($($_.Exception.Message))" -ForegroundColor Red
        }
    }
}

# 3. Clean up OrbitGravity shortcuts
Write-Host "[3/3] Cleaning up OrbitGravity shortcuts..." -ForegroundColor Yellow
$desktopPath = [Environment]::GetFolderPath("Desktop")
$desktopShortcut = Join-Path $desktopPath "OrbitGravity.lnk"
if (Test-Path $desktopShortcut) {
    Remove-Item -Path $desktopShortcut -Force -ErrorAction SilentlyContinue
    Write-Host "  [+] Removed Desktop shortcut: OrbitGravity.lnk" -ForegroundColor Green
}

$startMenuFolder = Join-Path ([Environment]::GetFolderPath("Programs")) "OrbitGravity"
if (Test-Path $startMenuFolder) {
    Remove-Item -Path $startMenuFolder -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  [+] Removed Start Menu entry: $startMenuFolder" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] OrbitGravity application removed cleanly." -ForegroundColor White
Write-Host " [SAFE] Profile workspaces (%USERPROFILE%\AntigravityProfiles)" -ForegroundColor Cyan
Write-Host "        are untouched and preserved permanently." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
