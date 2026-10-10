import { AntigravityInstance, AntigravityAccount } from '../types/antigravity';

export function generateWindowsBatch(instance: AntigravityInstance, account?: AntigravityAccount): string {
  const envLines = Object.entries(instance.envVars || {})
    .map(([k, v]) => `set ${k}=${v}`)
    .join('\r\n');

  return `@echo off
REM ========================================================
REM OrbitGravity IDE Instance Launcher
REM Instance: ${instance.name} (${instance.id})
REM Workspace: ${instance.workspacePath}
REM Generated on: ${new Date().toISOString()}
REM ========================================================

title OrbitGravity IDE - ${instance.name}

echo [OrbitGravity Fleet] Starting instance "${instance.name}"...
echo [OrbitGravity Fleet] Workspace: "${instance.workspacePath}"
echo [OrbitGravity Fleet] Port: ${instance.port} | Model: ${instance.model}

cd /d "${instance.workspacePath || '%USERPROFILE%'}"

set ORBITGRAVITY_INSTANCE_ID=${instance.id}
set ORBITGRAVITY_INSTANCE_NAME=${instance.name}
set ORBITGRAVITY_PORT=${instance.port}
set ORBITGRAVITY_DEBUG_PORT=${instance.debugPort}
set ORBITGRAVITY_MODEL=${instance.model}
set ORBITGRAVITY_AUTONOMY=${instance.agentAutonomy}
set ORBITGRAVITY_ACCOUNT=${account?.email || 'default'}
${envLines ? envLines + '\r\n' : ''}
REM Launch OrbitGravity IDE binary or fallback to CLI runner
where orbitgravity >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    orbitgravity --instance "${instance.id}" --port ${instance.port} --model "${instance.model}" ${instance.customFlags || ''}
) else (
    echo [OrbitGravity Fleet] CLI binary not found in PATH. Starting localhost bridge...
    start http://localhost:${instance.port}
)

pause
`;
}

export function generateBashScript(instance: AntigravityInstance, account?: AntigravityAccount): string {
  const envLines = Object.entries(instance.envVars || {})
    .map(([k, v]) => `export ${k}="${v}"`)
    .join('\n');

  return `#!/usr/bin/env bash
# ========================================================
# OrbitGravity IDE Instance Launcher
# Instance: ${instance.name} (${instance.id})
# Workspace: ${instance.workspacePath}
# ========================================================

set -euo pipefail

echo -e "\\033[1;36m[OrbitGravity Fleet]\\033[0m Launching instance: \\033[1;32m${instance.name}\\033[0m"
echo -e "\\033[1;36m[OrbitGravity Fleet]\\033[0m Port: ${instance.port} | Model: ${instance.model}"

# Move to workspace directory
WORKSPACE_DIR="${instance.workspacePath || '$HOME'}"
if [ -d "$WORKSPACE_DIR" ]; then
  cd "$WORKSPACE_DIR"
else
  echo "Workspace dir not found, using current directory."
fi

export ORBITGRAVITY_INSTANCE_ID="${instance.id}"
export ORBITGRAVITY_INSTANCE_NAME="${instance.name}"
export ORBITGRAVITY_PORT="${instance.port}"
export ORBITGRAVITY_DEBUG_PORT="${instance.debugPort}"
export ORBITGRAVITY_MODEL="${instance.model}"
export ORBITGRAVITY_AUTONOMY="${instance.agentAutonomy}"
export ORBITGRAVITY_ACCOUNT="${account?.email || 'default'}"
${envLines ? envLines + '\n' : ''}
if command -v orbitgravity >/dev/null 2>&1; then
  exec orbitgravity --instance "${instance.id}" --port "${instance.port}" --model "${instance.model}" ${instance.customFlags || ''}
else
  echo -e "\\033[1;33m[OrbitGravity Fleet]\\033[0m Binary not in PATH. Opening local browser bridge on port ${instance.port}..."
  open "http://localhost:${instance.port}" 2>/dev/null || xdg-open "http://localhost:${instance.port}" 2>/dev/null || true
fi
`;
}

export function generateLinuxDesktopEntry(instance: AntigravityInstance): string {
  return `[Desktop Entry]
Version=1.0
Type=Application
Name=OrbitGravity - ${instance.name}
Comment=Launch OrbitGravity IDE instance on port ${instance.port} (${instance.workspacePath})
Exec=orbitgravity --instance "${instance.id}" --workspace "${instance.workspacePath}" --port ${instance.port} --model "${instance.model}"
Icon=utilities-terminal
Terminal=true
Categories=Development;IDE;Programming;
StartupNotify=true
Path=${instance.workspacePath || '$HOME'}
Actions=Debug;Headless;

[Desktop Action Debug]
Name=Launch in Debug Mode
Exec=orbitgravity --instance "${instance.id}" --port ${instance.port} --inspect=${instance.debugPort}

[Desktop Action Headless]
Name=Launch Headless Worker
Exec=orbitgravity --instance "${instance.id}" --headless --port ${instance.port}
`;
}

export function generateUrlShortcut(instance: AntigravityInstance): string {
  return `[InternetShortcut]
URL=http://localhost:${instance.port}/?session=${instance.id}
IconIndex=0
`;
}

export function generateShellOneLiner(instance: AntigravityInstance): string {
  return `orbitgravity --session "${instance.id}" --workspace "${instance.workspacePath}" --port ${instance.port} --model "${instance.model}"`;
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
