import { useState } from 'react';
import { AntigravityInstance, AntigravityAccount } from '../types/antigravity';
import { formatSecondsToTime, formatCompactNumber } from '../utils/formatters';
import { 
  downloadFile, 
  generateWindowsBatch, 
  generateBashScript, 
  generateLinuxDesktopEntry, 
  generateUrlShortcut, 
  generateShellOneLiner 
} from '../utils/shortcutGenerators';
import { 
  Play, 
  Pause, 
  Square, 
  Terminal, 
  ExternalLink, 
  Download, 
  Settings, 
  Clock, 
  Hourglass, 
  Cpu, 
  Database, 
  GitBranch, 
  Folder, 
  Copy, 
  Check, 
  ChevronDown, 
  FileCode, 
  FileText, 
  Sparkles,
  Bot
} from 'lucide-react';

interface InstanceCardProps {
  instance: AntigravityInstance;
  account?: AntigravityAccount;
  onToggleStatus: (id: string, newStatus: 'running' | 'paused' | 'stopped') => void;
  onOpenLogs: (instance: AntigravityInstance) => void;
  onOpenIde: (instance: AntigravityInstance) => void;
  onEditSettings: (instance: AntigravityInstance) => void;
  onExtendTtl: (id: string, extraMinutes: number) => void;
}

