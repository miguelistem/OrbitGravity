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
  Terminal, 
  ExternalLink, 
  Play, 
  Pause, 
  Settings, 
  Download, 
  FileCode, 
  FileText, 
  Copy, 
  Check, 
  Plus, 
  Folder, 
  Cpu, 
  Code, 
  Database, 
  Zap, 
  Bot, 
  Layers, 
  Clock, 
  Info,
  Server
} from 'lucide-react';

interface DesktopSurfaceViewProps {
  instances: AntigravityInstance[];
  accounts: AntigravityAccount[];
  onOpenIde: (instance: AntigravityInstance) => void;
  onOpenLogs: (instance: AntigravityInstance) => void;
  onToggleStatus: (id: string, newStatus: 'running' | 'paused' | 'stopped') => void;
  onEditSettings: (instance: AntigravityInstance) => void;
  onCreateNewInstance: () => void;
}

export function DesktopSurfaceView({
  instances,
  accounts,
  onOpenIde,
  onOpenLogs,
  onToggleStatus,
  onEditSettings,
  onCreateNewInstance,
}: DesktopSurfaceViewProps) {
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    instances.length > 0 ? instances[0].id : null
  );
  const [copiedShell, setCopiedShell] = useState(false);

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId) || instances[0];
  const selectedAccount = accounts.find((a) => a.id === selectedInstance?.accountId);

  const getIconComponent = (icon: string) => {
    switch (icon) {
      case 'cpu': return <Cpu className="w-8 h-8" />;
      case 'code': return <Code className="w-8 h-8" />;
      case 'database': return <Database className="w-8 h-8" />;
      case 'zap': return <Zap className="w-8 h-8" />;
      case 'bot': return <Bot className="w-8 h-8" />;
      case 'layers': return <Layers className="w-8 h-8" />;
      case 'server': return <Server className="w-8 h-8" />;
      default: return <Terminal className="w-8 h-8" />;
    }
  };

  const handleCopyShell = () => {
    if (!selectedInstance) return;
    navigator.clipboard.writeText(generateShellOneLiner(selectedInstance));
    setCopiedShell(true);
    setTimeout(() => setCopiedShell(false), 2000);
  };

  const handleDownloadAllShortcuts = () => {
    // Downloads all .desktop files
    instances.forEach((inst) => {
      const account = accounts.find((a) => a.id === inst.accountId);
      setTimeout(() => {
        downloadFile(`antigravity-${inst.name.replace(/\s+/g, '_')}.desktop`, generateLinuxDesktopEntry(inst));
      }, 100);
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Desktop Canvas / Grid */}
      <div className="xl:col-span-2 bg-zinc-950/90 rounded-2xl border border-zinc-800 p-6 min-h-[540px] flex flex-col justify-between relative overflow-hidden shadow-2xl">
        {/* Subtle engineering grid texture */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top desktop header bar */}
        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              ~/Desktop/Antigravity_Shortcuts
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              {instances.length} instance shortcuts configured
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAllShortcuts}
              className="text-xs px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 transition flex items-center gap-1.5 cursor-pointer"
              title="Download all desktop launcher shortcuts"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Download All (.desktop)
            </button>
            <button
              onClick={onCreateNewInstance}
              className="text-xs px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Shortcut
            </button>
          </div>
        </div>

        {/* Desktop Icon Grid */}
        <div className="relative z-10 py-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 select-none">
          {instances.map((instance) => {
            const isSelected = selectedInstanceId === instance.id;
            const isRunning = instance.status === 'running';

            return (
              <div
                key={instance.id}
                onClick={() => setSelectedInstanceId(instance.id)}
                onDoubleClick={() => onOpenIde(instance)}
                className={`flex flex-col items-center text-center p-3.5 rounded-xl cursor-pointer transition-all group relative border ${
                  isSelected
                    ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                    : 'bg-zinc-900/40 border-transparent hover:bg-zinc-900/80 hover:border-zinc-800'
                }`}
              >
                {/* Status indicator dot */}
                <div className="absolute top-2 right-2">
                  <span
                    className={`block w-2.5 h-2.5 rounded-full ${
                      isRunning
                        ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : instance.status === 'idle'
                        ? 'bg-amber-400'
                        : instance.status === 'paused'
                        ? 'bg-yellow-400'
                        : 'bg-zinc-600'
                    }`}
                  />
                </div>

                {/* Desktop Icon Emblem */}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-md relative ${
                    instance.color === 'cyan'
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-700 text-cyan-100 shadow-cyan-900/30'
                      : instance.color === 'emerald'
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-emerald-100 shadow-emerald-900/30'
                      : instance.color === 'violet'
                      ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-violet-100 shadow-violet-900/30'
                      : instance.color === 'amber'
                      ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-amber-100 shadow-amber-900/30'
                      : instance.color === 'rose'
                      ? 'bg-gradient-to-br from-rose-600 to-pink-700 text-rose-100 shadow-rose-900/30'
                      : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-blue-100 shadow-blue-900/30'
                  }`}
                >
                  {getIconComponent(instance.icon)}

                  {/* Hotkey badge if set */}
                  {instance.shortcutHotkey && (
                    <span className="absolute -bottom-1 -right-1 bg-zinc-950 border border-zinc-700 text-zinc-300 text-[9px] font-mono px-1 rounded shadow">
                      {instance.shortcutHotkey.replace('Ctrl+Alt+', '⌃⌥')}
                    </span>
                  )}
                </div>

                {/* Shortcut Label */}
                <span className="mt-3 text-xs font-medium text-zinc-200 line-clamp-2 group-hover:text-cyan-300 transition-colors">
                  {instance.name}
                </span>

                {/* Active Live Timer or Port */}
                <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                  {isRunning ? (
                    <span className="text-cyan-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatSecondsToTime(instance.totalElapsedSeconds)}
                    </span>
                  ) : (
                    <span>:{instance.port}</span>
                  )}
                </div>

                {/* Double click prompt hint on hover */}
                <span className="text-[9px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 font-mono">
                  Double-click launch
                </span>
              </div>
            );
          })}

          {/* Quick Create shortcut tile */}
          <div
            onClick={onCreateNewInstance}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl cursor-pointer border border-dashed border-zinc-800 hover:border-cyan-500/60 hover:bg-zinc-900/40 transition-all text-zinc-500 hover:text-cyan-400 group min-h-[140px]"
          >
            <div className="w-12 h-12 rounded-xl border border-dashed border-zinc-700 group-hover:border-cyan-500 flex items-center justify-center mb-2 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200">
              New Desktop Shortcut
            </span>
            <span className="text-[10px] text-zinc-600 mt-0.5 font-mono">
              Configure session
            </span>
          </div>
        </div>

        {/* Bottom hint dock */}
        <div className="relative z-10 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select a shortcut to view launcher specs or download script files (.desktop, .bat, .sh)</span>
          </div>
          <span>Tip: Double-click any icon to launch virtual IDE</span>
        </div>
      </div>

      {/* Selected Shortcut Inspector / Generator Panel */}
      {selectedInstance && (
        <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-6 flex flex-col justify-between shadow-xl">
          <div>
            {/* Inspector Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider">
                  Shortcut Inspector
                </span>
                <h3 className="text-base font-semibold text-zinc-100 mt-0.5">
                  {selectedInstance.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {selectedInstance.description}
                </p>
              </div>

              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border shrink-0 ${
                  selectedInstance.status === 'running'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                    : selectedInstance.status === 'idle'
                    ? 'bg-amber-950/60 text-amber-400 border-amber-800/80'
                    : selectedInstance.status === 'paused'
                    ? 'bg-yellow-950/60 text-yellow-400 border-yellow-800/80'
                    : 'bg-zinc-950/60 text-zinc-500 border-zinc-800'
                }`}
              >
                {selectedInstance.status}
              </span>
            </div>

            {/* Spec Details */}
            <div className="py-4 space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Workspace Directory</span>
                <div className="mt-1 bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-800 font-mono text-[11px] text-zinc-300 flex items-center justify-between">
                  <span className="truncate mr-2">{selectedInstance.workspacePath}</span>
                  <Folder className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">Port Binding</span>
                  <div className="mt-1 bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-800 font-mono text-cyan-400 text-xs">
                    http://localhost:{selectedInstance.port}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">Active Timer</span>
                  <div className="mt-1 bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-800 font-mono text-zinc-300 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {formatSecondsToTime(selectedInstance.totalElapsedSeconds)}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Model & Autonomy</span>
                <div className="mt-1 bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-800 text-zinc-300 text-xs flex items-center justify-between font-mono">
                  <span>{selectedInstance.model}</span>
                  <span className="text-[10px] text-cyan-400 capitalize">{selectedInstance.agentAutonomy}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Bound Account & Quotas</span>
                <div className="mt-1 bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-800 text-zinc-300 text-xs flex items-center justify-between">
                  <span className="truncate max-w-[160px]">{selectedAccount?.name || 'Default Account'}</span>
                  <span className="font-mono text-zinc-400 text-[11px]">
                    {formatCompactNumber(selectedAccount?.tokensUsed || 0)} tokens
                  </span>
                </div>
              </div>

              {/* Launcher Command One-Liner */}
              <div>
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase">
                  <span>Direct CLI Launcher</span>
                  <button
                    onClick={handleCopyShell}
                    className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedShell ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <div className="mt-1 bg-zinc-950 p-2 rounded border border-zinc-800/80 font-mono text-[10px] text-zinc-400 break-all select-all">
                  {generateShellOneLiner(selectedInstance)}
                </div>
              </div>
            </div>

            {/* Desktop Shortcut Download Buttons */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                Generate & Download Shortcut Files:
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => downloadFile(`antigravity-${selectedInstance.name}.desktop`, generateLinuxDesktopEntry(selectedInstance))}
                  className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 transition flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="text-left">
                    <div className="font-medium">.desktop</div>
                    <div className="text-[10px] text-zinc-500">Linux Launcher</div>
                  </div>
                </button>

                <button
                  onClick={() => downloadFile(`launch-${selectedInstance.name}.bat`, generateWindowsBatch(selectedInstance, selectedAccount))}
                  className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 transition flex items-center gap-2 cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="text-left">
                    <div className="font-medium">.bat Script</div>
                    <div className="text-[10px] text-zinc-500">Windows Batch</div>
                  </div>
                </button>

                <button
                  onClick={() => downloadFile(`launch-${selectedInstance.name}.sh`, generateBashScript(selectedInstance, selectedAccount))}
                  className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 transition flex items-center gap-2 cursor-pointer"
                >
                  <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-left">
                    <div className="font-medium">.sh Script</div>
                    <div className="text-[10px] text-zinc-500">macOS / Linux</div>
                  </div>
                </button>

                <button
                  onClick={() => downloadFile(`${selectedInstance.name}.url`, generateUrlShortcut(selectedInstance))}
                  className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 transition flex items-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="text-left">
                    <div className="font-medium">.url File</div>
                    <div className="text-[10px] text-zinc-500">Web Shortcut</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 mt-4 border-t border-zinc-800 flex items-center gap-2">
            <button
              onClick={() => onOpenIde(selectedInstance)}
              className="flex-1 py-2.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open IDE Workspace
            </button>

            <button
              onClick={() => onOpenLogs(selectedInstance)}
              className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono transition flex items-center justify-center gap-1.5 border border-zinc-700 cursor-pointer"
              title="View live log stream"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Logs
            </button>

            <button
              onClick={() => onEditSettings(selectedInstance)}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition cursor-pointer"
              title="Edit session settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
