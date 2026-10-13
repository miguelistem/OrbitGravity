/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauri } from './api';
import { AntigravityInstance, AntigravityAccount, LogEntry, InstanceStatus, AntigravityAppType, InstanceTier } from './types/antigravity';
import { INITIAL_ACCOUNTS, INITIAL_INSTANCES, INITIAL_LOGS } from './mock/initialData';
import { OrbitGravityLogo } from './components/OrbitGravityLogo';
import { AntigravityWorkspace } from './components/AntigravityWorkspace';
import { AccountQuotaMonitor } from './components/AccountQuotaMonitor';
import { CosmicSystemsManager } from './components/CosmicSystemsManager';
import { NebulaArchive } from './components/NebulaArchive';
import { InstanceUsageMonitorView } from './components/InstanceUsageMonitorView';
import { EventHorizonIcon } from './components/EventHorizonIcon';
import { InstanceModal } from './components/InstanceModal';
import { AccountManagerModal } from './components/AccountManagerModal';
import { CosmicTutorialModal } from './components/CosmicTutorialModal';
import { 
  Plus, 
  History, 
  Terminal, 
  Code, 
  Database, 
  Zap, 
  Folder, 
  FolderPlus, 
  ChevronRight, 
  ChevronDown, 
  ListFilter, 
  PanelLeft,
  AlertTriangle,
  BookOpen,
  Sparkles
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
    instances[0]?.id || ''
  );

  // Auto-sync activeInstanceId if instance list changes
  useEffect(() => {
    if (instances.length > 0 && (!activeInstanceId || !instances.some((i) => i.id === activeInstanceId))) {
      setActiveInstanceId(instances[0].id);
    }
  }, [instances, activeInstanceId]);

  // Active main view tab: 'workspace' | 'cosmic' | 'accounts' | 'nebula' | 'usage'
  const [activeViewTab, setActiveViewTab] = useState<'workspace' | 'cosmic' | 'accounts' | 'nebula' | 'usage'>('cosmic');

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
  const [errorAlert, setErrorAlert] = useState<{ title: string; message: string } | null>(null);

  // Tutorial / First-Run Guide & Help Menu
  const TUTORIAL_STORAGE_KEY = 'orbitgravity_has_seen_tutorial_v1';
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);
  const helpMenuRef = useRef<HTMLDivElement>(null);

  // Automatically show cosmic tutorial cards on first run
  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!hasSeen) {
        setIsTutorialOpen(true);
      }
    } catch {}
  }, []);

  // Dismiss Help dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target as Node)) {
        setIsHelpDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCloseTutorial = () => {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch {}
    setIsTutorialOpen(false);
  };

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
        const hasRunning = prevInstances.some((inst) => inst.status === 'running');
        if (!hasRunning) return prevInstances;
        return prevInstances.map((inst) => {
          if (inst.status !== 'running') return inst;
          return {
            ...inst,
            totalElapsedSeconds: inst.totalElapsedSeconds + 1,
          };
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initial synchronization with native Tauri backend
  useEffect(() => {
    if (isTauri()) {
      invoke<any>('get_system_info')
        .then((sysInfo) => {
          if (sysInfo?.profiles_dir) {
            const currentPref = localStorage.getItem('orbitgravity_preferred_profiles_base');
            if (!currentPref) {
              localStorage.setItem('orbitgravity_preferred_profiles_base', sysInfo.profiles_dir);
            }
          }
        })
        .catch(() => {});

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
                    pid: ri.pid ?? (isRunning ? existing.pid : undefined),
                    workspacePath: ri.workspace_path || existing.workspacePath,
                    profileDir: ri.profile_dir || existing.profileDir,
                    customFlags: ri.custom_flags || existing.customFlags,
                    envVars: ri.env_vars || existing.envVars,
                    appType: ri.app_type || existing.appType || 'antigravity_ide',
                    blackholeSync: ri.blackhole_sync ?? ri.blackholeSync ?? existing.blackholeSync ?? false,
                    syncMode: ri.sync_mode ?? ri.syncMode ?? existing.syncMode ?? (ri.blackhole_sync ? 'black_hole' : 'solar_system'),
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
                  pid: ri.pid,
                  accountId: ri.account_id || accounts[0]?.id || 'acc-enterprise',
                  appType: ri.app_type || 'antigravity_ide',
                  workspacePath: ri.workspace_path || '',
                  profileDir: ri.profile_dir || '',
                  displayMode: 'desktop-gui',
                  envVars: ri.env_vars || {},
                  customFlags: ri.custom_flags || '',
                  startedAt: isRunning ? Date.now() : null,
                  totalElapsedSeconds: 0,
                  lastActivityAt: Date.now(),
                  createdAt: new Date().toISOString(),
                  blackholeSync: ri.blackhole_sync ?? ri.blackholeSync ?? false,
                  syncMode: ri.sync_mode ?? ri.syncMode ?? (ri.blackhole_sync ? 'black_hole' : 'solar_system'),
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

  useEffect(() => {
    if (isTauri() && activeInstance?.id) {
      invoke('set_active_auth_instance', { id: activeInstance.id }).catch(() => {});
    }
  }, [activeInstance?.id]);

  const handleToggleStatus = async (id: string, newStatus: InstanceStatus) => {
    setInstances((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, status: newStatus } : inst))
    );

    if (isTauri()) {
      try {
        if (newStatus === 'running') {
          invoke('set_active_auth_instance', { id }).catch(() => {});
          handleAddLog({
            instanceId: id,
            level: 'exec',
            source: 'agent',
            message: 'Launching isolated Antigravity process with SSH_CONNECTION socket bypass...',
          });
          const res = await invoke<any>('launch_instance', { id });
          setInstances((prev) =>
            prev.map((inst) => (inst.id === id ? { ...inst, pid: res?.pid ?? undefined, status: 'running' } : inst))
          );
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
          setInstances((prev) =>
            prev.map((inst) => (inst.id === id ? { ...inst, pid: undefined, status: 'stopped' } : inst))
          );
          handleAddLog({
            instanceId: id,
            level: 'info',
            source: 'system',
            message: 'Antigravity process terminated.',
          });
        }
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        console.error('Failed to toggle native instance:', err);
        setInstances((prev) =>
          prev.map((inst) => (inst.id === id ? { ...inst, status: newStatus === 'running' ? 'stopped' : 'running', pid: undefined } : inst))
        );
        handleAddLog({
          instanceId: id,
          level: 'error',
          source: 'system',
          message: `Process error: ${errorMsg}`,
        });
        setErrorAlert({
          title: errorMsg.toLowerCase().includes('parent') || errorMsg.toLowerCase().includes('solar system') || errorMsg.toLowerCase().includes('black hole')
            ? 'Launch Blocked by Concurrency Guard'
            : 'Process Launch Error',
          message: errorMsg,
        });
      }
    }
  };

  const handleLaunchIde = (instance: AntigravityInstance) => {
    handleToggleStatus(instance.id, 'running');
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

  const handleClearLogs = (instanceId?: string) => {
    if (instanceId) {
      setLogs((prev) => prev.filter((l) => l.instanceId !== instanceId));
    } else {
      setLogs([]);
    }
  };

  const handleSaveInstance = async (
    data: Partial<AntigravityInstance>,
    initialImport?: { source: 'global' | string; appType: AntigravityAppType }
  ) => {
    if (editingInstance) {
      if (isTauri()) {
        try {
          await invoke('update_instance', {
            id: editingInstance.id,
            name: data.name,
            accountId: data.accountId,
            mode: data.displayMode,
            workspacePath: data.workspacePath,
            customFlags: data.customFlags,
            envVars: data.envVars,
            appType: data.appType,
            blackholeSync: data.syncMode === 'black_hole',
            blackhole_sync: data.syncMode === 'black_hole',
            syncMode: data.syncMode,
            sync_mode: data.syncMode,
          });
          handleAddLog({
            instanceId: editingInstance.id,
            level: 'info',
            source: 'system',
            message: `Updated instance configuration (${data.appType || editingInstance.appType}).`,
          });
        } catch (err: any) {
          console.error('Failed to update native instance profile:', err);
        }
      }
      setInstances((prev) =>
        prev.map((inst) => (inst.id === editingInstance.id ? { ...inst, ...data } : inst))
      );
    } else {
      let newId = `inst-${Date.now().toString(36)}`;
      const cleanName = (data.name || 'Instance').replace(/[^a-zA-Z0-9_-]/g, '') || 'Instance';
      let profileDir = `%USERPROFILE%\\AntigravityProfiles\\${cleanName}`;
      let resolvedWorkspace = data.workspacePath?.trim() || profileDir;
      let rustInst: any = null;

      if (isTauri()) {
        try {
          rustInst = await invoke<any>('create_instance', {
            payload: {
              name: data.name || 'New Service Instance',
              accountId: data.accountId || accounts[0]?.id,
              mode: 'auth-only',
              workspacePath: data.workspacePath,
              customFlags: data.customFlags,
              envVars: data.envVars,
              appType: data.appType || 'antigravity_ide',
              createShortcut: data.createShortcut ?? true,
              blackholeSync: data.syncMode === 'black_hole',
              syncMode: data.syncMode || 'solar_system',
            },
            name: data.name || 'New Service Instance',
            accountId: data.accountId || accounts[0]?.id,
            mode: 'auth-only',
            workspacePath: data.workspacePath,
            customFlags: data.customFlags,
            envVars: data.envVars,
            appType: data.appType || 'antigravity_ide',
            createShortcut: data.createShortcut ?? true,
            blackholeSync: data.syncMode === 'black_hole',
            blackhole_sync: data.syncMode === 'black_hole',
            syncMode: data.syncMode || 'solar_system',
            sync_mode: data.syncMode || 'solar_system',
          });
          if (rustInst?.id) {
            newId = rustInst.id;
          }
          if (rustInst?.profileDir || rustInst?.profile_dir) {
            profileDir = rustInst.profileDir || rustInst.profile_dir;
          }
          if (rustInst?.workspacePath || rustInst?.workspace_path) {
            resolvedWorkspace = rustInst.workspacePath || rustInst.workspace_path;
          }
          handleAddLog({
            instanceId: newId,
            level: 'info',
            source: 'system',
            message: `Created profile directory with NTFS Junctions: ${profileDir}`,
          });

          // If user requested initial conversation history import:
          if (initialImport) {
            try {
              const isGlobal = initialImport.source === 'global';
              let sourceProfileDir: string | null = null;
              let sourceAppType = initialImport.appType;
              if (!isGlobal) {
                const srcInst = instances.find((i) => i.id === initialImport.source);
                if (srcInst) {
                  sourceProfileDir = srcInst.profileDir || null;
                  sourceAppType = srcInst.appType || 'antigravity_ide';
                }
              }
              const importedCount = await invoke<number>('import_conversations', {
                targetInstanceId: newId,
                sourceProfileDir,
                sourceAppType,
                isGlobal,
                conversationIds: [],
              });
              handleAddLog({
                instanceId: newId,
                level: 'info',
                source: 'system',
                message: `Imported ${importedCount} conversation(s) into memory from ${isGlobal ? 'Main Antigravity' : 'selected profile'}.`,
              });
            } catch (importErr: any) {
              console.error('Failed initial conversation import:', importErr);
              handleAddLog({
                instanceId: newId,
                level: 'warn',
                source: 'system',
                message: `Could not import initial conversations: ${importErr?.message || String(importErr)}`,
              });
            }
          }
        } catch (err: any) {
          console.error('Failed to create native instance profile:', err);
        }
      }

      const newInst: AntigravityInstance = {
        id: newId,
        name: data.name || 'New Service Instance',
        description: data.description || '',
        tag: data.tag || 'Projects',
        color: 'neutral',
        icon: data.icon || 'terminal',
        status: 'stopped',
        accountId: data.accountId || accounts[0]?.id || 'acc-enterprise',
        appType: (rustInst?.app_type || rustInst?.appType || data.appType || 'antigravity_ide') as AntigravityAppType,
        workspacePath: resolvedWorkspace,
        profileDir,
        displayMode: data.displayMode || 'desktop-gui',
        envVars: data.envVars || {},
        customFlags: data.customFlags || '--enable-anti-entropy',
        startedAt: null,
        totalElapsedSeconds: 0,
        lastActivityAt: Date.now(),
        createdAt: new Date().toISOString(),
        blackholeSync: data.syncMode === 'black_hole',
        syncMode: data.syncMode || 'solar_system',
      };
      setInstances((prev) => [newInst, ...prev]);
      setActiveInstanceId(newId);
      setActiveViewTab('workspace');
    }
  };

  const handleDeleteInstance = async (id: string) => {
    if (isTauri()) {
      try {
        await invoke('delete_instance', { id });
      } catch (err) {
        console.error('Failed to delete instance from Tauri:', err);
      }
    }

    setInstances((prev) => {
      const remaining = prev.filter((i) => i.id !== id);
      if (activeInstanceId === id) {
        setActiveInstanceId(remaining[0]?.id || '');
      }
      return remaining;
    });

    handleAddLog({
      instanceId: id,
      level: 'info',
      source: 'system',
      message: 'Instance profile deleted.',
    });
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
    return 'stopped';
  };

  const handleMinimizeWindow = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      getCurrentWindow().minimize().catch(() => {
        invoke('window_minimize').catch(() => {});
      });
    } catch {
      try {
        invoke('window_minimize').catch(() => {});
      } catch {}
    }
  };

  const handleMaximizeWindow = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      getCurrentWindow().toggleMaximize().catch(() => {
        invoke('window_toggle_maximize').catch(() => {});
      });
    } catch {
      try {
        invoke('window_toggle_maximize').catch(() => {});
      } catch {}
    }
  };

  const handleCloseWindow = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      getCurrentWindow().close().catch(() => {
        invoke('window_close').catch(() => {});
      });
    } catch {
      try {
        invoke('window_close').catch(() => {});
      } catch {}
    }
  };

  const handleStartDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, a, input, select, textarea, [role="button"], .no-drag')) {
      return;
    }

    try {
      getCurrentWindow().startDragging().catch(() => {
        invoke('window_start_drag').catch(() => {});
      });
    } catch {
      try {
        invoke('window_start_drag').catch(() => {});
      } catch {}
    }
  };

  const handleToggleMaximize = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, a, input, select, textarea, [role="button"], .no-drag')) {
      return;
    }

    try {
      getCurrentWindow().toggleMaximize().catch(() => {
        invoke('window_toggle_maximize').catch(() => {});
      });
    } catch {
      try {
        invoke('window_toggle_maximize').catch(() => {});
      } catch {}
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#111215] text-[#EDEDED] font-sans select-none antialiased">
      {/* 1. OS Titlebar (Seamlessly integrated with window) */}
      <div
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        onDoubleClick={handleToggleMaximize}
        className="h-10 bg-[#16171B] border-b border-[#23242A] flex items-center justify-between pl-3.5 pr-0 shrink-0 text-xs text-[#9DA1B0] select-none cursor-default"
      >
        {/* Left Window Menu with OrbitGravity Brand & Menu Items */}
        <div className="flex items-center gap-4 pl-1" data-tauri-drag-region>
          <span
            data-tauri-drag-region
            onMouseDown={handleStartDrag}
            className="font-bold text-[16px] text-white tracking-tight cursor-default select-none"
          >
            OrbitGravity
          </span>
          <div className="flex items-center gap-3 text-[13px] text-[#A6ABB8] no-drag">
            <span className="hover:text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition">View</span>
            <span className="hover:text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-800/50 transition">Window</span>

            <div className="relative" ref={helpMenuRef}>
              <button
                type="button"
                onClick={() => setIsHelpDropdownOpen(!isHelpDropdownOpen)}
                className={`cursor-pointer px-1.5 py-0.5 rounded transition flex items-center gap-1 ${
                  isHelpDropdownOpen ? 'bg-[#252834] text-white' : 'hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <span>Help</span>
                <ChevronDown className={`w-3 h-3 text-[#7D8290] transition-transform duration-150 ${isHelpDropdownOpen ? 'rotate-180 text-white' : ''}`} />
              </button>

              {isHelpDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-56 bg-[#16171E] border border-[#2B2E3C] rounded-xl shadow-2xl z-50 py-1.5 text-xs divide-y divide-[#222530] animate-in fade-in zoom-in-95 duration-100 no-drag">
                  <div className="px-1 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsHelpDropdownOpen(false);
                        setIsTutorialOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#202330] text-zinc-200 hover:text-white transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-zinc-100 leading-tight">Tutorial</div>
                        <div className="text-[10px] text-zinc-400 leading-tight">Cosmic Field Guide & Concepts</div>
                      </div>
                    </button>
                  </div>

                  <div className="px-1 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsHelpDropdownOpen(false);
                        setActiveViewTab('cosmic');
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#202330] text-zinc-300 hover:text-white transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Cosmic Systems Overview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsHelpDropdownOpen(false);
                        setActiveViewTab('nebula');
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#202330] text-zinc-300 hover:text-white transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <EventHorizonIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>Event Horizon Archive</span>
                    </button>
                  </div>

                  <div className="px-3 py-1.5 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                    <span>OrbitGravity</span>
                    <span className="text-zinc-400">v2.0.0</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Draggable Spacer & Session Title (spans full remaining middle space) */}
        <div
          data-tauri-drag-region
          onMouseDown={handleStartDrag}
          onDoubleClick={handleToggleMaximize}
          className="flex-1 h-full flex items-center justify-center cursor-default min-w-[50px] px-4"
        >
          <div
            data-tauri-drag-region
            className="text-[12px] font-mono text-[#7D8290] truncate max-w-sm hidden md:block select-none pointer-events-none"
          >
            {activeInstance?.name ? activeInstance.name : 'OrbitGravity Fleet'}
          </div>
        </div>

        {/* Right Windows Control Buttons - Standard Windows 11 size */}
        <div className="flex items-center h-full text-xs no-drag pointer-events-auto">
          <button
            type="button"
            onClick={handleMinimizeWindow}
            className="hover:text-white hover:bg-[#252730] w-11 h-10 flex items-center justify-center text-[#B0B4C0] cursor-pointer transition-colors"
            title="Minimize"
          >
            —
          </button>
          <button
            type="button"
            onClick={handleMaximizeWindow}
            className="hover:text-white hover:bg-[#252730] w-11 h-10 flex items-center justify-center text-[#B0B4C0] cursor-pointer transition-colors"
            title="Maximize"
          >
            🗖
          </button>
          <button
            type="button"
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
        <aside className={`${sidebarCollapsed ? 'w-[68px] min-w-[68px]' : 'w-[320px] min-w-[320px]'} bg-[#141518] border-r border-[#22242B] flex flex-col justify-between shrink-0 select-none transition-all duration-200`}>
          <div className={`flex-1 overflow-y-auto ${sidebarCollapsed ? 'p-2 space-y-3 flex flex-col items-center' : 'p-3.5 space-y-4'}`}>
            {/* Top Bar with OrbitGravity Squircle Logo & Controls */}
            {!sidebarCollapsed ? (
              <div className="flex items-center justify-between pb-0.5 px-0.5">
                <div className="flex items-center gap-2.5">
                  <OrbitGravityLogo size={30} showSquircle={true} />
                </div>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#202229] rounded-md cursor-pointer transition"
                  title="Collapse Sidebar"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 pb-0.5 w-full">
                <div
                  onClick={() => setSidebarCollapsed(false)}
                  className="cursor-pointer hover:opacity-85 transition"
                  title="Expand Sidebar"
                >
                  <OrbitGravityLogo size={30} showSquircle={true} />
                </div>
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#202229] rounded-lg cursor-pointer transition"
                  title="Expand Sidebar"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              </div>
            )}

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
                className="w-10 h-10 flex items-center justify-center bg-[#1F2128] hover:bg-[#282B34] text-[#EDEDED] rounded-lg border border-[#2D303B] transition cursor-pointer shadow-sm"
                title="New Instance Shortcut"
              >
                <Plus className="w-4 h-4 text-[#C4C7D2]" />
              </button>
            )}

            {/* Global Navigation Links */}
            {!sidebarCollapsed ? (
              <div className="space-y-1 text-[13.5px] text-[#C4C7D0]">
                <button
                  onClick={() => setActiveViewTab('cosmic')}
                  className={`w-full text-left h-9 px-3 rounded-lg flex items-center gap-2.5 transition cursor-pointer ${
                    activeViewTab === 'cosmic'
                      ? 'bg-[#262832] text-white font-medium'
                      : 'hover:bg-[#1E2028] hover:text-white'
                  }`}
                  title="Cosmic Systems Manager"
                >
                  <Zap className="w-[18px] h-[18px] text-purple-400 shrink-0" />
                  <span>Cosmic Systems Manager</span>
                </button>

                <button
                  onClick={() => setActiveViewTab('nebula')}
                  className={`w-full text-left h-9 px-3 rounded-lg flex items-center justify-between transition cursor-pointer ${
                    activeViewTab === 'nebula'
                      ? 'bg-[#262832] text-white font-medium'
                      : 'hover:bg-[#1E2028] hover:text-white text-[#C4C7D0]'
                  }`}
                  title="Nebula Archive - Stellar Memory Nursery (Coming Soon)"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Database className="w-[18px] h-[18px] text-purple-400 shrink-0" />
                    <span className="truncate">Nebula Archive</span>
                  </div>
                  <span className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[8.5px] font-mono font-bold bg-purple-950/70 text-purple-300 border border-purple-700/50 uppercase tracking-wide shrink-0">
                    SOON
                  </span>
                </button>

                <button
                  onClick={() => setActiveViewTab('usage')}
                  className={`w-full text-left h-9 px-3 rounded-lg flex items-center gap-2.5 transition cursor-pointer ${
                    activeViewTab === 'usage'
                      ? 'bg-[#262832] text-white font-medium'
                      : 'hover:bg-[#1E2028] hover:text-white'
                  }`}
                  title="Event Horizon — Quota & Usage Monitor"
                >
                  <EventHorizonIcon className="w-[18px] h-[18px] shrink-0" />
                  <span>Event Horizon</span>
                </button>

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
                  <span>Session Workspace</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1 w-full flex flex-col items-center text-[13.5px] text-[#C4C7D0]">
                <button
                  onClick={() => setActiveViewTab('cosmic')}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition cursor-pointer ${
                    activeViewTab === 'cosmic'
                      ? 'bg-[#262832] text-white shadow-sm'
                      : 'hover:bg-[#1E2028] hover:text-white'
                  }`}
                  title="Cosmic Systems Manager"
                >
                  <Zap className="w-[18px] h-[18px] text-purple-400" />
                </button>

                <button
                  onClick={() => setActiveViewTab('nebula')}
                  className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition cursor-pointer ${
                    activeViewTab === 'nebula'
                      ? 'bg-[#262832] text-white shadow-sm'
                      : 'hover:bg-[#1E2028] hover:text-white'
                  }`}
                  title="Nebula Archive (Coming Soon)"
                >
                  <Database className="w-[18px] h-[18px] text-purple-400" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 ring-2 ring-[#141518]" />
                </button>

                <button
                  onClick={() => setActiveViewTab('usage')}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition cursor-pointer ${
                    activeViewTab === 'usage'
                      ? 'bg-[#262832] text-white shadow-sm'
                      : 'hover:bg-[#1E2028] hover:text-white'
                  }`}
                  title="Event Horizon — Quota & Usage Monitor"
                >
                  <EventHorizonIcon className="w-[18px] h-[18px]" />
                </button>

                <button
                  onClick={() => setActiveViewTab('workspace')}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition cursor-pointer ${
                    activeViewTab === 'workspace'
                      ? 'bg-[#262832] text-white shadow-sm'
                      : 'hover:bg-[#1E2028] hover:text-white'
                  }`}
                  title="Session Workspace"
                >
                  <History className="w-[18px] h-[18px] text-[#9A9EA8]" />
                </button>
              </div>
            )}

            {/* PROJECTS / INSTANCES SECTION - Clean Antigravity Style */}
            {!sidebarCollapsed ? (
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
                  {/* Pinned Galactic Root: The Black Hole (Parent Singularity) */}
                  <div
                    onClick={() => setActiveViewTab('cosmic')}
                    className={`mb-2 p-2 rounded-lg border transition-all cursor-pointer group select-none ${
                      activeViewTab === 'cosmic'
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                        : 'bg-[#15161D] border-purple-900/30 hover:border-purple-600/50 hover:bg-[#191B24]'
                    }`}
                    title="The Black Hole (Parent Singularity) - Global Root Memory"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-purple-950/80 border border-purple-600/50 flex items-center justify-center text-[11px] shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                          🕳️
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                          <div className="text-[12px] font-bold text-purple-200 group-hover:text-white truncate flex items-center gap-3">
                            <span>The Black Hole</span>
                            <span className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9.5px] font-mono font-bold bg-purple-900/60 text-purple-300 border border-purple-700/50 uppercase">
                              PARENT
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono truncate mt-1">
                            Singularity Root Memory
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                  </div>

                  {instances.length === 0 ? (
                    <div className="mx-1 my-3 p-3.5 rounded-xl border border-dashed border-[#262835] bg-[#101118]/60 text-center">
                      <p className="text-xs text-zinc-300 font-medium mb-1">No Active Profiles</p>
                      <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
                        Create your first isolated Antigravity workspace profile.
                      </p>
                      <button
                        onClick={() => {
                          setEditingInstance(null);
                          setIsInstanceModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-[#1B1D28] hover:bg-purple-950/60 border border-[#2D3042] hover:border-purple-600/60 text-zinc-300 hover:text-purple-200 text-xs font-medium transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-purple-400" />
                        <span>Add Instance</span>
                      </button>
                    </div>
                  ) : (
                    Object.entries(groupedInstances).map(([groupName, items]) => {
                      const isCollapsed = !!collapsedFolders[groupName];
                      const isSolarSystem = items.length >= 2;
                      return (
                        <div key={groupName} className="space-y-0.5">
                          {/* Folder / Solar System Category Row */}
                          <div
                            onClick={() => toggleFolder(groupName)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] font-medium text-[#9A9EA8] hover:text-[#EDEDED] hover:bg-[#181A22] cursor-pointer select-none transition-colors"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5 text-[#707482] shrink-0" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#707482] shrink-0" />
                            )}
                            {isSolarSystem ? (
                              <span className="text-amber-400 text-xs shrink-0" title="Solar System: Star Shared Brain">☀️</span>
                            ) : (
                              <Folder className="w-4 h-4 text-[#8B8F9A] shrink-0" />
                            )}
                            <span className="truncate text-[13px] font-medium text-[#A6ABB8]">
                              {isSolarSystem ? `Solar System: ${groupName}` : groupName}
                            </span>
                            <span className="text-[11px] text-[#636775] font-mono ml-auto">
                              {isSolarSystem ? `${items.length} 🪐` : items.length}
                            </span>
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

                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                      {inst.blackholeSync && (
                                        <span
                                          className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[10px] bg-purple-950/70 text-purple-300 border border-purple-700/50"
                                          title="Synchronized with The Black Hole"
                                        >
                                          🕳️
                                        </span>
                                      )}
                                      <span className={`inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9.5px] font-mono font-semibold ${
                                        inst.appType === 'antigravity'
                                          ? 'bg-purple-950/40 text-purple-400 border border-purple-800/40'
                                          : 'bg-blue-950/40 text-blue-400 border border-blue-800/40'
                                      }`}>
                                        {inst.appType === 'antigravity' ? 'App' : 'IDE'}
                                      </span>
                                      {inst.tier === 'Pro' ? (
                                        <span
                                          className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9px] font-mono font-extrabold bg-gradient-to-r from-zinc-200 via-white to-zinc-300 text-zinc-950 border border-white/90 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                                          title="Pro Tier Instance (Platinum)"
                                        >
                                          PRO
                                        </span>
                                      ) : inst.tier === 'Plus' ? (
                                        <span
                                          className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9px] font-mono font-bold bg-blue-950/70 text-blue-300 border border-blue-500/60 shadow-[0_0_6px_rgba(59,130,246,0.3)] gap-1"
                                          title="Plus Tier Instance"
                                        >
                                          <Zap className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                                          <span>PLUS</span>
                                        </span>
                                      ) : (
                                        <span
                                          className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9px] font-mono font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/60"
                                          title="Free Tier Instance"
                                        >
                                          FREE
                                        </span>
                                      )}
                                      <span className="inline-flex items-center justify-center leading-none h-[18px] text-[11px] font-mono text-[#787D8A] group-hover:text-[#A6ABB8]">
                                        {formatInstanceDurationBadge(inst)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-[#202229] flex flex-col items-center gap-1.5 w-full">
                {/* Pinned Black Hole in collapsed mode */}
                <button
                  onClick={() => setActiveViewTab('cosmic')}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition cursor-pointer border ${
                    activeViewTab === 'cosmic'
                      ? 'bg-purple-950/60 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                      : 'bg-[#15161D] border-purple-900/30 hover:border-purple-600/50 hover:bg-[#191B24]'
                  }`}
                  title="The Black Hole (Parent Singularity) - Global Root Memory"
                >
                  <span className="text-sm">🕳️</span>
                </button>

                {/* Instance icons in collapsed mode */}
                {instances.map((inst) => {
                  const isSelected = inst.id === activeInstanceId && activeViewTab === 'workspace';
                  const isRunning = inst.status === 'running';
                  return (
                    <button
                      key={inst.id}
                      onClick={() => {
                        setActiveInstanceId(inst.id);
                        setActiveViewTab('workspace');
                      }}
                      className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#282A34] text-white font-medium shadow-sm'
                          : 'text-[#C4C7D0] hover:bg-[#1B1D25] hover:text-white'
                      }`}
                      title={`${inst.name} (${isRunning ? 'Running' : 'Stopped'}) - ${inst.appType === 'antigravity' ? 'Antigravity' : 'Antigravity IDE'}`}
                    >
                      {inst.appType === 'antigravity' ? (
                        <Terminal className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Code className="w-4 h-4 text-blue-400" />
                      )}
                      {isRunning && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#141518] shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Sidebar: Fleet Active Sessions */}
          <div className={`${sidebarCollapsed ? 'p-2 flex flex-col items-center justify-center' : 'p-3.5'} border-t border-[#1C1E26] bg-[#0E0F12]`}>
            {!sidebarCollapsed ? (
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
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex flex-col items-center justify-center bg-[#16171B] border border-[#23242A] text-zinc-400"
                title={`Active Instances: ${runningCount} / ${activeAccount.maxConcurrentSessions}`}
              >
                <span className="text-[11px] font-mono font-bold text-zinc-200">{runningCount}</span>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER / MAIN WORKSPACE AREA */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeViewTab === 'workspace' && (
            activeInstance ? (
              <AntigravityWorkspace
                instance={activeInstance}
                instances={instances}
                account={activeAccount}
                logs={logs}
                onToggleStatus={handleToggleStatus}
                onOpenSettings={(inst) => {
                  setEditingInstance(inst);
                  setIsInstanceModalOpen(true);
                }}
                onAddLog={handleAddLog}
                onLaunchIde={handleLaunchIde}
                onDeleteInstance={handleDeleteInstance}
                onClearLogs={handleClearLogs}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0C0D12] overflow-y-auto">
                <div className="max-w-xl mx-auto flex flex-col items-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-900/40 via-indigo-900/30 to-blue-900/20 border border-purple-500/30 flex items-center justify-center shadow-2xl shadow-purple-950/50">
                      <OrbitGravityLogo className="w-12 h-12" />
                    </div>
                    <div className="absolute -inset-2 bg-purple-500/10 blur-xl rounded-full -z-10" />
                  </div>

                  <h2 className="text-2xl font-bold text-zinc-100 tracking-tight mb-2">
                    Welcome to OrbitGravity
                  </h2>
                  <p className="text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
                    Launch and manage multiple isolated Antigravity profiles with independent cookie vaults, project environments, and shared star memory brains.
                  </p>

                  <button
                    onClick={() => {
                      setEditingInstance(null);
                      setIsInstanceModalOpen(true);
                    }}
                    className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Instance</span>
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 w-full text-left">
                    <div className="p-4 rounded-xl bg-[#13141C] border border-[#1E202B]">
                      <div className="w-7 h-7 rounded-lg bg-purple-950/60 border border-purple-700/50 flex items-center justify-center mb-3 text-purple-300">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-200 mb-1">Total Profile Isolation</h4>
                      <p className="text-[11.5px] text-zinc-500 leading-relaxed">
                        Each session runs on its own port with independent authentication tokens and user data dirs.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#13141C] border border-[#1E202B]">
                      <div className="w-7 h-7 rounded-lg bg-blue-950/60 border border-blue-700/50 flex items-center justify-center mb-3 text-blue-300">
                        <Zap className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-200 mb-1">Zero-Disk Junctions</h4>
                      <p className="text-[11.5px] text-zinc-500 leading-relaxed">
                        Shares global extension libraries via NTFS junctions so disk space usage remains near zero.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#13141C] border border-[#1E202B]">
                      <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center mb-3 text-emerald-300">
                        <Folder className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-200 mb-1">Custom Workspaces</h4>
                      <p className="text-[11.5px] text-zinc-500 leading-relaxed">
                        Point directly to your existing repositories or let OrbitGravity generate a clean isolated workspace.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {activeViewTab === 'cosmic' && (
            <CosmicSystemsManager
              instances={instances}
              onSelectInstance={(inst) => {
                setActiveInstanceId(inst.id);
                setActiveViewTab('workspace');
              }}
              onAddLog={handleAddLog}
            />
          )}

          {activeViewTab === 'nebula' && (
            <NebulaArchive instances={instances} />
          )}

          {activeViewTab === 'usage' && (
            <InstanceUsageMonitorView
              instances={instances}
              onSelectInstance={(instId) => {
                setActiveInstanceId(instId);
                setActiveViewTab('workspace');
              }}
              onLaunchInstance={(instId) => handleToggleStatus(instId, 'running')}
            />
          )}

          {activeViewTab === 'accounts' && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0F1012]">
              <div className="max-w-6xl mx-auto">
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
        onDelete={handleDeleteInstance}
        accounts={accounts}
        initialInstance={editingInstance}
        instances={instances}
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

      {/* Cosmic Field Guide / Tutorial Modal */}
      <CosmicTutorialModal
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />

      {/* Concurrency Guard & Process Error Alert Modal */}
      {errorAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="bg-[#14151B] border border-amber-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-600/60 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="text-sm font-bold text-zinc-100">{errorAlert.title}</h3>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">{errorAlert.message}</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setErrorAlert(null)}
                className="px-4 py-1.5 bg-[#22242F] hover:bg-[#2D303F] text-zinc-200 border border-[#3A3D4E] rounded-lg text-xs font-medium cursor-pointer transition shadow-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