export function InstanceCard({
  instance,
  account,
  onToggleStatus,
  onOpenLogs,
  onOpenIde,
  onEditSettings,
  onExtendTtl,
}: InstanceCardProps) {
  const [showShortcutMenu, setShowShortcutMenu] = useState(false);
  const [copiedShell, setCopiedShell] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  // Time calculations
  const isRunning = instance.status === 'running';
  const isPaused = instance.status === 'paused';
  const isIdle = instance.status === 'idle';

  // Calculate remaining TTL
  const ttlSecondsTotal = instance.ttlMinutes > 0 ? instance.ttlMinutes * 60 : 0;
  const ttlRemainingSeconds = instance.ttlMinutes > 0 ? Math.max(0, ttlSecondsTotal - instance.totalElapsedSeconds) : 0;
  const isNearTtl = instance.ttlMinutes > 0 && ttlRemainingSeconds < 600 && isRunning; // less than 10 mins

  // Calculate idle seconds
  const idleSeconds = Math.max(0, Math.floor((Date.now() - instance.lastActivityAt) / 1000));

  const handleCopyPath = () => {
    navigator.clipboard.writeText(instance.workspacePath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleCopyShell = () => {
    navigator.clipboard.writeText(generateShellOneLiner(instance));
    setCopiedShell(true);
    setTimeout(() => setCopiedShell(false), 2000);
  };

  // Color theme mapping
  const colorMap: Record<string, { badge: string; border: string; glow: string; text: string }> = {
    cyan: { badge: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60', border: 'hover:border-cyan-500/50', glow: 'shadow-cyan-950/20', text: 'text-cyan-400' },
    emerald: { badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60', border: 'hover:border-emerald-500/50', glow: 'shadow-emerald-950/20', text: 'text-emerald-400' },
    violet: { badge: 'bg-violet-950/60 text-violet-400 border-violet-800/60', border: 'hover:border-violet-500/50', glow: 'shadow-violet-950/20', text: 'text-violet-400' },
    amber: { badge: 'bg-amber-950/60 text-amber-400 border-amber-800/60', border: 'hover:border-amber-500/50', glow: 'shadow-amber-950/20', text: 'text-amber-400' },
    rose: { badge: 'bg-rose-950/60 text-rose-400 border-rose-800/60', border: 'hover:border-rose-500/50', glow: 'shadow-rose-950/20', text: 'text-rose-400' },
    blue: { badge: 'bg-blue-950/60 text-blue-400 border-blue-800/60', border: 'hover:border-blue-500/50', glow: 'shadow-blue-950/20', text: 'text-blue-400' },
  };

  const currentTheme = colorMap[instance.color] || colorMap.cyan;

  return (
    <div
      className={`bg-zinc-900/90 rounded-xl border border-zinc-800 p-5 transition-all shadow-md flex flex-col justify-between group ${currentTheme.border} ${currentTheme.glow}`}
    >
      <div>
        {/* Top Header Bar */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isRunning 
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' 
                  : isIdle 
                  ? 'bg-amber-400' 
                  : isPaused 
                  ? 'bg-yellow-400' 
                  : 'bg-zinc-600'
              }`} />
              <h3 className="font-semibold text-zinc-100 text-sm truncate tracking-tight">
                {instance.name}
              </h3>
              {instance.shortcutHotkey && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/80 shrink-0">
                  {instance.shortcutHotkey}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
              {instance.description}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                isRunning
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                  : isIdle
                  ? 'bg-amber-950/60 text-amber-400 border-amber-800/80'
                  : isPaused
                  ? 'bg-yellow-950/60 text-yellow-400 border-yellow-800/80'
                  : 'bg-zinc-950/60 text-zinc-500 border-zinc-800'
              }`}
            >
              {instance.status}
            </span>
            <button
              onClick={() => onEditSettings(instance)}
              title="Edit Instance Settings"
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Timers Row */}
        <div className="bg-zinc-950/80 rounded-lg p-2.5 border border-zinc-800/90 mb-3 grid grid-cols-3 gap-2 text-xs">
          {/* Active Runtime Timer */}
          <div>
            <div className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-cyan-400" />
              RUNTIME
            </div>
            <div className={`font-mono font-medium text-xs mt-0.5 ${isRunning ? 'text-cyan-300' : 'text-zinc-400'}`}>
              {formatSecondsToTime(instance.totalElapsedSeconds)}
            </div>
          </div>

          {/* Idle / Inactivity Timer */}
          <div>
            <div className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
              <Hourglass className="w-3 h-3 text-amber-400" />
              IDLE
            </div>
            <div className="font-mono text-zinc-400 text-xs mt-0.5">
              {isRunning ? formatSecondsToTime(idleSeconds) : '—'}
            </div>
          </div>

          {/* TTL Limit Remaining */}
          <div>
            <div className="text-[10px] text-zinc-500 flex items-center justify-between font-mono">
              <span className="flex items-center gap-1">
                TTL
              </span>
              {instance.ttlMinutes > 0 && (
                <button
                  onClick={() => onExtendTtl(instance.id, 30)}
                  title="Extend session by +30m"
                  className="text-[9px] text-cyan-400 hover:underline cursor-pointer"
                >
                  +30m
                </button>
              )}
            </div>
            <div className={`font-mono text-xs mt-0.5 ${isNearTtl ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>
              {instance.ttlMinutes > 0 ? `${formatSecondsToTime(ttlRemainingSeconds)}` : '∞ infinite'}
            </div>
          </div>
        </div>

        {/* Specs & Metadata */}
        <div className="space-y-2 text-xs mb-3">
          {/* Workspace Path & Git Branch */}
          <div className="flex items-center justify-between bg-zinc-950/40 rounded px-2 py-1 border border-zinc-800/60 font-mono text-[11px] text-zinc-400">
            <span className="truncate flex items-center gap-1.5 mr-2" title={instance.workspacePath}>
              <Folder className="w-3 h-3 text-zinc-500 shrink-0" />
              {instance.workspacePath}
            </span>
            <button
              onClick={handleCopyPath}
              className="text-zinc-500 hover:text-zinc-200 transition cursor-pointer shrink-0"
              title="Copy workspace path"
            >
              {copiedPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-zinc-400 text-[11px] px-1">
            <span className="flex items-center gap-1.5 font-mono text-zinc-300">
              <GitBranch className="w-3 h-3 text-zinc-500" />
              {instance.gitBranch}
            </span>
            <span className="font-mono text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900/50 text-[10px]">
              Port :{instance.port}
            </span>
          </div>

          {/* Model & Account Bind */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 pt-1 border-t border-zinc-800/60">
            <span className="flex items-center gap-1 truncate text-zinc-300">
              <Bot className="w-3 h-3 text-violet-400 shrink-0" />
              {instance.model}
            </span>
            <span className="truncate text-zinc-500 max-w-[130px] font-mono text-right" title={account?.name || 'Account'}>
              {account?.name?.split('-')[0] || 'Default'}
            </span>
          </div>

          {/* Live Telemetry Meters: CPU / RAM / Tokens */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-zinc-400">
            <div className="bg-zinc-950/50 p-1.5 rounded border border-zinc-800/50">
              <span className="text-[9px] text-zinc-500 block">CPU</span>
              <span className="text-zinc-200">{instance.cpuUsagePercent}%</span>
            </div>
            <div className="bg-zinc-950/50 p-1.5 rounded border border-zinc-800/50">
              <span className="text-[9px] text-zinc-500 block">RAM</span>
              <span className="text-zinc-200">{Math.round(instance.ramUsageMb)}M</span>
            </div>
            <div className="bg-zinc-950/50 p-1.5 rounded border border-zinc-800/50">
              <span className="text-[9px] text-zinc-500 block">TOKENS</span>
              <span className="text-zinc-200">{formatCompactNumber(instance.tokensConsumedSession)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls Footer */}
      <div className="pt-3 border-t border-zinc-800/80 space-y-2">
        <div className="flex items-center gap-1.5">
          {/* Main IDE Launcher button */}
          <button
            onClick={() => onOpenIde(instance)}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Launch IDE Console
          </button>

          {/* Quick Power toggles */}
          {isRunning ? (
            <button
              onClick={() => onToggleStatus(instance.id, 'paused')}
              title="Pause instance"
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-lg border border-zinc-700 transition cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onToggleStatus(instance.id, 'running')}
              title="Start instance"
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded-lg border border-zinc-700 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}

          {isRunning && (
            <button
              onClick={() => onToggleStatus(instance.id, 'stopped')}
              title="Stop instance"
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-rose-400 rounded-lg border border-zinc-700 transition cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Secondary Bar: Live Logs & Desktop Shortcut Dropdown */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenLogs(instance)}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs py-1.5 px-2.5 rounded-lg border border-zinc-700/80 transition flex items-center justify-center gap-1.5 cursor-pointer font-mono"
          >
            <Terminal className="w-3 h-3 text-cyan-400" />
            Live Logs
          </button>

          {/* Desktop Shortcut Launcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowShortcutMenu(!showShortcutMenu)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs py-1.5 px-2.5 rounded-lg border border-zinc-700/80 transition flex items-center gap-1 cursor-pointer"
              title="Download Desktop Shortcut"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              Shortcut
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {showShortcutMenu && (
              <div 
                className="absolute right-0 bottom-full mb-1 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-1 z-30 text-xs"
                onMouseLeave={() => setShowShortcutMenu(false)}
              >
                <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 uppercase">
                  Download Shortcut File
                </div>
                
                <button
                  onClick={() => {
                    downloadFile(`antigravity-${instance.name}.desktop`, generateLinuxDesktopEntry(instance));
                    setShowShortcutMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-zinc-800 rounded flex items-center gap-2 text-zinc-200 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Linux Desktop (.desktop)
                </button>

                <button
                  onClick={() => {
                    downloadFile(`launch-${instance.name}.bat`, generateWindowsBatch(instance, account));
                    setShowShortcutMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-zinc-800 rounded flex items-center gap-2 text-zinc-200 cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                  Windows Batch (.bat)
                </button>

                <button
                  onClick={() => {
                    downloadFile(`launch-${instance.name}.sh`, generateBashScript(instance, account));
                    setShowShortcutMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-zinc-800 rounded flex items-center gap-2 text-zinc-200 cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  macOS / Linux Shell (.sh)
                </button>

                <button
                  onClick={() => {
                    downloadFile(`${instance.name}.url`, generateUrlShortcut(instance));
                    setShowShortcutMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-zinc-800 rounded flex items-center gap-2 text-zinc-200 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  Web URL Shortcut (.url)
                </button>

                <div className="border-t border-zinc-800 my-1" />

                <button
                  onClick={() => {
                    handleCopyShell();
                    setShowShortcutMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-zinc-800 rounded flex items-center gap-2 text-zinc-200 cursor-pointer font-mono text-[11px]"
                >
                  {copiedShell ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Shell Command
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
