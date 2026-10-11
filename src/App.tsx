/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './api';
import { AntigravityInstance, AntigravityAccount, LogEntry, InstanceStatus } from './types/antigravity';
import { INITIAL_ACCOUNTS, INITIAL_INSTANCES, INITIAL_LOGS } from './mock/initialData';
import { formatCompactNumber } from './utils/formatters';
import { OrbitGravityLogo } from './components/OrbitGravityLogo';
import { AntigravityWorkspace } from './components/AntigravityWorkspace';
import { DesktopShortcutsHub } from './components/DesktopShortcutsHub';
import { AccountQuotaMonitor } from './components/AccountQuotaMonitor';
import { InstanceModal } from './components/InstanceModal';
import { AccountManagerModal } from './components/AccountManagerModal';
import { 
  Plus, 
  Settings, 
  History, 
  Monitor, 
  ShieldCheck, 
  Terminal, 
  Cpu, 
  Code, 
  Database, 
  Server, 
  Zap, 
  Layers,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  ListFilter,
  PanelLeft
} from 'lucide-react';

export default function App() {
  const STORAGE_INSTANCES = 'orbitgravity_instances_v1';
  const STORAGE_ACCOUNTS = 'orbitgravity_accounts_v1';
  const STORAGE_LOGS = 'orbitgravity_logs_v1';

  // Instances State
  const [instances, setInstances] = useState<AntigravityInstance[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_INSTANCES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_INSTANCES;
  });

  // Accounts State
  const [accounts, setAccounts] = useState<AntigravityAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACCOUNTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_ACCOUNTS;
  });

  // Logs State
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOGS);
      if (saved) return JSON.parse(saved);
    } catch {}
    const flattened: LogEntry[] = [];
    Object.values(INITIAL_LOGS).forEach((list) => flattened.push(...list));
    return flattened;
  });

  // Active selected instance in OrbitGravity
  const [activeInstanceId, setActiveInstanceId] = useState<string>(
    instances[0]?.id || 'inst-portfolio-spec'
  );

  // Active main view tab: 'workspace' | 'shortcuts' | 'accounts'
  const [activeViewTab, setActiveViewTab] = useState<'workspace' | 'shortcuts' | 'accounts'>('workspace');

  // Sidebar filter
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'running'>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  // Modals
  const [isInstanceModalOpen, setIsInstanceModalOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<AntigravityInstance | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AntigravityAccount | null>(null);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_INSTANCES, JSON.stringify(instances));
    } catch {}
  }, [instances]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(accounts));
    } catch {}
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LOGS, JSON.stringify(logs.slice(-200)));
    } catch {}
  }, [logs]);

  // Master Active Timer ticker (1s interval)
  useEffect(() => {
    const interval = setInterval(() => {
      setInstances((prevInstances) => {
        return prevInstances.map((inst) => {
          if (inst.status !== 'running') return inst;

          const newElapsed = inst.totalElapsedSeconds + 1;
          const newTokens = inst.tokensConsumedSession + Math.floor(Math.random() * 15 + 4);

          let newStatus: InstanceStatus = inst.status;
          if (inst.ttlMinutes > 0 && newElapsed >= inst.ttlMinutes * 60) {
            newStatus = 'paused';
          }

          const cpuJitter = Math.max(2, Math.min(65, +(inst.cpuUsagePercent + (Math.random() * 2 - 1)).toFixed(1)));
          const ramJitter = Math.max(500, Math.min(inst.ramAllocationMb, +(inst.ramUsageMb + (Math.random() * 4 - 2)).toFixed(0)));

          return {
            ...inst,
            totalElapsedSeconds: newElapsed,
            tokensConsumedSession: newTokens,
            status: newStatus,
            cpuUsagePercent: cpuJitter,
            ramUsageMb: ramJitter,
          };
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initial synchronization with native Tauri backend
  useEffect(() => {
    if (isTauri()) {
      invoke<any[]>('list_instances')
        .then((rustInstances) => {
          if (rustInstances && rustInstances.length > 0) {
            setInstances((prev) => {
              return rustInstances.map((ri) => {
                const existing = prev.find((p) => p.id === ri.id || p.name === ri.name);
                const isRunning = ri.status === 'running';
                if (existing) {
                  return {
                    ...existing,
                    id: ri.id,
                    name: ri.name,
                    status: isRunning ? 'running' : 'stopped',
                    port: ri.port || existing.port,
                    workspacePath: ri.workspace_path || existing.workspacePath,
                  };
                }
                return {
                  id: ri.id,
                  name: ri.name,
                  description: 'Managed Antigravity profile instance',
                  tag: 'Core Infrastructure',
                  color: 'neutral',
                  icon: 'terminal',
                  status: isRunning ? 'running' : 'stopped',
                  accountId: ri.account_id || accounts[0]?.id || 'acc-enterprise',
                  workspacePath: ri.workspace_path || 'e:\\Projects',
                  gitBranch: 'main',
                  workingDirectory: ri.workspace_path || 'e:\\Projects',
                  model: 'Gemini 3.8 Flash High',
                  port: ri.port || 3010,
                  debugPort: (ri.port || 3010) + 6000,
                  displayMode: 'desktop-gui',
                  agentAutonomy: 'semi-autonomous',
                  ramAllocationMb: 8192,
                  cpuCores: 4,
                  envVars: {},
                  customFlags: '--enable-anti-entropy',
                  ttlMinutes: 120,
                  autoSleepIdleMinutes: 15,
                  startedAt: isRunning ? Date.now() : null,
                  totalElapsedSeconds: 0,
                  lastActivityAt: Date.now(),
                  billableSeconds: 0,
                  tokensConsumedSession: 0,
                  requestsMadeSession: 0,
                  cpuUsagePercent: isRunning ? 12.0 : 0,
                  ramUsageMb: isRunning ? 1200 : 0,
                  createdAt: new Date().toISOString(),
                };
              });
            });
          }
        })
        .catch((err) => console.warn('Could not list instances from Tauri:', err));
    }
  }, []);

  const activeInstance = instances.find((i) => i.id === activeInstanceId) || instances[0];
  const activeAccount = accounts.find((a) => a.id === activeInstance?.accountId) || accounts[0];

  const handleToggleStatus = async (id: string, newStatus: InstanceStatus) => {
    setInstances((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, status: newStatus } : inst))
    );

    if (isTauri()) {
      try {
        if (newStatus === 'running') {
          handleAddLog({
            instanceId: id,
            level: 'exec',
            source: 'agent',
            message: 'Launching isolated Antigravity process with SSH_CONNECTION socket bypass...',
          });
          const res = await invoke<any>('launch_instance', { id });
          handleAddLog({
            instanceId: id,
            level: 'info',
            source: 'system',
            message: `Antigravity started (PID: ${res?.pid ?? 'active'}). Profile isolated successfully.`,
          });
        } else {
          handleAddLog({
            instanceId: id,
            level: 'info',
            source: 'system',
            message: 'Stopping Antigravity instance...',
          });
          await invoke('stop_instance', { id });
          handleAddLog({
            instanceId: id,
            level: 'info',
            source: 'system',
            message: 'Antigravity process terminated.',
          });
        }
      } catch (err: any) {
        console.error('Failed to toggle native instance:', err);
        handleAddLog({
          instanceId: id,
          level: 'error',
          source: 'system',
          message: `Process error: ${err?.message || String(err)}`,
        });
      }
    }
  };

  const handleLaunchIde = (instance: AntigravityInstance) => {
    handleToggleStatus(instance.id, 'running');
  };

  const handleExtendTtl = (id: string, extraMinutes: number) => {
    setInstances((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, ttlMinutes: (inst.ttlMinutes || 60) + extraMinutes } : inst))
    );
  };

  const handleChangeModel = (id: string, model: string) => {
    setInstances((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, model } : inst))
    );
  };

  const handleAddLog = (newLog: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    const entry: LogEntry = {
      ...newLog,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
    };
    setLogs((prev) => [...prev, entry]);
  };

  const handleSaveInstance = async (data: Partial<AntigravityInstance>) => {
    if (editingInstance) {
      setInstances((prev) =>
        prev.map((inst) => (inst.id === editingInstance.id ? { ...inst, ...data } : inst))
      );
    } else {
      let newId = `inst-${Date.now().toString(36)}`;

      if (isTauri()) {
        try {
          const rustInst = await invoke<any>('create_instance', {
            name: data.name || 'New Service Instance',
            accountId: data.accountId || accounts[0]?.id,
            mode: 'auth-only',
            port: data.port || 3010,
            workspacePath: data.workspacePath,
          });
          if (rustInst?.id) {
            newId = rustInst.id;
          }
          handleAddLog({
            instanceId: newId,
            level: 'info',
            source: 'system',
            message: `Created profile directory with NTFS Junctions: ${rustInst?.profileDir || rustInst?.profile_dir || 'OK'}`,
          });
        } catch (err: any) {
          console.error('Failed to create native instance profile:', err);
        }
      }

      const newInst: AntigravityInstance = {
        id: newId,
        name: data.name || 'New Service Instance',
        description: data.description || '',
        tag: data.tag || 'Core Infrastructure',
        color: 'neutral',
        icon: data.icon || 'terminal',
        status: 'stopped',
        accountId: data.accountId || accounts[0]?.id || 'acc-enterprise',
        workspacePath: data.workspacePath || 'e:\\Projects',
        gitBranch: data.gitBranch || 'main',
        workingDirectory: data.workspacePath || 'e:\\Projects',
        model: data.model || 'Gemini 3.8 Flash High',
        port: data.port || 3010,
        debugPort: data.debugPort || 9240,
        displayMode: data.displayMode || 'desktop-gui',
        agentAutonomy: data.agentAutonomy || 'semi-autonomous',
        ramAllocationMb: data.ramAllocationMb || 8192,
        cpuCores: data.cpuCores || 4,
        envVars: data.envVars || {},
        customFlags: data.customFlags || '--enable-anti-entropy',
        ttlMinutes: data.ttlMinutes ?? 120,
        autoSleepIdleMinutes: data.autoSleepIdleMinutes ?? 15,
        startedAt: null,
        totalElapsedSeconds: 0,
        lastActivityAt: Date.now(),
        billableSeconds: 0,
        tokensConsumedSession: 0,
        requestsMadeSession: 0,
        cpuUsagePercent: 0,
        ramUsageMb: 0,
        shortcutHotkey: data.shortcutHotkey || 'Ctrl+Alt+6',
        createdAt: new Date().toISOString(),
      };
      setInstances((prev) => [newInst, ...prev]);
      setActiveInstanceId(newId);
      setActiveViewTab('workspace');
    }
  };

  const handleSaveAccount = (account: AntigravityAccount) => {
    setAccounts((prev) => {
      const exists = prev.some((a) => a.id === account.id);
      if (exists) {
        return prev.map((a) => (a.id === account.id ? account : a));
      }
      return [...prev, account];
    });
  };

  const runningCount = instances.filter((i) => i.status === 'running').length;

  const filteredInstances = instances.filter((inst) => {
    if (sidebarFilter === 'running') return inst.status === 'running';
    return true;
  });

  const groupedInstances = filteredInstances.reduce<Record<string, AntigravityInstance[]>>((acc, inst) => {
    const tag = inst.tag || 'General Workspaces';
    if (!acc[tag]) acc[tag] = [];
    acc[tag].push(inst);
    return acc;
  }, {});

  const formatInstanceDurationBadge = (inst: AntigravityInstance) => {
    if (inst.status === 'running') {
      const elapsed = inst.totalElapsedSeconds;
      if (elapsed < 60) return `${elapsed}s`;
      if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m`;
      const hrs = Math.floor(elapsed / 3600);
      const remainingMins = Math.floor((elapsed % 3600) / 60);
      return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
    }
    return `:${inst.port}`;
  };

  const handleMinimizeWindow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('window_minimize');
    } catch {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().minimize();
      } catch {}
    }
  };

  const handleMaximizeWindow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('window_toggle_maximize');
    } catch {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().toggleMaximize();
      } catch {}
    }
  };

  const handleCloseWindow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('window_close');
    } catch {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
      } catch {}
    }
  };

  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('button, a, input, select')) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('window_start_drag');
      } catch {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().startDragging();
        } catch {}
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#111215] text-[#EDEDED] font-sans select-none antialiased">
      {/* 1. OS Titlebar (Seamlessly integrated with window) */}
      <div
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        className="h-10 bg-[#16171B] border-b border-[#23242A] flex items-center justify-between pl-3.5 pr-0 shrink-0 text-xs text-[#9DA1B0] select-none cursor-default"
      >
        {/* Left Window Menu with OrbitGravity Logo Glyph & Menu Items */}
        <div className="flex items-center gap-3.5 pointer-events-auto">
          <div className="flex items-center gap-2">
            <OrbitGravityLogo size={17} showSquircle={false} />
            <span className="font-semibold text-[13.5px] text-[#EDEDED] tracking-tight">OrbitGravity</span>
          </div>
          <div className="flex items-center gap-3 text-[13px] text-[#A6ABB8]">
            <span className="hover:text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition">File</span>
            <span className="hover:text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition">View</span>
            <span className="hover:text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition">Window</span>
            <span className="hover:text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition">Help</span>
          </div>
        </div>

        {/* Center Session Title */}
        <div
          data-tauri-drag-region
          onMouseDown={handleStartDrag}
          className="text-[12px] font-mono text-[#7D8290] truncate max-w-sm hidden md:block pointer-events-none"
        >
          {activeInstance?.name ? activeInstance.name : 'OrbitGravity Fleet'}
        </div>

        {/* Right Windows Control Buttons - Standard Windows 11 size */}
        <div className="flex items-center h-full text-xs">
          <button
            onClick={handleMinimizeWindow}
            className="hover:text-white hover:bg-[#252730] w-11 h-10 flex items-center justify-center text-[#B0B4C0] cursor-pointer transition-colors"
            title="Minimize"
          >
            —
          </button>
          <button
            onClick={handleMaximizeWindow}
            className="hover:text-white hover:bg-[#252730] w-11 h-10 flex items-center justify-center text-[#B0B4C0] cursor-pointer transition-colors"
            title="Maximize"
          >
            🗖
          </button>
          <button
            onClick={handleCloseWindow}
            className="hover:text-white hover:bg-[#E81123] w-11 h-10 flex items-center justify-center text-[#B0B4C0] cursor-pointer transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. Main Body Container with Left Sidebar & Center Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - Desktop Shortcuts & Instances Hub */}
        <aside className={`${sidebarCollapsed ? 'w-16' : 'w-[320px] min-w-[320px]'} bg-[#141518] border-r border-[#22242B] flex flex-col justify-between shrink-0 select-none transition-all duration-200`}>
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* Top Bar with OrbitGravity Squircle Logo & Controls (NO duplicate app name) */}
            <div className="flex items-center justify-between pb-0.5 px-0.5">
              <div className="flex items-center gap-2.5">
                <OrbitGravityLogo size={22} showSquircle={true} />
                {!sidebarCollapsed && (
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#202229] rounded-md cursor-pointer transition"
                    title="Toggle Sidebar"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!sidebarCollapsed && (
                <div className="flex items-center gap-1 text-zinc-400">
                  <button className="p-1.5 hover:text-white hover:bg-[#202229] rounded-md text-xs cursor-pointer transition">&lt;</button>
                  <button className="p-1.5 hover:text-white hover:bg-[#202229] rounded-md text-xs cursor-pointer transition">&gt;</button>
                </div>
              )}
            </div>

            {/* + New Instance Shortcut Profile button */}
            {!sidebarCollapsed ? (
              <button
                onClick={() => {
                  setEditingInstance(null);
                  setIsInstanceModalOpen(true);
                }}
                className="w-full h-10 px-3.5 bg-[#1F2128] hover:bg-[#282B34] text-[#EDEDED] rounded-lg border border-[#2D303B] text-[13.5px] font-medium transition cursor-pointer flex items-center gap-2.5 shadow-sm"
              >
                <Plus className="w-4 h-4 text-[#C4C7D2]" />
                <span>New Instance Shortcut</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingInstance(null);
                  setIsInstanceModalOpen(true);
                }}
                className="w-full h-10 flex items-center justify-center bg-[#1F2128] hover:bg-[#282B34] text-[#EDEDED] rounded-lg border border-[#2D303B] transition cursor-pointer"
                title="New Instance Shortcut"
              >
                <Plus className="w-4 h-4 text-[#C4C7D2]" />
              </button>
            )}

            {/* Global Navigation Links */}
            <div className="space-y-1 text-[13.5px] text-[#C4C7D0]">
              <button
                onClick={() => setActiveViewTab('workspace')}
                className={`w-full text-left h-9 px-3 rounded-lg flex items-center gap-2.5 transition cursor-pointer ${
                  activeViewTab === 'workspace'
                    ? 'bg-[#262832] text-white font-medium'
                    : 'hover:bg-[#1E2028] hover:text-white'
                }`}
                title="Session Workspace"
              >
                <History className="w-[18px] h-[18px] text-[#9A9EA8] shrink-0" />
                {!sidebarCollapsed && <span>Session Workspace</span>}
              </button>

              <button
                onClick={() => setActiveViewTab('shortcuts')}
                className={`w-full text-left h-9 px-3 rounded-lg flex items-center justify-between transition cursor-pointer ${
                  activeViewTab === 'shortcuts'
                    ? 'bg-[#262832] text-white font-medium'
                    : 'hover:bg-[#1E2028] hover:text-white'
                }`}
                title="Desktop Shortcuts Hub"
              >
                <div className="flex items-center gap-2.5">
                  <Monitor className="w-[18px] h-[18px] text-[#9A9EA8] shrink-0" />
                  {!sidebarCollapsed && <span>Desktop Shortcuts Hub</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-xs font-mono text-[#8B8F9A] px-1.5 py-0.2 rounded bg-[#1C1E25]">{instances.length}</span>
                )}
              </button>

              <button
                onClick={() => setActiveViewTab('accounts')}
                className={`w-full text-left h-9 px-3 rounded-lg flex items-center justify-between transition cursor-pointer ${
                  activeViewTab === 'accounts'
                    ? 'bg-[#262832] text-white font-medium'
                    : 'hover:bg-[#1E2028] hover:text-white'
                }`}
                title="Account Quotas"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-[18px] h-[18px] text-[#9A9EA8] shrink-0" />
                  {!sidebarCollapsed && <span>Account Quotas</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-xs text-zinc-300 font-mono">68%</span>
                )}
              </button>
            </div>

            {/* PROJECTS / INSTANCES SECTION - Clean Antigravity Style */}
            {!sidebarCollapsed && (
              <div className="pt-2 border-t border-[#202229]">
                <div className="flex items-center justify-between text-[12px] text-[#8B8F9A] px-2 py-1.5">
                  <span className="font-semibold tracking-wider uppercase text-[#8B8F9A]">
                    Projects
                  </span>
                  <div className="flex items-center gap-1.5 text-[#8B8F9A]">
                    <button
                      onClick={() => setSidebarFilter(sidebarFilter === 'all' ? 'running' : 'all')}
                      className={`p-1 rounded hover:text-white transition ${
                        sidebarFilter === 'running' ? 'text-blue-400 bg-blue-500/10' : ''
                      }`}
                      title={sidebarFilter === 'running' ? 'Showing running only' : 'Filter running instances'}
                    >
                      <ListFilter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingInstance(null);
                        setIsInstanceModalOpen(true);
                      }}
                      className="p-1 rounded hover:text-white transition"
                      title="New Instance Shortcut"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Clean Hierarchical Vertical Nav (NO BOXES, NO HARD BORDERS) */}
                <div className="space-y-1 mt-1">
                  {Object.entries(groupedInstances).map(([groupName, items]) => {
                    const isCollapsed = !!collapsedFolders[groupName];
                    return (
                      <div key={groupName} className="space-y-0.5">
                        {/* Folder Category Row */}
                        <div
                          onClick={() => toggleFolder(groupName)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] font-medium text-[#9A9EA8] hover:text-[#EDEDED] hover:bg-[#181A22] cursor-pointer select-none transition-colors"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-[#707482] shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#707482] shrink-0" />
                          )}
                          <Folder className="w-4 h-4 text-[#8B8F9A] shrink-0" />
                          <span className="truncate text-[13px] font-medium text-[#A6ABB8]">{groupName}</span>
                          <span className="text-[11px] text-[#636775] font-mono ml-auto">{items.length}</span>
                        </div>

                        {/* Child Instance items */}
                        {!isCollapsed && (
                          <div className="pl-4 pr-1 space-y-0.5">
                            {items.map((inst) => {
                              const isSelected = inst.id === activeInstanceId && activeViewTab === 'workspace';
                              const isRunning = inst.status === 'running';

                              return (
                                <div
                                  key={inst.id}
                                  onClick={() => {
                                    setActiveInstanceId(inst.id);
                                    setActiveViewTab('workspace');
                                  }}
                                  className={`group flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] transition-all cursor-pointer select-none ${
                                    isSelected
                                      ? 'bg-[#282A34] text-white font-medium shadow-sm'
                                      : 'text-[#C4C7D0] hover:bg-[#1B1D25] hover:text-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {isRunning ? (
                                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                    ) : (
                                      <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
                                    )}
                                    <span className="truncate text-[13.5px] text-[#EDEDED] group-hover:text-white">
                                      {inst.name}
                                    </span>
                                  </div>

                                  <span className="text-[12px] font-mono text-[#787D8A] group-hover:text-[#A6ABB8] shrink-0 ml-2">
                                    {formatInstanceDurationBadge(inst)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Sidebar: Fleet Active Sessions & User Profile */}
          <div className="p-3.5 border-t border-[#1C1E26] bg-[#0E0F12] space-y-3">
            {!sidebarCollapsed && (
              <div>
                <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1.5">
                  <span>Active Instances</span>
                  <span className="text-zinc-200 font-medium">{runningCount} / {activeAccount.maxConcurrentSessions} active</span>
                </div>
                <div className="w-full h-1.5 bg-[#1C1E26] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${(runningCount / activeAccount.maxConcurrentSessions) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* User Account Strip */}
            <div className="flex items-center justify-between pt-1 text-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#1C1E26] border border-[#2B2D38] flex items-center justify-center text-xs text-zinc-300 font-semibold shrink-0">
                  U
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <div className="text-zinc-200 text-xs font-medium truncate">
                      {activeAccount.email}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      {activeAccount.tier}
                    </div>
                  </div>
                )}
              </div>

              {!sidebarCollapsed && (
                <button
                  onClick={() => {
                    setEditingAccount(activeAccount);
                    setIsAccountModalOpen(true);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#1C1E26] rounded-md transition cursor-pointer"
                  title="Account Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* CENTER / MAIN WORKSPACE AREA */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeViewTab === 'workspace' && activeInstance && (
            <AntigravityWorkspace
              instance={activeInstance}
              account={activeAccount}
              logs={logs}
              onToggleStatus={handleToggleStatus}
              onExtendTtl={handleExtendTtl}
              onOpenSettings={(inst) => {
                setEditingInstance(inst);
                setIsInstanceModalOpen(true);
              }}
              onAddLog={handleAddLog}
              onChangeModel={handleChangeModel}
              onLaunchIde={handleLaunchIde}
            />
          )}

          {activeViewTab === 'shortcuts' && (
            <DesktopShortcutsHub
              instances={instances}
              accounts={accounts}
              onSelectInstance={(inst) => {
                setActiveInstanceId(inst.id);
                setActiveViewTab('workspace');
              }}
              onOpenSettings={(inst) => {
                setEditingInstance(inst);
                setIsInstanceModalOpen(true);
              }}
              onCreateNewInstance={() => {
                setEditingInstance(null);
                setIsInstanceModalOpen(true);
              }}
            />
          )}

          {activeViewTab === 'accounts' && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0F1012]">
              <AccountQuotaMonitor
                accounts={accounts}
                instances={instances}
                onUpdateAccount={handleSaveAccount}
                onOpenAddAccountModal={() => {
                  setEditingAccount(null);
                  setIsAccountModalOpen(true);
                }}
                onOpenEditAccountModal={(acc) => {
                  setEditingAccount(acc);
                  setIsAccountModalOpen(true);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Instance Settings Modal */}
      <InstanceModal
        isOpen={isInstanceModalOpen}
        onClose={() => {
          setIsInstanceModalOpen(false);
          setEditingInstance(null);
        }}
        onSave={handleSaveInstance}
        accounts={accounts}
        initialInstance={editingInstance}
      />

      {/* Account Settings Modal */}
      <AccountManagerModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
        initialAccount={editingAccount}
      />
    </div>
  );
}
