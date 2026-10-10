import React from 'react';
import {
  Monitor,
  Shield,
  Plus,
  Play,
  Square,
  Settings,
  Code2,
  Terminal,
  TableProperties,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import type { InstanceItem } from '../types';

interface SidebarProps {
  instances: InstanceItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenNewInstance: () => void;
  onToggleInstance: (id: string, e: React.MouseEvent) => void;
  activeSessionsCount: number;
  maxSessionsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  instances,
  collapsed,
  onToggleCollapse,
  onOpenNewInstance,
  onToggleInstance,
  activeSessionsCount,
  maxSessionsCount,
}) => {
  const renderInstanceIcon = (type?: string) => {
    switch (type) {
      case 'window':
        return <Terminal className="w-3.5 h-3.5 text-blue-400" />;
      case 'table':
        return <TableProperties className="w-3.5 h-3.5 text-emerald-400" />;
      case 'sparkle':
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
      case 'code':
        return <Code2 className="w-3.5 h-3.5 text-purple-400" />;
      case 'brackets':
      default:
        return <Code2 className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-72'
      } bg-[#0c1017] border-r border-[#1a2333] flex flex-col shrink-0 transition-all duration-200 select-none h-full z-20`}
    >
      {/* Brand & Collapse toggle */}
      <div className="p-3 border-b border-[#1a2333] flex items-center justify-between h-14">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs shadow-inner">
              ▲
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-[#f1f5f9] tracking-tight">
                Fleet Hub
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 mx-auto rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs">
            ▲
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="text-[#64748b] hover:text-[#cbd5e1] p-1.5 rounded hover:bg-[#1e293b] text-xs transition cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <span className="font-mono text-xs">&lt; &gt;</span>}
        </button>
      </div>

      {/* Quick Action: New Instance Button */}
      <div className="p-3">
        <button
          onClick={onOpenNewInstance}
          className={`w-full py-2 px-3 bg-[#111724] hover:bg-[#172235] border border-[#22334e] hover:border-blue-500/40 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm group`}
          title="Create New Instance Shortcut"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
          {!collapsed && <span>New Instance Shortcut</span>}
        </button>
      </div>

      {/* Navigation items */}
      <div className="px-2 space-y-1">
        <div
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-between'
          } px-3 py-2 text-xs text-[#94a3b8] hover:bg-[#162030] rounded-md cursor-pointer group transition`}
          title="Desktop Shortcuts Hub"
        >
          <div className="flex items-center gap-2.5">
            <Monitor className="w-3.5 h-3.5 text-[#64748b] group-hover:text-blue-400" />
            {!collapsed && <span>Desktop Shortcuts Hub</span>}
          </div>
          {!collapsed && (
            <span className="text-[11px] font-mono text-[#64748b]">
              {instances.length}
            </span>
          )}
        </div>

        <div
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-between'
          } px-3 py-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/25 rounded-md cursor-pointer font-medium transition`}
          title="All Account Quotas & Limits"
        >
          <div className="flex items-center gap-2.5">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            {!collapsed && <span>All Account Quotas &amp; Limits</span>}
          </div>
          {!collapsed && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              86%
            </span>
          )}
        </div>
      </div>

      {/* Instances Section Header */}
      {!collapsed && (
        <div className="px-4 pt-5 pb-2 flex items-center justify-between text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
          <span>
            Instances ({instances.length})
          </span>
          <button className="hover:text-slate-300 normal-case text-xs transition cursor-pointer">
            All
          </button>
        </div>
      )}

      {/* Instances Scroll List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1.5 min-h-0">
        {instances.map((inst) => {
          const isRunning = inst.status === 'running';

          return (
            <div
              key={inst.id}
              className={`p-2 rounded-lg bg-[#0e1420] hover:bg-[#141d2e] border ${
                isRunning ? 'border-blue-500/30 shadow-sm' : 'border-[#1a2333]'
              } transition cursor-pointer group relative`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  {/* Instance Icon badge */}
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                      inst.iconBg || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {renderInstanceIcon(inst.iconType)}
                  </div>

                  {!collapsed && (
                    <span
                      className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 truncate"
                      title={inst.name}
                    >
                      {inst.name}
                    </span>
                  )}
                </div>

                {/* Status Dot & Action Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Hover action toggle */}
                  <button
                    onClick={(e) => onToggleInstance(inst.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-[10px] font-bold px-1.5 py-0.5 rounded transition cursor-pointer z-10 flex items-center gap-1"
                    style={{
                      backgroundColor: isRunning ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: isRunning ? '#fda4af' : '#6ee7b7',
                      border: isRunning ? '1px solid rgba(244, 63, 94, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                    }}
                    title={isRunning ? 'Stop instance' : 'Launch instance'}
                  >
                    {isRunning ? (
                      <>
                        <Square className="w-2.5 h-2.5 fill-current" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Open</span>
                      </>
                    )}
                  </button>

                  {/* Pulsing Dot */}
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRunning
                        ? 'bg-emerald-400 pulse-dot shadow-[0_0_8px_#34d399]'
                        : inst.dotColor || 'bg-slate-500'
                    }`}
                  />
                </div>
              </div>

              {!collapsed && (
                <div className="flex items-center justify-between text-[10px] text-[#64748b] mt-1 font-mono pl-8">
                  <span className="truncate max-w-[110px]" title={inst.accountName}>
                    {inst.accountName}
                  </span>
                  <span className="text-slate-400">
                    :{inst.port} &bull; {inst.tokensStr}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Session Counter & User Profile Pill */}
      <div className="p-3 border-t border-[#1a2333] bg-[#090d14] space-y-2.5 shrink-0">
        {!collapsed && (
          <div>
            <div className="flex items-center justify-between text-xs text-[#64748b] mb-1">
              <span>Fleet Active Sessions</span>
              <span className="font-mono text-[#cbd5e1] font-semibold text-[11px]">
                {activeSessionsCount} / {maxSessionsCount} active
              </span>
            </div>
            {/* Visual sessions meter bar */}
            <div className="w-full h-1 bg-[#162030] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((activeSessionsCount / Math.max(1, maxSessionsCount)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-2 rounded-lg bg-[#111722] border border-[#1e293b]">
          <div className="flex items-center gap-2 truncate">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              U
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span
                  className="text-[11px] font-semibold text-slate-200 truncate"
                  title="dev-personal@antigravity.ai"
                >
                  dev-personal@antigravity.ai
                </span>
                <span className="text-[10px] text-blue-400 font-medium">
                  Pro &bull; Windows
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              className="text-[#64748b] hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
              title="Profile & Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
