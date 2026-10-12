import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../api';
import { AntigravityInstance, AntigravityAccount, LogEntry, ConversationInfo, SharedBrainStatus } from '../types/antigravity';
import { ImportConversationsModal } from './ImportConversationsModal';
import { TransferErrorModal } from './TransferErrorModal';
import { formatSecondsToTime } from '../utils/formatters';
import { 
  Play, 
  Pause, 
  Settings, 
  Clock, 
  ExternalLink, 
  Code, 
  Terminal, 
  Copy, 
  Check, 
  ShieldCheck, 
  Monitor, 
  Trash2,
  Folder,
  Sparkles,
  Brain,
  MessageSquare,
  RefreshCw,
  Search,
  ArrowRight,
  Download,
  Send,
  Square,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface AntigravityWorkspaceProps {
  instance: AntigravityInstance;
  instances?: AntigravityInstance[];
  account?: AntigravityAccount;
  logs: LogEntry[];
  onToggleStatus: (id: string, newStatus: 'running' | 'paused' | 'stopped') => void;
  onOpenSettings: (instance: AntigravityInstance) => void;
  onAddLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  onLaunchIde?: (instance: AntigravityInstance) => void;
  onDeleteInstance?: (id: string) => void;
  onClearLogs?: (instanceId?: string) => void;
}

export function AntigravityWorkspace({
  instance,
  instances = [],
  account,
  logs,
  onToggleStatus,
  onOpenSettings,
  onAddLog,
  onLaunchIde,
  onDeleteInstance,
  onClearLogs,
}: AntigravityWorkspaceProps) {
  const [shortcutCreated, setShortcutCreated] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Dispatcher & Auth Callback States
  const [dispatcherActive, setDispatcherActive] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('');
  const [isRouting, setIsRouting] = useState(false);
  const [routeFeedback, setRouteFeedback] = useState<string | null>(null);

  // Active Workspace View: 'overview' | 'memory'
  const [activeTab, setActiveTab] = useState<'overview' | 'memory'>('overview');

  // Conversation Memory & Shared Brain state
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [conversationSearch, setConversationSearch] = useState('');
  const [sharedBrainStatus, setSharedBrainStatus] = useState<SharedBrainStatus | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [transferDropdownConvId, setTransferDropdownConvId] = useState<string | null>(null);
  const [transferFeedback, setTransferFeedback] = useState<Record<string, string>>({});
  const [syncingBrain, setSyncingBrain] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<string | null>(null);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [parentRunning, setParentRunning] = useState(false);
  const [terminatingParent, setTerminatingParent] = useState(false);
  const [transferErrorModal, setTransferErrorModal] = useState<{
    isOpen: boolean;
    targetName?: string;
    conversationTitle?: string;
    errorMessage: string;
  }>({
    isOpen: false,
    errorMessage: '',
  });

  const checkParentProcess = async () => {
    if (isTauri()) {
      try {
        const info = await invoke<any>('get_parent_process_status');
        setParentRunning(info?.isRunning ?? false);
      } catch {}
    }
  };

  useEffect(() => {
    checkParentProcess();
    const interval = setInterval(checkParentProcess, 3500);
    return () => clearInterval(interval);
  }, []);

  const isBlackHoleTethered = instance.blackholeSync === true || instance.syncMode === 'black_hole';
  const isBlackHoleLaunchBlocked = instance.status !== 'running' && parentRunning && isBlackHoleTethered;

  const handleTerminateParentFromWorkspace = async () => {
    setTerminatingParent(true);
    try {
      if (isTauri()) {
        const count = await invoke<number>('terminate_parent_app');
        onAddLog({
          instanceId: instance.id,
          level: 'info',
          source: 'system',
          message: `Terminated ${count} parent process(es). Black Hole lock released.`,
        });
      }
      setParentRunning(false);
      await checkParentProcess();
    } catch (err: any) {
      console.error('Failed to terminate parent:', err);
    } finally {
      setTerminatingParent(false);
    }
  };

  const handleDeleteConversation = async (convId: string, deleteFromShared: boolean) => {
    setDeletingConvId(convId);
    try {
      if (isTauri()) {
        await invoke('delete_conversation', {
          profileDir: instance.profileDir || null,
          appType: instance.appType || 'antigravity_ide',
          isGlobal: false,
          conversationId: convId,
          deleteFromSharedBrain: deleteFromShared,
        });
      }
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      setConfirmDeleteConvId(null);
      onAddLog({
        instanceId: instance.id,
        level: 'info',
        source: 'system',
        message: `Deleted conversation thread (${convId.substring(0, 8)}...)${deleteFromShared ? ' and purged from Star Brain' : ''}.`,
      });
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
      onAddLog({
        instanceId: instance.id,
        level: 'error',
        source: 'system',
        message: `Failed to delete conversation: ${err?.message || String(err)}`,
      });
    } finally {
      setDeletingConvId(null);
    }
  };

  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      if (isTauri()) {
        const res = await invoke<ConversationInfo[]>('list_conversations', {
          profileDir: instance.profileDir || null,
          appType: instance.appType || 'antigravity_ide',
          isGlobal: false,
          sourceName: instance.name,
        });
        setConversations(res || []);
      } else {
        setConversations([
          {
            id: 'demo-c1',
            title: 'Project Architecture & Memory Setup',
            preview: 'Configuring multi-instance isolation and folder brain syncing...',
            step_count: 14,
            last_modified: new Date().toISOString(),
            source_name: instance.name,
          },
          {
            id: 'demo-c2',
            title: 'Directory Junction Linking Logic',
            preview: 'Testing NTFS Junction symlink creation without UAC prompts...',
            step_count: 9,
            last_modified: new Date(Date.now() - 3600000).toISOString(),
            source_name: instance.name,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to list conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const fetchSharedBrainStatus = async () => {
    try {
      if (isTauri()) {
        const res = await invoke<SharedBrainStatus>('get_shared_brain_status', {
          id: instance.id,
        });
        setSharedBrainStatus(res);
      } else {
        const groupMembers = (instances || []).filter(
          (i) => (i.tag || '').trim().toLowerCase() === (instance.tag || '').trim().toLowerCase()
        );
        setSharedBrainStatus({
          group_name: instance.tag || 'Projects',
          is_shared: groupMembers.length > 1,
          member_count: groupMembers.length,
          shared_path: `%USERPROFILE%\\AntigravityProfiles\\_shared_brains\\${instance.tag}`,
          members: groupMembers.map((i) => i.name),
        });
      }
    } catch (err) {
      console.error('Failed to get shared brain status:', err);
    }
  };

  useEffect(() => {
    fetchSharedBrainStatus();
    fetchConversations();
  }, [instance.id, instance.profileDir, instance.appType, instance.tag]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.transfer-dropdown-container')) {
        setTransferDropdownConvId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSyncInstanceBrain = async () => {
    setSyncingBrain(true);
    setSyncFeedback(null);
    try {
      if (isTauri()) {
        const report = await invoke<string>('sync_instance_brain', { id: instance.id });
        setSyncFeedback(report || 'Synchronized successfully!');
        onAddLog({
          instanceId: instance.id,
          level: 'info',
          source: 'system',
          message: report || `Atomically synchronized memory for ${instance.name}.`,
        });
      } else {
        setSyncFeedback('Synchronized (Mock Browser Mode)');
      }
      await fetchSharedBrainStatus();
      await fetchConversations();
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      console.error('Failed to sync instance brain:', err);
      const errMsg = err?.message || String(err);
      setSyncFeedback(`Sync failed: ${errMsg}`);
      onAddLog({
        instanceId: instance.id,
        level: 'error',
        source: 'system',
        message: `Memory sync error: ${errMsg}`,
      });
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setSyncingBrain(false);
    }
  };

  const getTransferBlockReason = (tgt: {
    id: string;
    name: string;
    tag?: string;
    status?: string;
    blackholeSync?: boolean;
    syncMode?: string;
  }): string | null => {
    // 1. Check Source instance itself: must NOT be running
    if (instance.status === 'running') {
      return 'Source instance running';
    }

    // 2. Check Source instance's connected peers
    const isSrcBh = instance.blackholeSync || instance.syncMode === 'black_hole';
    const isSrcSolo = instance.syncMode === 'solo';

    if (isSrcBh) {
      if (parentRunning) {
        return 'Parent App active';
      }
      const runningBh = instances.find(
        (i) => i.id !== instance.id && (i.blackholeSync || i.syncMode === 'black_hole') && i.status === 'running'
      );
      if (runningBh) {
        return `Tethered '${runningBh.name}' running`;
      }
    } else if (!isSrcSolo) {
      const srcGroup = instance.tag || 'Projects';
      const runningPeer = instances.find((i) => {
        if (i.id === instance.id || i.status !== 'running') return false;
        const isBh = i.blackholeSync || i.syncMode === 'black_hole';
        const isSolo = i.syncMode === 'solo';
        if (isBh || isSolo) return false;
        return (i.tag || 'Projects').toLowerCase() === srcGroup.toLowerCase();
      });
      if (runningPeer) {
        return `Source brain '${runningPeer.name}' running`;
      }
    }

    // 3. Check Destination: The Black Hole vs fleet instance
    if (tgt.id === 'blackhole') {
      if (parentRunning) {
        return 'Parent Antigravity app active';
      }
      const runningBh = instances.find(
        (i) => (i.blackholeSync || i.syncMode === 'black_hole') && i.status === 'running'
      );
      if (runningBh) {
        return `Black Hole instance '${runningBh.name}' running`;
      }
      return null;
    }

    // Destination is another fleet instance
    if (tgt.status === 'running') {
      return 'Target instance running';
    }

    const isTgtBh = tgt.blackholeSync || tgt.syncMode === 'black_hole';
    const isTgtSolo = tgt.syncMode === 'solo';

    if (isTgtBh) {
      if (parentRunning) {
        return 'Parent Antigravity active';
      }
      const runningBh = instances.find(
        (i) => (i.blackholeSync || i.syncMode === 'black_hole') && i.status === 'running'
      );
      if (runningBh) {
        return `Tethered '${runningBh.name}' running`;
      }
    } else if (!isTgtSolo) {
      const tgtGroup = tgt.tag || 'Projects';
      const runningPeer = instances.find((i) => {
        if (i.status !== 'running') return false;
        const isBh = i.blackholeSync || i.syncMode === 'black_hole';
        const isSolo = i.syncMode === 'solo';
        if (isBh || isSolo) return false;
        return (i.tag || 'Projects').toLowerCase() === tgtGroup.toLowerCase();
      });
      if (runningPeer) {
        return `Destination brain '${runningPeer.name}' running`;
      }
    }

    return null;
  };

  const handleTransferConversation = async (
    convId: string,
    targetInstance: AntigravityInstance | { id: string; name: string; tag?: string },
    convTitle?: string
  ) => {
    try {
      if (isTauri()) {
        await invoke('transfer_conversation', {
          fromInstanceId: instance.id,
          toInstanceId: targetInstance.id,
          conversationId: convId,
        });
      }
      setTransferFeedback((prev) => ({ ...prev, [convId]: `Cloned to ${targetInstance.name}!` }));
      setTransferDropdownConvId(null);
      await fetchConversations();
      await fetchSharedBrainStatus();
      setTimeout(() => {
        setTransferFeedback((prev) => {
          const next = { ...prev };
          delete next[convId];
          return next;
        });
      }, 3500);

      onAddLog({
        instanceId: instance.id,
        level: 'info',
        source: 'system',
        message: `Cloned conversation thread "${convId.substring(0, 8)}..." to ${targetInstance.name} and synced with destination brain.`,
      });
    } catch (err: any) {
      console.error('Failed to transfer conversation:', err);
      const errMsg = err?.message || String(err);
      setTransferDropdownConvId(null);
      // Open modal popup instead of stretching the card layout
      setTransferErrorModal({
        isOpen: true,
        targetName: targetInstance.name,
        conversationTitle: convTitle,
        errorMessage: errMsg,
      });
      onAddLog({
        instanceId: instance.id,
        level: 'error',
        source: 'system',
        message: `Failed to transfer conversation: ${errMsg}`,
      });
    }
  };

  useEffect(() => {
    if (isTauri()) {
      invoke<boolean>('get_protocol_dispatcher_status')
        .then((active) => setDispatcherActive(active))
        .catch(() => {});
    }
  }, []);

  const handleToggleDispatcher = async () => {
    if (!isTauri()) return;
    try {
      if (dispatcherActive) {
        await invoke('restore_original_protocols');
        setDispatcherActive(false);
        onAddLog({
          instanceId: instance.id,
          level: 'info',
          source: 'system',
          message: 'Restored original Windows protocol handlers. Automated dispatcher disabled.',
        });
      } else {
        await invoke('enable_protocol_dispatcher');
        setDispatcherActive(true);
        onAddLog({
          instanceId: instance.id,
          level: 'info',
          source: 'system',
          message: 'Enabled Protocol Dispatcher. Antigravity OAuth callbacks will route automatically.',
        });
      }
    } catch (err: any) {
      console.error('Failed to toggle dispatcher:', err);
      onAddLog({
        instanceId: instance.id,
        level: 'error',
        source: 'system',
        message: `Protocol toggle error: ${err?.message || String(err)}`,
      });
    }
  };

  const handleManualRoute = async () => {
    if (!callbackUrl.trim()) return;
    setIsRouting(true);
    setRouteFeedback(null);
    try {
      if (isTauri()) {
        await invoke('dispatch_url_to_instance', {
          id: instance.id,
          url: callbackUrl.trim(),
        });
      }
      setRouteFeedback('Delivered!');
      onAddLog({
        instanceId: instance.id,
        level: 'info',
        source: 'system',
        message: `Routed auth callback URL to instance ${instance.name}.`,
      });
      setCallbackUrl('');
      setTimeout(() => setRouteFeedback(null), 3000);
    } catch (err: any) {
      setRouteFeedback('Failed');
      onAddLog({
        instanceId: instance.id,
        level: 'error',
        source: 'system',
        message: `Failed to deliver callback URL: ${err?.message || String(err)}`,
      });
    } finally {
      setIsRouting(false);
    }
  };

  const isRunning = instance.status === 'running';
  const instanceLogs = logs.filter((l) => l.instanceId === instance.id);
  const resolvedPath = instance.workspacePath || instance.profileDir || 'Default';

  const handleCreateDesktopShortcut = async () => {
    if (isTauri()) {
      try {
        await invoke('create_desktop_shortcut', { id: instance.id });
        setShortcutCreated(true);
        setTimeout(() => setShortcutCreated(false), 3000);
        onAddLog({
          instanceId: instance.id,
          level: 'info',
          source: 'system',
          message: `Created desktop shortcut: ${instance.name}.lnk with official icon.`,
        });
      } catch (err) {
        console.error('Failed to create shortcut:', err);
      }
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(resolvedPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleRevealInExplorer = async () => {
    if (isTauri()) {
      try {
        await invoke('open_in_explorer', { path: resolvedPath });
      } catch (err) {
        console.error('Failed to open in explorer:', err);
      }
    }
  };

  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [instanceLogs.length]);

  const handleCopyAllLogs = () => {
    const text = instanceLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text || 'No logs recorded.');
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleClearInstanceLogs = () => {
    if (onClearLogs) {
      onClearLogs(instance.id);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = conversationSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.title || '').toLowerCase().includes(q) ||
      (c.preview || '').toLowerCase().includes(q) ||
      (c.id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F1012] text-[#D8DADF]">
      {/* 1. Top Breadcrumb & Action Header */}
      <div className="h-10 border-b border-[#212328] px-4 flex items-center justify-between bg-[#141518] shrink-0 select-none">
        {/* Left: Breadcrumbs & Live Runtime Status */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#7D818C] hover:text-zinc-300 cursor-pointer">
            {instance.tag || 'Projects'}
          </span>
          <span className="text-[#3D4048]">/</span>
          <span className="text-zinc-200 font-medium truncate max-w-sm">
            {instance.name}
          </span>

          <div className="h-3 w-[1px] bg-[#2A2C34] mx-1" />

          {/* App Type Pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1B1C21] border border-[#262830] font-mono text-[11px]">
            {instance.appType === 'antigravity' ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <Terminal className="w-3 h-3" /> Antigravity
              </span>
            ) : (
              <span className="text-blue-400 flex items-center gap-1 font-semibold">
                <Code className="w-3 h-3" /> Antigravity IDE
              </span>
            )}
          </div>

          {/* Instance Tier Badge in Breadcrumb */}
          {instance.tier === 'Pro' ? (
            <span className="inline-flex items-center justify-center leading-none h-[20px] px-2 rounded-full text-[10px] font-mono font-extrabold bg-gradient-to-r from-zinc-200 via-white to-zinc-300 text-zinc-950 border border-white/90 shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              PRO
            </span>
          ) : instance.tier === 'Plus' ? (
            <span className="inline-flex items-center justify-center leading-none h-[20px] px-2 rounded-full text-[10px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-500/60 shadow-[0_0_6px_rgba(59,130,246,0.3)] gap-1">
              <Zap className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
              <span>PLUS</span>
            </span>
          ) : (
            <span className="inline-flex items-center justify-center leading-none h-[20px] px-2 rounded-full text-[10px] font-mono font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
              FREE
            </span>
          )}

          <div className="h-3 w-[1px] bg-[#2A2C34] mx-1" />

          {/* Live Runtime Timer */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1B1C21] border border-[#262830] font-mono text-[11px] text-zinc-300">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isRunning
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'
                  : 'bg-zinc-500'
              }`}
            />
            <Clock className="w-3 h-3 text-[#7D818C]" />
            <span>{formatSecondsToTime(instance.totalElapsedSeconds)}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Power Toggle */}
          {isRunning ? (
            <button
              onClick={() => onToggleStatus(instance.id, 'paused')}
              className="p-1.5 text-[#8B8F9A] hover:text-amber-400 hover:bg-[#1E2026] rounded transition cursor-pointer"
              title="Pause / Stop Instance Session"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onToggleStatus(instance.id, 'running')}
              className="p-1.5 text-[#8B8F9A] hover:text-emerald-400 hover:bg-[#1E2026] rounded transition cursor-pointer"
              title="Resume / Start Instance Session"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}



          {/* Settings gear */}
          <button
            onClick={() => onOpenSettings(instance)}
            className="p-1.5 text-[#7D818C] hover:text-zinc-200 hover:bg-[#1E2026] rounded transition cursor-pointer"
            title="Profile Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Delete button */}
          {onDeleteInstance && (
            showConfirmDelete ? (
              <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-800/80 px-2 py-0.5 rounded">
                <span className="text-[10px] text-rose-300">Delete?</span>
                <button
                  onClick={() => onDeleteInstance(instance.id)}
                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-medium cursor-pointer"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-1.5 py-0.5 bg-[#1F2229] hover:bg-[#282B34] text-zinc-300 rounded text-[10px] cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="p-1.5 text-[#7D818C] hover:text-rose-400 hover:bg-[#1E2026] rounded transition cursor-pointer"
                title="Delete this Instance Profile"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Workspace Sub-Tab Navigation Bar */}
      <div className="h-9 px-4 border-b border-[#212328] flex items-center justify-between bg-[#111215] shrink-0 select-none">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-zinc-100 bg-[#16171C]'
                : 'border-transparent text-[#7D818C] hover:text-zinc-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Overview & Health</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'memory'
                ? 'border-emerald-500 text-zinc-100 bg-[#16171C]'
                : 'border-transparent text-[#7D818C] hover:text-zinc-300'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-emerald-400" />
            <span>Conversation History & Memory</span>
            {conversations.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1F2430] text-emerald-400 font-mono">
                {conversations.length}
              </span>
            )}
            {sharedBrainStatus?.is_shared && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Category Shared Brain Active" />
            )}
          </button>
        </div>

        {activeTab === 'memory' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-2.5 py-1 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Download className="w-3 h-3" />
              <span>Import Conversations</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Workspace Body: Overview Dashboard */}
      {activeTab === 'overview' && (
        <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-[#0E0F12]">
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Top Status & Launch Control Hero Card */}
        <div className="border border-[#22242B] rounded-xl p-5 bg-[#141519] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isRunning
                    ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse'
                    : 'bg-zinc-600'
                }`}
              />
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                {instance.name}
              </h2>
              {/* Instance Tier Badge */}
              {instance.tier === 'Pro' ? (
                <span className="inline-flex items-center justify-center text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-zinc-200 via-white to-zinc-300 text-zinc-950 border border-white/90 shadow-[0_0_10px_rgba(255,255,255,0.5)] tracking-wide">
                  PRO
                </span>
              ) : instance.tier === 'Plus' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                  <Zap className="w-2.5 h-2.5 text-cyan-400" /> PLUS
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
                  FREE
                </span>
              )}
              <span
                className={`text-[10.5px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                  isRunning
                    ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/60'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {isRunning ? (instance.pid ? `Running • PID ${instance.pid}` : 'Running') : 'Stopped'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              {instance.description || 'Isolated multi-instance Antigravity workspace profile.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isRunning ? (
              <button
                onClick={() => onToggleStatus(instance.id, 'stopped')}
                className="px-3.5 py-1.5 bg-[#1F2229] hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border border-[#2B2E39] hover:border-rose-800/70 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Stop Process</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (isBlackHoleLaunchBlocked) return;
                  onToggleStatus(instance.id, 'running');
                }}
                disabled={isBlackHoleLaunchBlocked}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                  isBlackHoleLaunchBlocked
                    ? 'bg-[#181920] text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-60'
                    : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 cursor-pointer'
                }`}
                title={
                  isBlackHoleLaunchBlocked
                    ? "Locked: Parent Antigravity is active. Close or terminate parent app before starting this instance."
                    : "Start session"
                }
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Session</span>
              </button>
            )}

            <button
              onClick={() => {
                if (isBlackHoleLaunchBlocked) return;
                if (onLaunchIde) {
                  onLaunchIde(instance);
                } else {
                  onToggleStatus(instance.id, 'running');
                }
              }}
              disabled={isBlackHoleLaunchBlocked}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 shadow-sm ${
                isBlackHoleLaunchBlocked
                  ? 'bg-[#181920] text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-60'
                  : 'bg-[#1A56DB] hover:bg-[#1E62F0] text-white cursor-pointer'
              }`}
              title={
                isBlackHoleLaunchBlocked
                  ? "Locked: Parent Antigravity is active. Close or terminate parent app before starting this instance."
                  : "Open native window"
              }
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{instance.appType === 'antigravity' ? 'Open Antigravity' : 'Open IDE Window'}</span>
            </button>
          </div>
        </div>

        {/* Black Hole Mutual Exclusion State Banners */}
        {isBlackHoleTethered && (
          <>
            {/* Case A: Instance is running and holds the Black Hole lock */}
            {instance.status === 'running' && !parentRunning && (
              <div className="p-3.5 bg-purple-950/40 border border-purple-800/60 rounded-xl flex items-center justify-between gap-3 text-purple-200 text-xs font-sans shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse shrink-0" />
                  <span>
                    <strong className="text-purple-300">Black Hole Tether Active:</strong> This instance is currently open in the background. Terminate this instance before starting the parent Antigravity app or IDE.
                  </span>
                </div>
                <button
                  onClick={() => onToggleStatus(instance.id, 'stopped')}
                  className="px-3 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Terminate this running instance to release the Black Hole lock"
                >
                  <Square className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                  <span>Terminate This Instance</span>
                </button>
              </div>
            )}

            {/* Case B: Concurrency Conflict - Both tethered instance and parent app are active simultaneously */}
            {instance.status === 'running' && parentRunning && (
              <div className="p-3.5 bg-rose-950/50 border border-rose-700/70 rounded-xl flex items-center justify-between gap-3 text-rose-200 text-xs font-sans shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    <strong className="text-rose-300">Concurrency Conflict:</strong> Both this tethered instance and the parent application are running simultaneously! Terminate this instance or parent app to protect conversation history.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onToggleStatus(instance.id, 'stopped')}
                    className="px-3 py-1 bg-[#1F1418] hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    title="Stop this instance"
                  >
                    <Square className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                    <span>Stop Instance</span>
                  </button>
                  <button
                    onClick={handleTerminateParentFromWorkspace}
                    disabled={terminatingParent}
                    className="px-3 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    title="Terminate parent Antigravity process tree"
                  >
                    <span>{terminatingParent ? 'Stopping...' : 'Terminate Parent App'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Case C: Instance is stopped and parent app is running */}
            {instance.status !== 'running' && parentRunning && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-center justify-between gap-3 text-amber-200 text-xs font-sans shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong className="text-amber-300">Parent Antigravity is active:</strong> Mutual exclusion concurrency lock active. Close or terminate the parent app before starting this Black Hole tethered instance.
                  </span>
                </div>
                <button
                  onClick={handleTerminateParentFromWorkspace}
                  disabled={terminatingParent}
                  className="px-3 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Terminate parent Antigravity process tree to release Black Hole lock"
                >
                  <Square className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                  <span>{terminatingParent ? 'Stopping...' : 'Terminate Parent App'}</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* 2-Column Grid: Specifications & Real Activity Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Column: Instance Profile Details */}
          <div className="border border-[#22242B] rounded-xl p-5 bg-[#141519] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#202229]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Profile Configuration
                </h3>
              </div>
              <button
                onClick={() => onOpenSettings(instance)}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition cursor-pointer flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                <span>Edit Settings</span>
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              {/* App Type */}
              <div className="p-3 bg-[#18191E] border border-[#23252E] rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">App Type</span>
                  <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5 mt-0.5">
                    {instance.appType === 'antigravity' ? (
                      <>
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        Antigravity (Standalone App)
                      </>
                    ) : (
                      <>
                        <Code className="w-3.5 h-3.5 text-blue-400" />
                        Antigravity IDE (VS Code-based)
                      </>
                    )}
                  </span>
                </div>
                <span className="text-[10.5px] px-2 py-0.5 rounded bg-[#20222A] text-zinc-400 border border-[#2A2C36]">
                  {instance.appType === 'antigravity' ? 'antigravity.exe' : 'Antigravity IDE.exe'}
                </span>
              </div>

              {/* Workspace Profile Directory */}
              <div className="p-3 bg-[#18191E] border border-[#23252E] rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    Workspace Profile Directory
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyPath}
                      className="text-[10.5px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer flex items-center gap-1"
                      title="Copy path"
                    >
                      {copiedPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPath ? 'Copied' : 'Copy'}</span>
                    </button>
                    {isTauri() && (
                      <button
                        onClick={handleRevealInExplorer}
                        className="text-[10.5px] text-blue-400 hover:text-blue-300 transition cursor-pointer flex items-center gap-1"
                        title="Open folder in File Explorer"
                      >
                        <Folder className="w-3 h-3" />
                        <span>Explorer</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-[11.5px] text-zinc-200 truncate select-all" title={resolvedPath}>
                  {resolvedPath}
                </div>
              </div>

              {/* Isolation Mechanism & Sandbox */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-[#18191E] border border-[#23252E] rounded-lg">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Isolation</span>
                  <span className="text-[11.5px] font-semibold text-emerald-400 mt-0.5 block">
                    NTFS Junctions
                  </span>
                  <span className="text-[10px] text-zinc-500 font-sans block mt-0.5">
                    No admin privileges required
                  </span>
                </div>

                <div className="p-2.5 bg-[#18191E] border border-[#23252E] rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Process Status</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${instance.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                  </div>
                  <span className={`text-[11.5px] font-semibold mt-0.5 block font-mono ${instance.status === 'running' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {instance.status === 'running' ? (instance.pid ? `PID: ${instance.pid}` : 'Active (Live)') : 'Stopped'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-sans block mt-0.5">
                    {instance.status === 'running' ? 'Running in Windows memory' : 'Process terminated'}
                  </span>
                </div>
              </div>

              {/* Flags & Env */}
              <div className="p-3 bg-[#18191E] border border-[#23252E] rounded-lg space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Launch Flags:</span>
                  <span className="text-zinc-300 text-[11px] truncate max-w-xs">
                    {instance.customFlags || '--enable-anti-entropy'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-[#23252E]">
                  <span className="text-zinc-500">Environment Variables:</span>
                  <span className="text-zinc-300 text-[11px]">
                    {Object.keys(instance.envVars || {}).length} variables configured
                  </span>
                </div>
              </div>

              {/* Desktop Shortcut Action card */}
              <div className="p-3 bg-[#18191E] border border-[#23252E] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">Desktop Shortcut</span>
                    <span className="text-[10.5px] text-zinc-500 font-sans block">
                      Direct {instance.name}.lnk with official icon
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleCreateDesktopShortcut}
                  className="px-2.5 py-1 bg-[#222530] hover:bg-[#2B2E3D] text-zinc-200 hover:text-white rounded border border-[#2F3343] text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {shortcutCreated ? <Check className="w-3 h-3 text-emerald-400" /> : <ExternalLink className="w-3 h-3" />}
                  <span>{shortcutCreated ? 'Created' : 'Add to Desktop'}</span>
                </button>
              </div>

              {/* OAuth Protocol Dispatcher & Manual Callback Router */}
              <div className="p-3 bg-[#18191E] border border-[#23252E] rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${dispatcherActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-zinc-200 block">
                          Auth Callback Dispatcher
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${dispatcherActive ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-zinc-800 text-zinc-400'}`}>
                          {dispatcherActive ? 'ACTIVE' : 'DEFAULT'}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-sans block mt-0.5">
                        {dispatcherActive
                          ? 'Automated: Intercepting & delivering browser callbacks'
                          : 'Original Windows protocol handlers active'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleDispatcher}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition cursor-pointer ${
                      dispatcherActive
                        ? 'bg-amber-950/30 border-amber-800/50 text-amber-300 hover:bg-amber-900/40'
                        : 'bg-[#222530] border-[#2F3343] text-zinc-200 hover:text-white hover:bg-[#2B2E3D]'
                    }`}
                  >
                    {dispatcherActive ? 'Undo / Restore' : 'Enable Dispatcher'}
                  </button>
                </div>

                {/* Manual Fallback (Solution 1) */}
                <div className="pt-2 border-t border-[#23252E]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10.5px] text-zinc-400 font-medium">Manual Callback Delivery (Fallback)</span>
                    {routeFeedback && (
                      <span className="text-[10px] text-emerald-400 font-mono">{routeFeedback}</span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Paste antigravity:// or antigravity-ide:// callback URL..."
                      value={callbackUrl}
                      onChange={(e) => setCallbackUrl(e.target.value)}
                      className="flex-1 bg-[#121316] border border-[#262833] rounded px-2.5 py-1 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleManualRoute}
                      disabled={!callbackUrl.trim() || isRouting}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <span>Deliver</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Real Process Activity & Console Logs */}
          <div className="border border-[#22242B] rounded-xl p-5 bg-[#141519] flex flex-col h-[640px] max-h-[82vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#202229] shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Instance Activity Logs
                </h3>
                <span className="text-[10.5px] font-mono px-1.5 py-0.2 rounded bg-[#1C1E26] text-zinc-400">
                  {instanceLogs.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {instanceLogs.length > 0 && (
                  <>
                    <button
                      onClick={handleCopyAllLogs}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded bg-[#18191E] hover:bg-[#20222A] border border-[#262835]"
                      title="Copy logs to clipboard"
                    >
                      {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                      <span>{copiedLogs ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={handleClearInstanceLogs}
                      className="text-[11px] text-zinc-400 hover:text-rose-400 transition cursor-pointer flex items-center gap-1 px-2 py-0.5 rounded bg-[#18191E] hover:bg-rose-950/40 border border-[#262835] hover:border-rose-900/50"
                      title="Clear activity logs for this instance"
                    >
                      <Trash2 className="w-3 h-3 text-zinc-400 hover:text-rose-400" />
                      <span>Clear</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Logs Terminal Box */}
            <div 
              ref={logsContainerRef}
              className="flex-1 min-h-0 mt-3 bg-[#0A0B0E] border border-[#202228] rounded-lg p-3 font-mono text-[11px] overflow-y-auto space-y-1.5 select-text"
            >
              {instanceLogs.length > 0 ? (
                instanceLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-[#121317] p-1 rounded">
                    <span className="text-[#555966] select-none shrink-0">[{log.timestamp}]</span>
                    <span
                      className={`uppercase text-[9.5px] font-semibold px-1 py-0.2 rounded shrink-0 ${
                        log.level === 'error'
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                          : log.level === 'exec'
                          ? 'bg-blue-950/60 text-blue-400 border border-blue-800/40'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-[#7D818C] shrink-0">[{log.source}]</span>
                    <span className="text-zinc-300 break-all">{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                  <Terminal className="w-8 h-8 text-zinc-700 stroke-[1.5]" />
                  <p className="text-xs">No activity logged for this instance yet.</p>
                  <p className="text-[11px] text-zinc-600 font-sans max-w-xs">
                    Click <strong>Open {instance.appType === 'antigravity' ? 'Antigravity' : 'IDE'}</strong> or <strong>Start Session</strong> to launch and inspect process telemetry.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* 3. Conversation History & Memory View */}
      {activeTab === 'memory' && (
        <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-[#0E0F12]">
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Top Banner: Category Shared Brain Synchronization */}
          <div
            className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${
              sharedBrainStatus?.is_shared
                ? 'bg-gradient-to-r from-emerald-950/30 via-[#14181F] to-[#121316] border-emerald-800/40'
                : 'bg-[#141519] border-[#22242B]'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  sharedBrainStatus?.is_shared
                    ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-[#1B1D24] text-blue-400 border border-[#2B2E3C]'
                }`}
              >
                {sharedBrainStatus?.is_shared ? (
                  <Sparkles className="w-5 h-5" />
                ) : (
                  <Brain className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {instance.syncMode === 'solo'
                      ? `Solo System Orbit: "${instance.tag || 'Projects'}"`
                      : sharedBrainStatus?.is_shared
                      ? `Solar System Shared Brain: "${sharedBrainStatus.group_name}"`
                      : `Solar System Orbit: "${instance.tag || 'Projects'}"`}
                  </h3>
                  <span
                    className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${
                      instance.syncMode === 'solo'
                        ? 'bg-blue-950/60 text-blue-300 border border-blue-700/50'
                        : sharedBrainStatus?.is_shared
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {instance.syncMode === 'solo'
                      ? 'Solo Orbit (Private)'
                      : sharedBrainStatus?.is_shared
                      ? 'Synchronized Live'
                      : 'Orbit Ready'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-sans max-w-2xl leading-relaxed">
                  {instance.syncMode === 'solo'
                    ? `This profile orbits as an independent Solo System. Conversations, agent thoughts, and memory remain strictly private and will never synchronize with other instances.`
                    : sharedBrainStatus?.is_shared
                    ? `Synchronized live with ${sharedBrainStatus.member_count} profile(s) in this solar system (${sharedBrainStatus.members.join(
                        ', '
                      )}). Every prompt, task, and transcript is shared seamlessly across all instances in "${sharedBrainStatus.group_name}" via zero-overhead NTFS Directory Junctions.`
                    : `This profile has initialized the "${instance.tag || 'Projects'}" Solar System orbit. Its memory is ready to sync live as soon as other profiles gravitate into this category.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSyncInstanceBrain}
                disabled={syncingBrain}
                className="px-3 py-1.5 bg-[#1B1D24] hover:bg-[#252834] text-zinc-200 border border-[#2C303E] rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Resynchronize conversation memory with atomic forward upgrade and anti-rollback rules"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingBrain ? 'animate-spin text-emerald-400' : 'text-zinc-400'}`} />
                <span>{syncingBrain ? 'Syncing...' : 'Sync Conversations & Brain'}</span>
              </button>
            </div>
          </div>

          {syncFeedback && (
            <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl flex items-center gap-2.5 text-purple-200 text-xs font-sans">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="font-medium">{syncFeedback}</span>
            </div>
          )}

          {/* Action & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141519] border border-[#22242B] p-3 rounded-xl">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversation title or prompt preview..."
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                className="w-full bg-[#0E0F12] border border-[#23252E] rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-sans"
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={fetchConversations}
                disabled={loadingConversations}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#1E2028] border border-[#262833] rounded-lg transition cursor-pointer"
                title="Refresh conversation list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingConversations ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-1.5 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Import Conversations</span>
              </button>
            </div>
          </div>

          {/* Conversations Grid */}
          <div>
            {loadingConversations ? (
              <div className="p-12 text-center text-zinc-500 border border-[#22242B] rounded-xl bg-[#141519] space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                <p className="text-xs">Scanning profile transcripts and database summaries...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-10 text-center border border-[#22242B] rounded-xl bg-[#141519] space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#1B1D24] border border-[#262835] flex items-center justify-center mx-auto text-zinc-500">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-zinc-200">
                    {conversationSearch ? 'No matching conversations' : 'No conversations in this profile yet'}
                  </h4>
                  <p className="text-[11.5px] text-zinc-500 font-sans max-w-sm mx-auto">
                    {conversationSearch
                      ? `No conversations matched "${conversationSearch}". Try clearing your search.`
                      : 'Conversations started in Antigravity will appear here automatically. You can also import existing conversations from Main Antigravity or other profiles.'}
                  </p>
                </div>
                {!conversationSearch && (
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3 py-1.5 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded-lg text-xs font-medium transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    <span>Import from Main Antigravity</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredConversations.map((conv) => {
                  const isMenuOpen = transferDropdownConvId === conv.id;
                  const feedback = transferFeedback[conv.id];
                  const otherInstances = (instances || []).filter((i) => i.id !== instance.id);

                  return (
                    <div
                      key={conv.id}
                      className="p-4 bg-[#141519] border border-[#22242B] hover:border-[#2D303D] rounded-xl transition flex flex-col justify-between space-y-3 shadow-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-zinc-100 line-clamp-1 flex-1">
                            {conv.title || 'Untitled Conversation'}
                          </h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C1E26] text-blue-400 border border-[#272A36] shrink-0">
                            {conv.step_count} steps
                          </span>
                        </div>

                        <p className="text-[11.5px] text-zinc-400 font-sans line-clamp-2 leading-relaxed">
                          {conv.preview || 'No transcript preview available.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#1F2128] flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10.5px] font-mono text-zinc-500 truncate">
                            {conv.last_modified
                              ? new Date(conv.last_modified).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Recent'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Delete Conversation Button & Confirmation */}
                          {confirmDeleteConvId === conv.id ? (
                            <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded-lg text-xs shadow-sm">
                              <span className="text-[10px] text-rose-300 font-medium">Delete?</span>
                              <button
                                onClick={() => handleDeleteConversation(conv.id, false)}
                                disabled={deletingConvId === conv.id}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer disabled:opacity-50"
                                title="Delete from this profile instance"
                              >
                                {deletingConvId === conv.id ? '...' : 'Yes'}
                              </button>
                              {sharedBrainStatus?.is_shared && (
                                <button
                                  onClick={() => handleDeleteConversation(conv.id, true)}
                                  disabled={deletingConvId === conv.id}
                                  className="px-1.5 py-0.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-[10px] font-bold cursor-pointer disabled:opacity-50"
                                  title="Delete from this instance AND purge from the shared Star Brain"
                                >
                                  + Brain
                                </button>
                              )}
                              <button
                                onClick={() => setConfirmDeleteConvId(null)}
                                className="text-zinc-400 hover:text-zinc-200 text-[10px] cursor-pointer ml-0.5"
                                title="Cancel deletion"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteConvId(conv.id)}
                              className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded border border-transparent hover:border-rose-900/50 transition cursor-pointer"
                              title="Delete conversation from this instance before sync"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <div className="relative transfer-dropdown-container">
                            {feedback ? (
                              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                {feedback}
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  setTransferDropdownConvId(isMenuOpen ? null : conv.id)
                                }
                                className="px-2.5 py-1 bg-[#191B22] hover:bg-[#222530] text-zinc-300 hover:text-white rounded border border-[#272B38] text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5"
                              >
                                <Send className="w-3 h-3 text-blue-400" />
                                <span>Transfer / Clone to...</span>
                              </button>
                            )}

                          {/* Dropdown Menu of Destination Targets */}
                          {isMenuOpen && (
                            <div className="absolute right-0 bottom-full mb-1.5 w-60 bg-[#16171C] border border-[#282B36] rounded-lg shadow-2xl py-1 z-30 text-xs">
                              <div className="px-3 py-1.5 text-[10px] font-mono text-zinc-500 uppercase tracking-wider border-b border-[#21232C] flex items-center justify-between">
                                <span>Transfer To Destination:</span>
                                <span className="text-[9px] text-zinc-500 font-sans">Both must be stopped</span>
                              </div>

                              {/* Option 1: The Black Hole (Parent App) if not already tethered */}
                              {!(instance.blackholeSync || instance.syncMode === 'black_hole') && (() => {
                                const bhTarget = {
                                  id: 'blackhole',
                                  name: 'The Black Hole (Parent App)',
                                  tag: 'Parent App (%USERPROFILE%\\.gemini)',
                                };
                                const bhReason = getTransferBlockReason(bhTarget);
                                const isBhBlocked = !!bhReason;

                                return (
                                  <button
                                    key="blackhole-target"
                                    type="button"
                                    onClick={() => {
                                      if (isBhBlocked) {
                                        setTransferDropdownConvId(null);
                                        setTransferErrorModal({
                                          isOpen: true,
                                          targetName: bhTarget.name,
                                          conversationTitle: conv.title,
                                          errorMessage: `Cannot transfer conversation to The Black Hole: ${bhReason}. Both source and destination parties (including any tethered instances or connected brain peers) must be stopped before transferring.`,
                                        });
                                        return;
                                      }
                                      handleTransferConversation(conv.id, bhTarget, conv.title);
                                    }}
                                    className={`w-full text-left px-3 py-2 flex items-center justify-between transition cursor-pointer border-b border-[#21232C] ${
                                      isBhBlocked
                                        ? 'hover:bg-rose-950/30 text-zinc-400'
                                        : 'hover:bg-purple-950/40 text-purple-200 hover:text-white'
                                    }`}
                                    title={
                                      isBhBlocked
                                        ? `Cannot transfer: ${bhReason}. Both parties must be stopped first.`
                                        : 'Transfer conversation directly to your genuine Parent Antigravity application (%USERPROFILE%\\.gemini)'
                                    }
                                  >
                                    <div className="truncate pr-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs">🕳️</span>
                                        <span className="font-semibold text-purple-300 truncate">The Black Hole (Parent App)</span>
                                        {isBhBlocked && (
                                          <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950/70 border border-rose-800 text-rose-300 font-mono">
                                            {bhReason}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-zinc-500 block truncate font-sans">
                                        Parent Root • %USERPROFILE%\.gemini
                                      </span>
                                    </div>
                                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isBhBlocked ? 'text-rose-500/70' : 'text-purple-400'}`} />
                                  </button>
                                );
                              })()}

                              {/* Option 2: Other Instances */}
                              {otherInstances.length > 0 ? (
                                otherInstances.map((tgt) => {
                                  const blockReason = getTransferBlockReason(tgt);
                                  const isBlocked = !!blockReason;

                                  return (
                                    <button
                                      key={tgt.id}
                                      type="button"
                                      onClick={() => {
                                        if (isBlocked) {
                                          setTransferDropdownConvId(null);
                                          setTransferErrorModal({
                                            isOpen: true,
                                            targetName: tgt.name,
                                            conversationTitle: conv.title,
                                            errorMessage: `Cannot transfer conversation to '${tgt.name}': ${blockReason}. Both source and destination parties (including any tethered instances or connected brain peers) must be stopped before transferring.`,
                                          });
                                          return;
                                        }
                                        handleTransferConversation(conv.id, tgt, conv.title);
                                      }}
                                      className={`w-full text-left px-3 py-2 flex items-center justify-between transition cursor-pointer ${
                                        isBlocked
                                          ? 'hover:bg-rose-950/30 text-zinc-400'
                                          : 'hover:bg-[#1E2028] text-zinc-200 hover:text-white'
                                      }`}
                                      title={
                                        isBlocked
                                          ? `Cannot transfer: ${blockReason}. Both parties must be stopped first.`
                                          : `Transfer conversation to ${tgt.name} and auto-sync destination brain`
                                      }
                                    >
                                      <div className="truncate pr-2">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-medium truncate">{tgt.name}</span>
                                          {isBlocked && (
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950/70 border border-rose-800 text-rose-300 font-mono">
                                              {blockReason}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-zinc-500 block truncate font-sans">
                                          {tgt.tag || 'Projects'}
                                        </span>
                                      </div>
                                      <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isBlocked ? 'text-rose-500/70' : 'text-zinc-500'}`} />
                                    </button>
                                  );
                                })
                              ) : (
                                (instance.blackholeSync || instance.syncMode === 'black_hole') && (
                                  <div className="px-3 py-2 text-[11px] text-zinc-500">
                                    No other instances available.
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* Import Conversations Modal */}
      <ImportConversationsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        targetInstance={instance}
        instances={instances}
        onImportComplete={(count) => {
          fetchConversations();
          onAddLog({
            instanceId: instance.id,
            level: 'info',
            source: 'system',
            message: `Imported ${count} conversation(s) into this profile.`,
          });
        }}
      />

      {/* Transfer Error Popup Modal */}
      <TransferErrorModal
        isOpen={transferErrorModal.isOpen}
        onClose={() => setTransferErrorModal((prev) => ({ ...prev, isOpen: false }))}
        targetName={transferErrorModal.targetName}
        conversationTitle={transferErrorModal.conversationTitle}
        errorMessage={transferErrorModal.errorMessage}
      />
    </div>
  );
}
