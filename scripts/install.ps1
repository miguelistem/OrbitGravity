<#
.SYNOPSIS
    OrbitGravity One-Click Installer for Windows
    Installs OrbitGravity to %LOCALAPPDATA%\Programs\OrbitGravity with zero admin rights,
    creates Desktop and Start Menu shortcuts, and launches the application.

.USAGE
    powershell -ExecutionPolicy Bypass -File install.ps1
    OR via terminal one-liner:
    irm https://raw.githubusercontent.com/miguelistem/OrbitGravity/main/scripts/install.ps1 | iex
#>

[CmdletBinding()]
param(
    [string]$Version = "latest",
    [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "            OrbitGravity 🪐⚡ One-Click Installer         " -ForegroundColor White
Write-Host "       Antigravity Mission Control for Windows            " -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$installDir = Join-Path $env:LOCALAPPDATA "Programs\OrbitGravity"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$desktopShortcut = Join-Path $desktopPath "OrbitGravity.lnk"
$startPrograms = [Environment]::GetFolderPath("Programs")
$startMenuDir = Join-Path $startPrograms "OrbitGravity"
$startMenuShortcut = Join-Path $startMenuDir "OrbitGravity.lnk"

# 1. Check running process
$running = Get-Process -Name "OrbitGravity" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "[!] OrbitGravity is currently running. Stopping process for update..." -ForegroundColor Yellow
    Stop-Process -Name "OrbitGravity" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# 2. Ensure install directory exists
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

# 3. Locate binary source (Check local build first, else download release)
$localBin = Join-Path $PSScriptRoot "..\src-tauri\target\release\OrbitGravity.exe"
if (Test-Path $localBin) {
    Write-Host "[+] Installing from local release build..." -ForegroundColor Green
    Copy-Item -Path $localBin -Destination (Join-Path $installDir "OrbitGravity.exe") -Force
} else {
    Write-Host "[+] Fetching OrbitGravity $Version from GitHub Releases..." -ForegroundColor Green
    $repo = "miguelistem/OrbitGravity"
    $apiUrl = if ($Version -eq "latest") {
        "https://api.github.com/repos/$repo/releases/latest"
    } else {
        "https://api.github.com/repos/$repo/releases/tags/$Version"
    }

    try {
        $releaseInfo = Invoke-RestMethod -Uri $apiUrl -Headers @{ "User-Agent" = "OrbitGravity-Installer" }
        $asset = $releaseInfo.assets | Where-Object { $_.name -like "*Portable.zip*" -or $_.name -like "*.zip*" } | Select-Object -First 1

        if (-not $asset) {
            # Fallback to setup executable download
            $setupAsset = $releaseInfo.assets | Where-Object { $_.name -like "*setup.exe*" } | Select-Object -First 1
            if ($setupAsset) {
                $tempSetup = Join-Path $env:TEMP "OrbitGravity_Setup.exe"
                Write-Host "[+] Downloading installer: $($setupAsset.name)..." -ForegroundColor Gray
                Invoke-WebRequest -Uri $setupAsset.browser_download_url -OutFile $tempSetup
                Write-Host "[+] Running one-click installer..." -ForegroundColor Green
                Start-Process -FilePath $tempSetup -Wait
                exit 0
            }
            throw "No suitable release asset found on GitHub."
        }

        $tempZip = Join-Path $env:TEMP "OrbitGravity_Release.zip"
        Write-Host "[+] Downloading: $($asset.name)..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tempZip
        
        Write-Host "[+] Extracting to $installDir..." -ForegroundColor Gray
        Expand-Archive -Path $tempZip -DestinationPath $installDir -Force
        Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "[!] Note: Could not fetch from online remote ($($_.Exception.Message))." -ForegroundColor Yellow
        Write-Host "[*] If building from source, run: npm run tauri build" -ForegroundColor Gray
        exit 1
    }
}

$exePath = Join-Path $installDir "OrbitGravity.exe"
if (-not (Test-Path $exePath)) {
    Write-Host "[-] Error: OrbitGravity.exe was not found at $exePath" -ForegroundColor Red
    exit 1
}

# 4. Create Desktop Shortcut
Write-Host "[+] Creating Desktop shortcut..." -ForegroundColor Green
try {
    $wshShell = New-Object -ComObject WScript.Shell
    $shortcut = $wshShell.CreateShortcut($desktopShortcut)
    $shortcut.TargetPath = $exePath
    $shortcut.WorkingDirectory = $installDir
    $shortcut.IconLocation = "$exePath,0"
    $shortcut.Description = "OrbitGravity — Antigravity Mission Control"
    $shortcut.Save()
    Write-Host "    -> $desktopShortcut" -ForegroundColor Gray
} catch {
    Write-Host "[-] Warning: Could not create desktop shortcut ($($_.Exception.Message))" -ForegroundColor Yellow
}

# 5. Create Start Menu Shortcut
Write-Host "[+] Creating Start Menu shortcut..." -ForegroundColor Green
try {
    if (-not (Test-Path $startMenuDir)) {
        New-Item -ItemType Directory -Path $startMenuDir -Force | Out-Null
    }
    $startShortcut = $wshShell.CreateShortcut($startMenuShortcut)
    $startShortcut.TargetPath = $exePath
    $startShortcut.WorkingDirectory = $installDir
    $startShortcut.IconLocation = "$exePath,0"
    $startShortcut.Description = "OrbitGravity — Antigravity Mission Control"
    $startShortcut.Save()
    Write-Host "    -> $startMenuShortcut" -ForegroundColor Gray
} catch {
    Write-Host "[-] Warning: Could not create start menu shortcut ($($_.Exception.Message))" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[OK] Installation completed successfully!" -ForegroundColor Green
Write-Host "     Installed Path: $installDir" -ForegroundColor Cyan
Write-Host "     Desktop Icon:   OrbitGravity.lnk" -ForegroundColor Cyan
Write-Host ""

# 6. Launch Application
if (-not $NoLaunch) {
    Write-Host "[+] Launching OrbitGravity..." -ForegroundColor Green
    Start-Process -FilePath $exePath
}
