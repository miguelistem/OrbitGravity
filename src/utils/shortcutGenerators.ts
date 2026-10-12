import { AntigravityInstance, AntigravityAccount } from '../types/antigravity';

export function generateWindowsBatch(instance: AntigravityInstance, account?: AntigravityAccount): string {
  const envLines = Object.entries(instance.envVars || {})
    .map(([k, v]) => `set "${k}=${v}"`)
    .join('\r\n');

  const cleanName = instance.name.replace(/[^a-zA-Z0-9_-]/g, '') || 'Instance';
  const customFlags = instance.customFlags ? ` ${instance.customFlags.trim()}` : '';
  const workspaceArg = instance.workspacePath ? ` "${instance.workspacePath}"` : '';

  return `@echo off
REM ========================================================
REM OrbitGravity - Antigravity Isolated Profile Launcher
REM Profile: ${instance.name} (${instance.id})
REM Account: ${account?.name || 'Default'} (${account?.email || 'unlinked'})
REM Profile Dir: %USERPROFILE%\\AntigravityProfiles\\${cleanName}
REM Generated on: ${new Date().toISOString()}
REM ========================================================

title Antigravity - ${instance.name}

echo [OrbitGravity] Initializing isolated Antigravity profile: "${instance.name}"...

REM Bypass Electron single-instance socket rendezvous
set "SSH_CONNECTION=127.0.0.1 1234 127.0.0.1 22"
${envLines ? envLines + '\r\n' : ''}
set "PROFILE_DIR=%USERPROFILE%\\AntigravityProfiles\\${cleanName}"
set "DATA_DIR=%PROFILE_DIR%\\data"
set "EXT_DIR=%PROFILE_DIR%\\extensions"

REM Check for Antigravity IDE or standard Antigravity binary
if exist "%LOCALAPPDATA%\\Programs\\Antigravity IDE\\Antigravity IDE.exe" (
    start "" "%LOCALAPPDATA%\\Programs\\Antigravity IDE\\Antigravity IDE.exe" --user-data-dir="%DATA_DIR%" --extensions-dir="%EXT_DIR%" --new-window${customFlags}${workspaceArg}
) else if exist "%LOCALAPPDATA%\\Programs\\antigravity\\antigravity.exe" (
    start "" "%LOCALAPPDATA%\\Programs\\antigravity\\antigravity.exe" --user-data-dir="%DATA_DIR%" --extensions-dir="%EXT_DIR%" --new-window${customFlags}${workspaceArg}
) else if exist "%LOCALAPPDATA%\\Programs\\antigravity\\Antigravity.exe" (
    start "" "%LOCALAPPDATA%\\Programs\\antigravity\\Antigravity.exe" --user-data-dir="%DATA_DIR%" --extensions-dir="%EXT_DIR%" --new-window${customFlags}${workspaceArg}
) else (
    echo [ERROR] Antigravity installation not found in %LOCALAPPDATA%\\Programs.
    pause
)
`;
}

export function generateShellOneLiner(instance: AntigravityInstance): string {
  const cleanName = instance.name.replace(/[^a-zA-Z0-9_-]/g, '') || 'Instance';
  const workspaceArg = instance.workspacePath ? ` "${instance.workspacePath}"` : '';
  return `cmd /c "set \"SSH_CONNECTION=127.0.0.1 1234 127.0.0.1 22\" && start \"\" \"%LOCALAPPDATA%\\Programs\\Antigravity IDE\\Antigravity IDE.exe\" --user-data-dir=\"%USERPROFILE%\\AntigravityProfiles\\${cleanName}\\data\" --extensions-dir=\"%USERPROFILE%\\AntigravityProfiles\\${cleanName}\\extensions\" --new-window${workspaceArg}"`;
}

export function generateLinuxDesktopEntry(instance: AntigravityInstance): string {
  const cleanName = instance.name.replace(/[^a-zA-Z0-9_-]/g, '') || 'Instance';
  return `[Desktop Entry]
Version=1.0
Type=Application
Name=Antigravity - ${instance.name}
Comment=Launch isolated Antigravity session (${instance.workspacePath})
Exec=antigravity --user-data-dir="$HOME/.config/antigravity-profiles/${cleanName}" "${instance.workspacePath}"
Icon=utilities-terminal
Terminal=false
Categories=Development;IDE;
StartupNotify=true
Path=${instance.workspacePath || '$HOME'}
`;
}

export function generateBashScript(instance: AntigravityInstance): string {
  const cleanName = instance.name.replace(/[^a-zA-Z0-9_-]/g, '') || 'Instance';
  return `#!/usr/bin/env bash
set -e
export SSH_CONNECTION="127.0.0.1 1234 127.0.0.1 22"
antigravity --user-data-dir="$HOME/.config/antigravity-profiles/${cleanName}" "${instance.workspacePath || '$HOME'}" &
`;
}

export function generateUrlShortcut(instance: AntigravityInstance): string {
  const target = instance.workspacePath ? encodeURI(instance.workspacePath) : '';
  return `[InternetShortcut]\r\nURL=antigravity://file/${target}\r\n`;
}

export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
