import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../api';
import { AntigravityInstance, CosmicOverview, ParentBinaries } from '../types/antigravity';
import { ParentBinariesModal } from './ParentBinariesModal';
import {
  Sparkles,
  Terminal,
  Code,
  Folder,
  RefreshCw,
  ExternalLink,
  Check,
  AlertTriangle,
  Play,
  Copy,
  Layers,
  ArrowRight,
  ShieldCheck,
  Download,
  Square,
  PowerOff
} from 'lucide-react';

interface CosmicSystemsManagerProps {
  instances: AntigravityInstance[];
  onSelectInstance: (instance: AntigravityInstance) => void;
  onAddLog: (log: { instanceId: string; level: 'info' | 'error' | 'agent' | 'exec'; source: string; message: string }) => void;
}

export function CosmicSystemsManager({
  instances,
  onSelectInstance,
  onAddLog,
}: CosmicSystemsManagerProps) {
  const [overview, setOverview] = useState<CosmicOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBinariesModalOpen, setIsBinariesModalOpen] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [launchingApp, setLaunchingApp] = useState(false);
  const [launchingIde, setLaunchingIde] = useState(false);
  const [terminatingParent, setTerminatingParent] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      if (isTauri()) {
        const res = await invoke<CosmicOverview>('get_cosmic_systems_overview');
        setOverview(res);
      } else {
        // Browser mock preview
        setOverview({
          blackHole: {
            name: 'The Black Hole (Parent Singularity)',
            appPath: 'C:\\Program Files\\antigravity\\Antigravity.exe',
            idePath: 'C:\\Program Files\\Antigravity IDE\\Antigravity IDE.exe',
            appValid: true,
            ideValid: true,
            globalConversationsCount: 24,
            globalBrainPath: '%USERPROFILE%\\.gemini',
          },
          solarSystems: [
            {
              name: 'Core Infrastructure',
              starBrainPath: '%USERPROFILE%\\AntigravityProfiles\\_shared_brains\\CoreInfrastructure',
              isShared: true,
              totalConversations: 16,
              planets: instances.filter((i) => i.tag === 'Core Infrastructure'),
            },
            {
              name: 'Projects',
              starBrainPath: '%USERPROFILE%\\AntigravityProfiles\\_shared_brains\\Projects',
              isShared: true,
              totalConversations: 8,
              planets: instances.filter((i) => i.tag === 'Projects'),
            },
          ],
          roguePlanets: instances.filter(
            (i) => i.tag !== 'Core Infrastructure' && i.tag !== 'Projects'
          ),
        });
      }
    } catch (err) {
      console.error('Failed to load cosmic overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const instancesFingerprint = instances
    .map((i) => `${i.id}-${i.status}-${i.tag}-${i.blackholeSync}`)
    .join(',');

  useEffect(() => {
    fetchOverview();
  }, [instancesFingerprint]);

  const handleResyncAll = async () => {
    setSyncingAll(true);
    try {
      if (isTauri()) {
        await invoke('sync_all_shared_brains');
      }
      await fetchOverview();
      onAddLog({
        instanceId: 'system',
        level: 'info',
        source: 'system',
        message: 'Resynchronized all Cosmic Solar System Star Brain junctions.',
      });
    } catch (err: any) {
      console.error('Failed to sync all solar systems:', err);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleLaunchParent = async (variant: 'app' | 'ide') => {
    if (variant === 'app') setLaunchingApp(true);
    else setLaunchingIde(true);

    try {
      if (isTauri()) {
        const pid = await invoke<number>('launch_parent_app', { variant });
        onAddLog({
          instanceId: 'blackhole',
          level: 'info',
          source: 'system',
          message: `Launched parent Antigravity (${variant.toUpperCase()}) with PID ${pid}.`,
        });
        await fetchOverview();
        setTimeout(fetchOverview, 1000);
      }
    } catch (err: any) {
      console.error('Failed to launch parent:', err);
      onAddLog({
        instanceId: 'blackhole',
        level: 'error',
        source: 'system',
        message: `Failed to launch parent ${variant}: ${err?.message || String(err)}`,
      });
    } finally {
      if (variant === 'app') setLaunchingApp(false);
      else setLaunchingIde(false);
      await fetchOverview();
    }
  };

  const handleTerminateParent = async (variant?: 'app' | 'ide') => {
    setTerminatingParent(variant || 'all');
    try {
      if (isTauri()) {
        const count = await invoke<number>('terminate_parent_app', { variant: variant || null });
        onAddLog({
          instanceId: 'blackhole',
          level: 'info',
          source: 'system',
          message: `Terminated ${count} parent process(es)${variant ? ` (${variant.toUpperCase()})` : ''}.`,
        });
      }
      await fetchOverview();
    } catch (err: any) {
      console.error('Failed to terminate parent:', err);
      onAddLog({
        instanceId: 'blackhole',
        level: 'error',
        source: 'system',
        message: `Failed to terminate parent: ${err?.message || String(err)}`,
      });
    } finally {
      setTerminatingParent(null);
    }
  };

  const handleCopy = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const runningBlackHoleInst = instances.find(
    (i) => i.status === 'running' && (i.blackholeSync === true || i.syncMode === 'black_hole')
  );
  const isBlackHoleLocked = !!runningBlackHoleInst;
  const bh = overview?.blackHole;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0B0C0E] text-[#D8DADF] select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1E2026]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.9)] animate-pulse" />
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
              Cosmic Systems Manager
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/40">
              ORBITGRAVITY ARCHITECTURE
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-sans">
            Centering around <strong>The Black Hole</strong> parent singularity and multi-instance <strong>Solar Systems</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsBinariesModalOpen(true)}
            className="px-3 py-1.5 bg-[#18191E] hover:bg-[#22242D] text-zinc-200 border border-[#2B2E3A] rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Folder className="w-3.5 h-3.5 text-purple-400" />
            <span>Configure Parent Paths</span>
          </button>

          <button
            onClick={handleResyncAll}
            disabled={syncingAll}
            className="px-3.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-600/40 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
            <span>{syncingAll ? 'Syncing...' : 'Resync All Junctions'}</span>
          </button>
        </div>
      </div>

      {/* 1. THE BLACK HOLE (PARENT SINGULARITY CONSOLE) */}
      <div className="p-5 md:p-6 rounded-2xl border border-purple-900/40 bg-gradient-to-r from-purple-950/30 via-[#13141B] to-[#101116] shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-700/60 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] shrink-0">
              🕳️
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-100">
                  The Black Hole (Parent Singularity)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-purple-900/60 text-purple-200 border border-purple-700/50">
                  Global Root Anchor
                </span>
                {(bh?.appRunning || bh?.ideRunning) && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Parent Active
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-sans max-w-2xl leading-relaxed">
                The single galactic parent engine. Any instance synchronized with the Black Hole shares live conversation memory directly with your genuine Antigravity installation via root directory junctions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Desktop App Control */}
            {bh?.appRunning ? (
              <button
                onClick={() => handleTerminateParent('app')}
                disabled={terminatingParent === 'app'}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 cursor-pointer shadow-sm"
                title="Terminate genuine parent Antigravity Desktop App process"
              >
                <Square className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                <span>{terminatingParent === 'app' ? 'Stopping...' : 'Terminate Parent App'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleLaunchParent('app')}
                disabled={launchingApp || isBlackHoleLocked}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  isBlackHoleLocked
                    ? 'bg-[#181920] text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-60'
                    : 'bg-[#1B1D25] hover:bg-[#252834] text-zinc-200 hover:text-white border border-[#2D303E] cursor-pointer'
                }`}
                title={
                  isBlackHoleLocked
                    ? `Mutual exclusion lock: '${runningBlackHoleInst?.name}' is running tethered to The Black Hole. Stop it first.`
                    : 'Launch genuine parent Antigravity executable'
                }
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Launch Parent App</span>
              </button>
            )}

            {/* IDE Control */}
            {bh?.ideRunning ? (
              <button
                onClick={() => handleTerminateParent('ide')}
                disabled={terminatingParent === 'ide'}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 cursor-pointer shadow-sm"
                title="Terminate genuine parent Antigravity IDE process"
              >
                <Square className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                <span>{terminatingParent === 'ide' ? 'Stopping...' : 'Terminate Parent IDE'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleLaunchParent('ide')}
                disabled={launchingIde || isBlackHoleLocked}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-sm ${
                  isBlackHoleLocked
                    ? 'bg-[#181920] text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-60'
                    : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
                }`}
                title={
                  isBlackHoleLocked
                    ? `Mutual exclusion lock: '${runningBlackHoleInst?.name}' is running tethered to The Black Hole. Stop it first.`
                    : 'Launch genuine parent Antigravity IDE'
                }
              >
                <Code className="w-3.5 h-3.5" />
                <span>Launch Parent IDE</span>
              </button>
            )}

            {/* Terminate All Button if both or either running */}
            {(bh?.appRunning && bh?.ideRunning) && (
              <button
                onClick={() => handleTerminateParent()}
                disabled={terminatingParent === 'all'}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 bg-[#1A1116] hover:bg-rose-950/80 text-rose-400 border border-rose-900/50 cursor-pointer"
                title="Terminate all genuine parent Antigravity and IDE processes"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Stop All</span>
              </button>
            )}
          </div>
        </div>

        {/* Mutual Exclusion Alert Banner */}
        {isBlackHoleLocked && (
          <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-center gap-2.5 text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1 font-sans">
              <span className="font-semibold text-amber-300">Mutual Exclusion Concurrency Guard Active:</span>{' '}
              Instance <strong className="text-white">"{runningBlackHoleInst?.name}"</strong> is currently running tethered to The Black Hole. Parent application launch is locked until this instance stops to protect memory atomicity and prevent race conditions.
            </div>
          </div>
        )}

        {/* Binary Verification Badges & Paths */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          {/* App Binary */}
          <div className="p-3.5 bg-[#14151B] border border-[#232532] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-zinc-200">Antigravity Desktop App</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                    bh?.appRunning
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1'
                      : bh?.appValid
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                      : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                  }`}
                >
                  {bh?.appRunning ? '● Active' : bh?.appValid ? 'Verified' : 'Needs Config'}
                </span>
                {bh?.appRunning && (
                  <button
                    onClick={() => handleTerminateParent('app')}
                    className="text-[10px] text-rose-400 hover:text-rose-300 transition cursor-pointer font-medium underline"
                  >
                    Terminate
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-400 bg-[#0E0F14] px-2.5 py-1 rounded border border-[#1E2028]">
              <span className="truncate">{bh?.appPath || 'No executable path configured'}</span>
              {bh?.appPath && (
                <button
                  onClick={() => handleCopy(bh.appPath!)}
                  className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer shrink-0"
                >
                  {copiedPath === bh.appPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          {/* IDE Binary */}
          <div className="p-3.5 bg-[#14151B] border border-[#232532] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-zinc-200">Antigravity IDE (VS Code)</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                    bh?.ideRunning
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1'
                      : bh?.ideValid
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                      : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                  }`}
                >
                  {bh?.ideRunning ? '● Active' : bh?.ideValid ? 'Verified' : 'Needs Config'}
                </span>
                {bh?.ideRunning && (
                  <button
                    onClick={() => handleTerminateParent('ide')}
                    className="text-[10px] text-rose-400 hover:text-rose-300 transition cursor-pointer font-medium underline"
                  >
                    Terminate
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-400 bg-[#0E0F14] px-2.5 py-1 rounded border border-[#1E2028]">
              <span className="truncate">{bh?.idePath || 'No executable path configured'}</span>
              {bh?.idePath && (
                <button
                  onClick={() => handleCopy(bh.idePath!)}
                  className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer shrink-0"
                >
                  {copiedPath === bh.idePath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Memory Strip */}
        <div className="p-3 bg-[#111217] border border-[#20222D] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-300 font-mono">
            <Folder className="w-3.5 h-3.5 text-purple-400" />
            <span>Root Brain Memory:</span>
            <span className="text-zinc-400 select-all">{bh?.globalBrainPath || '%USERPROFILE%\\.gemini'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-purple-950/50 text-purple-300 border border-purple-800/40 font-mono text-[11px]">
              {bh?.globalConversationsCount || 0} Root Conversations Stored
            </span>
          </div>
        </div>
      </div>

      {/* 2. SOLAR SYSTEMS (CATEGORY SHARED BRAIN HUB) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>Active Solar Systems</span>
              <span className="text-xs px-2 py-0.2 rounded-full bg-[#18191E] border border-[#252833] text-purple-400 font-mono">
                {overview?.solarSystems.length || 0}
              </span>
            </h3>
            <p className="text-[11.5px] text-zinc-400 font-sans">
              Folders with 2 or more instances automatically orbit a central <strong>Star</strong> (Shared Brain directory) synchronized live via NTFS Directory Junctions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overview?.solarSystems.map((system) => (
            <div
              key={system.name}
              className="p-5 bg-[#141519] border border-[#22242B] hover:border-[#2E313E] rounded-2xl transition space-y-4 shadow-sm"
            >
              {/* Star Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-950/30 text-amber-400 border border-amber-800/40 shadow-[0_0_12px_rgba(251,191,36,0.15)] shrink-0 mt-0.5">
                    ☀️
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <span>Solar System: {system.name}</span>
                    </h4>
                    <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
                      {system.planets.length} Orbiting Planets • {system.totalConversations} Shared Conversations
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-semibold shrink-0">
                  Synchronized
                </span>
              </div>

              {/* Star Brain Path */}
              <div className="p-2.5 bg-[#0F1013] border border-[#1E2028] rounded-lg text-[11px] font-mono text-zinc-400 flex items-center justify-between gap-2">
                <span className="truncate">{system.starBrainPath}</span>
                <button
                  onClick={() => handleCopy(system.starBrainPath)}
                  className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer shrink-0"
                >
                  {copiedPath === system.starBrainPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              {/* Orbiting Planets (Instances) */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10.5px] font-mono uppercase text-zinc-500 tracking-wider block">
                  Orbiting Planets (Instances):
                </span>
                <div className="space-y-1">
                  {system.planets.map((planet) => {
                    const isRunning = planet.status === 'running';
                    return (
                      <div
                        key={planet.id}
                        onClick={() => onSelectInstance(planet)}
                        className="p-2 bg-[#18191E] hover:bg-[#20222A] border border-[#23252E] rounded-lg flex items-center justify-between transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isRunning
                                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                                : 'bg-zinc-600'
                            }`}
                          />
                          <span className="text-xs font-medium text-zinc-200 truncate">
                            {planet.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-xs">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#20222A] text-zinc-400 border border-[#292C36]">
                            {planet.appType === 'antigravity' ? 'App' : 'IDE'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-zinc-600" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. DEEP SPACE (ROGUE PLANETS / ISOLATED SANDBOXES) */}
      {overview && overview.roguePlanets.length > 0 && (
        <div className="space-y-3 pt-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>Deep Space: Rogue Planets (Solo Profiles)</span>
              <span className="text-xs px-2 py-0.2 rounded-full bg-[#18191E] border border-[#252833] text-zinc-400 font-mono">
                {overview.roguePlanets.length}
              </span>
            </h3>
            <p className="text-[11.5px] text-zinc-400 font-sans">
              These profile instances currently exist alone in their project folder. Their conversation brains are strictly private and isolated until another profile joins their category.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {overview.roguePlanets.map((rogue) => (
              <div
                key={rogue.id}
                onClick={() => onSelectInstance(rogue)}
                className="p-3.5 bg-[#141519] border border-[#22242B] hover:border-[#2D303D] rounded-xl flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#1B1D24] text-zinc-400 flex items-center justify-center text-xs shrink-0">
                    ☄️
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-zinc-200 block truncate">
                      {rogue.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono block truncate">
                      {rogue.tag || 'Solo Sandbox'}
                    </span>
                  </div>
                </div>

                <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 shrink-0">
                  Isolated
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Parent Binaries Configuration Modal */}
      <ParentBinariesModal
        isOpen={isBinariesModalOpen}
        onClose={() => setIsBinariesModalOpen(false)}
        onSaved={() => {
          fetchOverview();
          onAddLog({
            instanceId: 'blackhole',
            level: 'info',
            source: 'system',
            message: 'Updated parent Antigravity executable paths in fleet state.',
          });
        }}
      />
    </div>
  );
}
