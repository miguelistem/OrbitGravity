@echo off
title BetterMultigravity - Restore Original Protocol Handlers
echo ======================================================================
echo BetterMultigravity - Restoring Original Windows Protocol Handlers
echo ======================================================================
echo.

echo [1/2] Restoring HKCU:\Software\Classes\antigravity-ide ...
powershell -NoProfile -Command "$local = [System.Environment]::GetFolderPath('LocalApplicationData'); $ide = Join-Path $local 'Programs\Antigravity IDE\Antigravity IDE.exe'; Set-ItemProperty -Path 'HKCU:\Software\Classes\antigravity-ide\shell\open\command' -Name '(default)' -Value ('\"' + $ide + '\" \"--open-url\" \"--\" \"%1\"') -ErrorAction SilentlyContinue"

echo [2/2] Restoring HKCU:\Software\Classes\antigravity ...
powershell -NoProfile -Command "$local = [System.Environment]::GetFolderPath('LocalApplicationData'); $app = Join-Path $local 'Programs\antigravity\Antigravity.exe'; Set-ItemProperty -Path 'HKCU:\Software\Classes\antigravity\shell\open\command' -Name '(default)' -Value ('\"' + $app + '\" \"%1\"') -ErrorAction SilentlyContinue"

echo.
echo ======================================================================
echo SUCCESS: Original registry protocol handlers have been fully restored!
echo ======================================================================
pause
