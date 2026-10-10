import React, { useState } from 'react';
import {
  Monitor,
  Download,
  Plus,
  Terminal,
  FileCode,
  Globe,
  Clock,
  Copy,
  Settings2,
  ExternalLink,
  Check,
} from 'lucide-react';
import type { InstanceItem } from '../types';

interface DesktopShortcutsViewProps {
  instances: InstanceItem[];
  onOpenNewInstance: () => void;
  onLaunchInstance: (id: string, e: React.MouseEvent) => void;
  onDownloadAllShortcuts: (targetKey: string) => void;
  onDownloadInstanceShortcut: (inst: InstanceItem, targetKey: string) => void;
  onCopyShortcutCommand: (inst: InstanceItem) => void;
  onExportTarget: (targetKey: string) => void;
}

export const DesktopShortcutsView: React.FC<DesktopShortcutsViewProps> = ({
  instances,
  onOpenNewInstance,
  onLaunchInstance,
  onDownloadAllShortcuts,
  onDownloadInstanceShortcut,
  onCopyShortcutCommand,
  onExportTarget,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>('windows-batch');

  const handleCopy = (inst: InstanceItem) => {
    onCopyShortcutCommand(inst);
    setCopiedId(inst.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (inst: InstanceItem) => {
    onDownloadInstanceShortcut(inst, selectedTarget);
    setDownloadedId(inst.id);
    setTimeout(() => setDownloadedId(null), 2000);
  };

  const exportTargets = [
    {
      id: 'linux-desktop',
      title: 'Linux Desktop',
      sub: '.desktop standard',
      icon: <Monitor className="w-4 h-4 text-slate-300" />,
    },
    {
      id: 'windows-batch',
      title: 'Windows Batch',
      sub: '.bat script',
      icon: <FileCode className="w-4 h-4 text-slate-300" />,
    },
    {
      id: 'macos-shell',
      title: 'macOS / Linux Shell',
      sub: '.sh bash runner',
      icon: <Terminal className="w-4 h-4 text-slate-300" />,
    },
    {
      id: 'web-protocol',
      title: 'Web Protocol',
      sub: '.url URI format',
      icon: <Globe className="w-4 h-4 text-slate-300" />,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#090d14] text-slate-200 select-none">
      {/* View Header */}
      <div className="flex items-start justify-between pb-6 border-b border-[#161f2e]">
        <div>
          <div className="flex items-center gap-2.5">
            <Monitor className="w-5 h-5 text-slate-300" />
            <h1 className="text-base font-bold text-white tracking-tight">
              Desktop Shortcuts &amp; Launchers
            </h1>
          </div>
          <p className="text-xs text-[#64748b] mt-1 font-normal">
            Generate and export desktop entry files (.desktop, .bat, .sh, .url) for Antigravity IDE instances.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onDownloadAllShortcuts(selectedTarget)}
            className="py-1.5 px-3 bg-[#121722] hover:bg-[#182030] border border-[#222e42] hover:border-slate-600 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Download All (
              {selectedTarget === 'windows-batch'
                ? '.bat'
                : selectedTarget === 'linux-desktop'
                ? '.desktop'
                : selectedTarget === 'macos-shell'
                ? '.sh'
                : '.url'}
              )
            </span>
          </button>

          <button
            onClick={onOpenNewInstance}
            className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Shortcut Profile</span>
          </button>
        </div>
      </div>

      {/* Section 1: EXPORT TARGETS */}
      <div className="mt-5">
        <div className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-2.5">
          Export Targets
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {exportTargets.map((tgt) => {
            const isSelected = selectedTarget === tgt.id;
            return (
              <div
                key={tgt.id}
                onClick={() => {
                  setSelectedTarget(tgt.id);
                  onExportTarget(tgt.id);
                }}
                className={`p-3.5 rounded-xl bg-[#0d121c] border ${
                  isSelected
                    ? 'border-blue-500/50 bg-[#101726] shadow-sm shadow-blue-500/10'
                    : 'border-[#1b2434] hover:border-[#2b3952] hover:bg-[#111724]'
                } transition cursor-pointer flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#151c2a] border border-[#222d42] flex items-center justify-center">
                    {tgt.icon}
                  </div>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white tracking-tight">
                    {tgt.title}
                  </div>
                  <div className="text-[11px] text-[#64748b] font-mono mt-0.5">
                    {tgt.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: CONFIGURED INSTANCES (5) */}
      <div className="mt-7">
        <div className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-3">
          Configured Instances ({instances.length})
        </div>

        <div className="space-y-2">
          {instances.map((inst) => {
            const isRunning = inst.status === 'running';

            return (
              <div
                key={inst.id}
                className={`p-3.5 rounded-xl bg-[#0d121c] border ${
                  isRunning ? 'border-[#1f2d42] bg-[#0e1422]' : 'border-[#182030]'
                } hover:border-[#283852] hover:bg-[#111827] transition flex flex-col lg:flex-row lg:items-center justify-between gap-3 group`}
              >
                {/* Left: Icon & Instance Info */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Chevron >_ Icon */}
                  <div className="w-8 h-8 rounded-lg bg-[#141b28] border border-[#222d42] flex items-center justify-center shrink-0 text-[#818cf8]">
                    <span className="font-mono text-xs font-bold">&gt;_</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-100 group-hover:text-blue-300 transition-colors truncate">
                        {inst.name}
                      </span>
                      {inst.shortcutKey && (
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#162032] border border-[#24334f] text-[#93c5fd]">
                          {inst.shortcutKey}
                        </span>
                      )}
                    </div>

                    {/* Subtitle Line */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748b] font-mono mt-0.5 truncate">
                      <span className="truncate max-w-[280px]" title={inst.breadcrumbPath || inst.workspacePath}>
                        {inst.breadcrumbPath || inst.workspacePath || inst.accountName}
                      </span>
                      <span>&bull;</span>
                      <span>Port :{inst.port}</span>
                      {inst.model && (
                        <>
                          <span>&bull;</span>
                          <span className="text-[#94a3b8]">{inst.model}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Metrics & Action Buttons */}
                <div className="flex items-center gap-3 shrink-0 self-end lg:self-auto">
                  {/* Duration timer */}
                  <div className="flex items-center gap-1 text-[11px] font-mono text-[#8091a7]">
                    <Clock className="w-3.5 h-3.5 text-[#64748b]" />
                    <span>{inst.duration || '00:00:00'}</span>
                  </div>

                  {/* Token Count */}
                  <div className="text-[11px] font-mono text-[#64748b] min-w-[70px] text-right">
                    {inst.tokensStr}
                  </div>

                  {/* Action 1: Copy script / snippet */}
                  <button
                    onClick={() => handleCopy(inst)}
                    className="p-1.5 rounded-md hover:bg-[#1a2436] text-[#64748b] hover:text-slate-200 transition cursor-pointer"
                    title="Copy launcher command"
                  >
                    {copiedId === inst.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Action 2: Download Launcher */}
                  <button
                    onClick={() => handleDownload(inst)}
                    className="p-1.5 rounded-md hover:bg-[#1a2436] text-[#64748b] hover:text-slate-200 transition cursor-pointer"
                    title={`Download ${
                      selectedTarget === 'windows-batch'
                        ? '.bat'
                        : selectedTarget === 'linux-desktop'
                        ? '.desktop'
                        : selectedTarget === 'macos-shell'
                        ? '.sh'
                        : '.url'
                    } launcher`}
                  >
                    {downloadedId === inst.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Action 3: Settings */}
                  <button
                    className="p-1.5 rounded-md hover:bg-[#1a2436] text-[#64748b] hover:text-slate-200 transition cursor-pointer"
                    title="Configure instance"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Action 4: Vibrant Blue Open Session button */}
                  <button
                    onClick={(e) => onLaunchInstance(inst.id, e)}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                      isRunning
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25 ring-1 ring-blue-400/40'
                        : 'bg-blue-600/90 hover:bg-blue-600 text-white hover:shadow-blue-600/20'
                    }`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Session</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
