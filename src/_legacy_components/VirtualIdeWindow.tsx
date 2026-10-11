import { useState, useEffect } from 'react';
import { AntigravityInstance, AntigravityAccount } from '../types/antigravity';
import { formatSecondsToTime, formatCompactNumber } from '../utils/formatters';
import { 
  downloadFile, 
  generateLinuxDesktopEntry, 
  generateWindowsBatch 
} from '../utils/shortcutGenerators';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Terminal, 
  FileCode, 
  Play, 
  Pause, 
  Square, 
  RotateCw, 
  Download, 
  Sparkles, 
  Folder, 
  File, 
  GitBranch, 
  Cpu, 
  Clock, 
  Layers, 
  Check, 
  Bot, 
  Save, 
  ChevronRight, 
  ChevronDown 
} from 'lucide-react';

interface VirtualIdeWindowProps {
  isOpen: boolean;
  onClose: () => void;
  instance: AntigravityInstance | null;
  account?: AntigravityAccount;
  onToggleStatus: (id: string, newStatus: 'running' | 'paused' | 'stopped') => void;
  onAddLog: (log: { instanceId: string; level: 'info' | 'agent' | 'exec'; source: string; message: string }) => void;
}

export function VirtualIdeWindow({
  isOpen,
  onClose,
  instance,
  account,
  onToggleStatus,
  onAddLog,
}: VirtualIdeWindowProps) {
  const [activeFile, setActiveFile] = useState<string>('main.rs');
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLines, setTerminalLines] = useState<string[]>([
    'Antigravity IDE v2.8.4 initialized.',
    'Agent session attached: model=' + (instance?.model || 'gemini-2.5-pro-agent'),
    'Type "help" or run terminal scripts.',
  ]);
  const [agentStatus, setAgentStatus] = useState<string>('Watching AST tree & ready for prompts');

  useEffect(() => {
    if (instance) {
      if (instance.tag.includes('Rust') || instance.name.toLowerCase().includes('rust')) {
        setActiveFile('src/broker.rs');
      } else if (instance.tag.includes('Frontend') || instance.name.toLowerCase().includes('front')) {
        setActiveFile('src/App.tsx');
      } else {
        setActiveFile('src/pipeline.py');
      }
    }
  }, [instance]);

  if (!isOpen || !instance) return null;

  const isRunning = instance.status === 'running';

  // Sample code content based on active file
  const getFileContent = (filename: string) => {
    if (filename.endsWith('.rs')) {
      return `//! Antigravity Core Broker Channel
use std::sync::Arc;
use tokio::sync::mpsc::{channel, Sender, Receiver};

#[derive(Debug, Clone)]
pub struct MessageFrame {
    pub id: u64,
    pub payload: bytes::Bytes,
    pub timestamp_ms: i64,
}

pub struct BrokerChannel {
    tx: Sender<MessageFrame>,
    rx: Receiver<MessageFrame>,
    capacity: usize,
}

impl BrokerChannel {
    pub fn new(capacity: usize) -> Self {
        let (tx, rx) = channel(capacity);
        Self { tx, rx, capacity }
    }

    /// Dispatches frame with zero-copy buffer pinning
    pub async fn dispatch_frame(&mut self, frame: MessageFrame) -> Result<(), &'static str> {
        // [Antigravity Agent Suggestion]: Memory footprint optimized
        self.tx.send(frame).await.map_err(|_| "Failed to enqueue")?;
        Ok(())
    }
}`;
    }

    if (filename.endsWith('.tsx') || filename.endsWith('.ts')) {
      return `import React, { useState, useEffect } from 'react';

export default function DashboardPortal() {
  const [dataStream, setDataStream] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Antigravity FastRefresh hook binding
    console.log("[Antigravity] Mounted client portal on port ${instance.port}");
  }, []);

  return (
    <div className="grid grid-cols-12 gap-4 p-6 bg-zinc-950 text-white">
      <header className="col-span-12 border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-bold">Client Service Hub</h1>
        <p className="text-xs text-zinc-400">Auto-tuned by ${instance.model}</p>
      </header>
    </div>
  );
}`;
    }

    return `# Antigravity Pipeline Engine
import asyncio
from typing import AsyncGenerator

async def stream_documents(batch_size: int = 500) -> AsyncGenerator[dict, None]:
    """Ingests raw records with adaptive backpressure"""
    while True:
        records = await fetch_kafka_batch(batch_size)
        for doc in records:
            yield doc
        await asyncio.sleep(0.01)
`;
  };

  const handleRunTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim();
    setTerminalLines((prev) => [...prev, `$ ${cmd}`]);
    setTerminalInput('');

    onAddLog({
      instanceId: instance.id,
      level: 'exec',
      source: 'virtual-ide',
      message: `$ ${cmd}`,
    });

    setTimeout(() => {
      let output = `Executed in 24ms. Exit status 0.`;
      if (cmd.toLowerCase() === 'help') {
        output = 'Available commands: cargo check, npm test, git status, agent think, reload';
      } else if (cmd.toLowerCase().includes('test')) {
        output = 'PASSED: 48 test suites, 0 failures, 100% assertions satisfied.';
      } else if (cmd.toLowerCase().includes('agent')) {
        setAgentStatus('Synthesizing requested optimization...');
        output = 'Agent dispatched task: Analyzing AST dependencies and latency profile.';
      }

      setTerminalLines((prev) => [...prev, output]);
    }, 300);
  };

  const handleTriggerAgentRefactor = () => {
    setAgentStatus('Agent analyzing code for high-throughput zero-copy allocations...');
    onAddLog({
      instanceId: instance.id,
      level: 'agent',
      source: instance.model,
      message: 'Agent initiated automated AST refactoring sequence',
    });
    setTimeout(() => {
      setAgentStatus('Refactor applied! Test suite running in background.');
      setTerminalLines((prev) => [...prev, '[AGENT] Applied zero-copy buffer improvements. Cargo test passing.']);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-7xl h-[92vh] bg-zinc-950 border border-zinc-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Top IDE Window Titlebar */}
        <div className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 cursor-pointer" onClick={onClose} />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>

            <div className="h-4 w-[1px] bg-zinc-700 mx-1" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                Antigravity IDE // {instance.name}
              </span>
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                Port :{instance.port}
              </span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatSecondsToTime(instance.totalElapsedSeconds)}
              </span>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 text-xs">
            {isRunning ? (
              <button
                onClick={() => onToggleStatus(instance.id, 'paused')}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded border border-zinc-700 flex items-center gap-1 cursor-pointer"
              >
                <Pause className="w-3 h-3" /> Pause
              </button>
            ) : (
              <button
                onClick={() => onToggleStatus(instance.id, 'running')}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3" /> Resume
              </button>
            )}

            <button
              onClick={() => downloadFile(`antigravity-${instance.name}.desktop`, generateLinuxDesktopEntry(instance))}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 flex items-center gap-1 cursor-pointer"
              title="Save Desktop Shortcut"
            >
              <Download className="w-3 h-3 text-cyan-400" /> Shortcut
            </button>

            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* IDE Workspace Core Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left File Tree Explorer */}
          <div className="w-56 bg-zinc-900/60 border-r border-zinc-800 flex flex-col justify-between select-none">
            <div className="p-3">
              <div className="text-[10px] font-mono uppercase text-zinc-500 mb-2 flex items-center justify-between">
                <span>EXPLORER</span>
                <span className="text-zinc-600">{instance.gitBranch}</span>
              </div>

              <div className="space-y-0.5 text-xs font-mono">
                <div className="flex items-center gap-1.5 px-2 py-1 text-zinc-300 font-semibold">
                  <Folder className="w-3.5 h-3.5 text-cyan-400" />
                  <span>src</span>
                </div>

                {['src/broker.rs', 'src/App.tsx', 'src/pipeline.py', 'src/types.ts', 'src/config.json'].map((f) => {
                  const isSelected = activeFile === f;
                  return (
                    <div
                      key={f}
                      onClick={() => setActiveFile(f)}
                      className={`flex items-center gap-1.5 px-4 py-1 rounded cursor-pointer transition ${
                        isSelected
                          ? 'bg-cyan-950/60 text-cyan-300 font-medium'
                          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                      }`}
                    >
                      <File className="w-3 h-3 opacity-60" />
                      <span className="truncate">{f.replace('src/', '')}</span>
                    </div>
                  );
                })}

                <div className="pt-2 text-zinc-500 flex items-center gap-1.5 px-2">
                  <FileCode className="w-3.5 h-3.5 text-zinc-600" />
                  <span>antigravity.config</span>
                </div>
              </div>
            </div>

            {/* Antigravity Agent Mini Assistant Status in Sidebar */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-300 mb-1">
                <Bot className="w-3.5 h-3.5 text-violet-400" />
                Antigravity Agent
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight mb-2">
                {agentStatus}
              </p>
              <button
                onClick={handleTriggerAgentRefactor}
                className="w-full py-1.5 px-2 bg-violet-700/80 hover:bg-violet-600 text-white rounded text-[10px] font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Ask Agent Refactor
              </button>
            </div>
          </div>

          {/* Center Code Editor & Bottom Terminal */}
          <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
            {/* Editor File Tab bar */}
            <div className="h-9 bg-zinc-900/40 border-b border-zinc-800 flex items-center px-2 gap-1 text-xs select-none">
              <div className="bg-zinc-950 px-3 py-1.5 border-t-2 border-cyan-400 text-zinc-200 font-mono text-[11px] flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                {activeFile}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono ml-auto flex items-center gap-3 pr-2">
                <span>Model: {instance.model}</span>
                <span>Context: {formatCompactNumber(instance.tokensConsumedSession)} tokens</span>
              </div>
            </div>

            {/* Code Content View */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-zinc-300 leading-relaxed bg-zinc-950">
              <pre className="select-text whitespace-pre-wrap">{getFileContent(activeFile)}</pre>
            </div>

            {/* Bottom Integrated Terminal */}
            <div className="h-44 bg-zinc-950 border-t border-zinc-800 flex flex-col">
              <div className="px-3 py-1.5 bg-zinc-900/70 border-b border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400 select-none">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-cyan-400" />
                  SESSION TERMINAL — {instance.workspacePath}
                </span>
                <span>Active PID: 84912</span>
              </div>

              {/* Terminal Logs scroll */}
              <div className="flex-1 overflow-y-auto p-2.5 font-mono text-[11px] space-y-1 select-text">
                {terminalLines.map((line, idx) => (
                  <div key={idx} className={line.startsWith('$') ? 'text-cyan-300' : 'text-zinc-400'}>
                    {line}
                  </div>
                ))}
              </div>

              {/* Terminal input form */}
              <form onSubmit={handleRunTerminal} className="p-2 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
                <span className="text-cyan-400 font-mono text-xs pl-1">&gt;</span>
                <input
                  type="text"
                  placeholder="Run shell command in workspace (cargo test, git status, agent think)..."
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  className="flex-1 bg-transparent border-0 text-xs font-mono text-zinc-200 focus:outline-none placeholder:text-zinc-600"
                />
              </form>
            </div>
          </div>

          {/* Right Resource & Telemetry Panel */}
          <div className="w-64 bg-zinc-900/40 border-l border-zinc-800 p-4 flex flex-col justify-between text-xs font-mono">
            <div>
              <div className="text-[10px] uppercase text-zinc-500 mb-3 font-semibold">
                Session Resource Monitor
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>CPU LOAD</span>
                    <span className="text-zinc-200">{instance.cpuUsagePercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${Math.min(100, instance.cpuUsagePercent * 2)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>RAM USAGE</span>
                    <span className="text-zinc-200">
                      {Math.round(instance.ramUsageMb)} / {instance.ramAllocationMb} MB
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-violet-400 rounded-full"
                      style={{
                        width: `${Math.min(100, (instance.ramUsageMb / instance.ramAllocationMb) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>ACCOUNT LIMIT</span>
                    <span className="text-zinc-200">{account?.tier || 'Pro'}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {account ? `${formatCompactNumber(account.tokensUsed)} / ${formatCompactNumber(account.monthlyTokenAllowance)} tokens` : 'Standard'}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>AUTONOMY</span>
                    <span className="text-cyan-400 capitalize">{instance.agentAutonomy}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>TTL POLICY</span>
                    <span className="text-zinc-300">{instance.ttlMinutes > 0 ? `${instance.ttlMinutes}m limit` : 'Infinite'}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>HOTKEY</span>
                    <span className="text-zinc-300">{instance.shortcutHotkey || 'None'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-zinc-800 space-y-2">
              <button
                onClick={() => downloadFile(`launch-${instance.name}.bat`, generateWindowsBatch(instance, account))}
                className="w-full py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Download Windows .bat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
