import { useState, useEffect } from 'react';
import { AntigravityInstance, AntigravityAccount, DisplayMode } from '../types/antigravity';
import { X, Plus, Trash2, Folder, Sliders } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../api';

interface InstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (instanceData: Partial<AntigravityInstance>) => void;
  accounts: AntigravityAccount[];
  initialInstance?: AntigravityInstance | null;
}

export function InstanceModal({
  isOpen,
  onClose,
  onSave,
  accounts,
  initialInstance,
}: InstanceModalProps) {
  const isEditing = !!initialInstance;

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('Core Infrastructure');
  const [color, setColor] = useState('neutral');
  const [icon, setIcon] = useState('terminal');
  const [accountId, setAccountId] = useState('');
  const [workspacePath, setWorkspacePath] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('desktop-gui');
  const [customFlags, setCustomFlags] = useState('');
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([
    { key: 'NODE_ENV', value: 'development' },
  ]);

  // Active tab: 'general' (Workspace) | 'env' (Environment)
  const [activeTab, setActiveTab] = useState<'general' | 'env'>('general');

  useEffect(() => {
    if (initialInstance) {
      setName(initialInstance.name);
      setDescription(initialInstance.description || '');
      setTag(initialInstance.tag || 'Core Infrastructure');
      setColor(initialInstance.color || 'neutral');
      setIcon(initialInstance.icon || 'terminal');
      setAccountId(initialInstance.accountId || (accounts[0]?.id || ''));
      setWorkspacePath(initialInstance.workspacePath || '');
      setDisplayMode(initialInstance.displayMode || 'desktop-gui');
      setCustomFlags(initialInstance.customFlags || '');

      const vars = Object.entries(initialInstance.envVars || {}).map(([k, v]) => ({ key: k, value: v }));
      setEnvVars(vars.length > 0 ? vars : [{ key: 'NODE_ENV', value: 'development' }]);
    } else {
      setName('New Instance Profile');
      setDescription('Managed Antigravity profile session.');
      setTag('Projects');
      setColor('neutral');
      setIcon('terminal');
      setAccountId(accounts[0]?.id || '');
      setWorkspacePath('');
      setDisplayMode('desktop-gui');
      setCustomFlags('--enable-anti-entropy');
      setEnvVars([
        { key: 'NODE_ENV', value: 'development' },
      ]);
    }
  }, [initialInstance, accounts, isOpen]);

  if (!isOpen) return null;

  const handleBrowseWorkspace = async () => {
    if (isTauri()) {
      try {
        const selected = await invoke<string | null>('pick_folder');
        if (selected) {
          setWorkspacePath(selected);
        }
      } catch (err) {
        console.error('Failed to open native folder picker:', err);
      }
    } else {
      // In web browser dev fallback, ask via prompt
      const manual = window.prompt('Enter workspace directory path:', workspacePath || 'C:\\Projects\\MyProject');
      if (manual !== null) {
        setWorkspacePath(manual);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const envObj: Record<string, string> = {};
    envVars.forEach((ev) => {
      if (ev.key.trim()) {
        envObj[ev.key.trim()] = ev.value.trim();
      }
    });

    const cleanFolder = name.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'Instance';
    const resolvedProfileDir = `C:\\Users\\Miguel\\AntigravityProfiles\\${cleanFolder}`;

    onSave({
      name: name.trim() || 'Antigravity Session',
      description,
      tag,
      color,
      icon,
      accountId: accountId || accounts[0]?.id,
      workspacePath: workspacePath.trim() || resolvedProfileDir,
      profileDir: resolvedProfileDir,
      displayMode,
      customFlags,
      envVars: envObj,
    });
    onClose();
  };

  const iconOptions = ['terminal', 'cpu', 'code', 'database', 'zap', 'server', 'layers'];
  const profileNamePreview = name.trim().replace(/[^a-zA-Z0-9_-]/g, '') || '<name>';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#121316] border border-[#23252C] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-300">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#212328] flex items-center justify-between bg-[#15161A]">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#7D818C]" />
              {isEditing ? `Settings: ${name}` : 'New Instance Profile'}
            </h2>
            <p className="text-[11px] text-[#7D818C] mt-0.5">
              Configure profile workspace directory, bound account identity, and custom environment flags.
            </p>
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
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Instance Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Portfolio Ideas"
                    className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Category / Group</label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="e.g. Projects"
                    className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Bound Account Profile</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-xs font-mono"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.email}) — {acc.tier}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#7D818C] mt-1">
                  Associates this isolated profile with a specific Google / Antigravity login identity.
                </p>
              </div>

              {/* Workspace Directory with Browse Button & Profile Location Display */}
              <div className="pt-2 border-t border-[#212328] space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-medium">Workspace Project Directory</label>
                    <span className="text-[10px] text-[#7D818C]">Folder opened inside Antigravity</span>
                  </div>
                  
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={workspacePath}
                      onChange={(e) => setWorkspacePath(e.target.value)}
                      placeholder={`%USERPROFILE%\\AntigravityProfiles\\${profileNamePreview}`}
                      className="w-full bg-[#0F1012] border border-[#23252C] rounded-md pl-3 pr-24 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleBrowseWorkspace}
                      className="absolute right-1 px-2.5 py-1 bg-[#1F2229] hover:bg-[#282B34] text-zinc-200 hover:text-white rounded border border-[#2D303B] text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                      title="Browse folders on your computer"
                    >
                      <Folder className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Browse...</span>
                    </button>
                  </div>

                  {/* Profile storage directory explanation */}
                  <div className="mt-2 p-2.5 rounded-md bg-[#0F1012] border border-[#212328] space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                      <span className="text-[#7D818C]">Isolated Profile Location:</span>
                      <span className="text-zinc-200 font-medium">%USERPROFILE%\AntigravityProfiles\{profileNamePreview}</span>
                    </div>
                    <p className="text-[10.5px] text-[#6B7280]">
                      This dedicated directory isolates your auth credentials, extensions (via NTFS Junction), and settings from other instances.
                    </p>
                  </div>
                </div>
              </div>

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

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Shortcut Icon</label>
                <div className="flex items-center gap-1.5">
                  {iconOptions.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`px-2 py-1 rounded border text-[11px] font-mono capitalize transition cursor-pointer ${
                        icon === ic
                          ? 'bg-[#1C1D23] border-zinc-400 text-zinc-100'
                          : 'bg-[#0F1012] border-[#23252C] text-[#7D818C] hover:text-zinc-200'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
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

          {/* Modal Footer */}
          <div className="pt-3 border-t border-[#212328] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[#17181D] hover:bg-[#202128] text-zinc-300 rounded text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-1.5 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded text-xs font-medium transition cursor-pointer"
            >
              {isEditing ? 'Save Settings' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
