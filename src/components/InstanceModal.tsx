import { useState, useEffect, useRef } from 'react';
import { AntigravityInstance, AntigravityAccount, DisplayMode, AntigravityAppType, GravitationalSyncMode, InstanceTier, AvailableGroup } from '../types/antigravity';
import { X, Plus, Trash2, Folder, Code, Terminal, Check, AlertTriangle, Monitor, ChevronDown, Brain, Sparkles, Zap, MessageSquare, Lock, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../api';

interface InstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    instanceData: Partial<AntigravityInstance>,
    initialImport?: { source: 'global' | string; appType: AntigravityAppType }
  ) => void | Promise<void>;
  onDelete?: (id: string) => void;
  accounts: AntigravityAccount[];
  initialInstance?: AntigravityInstance | null;
  instances?: AntigravityInstance[];
}

export function InstanceModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  accounts,
  initialInstance,
  instances,
}: InstanceModalProps) {
  const isEditing = !!initialInstance;

  const STORAGE_PREFERRED_BASE = 'orbitgravity_preferred_profiles_base';

  const getPreferredBaseProfilesDir = (): string => {
    try {
      const saved = localStorage.getItem(STORAGE_PREFERRED_BASE);
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return '%USERPROFILE%\\AntigravityProfiles';
  };

  const setPreferredBaseProfilesDir = (dir: string) => {
    try {
      if (dir && dir.trim()) {
        localStorage.setItem(STORAGE_PREFERRED_BASE, dir.trim());
      }
    } catch {}
  };

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('Projects');
  const [color, setColor] = useState('neutral');
  const [icon, setIcon] = useState('terminal');
  const [tier, setTier] = useState<InstanceTier>('Pro');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [appType, setAppType] = useState<AntigravityAppType>('antigravity');
  const [workspacePath, setWorkspacePath] = useState('');
  const [baseDir, setBaseDir] = useState<string>(() => getPreferredBaseProfilesDir());
  const [isPathManuallyEdited, setIsPathManuallyEdited] = useState(false);
  const [createShortcut, setCreateShortcut] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('desktop-gui');
  const [customFlags, setCustomFlags] = useState('');
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([
    { key: 'NODE_ENV', value: 'development' },
  ]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isUserTypingCategory, setIsUserTypingCategory] = useState(false);
  const [backendGroups, setBackendGroups] = useState<AvailableGroup[]>([]);
  const categoryContainerRef = useRef<HTMLDivElement>(null);

  const refreshAvailableGroups = async () => {
    if (isTauri()) {
      try {
        const res = await invoke<AvailableGroup[]>('list_available_groups');
        if (res && res.length > 0) {
          setBackendGroups(res);
        }
      } catch (err) {
        console.warn('Failed to load available groups from backend:', err);
      }
    }
  };

  // Active tab: 'general' (Workspace) | 'env' (Environment) | 'memory' (Conversation Memory)
  const [activeTab, setActiveTab] = useState<'general' | 'env' | 'memory'>('general');

  // Initial Memory state
  const [memoryImportMode, setMemoryImportMode] = useState<'clean' | 'global' | 'instance'>('clean');
  const [importSourceInstanceId, setImportSourceInstanceId] = useState<string>('');
  const [syncMode, setSyncMode] = useState<GravitationalSyncMode>('solar_system');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryContainerRef.current &&
        !categoryContainerRef.current.contains(e.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tracks modal open state to avoid resetting form inputs on background re-renders
  const prevIsOpenRef = useRef(false);
  const prevInitialInstanceIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }

    const currentId = initialInstance ? initialInstance.id : null;
    const isJustOpened = !prevIsOpenRef.current;
    const isTargetChanged = prevInitialInstanceIdRef.current !== currentId;

    if (isJustOpened || isTargetChanged) {
      prevIsOpenRef.current = true;
      prevInitialInstanceIdRef.current = currentId;

      setShowConfirmDelete(false);
      setIsUserTypingCategory(false);
      refreshAvailableGroups();
      const preferredBase = getPreferredBaseProfilesDir();
      setBaseDir(preferredBase);

      if (initialInstance) {
        setName(initialInstance.name);
        setDescription(initialInstance.description || '');
        setTag(initialInstance.tag || 'Projects');
        setColor(initialInstance.color || 'neutral');
        setIcon(initialInstance.icon || 'terminal');
        setTier(initialInstance.tier || 'Pro');
        setAccountId(initialInstance.accountId || (accounts[0]?.id || ''));
        setAppType(initialInstance.appType || 'antigravity');
        setWorkspacePath(initialInstance.workspacePath || initialInstance.profileDir || '');
        setIsPathManuallyEdited(true);
        setDisplayMode(initialInstance.displayMode || 'desktop-gui');
        setCustomFlags(initialInstance.customFlags || '');
        setCreateShortcut(false); // Don't re-create automatically when editing unless chosen
        if (initialInstance.syncMode) {
          setSyncMode(initialInstance.syncMode);
        } else if (initialInstance.blackholeSync) {
          setSyncMode('black_hole');
        } else {
          setSyncMode('solar_system');
        }

        const vars = Object.entries(initialInstance.envVars || {}).map(([k, v]) => ({ key: k, value: v }));
        setEnvVars(vars.length > 0 ? vars : [{ key: 'NODE_ENV', value: 'development' }]);
      } else {
        const defaultName = 'New Instance Profile';
        const clean = defaultName.replace(/[^a-zA-Z0-9_-]/g, '') || 'Instance';
        setName(defaultName);
        setDescription('Managed Antigravity profile session.');
        setTag('Projects');
        setColor('neutral');
        setIcon('terminal');
        setTier('Pro');
        setAccountId(accounts[0]?.id || '');
        setAppType('antigravity');
        setWorkspacePath(`${preferredBase}\\${clean}`);
        setIsPathManuallyEdited(false);
        setCreateShortcut(true);
        setDisplayMode('desktop-gui');
        setCustomFlags('--enable-anti-entropy');
        setSyncMode('solar_system');
        setEnvVars([
          { key: 'NODE_ENV', value: 'development' },
        ]);
      }
      setMemoryImportMode('clean');
      const firstOther = (instances || []).find((i) => !initialInstance || i.id !== initialInstance.id);
      setImportSourceInstanceId(firstOther ? firstOther.id : '');
    }
  }, [isOpen, initialInstance]);

  if (!isOpen) return null;

  const trimmedName = name.trim();
  const isDuplicateName = !!instances?.some(
    (inst) =>
      inst.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
      (!isEditing || inst.id !== initialInstance?.id)
  );

  const cleanFolderPreview = trimmedName.replace(/[^a-zA-Z0-9_-]/g, '') || 'Instance';
  const defaultWorkspacePreview = `${baseDir}\\${cleanFolderPreview}`;

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (!isPathManuallyEdited && !initialInstance) {
      const clean = newName.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'Instance';
      setWorkspacePath(`${baseDir}\\${clean}`);
    }
  };

  const handleWorkspacePathChange = (newVal: string) => {
    setWorkspacePath(newVal);
    setIsPathManuallyEdited(true);
  };

  const handleBrowseWorkspace = async () => {
    if (isTauri()) {
      try {
        const selected = await invoke<string | null>('pick_folder');
        if (selected) {
          const clean = name.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'Instance';
          const normalized = selected.replace(/\\/g, '/');
          const lastSegment = normalized.split('/').filter(Boolean).pop() || '';

          let targetPath = selected;
          let extractedBase = selected;
          if (lastSegment.toLowerCase() === clean.toLowerCase()) {
            extractedBase = selected.substring(0, selected.lastIndexOf('\\')) || selected;
          } else {
            targetPath = `${selected}\\${clean}`;
            extractedBase = selected;
          }

          setBaseDir(extractedBase);
          setPreferredBaseProfilesDir(extractedBase);
          setWorkspacePath(targetPath);
          setIsPathManuallyEdited(true);
        }
      } catch (err) {
        console.error('Failed to open native folder picker:', err);
      }
    } else {
      const manual = window.prompt('Enter workspace profile directory path:', workspacePath || defaultWorkspacePreview);
      if (manual !== null) {
        setWorkspacePath(manual);
        setIsPathManuallyEdited(true);
      }
    }
  };

  const handleAddEnv = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveEnv = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleUpdateEnv = (index: number, key: string, value: string) => {
    const updated = [...envVars];
    updated[index] = { key, value };
    setEnvVars(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isDuplicateName || hasTagError || !trimmedName || !currentTagTrimmed) return;
    setIsSubmitting(true);

    try {
      const envObj: Record<string, string> = {};
      envVars.forEach((ev) => {
        if (ev.key.trim()) {
          envObj[ev.key.trim()] = ev.value.trim();
        }
      });

      const trimmedPath = workspacePath.trim();
      if (trimmedPath) {
        const lastSlash = trimmedPath.lastIndexOf('\\');
        if (lastSlash > 0) {
          const extracted = trimmedPath.substring(0, lastSlash);
          setPreferredBaseProfilesDir(extracted);
        }
      }

      let initialImport: { source: 'global' | string; appType: AntigravityAppType } | undefined = undefined;
      if (!isEditing && syncMode === 'solo' && memoryImportMode !== 'clean') {
        if (memoryImportMode === 'global') {
          initialImport = { source: 'global', appType: 'antigravity_ide' };
        } else if (memoryImportMode === 'instance' && importSourceInstanceId) {
          const src = (instances || []).find((i) => i.id === importSourceInstanceId);
          initialImport = {
            source: importSourceInstanceId,
            appType: src?.appType || 'antigravity_ide',
          };
        }
      }

      await onSave({
        name: name.trim() || 'Antigravity Session',
        description,
        tag: isEditing ? (initialInstance?.tag || tag) : tag,
        color,
        icon,
        tier,
        accountId: accountId || accounts[0]?.id,
        appType: isEditing ? (initialInstance?.appType || appType) : appType,
        workspacePath: isEditing ? (initialInstance?.workspacePath || initialInstance?.profileDir || trimmedPath) : trimmedPath,
        displayMode,
        customFlags,
        envVars: envObj,
        createShortcut,
        blackholeSync: isEditing ? (initialInstance?.blackholeSync ?? (syncMode === 'black_hole')) : (syncMode === 'black_hole'),
        syncMode: isEditing ? (initialInstance?.syncMode || syncMode) : syncMode,
      }, initialImport);
      onClose();
    } catch (err) {
      console.error('Failed to save instance:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (initialInstance && onDelete) {
      onDelete(initialInstance.id);
      onClose();
    }
  };

  const iconOptions = ['terminal', 'cpu', 'code', 'database', 'zap', 'server', 'layers'];

  // Identify all rogue groups (groups containing any instance with syncMode === 'solo')
  const rogueGroups = (instances || [])
    .filter((i) => (!initialInstance || i.id !== initialInstance.id) && i.syncMode === 'solo')
    .map((i) => (i.tag || '').trim().toLowerCase())
    .filter(Boolean);

  // Unified, dynamic, real-time list of available groups (combines backend disk/fleet and active React state)
  const allAvailableGroups: AvailableGroup[] = (() => {
    const map = new Map<string, { count: number; instances: string[]; hasSharedBrain: boolean }>();

    // 1. Groups from backend (fleet state + _shared_brains folder on disk), excluding rogue groups
    backendGroups.forEach((bg) => {
      if (!rogueGroups.includes(bg.name.toLowerCase())) {
        map.set(bg.name, {
          count: bg.instanceCount,
          instances: [...bg.instances],
          hasSharedBrain: bg.hasSharedBrain,
        });
      }
    });

    // 2. Groups from instances prop (React state), excluding rogue instances and black hole tethers
    (instances || []).forEach((inst) => {
      if (inst.syncMode === 'solo' || inst.syncMode === 'black_hole' || inst.blackholeSync) {
        return;
      }
      const g = inst.tag?.trim();
      if (g && g !== 'General Workspaces' && g !== 'Black Hole Singularity' && !rogueGroups.includes(g.toLowerCase())) {
        const existing = map.get(g);
        if (existing) {
          if (!existing.instances.includes(inst.name)) {
            existing.instances.push(inst.name);
          }
          existing.count = Math.max(existing.count, existing.instances.length);
        } else {
          map.set(g, {
            count: 1,
            instances: [inst.name],
            hasSharedBrain: false,
          });
        }
      }
    });

    // Ensure any rogue groups are purged
    for (const rg of rogueGroups) {
      for (const key of Array.from(map.keys())) {
        if (key.toLowerCase() === rg) {
          map.delete(key);
        }
      }
    }

    // 3. Fallback standard default if none exist and "Projects" is not a rogue group
    if (map.size === 0 && !rogueGroups.includes('projects')) {
      map.set('Projects', { count: 0, instances: [], hasSharedBrain: false });
    }

    const list: AvailableGroup[] = Array.from(map.entries()).map(([name, data]) => ({
      name,
      instanceCount: data.count,
      instances: data.instances,
      hasSharedBrain: data.hasSharedBrain,
    }));

    list.sort((a, b) => b.instanceCount - a.instanceCount || a.name.localeCompare(b.name));
    return list;
  })();

  const currentTagTrimmed = tag.trim();

  // Collision checks:
  // 1. Solo system orbits cannot join existing groups (must create a unique group name)
  const isSoloExistingGroupCollision =
    syncMode === 'solo' &&
    (allAvailableGroups.some((g) => g.name.toLowerCase() === currentTagTrimmed.toLowerCase()) ||
      (instances || []).some(
        (i) =>
          (!initialInstance || i.id !== initialInstance.id) &&
          (i.tag || '').trim().toLowerCase() === currentTagTrimmed.toLowerCase()
      ));

  // 2. Solar system orbits cannot join a group that already has a rogue planet
  const isRogueGroupCollision =
    syncMode === 'solar_system' && rogueGroups.includes(currentTagTrimmed.toLowerCase());

  const hasTagError = isSoloExistingGroupCollision || isRogueGroupCollision;

  const isExactGroupMatch = allAvailableGroups.some(
    (g) => g.name.toLowerCase() === currentTagTrimmed.toLowerCase()
  );

  // When user is typing a custom search/group, filter by query; otherwise show ALL available groups
  const displayedGroups =
    isUserTypingCategory && !isExactGroupMatch && currentTagTrimmed
      ? allAvailableGroups.filter((g) => g.name.toLowerCase().includes(currentTagTrimmed.toLowerCase()))
      : allAvailableGroups;

  const showCreateOption = currentTagTrimmed && !isExactGroupMatch;

  const handleSelectSyncMode = (newMode: GravitationalSyncMode) => {
    setSyncMode(newMode);
    if (newMode === 'solo') {
      const trimmed = tag.trim().toLowerCase();
      const isTaken =
        allAvailableGroups.some((g) => g.name.toLowerCase() === trimmed) ||
        (instances || []).some(
          (i) => (!initialInstance || i.id !== initialInstance.id) && (i.tag || '').trim().toLowerCase() === trimmed
        );
      if (isTaken || trimmed === 'projects') {
        const clean = name.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'Profile';
        setTag(`${clean} Orbit`);
      }
    } else if (newMode === 'black_hole') {
      setTag('The Black Hole Singularity');
    } else if (newMode === 'solar_system') {
      if (tag === 'Black Hole Singularity') {
        setTag(allAvailableGroups[0]?.name || 'Projects');
      }
    }
  };

  const sameFolderInstances = (instances || []).filter(
    (i) => (!initialInstance || i.id !== initialInstance.id) && i.tag?.trim().toLowerCase() === (tag || '').trim().toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#121316] border border-[#23252C] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-300">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#212328] flex items-center justify-between bg-[#16171B]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <h3 className="font-semibold text-sm text-zinc-100">
              {isEditing ? `Edit Instance: ${initialInstance.name}` : 'Create Isolated Instance Profile'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#7D818C] hover:text-zinc-200 hover:bg-[#1E2026] rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-[#212328] flex items-center gap-1 bg-[#131418]">
          {[
            { id: 'general', label: 'Workspace & Profile' },
            { id: 'env', label: 'Environment & Flags' },
            { id: 'memory', label: 'Conversation Memory' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`py-2 px-3 text-xs font-medium border-b-2 transition cursor-pointer ${
                activeTab === t.id
                  ? 'border-zinc-300 text-zinc-100 font-medium'
                  : 'border-transparent text-[#7D818C] hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {activeTab === 'general' && (
            <div className="space-y-4">
              {isEditing && (
                <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 text-blue-300 text-xs flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="leading-tight">
                    <span className="font-semibold block text-zinc-200 mb-0.5">Architecture & Topology Locked</span>
                    <span className="text-[11px] text-zinc-400 leading-relaxed block">
                      Sync mode, category orbit, profile directory, and app architecture cannot be modified after creation to preserve Star Brain filesystem integrity. You can safely edit instance name, tier, launch flags, and environment variables.
                    </span>
                  </div>
                </div>
              )}

              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-medium">Instance Name</label>
                    {isDuplicateName && (
                      <span className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        Already exists
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Portfolio Ideas"
                    className={`w-full bg-[#0F1012] border rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none font-mono text-xs ${
                      isDuplicateName
                        ? 'border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/20'
                        : 'border-[#23252C] focus:border-zinc-500'
                    }`}
                  />
                  {isDuplicateName && (
                    <p className="text-[10.5px] text-rose-400 mt-1 font-sans">
                      An instance named "{trimmedName}" already exists. Please choose a unique name.
                    </p>
                  )}
                </div>

                <div ref={categoryContainerRef} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-medium">
                      {syncMode === 'solo'
                        ? 'Solo Orbit / Group Name'
                        : syncMode === 'black_hole'
                        ? 'Black Hole Singularity'
                        : 'Category / Group'}
                    </label>
                    <span
                      className={`text-[10px] ${
                        hasTagError ? 'text-rose-400 font-semibold' : 'text-[#7D818C]'
                      }`}
                    >
                      {isEditing
                        ? 'Locked (Active Orbit)'
                        : syncMode === 'solo'
                        ? 'Must be a unique private orbit'
                        : syncMode === 'black_hole'
                        ? 'Parent Desktop installation'
                        : `${allAvailableGroups.length} available ${
                            allAvailableGroups.length === 1 ? 'orbit' : 'orbits'
                          }`}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="p-2 rounded-md bg-[#0D0E12] border border-[#23252C] flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="font-mono text-xs text-zinc-200 truncate font-semibold">
                          {tag}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/70 px-2 py-0.5 rounded border border-zinc-700 flex items-center gap-1 shrink-0">
                        <Lock className="w-3 h-3 text-zinc-400" /> Locked
                      </span>
                    </div>
                  ) : syncMode === 'black_hole' ? (
                    <div className="p-2 rounded-md bg-[#0D0E12] border border-[#23252C] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🕳️</span>
                        <span className="font-mono text-xs text-purple-300 font-semibold">
                          The Black Hole Singularity
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-400/80 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                        Parent Tethered
                      </span>
                    </div>
                  ) : (
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => {
                          setTag(e.target.value);
                          setIsUserTypingCategory(true);
                          setIsCategoryDropdownOpen(true);
                        }}
                        onFocus={() => {
                          setIsCategoryDropdownOpen(true);
                          refreshAvailableGroups();
                        }}
                        placeholder={syncMode === 'solo' ? 'e.g. Solo Pipeline' : 'e.g. Projects'}
                        className={`w-full bg-[#0F1012] border rounded-md pl-3 pr-8 py-1.5 text-zinc-200 focus:outline-none text-xs font-mono ${
                          hasTagError
                            ? 'border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/20'
                            : 'border-[#23252C] focus:border-zinc-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = !isCategoryDropdownOpen;
                          setIsCategoryDropdownOpen(next);
                          if (next) {
                            setIsUserTypingCategory(false);
                            refreshAvailableGroups();
                          }
                        }}
                        className="absolute right-1.5 p-1 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                        title="Select or browse categories"
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isCategoryDropdownOpen ? 'rotate-180 text-blue-400' : ''
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Inline Collision / Validation Alerts */}
                  {isSoloExistingGroupCollision && (
                    <p className="text-[10.5px] text-rose-400 mt-1 font-sans flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      Solo system orbits cannot join existing groups ("{currentTagTrimmed}"). Please enter a unique group name for this private orbit.
                    </p>
                  )}
                  {isRogueGroupCollision && (
                    <p className="text-[10.5px] text-rose-400 mt-1 font-sans flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      Group "{currentTagTrimmed}" belongs to an isolated Solo System (Rogue Planet) and cannot be joined.
                    </p>
                  )}

                  {/* Dropdown Options List */}
                  {isCategoryDropdownOpen && syncMode !== 'black_hole' && (
                    <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-[#15171D] border border-[#282B37] rounded-lg shadow-2xl z-50 py-1 text-xs divide-y divide-[#1F222B]">
                      {syncMode === 'solo' ? (
                        <div className="p-2.5 bg-blue-950/30 border-b border-[#202534] text-[11px] text-blue-300 flex items-start gap-2">
                          <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <span className="font-semibold block text-zinc-200 mb-0.5">Private Solo Orbit</span>
                            <span>Solo system orbits cannot join existing groups. You must create a unique group name.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 flex items-center justify-between text-[10.5px] font-semibold text-zinc-400 bg-[#121318]">
                          <span className="flex items-center gap-1.5 uppercase tracking-wider text-zinc-400">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            Available Groups & Orbits ({allAvailableGroups.length})
                          </span>
                          {isUserTypingCategory && (
                            <button
                              type="button"
                              onClick={() => setIsUserTypingCategory(false)}
                              className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                            >
                              Show all
                            </button>
                          )}
                        </div>
                      )}

                      {/* Create New Group Option if user typed a non-existing name */}
                      {showCreateOption && !isSoloExistingGroupCollision && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCategoryDropdownOpen(false);
                            setIsUserTypingCategory(false);
                          }}
                          className="w-full text-left px-3 py-2 bg-emerald-950/25 hover:bg-emerald-950/40 text-emerald-300 transition cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <div className="truncate">
                              <span className="text-zinc-300">
                                {syncMode === 'solo' ? 'Create unique solo group: ' : 'Create new group: '}
                              </span>
                              <strong className="text-emerald-300 font-mono">"{currentTagTrimmed}"</strong>
                              <span className="block text-[10px] text-zinc-500">
                                {syncMode === 'solo' ? 'Initializes private isolated Solo System' : 'Initializes a new Solar System'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 font-mono">
                            {syncMode === 'solo' ? 'Solo Orbit' : 'New Orbit'}
                          </span>
                        </button>
                      )}

                      {/* List of existing groups */}
                      <div className="max-h-44 overflow-y-auto">
                        {syncMode === 'solo' ? (
                          allAvailableGroups.map((group) => (
                            <div
                              key={group.name}
                              className="w-full text-left px-3 py-2 flex items-center justify-between opacity-50 bg-[#111216] select-none"
                            >
                              <div className="flex items-center gap-2 truncate text-zinc-400 text-xs">
                                <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                <span className="truncate">{group.name}</span>
                                <span className="text-[10px] text-zinc-500">({group.instanceCount} planets)</span>
                              </div>
                              <span className="text-[9.5px] text-zinc-600 font-mono">Cannot join in Solo</span>
                            </div>
                          ))
                        ) : displayedGroups.length > 0 ? (
                          displayedGroups.map((group) => {
                            const isSelected = tag.trim().toLowerCase() === group.name.toLowerCase();
                            return (
                              <button
                                key={group.name}
                                type="button"
                                onClick={() => {
                                  setTag(group.name);
                                  if (group.name.toLowerCase().includes('black hole')) {
                                    setSyncMode('black_hole');
                                  }
                                  setIsUserTypingCategory(false);
                                  setIsCategoryDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 flex items-center justify-between transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#1E2333] text-blue-300 font-medium'
                                    : 'text-zinc-300 hover:bg-[#1C1E26] hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`p-1.5 rounded shrink-0 ${
                                      isSelected
                                        ? 'bg-blue-900/40 text-blue-400'
                                        : 'bg-[#101115] text-zinc-400'
                                    }`}
                                  >
                                    <Folder className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate font-medium text-xs text-zinc-200">
                                        {group.name}
                                      </span>
                                      {group.hasSharedBrain && (
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 font-mono">
                                          Star Brain
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10.5px] text-zinc-500 block truncate">
                                      {group.instanceCount === 0
                                        ? '0 instances • Ready to orbit'
                                        : group.instanceCount === 1
                                        ? `1 instance (${group.instances[0] || 'profile'})`
                                        : `${group.instanceCount} instances in sync`}
                                    </span>
                                  </div>
                                </div>
                                {isSelected ? (
                                  <div className="flex items-center gap-1 text-blue-400 shrink-0 text-[10.5px] font-mono">
                                    <span>Joined</span>
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono shrink-0">
                                    Join →
                                  </span>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-zinc-400 text-[11px] italic">
                            No groups match "{currentTagTrimmed}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quick pills or Solo Mode Helper */}
                  {syncMode === 'solo' ? (
                    <div className="mt-2 p-1.5 rounded bg-[#101216] border border-[#20222A] text-[10.5px] text-zinc-400 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-blue-400 shrink-0" />
                      <span>Solo System Orbit: Creates an isolated sandbox that will never join or synchronize with other profiles.</span>
                    </div>
                  ) : syncMode === 'solar_system' && allAvailableGroups.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-zinc-500 font-medium">Quick Join:</span>
                      {allAvailableGroups.slice(0, 8).map((g) => {
                        const isSelected = tag.trim().toLowerCase() === g.name.toLowerCase();
                        return (
                          <button
                            key={g.name}
                            type="button"
                            onClick={() => {
                              setTag(g.name);
                              if (g.name.toLowerCase().includes('black hole')) {
                                setSyncMode('black_hole');
                              }
                              setIsUserTypingCategory(false);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`text-[10.5px] px-2 py-0.5 rounded border transition cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-blue-950/60 border-blue-500/80 text-blue-300 font-medium shadow-xs'
                                : 'bg-[#15171D] border-[#252834] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                            }`}
                          >
                            <span>{g.name}</span>
                            {g.instanceCount > 0 && (
                              <span className="text-[9px] px-1 py-0.2 rounded-full bg-zinc-800/80 text-zinc-400 font-mono">
                                {g.instanceCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* App Type Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-zinc-300 font-medium">App Type</label>
                  {isEditing && (
                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                      <Lock className="w-3 h-3 text-zinc-400" /> Locked
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <div className="p-2.5 rounded-lg bg-[#0F1012] border border-[#23252C] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {appType === 'antigravity' ? (
                        <Terminal className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Code className="w-4 h-4 text-blue-400" />
                      )}
                      <div>
                        <span className="font-semibold text-xs text-zinc-200">
                          {appType === 'antigravity' ? 'Antigravity Standalone App' : 'Antigravity IDE (VS Code variant)'}
                        </span>
                        <span className="block text-[10.5px] text-[#7D818C] font-mono">
                          {appType === 'antigravity' ? 'antigravity.exe' : 'Antigravity IDE.exe'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded flex items-center gap-1 border border-zinc-700">
                      <Lock className="w-3 h-3 text-zinc-400" /> Architecture Locked
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAppType('antigravity')}
                      className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col gap-1 ${
                        appType === 'antigravity'
                          ? 'bg-[#1C202C] border-emerald-500 text-white shadow-xs'
                          : 'bg-[#141519] border-[#252730] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs flex items-center gap-1.5 text-zinc-100">
                          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                          Antigravity
                        </span>
                        {appType === 'antigravity' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <span className="text-[10.5px] text-[#7D818C] font-mono leading-tight">
                        Standalone desktop app (antigravity.exe)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAppType('antigravity_ide')}
                      className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col gap-1 ${
                        appType === 'antigravity_ide'
                          ? 'bg-[#1C202C] border-blue-500 text-white shadow-xs'
                          : 'bg-[#141519] border-[#252730] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs flex items-center gap-1.5 text-zinc-100">
                          <Code className="w-3.5 h-3.5 text-blue-400" />
                          Antigravity IDE
                        </span>
                        {appType === 'antigravity_ide' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <span className="text-[10.5px] text-[#7D818C] font-mono leading-tight">
                        VS Code-based IDE variant (Antigravity IDE.exe)
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Workspace Profile Directory with Browse Button & Auto-Default Display */}
              <div className="pt-2 border-t border-[#212328] space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-medium">Workspace Profile Directory</label>
                    <span className="text-[10px] text-[#7D818C]">
                      {isEditing ? 'Profile path locked' : 'Folder opened inside Antigravity'}
                    </span>
                  </div>
                  
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      readOnly={isEditing}
                      value={workspacePath}
                      onChange={(e) => !isEditing && handleWorkspacePathChange(e.target.value)}
                      placeholder={defaultWorkspacePreview}
                      className={`w-full bg-[#0F1012] border border-[#23252C] rounded-md pl-3 pr-24 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs placeholder-[#4B4E58] ${
                        isEditing ? 'opacity-70 cursor-not-allowed bg-[#0B0C0E]' : ''
                      }`}
                    />
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={handleBrowseWorkspace}
                        className="absolute right-1 px-2.5 py-1 bg-[#1F2229] hover:bg-[#282B34] text-zinc-200 hover:text-white rounded border border-[#2D303B] text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                        title="Browse folders on your computer"
                      >
                        <Folder className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Browse...</span>
                      </button>
                    ) : (
                      <span className="absolute right-2 text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-zinc-500" /> Locked
                      </span>
                    )}
                  </div>

                  <p className="text-[10.5px] text-[#6B7280] mt-1.5 leading-relaxed">
                    Default profile base: <code className="text-zinc-400 font-mono">{baseDir}</code>. Custom folders are remembered automatically.
                  </p>

                  {/* Profile storage directory explanation */}
                  <div className="mt-2.5 p-2.5 rounded-md bg-[#0F1012] border border-[#212328] space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                      <span className="text-[#7D818C]">Isolated Profile Location:</span>
                      <span className="text-zinc-200 font-medium truncate">{workspacePath || defaultWorkspacePreview}</span>
                    </div>
                    <p className="text-[10.5px] text-[#6B7280]">
                      This isolated sandbox holds your instance's data, NTFS junction extensions, and custom state without admin rights.
                    </p>
                  </div>
                </div>
              </div>

              {/* Desktop Shortcut Checkbox Option */}
              <div className="pt-2 border-t border-[#212328]">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-200 select-none">
                  <input
                    type="checkbox"
                    checked={createShortcut}
                    onChange={(e) => setCreateShortcut(e.target.checked)}
                    className="rounded border-[#2D303B] bg-[#141519] text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                  />
                  <span>
                    Create Desktop Shortcut (<code className="text-zinc-400 font-mono">{cleanFolderPreview}.lnk</code> with Antigravity icon)
                  </span>
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task scope or service responsibility..."
                  className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-xs resize-none"
                />
              </div>

              {/* Instance Tier Selection (Free, Plus, Pro) */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">Instance Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTier('Free')}
                    className={`px-3 py-2 rounded-lg border text-xs font-mono transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      tier === 'Free'
                        ? 'bg-zinc-800/80 border-zinc-500 text-zinc-100 shadow-xs'
                        : 'bg-[#121316] border-[#23252C] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                    }`}
                  >
                    <span className="font-semibold">FREE</span>
                    <span className="text-[10px] text-zinc-500">Standard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTier('Plus')}
                    className={`px-3 py-2 rounded-lg border text-xs font-mono transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      tier === 'Plus'
                        ? 'bg-blue-950/70 border-blue-500 text-blue-200 shadow-[0_0_10px_rgba(59,130,246,0.25)]'
                        : 'bg-[#121316] border-[#23252C] text-zinc-400 hover:border-blue-600/50 hover:text-zinc-200'
                    }`}
                  >
                    <span className="font-semibold flex items-center gap-1 text-blue-300">
                      <Zap className="w-3 h-3 text-cyan-400" /> PLUS
                    </span>
                    <span className="text-[10px] text-blue-400/70">Enhanced</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTier('Pro')}
                    className={`px-3 py-2 rounded-lg border text-xs font-mono transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      tier === 'Pro'
                        ? 'bg-gradient-to-r from-zinc-200 via-white to-zinc-300 text-zinc-950 border border-white/90 shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                        : 'bg-[#121316] border-[#23252C] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    <span className="font-extrabold flex items-center gap-1">
                      PRO
                    </span>
                    <span className={`text-[10px] ${tier === 'Pro' ? 'text-zinc-800 font-semibold' : 'text-zinc-500'}`}>Platinum</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-zinc-300 font-medium">Custom Environment Variables</label>
                  <p className="text-[11px] text-[#7D818C]">Injected into the isolated Antigravity process at launch.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddEnv}
                  className="px-2.5 py-1 bg-[#1F2229] hover:bg-[#282B34] text-zinc-200 hover:text-white rounded border border-[#2D303B] flex items-center gap-1 text-[11px] font-mono cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Var
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {envVars.map((ev, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="KEY"
                      value={ev.key}
                      onChange={(e) => handleUpdateEnv(index, e.target.value, ev.value)}
                      className="w-1/3 bg-[#0F1012] border border-[#23252C] rounded px-2.5 py-1 text-zinc-200 font-mono text-xs uppercase"
                    />
                    <input
                      type="text"
                      placeholder="VALUE"
                      value={ev.value}
                      onChange={(e) => handleUpdateEnv(index, ev.key, e.target.value)}
                      className="flex-1 bg-[#0F1012] border border-[#23252C] rounded px-2.5 py-1 text-zinc-200 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEnv(index)}
                      className="text-[#6B7280] hover:text-rose-400 p-1 cursor-pointer"
                      title="Remove variable"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#212328]">
                <label className="block text-zinc-300 font-medium mb-1">Custom Launch Flags</label>
                <input
                  type="text"
                  value={customFlags}
                  onChange={(e) => setCustomFlags(e.target.value)}
                  placeholder="--disable-gpu --log=debug"
                  className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                />
                <p className="text-[10.5px] text-[#6B7280] mt-1">
                  Passed directly to the Antigravity command line. Profiles automatically include <code className="text-zinc-400">--user-data-dir</code> and <code className="text-zinc-400">--extensions-dir</code>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-4">
              {/* Dynamic Synchronization Overview Banner */}
              <div
                className={`p-3.5 rounded-xl border transition ${
                  syncMode === 'solo'
                    ? 'bg-[#14151D] border-[#222432]'
                    : syncMode === 'solar_system'
                    ? sameFolderInstances.length > 0
                      ? 'bg-emerald-950/25 border-emerald-800/40'
                      : 'bg-amber-950/20 border-amber-800/40'
                    : 'bg-[#181422] border-[#291F38]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      syncMode === 'solo'
                        ? 'bg-blue-950/40 text-blue-400 border border-blue-800/40'
                        : syncMode === 'solar_system'
                        ? sameFolderInstances.length > 0
                          ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                          : 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
                        : 'bg-purple-900/40 text-purple-400 border border-purple-700/50'
                    }`}
                  >
                    {syncMode === 'solo' ? (
                      <Lock className="w-4 h-4" />
                    ) : syncMode === 'solar_system' ? (
                      <Sparkles className="w-4 h-4" />
                    ) : (
                      <Brain className="w-4 h-4" />
                    )}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-zinc-100">
                        {syncMode === 'solo'
                          ? `🔒 Private Isolated Brain: "${tag}"`
                          : syncMode === 'solar_system'
                          ? sameFolderInstances.length > 0
                            ? `☀️ Gravitated to Solar System: "${tag}"`
                            : `☀️ Solar System Origin: "${tag}"`
                          : `🕳️ The Black Hole Tether: PARENT SYNC`}
                      </span>
                      <span
                        className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono uppercase font-semibold ${
                          syncMode === 'solo'
                            ? 'bg-[#252833] text-zinc-400 border border-[#313543]'
                            : syncMode === 'solar_system'
                            ? sameFolderInstances.length > 0
                              ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                              : 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                            : 'bg-purple-950/60 text-purple-300 border border-purple-800/50'
                        }`}
                      >
                        {syncMode === 'solo'
                          ? 'Solo Mode'
                          : syncMode === 'solar_system'
                          ? sameFolderInstances.length > 0
                            ? `In Sync (${sameFolderInstances.length + 1} Planets)`
                            : 'Orbit Initialized'
                          : 'Parent Singularity'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      {syncMode === 'solo'
                        ? `This profile orbits independently as a solo system in "${tag}". Its conversations and agent thoughts remain strictly private and will never synchronize with other profiles.`
                        : syncMode === 'solar_system'
                        ? sameFolderInstances.length > 0
                          ? `This profile has joined the "${tag}" Solar System orbit and becomes in sync! Its conversation history and agent memory are automatically synchronized in real-time via NTFS Directory Junctions with ${sameFolderInstances
                              .map((i) => i.name)
                              .join(', ')}.`
                          : `This profile has initialized the "${tag}" Solar System orbit. Its memory is ready to sync live as soon as another profile gravitates into this category.`
                        : `This profile is tethered directly to your primary Antigravity desktop installation (%USERPROFILE%\\.gemini). All conversations, skills, and memory are shared live with your main installation.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Gravitational Synchronization Mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-200 font-medium text-xs block">
                    Gravitational Synchronization Mode
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {isEditing ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" /> Mode Locked After Creation
                      </span>
                    ) : (
                      syncMode === 'solo'
                        ? 'Solo System Orbit'
                        : syncMode === 'solar_system'
                        ? 'In Sync with Solar System'
                        : 'Tethered to Parent Root'
                    )}
                  </span>
                </div>
                {isEditing && (
                  <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-800/40 text-blue-300 text-xs flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>
                      Synchronization topology is locked for this instance to prevent NTFS junction breakage and SQLite data desynchronization.
                    </span>
                  </div>
                )}
                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 ${isEditing ? 'pointer-events-none opacity-80' : ''}`}>
                  {/* Option 1: Solo System Orbit */}
                  <div
                    onClick={() => handleSelectSyncMode('solo')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      syncMode === 'solo'
                        ? 'bg-[#151824] border-blue-500/70 shadow-xs ring-1 ring-blue-500/30'
                        : 'bg-[#131418] border-[#22242D] opacity-75 hover:opacity-100 hover:border-[#2D303D]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🪐</span>
                          <span className="text-xs font-semibold text-zinc-100">
                            Solo System Orbit
                          </span>
                        </div>
                        {syncMode === 'solo' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        Orbits as a solo system in &quot;{tag}&quot;. Keeps conversations and agent memory strictly private without syncing.
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-[#1F212A] flex items-center justify-between">
                      <span className="text-[9.5px] font-mono text-zinc-500 uppercase">Privacy</span>
                      <span className="text-[10px] font-mono text-blue-400 font-medium">Private Orbit</span>
                    </div>
                  </div>

                  {/* Option 2: Gravitate to Solar System */}
                  <div
                    onClick={() => handleSelectSyncMode('solar_system')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      syncMode === 'solar_system'
                        ? 'bg-[#121E1B] border-emerald-500/70 shadow-xs ring-1 ring-emerald-500/30'
                        : 'bg-[#131418] border-[#22242D] opacity-75 hover:opacity-100 hover:border-[#2D303D]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">☀️</span>
                          <span className="text-xs font-semibold text-emerald-200">
                            Gravitate to Solar System
                          </span>
                        </div>
                        {syncMode === 'solar_system' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        {sameFolderInstances.length > 0
                          ? `Joins the "${tag}" Solar System orbit and becomes in sync with ${sameFolderInstances.length} other planet(s).`
                          : `Initializes the "${tag}" orbit. Joins the star and becomes in sync as other planets gravitate here.`}
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-[#1F212A] flex items-center justify-between">
                      <span className="text-[9.5px] font-mono text-zinc-500 uppercase">Junction Sync</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-medium">
                        {sameFolderInstances.length > 0 ? 'In Sync' : 'Ready to Sync'}
                      </span>
                    </div>
                  </div>

                  {/* Option 3: The Black Hole Tether */}
                  <div
                    onClick={() => handleSelectSyncMode('black_hole')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      syncMode === 'black_hole'
                        ? 'bg-[#1D1728] border-purple-500/70 shadow-xs ring-1 ring-purple-500/30'
                        : 'bg-[#131418] border-[#22242D] opacity-75 hover:opacity-100 hover:border-[#2D303D]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🕳️</span>
                          <span className="text-xs font-semibold text-purple-200">
                            The Black Hole Tether
                          </span>
                        </div>
                        {syncMode === 'black_hole' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        Synchronizes live with your genuine parent Antigravity installation (%USERPROFILE%\.gemini).
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-[#1F212A] flex items-center justify-between">
                      <span className="text-[9.5px] font-mono text-zinc-500 uppercase">Parent Sync</span>
                      <span className="text-[10px] font-mono text-purple-400 font-medium">Root Brain</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Initial Conversation History Setup (on creation) */}
              {!isEditing && (
                syncMode === 'solo' ? (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-zinc-200 font-medium text-xs block">
                          Initial Conversation History
                        </label>
                        <span className="text-[10px] font-mono text-blue-400 bg-blue-950/40 border border-blue-800/40 px-2 py-0.5 rounded">
                          Solo Orbit: Selection Required
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7D818C] mt-0.5">
                        Because this profile orbits as an isolated solo system, choose whether to start with a blank brain or pre-populate memory from existing conversations.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {/* Option 1: Clean Slate */}
                      <label
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          memoryImportMode === 'clean'
                            ? 'bg-[#181A22] border-blue-500/60 text-zinc-100'
                            : 'bg-[#121316] border-[#23252E] text-zinc-400 hover:bg-[#15171C]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="memoryImport"
                          checked={memoryImportMode === 'clean'}
                          onChange={() => setMemoryImportMode('clean')}
                          className="mt-0.5 text-blue-500 bg-[#121316] border-[#2D303B] focus:ring-0 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-medium text-zinc-200 block">
                            Clean Slate (Default)
                          </span>
                          <span className="text-[11px] text-zinc-400 block font-sans">
                            Start with zero prior conversations. Ideal for fresh project tasks and isolated client work.
                          </span>
                        </div>
                      </label>

                      {/* Option 2: Global Main Antigravity */}
                      <label
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          memoryImportMode === 'global'
                            ? 'bg-[#181A22] border-blue-500/60 text-zinc-100'
                            : 'bg-[#121316] border-[#23252E] text-zinc-400 hover:bg-[#15171C]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="memoryImport"
                          checked={memoryImportMode === 'global'}
                          onChange={() => setMemoryImportMode('global')}
                          className="mt-0.5 text-blue-500 bg-[#121316] border-[#2D303B] focus:ring-0 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-medium text-zinc-200 block">
                            Import from Main Antigravity
                          </span>
                          <span className="text-[11px] text-zinc-400 block font-sans">
                            Clone conversations, agent reasoning, and task history from your default Antigravity installation into this profile.
                          </span>
                        </div>
                      </label>

                      {/* Option 3: Another Instance Profile */}
                      <label
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          memoryImportMode === 'instance'
                            ? 'bg-[#181A22] border-blue-500/60 text-zinc-100'
                            : 'bg-[#121316] border-[#23252E] text-zinc-400 hover:bg-[#15171C]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="memoryImport"
                          checked={memoryImportMode === 'instance'}
                          onChange={() => setMemoryImportMode('instance')}
                          className="mt-0.5 text-blue-500 bg-[#121316] border-[#2D303B] focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1 space-y-2">
                          <div>
                            <span className="text-xs font-medium text-zinc-200 block">
                              Import from Another Profile
                            </span>
                            <span className="text-[11px] text-zinc-400 block font-sans">
                              Copy conversation threads and transcript logs from an existing instance.
                            </span>
                          </div>

                          {memoryImportMode === 'instance' && (
                            <div className="pt-1">
                              {instances && instances.length > 0 ? (
                                <select
                                  value={importSourceInstanceId}
                                  onChange={(e) => setImportSourceInstanceId(e.target.value)}
                                  className="w-full bg-[#0F1012] border border-[#2D303B] rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
                                >
                                  {instances.map((inst) => (
                                    <option key={inst.id} value={inst.id}>
                                      {inst.name} ({inst.tag || 'Projects'}) - {inst.appType === 'antigravity' ? 'App' : 'IDE'}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-[11px] text-zinc-500">
                                  No other instance profiles exist yet.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                ) : (
                  /* Collapsed state when Gravitating to Solar System or Tethering to Black Hole */
                  <div className="p-3.5 bg-[#121418] border border-[#21242E] rounded-xl flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#181A22] border border-[#272B38] text-zinc-300 shrink-0 mt-0.5">
                      {syncMode === 'solar_system' ? '☀️' : '🕳️'}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-200">
                          {syncMode === 'solar_system'
                            ? 'Conversation History: Auto-Synced with Solar System'
                            : 'Conversation History: Auto-Synced with Black Hole Singularity'}
                        </span>
                        <span className={`text-[9.5px] font-mono uppercase px-2 py-0.5 rounded font-medium border ${
                          syncMode === 'solar_system'
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40'
                            : 'bg-purple-950/50 text-purple-300 border-purple-800/40'
                        }`}>
                          Auto-Synchronized
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        {syncMode === 'solar_system'
                          ? `Gravitating to the "${tag}" Solar System automatically joins its live shared brain. You don't need to select an initial history because all conversations, prompts, and transcripts synchronize automatically with everyone in this orbit!`
                          : `Tethering to the Black Hole automatically connects live to your genuine Antigravity parent installation (%USERPROFILE%\\.gemini). All existing conversations and reasoning are already linked in real time!`}
                      </p>
                    </div>
                  </div>
                )
              )}

              {isEditing && (
                <div className="p-3 bg-[#18191E] border border-[#23252E] rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-zinc-200">
                      Existing Profile Memory
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                    This instance is already initialized. To import new conversations, preview current chat threads, or transfer conversations to other profiles, switch to the <strong>Conversation History & Memory</strong> tab in the workspace view.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 border-t border-[#212328] flex items-center justify-between">
            <div>
              {isEditing && onDelete && (
                showConfirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Delete profile?
                    </span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium cursor-pointer transition"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-2 py-1 bg-[#1F2229] hover:bg-[#282B34] text-zinc-300 rounded text-xs cursor-pointer transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded text-xs font-medium transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Instance</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-[#17181D] hover:bg-[#202128] text-zinc-300 rounded text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isDuplicateName || hasTagError || !trimmedName || !currentTagTrimmed}
                className="px-4 py-1.5 bg-[#1A56DB] hover:bg-[#1E62F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isSubmitting
                    ? isEditing
                      ? 'Saving...'
                      : 'Creating...'
                    : isEditing
                    ? 'Save Settings'
                    : 'Create Profile'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
