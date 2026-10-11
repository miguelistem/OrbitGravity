import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../api';
import { AntigravityInstance, AntigravityAccount, LogEntry } from '../types/antigravity';
import { formatSecondsToTime } from '../utils/formatters';
import { 
  Play, 
  Pause, 
  Settings, 
  Clock, 
  ExternalLink, 
  Code, 
  Terminal, 
  Copy, 
  Check, 
  ShieldCheck, 
  Monitor, 
  Trash2,
  Folder,
  FileCode,
  Layers,
  Sparkles
} from 'lucide-react';

interface AntigravityWorkspaceProps {
  instance: AntigravityInstance;
  account?: AntigravityAccount;
  logs: LogEntry[];
  onToggleStatus: (id: string, newStatus: 'running' | 'paused' | 'stopped') => void;
  onOpenSettings: (instance: AntigravityInstance) => void;
  onAddLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  onLaunchIde?: (instance: AntigravityInstance) => void;
  onDeleteInstance?: (id: string) => void;
}

export function AntigravityWorkspace({
  instance,
  account,
  logs,
  onToggleStatus,
  onOpenSettings,
  onAddLog,
  onLaunchIde,
  onDeleteInstance,
}: AntigravityWorkspaceProps) {
  const [shortcutCreated, setShortcutCreated] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);

  const isRunning = instance.status === 'running';
  const instanceLogs = logs.filter((l) => l.instanceId === instance.id);
  const resolvedPath = instance.workspacePath || instance.profileDir || 'Default';

  const handleCreateDesktopShortcut = async () => {
    if (isTauri()) {
      try {
        await invoke('create_desktop_shortcut', { id: instance.id });
        setShortcutCreated(true);
        setTimeout(() => setShortcutCreated(false), 3000);
        onAddLog({
          instanceId: instance.id,
          level: 'info',
          source: 'system',
          message: `Created desktop shortcut: ${instance.name}.lnk with official icon.`,
        });
      } catch (err) {
        console.error('Failed to create shortcut:', err);
      }
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(resolvedPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleRevealInExplorer = async () => {
    if (isTauri()) {
      try {
        await invoke('open_in_explorer', { path: resolvedPath });
      } catch (err) {
        console.error('Failed to open in explorer:', err);
      }
    }
  };

  const handleCopyAllLogs = () => {
    const text = instanceLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text || 'No logs recorded.');
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F1012] text-[#D8DADF]">
      {/* 1. Top Breadcrumb & Action Header */}
      <div className="h-10 border-b border-[#212328] px-4 flex items-center justify-between bg-[#141518] shrink-0 select-none">
        {/* Left: Breadcrumbs & Live Runtime Status */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#7D818C] hover:text-zinc-300 cursor-pointer">
            {instance.tag || 'Projects'}
          </span>
          <span className="text-[#3D4048]">/</span>
          <span className="text-zinc-200 font-medium truncate max-w-sm">
            {instance.name}
          </span>

          <div className="h-3 w-[1px] bg-[#2A2C34] mx-1" />

          {/* App Type Pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1B1C21] border border-[#262830] font-mono text-[11px]">
            {instance.appType === 'antigravity' ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <Terminal className="w-3 h-3" /> Antigravity
              </span>
            ) : (
              <span className="text-blue-400 flex items-center gap-1 font-semibold">
                <Code className="w-3 h-3" /> Antigravity IDE
              </span>
            )}
          </div>

          <div className="h-3 w-[1px] bg-[#2A2C34] mx-1" />

          {/* Live Runtime Timer */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1B1C21] border border-[#262830] font-mono text-[11px] text-zinc-300">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isRunning
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'
                  : 'bg-zinc-500'
              }`}
            />
            <Clock className="w-3 h-3 text-[#7D818C]" />
            <span>{formatSecondsToTime(instance.totalElapsedSeconds)}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Power Toggle */}
          {isRunning ? (
            <button
              onClick={() => onToggleStatus(instance.id, 'paused')}
              className="p-1.5 text-[#8B8F9A] hover:text-amber-400 hover:bg-[#1E2026] rounded transition cursor-pointer"
              title="Pause / Stop Instance Session"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onToggleStatus(instance.id, 'running')}
              className="p-1.5 text-[#8B8F9A] hover:text-emerald-400 hover:bg-[#1E2026] rounded transition cursor-pointer"
              title="Resume / Start Instance Session"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Create Desktop Shortcut button */}
          <button
            onClick={handleCreateDesktopShortcut}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-200 hover:text-white bg-[#191B22] hover:bg-[#222530] rounded border border-[#2A2E3D] transition cursor-pointer font-mono shadow-2xs"
            title="Create Windows Desktop .lnk shortcut with Antigravity icon"
          >
            {shortcutCreated ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Monitor className="w-3 h-3 text-blue-400" />
            )}
            <span>{shortcutCreated ? 'Shortcut Created!' : 'Desktop Shortcut'}</span>
          </button>

          {/* Primary Launch Button */}
          <button
            onClick={() => {
              if (onLaunchIde) {
                onLaunchIde(instance);
              } else {
                onToggleStatus(instance.id, 'running');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded text-xs font-medium transition cursor-pointer shadow-sm active:scale-95"
            title="Launch native Antigravity window with isolated profile"
          >
            <ExternalLink className="w-3 h-3" />
            <span>{instance.appType === 'antigravity' ? 'Open Antigravity' : 'Open IDE'}</span>
          </button>

          {/* Settings gear */}
          <button
            onClick={() => onOpenSettings(instance)}
            className="p-1.5 text-[#7D818C] hover:text-zinc-200 hover:bg-[#1E2026] rounded transition cursor-pointer"
            title="Profile Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Delete button */}
          {onDeleteInstance && (
            showConfirmDelete ? (
              <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-800/80 px-2 py-0.5 rounded">
                <span className="text-[10px] text-rose-300">Delete?</span>
                <button
                  onClick={() => onDeleteInstance(instance.id)}
                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-medium cursor-pointer"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-1.5 py-0.5 bg-[#1F2229] hover:bg-[#282B34] text-zinc-300 rounded text-[10px] cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="p-1.5 text-[#7D818C] hover:text-rose-400 hover:bg-[#1E2026] rounded transition cursor-pointer"
                title="Delete this Instance Profile"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* 2. Main Workspace Body: Implemented Features Dashboard */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-[#0E0F12] space-y-5">
        {/* Top Status & Launch Control Hero Card */}
        <div className="border border-[#22242B] rounded-xl p-5 bg-[#141519] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isRunning
                    ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse'
                    : 'bg-zinc-600'
                }`}
              />
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                {instance.name}
              </h2>
              <span
                className={`text-[10.5px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                  isRunning
                    ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/60'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {isRunning ? (instance.pid ? `Running • PID ${instance.pid}` : 'Running') : 'Stopped'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              {instance.description || 'Isolated multi-instance Antigravity workspace profile.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isRunning ? (
              <button
                onClick={() => onToggleStatus(instance.id, 'stopped')}
                className="px-3.5 py-1.5 bg-[#1F2229] hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border border-[#2B2E39] hover:border-rose-800/70 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Stop Process</span>
              </button>
            ) : (
              <button
                onClick={() => onToggleStatus(instance.id, 'running')}
                className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Session</span>
              </button>
            )}

            <button
              onClick={() => {
                if (onLaunchIde) {
                  onLaunchIde(instance);
                } else {
                  onToggleStatus(instance.id, 'running');
                }
              }}
              className="px-4 py-1.5 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{instance.appType === 'antigravity' ? 'Open Antigravity' : 'Open IDE Window'}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid: Specifications & Real Activity Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Column: Instance Profile Details */}
          <div className="border border-[#22242B] rounded-xl p-5 bg-[#141519] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#202229]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Profile Configuration
                </h3>
              </div>
              <button
                onClick={() => onOpenSettings(instance)}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition cursor-pointer flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                <span>Edit Settings</span>
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              {/* App Type */}
              <div className="p-3 bg-[#18191E] border border-[#23252E] rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">App Type</span>
                  <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5 mt-0.5">
                    {instance.appType === 'antigravity' ? (
                      <>
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        Antigravity (Standalone App)
                      </>
                    ) : (
                      <>
                        <Code className="w-3.5 h-3.5 text-blue-400" />
                        Antigravity IDE (VS Code-based)
                      </>
                    )}
                  </span>
                </div>
                <span className="text-[10.5px] px-2 py-0.5 rounded bg-[#20222A] text-zinc-400 border border-[#2A2C36]">
                  {instance.appType === 'antigravity' ? 'antigravity.exe' : 'Antigravity IDE.exe'}
                </span>
              </div>

              {/* Workspace Profile Directory */}
              <div className="p-3 bg-[#18191E] border border-[#23252E] rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    Workspace Profile Directory
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyPath}
                      className="text-[10.5px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer flex items-center gap-1"
                      title="Copy path"
                    >
                      {copiedPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPath ? 'Copied' : 'Copy'}</span>
                    </button>
                    {isTauri() && (
                      <button
                        onClick={handleRevealInExplorer}
                        className="text-[10.5px] text-blue-400 hover:text-blue-300 transition cursor-pointer flex items-center gap-1"
                        title="Open folder in File Explorer"
                      >
                        <Folder className="w-3 h-3" />
                        <span>Explorer</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-[11.5px] text-zinc-200 truncate select-all" title={resolvedPath}>
                  {resolvedPath}
                </div>
              </div>

              {/* Isolation Mechanism & Sandbox */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-[#18191E] border border-[#23252E] rounded-lg">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Isolation</span>
                  <span className="text-[11.5px] font-semibold text-emerald-400 mt-0.5 block">
                    NTFS Junctions
                  </span>
                  <span className="text-[10px] text-zinc-500 font-sans block mt-0.5">
                    No admin privileges required
                  </span>
                </div>

                <div className="p-2.5 bg-[#18191E] border border-[#23252E] rounded-lg">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Port</span>
                  <span className="text-[11.5px] font-semibold text-zinc-200 mt-0.5 block">
                    :{instance.port || 3000}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-sans block mt-0.5">
                    Dedicated IPC socket
                  </span>
                </div>
              </div>

              {/* Flags & Env */}
              <div className="p-3 bg-[#18191E] border border-[#23252E] rounded-lg space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Launch Flags:</span>
                  <span className="text-zinc-300 text-[11px] truncate max-w-xs">
                    {instance.customFlags || '--enable-anti-entropy'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-[#23252E]">
                  <span className="text-zinc-500">Environment Variables:</span>
                  <span className="text-zinc-300 text-[11px]">
                    {Object.keys(instance.envVars || {}).length} variables configured
                  </span>
                </div>
              </div>

              {/* Desktop Shortcut Action card */}
              <div className="p-3 bg-[#18191E] border border-[#23252E] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">Desktop Shortcut</span>
                    <span className="text-[10.5px] text-zinc-500 font-sans block">
                      Direct {instance.name}.lnk with official icon
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleCreateDesktopShortcut}
                  className="px-2.5 py-1 bg-[#222530] hover:bg-[#2B2E3D] text-zinc-200 hover:text-white rounded border border-[#2F3343] text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {shortcutCreated ? <Check className="w-3 h-3 text-emerald-400" /> : <ExternalLink className="w-3 h-3" />}
                  <span>{shortcutCreated ? 'Created' : 'Add to Desktop'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Real Process Activity & Console Logs */}
          <div className="border border-[#22242B] rounded-xl p-5 bg-[#141519] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#202229]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Instance Activity Logs
                </h3>
                <span className="text-[10.5px] font-mono px-1.5 py-0.2 rounded bg-[#1C1E26] text-zinc-400">
                  {instanceLogs.length}
                </span>
              </div>
              {instanceLogs.length > 0 && (
                <button
                  onClick={handleCopyAllLogs}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer flex items-center gap-1"
                  title="Copy logs to clipboard"
                >
                  {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLogs ? 'Copied' : 'Copy Logs'}</span>
                </button>
              )}
            </div>

            {/* Logs Terminal Box */}
            <div className="flex-1 min-h-[300px] mt-3 bg-[#0A0B0E] border border-[#202228] rounded-lg p-3 font-mono text-[11px] overflow-y-auto space-y-1.5 select-text">
              {instanceLogs.length > 0 ? (
                instanceLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-[#121317] p-1 rounded">
                    <span className="text-[#555966] select-none shrink-0">[{log.timestamp}]</span>
                    <span
                      className={`uppercase text-[9.5px] font-semibold px-1 py-0.2 rounded shrink-0 ${
                        log.level === 'error'
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                          : log.level === 'exec'
                          ? 'bg-blue-950/60 text-blue-400 border border-blue-800/40'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-[#7D818C] shrink-0">[{log.source}]</span>
                    <span className="text-zinc-300 break-all">{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                  <Terminal className="w-8 h-8 text-zinc-700 stroke-[1.5]" />
                  <p className="text-xs">No activity logged for this instance yet.</p>
                  <p className="text-[11px] text-zinc-600 font-sans max-w-xs">
                    Click <strong>Open {instance.appType === 'antigravity' ? 'Antigravity' : 'IDE'}</strong> or <strong>Start Session</strong> to launch and inspect process telemetry.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
