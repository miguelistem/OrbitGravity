import React from 'react';
import {
  Monitor,
  Shield,
  Plus,
  Settings,
  Code2,
  Terminal,
  TableProperties,
  Sparkles,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';
import type { InstanceItem, NavTab } from '../types';
import { OrbitGravityLogo } from './OrbitGravityLogo';

interface SidebarProps {
  instances: InstanceItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenNewInstance: () => void;
  onToggleInstance: (id: string, e: React.MouseEvent) => void;
  activeSessionsCount: number;
  maxSessionsCount: number;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  selectedInstanceId?: string;
  onSelectInstance?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  instances,
  collapsed,
  onToggleCollapse,
  onOpenNewInstance,
  onToggleInstance,
  activeSessionsCount,
  maxSessionsCount,
  activeTab,
  onSelectTab,
  selectedInstanceId = 'inst_1',
  onSelectInstance,
}) => {
  const renderInstanceIcon = (type?: string) => {
    switch (type) {
      case 'window':
        return <Terminal className="w-3.5 h-3.5 text-blue-400" />;
      case 'table':
        return <TableProperties className="w-3.5 h-3.5 text-slate-400" />;
      case 'sparkle':
        return <Sparkles className="w-3.5 h-3.5 text-slate-400" />;
      case 'code':
        return <Code2 className="w-3.5 h-3.5 text-slate-400" />;
      case 'brackets':
      default:
        return <Code2 className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-72'
      } bg-[#0c1017] border-r border-[#182030] flex flex-col shrink-0 transition-all duration-200 select-none h-full z-20`}
    >
      {/* Brand & Collapse toggle */}
      <div className="p-3 border-b border-[#182030] flex items-center justify-between h-14">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <OrbitGravityLogo variant="squircle" size={28} />
            <div className="flex flex-col">
              <span className="font-bold text-sm text-[#f1f5f9] tracking-tight">
                OrbitGravity
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto">
            <OrbitGravityLogo variant="squircle" size={26} />
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

      {/* Navigation tabs matching screenshot */}
      <div className="px-2 space-y-1">
        {/* Session Workspace */}
        <div
          onClick={() => onSelectTab('workspace')}
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-between'
          } px-3 py-2 text-xs rounded-md cursor-pointer transition ${
            activeTab === 'workspace'
              ? 'text-blue-400 bg-blue-500/10 border border-blue-500/25 font-medium'
              : 'text-[#8b99ae] hover:bg-[#141b27] hover:text-slate-200'
          }`}
          title="Session Workspace"
        >
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="w-3.5 h-3.5 text-[#64748b]" />
            {!collapsed && <span>Session Workspace</span>}
          </div>
        </div>

        {/* Desktop Shortcuts Hub */}
        <div
          onClick={() => onSelectTab('shortcuts')}
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-between'
          } px-3 py-2 text-xs rounded-md cursor-pointer transition ${
            activeTab === 'shortcuts'
              ? 'text-blue-400 bg-blue-500/10 border border-blue-500/25 font-medium'
              : 'text-[#8b99ae] hover:bg-[#141b27] hover:text-slate-200'
          }`}
          title="Desktop Shortcuts Hub"
        >
          <div className="flex items-center gap-2.5">
            <Monitor className="w-3.5 h-3.5" />
            {!collapsed && <span>Desktop Shortcuts Hub</span>}
          </div>
          {!collapsed && (
            <span className="text-[11px] font-mono text-[#64748b]">
              {instances.length}
            </span>
          )}
        </div>

        {/* Account Quotas */}
        <div
          onClick={() => onSelectTab('quotas')}
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-between'
          } px-3 py-2 text-xs rounded-md cursor-pointer transition ${
            activeTab === 'quotas'
              ? 'text-blue-400 bg-blue-500/10 border border-blue-500/25 font-medium'
              : 'text-[#8b99ae] hover:bg-[#141b27] hover:text-slate-200'
          }`}
          title="Account Quotas & Telemetry"
        >
          <div className="flex items-center gap-2.5">
            <Shield className="w-3.5 h-3.5" />
            {!collapsed && <span>Account Quotas</span>}
          </div>
          {!collapsed && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
              40%
            </span>
          )}
        </div>
      </div>

      {/* Instances Section Header */}
      {!collapsed && (
        <div className="px-4 pt-5 pb-2 flex items-center justify-between text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
          <span>Instances ({instances.length})</span>
          <button
            onClick={() => onSelectTab('shortcuts')}
            className="hover:text-slate-300 normal-case text-xs cursor-pointer bg-transparent border-0"
          >
            All
          </button>
        </div>
      )}

      {/* Instances Scroll List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1">
        {instances.map((inst) => {
          const isSelected = selectedInstanceId === inst.id;
          const isRunning = inst.status === 'running';

          if (collapsed) {
            return (
              <div
                key={inst.id}
                onClick={() => onSelectInstance && onSelectInstance(inst.id)}
                className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center transition cursor-pointer relative group ${
                  isSelected ? 'bg-[#162032] border border-blue-500/40' : 'hover:bg-[#141d2e]'
                }`}
                title={`${inst.name} (${inst.status})`}
              >
                {renderInstanceIcon(inst.iconType)}
                <span
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
              </div>
            );
          }

          return (
            <div
              key={inst.id}
              onClick={() => onSelectInstance && onSelectInstance(inst.id)}
              className={`p-2.5 rounded-lg border transition cursor-pointer group ${
                isSelected
                  ? 'bg-[#121927] border-blue-500/35 shadow-sm'
                  : isRunning
                  ? 'bg-[#0e1420] border-[#1f2b3e] hover:bg-[#141d2c]'
                  : 'bg-[#0d121c] border-[#182030] hover:bg-[#121824]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold truncate ${
                      isSelected ? 'text-blue-300' : 'text-slate-200 group-hover:text-white'
                    }`}
                    title={inst.name}
                  >
                    {inst.name}
                  </span>
                </div>

                {/* Quick toggle Open/Stop */}
                <button
                  onClick={(e) => onToggleInstance(inst.id, e)}
                  className={`opacity-0 group-hover:opacity-100 text-[10px] font-bold px-1.5 py-0.5 rounded transition cursor-pointer shrink-0 ml-1 ${
                    isRunning
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  }`}
                >
                  {isRunning ? 'Stop' : 'Open'}
                </button>
              </div>

              {/* Sub-line: Port & Tokens */}
              <div className="flex items-center justify-between text-[10px] text-[#64748b] mt-1 font-mono pl-3.5">
                <span className="truncate max-w-[110px]">Port :{inst.port}</span>
                <span>{inst.tokensStr}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Session Counter & User Profile matching screenshot */}
      <div className="p-3 border-t border-[#182030] bg-[#090d14] space-y-2">
        {!collapsed && (
          <div className="flex items-center justify-between text-xs text-[#64748b]">
            <span className="text-[11px] font-medium">Active Instances</span>
            <span className="font-mono text-[#cbd5e1] font-semibold text-[11px]">
              {activeSessionsCount} / {maxSessionsCount} active
            </span>
          </div>
        )}

        {/* User Account Pill */}
        <div
          className={`flex items-center ${
            collapsed ? 'justify-center p-2' : 'justify-between p-2'
          } rounded-lg bg-[#0e1420] border border-[#1a2333]`}
        >
          <div className="flex items-center gap-2 truncate">
            <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              U
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="text-[11px] font-semibold text-slate-200 truncate">
                  uncle123elmo@gmail.com
                </span>
                <span className="text-[10px] text-blue-400 font-medium">
                  Enterprise Ultra
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              className="text-[#64748b] hover:text-white text-xs cursor-pointer p-1"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
