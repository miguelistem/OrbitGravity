import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../api';
import { AntigravityInstance, AntigravityAccount, LogEntry } from '../types/antigravity';
import { formatSecondsToTime, formatCompactNumber, formatCurrency, formatTimeLeft } from '../utils/formatters';
import { 
  downloadFile, 
  generateWindowsBatch, 
  generateLinuxDesktopEntry, 
  generateBashScript, 
  generateUrlShortcut, 
  generateShellOneLiner 
} from '../utils/shortcutGenerators';
import { 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Download, 
  Clock, 
  ExternalLink, 
  Code, 
  Terminal, 
  CheckCircle2, 
  ChevronRight, 
  Send, 
  Sparkles, 
  Plus, 
  Mic, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  Check, 
  ShieldCheck, 
  Gauge, 
  CreditCard, 
  FileCode, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Cpu,
  Layers,
  Zap,
  Monitor,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface AntigravityWorkspaceProps {
  instance: AntigravityInstance;
  account?: AntigravityAccount;
  logs: LogEntry[];
  onToggleStatus: (id: string, newStatus: 'running' | 'paused' | 'stopped') => void;
  onOpenSettings: (instance: AntigravityInstance) => void;
  onAddLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  onLaunchIde?: (instance: AntigravityInstance) => void;
  onDeleteInstance?: (id: string) => void;
}

export function AntigravityWorkspace({
  instance,
  account,
  logs,
  onToggleStatus,
  onOpenSettings,
  onAddLog,
  onLaunchIde,
  onDeleteInstance,
}: AntigravityWorkspaceProps) {
  const [activeEditorTab, setActiveEditorTab] = useState<'code' | 'logs' | 'telemetry'>('code');
  const [showTelemetryBar, setShowTelemetryBar] = useState(true);
  const [promptInput, setPromptInput] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [isDiffReviewed, setIsDiffReviewed] = useState(false);
  const [shortcutCreated, setShortcutCreated] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const isRunning = instance.status === 'running';

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    const query = promptInput.trim();
    setPromptInput('');

    onAddLog({
      instanceId: instance.id,
      level: 'exec',
      source: 'user',
      message: query,
    });

    setTimeout(() => {
      onAddLog({
        instanceId: instance.id,
        level: 'agent',
        source: 'agent',
        message: `Plan synthesized for: "${query.substring(0, 45)}..."`,
        details: 'AST dependency tree verified in 14ms',
      });
    }, 350);
  };

  const handleRunTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim();
    setTerminalInput('');

    onAddLog({
      instanceId: instance.id,
      level: 'exec',
      source: 'shell',
      message: `$ ${cmd}`,
    });

    setTimeout(() => {
      onAddLog({
        instanceId: instance.id,
        level: 'info',
        source: 'runner',
        message: `[Process] Command completed (exit 0).`,
      });
    }, 250);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(`// SoftwareDesignSpecModal.tsx\n<select value={selectedSubsystemId} onChange={(e) => handleSelectSubsystem(e.target.value)} ...>`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyCli = () => {
    navigator.clipboard.writeText(generateShellOneLiner(instance));
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const handleCreateDesktopShortcut = async () => {
    if (isTauri()) {
      try {
        await invoke('create_desktop_shortcut', { id: instance.id });
        setShortcutCreated(true);
        setTimeout(() => setShortcutCreated(false), 3000);
      } catch (err) {
        console.error('Failed to create shortcut:', err);
      }
    } else {
      downloadFile(`${instance.name}.bat`, generateWindowsBatch(instance, account));
      setShortcutCreated(true);
      setTimeout(() => setShortcutCreated(false), 3000);
    }
  };

  const instanceLogs = logs.filter((l) => l.instanceId === instance.id);

  // Exact code content from Image 1
  const codeLines = [
    { line: 639, text: '              <select' },
    { line: 640, text: '                value=' },
    { line: 641, text: '                onChange={(e) =>' },
    { line: 642, text: '                  handleSelectSubsystem(e.target.va' },
    { line: 643, text: '                className={`px-2' },
    { line: 644, text: '                  py-1 text-xs rounded border font-' },
    { line: 645, text: '                  mono outline-hidden ${' },
    { line: 646, text: '                    isLight' },
    { line: 647, text: '                      ? \'bg-white' },
    { line: 648, text: '                  border-slate-300 text-slate-800\'' },
    { line: 649, text: '                      : \'bg-' },
    { line: 650, text: '                  [#1F2227] border-[#363C44] text-' },
    { line: 651, text: '                  gray-200 focus:border-[#0DA3AB]\'' },
    { line: 652, text: '                  }`}' },
    { line: 653, text: '              >' },
    { line: 654, text: '                <option' },
    { line: 655, text: '                  value="facility">🏢 Full' },
    { line: 656, text: '                  Facility Consolidated' },
    { line: 657, text: '                  View</option>' },
    { line: 658, text: '                {workspaceSpec.subsystems.map(sub' },
    { line: 659, text: '                  => (' },
    { line: 660, text: '                    <option key=' },
    { line: 661, text: '                      {sub.id} value={sub.id}>' },
    { line: 662, text: '                      {sub.name}' },
    { line: 663, text: '                      ({sub.role})' },
    { line: 664, text: '                    </option>' },
    { line: 665, text: '                  ))}' },
    { line: 666, text: '              </select>' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F1012] text-[#D8DADF]">
      {/* Top Breadcrumb & Action Header */}
      <div className="h-10 border-b border-[#212328] px-4 flex items-center justify-between bg-[#141518] shrink-0 select-none">
        {/* Left: Breadcrumbs & Live Status */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#7D818C] hover:text-zinc-300 cursor-pointer">
            {instance.tag || 'Workspace'}
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

          <div className="h-3 w-[1px] bg-[#2A2C34] mx-1" />

          {/* Clean Neutral Timer */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1B1C21] border border-[#262830] font-mono text-[11px] text-zinc-300">
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
            <Clock className="w-3 h-3 text-[#7D818C]" />
            <span>{formatSecondsToTime(instance.totalElapsedSeconds)}</span>
          </div>

        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Toggle Profile Info Strip */}
          <button
            onClick={() => setShowTelemetryBar(!showTelemetryBar)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition cursor-pointer font-mono ${
              showTelemetryBar
                ? 'bg-[#1C1D23] text-zinc-200 border-[#2C2E38]'
                : 'text-[#7D818C] hover:text-zinc-200 border-transparent hover:bg-[#1C1D23]'
            }`}
            title="Toggle Profile & Workspace Details"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#7D818C]" />
            <span>Profile Details</span>
            {showTelemetryBar ? <ChevronUp className="w-3 h-3 text-[#7D818C]" /> : <ChevronDown className="w-3 h-3 text-[#7D818C]" />}
          </button>

          {/* Power Toggle */}
          {isRunning ? (
            <button
              onClick={() => onToggleStatus(instance.id, 'paused')}
              className="p-1 text-[#8B8F9A] hover:text-amber-400 hover:bg-[#1E2026] rounded transition cursor-pointer"
              title="Pause Instance Session"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onToggleStatus(instance.id, 'running')}
              className="p-1 text-[#8B8F9A] hover:text-emerald-400 hover:bg-[#1E2026] rounded transition cursor-pointer"
              title="Resume Instance Session"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Create Desktop Shortcut button */}
          <button
            onClick={handleCreateDesktopShortcut}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-200 hover:text-white bg-[#191B22] hover:bg-[#222530] rounded border border-[#2A2E3D] transition cursor-pointer font-mono shadow-2xs"
            title="Create Windows Desktop .lnk shortcut with Antigravity icon"
          >
            {shortcutCreated ? <Check className="w-3 h-3 text-emerald-400" /> : <Monitor className="w-3 h-3 text-blue-400" />}
            <span>{shortcutCreated ? 'Shortcut Created!' : 'Desktop Shortcut'}</span>
          </button>

          {/* Authentic Clean "Open IDE / Antigravity" Button */}
          <button
            onClick={() => {
              if (onLaunchIde) {
                onLaunchIde(instance);
              } else {
                setActiveEditorTab(activeEditorTab === 'code' ? 'logs' : 'code');
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded text-xs font-medium transition cursor-pointer shadow-sm active:scale-95"
            title="Launch native Antigravity window with isolated profile"
          >
            <ExternalLink className="w-3 h-3" />
            <span>{instance.appType === 'antigravity' ? 'Open Antigravity' : 'Open IDE'}</span>
          </button>

          <button
            onClick={() => onOpenSettings(instance)}
            className="p-1 text-[#7D818C] hover:text-zinc-200 hover:bg-[#1E2026] rounded transition cursor-pointer"
            title="Profile Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

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
                className="p-1 text-[#7D818C] hover:text-rose-400 hover:bg-[#1E2026] rounded transition cursor-pointer"
                title="Delete this Instance Profile"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Real Profile & Workspace Details Strip */}
      {showTelemetryBar && (
        <div className="bg-[#121316] border-b border-[#212328] px-4 py-2 flex flex-wrap items-center justify-between gap-4 text-xs select-none">
          {/* App Type badge in strip */}
          <div className="flex items-center gap-2 text-zinc-300">
            {instance.appType === 'antigravity' ? (
              <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                <Terminal className="w-3.5 h-3.5" />
                Antigravity (Standalone)
              </span>
            ) : (
              <span className="text-blue-400 flex items-center gap-1.5 font-medium">
                <Code className="w-3.5 h-3.5" />
                Antigravity IDE
              </span>
            )}
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1A1B20] text-zinc-400 border border-[#272932]">
              {account?.name || 'Local Profile'}
            </span>
          </div>

          {/* Real Workspace & Profile details */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-[#7D818C]">
              <span>Workspace Profile:</span>
              <span className="text-zinc-200 truncate max-w-xs" title={instance.workspacePath}>
                {instance.workspacePath || instance.profileDir || 'Default'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[#7D818C]">
              <span>Sandbox:</span>
              <span className="text-zinc-300">Isolated (`mklink /J` Exts)</span>
            </div>
          </div>

          {/* Quick Launcher shortcuts */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => downloadFile(`antigravity-${instance.name}.desktop`, generateLinuxDesktopEntry(instance))}
              className="px-2 py-0.5 rounded bg-[#18191E] hover:bg-[#20222A] text-zinc-300 hover:text-white border border-[#272932] text-[11px] font-mono cursor-pointer transition flex items-center gap-1"
              title="Download .desktop shortcut"
            >
              <FileText className="w-3 h-3 text-[#7D818C]" />
              .desktop
            </button>
            <button
              onClick={() => downloadFile(`launch-${instance.name}.bat`, generateWindowsBatch(instance, account))}
              className="px-2 py-0.5 rounded bg-[#18191E] hover:bg-[#20222A] text-zinc-300 hover:text-white border border-[#272932] text-[11px] font-mono cursor-pointer transition flex items-center gap-1"
              title="Download .bat shortcut"
            >
              <FileCode className="w-3 h-3 text-[#7D818C]" />
              .bat
            </button>
            <button
              onClick={handleCopyCli}
              className="p-1 rounded bg-[#18191E] hover:bg-[#20222A] text-[#7D818C] hover:text-zinc-200 border border-[#272932] cursor-pointer transition"
              title="Copy Shell One-Liner"
            >
              {copiedCli ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}

      {/* Main Split Layout: Left Agent Conversation + Right Code Editor */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Antigravity AI Agent & Orchestrator Stream */}
        <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-[#212328] bg-[#0F1012] overflow-hidden">
          {/* Conversation Content Scroll */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm text-[#D1D5DB] leading-relaxed">
            {/* User Message Bubble */}
            <div className="bg-[#16171B] border border-[#24262E] rounded-xl p-3.5 text-xs text-zinc-200 font-sans shadow-xs">
              <p>
                Update our handoff.md , go really indepth. Describe what phase we are in, and what we developed and updated if anything. Also have a section at the end for another LLM to read, just fyis and shit. Or you can go indepth. whatever you think it needs to know.
              </p>
            </div>

            {/* Antigravity Agent Output */}
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2 text-xs">
                  3. Sacrosanct Architectural Invariants:
                </h4>
                <ul className="space-y-1.5 pl-4 list-disc text-[#9CA3AF]">
                  <li>
                    <strong className="text-zinc-200">Safety Color Separation:</strong> Safety Red (<code className="text-zinc-300 font-mono">#DC2626</code>), Safety Amber (<code className="text-zinc-300 font-mono">#D97706</code>), Controlled Green (<code className="text-zinc-300 font-mono">#16A34A</code>) are protected ANSI/ISA-101 states. Brand orange must never displace them.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Title Block Protected Geometry:</strong> Viewport 880 × 490; Title Block quadrant <code className="text-zinc-300 font-mono">[500..880px] × [330..490px]</code> is strictly reserved.
                  </li>
                  <li>
                    <strong className="text-zinc-200">SVG XML Entity Escaping:</strong> All bare ampersands must be escaped to <code className="text-zinc-300 font-mono">&amp;amp;</code> to prevent SVG parser crashes.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Encoding Robustness:</strong> European PLC files contain Windows-1252 / ISO-8859-1 bytes; always use lossy decoding fallbacks.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-zinc-200 mb-2 text-xs">
                  4. Known Traps & Anti-Patterns to Avoid:
                </h4>
                <p className="text-[#9CA3AF] pl-4">
                  The "Mocked Button" trap, the "Cookie-Cutter Machine" trap, the "Over-Execution" trap (doing all upgrades when only one was asked), and unescaped Mermaid delimiters in markdown.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-zinc-200 mb-2 text-xs">
                  5. Mandatory Pre-Flight Verification Protocol:
                </h4>
                <p className="text-[#9CA3AF] pl-4">
                  Mandatory execution of <code className="text-zinc-300 font-mono">cargo test</code> and <code className="text-zinc-300 font-mono">npm run build</code> before concluding turns.
                </p>
              </div>

              {/* Verification Status Card */}
              <div className="pt-2">
                <h4 className="font-semibold text-zinc-200 mb-2 text-xs">
                  Verification Status
                </h4>
                <div className="space-y-1.5 pl-4 text-[#9CA3AF]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>
                      <strong className="text-zinc-200">Rust Backend (<code className="text-zinc-300 font-mono">cargo test</code>):</strong> 38/38 tests pass cleanly in 0.09s.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>
                      <strong className="text-zinc-200">Frontend Production Build (<code className="text-zinc-300 font-mono">npm run build</code>):</strong> 0 errors, compiled in 4.16s via Vite and strict TypeScript.
                    </span>
                  </div>
                </div>
              </div>

              {/* Diff Summary Bar */}
              <div className="bg-[#141519] border border-[#24262E] rounded-lg p-2.5 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-[#9CA3AF]">
                  <span>1 file changed</span>
                  <span className="text-emerald-400">+265</span>
                  <span className="text-rose-400">-5</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#5A5E6B]" />
                </div>
                <button
                  onClick={() => setIsDiffReviewed(!isDiffReviewed)}
                  className="px-2.5 py-1 bg-[#1D1E24] hover:bg-[#252730] text-zinc-200 rounded border border-[#2A2C35] text-xs font-sans transition cursor-pointer flex items-center gap-1.5"
                >
                  <Code className="w-3 h-3 text-[#7D818C]" />
                  {isDiffReviewed ? 'Reviewed' : 'Review'}
                </button>
              </div>

              {/* Timestamp & Feedback strip */}
              <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1">
                <span>1h ago</span>
                <div className="flex items-center gap-2">
                  <button className="hover:text-zinc-300 p-1 cursor-pointer"><ThumbsUp className="w-3.5 h-3.5" /></button>
                  <button className="hover:text-zinc-300 p-1 cursor-pointer"><ThumbsDown className="w-3.5 h-3.5" /></button>
                  <button onClick={handleCopyCode} className="hover:text-zinc-300 p-1 cursor-pointer">
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Prompt Bar */}
          <div className="p-3 border-t border-[#212328] bg-[#141518]">
            <form onSubmit={handleSendPrompt} className="bg-[#18191E] border border-[#272932] rounded-xl p-2.5 focus-within:border-zinc-500 transition-colors">
              <input
                type="text"
                placeholder="Ask anything, @ to mention, / for actions (or run commands)"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                className="w-full bg-transparent border-0 text-xs text-zinc-200 placeholder-[#5D616C] focus:outline-none mb-2"
              />

              <div className="flex items-center justify-between pt-1 border-t border-[#22242C] text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-1 text-[#7D818C] hover:text-zinc-200 hover:bg-[#20222A] rounded cursor-pointer"
                    title="Add context file"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {/* Instance Status pill */}
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#20222A] text-zinc-300 text-[11px] font-mono border border-[#2A2C36]">
                    <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-zinc-500'}`} />
                    <span>{isRunning ? 'Instance Active' : 'Instance Stopped'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="p-1.5 text-[#7D818C] hover:text-zinc-200 hover:bg-[#20222A] rounded cursor-pointer"
                    title="Voice input"
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="submit"
                    className="p-1.5 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded transition cursor-pointer"
                    title="Submit query"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Code Editor & Interactive Terminal / Telemetry Tab */}
        <div className="w-full lg:w-1/2 flex flex-col bg-[#0D0E10] overflow-hidden">
          {/* Editor Tab Header */}
          <div className="h-9 bg-[#141518] border-b border-[#212328] flex items-center justify-between px-3 select-none text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveEditorTab('code')}
                className={`px-3 py-1.5 border-t-2 font-mono text-[11px] flex items-center gap-1.5 cursor-pointer ${
                  activeEditorTab === 'code'
                    ? 'border-zinc-300 bg-[#0D0E10] text-zinc-100 font-medium'
                    : 'border-transparent text-[#7D818C] hover:text-zinc-300'
                }`}
              >
                <Code className="w-3.5 h-3.5 text-[#7D818C]" />
                <span>SoftwareDesignSpecModal.tsx</span>
              </button>

              <button
                onClick={() => setActiveEditorTab('logs')}
                className={`px-3 py-1.5 border-t-2 font-mono text-[11px] flex items-center gap-1.5 cursor-pointer ${
                  activeEditorTab === 'logs'
                    ? 'border-zinc-300 bg-[#0D0E10] text-zinc-100 font-medium'
                    : 'border-transparent text-[#7D818C] hover:text-zinc-300'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-[#7D818C]" />
                <span>Terminal & Logs ({instanceLogs.length})</span>
              </button>

              <button
                onClick={() => setActiveEditorTab('telemetry')}
                className={`px-3 py-1.5 border-t-2 font-mono text-[11px] flex items-center gap-1.5 cursor-pointer ${
                  activeEditorTab === 'telemetry'
                    ? 'border-zinc-300 bg-[#0D0E10] text-zinc-100 font-medium'
                    : 'border-transparent text-[#7D818C] hover:text-zinc-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#7D818C]" />
                <span>Account Quotas</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[#6B7280]">
              <span className="font-mono text-[10px]">{isRunning ? '● Running' : '○ Stopped'}</span>
              <button onClick={handleCopyCode} title="Copy code" className="hover:text-zinc-300 cursor-pointer">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Editor Body */}
          {activeEditorTab === 'code' ? (
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[11.5px] leading-relaxed bg-[#0C0D0F] select-text">
              {codeLines.map((line) => (
                <div key={line.line} className="flex items-start hover:bg-[#15161A] px-1 py-0.5 rounded">
                  <span className="w-10 text-[#474A53] select-none text-right pr-4 shrink-0">
                    {line.line}
                  </span>
                  <span className="text-[#9CA3AF] whitespace-pre">
                    {line.text.replace('<select', '\u003cselect').replace('<option', '\u003coption')}
                  </span>
                </div>
              ))}
            </div>
          ) : activeEditorTab === 'logs' ? (
            /* Interactive Terminal & Live Logs Tab */
            <div className="flex-1 flex flex-col bg-[#0A0B0D]">
              <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-1 select-text">
                {instanceLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-[#121317] p-0.5 rounded">
                    <span className="text-[#474A53] select-none">[{log.timestamp}]</span>
                    <span className="uppercase font-semibold text-[10px] text-zinc-400">
                      [{log.level}]
                    </span>
                    <span className="text-[#7D818C]">[{log.source}]</span>
                    <span className="text-zinc-300">{log.message}</span>
                  </div>
                ))}
              </div>

              {/* Terminal command runner */}
              <form onSubmit={handleRunTerminal} className="p-2 border-t border-[#212328] bg-[#121316] flex items-center gap-2">
                <span className="text-zinc-400 font-mono text-xs pl-1">$</span>
                <input
                  type="text"
                  placeholder="Run shell command in workspace (cargo test, npm test, status)..."
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  className="flex-1 bg-transparent border-0 text-xs font-mono text-zinc-200 focus:outline-none placeholder-[#4D505B]"
                />
              </form>
            </div>
          ) : (
            /* Profile Details Tab for this Instance */
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0E0F12] text-xs font-mono">
              <div className="border border-[#22242B] rounded-xl p-4 bg-[#141519]">
                <h4 className="text-sm font-semibold text-zinc-100 mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#7D818C]" />
                  {account?.name || 'Standard Account'}
                </h4>
                <p className="text-[11px] text-[#7D818C] font-sans">
                  Account email: {account?.email || 'local'} · Tier: {account?.tier || 'Pro'}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-[#18191E] p-3 rounded-lg border border-[#24262E]">
                    <span className="text-[10px] text-[#6B7280] block">SESSION DURATION</span>
                    <span className="text-sm font-bold text-zinc-100">
                      {formatSecondsToTime(instance.totalElapsedSeconds)}
                    </span>
                    <span className="text-[10px] text-[#7D818C] mt-0.5 block font-sans">
                      Active session uptime
                    </span>
                  </div>

                  <div className="bg-[#18191E] p-3 rounded-lg border border-[#24262E]">
                    <span className="text-[10px] text-[#6B7280] block">ISOLATION STATUS</span>
                    <span className="text-sm font-bold text-emerald-400">
                      Isolated
                    </span>
                    <span className="text-[10px] text-[#7D818C] mt-0.5 block font-sans">
                      NTFS Junctions enabled
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mt-4 pt-3 border-t border-[#1F2026] text-xs">
                  <div className="flex justify-between text-[#7D818C]">
                    <span>App Type:</span>
                    <span className="text-zinc-200 font-semibold">
                      {instance.appType === 'antigravity' ? 'Antigravity (Standalone Desktop App)' : 'Antigravity IDE (VS Code-based)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#7D818C]">
                    <span>Workspace Profile Directory:</span>
                    <span className="text-zinc-200 truncate max-w-xs">{instance.workspacePath || instance.profileDir || 'Default (%USERPROFILE%\\AntigravityProfiles)'}</span>
                  </div>
                  <div className="flex justify-between text-[#7D818C]">
                    <span>Profile Data:</span>
                    <span className="text-zinc-200 truncate max-w-xs">{instance.profileDir || `%USERPROFILE%\\AntigravityProfiles\\${instance.name}`}</span>
                  </div>
                  <div className="flex justify-between text-[#7D818C]">
                    <span>Custom Launch Flags:</span>
                    <span className="text-zinc-300 font-mono">{instance.customFlags || 'None'}</span>
                  </div>
                  <div className="flex justify-between text-[#7D818C]">
                    <span>Custom Environment:</span>
                    <span className="text-zinc-300">{Object.keys(instance.envVars || {}).length} variables configured</span>
                  </div>
                </div>
              </div>

              {/* Launcher Files for this Instance */}
              <div className="border border-[#22242B] rounded-xl p-4 bg-[#141519] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-[#7D818C]" />
                    Desktop Shortcut & Launcher Files
                  </h4>
                  <button
                    onClick={handleCreateDesktopShortcut}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium cursor-pointer transition flex items-center gap-1.5"
                  >
                    {shortcutCreated ? <Check className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                    <span>{shortcutCreated ? 'Shortcut Created!' : 'Add Shortcut to Desktop'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 font-sans">
                  <button
                    onClick={() => downloadFile(`antigravity-${instance.name}.desktop`, generateLinuxDesktopEntry(instance))}
                    className="p-2.5 bg-[#18191E] hover:bg-[#20222A] border border-[#24262E] rounded-lg text-left text-xs transition cursor-pointer"
                  >
                    <div className="font-semibold text-zinc-200">.desktop File</div>
                    <div className="text-[10px] text-[#7D818C] font-mono">Linux Desktop Entry</div>
                  </button>

                  <button
                    onClick={() => downloadFile(`launch-${instance.name}.bat`, generateWindowsBatch(instance, account))}
                    className="p-2.5 bg-[#18191E] hover:bg-[#20222A] border border-[#24262E] rounded-lg text-left text-xs transition cursor-pointer"
                  >
                    <div className="font-semibold text-zinc-200">.bat Script</div>
                    <div className="text-[10px] text-[#7D818C] font-mono">Windows Batch Launcher</div>
                  </button>

                  <button
                    onClick={() => downloadFile(`launch-${instance.name}.sh`, generateBashScript(instance))}
                    className="p-2.5 bg-[#18191E] hover:bg-[#20222A] border border-[#24262E] rounded-lg text-left text-xs transition cursor-pointer"
                  >
                    <div className="font-semibold text-zinc-200">.sh Script</div>
                    <div className="text-[10px] text-[#7D818C] font-mono">macOS / Linux Shell</div>
                  </button>

                  <button
                    onClick={() => downloadFile(`${instance.name}.url`, generateUrlShortcut(instance))}
                    className="p-2.5 bg-[#18191E] hover:bg-[#20222A] border border-[#24262E] rounded-lg text-left text-xs transition cursor-pointer"
                  >
                    <div className="font-semibold text-zinc-200">.url Shortcut</div>
                    <div className="text-[10px] text-[#7D818C] font-mono">Web URI Shortcut</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Telemetry Bar */}
          <div className="h-7 bg-[#121316] border-t border-[#212328] px-3 flex items-center justify-between text-[10px] font-mono text-[#7D818C] select-none shrink-0">
            <div className="flex items-center gap-4">
              <span>Duration: {formatSecondsToTime(instance.totalElapsedSeconds)}</span>
              <span className="truncate max-w-xs">Workspace: {instance.workspacePath || 'Default'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={isRunning ? "text-emerald-500" : "text-zinc-500"}>
                ● {isRunning ? 'Live Instance' : 'Stopped'}
              </span>
              <span className="text-[#3D4048]">|</span>
              <span>UTF-8</span>
              <span>TypeScript JSX</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
