import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  Layers, 
  ShieldCheck, 
  Cpu,
  Orbit,
  ArrowRight
} from 'lucide-react';

interface CosmicTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialCard {
  id: number;
  badge: string;
  badgeColor: string;
  badgeBorder: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  specs: { label: string; value: string }[];
  term1Label: string;
  term1Desc: string;
  term2Label: string;
  term2Desc: string;
  ruleOfThumb: string;
  accentGradient: string;
  accentBorder: string;
  glowColor: string;
}

const CARDS: TutorialCard[] = [
  {
    id: 1,
    badge: 'CORE ARCHITECTURE',
    badgeColor: 'text-blue-300 bg-blue-950/60',
    badgeBorder: 'border-blue-800/50',
    icon: '🪐',
    title: 'Planetary Instances',
    subtitle: 'Your Isolated Antigravity Profiles',
    description:
      'Every instance you launch is an independent Planet. Each planet runs its own isolated Antigravity session with dedicated accounts, custom network ports, and independent windows without cross-talk.',
    specs: [
      { label: 'Sandbox', value: '1:1 Independent Profile' },
      { label: 'Storage', value: 'NTFS Quantum Junctions' },
      { label: 'Concurrency', value: 'Parallel Multi-Window' },
    ],
    term1Label: 'Planet / Instance',
    term1Desc: 'An isolated Antigravity workspace profile that can run simultaneously with other sessions.',
    term2Label: 'Quantum Junctions',
    term2Desc: 'Uses NTFS directory junctions to share heavy dependencies and extensions with 0 bytes duplicated.',
    ruleOfThumb: 'Launch as many profiles as you need to run multiple accounts side-by-side with zero storage bloat.',
    accentGradient: 'from-blue-600/25 via-blue-900/10 to-transparent',
    accentBorder: 'border-blue-500/40',
    glowColor: 'rgba(59, 130, 246, 0.3)',
  },
  {
    id: 2,
    badge: 'COLLECTIVE INTELLIGENCE',
    badgeColor: 'text-emerald-300 bg-emerald-950/60',
    badgeBorder: 'border-emerald-800/50',
    icon: '☀️',
    title: 'Solar Systems & Star Brains',
    subtitle: 'Group Orbits with Synchronized Agent Memory',
    description:
      'When multiple planets share the same category or group name, they form a Solar System. They gravitate around a shared Star Brain, allowing AI agent memory, transcripts, and conversations to automatically synchronize live across all planets in that orbit.',
    specs: [
      { label: 'Sync Mode', value: 'Live NTFS Brain Junction' },
      { label: 'Scope', value: 'All In-Orbit Planets' },
      { label: 'Memory', value: 'Real-Time Shared Star' },
    ],
    term1Label: 'Solar System',
    term1Desc: 'A group of instances working cooperatively under the same orbit category tag.',
    term2Label: 'Star Brain',
    term2Desc: 'The shared conversation & memory junction automatically linked to all planets in that system.',
    ruleOfThumb: 'Use Solar Systems for teams or multi-agent workspaces where you want all sessions to share the same chat history.',
    accentGradient: 'from-emerald-600/25 via-emerald-900/10 to-transparent',
    accentBorder: 'border-emerald-500/40',
    glowColor: 'rgba(16, 185, 129, 0.3)',
  },
  {
    id: 3,
    badge: 'AIR-GAPPED PRIVACY',
    badgeColor: 'text-cyan-300 bg-cyan-950/60',
    badgeBorder: 'border-cyan-800/50',
    icon: '🌌',
    title: 'Rogue Planets (Solo Orbit)',
    subtitle: 'Strictly Private, Air-Gapped Orbits',
    description:
      'Need total confidentiality or isolated client work? Selecting Solo System Orbit creates a Rogue Planet. Rogue planets are strictly air-gapped: they cannot join existing groups, and other instances cannot join them.',
    specs: [
      { label: 'Privacy', value: '100% Air-Gapped Orbit' },
      { label: 'Group Access', value: 'Unique Orbit Required' },
      { label: 'Memory', value: 'Strict Private Brain' },
    ],
    term1Label: 'Rogue Planet',
    term1Desc: 'An isolated instance with its own private brain that never synchronizes memory with any other profile.',
    term2Label: 'Clean Slate',
    term2Desc: 'An optional fresh start with zero prior conversation history or imported memories.',
    ruleOfThumb: 'Use Rogue Planets whenever working with sensitive credentials, NDA client repositories, or sandboxed tests.',
    accentGradient: 'from-cyan-600/25 via-cyan-900/10 to-transparent',
    accentBorder: 'border-cyan-500/40',
    glowColor: 'rgba(6, 182, 212, 0.3)',
  },
  {
    id: 4,
    badge: 'PARENT ROOT LINK',
    badgeColor: 'text-purple-300 bg-purple-950/60',
    badgeBorder: 'border-purple-800/50',
    icon: '🕳️',
    title: 'The Black Hole Tether',
    subtitle: 'Live Tethering to Your Primary Antigravity',
    description:
      'Tethering an instance to the Black Hole connects it directly to your genuine desktop Antigravity installation (%USERPROFILE%\\.gemini). All conversations and memory stay in sync with your main desktop app in real time.',
    specs: [
      { label: 'Root Target', value: '%USERPROFILE%\\.gemini' },
      { label: 'Safeguard', value: 'Process Concurrency Guard' },
      { label: 'Sync State', value: 'Full Parent Mirror' },
    ],
    term1Label: 'Black Hole Singularity',
    term1Desc: 'Your genuine local parent Antigravity install and root brain repository.',
    term2Label: 'Concurrency Guard',
    term2Desc: 'Built-in safeguards that prevent conflicting simultaneous writes between an active instance and parent app.',
    ruleOfThumb: 'Use Black Hole mode when you want an auxiliary instance window that mirrors your primary personal workspace.',
    accentGradient: 'from-purple-600/25 via-purple-900/10 to-transparent',
    accentBorder: 'border-purple-500/40',
    glowColor: 'rgba(168, 85, 247, 0.3)',
  },
];

