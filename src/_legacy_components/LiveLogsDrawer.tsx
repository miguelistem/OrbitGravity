import { useState, useRef, useEffect } from 'react';
import { AntigravityInstance, LogEntry, LogLevel } from '../types/antigravity';
import { formatSecondsToTime } from '../utils/formatters';
import { downloadFile } from '../utils/shortcutGenerators';
import { 
  X, 
  Terminal, 
  Download, 
  Trash2, 
  Search, 
  Play, 
  Pause, 
  ArrowDown, 
  Check, 
  Send, 
  Clock, 
  Sparkles,
  Bot
} from 'lucide-react';

interface LiveLogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  instance: AntigravityInstance | null;
  logs: LogEntry[];
  onClearLogs: (instanceId: string) => void;
  onAddLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}

export function LiveLogsDrawer({
  isOpen,
  onClose,
  instance,
  logs,
  onClearLogs,
  onAddLog,
}: LiveLogsDrawerProps) {
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [cliInput, setCliInput] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  if (!isOpen || !instance) return null;

  const instanceLogs = logs.filter((l) => l.instanceId === instance.id);

  const filteredLogs = instanceLogs.filter((entry) => {
    const matchesLevel = filterLevel === 'all' || entry.level === filterLevel;
    const matchesSearch =
      searchQuery === '' ||
      entry.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const handleExportLogs = () => {
    const rawText = instanceLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message} ${l.details ? ' -> ' + l.details : ''}`)
      .join('\n');
    downloadFile(`antigravity-${instance.name}-${Date.now()}.log`, rawText);
  };

  const handleSendCliCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = cliInput.trim();
    if (!cmd) return;

    // Log the user command
    onAddLog({
      instanceId: instance.id,
      level: 'exec',
      source: 'developer@terminal',
      message: `$ ${cmd}`,
    });

    setCliInput('');

    // Simulate smart terminal / agent response
    setTimeout(() => {
      const lower = cmd.toLowerCase();
      if (lower === 'help') {
        onAddLog({
          instanceId: instance.id,
          level: 'info',
          source: 'antigravity-core',
          message: 'Commands: status, ps, agent diff, test, mem, clear, help',
        });
      } else if (lower === 'status') {
        onAddLog({
          instanceId: instance.id,
          level: 'info',
          source: 'antigravity-core',
          message: `State: ${instance.status.toUpperCase()} | Port: ${instance.port} | RAM: ${instance.ramUsageMb}MB | CPU: ${instance.cpuUsagePercent}%`,
        });
      } else if (lower === 'ps') {
        onAddLog({
          instanceId: instance.id,
          level: 'exec',
          source: 'process-manager',
          message: `[PID 48102] antigravity-daemon | [PID 48105] ast-watcher (${instance.workspacePath})`,
        });
      } else if (lower.includes('diff')) {
        onAddLog({
          instanceId: instance.id,
          level: 'agent',
          source: instance.model,
          message: 'Agent AST Diff: 14 changes detected in working tree; all syntax trees valid',
        });
      } else if (lower === 'clear') {
        onClearLogs(instance.id);
      } else {
        onAddLog({
          instanceId: instance.id,
          level: 'info',
          source: 'terminal-exec',
          message: `Command executed: "${cmd}" (exit code: 0, 18ms)`,
        });
      }
    }, 400);
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'info':
        return <span className="text-cyan-400 font-mono text-[10px]">INFO</span>;
      case 'agent':
        return <span className="text-violet-400 font-mono text-[10px]">AGENT</span>;
      case 'exec':
        return <span className="text-emerald-400 font-mono text-[10px]">EXEC</span>;
      case 'warn':
        return <span className="text-amber-400 font-mono text-[10px]">WARN</span>;
      case 'error':
        return <span className="text-rose-400 font-mono text-[10px]">ERROR</span>;
      case 'token':
        return <span className="text-blue-400 font-mono text-[10px]">TOKEN</span>;
      default:
        return <span className="text-zinc-500 font-mono text-[10px]">SYS</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-3xl bg-zinc-950 border-l border-zinc-800 flex flex-col h-full shadow-2xl">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-zinc-100 text-sm">{instance.name}</h3>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  STREAMING LIVE
                </span>
              </div>
              <div className="text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-2">
                <span>Port :{instance.port}</span>
                <span className="text-zinc-600">·</span>
                <span>Active: {formatSecondsToTime(instance.totalElapsedSeconds)}</span>
                <span className="text-zinc-600">·</span>
                <span>{instanceLogs.length} events logged</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportLogs}
              title="Download Log File"
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => onClearLogs(instance.id)}
              title="Clear Logs"
              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and search toolbar */}
        <div className="px-5 py-2.5 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between gap-3 text-xs">
          {/* Level tabs */}
          <div className="flex items-center gap-1">
            {['all', 'info', 'agent', 'exec', 'warn', 'error', 'token'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2 py-1 rounded text-[11px] font-mono uppercase transition cursor-pointer ${
                  filterLevel === lvl
                    ? 'bg-zinc-800 text-cyan-300 font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search box & auto-scroll button */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 pl-7 text-[11px] text-zinc-300 focus:outline-none focus:border-cyan-400 font-mono w-36"
              />
            </div>

            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-1.5 rounded text-[11px] font-mono border transition flex items-center gap-1 cursor-pointer ${
                autoScroll
                  ? 'bg-cyan-950 border-cyan-800 text-cyan-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
              title="Lock to bottom on new log"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Log Stream Output (Terminal Canvas) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-[11px] leading-relaxed select-text">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-zinc-600">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <span>No logs found matching current filter</span>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="hover:bg-zinc-900/80 px-2 py-1 rounded transition-colors flex items-start gap-2.5 border border-transparent hover:border-zinc-800/60"
              >
                {/* Timestamp */}
                <span className="text-zinc-600 shrink-0 select-none">
                  [{log.timestamp}]
                </span>

                {/* Level badge */}
                <div className="w-12 shrink-0">{getLevelBadge(log.level)}</div>

                {/* Source */}
                <span className="text-zinc-500 shrink-0 max-w-[130px] truncate">
                  [{log.source}]
                </span>

                {/* Message & Details */}
                <div className="flex-1 text-zinc-300 break-words">
                  <span>{log.message}</span>
                  {log.details && (
                    <div className="mt-0.5 text-zinc-500 text-[10px] pl-2 border-l border-zinc-700">
                      {log.details}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Interactive Terminal Command Input */}
        <form onSubmit={handleSendCliCommand} className="p-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center gap-2">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs pl-2">
            <span>antigravity</span>
            <span className="text-zinc-500">&gt;</span>
          </div>
          <input
            type="text"
            placeholder="Send command (status, ps, agent diff, test, mem, clear, help)..."
            value={cliInput}
            onChange={(e) => setCliInput(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-400 font-mono"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-mono transition cursor-pointer flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            Exec
          </button>
        </form>
      </div>
    </div>
  );
}
