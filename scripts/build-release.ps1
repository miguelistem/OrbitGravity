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
Write-Host "[1/4] Running automated test harness (42 tests)..." -ForegroundColor Yellow
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

# 4. Locate built artifacts
$targetDir = Join-Path $rootDir "src-tauri\target\release"
$bundleNsisDir = Join-Path $targetDir "bundle\nsis"
$mainExe = Join-Path $targetDir "OrbitGravity.exe"

$nsisExe = Get-ChildItem -Path $bundleNsisDir -Filter "*setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($nsisExe) {
    $destSetup = Join-Path $releaseDir "OrbitGravity_1.0.0_Setup.exe"
    Copy-Item -Path $nsisExe.FullName -Destination $destSetup -Force
    Write-Host "[+] Staged One-Click Installer: OrbitGravity_1.0.0_Setup.exe" -ForegroundColor Green
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
    
    $portableZip = Join-Path $releaseDir "OrbitGravity_1.0.0_Portable.zip"
    Compress-Archive -Path "$tempPortableDir\*" -DestinationPath $portableZip -Force
    Remove-Item $tempPortableDir -Recurse -Force
    Write-Host "[+] Staged Portable Archive: OrbitGravity_1.0.0_Portable.zip" -ForegroundColor Green
}

# 6. Copy install.ps1 and uninstall.ps1 to release directory
$scriptSrc = Join-Path $rootDir "scripts\install.ps1"
if (Test-Path $scriptSrc) {
    Copy-Item -Path $scriptSrc -Destination (Join-Path $releaseDir "install.ps1") -Force
}
$uninstallSrc = Join-Path $rootDir "scripts\uninstall.ps1"
if (Test-Path $uninstallSrc) {
    Copy-Item -Path $uninstallSrc -Destination (Join-Path $releaseDir "uninstall.ps1") -Force
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
    Write-Host (" - {0,-32} ({1:N2} MB)" -f $_.Name, ($_.Length / 1MB)) -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Ready for GitHub Release tag v1.0.0! 🪐⚡" -ForegroundColor White
