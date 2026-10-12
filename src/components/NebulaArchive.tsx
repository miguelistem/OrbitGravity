import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../api';
import {
  AntigravityInstance,
  ConversationInfo,
  CosmicOverview,
  SolarSystemInfo,
  TranscriptStep,
} from '../types/antigravity';
import {
  Database,
  Sparkles,
  Zap,
  Terminal,
  Code,
  Search,
  Share2,
  Compass,
  ShieldCheck,
  Layers,
  Cpu,
  Clock,
  ArrowRight,
  Eye,
  X,
  RefreshCw,
  Folder,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  User,
  Bot,
  Wrench,
  ChevronRight,
  HelpCircle,
  FileText,
} from 'lucide-react';

interface NebulaArchiveProps {
  instances: AntigravityInstance[];
  initialScope?: string;
}

export function NebulaArchive({ instances, initialScope }: NebulaArchiveProps) {
  // Cosmic systems state
  const [overview, setOverview] = useState<CosmicOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Conversations state
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Active Celestial Scope: 'all' | 'black_hole' | 'solar_system:<name>' | 'rogue' | 'instance:<id>'
  const [activeScope, setActiveScope] = useState<string>(initialScope || 'all');

  useEffect(() => {
    if (initialScope) {
      setActiveScope(initialScope);
    }
  }, [initialScope]);
  const [searchQuery, setSearchQuery] = useState('');
  const [appTypeFilter, setAppTypeFilter] = useState<'all' | 'antigravity_ide' | 'antigravity'>('all');

  // Selected conversation modal state
  const [selectedConversation, setSelectedConversation] = useState<ConversationInfo | null>(null);
  const [transcriptSteps, setTranscriptSteps] = useState<TranscriptStep[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // Clipboard feedback
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // 1. Fetch Cosmic Overview (The Black Hole + Solar Systems + Rogue Planets)
  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      if (isTauri()) {
        const res = await invoke<CosmicOverview>('get_cosmic_systems_overview');
        setOverview(res);
      } else {
        // High-fidelity dynamic mock preview for web browsers
        const systemsMap: Record<string, AntigravityInstance[]> = {};
        const rogues: AntigravityInstance[] = [];

        instances.forEach((inst) => {
          if (inst.blackholeSync || inst.syncMode === 'black_hole') return;
          if (inst.syncMode === 'solo') {
            rogues.push(inst);
            return;
          }
          const tag = (inst.tag?.trim() && inst.tag?.trim() !== 'General Workspaces') ? inst.tag.trim() : 'Projects';
          if (!systemsMap[tag]) systemsMap[tag] = [];
          systemsMap[tag].push(inst);
        });

        const solarSystems: SolarSystemInfo[] = Object.entries(systemsMap).map(([name, planets]) => {
          const slug = name.replace(/[^a-zA-Z0-9_-]/g, '') || 'Default';
          return {
            name,
            starBrainPath: `%USERPROFILE%\\AntigravityProfiles\\_shared_brains\\${slug}`,
            isShared: planets.length >= 2,
            totalConversations: planets.length * 6,
            planets,
          };
        });

        setOverview({
          blackHole: {
            name: 'The Black Hole (Parent Singularity)',
            appPath: 'C:\\Program Files\\antigravity\\Antigravity.exe',
            idePath: 'C:\\Program Files\\Antigravity IDE\\Antigravity IDE.exe',
            appValid: true,
            ideValid: true,
            globalConversationsCount: 42,
            globalBrainPath: '%USERPROFILE%\\.gemini\\antigravity',
          },
          solarSystems,
          roguePlanets: rogues,
        });
      }
    } catch (err) {
      console.error('Failed to load cosmic overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [instances]);

  // 2. Fetch Conversations based on Active Scope
  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      if (isTauri()) {
        if (activeScope === 'black_hole') {
          const merged: ConversationInfo[] = [];
          const seen = new Set<string>();

          const res = await invoke<ConversationInfo[]>('list_conversations', {
            profileDir: null,
            appType: 'antigravity',
            isGlobal: true,
            sourceName: 'The Black Hole',
          }).catch(() => [] as ConversationInfo[]);

          (res || []).forEach((c) => {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              merged.push(c);
            }
          });

          // Also query all instances tethered to the Black Hole (like BAM)
          const tethered = overview?.blackHole?.tetheredPlanets && overview.blackHole.tetheredPlanets.length > 0
            ? overview.blackHole.tetheredPlanets
            : instances.filter((i) => i.blackholeSync || i.syncMode === 'black_hole');

          for (const planet of tethered) {
            try {
              const pConvs = await invoke<ConversationInfo[]>('list_conversations', {
                profileDir: planet.profileDir || null,
                appType: planet.appType || 'antigravity_ide',
                isGlobal: false,
                sourceName: planet.name,
              });
              (pConvs || []).forEach((c) => {
                if (!seen.has(c.id)) {
                  seen.add(c.id);
                  merged.push(c);
                }
              });
            } catch (err) {
              console.warn(`Could not query tethered planet ${planet.name}:`, err);
            }
          }

          setConversations(merged);
        } else if (activeScope.startsWith('instance:')) {
          const instId = activeScope.replace('instance:', '');
          const planet = instances.find((i) => i.id === instId);
          if (planet) {
            const merged: ConversationInfo[] = [];
            const seen = new Set<string>();

            const pConvs = await invoke<ConversationInfo[]>('list_conversations', {
              profileDir: planet.profileDir || null,
              appType: planet.appType || 'antigravity_ide',
              isGlobal: false,
              sourceName: planet.name,
            }).catch(() => [] as ConversationInfo[]);

            (pConvs || []).forEach((c) => {
              if (!seen.has(c.id)) {
                seen.add(c.id);
                merged.push(c);
              }
            });

            // If planet is tethered to Black Hole, also query global root
            if (planet.blackholeSync || planet.syncMode === 'black_hole') {
              const gConvs = await invoke<ConversationInfo[]>('list_conversations', {
                profileDir: null,
                appType: 'antigravity',
                isGlobal: true,
                sourceName: 'Black Hole Singularity',
              }).catch(() => [] as ConversationInfo[]);

              (gConvs || []).forEach((c) => {
                if (!seen.has(c.id)) {
                  seen.add(c.id);
                  merged.push(c);
                }
              });
            }

            setConversations(merged);
          } else {
            setConversations([]);
          }
        } else if (activeScope.startsWith('solar_system:')) {
          const systemName = activeScope.replace('solar_system:', '');
          const system = overview?.solarSystems.find((s) => s.name === systemName);
          const merged: ConversationInfo[] = [];
          const seen = new Set<string>();

          // A. Query convergent Star Brain if path exists
          if (system?.starBrainPath) {
            try {
              const starConvs = await invoke<ConversationInfo[]>('list_conversations', {
                profileDir: system.starBrainPath,
                appType: system.planets[0]?.appType || 'antigravity_ide',
                isGlobal: false,
                sourceName: `Star: ${systemName}`,
              });
              (starConvs || []).forEach((c) => {
                if (!seen.has(c.id)) {
                  seen.add(c.id);
                  merged.push(c);
                }
              });
            } catch (err) {
              console.warn('Could not query star brain:', err);
            }
          }

          // B. Query each member planet in this Solar System
          for (const planet of system?.planets || []) {
            try {
              const planetConvs = await invoke<ConversationInfo[]>('list_conversations', {
                profileDir: planet.profileDir || null,
                appType: planet.appType || 'antigravity_ide',
                isGlobal: false,
                sourceName: planet.name,
              });
              (planetConvs || []).forEach((c) => {
                if (!seen.has(c.id)) {
                  seen.add(c.id);
                  merged.push(c);
                }
              });
            } catch (err) {
              console.warn(`Could not query planet ${planet.name}:`, err);
            }
          }

          setConversations(merged);
        } else if (activeScope === 'rogue') {
          const allRogueConvs: ConversationInfo[] = [];
          for (const planet of overview?.roguePlanets || []) {
            const res = await invoke<ConversationInfo[]>('list_conversations', {
              profileDir: planet.profileDir,
              appType: planet.appType || 'antigravity_ide',
              isGlobal: false,
              sourceName: planet.name,
            });
            if (res) allRogueConvs.push(...res);
          }
          setConversations(allRogueConvs);
        } else {
          // 'all': fetch global Black Hole conversations + each system's conversations + rogue
          const merged: ConversationInfo[] = [];
          const seen = new Set<string>();

          // Global Black Hole
          const globalConvs = await invoke<ConversationInfo[]>('list_conversations', {
            profileDir: null,
            appType: 'antigravity',
            isGlobal: true,
            sourceName: 'The Black Hole',
          }).catch(() => [] as ConversationInfo[]);

          (globalConvs || []).forEach((c) => {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              merged.push(c);
            }
          });

          // Solar systems & all orbiting planets
          for (const sys of overview?.solarSystems || []) {
            if (sys.starBrainPath) {
              const starConvs = await invoke<ConversationInfo[]>('list_conversations', {
                profileDir: sys.starBrainPath,
                appType: sys.planets[0]?.appType || 'antigravity_ide',
                isGlobal: false,
                sourceName: `Star: ${sys.name}`,
              }).catch(() => [] as ConversationInfo[]);

              (starConvs || []).forEach((c) => {
                if (!seen.has(c.id)) {
                  seen.add(c.id);
                  merged.push(c);
                }
              });
            }

            for (const planet of sys.planets) {
              const pConvs = await invoke<ConversationInfo[]>('list_conversations', {
                profileDir: planet.profileDir || null,
                appType: planet.appType || 'antigravity_ide',
                isGlobal: false,
                sourceName: planet.name,
              }).catch(() => [] as ConversationInfo[]);

              (pConvs || []).forEach((c) => {
                if (!seen.has(c.id)) {
                  seen.add(c.id);
                  merged.push(c);
                }
              });
            }
          }

          // Rogue planets
          for (const rogue of overview?.roguePlanets || []) {
            const rConvs = await invoke<ConversationInfo[]>('list_conversations', {
              profileDir: rogue.profileDir,
              appType: rogue.appType || 'antigravity_ide',
              isGlobal: false,
              sourceName: rogue.name,
            }).catch(() => [] as ConversationInfo[]);

            (rConvs || []).forEach((c) => {
              if (!seen.has(c.id)) {
                seen.add(c.id);
                merged.push(c);
              }
            });
          }

          setConversations(merged);
        }
      } else {
        // Browser Mock Feed
        const mockList: ConversationInfo[] = [
          {
            id: 'nebula-bh-core-991',
            title: 'Galactic Foundation & Multi-Process Bridge',
            preview: 'Architecting zero-entropy IPC bridge across Antigravity profiles with Windows named pipes and symlink safety...',
            step_count: 28,
            last_modified: '2 hours ago',
            source_name: 'The Black Hole',
          },
          {
            id: 'nebula-cde-spec-442',
            title: 'Portfolio Ideas Spec Modal Implementation',
            preview: 'Refining SoftwareDesignSpecModal state transition animations and ANSI/ISA compliance test suites...',
            step_count: 14,
            last_modified: '4 hours ago',
            source_name: 'Star: Portfolio Website',
          },
          {
            id: 'nebula-efg-token-551',
            title: 'High-Throughput Vector Streaming Pipeline',
            preview: 'Designing Kafka partition consumer with backpressure telemetry and dynamic batch resizing...',
            step_count: 22,
            last_modified: '12 hours ago',
            source_name: 'Star: Core Infrastructure',
          },
          {
            id: 'nebula-bam-auth-119',
            title: 'Single-Sign-On Auth Delegation Flow',
            preview: 'Validating OAuth2 loopback interceptor on localhost with anti-entropy replay tokens...',
            step_count: 8,
            last_modified: '1 day ago',
            source_name: 'The Black Hole',
          },
          {
            id: 'nebula-rogue-vision-303',
            title: 'Industrial Sensor Anomaly Classifier',
            preview: 'Training lightweight quantized ONNX model for optical defect detection pipeline...',
            step_count: 19,
            last_modified: '2 days ago',
            source_name: 'Industrial Bridge',
          },
        ];

        if (activeScope === 'black_hole') {
          setConversations(mockList.filter((c) => c.source_name.includes('Black Hole')));
        } else if (activeScope.startsWith('solar_system:')) {
          const sysName = activeScope.replace('solar_system:', '');
          setConversations(mockList.filter((c) => c.source_name.includes(sysName)));
        } else if (activeScope === 'rogue') {
          setConversations(mockList.filter((c) => c.source_name.includes('Industrial Bridge')));
        } else {
          setConversations(mockList);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations for scope:', err);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [activeScope, overview]);

  // 3. Load Transcript Steps when a conversation is clicked
  useEffect(() => {
    if (!selectedConversation) {
      setTranscriptSteps([]);
      return;
    }

    const loadTranscript = async () => {
      setLoadingTranscript(true);
      try {
        if (isTauri()) {
          const isGlobal = selectedConversation.source_name.includes('Black Hole') || selectedConversation.source_name.includes('Main Antigravity');
          let pDir: string | null = null;

          if (!isGlobal) {
            if (selectedConversation.profile_dir) {
              pDir = selectedConversation.profile_dir;
            } else {
              // Find instance or system by name
              const matchedInst = instances.find((i) => i.name === selectedConversation.source_name);
              if (matchedInst) {
                pDir = matchedInst.profileDir || null;
              } else {
                const matchedSys = overview?.solarSystems.find((s) => selectedConversation.source_name.includes(s.name));
                if (matchedSys) pDir = matchedSys.starBrainPath;
              }
            }
          }

          const steps = await invoke<TranscriptStep[]>('get_conversation_transcript', {
            conversationId: selectedConversation.id,
            profileDir: pDir,
            isGlobal,
            appType: 'antigravity_ide',
          });

          setTranscriptSteps(steps || []);
        } else {
          // Web preview mock steps
          setTranscriptSteps([
            {
              step_index: 0,
              source: 'USER_EXPLICIT',
              step_type: 'USER_INPUT',
              content: `Please analyze the system architecture for ${selectedConversation.title} and propose state transitions.`,
              tool_calls: [],
              created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
            },
            {
              step_index: 1,
              source: 'MODEL',
              step_type: 'PLANNER_RESPONSE',
              content: 'I have inspected the project workspace. The state machine satisfies ANSI/ISA-101 criteria and isolates profile memory without cyclic dependencies.',
              thinking: 'Checking file structure and verifying NTFS Junction points for extension sharing.',
              tool_calls: ['read_url_content', 'run_command'],
              created_at: new Date(Date.now() - 3500 * 1000).toISOString(),
            },
            {
              step_index: 2,
              source: 'MODEL',
              step_type: 'PLANNER_RESPONSE',
              content: 'Completed step verification. All unit tests succeed and memory convergence is confirmed across the Star Brain.',
              tool_calls: ['cargo_test'],
              created_at: new Date(Date.now() - 3400 * 1000).toISOString(),
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to read transcript steps:', err);
        setTranscriptSteps([]);
      } finally {
        setLoadingTranscript(false);
      }
    };

    loadTranscript();
  }, [selectedConversation]);

  // Copy helpers
  const handleCopy = (text: string, type: 'path' | 'session' | 'transcript') => {
    navigator.clipboard.writeText(text);
    if (type === 'path') {
      setCopiedPath(text);
      setTimeout(() => setCopiedPath(null), 2000);
    } else if (type === 'session') {
      setCopiedSessionId(true);
      setTimeout(() => setCopiedSessionId(false), 2000);
    } else if (type === 'transcript') {
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    }
  };

  const handleOpenFolder = (path: string) => {
    if (isTauri() && path) {
      invoke('open_in_explorer', { path }).catch((err) =>
        console.error('Failed to open in explorer:', err)
      );
    }
  };

  // Filter conversations based on search and app type
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.source_name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [conversations, searchQuery, appTypeFilter]);

  // Current scope details for banner
  const activeScopeDetails = useMemo(() => {
    if (activeScope === 'black_hole') {
      return {
        title: 'The Black Hole (Parent Singularity Memory Vault)',
        subtitle: 'Root Master Memory • Connected to Google Antigravity Parent App',
        path: overview?.blackHole.globalBrainPath || '%USERPROFILE%\\.gemini\\antigravity',
        isBlackHole: true,
      };
    }
    if (activeScope.startsWith('solar_system:')) {
      const sysName = activeScope.replace('solar_system:', '');
      const sys = overview?.solarSystems.find((s) => s.name === sysName);
      return {
        title: `Star Memory Vault: ${sysName}`,
        subtitle: `Convergent Star Brain • Shared by ${sys?.planets.length || 0} Orbiting Instances`,
        path: sys?.starBrainPath || '',
        isStar: true,
      };
    }
    if (activeScope.startsWith('instance:')) {
      const instId = activeScope.replace('instance:', '');
      const inst = instances.find((i) => i.id === instId);
      return {
        title: `Instance Memory Vault: ${inst?.name || 'Isolated Profile'}`,
        subtitle: `${inst?.tag || 'Sandbox Profile'} • Local Conversation Timeline`,
        path: inst?.profileDir || '%USERPROFILE%\\AntigravityProfiles\\' + (inst?.name || ''),
        isInstance: true,
      };
    }
    if (activeScope === 'rogue') {
      return {
        title: 'Rogue Planets Vault',
        subtitle: 'Independent Isolated Profile Sandboxes',
        path: 'Multiple Isolated Directories',
        isRogue: true,
      };
    }
    return {
      title: 'Galactic Memory Archive',
      subtitle: 'Universal Observatory across all Constellations and Singularity Memory',
      path: 'All Connected Celestial Vaults',
      isAll: true,
    };
  }, [activeScope, overview]);

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
          <span className="inline-flex items-center justify-center leading-none h-[18px] px-2 rounded-full text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 uppercase tracking-wider ml-1 shadow-[0_0_8px_rgba(52,211,153,0.25)]">
            Active Vault
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span>Systems: <strong className="text-zinc-200">{overview?.solarSystems.length || 0} ☀️</strong></span>
            <span>•</span>
            <span>Transcripts: <strong className="text-zinc-200">{conversations.length} 📜</strong></span>
          </div>
          <button
            onClick={() => {
              fetchOverview();
              fetchConversations();
            }}
            disabled={loadingOverview || loadingConversations}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1B1D26] hover:bg-[#252836] border border-[#2B2E3E] text-zinc-300 text-xs font-mono transition cursor-pointer disabled:opacity-50"
            title="Refresh Galactic Archive"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${(loadingOverview || loadingConversations) ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Main Scrollable Observatory Area */}
      <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* SECTION A: THE CELESTIAL MAP (CONSTELLATIONS & STARS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                <Compass className="w-3.5 h-3.5 text-purple-400" />
                <span>Active Constellations & Gravitational Memory Cores</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                Click any Celestial Core to explore its memory directory
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: The Black Hole (Parent Singularity) */}
              <div
                onClick={() => setActiveScope('black_hole')}
                className={`relative overflow-hidden p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                  activeScope === 'black_hole'
                    ? 'bg-gradient-to-br from-purple-950/60 via-[#181926] to-[#12131D] border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                    : 'bg-gradient-to-br from-purple-950/30 via-[#13141C] to-[#0E0F14] border-purple-900/40 hover:border-purple-600/50 hover:bg-[#161722]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-700/60 flex items-center justify-center text-lg shadow-inner">
                      🕳️
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>The Black Hole</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-900/80 text-purple-300 border border-purple-700/60 uppercase">
                          SINGULARITY
                        </span>
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        Global Parent App Memory Root
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed font-sans bg-[#0E0F15]/70 p-2.5 rounded-xl border border-purple-950/60">
                  Holds master transcripts and reasoning across the global Google Antigravity application.
                </p>

                {/* Tethered Planets */}
                {(() => {
                  const tethered = overview?.blackHole?.tetheredPlanets && overview.blackHole.tetheredPlanets.length > 0
                    ? overview.blackHole.tetheredPlanets
                    : instances.filter((i) => i.blackholeSync || i.syncMode === 'black_hole');

                  if (tethered.length === 0) return null;

                  return (
                    <div className="space-y-1.5 pt-1 border-t border-purple-900/30">
                      <span className="text-[10px] font-mono uppercase text-purple-300 font-semibold tracking-wider block">
                        Tethered Planets (Instances):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {tethered.map((p) => (
                          <button
                            key={p.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveScope('instance:' + p.id);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono transition cursor-pointer border ${
                              activeScope === 'instance:' + p.id
                                ? 'bg-purple-600 text-white border-purple-400'
                                : 'bg-[#181924] hover:bg-[#222436] text-purple-200 border-purple-800/50'
                            }`}
                            title={`Inspect ${p.name}'s conversations`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                            <span>{p.name}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-700/50">
                              {p.appType === 'antigravity' ? 'App' : 'IDE'}
                            </span>
                            {p.tier === 'Pro' ? (
                              <span className="text-[8.5px] px-1 py-0.2 rounded font-extrabold bg-white text-zinc-950 border border-white">
                                PRO
                              </span>
                            ) : p.tier === 'Plus' ? (
                              <span className="text-[8.5px] px-1 py-0.2 rounded font-bold bg-blue-900 text-blue-200 border border-blue-500">
                                PLUS
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between pt-2 border-t border-purple-900/30 text-[11px] font-mono">
                  <span className="text-purple-300 font-bold">
                    {overview?.blackHole?.globalConversationsCount || 0} Global Transcripts
                  </span>
                  <span className="text-zinc-400 group-hover:text-purple-300 flex items-center gap-1 font-sans text-xs">
                    Inspect Singularity <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Card 2+: Active Solar Systems (The Stars) */}
              {(overview?.solarSystems || []).map((system) => {
                const isSelected = activeScope === `solar_system:${system.name}`;
                return (
                  <div
                    key={system.name}
                    onClick={() => setActiveScope(`solar_system:${system.name}`)}
                    className={`relative overflow-hidden p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-950/60 via-[#1C1A1F] to-[#14131A] border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                        : 'bg-gradient-to-br from-amber-950/30 via-[#15141B] to-[#0F0E14] border-amber-900/40 hover:border-amber-600/50 hover:bg-[#181622]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-lg shadow-inner">
                          ☀️
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>Star: {system.name}</span>
                          </h3>
                          <p className="text-[11px] text-amber-300/80 font-mono">
                            Convergent Star Brain
                          </p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/60">
                        {system.planets.length} Planets
                      </span>
                    </div>

                    <div className="space-y-1.5 bg-[#0F0E14]/70 p-2.5 rounded-xl border border-amber-950/60">
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 flex-wrap">
                        <span className="text-zinc-500 font-mono text-[10px]">Orbiting:</span>
                        {system.planets.map((p) => (
                          <button
                            key={p.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveScope('instance:' + p.id);
                            }}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer border ${
                              activeScope === 'instance:' + p.id
                                ? 'bg-amber-600 text-white border-amber-400'
                                : 'bg-[#1A1822] hover:bg-[#282536] text-zinc-300 border-[#2C2738]'
                            }`}
                            title={`View ${p.name}'s conversations`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'running' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                            <span>{p.name}</span>
                            <span className="text-[9px] text-zinc-400">
                              {p.appType === 'antigravity' ? 'App' : 'IDE'}
                            </span>
                            {p.tier === 'Pro' ? (
                              <span className="text-[8.5px] px-1 py-0.2 rounded font-extrabold bg-white text-zinc-950 border border-white">
                                PRO
                              </span>
                            ) : p.tier === 'Plus' ? (
                              <span className="text-[8.5px] px-1 py-0.2 rounded font-bold bg-blue-900 text-blue-200 border border-blue-500">
                                PLUS
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11.5px] text-zinc-400 font-sans leading-relaxed">
                        Reasoning and conversation history automatically converge into this Star Memory core.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-900/30 text-[11px] font-mono">
                      <span className="text-amber-300 font-bold">
                        {system.totalConversations} Star Transcripts
                      </span>
                      <span className="text-zinc-400 group-hover:text-amber-300 flex items-center gap-1 font-sans text-xs">
                        Inspect Star Vault <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Card 3: Rogue Planets (Solo Profiles) */}
              {(overview?.roguePlanets || []).length > 0 && (
                <div
                  onClick={() => setActiveScope('rogue')}
                  className={`relative overflow-hidden p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                    activeScope === 'rogue'
                      ? 'bg-gradient-to-br from-cyan-950/50 via-[#141922] to-[#0E131A] border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                      : 'bg-gradient-to-br from-cyan-950/20 via-[#10141D] to-[#0C0F16] border-cyan-900/30 hover:border-cyan-600/40 hover:bg-[#131822]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-lg shadow-inner">
                        🪐
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Rogue Planets</h3>
                        <p className="text-[11px] text-cyan-300/80 font-mono">
                          Isolated Profiles
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                      {overview?.roguePlanets.length} Solo Profiles
                    </span>
                  </div>

                  <div className="space-y-1.5 bg-[#0B0F15]/70 p-2.5 rounded-xl border border-cyan-950/60">
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 flex-wrap">
                      <span className="text-zinc-500 font-mono text-[10px]">Isolated:</span>
                      {overview?.roguePlanets.map((p) => (
                        <button
                          key={p.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveScope('instance:' + p.id);
                          }}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer border ${
                            activeScope === 'instance:' + p.id
                              ? 'bg-cyan-600 text-white border-cyan-400'
                              : 'bg-[#121926] hover:bg-[#1C263A] text-cyan-200 border-cyan-800/40'
                          }`}
                          title={`View ${p.name}'s conversations`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                          <span>{p.name}</span>
                          <span className="text-[9px] text-zinc-400">
                            {p.appType === 'antigravity' ? 'App' : 'IDE'}
                          </span>
                          {p.tier === 'Pro' ? (
                            <span className="text-[8.5px] px-1 py-0.2 rounded font-extrabold bg-white text-zinc-950 border border-white">
                              PRO
                            </span>
                          ) : p.tier === 'Plus' ? (
                            <span className="text-[8.5px] px-1 py-0.2 rounded font-bold bg-blue-900 text-blue-200 border border-blue-500">
                              PLUS
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11.5px] text-zinc-400 font-sans leading-relaxed">
                      Standalone profile instances running with private, isolated memory sandboxes.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-cyan-900/30 text-[11px] font-mono">
                    <span className="text-cyan-300 font-bold">
                      {overview?.roguePlanets.length} Standalone Profiles
                    </span>
                    <span className="text-zinc-400 flex items-center gap-1 font-sans text-xs">
                      Inspect Rogue Vault <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION B: SCOPE SELECTOR & SEARCH TOOLBAR */}
          <div className="p-4 rounded-2xl bg-[#14151B] border border-[#232532] space-y-4">
            {/* Scope Filter Pills */}
            <div className="flex items-center justify-between flex-wrap gap-2.5 pb-3 border-b border-[#1E202B]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setActiveScope('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium font-mono transition cursor-pointer flex items-center gap-1.5 ${
                    activeScope === 'all'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                      : 'bg-[#1A1C26] text-zinc-400 hover:text-zinc-200 hover:bg-[#222432]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>All Celestial Memories</span>
                </button>

                <button
                  onClick={() => setActiveScope('black_hole')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium font-mono transition cursor-pointer flex items-center gap-1.5 ${
                    activeScope === 'black_hole'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                      : 'bg-[#1A1C26] text-zinc-400 hover:text-purple-300 hover:bg-[#222432]'
                  }`}
                >
                  <span>🕳️</span>
                  <span>The Black Hole</span>
                </button>

                {(overview?.solarSystems || []).map((sys) => (
                  <button
                    key={sys.name}
                    onClick={() => setActiveScope(`solar_system:${sys.name}`)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium font-mono transition cursor-pointer flex items-center gap-1.5 ${
                      activeScope === `solar_system:${sys.name}`
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                        : 'bg-[#1A1C26] text-zinc-400 hover:text-amber-300 hover:bg-[#222432]'
                    }`}
                  >
                    <span>☀️</span>
                    <span>Star: {sys.name}</span>
                  </button>
                ))}

                {(overview?.roguePlanets || []).length > 0 && (
                  <button
                    onClick={() => setActiveScope('rogue')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium font-mono transition cursor-pointer flex items-center gap-1.5 ${
                      activeScope === 'rogue'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/40'
                        : 'bg-[#1A1C26] text-zinc-400 hover:text-cyan-300 hover:bg-[#222432]'
                    }`}
                  >
                    <span>🪐</span>
                    <span>Rogue Planets</span>
                  </button>
                )}
              </div>

              {/* Physical Vault Path with 1-click Copy & Open */}
              {activeScopeDetails.path && activeScopeDetails.path !== 'Multiple Isolated Directories' && activeScopeDetails.path !== 'All Connected Celestial Vaults' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-400 truncate max-w-xs" title={activeScopeDetails.path}>
                    {activeScopeDetails.path}
                  </span>
                  <button
                    onClick={() => handleCopy(activeScopeDetails.path, 'path')}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#20222F] rounded-lg transition cursor-pointer"
                    title="Copy Star Brain Path"
                  >
                    {copiedPath === activeScopeDetails.path ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenFolder(activeScopeDetails.path)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#20222F] rounded-lg transition cursor-pointer"
                    title="Open Directory in Windows Explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search archived conversations, prompts, and reasoning summaries..."
                className="w-full bg-[#0E0F14] border border-[#222432] rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 font-mono focus:outline-none focus:border-purple-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* SECTION C: THE CONVERSATION FEED */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs font-mono text-zinc-400">
              <span className="font-semibold text-zinc-300">
                {activeScopeDetails.title} ({filteredConversations.length} Transcripts)
              </span>
              <span className="text-[11px] text-zinc-500">
                Click any card to read its full transcript & reasoning steps
              </span>
            </div>

            {loadingConversations ? (
              <div className="p-16 text-center text-zinc-500 border border-[#20222E] rounded-2xl bg-[#14151B] space-y-3">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto text-purple-400" />
                <p className="text-xs font-mono">Scanning conversation memories across celestial vaults...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-14 text-center border border-dashed border-[#262838] rounded-2xl bg-[#12131A] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1B1D28] border border-[#2B2D3E] flex items-center justify-center mx-auto text-zinc-500">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-200">
                  {searchQuery ? 'No matching conversations' : 'No conversations in this celestial vault'}
                </h4>
                <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  {searchQuery
                    ? `No conversations matched "${searchQuery}". Try clearing your search keyword.`
                    : 'Conversations generated in Google Antigravity or isolated profiles will automatically index here in the Star Brain.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredConversations.map((conv) => {
                  const isBh = conv.source_name.includes('Black Hole') || conv.source_name.includes('Main Antigravity');
                  const isStar = conv.source_name.includes('Star:');

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className="p-4 rounded-2xl bg-[#14151B] border border-[#222430] hover:border-[#383C52] transition-all cursor-pointer flex flex-col justify-between space-y-3 group shadow-lg shadow-black/30 hover:-translate-y-0.5"
                    >
                      <div className="space-y-2.5">
                        {/* Top Meta Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {isBh ? (
                              <span className="inline-flex items-center justify-center leading-none h-[18px] px-2 rounded-full text-[9.5px] font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-700/60 gap-1">
                                <span>🕳️</span>
                                <span>The Black Hole</span>
                              </span>
                            ) : isStar ? (
                              <span className="inline-flex items-center justify-center leading-none h-[18px] px-2 rounded-full text-[9.5px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60 gap-1">
                                <span>☀️</span>
                                <span className="truncate max-w-[130px]">{conv.source_name}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center leading-none h-[18px] px-2 rounded-full text-[9.5px] font-mono font-medium bg-[#1F212D] text-zinc-200 border border-[#2D3042] gap-1">
                                <span className="text-cyan-400">🪐</span>
                                <span className="truncate max-w-[130px]">{conv.source_name}</span>
                              </span>
                            )}

                            <span className="inline-flex items-center justify-center leading-none h-[18px] px-1.5 rounded text-[9.5px] font-mono bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                              {conv.step_count} steps
                            </span>
                          </div>

                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
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

                        {/* Title */}
                        <h4 className="text-[13.5px] font-semibold text-zinc-100 group-hover:text-purple-200 transition leading-snug line-clamp-1">
                          {conv.title || 'Untitled Conversation'}
                        </h4>

                        {/* Preview Excerpt */}
                        <p className="text-xs text-zinc-400 font-sans leading-relaxed line-clamp-2 bg-[#0E0F14] p-2.5 rounded-xl border border-[#1D1F2A]">
                          {conv.preview || 'No prompt excerpt available.'}
                        </p>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-2 border-t border-[#1C1E28] flex items-center justify-between text-xs font-mono text-zinc-500">
                        <span className="text-[10px] text-zinc-500 truncate max-w-[180px]">
                          ID: {conv.id.substring(0, 8)}...
                        </span>
                        <span className="text-purple-400 group-hover:text-purple-300 font-sans text-xs flex items-center gap-1 font-medium">
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Transcript</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Read-Only Transcript Viewer Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="bg-[#12131A] border border-[#2A2C3C] rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#20222F] pb-3 shrink-0">
              <div className="space-y-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400 shrink-0" />
                  <h3 className="text-sm font-bold text-zinc-100 truncate">
                    {selectedConversation.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] font-mono text-zinc-400">
                  <span className="text-purple-300">{selectedConversation.source_name}</span>
                  <span>•</span>
                  <span>{selectedConversation.step_count} Steps</span>
                  <span>•</span>
                  <span className="text-zinc-500">ID: {selectedConversation.id}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedConversation(null)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#202230] rounded-lg transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Transcript Timeline */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {loadingTranscript ? (
                <div className="py-16 text-center text-zinc-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                  <p className="text-xs font-mono">Parsing transcript lines from disk...</p>
                </div>
              ) : transcriptSteps.length > 0 ? (
                <div className="space-y-3">
                  {transcriptSteps.map((step, idx) => {
                    const isUser = step.source === 'USER_EXPLICIT' || step.step_type === 'USER_INPUT';
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border space-y-2 ${
                          isUser
                            ? 'bg-[#181924] border-purple-800/40'
                            : 'bg-[#101118] border-[#222432]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {isUser ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700/60">
                                <User className="w-3 h-3" />
                                <span>User Request (Step {step.step_index})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-700/60">
                                <Bot className="w-3 h-3" />
                                <span>Agent Reasoning (Step {step.step_index})</span>
                              </span>
                            )}

                            {step.tool_calls.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {step.tool_calls.map((tc, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700"
                                  >
                                    <Wrench className="w-2.5 h-2.5 text-amber-400" />
                                    <span>{tc}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {step.created_at && (
                            <span className="text-[9.5px] font-mono text-zinc-500">
                              {new Date(step.created_at).toLocaleTimeString()}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap break-words">
                          {step.content || '(No message content)'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-[#151620] border border-[#232534] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Summary Preview from Conversation Database</span>
                  </div>
                  <p className="text-xs text-zinc-400 font-sans leading-relaxed whitespace-pre-wrap">
                    {selectedConversation.preview || 'No transcript file found on disk for this conversation.'}
                  </p>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    This session is indexed in SQLite. The original raw JSONL log has been archived or trimmed.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-[#20222F] pt-3 shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(selectedConversation.id, 'session')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1B1D28] hover:bg-[#252838] border border-[#2E3144] text-zinc-300 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                  title="Copy UUID"
                >
                  {copiedSessionId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedSessionId ? 'Copied ID' : 'Copy ID'}</span>
                </button>

                <button
                  onClick={() => {
                    const fullText = transcriptSteps.map((s) => `[Step ${s.step_index} - ${s.source}]\n${s.content}`).join('\n\n');
                    handleCopy(fullText || selectedConversation.preview, 'transcript');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1B1D28] hover:bg-[#252838] border border-[#2E3144] text-zinc-300 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                  title="Copy entire conversation text"
                >
                  {copiedTranscript ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedTranscript ? 'Copied Transcript' : 'Copy Transcript'}</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedConversation(null)}
                className="px-4 py-1.5 bg-[#202230] hover:bg-[#292C3E] text-zinc-200 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
