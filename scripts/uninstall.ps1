<#
.SYNOPSIS
    OrbitGravity Complete Uninstaller & Profile Cleaner
    Stops running OrbitGravity processes, removes all isolated Antigravity profiles,
    removes NTFS Directory Junctions, deletes application state, and cleans up desktop shortcuts.

.USAGE
    powershell -ExecutionPolicy Bypass -File scripts\uninstall.ps1
#>

[CmdletBinding()]
param(
    [switch]$KeepProfiles
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "           OrbitGravity Complete Uninstaller              " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Terminate running OrbitGravity processes
Write-Host "[1/5] Terminating running OrbitGravity processes..." -ForegroundColor Yellow
Get-Process -Name "OrbitGravity" -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    Write-Host "  -> Terminated OrbitGravity (PID $($_.Id))" -ForegroundColor Gray
}

# 2. Terminate any instance processes running out of AntigravityProfiles
$profilesDir = Join-Path $env:USERPROFILE "AntigravityProfiles"
if (Test-Path $profilesDir) {
    Write-Host "[2/5] Cleaning up isolated profile instances..." -ForegroundColor Yellow
    Get-Process -Name "*antigravity*" -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $path = $_.MainModule.FileName
            if ($path -and $path -like "*AntigravityProfiles*") {
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
                Write-Host "  -> Terminated profile sandbox process (PID $($_.Id))" -ForegroundColor Gray
            }
        } catch {}
    }
} else {
    Write-Host "[2/5] No running profile sandboxes detected." -ForegroundColor Yellow
}

# 3. Clean up Antigravity Profiles directory (unless user requested -KeepProfiles)
if (-not $KeepProfiles) {
    Write-Host "[3/5] Removing all Antigravity profile directories..." -ForegroundColor Yellow
    if (Test-Path $profilesDir) {
        # Unlink directory junctions first to be 100% clean
        Get-ChildItem -Path $profilesDir -Recurse -Force -ErrorAction SilentlyContinue | Where-Object {
            $_.Attributes -band [System.IO.FileAttributes]::ReparsePoint
        } | ForEach-Object {
            try {
                if ($_.PSIsContainer) {
                    cmd /c rmdir "$($_.FullName)" 2>$null
                } else {
                    Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
                }
            } catch {}
        }

        # Remove profiles directory
        try {
            Remove-Item -Path $profilesDir -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  [+] Removed: $profilesDir" -ForegroundColor Green
        } catch {
            Write-Host "  [!] Warning: Could not remove $profilesDir ($($_.Exception.Message))" -ForegroundColor Red
        }
    } else {
        Write-Host "  [*] AntigravityProfiles directory already removed." -ForegroundColor Gray
    }
} else {
    Write-Host "[3/5] Skipping AntigravityProfiles (-KeepProfiles specified)." -ForegroundColor Gray
}

# 4. Remove OrbitGravity application and state
Write-Host "[4/5] Removing application data and state..." -ForegroundColor Yellow
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
        } catch {}
    }
}

# 5. Clean up shortcuts
Write-Host "[5/5] Cleaning up shortcuts..." -ForegroundColor Yellow
$desktopPath = [Environment]::GetFolderPath("Desktop")
$desktopShortcut = Join-Path $desktopPath "OrbitGravity.lnk"
if (Test-Path $desktopShortcut) {
    Remove-Item -Path $desktopShortcut -Force -ErrorAction SilentlyContinue
    Write-Host "  [+] Removed Desktop shortcut: OrbitGravity.lnk" -ForegroundColor Green
}

$startMenuFolder = Join-Path ([Environment]::GetFolderPath("Programs")) "OrbitGravity"
if (Test-Path $startMenuFolder) {
    Remove-Item -Path $startMenuFolder -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  [+] Removed Start Menu entry." -ForegroundColor Green
}

# Scan Desktop for any instance shortcuts created by OrbitGravity pointing to AntigravityProfiles
if (Test-Path $desktopPath) {
    $wsh = New-Object -ComObject WScript.Shell
    Get-ChildItem -Path $desktopPath -Filter "*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $sc = $wsh.CreateShortcut($_.FullName)
            if ($sc.TargetPath -like "*AntigravityProfiles*" -or $sc.Arguments -like "*AntigravityProfiles*" -or $sc.Description -like "*OrbitGravity*") {
                Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
                Write-Host "  [+] Removed Instance shortcut: $($_.Name)" -ForegroundColor Green
            }
        } catch {}
    }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] OrbitGravity and all profiles cleanly uninstalled." -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
