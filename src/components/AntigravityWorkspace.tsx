import { useState } from 'react';
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
  Zap
} from 'lucide-react';

interface AntigravityWorkspaceProps {
  instance: AntigravityInstance;
  account?: AntigravityAccount;
  logs: LogEntry[];
  onToggleStatus: (id: string, newStatus: 'running' | 'paused' | 'stopped') => void;
  onExtendTtl: (id: string, extraMinutes: number) => void;
  onOpenSettings: (instance: AntigravityInstance) => void;
  onAddLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  onChangeModel: (instanceId: string, model: string) => void;
}

export function AntigravityWorkspace({
  instance,
  account,
  logs,
  onToggleStatus,
  onExtendTtl,
  onOpenSettings,
  onAddLog,
  onChangeModel,
}: AntigravityWorkspaceProps) {
  const [activeEditorTab, setActiveEditorTab] = useState<'code' | 'logs' | 'telemetry'>('code');
  const [showTelemetryBar, setShowTelemetryBar] = useState(true);
  const [promptInput, setPromptInput] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [isDiffReviewed, setIsDiffReviewed] = useState(false);

  const isRunning = instance.status === 'running';

  // TTL calculation
  const ttlSecondsTotal = instance.ttlMinutes > 0 ? instance.ttlMinutes * 60 : 0;
  const ttlRemainingSeconds = instance.ttlMinutes > 0 ? Math.max(0, ttlSecondsTotal - instance.totalElapsedSeconds) : 0;

  // Account quota calculations
  const tokenAllowance = account?.monthlyTokenAllowance || 100_000_000;
  const tokensUsed = account?.tokensUsed || 68_450_200;
  const tokenPercent = Math.min(100, Math.round((tokensUsed / tokenAllowance) * 100));

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
        source: instance.model,
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
        message: `[Process ${80000 + instance.port}] Command completed (exit 0).`,
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

          {/* Clean Neutral Timer */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1B1C21] border border-[#262830] font-mono text-[11px] text-zinc-300">
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
            <Clock className="w-3 h-3 text-[#7D818C]" />
            <span>{formatSecondsToTime(instance.totalElapsedSeconds)}</span>
          </div>

          {instance.ttlMinutes > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-[#7D818C]">
              <span>TTL: {formatSecondsToTime(ttlRemainingSeconds)}</span>
              <button
                onClick={() => onExtendTtl(instance.id, 30)}
                className="text-zinc-300 hover:text-white hover:underline cursor-pointer"
                title="Extend session by +30m"
              >
                +30m
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Toggle Account Quota Bar */}
          <button
            onClick={() => setShowTelemetryBar(!showTelemetryBar)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition cursor-pointer font-mono ${
              showTelemetryBar
                ? 'bg-[#1C1D23] text-zinc-200 border-[#2C2E38]'
                : 'text-[#7D818C] hover:text-zinc-200 border-transparent hover:bg-[#1C1D23]'
            }`}
            title="Toggle Account Quota & Limits"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#7D818C]" />
            <span>Telemetry</span>
            <span className="text-zinc-400">({tokenPercent}%)</span>
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

          {/* Download Shortcut button */}
          <button
            onClick={() => downloadFile(`launch-${instance.name}.bat`, generateWindowsBatch(instance, account))}
            className="hidden md:flex items-center gap-1.5 px-2 py-1 text-xs text-[#8B8F9A] hover:text-zinc-200 hover:bg-[#1E2026] rounded border border-[#272932] transition cursor-pointer font-mono"
            title="Download Windows / Linux Desktop Shortcut"
          >
            <Download className="w-3 h-3" />
            Shortcut
          </button>

          {/* Authentic Clean "Open IDE" Button */}
          <button
            onClick={() => setActiveEditorTab(activeEditorTab === 'code' ? 'logs' : 'code')}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded text-xs font-medium transition cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open IDE</span>
          </button>

          <button
            onClick={() => onOpenSettings(instance)}
            className="p-1 text-[#7D818C] hover:text-zinc-200 hover:bg-[#1E2026] rounded transition cursor-pointer"
            title="Session Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Account & Quota Telemetry Strip */}
      {showTelemetryBar && (
        <div className="bg-[#121316] border-b border-[#212328] px-4 py-2 flex flex-wrap items-center justify-between gap-4 text-xs select-none">
          {/* Account name & tier */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7D818C]" />
              <span>{account?.name || 'Production Cloud Platform'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1A1B20] text-zinc-300 border border-[#272932]">
                {account?.tier || 'Enterprise'}
              </span>
            </div>
            <span className="text-[#3D4048]">·</span>
            <span className="text-[11px] text-[#7D818C] font-mono">
              Key: {account?.apiKeyMasked || 'ag_live_••••'}
            </span>
          </div>

          {/* Telemetry Gauges */}
          <div className="flex flex-wrap items-center gap-5 text-[11px] font-mono">
            {/* Tokens consumed & progress */}
            <div className="flex items-center gap-2">
              <span className="text-[#7D818C]">Monthly Tokens:</span>
              <span className="text-zinc-200">
                {formatCompactNumber(tokensUsed)} / {formatCompactNumber(tokenAllowance)}
              </span>
              <div className="w-16 h-1 bg-[#24262E] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-zinc-300"
                  style={{ width: `${tokenPercent}%` }}
                />
              </div>
              <span className="text-zinc-400">{tokenPercent}%</span>
            </div>

            {/* RPM rate limit */}
            <div className="flex items-center gap-1.5 text-[#7D818C]">
              <span>RPM:</span>
              <span className="text-zinc-200">
                {account?.currentRpm || 112} / {account?.rpmLimit || 300}
              </span>
            </div>

            {/* Daily spend & cap */}
            <div className="flex items-center gap-1.5 text-[#7D818C]">
              <span>Daily Spend:</span>
              <span className="text-zinc-200">
                {formatCurrency(account?.spentTodayUsd || 84.20)} / {formatCurrency(account?.dailyBudgetUsd || 250)}
              </span>
            </div>

            {/* Rollover timer */}
            <div className="flex items-center gap-1.5 text-[#7D818C]">
              <span>Resets:</span>
              <span className="text-zinc-300">{formatTimeLeft(account?.quotaResetDate || new Date().toISOString())}</span>
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

                  {/* Model Selector pill */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowModelPicker(!showModelPicker)}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#20222A] hover:bg-[#272933] text-zinc-300 text-[11px] font-sans border border-[#2A2C36] cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-zinc-400" />
                      <span>{instance.model}</span>
                      <span className="text-[#6B7280]">▾</span>
                    </button>

                    {showModelPicker && (
                      <div className="absolute left-0 bottom-full mb-1 w-52 bg-[#17181D] border border-[#2A2C35] rounded-lg shadow-xl p-1 z-30 text-xs">
                        {['Gemini 3.8 Flash High', 'Gemini 3.1 Pro', 'Gemini 2.5 Pro Agent', 'Antigravity Deep Agent v3'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              onChangeModel(instance.id, m);
                              setShowModelPicker(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-xs cursor-pointer ${
                              instance.model === m ? 'bg-[#23252E] text-white font-medium' : 'text-zinc-400 hover:bg-[#1E2027]'
                            }`}
                          >
                            <span>{m}</span>
                            {instance.model === m && <Check className="w-3 h-3 text-white" />}
                          </button>
                        ))}
                      </div>
                    )}
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
              <span className="font-mono text-[10px]">Port :{instance.port}</span>
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
            /* Quota Telemetry Tab for this Instance */
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0E0F12] text-xs font-mono">
              <div className="border border-[#22242B] rounded-xl p-4 bg-[#141519]">
                <h4 className="text-sm font-semibold text-zinc-100 mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#7D818C]" />
                  {account?.name}
                </h4>
                <p className="text-[11px] text-[#7D818C] font-sans">
                  Account email: {account?.email} · Tier: {account?.tier}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-[#18191E] p-3 rounded-lg border border-[#24262E]">
                    <span className="text-[10px] text-[#6B7280] block">INSTANCE USAGE</span>
                    <span className="text-sm font-bold text-zinc-100">
                      {formatCompactNumber(instance.tokensConsumedSession)} tokens
                    </span>
                    <span className="text-[10px] text-[#7D818C] mt-0.5 block font-sans">
                      {instance.requestsMadeSession} requests this session
                    </span>
                  </div>

                  <div className="bg-[#18191E] p-3 rounded-lg border border-[#24262E]">
                    <span className="text-[10px] text-[#6B7280] block">ACCOUNT REMAINING</span>
                    <span className="text-sm font-bold text-zinc-100">
                      {formatCompactNumber(Math.max(0, tokenAllowance - tokensUsed))} tokens
                    </span>
                    <span className="text-[10px] text-[#7D818C] mt-0.5 block font-sans">
                      Cap: {formatCompactNumber(tokenAllowance)} ({tokenPercent}% used)
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mt-4 pt-3 border-t border-[#1F2026] text-xs">
                  <div className="flex justify-between text-[#7D818C]">
                    <span>RPM Capacity:</span>
                    <span className="text-zinc-200">{account?.currentRpm} / {account?.rpmLimit} requests/min</span>
                  </div>
                  <div className="flex justify-between text-[#7D818C]">
                    <span>Daily Budget:</span>
                    <span className="text-zinc-200">{formatCurrency(account?.spentTodayUsd || 0)} / {formatCurrency(account?.dailyBudgetUsd || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[#7D818C]">
                    <span>Quota Cycle Reset:</span>
                    <span className="text-zinc-300">{formatTimeLeft(account?.quotaResetDate || '')}</span>
                  </div>
                  <div className="flex justify-between text-[#7D818C]">
                    <span>Session TTL Limit:</span>
                    <span className="text-zinc-200">{instance.ttlMinutes > 0 ? `${instance.ttlMinutes} minutes` : 'Unlimited'}</span>
                  </div>
                </div>
              </div>

              {/* Launcher Files for this Instance */}
              <div className="border border-[#22242B] rounded-xl p-4 bg-[#141519] space-y-3">
                <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-[#7D818C]" />
                  Download Desktop Shortcut Files
                </h4>
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
                    onClick={() => downloadFile(`launch-${instance.name}.sh`, generateBashScript(instance, account))}
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
              <span>RAM: {Math.round(instance.ramUsageMb)}MB / {instance.ramAllocationMb}MB</span>
              <span>CPU: {instance.cpuUsagePercent}%</span>
              <span>TOKENS: {formatCompactNumber(instance.tokensConsumedSession)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500">● Live Daemon</span>
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