export function CosmicTutorialModal({ isOpen, onClose }: CosmicTutorialModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentIdx(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (currentIdx < CARDS.length - 1) {
          setCurrentIdx((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIdx > 0) {
          setCurrentIdx((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIdx, onClose]);

  if (!isOpen) return null;

  const card = CARDS[currentIdx];
  const isLast = currentIdx === CARDS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 select-none animate-in fade-in duration-200">
      <div 
        className={`bg-[#121318] border ${card.accentBorder} rounded-3xl max-w-2xl w-full min-h-[580px] shadow-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 relative`}
        style={{
          boxShadow: `0 0 45px -8px ${card.glowColor}`,
        }}
      >
        {/* Subtle Ambient Cosmic Background Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-b ${card.accentGradient} pointer-events-none opacity-40`} />

        {/* Modal Header */}
        <div className="relative px-8 pt-6 pb-4 flex items-center justify-between border-b border-[#21232B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#181A22] border border-[#2B2E3C] flex items-center justify-center text-sm shadow-xs">
              <BookOpen className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">
                  Cosmic Field Guide
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium">
                  {currentIdx + 1} of {CARDS.length}
                </span>
              </div>
              <p className="text-[11.5px] text-zinc-400 mt-0.5">Core architecture & synchronization rules</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer"
            title="Close Tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Body - Vertically expansive with generous vertical breathing room */}
        <div className="relative px-8 py-7 space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-5">
            {/* Top Row: Badge & Large Glowing Cosmic Emblem */}
            <div className="flex items-center justify-between">
              <span className={`text-[10.5px] font-mono font-semibold px-3 py-1 rounded-full border ${card.badgeColor} ${card.badgeBorder} tracking-wider uppercase`}>
                {card.badge}
              </span>
              
              <div className="w-14 h-14 rounded-2xl bg-[#161822] border border-[#2A2E3D] flex items-center justify-center text-3xl shadow-lg relative group shrink-0">
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.accentGradient} opacity-60`} />
                <span className="relative filter drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">
                  {card.icon}
                </span>
              </div>
            </div>

            {/* Headline & Subtitle */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {card.title}
              </h2>
              <p className="text-sm font-medium text-zinc-300">
                {card.subtitle}
              </p>
            </div>

            {/* Core Description */}
            <p className="text-[13px] text-zinc-300 font-sans leading-relaxed">
              {card.description}
            </p>

            {/* Architecture Mechanism Spec Pills */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {card.specs.map((spec, sIdx) => (
                <div 
                  key={sIdx}
                  className="bg-[#0D0E13]/90 border border-[#1F222D] rounded-xl px-3 py-2 text-center flex flex-col justify-center"
                >
                  <span className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-500 block">
                    {spec.label}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-200 truncate mt-0.5 block">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Key Terms Box - Spacious 2-Column Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0E0F14]/90 border border-[#1E212B] rounded-2xl p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-xs font-bold text-zinc-100">
                    {card.term1Label}
                  </span>
                </div>
                <p className="text-[11.5px] text-zinc-400 leading-relaxed pl-4">
                  {card.term1Desc}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-zinc-100">
                    {card.term2Label}
                  </span>
                </div>
                <p className="text-[11.5px] text-zinc-400 leading-relaxed pl-4">
                  {card.term2Desc}
                </p>
              </div>
            </div>
          </div>

          {/* Rule of Thumb / Pro-Tip Callout */}
          <div className="p-3.5 rounded-xl bg-[#151722]/80 border border-[#252837] flex items-start gap-3 text-xs text-zinc-300 mt-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong className="text-zinc-100">Pro Tip: </strong>
              {card.ruleOfThumb}
            </span>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="relative px-8 py-5 bg-[#101115] border-t border-[#1F2128] flex items-center justify-between shrink-0">
          {/* Progress Indicators */}
          <div className="flex items-center gap-2">
            {CARDS.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                className={`transition-all duration-200 rounded-full cursor-pointer ${
                  currentIdx === idx
                    ? 'w-7 h-2.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)]'
                    : 'w-2.5 h-2.5 bg-[#2D303D] hover:bg-zinc-500'
                }`}
                title={`Go to Card ${idx + 1}: ${c.title}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#17181F] text-zinc-400 hover:text-white hover:bg-[#20222B] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className={`px-5 py-2 rounded-xl text-xs font-semibold text-white transition cursor-pointer flex items-center gap-2 shadow-sm ${
                isLast
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.5)]'
                  : 'bg-[#1A56DB] hover:bg-[#1E62F0]'
              }`}
            >
              <span>{isLast ? 'Enter Orbit' : 'Next'}</span>
              {!isLast ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
