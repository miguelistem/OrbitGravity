import React, { useState } from 'react';
import { AntigravityInstance } from '../types/antigravity';
import {
  Database,
  Sparkles,
  Zap,
  Terminal,
  Code,
  Share2,
  Search,
  Layers,
  ShieldCheck,
  Cpu,
  Clock,
  Compass,
  Lock,
  ArrowRight,
  Eye,
  X
} from 'lucide-react';

interface NebulaArchiveProps {
  instances: AntigravityInstance[];
}

export function NebulaArchive({ instances }: NebulaArchiveProps) {
  const [selectedPreviewThread, setSelectedPreviewThread] = useState<any | null>(null);

  // Group instances by solar systems for telemetry stats
  const uniqueSolarSystems = Array.from(
    new Set(instances.map((i) => i.tag || 'General').filter(Boolean))
  );

  // Sample read-only teaser threads showcasing the UI without backend mutations
  const sampleNebulaThreads = [
    {
      id: 'nebula-bh-core-991',
      title: 'Galactic Foundation & Multi-Process Bridge',
      preview: 'Architecting zero-entropy IPC bridge across Antigravity profiles with Windows named pipes and symlink safety...',
      step_count: 28,
      last_modified: '2 hours ago',
      source_name: 'The Black Hole',
      isGlobal: true,
      appType: 'antigravity',
      solarSystemName: 'Singularity Root',
    },
    {
      id: 'nebula-cde-spec-442',
      title: 'Portfolio Ideas Spec Modal Implementation',
      preview: 'Refining SoftwareDesignSpecModal state transition animations and ANSI/ISA compliance test suites...',
      step_count: 14,
      last_modified: '4 hours ago',
      source_name: 'cde',
      isGlobal: false,
      appType: 'antigravity_ide',
      solarSystemName: 'Projects',
      tier: 'Pro',
    },
    {
      id: 'nebula-efg-token-551',
      title: 'High-Throughput Vector Streaming Pipeline',
      preview: 'Designing Kafka partition consumer with backpressure telemetry and dynamic batch resizing...',
      step_count: 22,
      last_modified: '12 hours ago',
      source_name: 'efg',
      isGlobal: false,
      appType: 'antigravity',
      solarSystemName: 'Projects',
      tier: 'Plus',
    },
    {
      id: 'nebula-bam-auth-119',
      title: 'Single-Sign-On Auth Delegation Flow',
      preview: 'Validating OAuth2 loopback interceptor on localhost with anti-entropy replay tokens...',
      step_count: 8,
      last_modified: '1 day ago',
      source_name: 'BAM',
      isGlobal: false,
      appType: 'antigravity',
      solarSystemName: 'GalaxyA',
      tier: 'Free',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F1012] text-[#D8DADF]">
      {/* 1. Header Toolbar */}
      <div className="h-10 border-b border-[#212328] px-5 flex items-center justify-between bg-[#141518] shrink-0 select-none">
        <div className="flex items-center gap-2.5 text-xs">
          <Database className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="font-bold text-white text-[13px] tracking-tight">Nebula Archive</span>
          <span className="text-[#3D4048]">/</span>
          <span className="text-[#8B8F9A] text-[11px] font-mono hidden sm:inline">
            Stellar Memory Nursery & Interstellar Conversation Archive
          </span>
          <span className="inline-flex items-center justify-center leading-none h-[18px] px-2 rounded-full text-[9px] font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-600/50 uppercase tracking-wider ml-1 shadow-[0_0_8px_rgba(168,85,247,0.25)]">
            Coming Soon
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181920] border border-[#272935] text-[10.5px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span>Phase 2 In Orbit</span>
          </div>
        </div>
      </div>

      {/* 2. Main Scrollable Canvas with max-w-6xl constraint */}
      <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Cosmic Hero Teaser Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-[#141518] border border-purple-800/40 p-6 md:p-8 shadow-xl">
            {/* Background decorative glow */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-12 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-900/50 border border-purple-600/40 text-[10.5px] font-mono text-purple-200 uppercase tracking-wide">
                <Compass className="w-3 h-3 text-purple-300" />
                <span>Stellar Memory Nursery</span>
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                The Nebula Archive Is In Orbit
              </h2>

              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed font-sans">
                An interstellar nursery where conversational ideas and reasoning condense into persistent knowledge. Built to index transcripts across all Solar System constellations, rogue planet instances, and The Black Hole singularity.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  NTFS Junction Isolation
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  Cross-Brain Sync
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  Concurrency Guards Active
                </span>
              </div>
            </div>
          </div>

          {/* Capabilities Roadmap Grid */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Planned Nebula Modules
              </h3>
              <span className="text-[11px] text-purple-400 font-mono">Next Release Preview</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl bg-[#141518] border border-[#22242B] space-y-2 group hover:border-purple-600/40 transition">
                <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-700/50 flex items-center justify-center text-purple-300">
                  <Share2 className="w-4 h-4" />
                </div>
                <h4 className="text-[13px] font-semibold text-zinc-200 group-hover:text-white transition">
                  Thread Teleportation
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  One-click broadcast of conversation memories between isolated instances with automated collision avoidance.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#141518] border border-[#22242B] space-y-2 group hover:border-purple-600/40 transition">
                <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-700/50 flex items-center justify-center text-blue-300">
                  <Search className="w-4 h-4" />
                </div>
                <h4 className="text-[13px] font-semibold text-zinc-200 group-hover:text-white transition">
                  Universal FTS5 Search
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Instant full-text search across transcripts, prompt traces, and agent action logs throughout your entire fleet.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#141518] border border-[#22242B] space-y-2 group hover:border-purple-600/40 transition">
                <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-700/50 flex items-center justify-center text-amber-300">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="text-[13px] font-semibold text-zinc-200 group-hover:text-white transition">
                  Constellation Federation
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Decentralized synchronization across Solar System shared brains with anti-rollback safety protocols.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#141518] border border-[#22242B] space-y-2 group hover:border-purple-600/40 transition">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-emerald-300">
                  <Cpu className="w-4 h-4" />
                </div>
                <h4 className="text-[13px] font-semibold text-zinc-200 group-hover:text-white transition">
                  Singularity Archival
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Automatic cold storage backup directly into The Black Hole root directory without process lock contention.
                </p>
              </div>
            </div>
          </div>

          {/* Telemetry Stat Cards Preview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-xl bg-[#141518] border border-[#22242B] space-y-1 opacity-80">
              <div className="flex items-center justify-between text-[#8B8F9A] text-[11px] font-mono">
                <span>Fleet Threads</span>
                <Database className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-xl font-bold font-mono text-zinc-100">{instances.length * 3 + 6}</div>
              <p className="text-[10px] text-zinc-500">Indexed transcripts (Projected)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141518] border border-[#22242B] space-y-1 opacity-80">
              <div className="flex items-center justify-between text-[#8B8F9A] text-[11px] font-mono">
                <span>The Black Hole</span>
                <span className="text-xs">🕳️</span>
              </div>
              <div className="text-xl font-bold font-mono text-purple-300">Active</div>
              <p className="text-[10px] text-zinc-500">Singularity root tether ready</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141518] border border-[#22242B] space-y-1 opacity-80">
              <div className="flex items-center justify-between text-[#8B8F9A] text-[11px] font-mono">
                <span>Solar Systems</span>
                <span className="text-xs">☀️</span>
              </div>
              <div className="text-xl font-bold font-mono text-amber-300">{uniqueSolarSystems.length}</div>
              <p className="text-[10px] text-zinc-500">Shared brain constellations</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141518] border border-[#22242B] space-y-1 opacity-80">
              <div className="flex items-center justify-between text-[#8B8F9A] text-[11px] font-mono">
                <span>Instances Ready</span>
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-xl font-bold font-mono text-blue-300">{instances.length}</div>
              <p className="text-[10px] text-zinc-500">Profiles prepared for Nebula link</p>
            </div>
          </div>

          {/* Read-Only Search Bar Preview */}
          <div className="p-3 rounded-xl bg-[#141518] border border-[#22242B] space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                disabled
                placeholder="Universal Nebula Search: will search all instance transcripts and Singularity memories (Coming in Phase 2)..."
                className="w-full bg-[#0E0F12] border border-[#23242B] rounded-lg pl-9 pr-24 py-2 text-xs text-zinc-400 placeholder-zinc-500 cursor-not-allowed font-mono opacity-80"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500 bg-[#16171B] px-2 py-0.5 rounded border border-[#262832]">
                Read-Only Preview
              </span>
            </div>
          </div>

          {/* Read-Only Sample Transcripts Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-zinc-400 font-mono">
              <span>Archive Layout Preview</span>
              <span className="text-zinc-500">Interactive mutation disabled</span>
            </div>

            <div className="space-y-2.5">
              {sampleNebulaThreads.map((conv) => {
                const isBh = conv.isGlobal;
                return (
                  <div
                    key={conv.id}
                    className="p-4 rounded-xl bg-[#141518] border border-[#22242B] space-y-2.5 group"
                  >
                    {/* Top Row: Origin pill, App variant, Steps count */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {isBh ? (
                          <span className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9.5px] font-mono font-bold bg-purple-950/70 text-purple-300 border border-purple-700/50 gap-1">
                            <span>🕳️</span>
                            <span>The Black Hole</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9.5px] font-mono font-medium bg-[#1F2129] text-zinc-200 border border-[#2E313D] gap-1">
                            <span className="text-amber-400">🪐</span>
                            <span className="truncate max-w-[140px]">{conv.source_name}</span>
                          </span>
                        )}

                        {conv.solarSystemName && (
                          <span className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9px] font-mono bg-amber-950/40 text-amber-300 border border-amber-800/40">
                            ☀️ {conv.solarSystemName}
                          </span>
                        )}

                        <span
                          className={`inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9.5px] font-mono font-semibold ${
                            conv.appType === 'antigravity'
                              ? 'bg-purple-950/40 text-purple-400 border border-purple-800/40'
                              : 'bg-blue-950/40 text-blue-400 border border-blue-800/40'
                          }`}
                        >
                          {conv.appType === 'antigravity' ? 'App' : 'IDE'}
                        </span>

                        {conv.tier === 'Pro' ? (
                          <span
                            className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9px] font-mono font-extrabold bg-gradient-to-r from-zinc-200 via-white to-zinc-300 text-zinc-950 border border-white/90 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                            title="Pro Tier (Platinum)"
                          >
                            PRO
                          </span>
                        ) : conv.tier === 'Plus' ? (
                          <span
                            className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9px] font-mono font-bold bg-blue-950/70 text-blue-300 border border-blue-500/60 shadow-[0_0_6px_rgba(59,130,246,0.3)] gap-1"
                            title="Plus Tier"
                          >
                            <Zap className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                            <span>PLUS</span>
                          </span>
                        ) : conv.tier === 'Free' ? (
                          <span
                            className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9px] font-mono font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/60"
                            title="Free Tier"
                          >
                            FREE
                          </span>
                        ) : null}

                        <span className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9.5px] font-mono bg-zinc-800/60 text-zinc-400 border border-zinc-700/50">
                          {conv.step_count} steps
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedPreviewThread(conv)}
                        className="p-1.5 text-zinc-400 hover:text-purple-300 hover:bg-[#1E2028] rounded-md transition cursor-pointer"
                        title="Preview sample thread metadata"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Middle: Title & Date */}
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-[13.5px] font-semibold text-zinc-100 leading-snug">
                        {conv.title}
                      </h4>
                      <span className="text-[10.5px] text-zinc-500 font-mono shrink-0 pt-0.5">
                        {conv.last_modified}
                      </span>
                    </div>

                    {/* Excerpt */}
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 font-sans bg-[#0F1012] p-2.5 rounded-lg border border-[#1E2027]">
                      {conv.preview}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Inspector Modal */}
      {selectedPreviewThread && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="bg-[#14151B] border border-[#2B2D38] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#22242B] pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-zinc-100">Nebula Archive Preview</h3>
              </div>
              <button
                onClick={() => setSelectedPreviewThread(null)}
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-[#1E2026] rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-500 text-[10.5px] uppercase font-mono">Title</label>
                <div className="text-zinc-100 font-semibold text-sm mt-0.5">{selectedPreviewThread.title}</div>
              </div>

              <div>
                <label className="text-zinc-500 text-[10.5px] uppercase font-mono">Origin Orbit</label>
                <div className="text-zinc-200 font-mono text-xs mt-0.5">
                  {selectedPreviewThread.source_name} ({selectedPreviewThread.solarSystemName})
                </div>
              </div>

              <div>
                <label className="text-zinc-500 text-[10.5px] uppercase font-mono">Transcript Snippet</label>
                <div className="bg-[#0E0F12] border border-[#22242B] p-3 rounded-lg text-zinc-300 leading-relaxed font-sans max-h-48 overflow-y-auto mt-0.5">
                  {selectedPreviewThread.preview}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-200 text-[11px] leading-relaxed">
                Live thread synchronization and cross-instance memory transfer will be active in the upcoming Nebula Archive release.
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#22242B]">
              <button
                onClick={() => setSelectedPreviewThread(null)}
                className="px-4 py-1.5 bg-[#1F2128] hover:bg-[#282B34] text-zinc-200 rounded-lg text-xs font-medium cursor-pointer transition border border-[#2D303B]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
