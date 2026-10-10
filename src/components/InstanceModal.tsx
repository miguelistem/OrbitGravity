import { useState, useEffect } from 'react';
import { AntigravityInstance, AntigravityAccount, DisplayMode, AgentAutonomy } from '../types/antigravity';
import { X, Plus, Trash2, Folder, Shield, Cpu, Clock, Terminal, Globe, Sliders } from 'lucide-react';

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
  const [gitBranch, setGitBranch] = useState('main');
  const [model, setModel] = useState('Gemini 3.8 Flash High');
  const [port, setPort] = useState(3042);
  const [debugPort, setDebugPort] = useState(9229);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('desktop-gui');
  const [agentAutonomy, setAgentAutonomy] = useState<AgentAutonomy>('semi-autonomous');
  const [ramAllocationMb, setRamAllocationMb] = useState(8192);
  const [cpuCores, setCpuCores] = useState(4);
  const [ttlMinutes, setTtlMinutes] = useState(120);
  const [autoSleepIdleMinutes, setAutoSleepIdleMinutes] = useState(15);
  const [customFlags, setCustomFlags] = useState('');
  const [shortcutHotkey, setShortcutHotkey] = useState('Ctrl+Alt+1');
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([
    { key: 'ENV', value: 'development' },
  ]);

  // Active tab in settings modal
  const [activeTab, setActiveTab] = useState<'general' | 'runtime' | 'limits' | 'env'>('general');

  useEffect(() => {
    if (initialInstance) {
      setName(initialInstance.name);
      setDescription(initialInstance.description || '');
      setTag(initialInstance.tag || 'Core Infrastructure');
      setColor(initialInstance.color || 'neutral');
      setIcon(initialInstance.icon || 'terminal');
      setAccountId(initialInstance.accountId || (accounts[0]?.id || ''));
      setWorkspacePath(initialInstance.workspacePath || '');
      setGitBranch(initialInstance.gitBranch || 'main');
      setModel(initialInstance.model || 'Gemini 3.8 Flash High');
      setPort(initialInstance.port || 3042);
      setDebugPort(initialInstance.debugPort || 9229);
      setDisplayMode(initialInstance.displayMode || 'desktop-gui');
      setAgentAutonomy(initialInstance.agentAutonomy || 'semi-autonomous');
      setRamAllocationMb(initialInstance.ramAllocationMb || 8192);
      setCpuCores(initialInstance.cpuCores || 4);
      setTtlMinutes(initialInstance.ttlMinutes ?? 120);
      setAutoSleepIdleMinutes(initialInstance.autoSleepIdleMinutes ?? 15);
      setCustomFlags(initialInstance.customFlags || '');
      setShortcutHotkey(initialInstance.shortcutHotkey || 'Ctrl+Alt+1');

      const vars = Object.entries(initialInstance.envVars || {}).map(([k, v]) => ({ key: k, value: v }));
      setEnvVars(vars.length > 0 ? vars : [{ key: 'ENV', value: 'development' }]);
    } else {
      const randPort = 3000 + Math.floor(Math.random() * 500);
      setName('New Instance Profile');
      setDescription('Configured Antigravity IDE instance session.');
      setTag('Backend Services');
      setColor('neutral');
      setIcon('terminal');
      setAccountId(accounts[0]?.id || '');
      setWorkspacePath('/workspace/services/new-service');
      setGitBranch('main');
      setModel('Gemini 3.8 Flash High');
      setPort(randPort);
      setDebugPort(randPort + 6000);
      setDisplayMode('desktop-gui');
      setAgentAutonomy('semi-autonomous');
      setRamAllocationMb(8192);
      setCpuCores(4);
      setTtlMinutes(120);
      setAutoSleepIdleMinutes(15);
      setCustomFlags('--enable-anti-entropy');
      setShortcutHotkey('Ctrl+Alt+6');
      setEnvVars([
        { key: 'PORT', value: String(randPort) },
        { key: 'NODE_ENV', value: 'development' },
      ]);
    }
  }, [initialInstance, accounts, isOpen]);

  if (!isOpen) return null;

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

    onSave({
      name: name.trim() || 'Antigravity Session',
      description,
      tag,
      color,
      icon,
      accountId: accountId || accounts[0]?.id,
      workspacePath,
      gitBranch,
      workingDirectory: workspacePath,
      model,
      port: Number(port) || 3042,
      debugPort: Number(debugPort) || 9229,
      displayMode,
      agentAutonomy,
      ramAllocationMb: Number(ramAllocationMb) || 8192,
      cpuCores: Number(cpuCores) || 4,
      ttlMinutes: Number(ttlMinutes) || 0,
      autoSleepIdleMinutes: Number(autoSleepIdleMinutes) || 0,
      customFlags,
      shortcutHotkey,
      envVars: envObj,
    });
    onClose();
  };

  const iconOptions = ['terminal', 'cpu', 'code', 'database', 'zap', 'server', 'layers'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#121316] border border-[#23252C] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-300">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#212328] flex items-center justify-between bg-[#15161A]">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#7D818C]" />
              {isEditing ? `Settings: ${name}` : 'New Instance Shortcut & Session'}
            </h2>
            <p className="text-[11px] text-[#7D818C] mt-0.5">
              Workspace path, model binding, account quota allocation, and launch flags.
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
            { id: 'general', label: 'Workspace' },
            { id: 'runtime', label: 'Model & Ports' },
            { id: 'limits', label: 'Account & Timers' },
            { id: 'env', label: 'Environment' },
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
                    placeholder="e.g. auth-service-v2"
                    className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Category / Group</label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="e.g. Core Infrastructure"
                    className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Description</label>
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

              {/* Workspace Directory & Branch */}
              <div className="pt-2 border-t border-[#212328] space-y-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Workspace Absolute Directory</label>
                  <input
                    type="text"
                    required
                    value={workspacePath}
                    onChange={(e) => setWorkspacePath(e.target.value)}
                    placeholder="/workspace/services/auth-gateway"
                    className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Git Branch</label>
                    <input
                      type="text"
                      value={gitBranch}
                      onChange={(e) => setGitBranch(e.target.value)}
                      placeholder="main"
                      className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Shortcut Hotkey</label>
                    <input
                      type="text"
                      value={shortcutHotkey}
                      onChange={(e) => setShortcutHotkey(e.target.value)}
                      placeholder="Ctrl+Alt+1"
                      className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'runtime' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Model Selection</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-xs font-mono"
                >
                  <option value="Gemini 3.8 Flash High">Gemini 3.8 Flash High</option>
                  <option value="Gemini 3.1 Pro">Gemini 3.1 Pro</option>
                  <option value="Gemini 2.5 Pro Agent">Gemini 2.5 Pro Agent</option>
                  <option value="Antigravity Deep Agent v3">Antigravity Deep Agent v3</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Agent Autonomy</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'supervised', name: 'Supervised', desc: 'Confirm tool calls' },
                    { id: 'semi-autonomous', name: 'Semi-Autonomous', desc: 'Auto-edits, prompt shell' },
                    { id: 'full-autopilot', name: 'Full Autopilot', desc: 'Continuous goal execution' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setAgentAutonomy(lvl.id as AgentAutonomy)}
                      className={`p-2.5 rounded-md border text-left transition cursor-pointer ${
                        agentAutonomy === lvl.id
                          ? 'bg-[#1C1D23] border-zinc-400 text-zinc-100'
                          : 'bg-[#0F1012] border-[#23252C] text-[#7D818C] hover:text-zinc-200'
                      }`}
                    >
                      <div className="font-semibold text-xs">{lvl.name}</div>
                      <div className="text-[10px] text-[#6B7280] mt-0.5">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-[#212328]">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Debug Port</label>
                  <input
                    type="number"
                    value={debugPort}
                    onChange={(e) => setDebugPort(Number(e.target.value))}
                    className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'limits' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Bound Account Profile</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-xs font-mono"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — {acc.tier} ({Math.round((acc.tokensUsed / acc.monthlyTokenAllowance) * 100)}% used)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-[#212328]">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Session TTL (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={ttlMinutes}
                    onChange={(e) => setTtlMinutes(Number(e.target.value))}
                    className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                  />
                  <span className="text-[10px] text-[#6B7280] mt-0.5 block">0 = unlimited</span>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Auto-Sleep Idle (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={autoSleepIdleMinutes}
                    onChange={(e) => setAutoSleepIdleMinutes(Number(e.target.value))}
                    className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                  />
                  <span className="text-[10px] text-[#6B7280] mt-0.5 block">0 = disabled</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-[#212328]">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">RAM Limit</label>
                  <select
                    value={ramAllocationMb}
                    onChange={(e) => setRamAllocationMb(Number(e.target.value))}
                    className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                  >
                    <option value={4096}>4,096 MB (4 GB)</option>
                    <option value={8192}>8,192 MB (8 GB)</option>
                    <option value={16384}>16,384 MB (16 GB)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">CPU Cores</label>
                  <select
                    value={cpuCores}
                    onChange={(e) => setCpuCores(Number(e.target.value))}
                    className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                  >
                    <option value={2}>2 Cores</option>
                    <option value={4}>4 Cores</option>
                    <option value={8}>8 Cores</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-zinc-300 font-medium">Environment Variables</label>
                <button
                  type="button"
                  onClick={handleAddEnv}
                  className="text-zinc-300 hover:text-white flex items-center gap-1 text-[11px] font-mono cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
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
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#212328]">
                <label className="block text-zinc-300 font-medium mb-1">Launch Flags</label>
                <input
                  type="text"
                  value={customFlags}
                  onChange={(e) => setCustomFlags(e.target.value)}
                  placeholder="--enable-anti-entropy --inspect-brk=0"
                  className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono text-xs"
                />
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
              {isEditing ? 'Save Settings' : 'Create Shortcut'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
