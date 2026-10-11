import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../api';
import { AntigravityInstance, AntigravityAccount } from '../types/antigravity';
import { formatSecondsToTime, formatCompactNumber } from '../utils/formatters';
import { 
  downloadFile, 
  generateLinuxDesktopEntry, 
  generateWindowsBatch, 
  generateBashScript, 
  generateUrlShortcut, 
  generateShellOneLiner 
} from '../utils/shortcutGenerators';
import { 
  Download, 
  Terminal, 
  ExternalLink, 
  FileCode, 
  FileText, 
  Plus, 
  Folder, 
  Clock, 
  Copy, 
  Check, 
  Settings, 
  Play, 
  Pause,
  Monitor,
  Code
} from 'lucide-react';

interface DesktopShortcutsHubProps {
  instances: AntigravityInstance[];
  accounts: AntigravityAccount[];
  onSelectInstance: (instance: AntigravityInstance) => void;
  onOpenSettings: (instance: AntigravityInstance) => void;
  onCreateNewInstance: () => void;
}

export function DesktopShortcutsHub({
  instances,
  accounts,
  onSelectInstance,
  onOpenSettings,
  onCreateNewInstance,
}: DesktopShortcutsHubProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shortcutCreatedId, setShortcutCreatedId] = useState<string | null>(null);

  const handleCopyCli = (instance: AntigravityInstance) => {
    navigator.clipboard.writeText(generateShellOneLiner(instance));
    setCopiedId(instance.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateDesktopShortcut = async (instance: AntigravityInstance) => {
    if (isTauri()) {
      try {
        await invoke('create_desktop_shortcut', { id: instance.id });
        setShortcutCreatedId(instance.id);
        setTimeout(() => setShortcutCreatedId(null), 3000);
      } catch (err) {
        console.error('Failed to create desktop shortcut:', err);
      }
    } else {
      downloadFile(`${instance.name}.bat`, generateWindowsBatch(instance));
      setShortcutCreatedId(instance.id);
      setTimeout(() => setShortcutCreatedId(null), 3000);
    }
  };

  const handleDownloadAll = () => {
    instances.forEach((inst, idx) => {
      setTimeout(() => {
        downloadFile(`antigravity-${inst.name.replace(/\s+/g, '_')}.desktop`, generateLinuxDesktopEntry(inst));
      }, idx * 100);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0F1012] space-y-6 text-zinc-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#212328] pb-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
            <Monitor className="w-4 h-4 text-[#7D818C]" />
            Desktop Shortcuts & Launchers
          </h2>
          <p className="text-xs text-[#7D818C] mt-0.5">
            Generate and export desktop entry files (.desktop, .bat, .sh, .url) for Antigravity IDE instances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadAll}
            className="px-3 py-1.5 bg-[#16171B] hover:bg-[#1E2026] text-zinc-300 rounded border border-[#272932] text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#7D818C]" />
            Download All (.desktop)
          </button>

          <button
            onClick={onCreateNewInstance}
            className="px-3.5 py-1.5 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Shortcut Profile
          </button>
        </div>
      </div>

      {/* Format Selector Cards */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-mono uppercase text-[#6B7280]">
          Export Targets
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#141519] border border-[#22242B] p-3.5 rounded-lg transition">
            <FileText className="w-4 h-4 text-[#7D818C] mb-2" />
            <h4 className="font-medium text-xs text-zinc-200">Linux Desktop</h4>
            <p className="text-[11px] text-[#6B7280] mt-0.5 font-mono">.desktop standard</p>
          </div>

          <div className="bg-[#141519] border border-[#22242B] p-3.5 rounded-lg transition">
            <FileCode className="w-4 h-4 text-[#7D818C] mb-2" />
            <h4 className="font-medium text-xs text-zinc-200">Windows Batch</h4>
            <p className="text-[11px] text-[#6B7280] mt-0.5 font-mono">.bat script</p>
          </div>

          <div className="bg-[#141519] border border-[#22242B] p-3.5 rounded-lg transition">
            <Terminal className="w-4 h-4 text-[#7D818C] mb-2" />
            <h4 className="font-medium text-xs text-zinc-200">macOS / Linux Shell</h4>
            <p className="text-[11px] text-[#6B7280] mt-0.5 font-mono">.sh bash runner</p>
          </div>

          <div className="bg-[#141519] border border-[#22242B] p-3.5 rounded-lg transition">
            <ExternalLink className="w-4 h-4 text-[#7D818C] mb-2" />
            <h4 className="font-medium text-xs text-zinc-200">Web Protocol</h4>
            <p className="text-[11px] text-[#6B7280] mt-0.5 font-mono">.url URI format</p>
          </div>
        </div>
      </div>

      {/* Configured Instance Shortcuts List */}
      <div className="space-y-2.5 pt-2">
        <h3 className="text-xs font-mono uppercase text-[#6B7280]">
          Configured Instances ({instances.length})
        </h3>

        <div className="space-y-2">
          {instances.map((instance) => {
            const isRunning = instance.status === 'running';

            return (
              <div
                key={instance.id}
                className="bg-[#131418] border border-[#212328] hover:border-[#2C2E36] rounded-lg p-3.5 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Icon & Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded bg-[#1A1B20] border border-[#262830] flex items-center justify-center shrink-0 text-[#7D818C]">
                    <Terminal className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-medium text-zinc-200 truncate">
                        {instance.name}
                      </h4>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRunning ? 'bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-zinc-500'}`} />
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1C1D22] text-[#7D818C] border border-[#262830]">
                        {isRunning ? 'active' : 'stopped'}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#181B24] border border-[#282C3A] text-zinc-300">
                        {instance.appType === 'antigravity' ? 'Antigravity' : 'Antigravity IDE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#7D818C] font-mono mt-0.5">
                      <span className="flex items-center gap-1 truncate max-w-sm text-zinc-400">
                        <Folder className="w-3 h-3 text-[#5A5D66]" />
                        {instance.workspacePath || instance.profileDir || '%USERPROFILE%\\AntigravityProfiles\\' + instance.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Timers & Download Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <div className="text-right font-mono text-xs pr-2 hidden sm:block">
                    <div className="text-zinc-300 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-[#7D818C]" />
                      {formatSecondsToTime(instance.totalElapsedSeconds)}
                    </div>
                    <div className="text-[10px] text-[#6B7280]">
                      {isRunning ? 'Uptime' : 'Duration'}
                    </div>
                  </div>

                  {/* Add to Desktop .lnk Button */}
                  <button
                    onClick={() => handleCreateDesktopShortcut(instance)}
                    className="px-2.5 py-1.5 bg-[#1B1D24] hover:bg-[#252834] text-zinc-200 hover:text-white rounded border border-[#2B2F3D] transition cursor-pointer flex items-center gap-1.5 text-xs font-mono"
                    title="Create Windows Desktop .lnk shortcut with Antigravity icon"
                  >
                    {shortcutCreatedId === instance.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Monitor className="w-3.5 h-3.5 text-blue-400" />
                    )}
                    <span className="hidden lg:inline">
                      {shortcutCreatedId === instance.id ? 'Created!' : 'Add to Desktop'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleCopyCli(instance)}
                    className="p-1.5 bg-[#1A1B20] hover:bg-[#22242B] text-[#7D818C] hover:text-zinc-200 rounded border border-[#262830] transition cursor-pointer"
                    title="Copy CLI Launcher Command"
                  >
                    {copiedId === instance.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => onOpenSettings(instance)}
                    className="p-1.5 bg-[#1A1B20] hover:bg-[#22242B] text-[#7D818C] hover:text-zinc-200 rounded border border-[#262830] transition cursor-pointer"
                    title="Configure Session Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSelectInstance(instance)}
                    className="px-3 py-1.5 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Session
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
