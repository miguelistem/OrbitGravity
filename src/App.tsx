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
  Layers 
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

  const getInstanceIcon = (iconName: string) => {
    switch (iconName) {
      case 'cpu': return <Cpu className="w-3.5 h-3.5 text-[#7D818C]" />;
      case 'database': return <Database className="w-3.5 h-3.5 text-[#7D818C]" />;
      case 'zap': return <Zap className="w-3.5 h-3.5 text-[#7D818C]" />;
      case 'layers': return <Layers className="w-3.5 h-3.5 text-[#7D818C]" />;
      case 'server': return <Server className="w-3.5 h-3.5 text-[#7D818C]" />;
      case 'code': return <Code className="w-3.5 h-3.5 text-[#7D818C]" />;
      default: return <Terminal className="w-3.5 h-3.5 text-[#7D818C]" />;
    }
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0F1012] text-[#D8DADF] font-sans select-none">
      {/* 1. OS Titlebar */}
      <div
        data-tauri-drag-region
        className="h-8 bg-[#141518] border-b border-[#212328] flex items-center justify-between px-3 shrink-0 text-xs text-[#7D818C] select-none"
      >
        {/* Left Window Menu with OrbitGravity Logo Glyph */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <OrbitGravityLogo size={15} showSquircle={false} />
            <span className="font-semibold text-zinc-100 tracking-tight">OrbitGravity</span>
          </div>
          <span className="hover:text-zinc-200 cursor-pointer">File</span>
          <span className="hover:text-zinc-200 cursor-pointer">View</span>
          <span className="hover:text-zinc-200 cursor-pointer">Window</span>
          <span className="hover:text-zinc-200 cursor-pointer">Help</span>
        </div>

        {/* Center Session Title */}
        <div
          data-tauri-drag-region
          className="text-[11px] font-mono text-[#5E626E] truncate max-w-sm hidden sm:block pointer-events-none"
        >
          {activeInstance?.name ? `OrbitGravity — ${activeInstance.name}` : 'OrbitGravity IDE Fleet'}
        </div>

        {/* Right Windows Control Buttons */}
        <div className="flex items-center gap-3 text-xs pr-1">
          <button
            onClick={handleMinimizeWindow}
            className="hover:text-zinc-200 hover:bg-zinc-800/60 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
            title="Minimize"
          >
            —
          </button>
          <button
            onClick={handleMaximizeWindow}
            className="hover:text-zinc-200 hover:bg-zinc-800/60 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
            title="Maximize"
          >
            🗖
          </button>
          <button
            onClick={handleCloseWindow}
            className="hover:text-red-400 hover:bg-red-950/60 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. Main Body Container with Left Sidebar & Center Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - Desktop Shortcuts & Instances Hub */}
        <aside className="w-64 bg-[#111214] border-r border-[#212328] flex flex-col justify-between shrink-0 select-none">
          <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
            {/* Top Bar with OrbitGravity Squircle Logo */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <OrbitGravityLogo size={24} showSquircle={true} />
                <span className="font-semibold text-xs tracking-tight text-zinc-100">
                  OrbitGravity
                </span>
              </div>

              <div className="flex items-center gap-1 text-[#7D818C]">
                <span className="hover:text-zinc-200 cursor-pointer p-0.5 text-xs">&lt;</span>
                <span className="hover:text-zinc-200 cursor-pointer p-0.5 text-xs">&gt;</span>
              </div>
            </div>

            {/* + New Instance Shortcut Profile button */}
            <button
              onClick={() => {
                setEditingInstance(null);
                setIsInstanceModalOpen(true);
              }}
              className="w-full py-1.5 px-3 bg-[#17181D] hover:bg-[#1E2026] text-zinc-200 rounded border border-[#262830] text-xs font-medium transition cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-300" />
              <span>New Instance Shortcut</span>
            </button>

            {/* Global Navigation Links */}
            <div className="space-y-0.5 text-xs text-[#8B8F9A]">
              <button
                onClick={() => setActiveViewTab('workspace')}
                className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition cursor-pointer ${
                  activeViewTab === 'workspace' ? 'bg-[#18191E] text-zinc-100 font-medium' : 'hover:bg-[#16171B] hover:text-zinc-200'
                }`}
              >
                <History className="w-3.5 h-3.5 text-[#7D818C]" />
                <span>Session Workspace</span>
              </button>

              <button
                onClick={() => setActiveViewTab('shortcuts')}
                className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition cursor-pointer ${
                  activeViewTab === 'shortcuts' ? 'bg-[#18191E] text-zinc-100 font-medium' : 'hover:bg-[#16171B] hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-[#7D818C]" />
                  <span>Desktop Shortcuts Hub</span>
                </div>
                <span className="text-[10px] font-mono text-[#5E626E]">{instances.length}</span>
              </button>

              <button
                onClick={() => setActiveViewTab('accounts')}
                className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition cursor-pointer ${
                  activeViewTab === 'accounts' ? 'bg-[#18191E] text-zinc-100 font-medium' : 'hover:bg-[#16171B] hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#7D818C]" />
                  <span>Account Quotas</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">68%</span>
              </button>
            </div>

            {/* INSTANCES SECTION */}
            <div className="pt-2 border-t border-[#1F2126]">
              <div className="flex items-center justify-between text-[11px] text-[#6B7280] px-1 mb-1.5 font-mono">
                <span className="text-zinc-300 font-medium uppercase tracking-wider text-[10px]">
                  Instances ({filteredInstances.length})
                </span>
                <button
                  onClick={() => setSidebarFilter(sidebarFilter === 'all' ? 'running' : 'all')}
                  className={`text-[9px] px-1.5 py-0.2 rounded cursor-pointer ${
                    sidebarFilter === 'running' ? 'bg-[#1E2026] text-zinc-200' : 'text-[#6B7280] hover:text-zinc-300'
                  }`}
                  title="Filter running instances"
                >
                  {sidebarFilter === 'running' ? 'Running' : 'All'}
                </button>
              </div>

              {/* Clean Desktop Shortcut Items in Sidebar */}
              <div className="space-y-1 text-xs font-sans">
                {filteredInstances.map((inst) => {
                  const isSelected = inst.id === activeInstanceId && activeViewTab === 'workspace';
                  const isRunning = inst.status === 'running';

                  return (
                    <div
                      key={inst.id}
                      onClick={() => {
                        setActiveInstanceId(inst.id);
                        setActiveViewTab('workspace');
                      }}
                      className={`p-2 rounded border transition cursor-pointer flex flex-col gap-0.5 ${
                        isSelected
                          ? 'bg-[#1A1B20] border-[#2C2E38] text-zinc-100'
                          : 'bg-[#141518] border-[#1F2026] hover:bg-[#18191E] hover:border-[#272932] text-[#8B8F9A]'
                      }`}
                    >
                      {/* Top row: Icon, Name, Status dot */}
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded bg-[#1A1B20] border border-[#24262E] flex items-center justify-center shrink-0">
                            {getInstanceIcon(inst.icon)}
                          </div>
                          <span className="font-medium text-xs truncate text-zinc-200">
                            {inst.name}
                          </span>
                        </div>

                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isRunning ? 'bg-emerald-500' : 'bg-zinc-600'
                          }`}
                        />
                      </div>

                      {/* Bottom row: Port & Tokens consumed */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#6B7280] pl-7">
                        <span className="truncate max-w-[100px]">
                          Port :{inst.port}
                        </span>
                        <span>
                          {formatCompactNumber(inst.tokensConsumedSession)} tokens
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Sidebar: Fleet Active Sessions & User Profile */}
          <div className="p-3 border-t border-[#1F2126] bg-[#111214] space-y-2.5">
            <div>
              <div className="flex justify-between text-[10px] font-mono text-[#7D818C] mb-1">
                <span>Active Instances</span>
                <span className="text-zinc-200">{runningCount} / {activeAccount.maxConcurrentSessions} active</span>
              </div>
              <div className="w-full h-1 bg-[#202228] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1A56DB] rounded-full"
                  style={{ width: `${(runningCount / activeAccount.maxConcurrentSessions) * 100}%` }}
                />
              </div>
            </div>

            {/* User Account Strip */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-[#1E2026] border border-[#2B2D36] flex items-center justify-center text-[10px] text-zinc-300 font-medium shrink-0">
                  U
                </div>
                <div className="min-w-0">
                  <div className="text-zinc-200 text-[11px] font-medium truncate">
                    {activeAccount.email}
                  </div>
                  <div className="text-[10px] text-[#7D818C] font-mono">
                    {activeAccount.tier}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditingAccount(activeAccount);
                  setIsAccountModalOpen(true);
                }}
                className="p-1 text-[#7D818C] hover:text-zinc-200 rounded cursor-pointer"
                title="Account Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
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
