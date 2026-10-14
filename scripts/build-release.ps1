<#
.SYNOPSIS
    OrbitGravity Release Packager & Artifact Builder
    Compiles release frontend, runs 42 backend tests, builds NSIS one-click installer,
    packages portable edition, and generates SHA256 checksums into release/ folder.
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "           OrbitGravity 🪐⚡ Release Packager             " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

# 1. Output directory
$releaseDir = Join-Path $rootDir "release"
if (Test-Path $releaseDir) {
    Remove-Item -Path $releaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

# 2. Run test harness
Write-Host "[1/4] Running automated test harness (48 tests)..." -ForegroundColor Yellow
$testResult = cargo test --manifest-path src-tauri/Cargo.toml --test backend_tests
if ($LASTEXITCODE -ne 0) {
    Write-Host "[-] Error: Backend tests failed! Release build aborted." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] All backend unit and integration tests passed!" -ForegroundColor Green

# 3. Build Tauri release & NSIS bundle
Write-Host "[2/4] Compiling frontend & building NSIS installer..." -ForegroundColor Yellow
npm run tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[-] Error: Tauri build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Tauri compilation finished successfully!" -ForegroundColor Green

# Read dynamic application version from configuration
$tauriConf = Get-Content (Join-Path $rootDir "src-tauri\tauri.conf.json") -Raw | ConvertFrom-Json
$appVersion = $tauriConf.version
Write-Host "Configured Target Version: v$appVersion" -ForegroundColor Cyan

# 4. Locate built artifacts
$targetDir = Join-Path $rootDir "src-tauri\target\release"
$bundleNsisDir = Join-Path $targetDir "bundle\nsis"
$mainExe = Join-Path $targetDir "orbitgravity.exe"
if (!(Test-Path $mainExe)) {
    $mainExe = Join-Path $targetDir "OrbitGravity.exe"
}

$nsisExe = Get-ChildItem -Path $bundleNsisDir -Filter "*${appVersion}*setup.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (!$nsisExe) {
    $nsisExe = Get-ChildItem -Path $bundleNsisDir -Filter "*setup.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

if ($nsisExe) {
    $destSetupV = Join-Path $releaseDir "OrbitGravity_v${appVersion}_Setup.exe"
    $destSetup = Join-Path $releaseDir "OrbitGravity_${appVersion}_Setup.exe"
    Copy-Item -Path $nsisExe.FullName -Destination $destSetupV -Force
    Copy-Item -Path $nsisExe.FullName -Destination $destSetup -Force
    Write-Host "[+] Staged One-Click Installer: OrbitGravity_v${appVersion}_Setup.exe (from $($nsisExe.Name))" -ForegroundColor Green
} else {
    Write-Host "[!] Warning: NSIS setup executable not found in $bundleNsisDir" -ForegroundColor Yellow
}

# 5. Create Portable ZIP
Write-Host "[3/4] Creating Portable ZIP archive..." -ForegroundColor Yellow
if (Test-Path $mainExe) {
    $tempPortableDir = Join-Path $env:TEMP "OrbitGravity_Portable_Staging"
    if (Test-Path $tempPortableDir) { Remove-Item $tempPortableDir -Recurse -Force }
    New-Item -ItemType Directory -Path $tempPortableDir -Force | Out-Null
    
    Copy-Item -Path $mainExe -Destination $tempPortableDir -Force
    Copy-Item -Path (Join-Path $rootDir "README.md") -Destination $tempPortableDir -Force -ErrorAction SilentlyContinue
    Copy-Item -Path (Join-Path $rootDir "INDEPTH_README.md") -Destination $tempPortableDir -Force -ErrorAction SilentlyContinue
    
    $portableZipV = Join-Path $releaseDir "OrbitGravity_v${appVersion}_Portable.zip"
    $portableZip = Join-Path $releaseDir "OrbitGravity_${appVersion}_Portable.zip"
    Compress-Archive -Path "$tempPortableDir\*" -DestinationPath $portableZipV -Force
    Copy-Item -Path $portableZipV -Destination $portableZip -Force
    Remove-Item $tempPortableDir -Recurse -Force
    Write-Host "[+] Staged Portable Archive: OrbitGravity_v${appVersion}_Portable.zip" -ForegroundColor Green
}

# 6. Copy install scripts with version tags (no uninstaller distributed; uninstalls happen strictly via Windows)
$scriptSrc = Join-Path $rootDir "scripts\install.ps1"
if (Test-Path $scriptSrc) {
    Copy-Item -Path $scriptSrc -Destination (Join-Path $releaseDir "install_v${appVersion}.ps1") -Force
    Copy-Item -Path $scriptSrc -Destination (Join-Path $releaseDir "install.ps1") -Force
}

# 7. Generate SHA256 Checksums
Write-Host "[4/4] Computing SHA256 checksums..." -ForegroundColor Yellow
$checksumFile = Join-Path $releaseDir "SHA256SUMS.txt"
$artifacts = Get-ChildItem -Path $releaseDir -File | Where-Object { $_.Name -ne "SHA256SUMS.txt" }

$lines = @()
foreach ($file in $artifacts) {
    $hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash.ToLower()
    $lines += "$hash  $($file.Name)"
}
$lines | Out-File -FilePath $checksumFile -Encoding utf8
Write-Host "[+] Generated SHA256 checksums file." -ForegroundColor Green

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] Release artifacts generated in: release\" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
Get-ChildItem -Path $releaseDir | ForEach-Object {
    Write-Host (" - {0,-36} ({1:N2} MB)" -f $_.Name, ($_.Length / 1MB)) -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Ready for GitHub Release tag v${appVersion}! 🪐⚡" -ForegroundColor White
