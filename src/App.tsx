/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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

  const activeInstance = instances.find((i) => i.id === activeInstanceId) || instances[0];
  const activeAccount = accounts.find((a) => a.id === activeInstance?.accountId) || accounts[0];

  const handleToggleStatus = (id: string, newStatus: InstanceStatus) => {
    setInstances((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, status: newStatus } : inst))
    );
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

  const handleSaveInstance = (data: Partial<AntigravityInstance>) => {
    if (editingInstance) {
      setInstances((prev) =>
        prev.map((inst) => (inst.id === editingInstance.id ? { ...inst, ...data } : inst))
      );
    } else {
      const newId = `inst-${Date.now().toString(36)}`;
      const newInst: AntigravityInstance = {
        id: newId,
        name: data.name || 'New Service Instance',
        description: data.description || '',
        tag: data.tag || 'Core Infrastructure',
        color: 'neutral',
        icon: data.icon || 'terminal',
        status: 'running',
        accountId: data.accountId || accounts[0]?.id || 'acc-enterprise',
        workspacePath: data.workspacePath || '/workspace/services/new-service',
        gitBranch: data.gitBranch || 'main',
        workingDirectory: data.workspacePath || '/workspace',
        model: data.model || 'Gemini 3.8 Flash High',
        port: data.port || 3010,
        debugPort: data.debugPort || 9240,
        displayMode: data.displayMode || 'desktop-gui',
        agentAutonomy: data.agentAutonomy || 'full-autopilot',
        ramAllocationMb: data.ramAllocationMb || 8192,
        cpuCores: data.cpuCores || 4,
        envVars: data.envVars || {},
        customFlags: data.customFlags || '--enable-anti-entropy',
        ttlMinutes: data.ttlMinutes ?? 120,
        autoSleepIdleMinutes: data.autoSleepIdleMinutes ?? 15,
        startedAt: Date.now(),
        totalElapsedSeconds: 0,
        lastActivityAt: Date.now(),
        billableSeconds: 0,
        tokensConsumedSession: 0,
        requestsMadeSession: 0,
        cpuUsagePercent: 12.0,
        ramUsageMb: 1200,
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

  const handleMinimizeWindow = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch {}
  };

  const handleMaximizeWindow = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch {}
  };

  const handleCloseWindow = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {}
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0E0F12] text-[#D8DADF] font-sans select-none antialiased">
      {/* 1. OS Titlebar (Seamlessly integrated with window) */}
      <div
        data-tauri-drag-region
        className="h-9 bg-[#111215] border-b border-[#1E2026] flex items-center justify-between px-3 shrink-0 text-xs text-[#8E92A0] select-none"
      >
        {/* Left Window Menu with OrbitGravity Logo Glyph & Menu Items */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <OrbitGravityLogo size={16} showSquircle={false} />
            <span className="font-semibold text-sm text-zinc-100 tracking-tight">OrbitGravity</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="hover:text-zinc-200 cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition">File</span>
            <span className="hover:text-zinc-200 cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition">View</span>
            <span className="hover:text-zinc-200 cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition">Window</span>
            <span className="hover:text-zinc-200 cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition">Help</span>
          </div>
        </div>

        {/* Center Session Title */}
        <div
          data-tauri-drag-region
          className="text-xs font-mono text-zinc-500 truncate max-w-sm hidden sm:block pointer-events-none"
        >
          {activeInstance?.name ? activeInstance.name : 'OrbitGravity Fleet'}
        </div>

        {/* Right Windows Control Buttons */}
        <div className="flex items-center gap-0.5 text-xs pr-0.5">
          <button
            onClick={handleMinimizeWindow}
            className="hover:text-zinc-200 hover:bg-zinc-800/80 w-8 h-7 flex items-center justify-center rounded cursor-pointer transition-colors"
            title="Minimize"
          >
            —
          </button>
          <button
            onClick={handleMaximizeWindow}
            className="hover:text-zinc-200 hover:bg-zinc-800/80 w-8 h-7 flex items-center justify-center rounded cursor-pointer transition-colors"
            title="Maximize"
          >
            🗖
          </button>
          <button
            onClick={handleCloseWindow}
            className="hover:text-red-300 hover:bg-red-900/80 w-8 h-7 flex items-center justify-center rounded cursor-pointer transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. Main Body Container with Left Sidebar & Center Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - Desktop Shortcuts & Instances Hub */}
        <aside className={`${sidebarCollapsed ? 'w-16' : 'w-72 lg:w-[295px]'} bg-[#101114] border-r border-[#1E2026] flex flex-col justify-between shrink-0 select-none transition-all duration-200`}>
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* Top Bar with OrbitGravity Squircle Logo & Controls (NO duplicate app name) */}
            <div className="flex items-center justify-between pb-0.5 px-0.5">
              <div className="flex items-center gap-2.5">
                <OrbitGravityLogo size={22} showSquircle={true} />
                {!sidebarCollapsed && (
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-[#1C1E26] rounded cursor-pointer transition"
                    title="Toggle Sidebar"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!sidebarCollapsed && (
                <div className="flex items-center gap-1 text-zinc-400">
                  <button className="p-1 hover:text-zinc-200 hover:bg-[#1C1E26] rounded text-xs cursor-pointer transition">&lt;</button>
                  <button className="p-1 hover:text-zinc-200 hover:bg-[#1C1E26] rounded text-xs cursor-pointer transition">&gt;</button>
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
                className="w-full py-2.5 px-3.5 bg-[#171920] hover:bg-[#1F222B] text-zinc-200 rounded-lg border border-[#272A34] text-sm font-medium transition cursor-pointer flex items-center gap-2.5 shadow-sm"
              >
                <Plus className="w-4 h-4 text-zinc-300" />
                <span>New Instance Shortcut</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingInstance(null);
                  setIsInstanceModalOpen(true);
                }}
                className="w-full py-2 flex items-center justify-center bg-[#171920] hover:bg-[#1F222B] text-zinc-200 rounded-lg border border-[#272A34] transition cursor-pointer"
                title="New Instance Shortcut"
              >
                <Plus className="w-4 h-4 text-zinc-300" />
              </button>
            )}

            {/* Global Navigation Links */}
            <div className="space-y-1 text-sm text-[#9498A5]">
              <button
                onClick={() => setActiveViewTab('workspace')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition cursor-pointer ${
                  activeViewTab === 'workspace'
                    ? 'bg-[#1E212A] text-zinc-100 font-medium'
                    : 'hover:bg-[#161820] hover:text-zinc-200'
                }`}
                title="Session Workspace"
              >
                <History className="w-4 h-4 text-[#8E92A0] shrink-0" />
                {!sidebarCollapsed && <span>Session Workspace</span>}
              </button>

              <button
                onClick={() => setActiveViewTab('shortcuts')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                  activeViewTab === 'shortcuts'
                    ? 'bg-[#1E212A] text-zinc-100 font-medium'
                    : 'hover:bg-[#161820] hover:text-zinc-200'
                }`}
                title="Desktop Shortcuts Hub"
              >
                <div className="flex items-center gap-2.5">
                  <Monitor className="w-4 h-4 text-[#8E92A0] shrink-0" />
                  {!sidebarCollapsed && <span>Desktop Shortcuts Hub</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-xs font-mono text-[#6E7382] px-1.5 py-0.2 rounded bg-[#161820]">{instances.length}</span>
                )}
              </button>

              <button
                onClick={() => setActiveViewTab('accounts')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                  activeViewTab === 'accounts'
                    ? 'bg-[#1E212A] text-zinc-100 font-medium'
                    : 'hover:bg-[#161820] hover:text-zinc-200'
                }`}
                title="Account Quotas"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#8E92A0] shrink-0" />
                  {!sidebarCollapsed && <span>Account Quotas</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-xs text-zinc-400 font-mono">68%</span>
                )}
              </button>
            </div>

            {/* PROJECTS / INSTANCES SECTION - Clean Antigravity Style */}
            {!sidebarCollapsed && (
              <div className="pt-2 border-t border-[#1C1E26]">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-2 py-1.5">
                  <span className="font-semibold text-xs tracking-wider uppercase text-zinc-400">
                    Projects
                  </span>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <button
                      onClick={() => setSidebarFilter(sidebarFilter === 'all' ? 'running' : 'all')}
                      className={`p-1 rounded hover:text-zinc-200 transition ${
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
                      className="p-1 rounded hover:text-zinc-200 transition"
                      title="New Instance Shortcut"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Clean Hierarchical Vertical Nav (NO BOXES, NO HARD BORDERS) */}
                <div className="space-y-2 mt-1">
                  {Object.entries(groupedInstances).map(([groupName, items]) => {
                    const isCollapsed = !!collapsedFolders[groupName];
                    return (
                      <div key={groupName} className="space-y-0.5">
                        {/* Folder Category Row */}
                        <div
                          onClick={() => toggleFolder(groupName)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-[#161820] cursor-pointer select-none transition-colors"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          )}
                          <Folder className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="truncate text-xs font-medium text-zinc-300">{groupName}</span>
                          <span className="text-[11px] text-zinc-600 font-mono ml-auto">{items.length}</span>
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
                                  className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all cursor-pointer select-none ${
                                    isSelected
                                      ? 'bg-[#22252E] text-zinc-100 font-medium shadow-sm'
                                      : 'text-zinc-400 hover:bg-[#161820] hover:text-zinc-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {isRunning ? (
                                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                                    ) : (
                                      <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
                                    )}
                                    <span className="truncate text-sm text-zinc-200 group-hover:text-zinc-100">
                                      {inst.name}
                                    </span>
                                  </div>

                                  <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-400 shrink-0 ml-2">
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
