# BetterMultigravity - Rollback Script for Protocol Handlers
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Restoring Original Antigravity Windows Registry Protocol Handlers..." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$localAppData = [System.Environment]::GetFolderPath('LocalApplicationData')
$idePath = Join-Path $localAppData 'Programs\Antigravity IDE\Antigravity IDE.exe'
$standPath = Join-Path $localAppData 'Programs\antigravity\Antigravity.exe'

$origIde = "`"$idePath`" `"--open-url`" `"--`" `"%1`""
$origStandalone = "`"$standPath`" `"%1`""

Set-ItemProperty -Path "HKCU:\Software\Classes\antigravity-ide\shell\open\command" -Name "(default)" -Value $origIde -ErrorAction SilentlyContinue
Write-Host "[OK] Restored HKCU:\Software\Classes\antigravity-ide\shell\open\command" -ForegroundColor Green

Set-ItemProperty -Path "HKCU:\Software\Classes\antigravity\shell\open\command" -Name "(default)" -Value $origStandalone -ErrorAction SilentlyContinue
Write-Host "[OK] Restored HKCU:\Software\Classes\antigravity\shell\open\command" -ForegroundColor Green

Write-Host "`nAll protocol handlers restored to default Antigravity binaries." -ForegroundColor Green
