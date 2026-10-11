import { useState } from 'react';
import { AntigravityInstance, AntigravityAccount } from '../types/antigravity';
import { formatCompactNumber, formatSecondsToTime } from '../utils/formatters';
import { 
  Boxes, 
  Monitor, 
  ShieldCheck, 
  Plus, 
  Terminal, 
  Clock, 
  Download, 
  Upload, 
  Zap, 
  Check, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  viewMode: 'fleet' | 'desktop' | 'accounts';
  onSelectViewMode: (mode: 'fleet' | 'desktop' | 'accounts') => void;
  instances: AntigravityInstance[];
  accounts: AntigravityAccount[];
  onCreateNewInstance: () => void;
  onExportFleet: () => void;
  onImportFleet: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Header({
  viewMode,
  onSelectViewMode,
  instances,
  accounts,
  onCreateNewInstance,
  onExportFleet,
  onImportFleet,
}: HeaderProps) {
  const activeCount = instances.filter((i) => i.status === 'running').length;
  const idleCount = instances.filter((i) => i.status === 'idle').length;
  const totalFleetElapsed = instances.reduce((acc, curr) => acc + curr.totalElapsedSeconds, 0);
  const totalFleetTokens = instances.reduce((acc, curr) => acc + curr.tokensConsumedSession, 0);

  return (
    <header className="border-b border-zinc-800/90 bg-zinc-950/95 sticky top-0 z-40 backdrop-blur-md">
      {/* Top Brand & Stats Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-950/40">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Boxes className="w-5 h-5 text-cyan-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                ANTIGRAVITY
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                  FLEET v2.8
                </span>
              </h1>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {activeCount} IDE{activeCount === 1 ? '' : 's'} running
              </span>
              <span className="text-zinc-600">·</span>
              <span>{idleCount} idle</span>
              <span className="text-zinc-600">·</span>
              <span>{instances.length} shortcuts total</span>
            </div>
          </div>
        </div>

        {/* Center: Live Fleet Aggregate Strip */}
        <div className="hidden lg:flex items-center gap-6 bg-zinc-900/60 border border-zinc-800/80 px-4 py-1.5 rounded-xl font-mono text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-zinc-400">TOTAL FLEET TIME:</span>
            <span className="text-zinc-200 font-medium">{formatSecondsToTime(totalFleetElapsed)}</span>
          </div>

          <div className="h-3 w-[1px] bg-zinc-800" />

          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-zinc-400">FLEET TOKENS:</span>
            <span className="text-zinc-200 font-medium">{formatCompactNumber(totalFleetTokens)}</span>
          </div>

          <div className="h-3 w-[1px] bg-zinc-800" />

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400">ACCOUNTS:</span>
            <span className="text-zinc-200 font-medium">{accounts.length} connected</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Export / Import buttons */}
          <button
            onClick={onExportFleet}
            title="Export Fleet & Shortcuts JSON"
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg border border-zinc-800 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          <label
            title="Import Fleet Config"
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg border border-zinc-800 transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={onImportFleet} className="hidden" />
          </label>

          {/* New Shortcut / Instance button */}
          <button
            onClick={onCreateNewInstance}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Desktop Shortcut</span>
          </button>
        </div>
      </div>

      {/* Sub-bar: Navigation Segmented Views */}
      <div className="border-t border-zinc-800/80 bg-zinc-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-11">
          <div className="flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-lg border border-zinc-800 text-xs">
            <button
              onClick={() => onSelectViewMode('fleet')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'fleet'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Fleet Control Grid ({instances.length})</span>
            </button>

            <button
              onClick={() => onSelectViewMode('desktop')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'desktop'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              <span>Desktop Shortcuts Canvas</span>
            </button>

            <button
              onClick={() => onSelectViewMode('accounts')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'accounts'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              <span>Accounts & Quota Limits ({accounts.length})</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-zinc-500 hidden sm:block">
            Antigravity Multi-Process Host: <span className="text-zinc-400">127.0.0.1</span>
          </div>
        </div>
      </div>
    </header>
  );
}
