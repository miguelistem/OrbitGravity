import type { InstanceItem } from '../types';

export interface ShortcutFile {
  filename: string;
  content: string;
  mimeType: string;
}

/**
 * Generate native launcher file content based on export target.
 */
export function generateShortcutFile(
  inst: InstanceItem,
  targetKey: string
): ShortcutFile {
  const safeName = inst.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const profileDir = `%USERPROFILE%\\AntigravityProfiles\\${safeName}`;
  const workspace = inst.workspacePath || 'e:\\Projects\\Workspace';

  switch (targetKey) {
    case 'windows-batch':
      return {
        filename: `Launch_${safeName}.bat`,
        mimeType: 'application/x-bat',
        content: `@echo off
:: ============================================================================
:: OrbitGravity Isolated Session Launcher
:: Instance Name : ${inst.name}
:: Dedicated Port: ${inst.port}
:: Engine Model  : ${inst.model || 'Gemini 3.0 Flash'}
:: Generated     : ${new Date().toISOString()}
:: ============================================================================
title OrbitGravity - ${inst.name}

set "PROFILE_ROOT=${profileDir}"
set "USERDATA_DIR=%PROFILE_ROOT%\\data"
set "EXT_DIR=%PROFILE_ROOT%\\extensions"

:: Windows NTFS Junction & Auth Isolation
set "USERPROFILE=%PROFILE_ROOT%"
set "APPDATA=%PROFILE_ROOT%\\AppData\\Roaming"
set "LOCALAPPDATA=%PROFILE_ROOT%\\AppData\\Local"

echo ============================================================================
echo [OrbitGravity] Launching isolated Antigravity IDE instance...
echo [OrbitGravity] Profile  : %PROFILE_ROOT%
echo [OrbitGravity] Workspace: ${workspace}
echo ============================================================================

start "" "%LOCALAPPDATA%\\Programs\\antigravity\\antigravity.exe" ^
  --user-data-dir="%USERDATA_DIR%" ^
  --extensions-dir="%EXT_DIR%" ^
  --new-window ^
  "${workspace}"

exit
`,
      };

    case 'linux-desktop':
      return {
        filename: `orbitgravity-${safeName.toLowerCase()}.desktop`,
        mimeType: 'application/x-desktop',
        content: `[Desktop Entry]
Version=1.0
Type=Application
Name=Antigravity - ${inst.name}
GenericName=AI Code Editor
Comment=OrbitGravity Isolated Workspace (${inst.model || 'Gemini 3.0 Flash'})
Exec=antigravity --user-data-dir="$HOME/.antigravity-profiles/${safeName}/data" --extensions-dir="$HOME/.antigravity-profiles/${safeName}/extensions" --new-window "${workspace}"
Icon=antigravity
Terminal=false
Categories=Development;IDE;Programming;
StartupWMClass=antigravity
`,
      };

    case 'macos-shell':
      return {
        filename: `launch_${safeName.toLowerCase()}.sh`,
        mimeType: 'application/x-sh',
        content: `#!/usr/bin/env bash
# ============================================================================
# OrbitGravity Isolated Session Launcher (macOS / Linux Shell)
# Instance: ${inst.name}
# ============================================================================
PROFILE_DIR="$HOME/.antigravity-profiles/${safeName}"
mkdir -p "$PROFILE_DIR/data" "$PROFILE_DIR/extensions"

echo "[OrbitGravity] Starting session for ${inst.name}..."
open -n -a "Antigravity" --args \\
  --user-data-dir="$PROFILE_DIR/data" \\
  --extensions-dir="$PROFILE_DIR/extensions" \\
  --new-window \\
  "${workspace}" &
`,
      };

    case 'web-protocol':
    default:
      return {
        filename: `OrbitGravity_${safeName}.url`,
        mimeType: 'text/uri-list',
        content: `[InternetShortcut]
URL=vscode://file/${encodeURI(workspace.replace(/\\/g, '/'))}
IconIndex=0
HotKey=0
`,
      };
  }
}

/**
 * Triggers a native browser file download of the given file.
 */
export function triggerFileDownload(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
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
