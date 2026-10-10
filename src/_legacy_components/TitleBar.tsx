import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import { OrbitGravityLogo } from './OrbitGravityLogo';

interface TitleBarProps {
  activeTitle?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeTitle = 'OrbitGravity - Portfolio Project Ideas For Attention',
}) => {
  return (
    <header className="h-8 bg-[#070a0f] border-b border-[#182030] flex items-center justify-between px-3 text-xs text-[#94a3b8] shrink-0 select-none z-30">
      {/* Left: Brand & Menu items */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-semibold text-[#f8fafc]">
          {/* OrbitGravity Minimalist Glyph */}
          <OrbitGravityLogo variant="glyph" size={16} />
          <span className="tracking-tight text-slate-100 font-bold text-xs">OrbitGravity</span>
        </div>

        <nav className="flex items-center gap-3 text-[#64748b] text-[11px] ml-1">
          <button className="hover:text-slate-200 transition-colors cursor-pointer bg-transparent border-0 p-0">
            File
          </button>
          <button className="hover:text-slate-200 transition-colors cursor-pointer bg-transparent border-0 p-0">
            View
          </button>
          <button className="hover:text-slate-200 transition-colors cursor-pointer bg-transparent border-0 p-0">
            Window
          </button>
          <button className="hover:text-slate-200 transition-colors cursor-pointer bg-transparent border-0 p-0">
            Help
          </button>
        </nav>
      </div>

      {/* Center: Window Title matching screenshot */}
      <div className="text-[#64748b] text-[11px] font-mono tracking-tight hidden sm:block truncate max-w-xs md:max-w-md">
        {activeTitle}
      </div>

      {/* Right: Window Simulation Controls */}
      <div className="flex items-center gap-3 text-[#64748b]">
        <button
          className="hover:text-white transition-colors p-1 rounded hover:bg-slate-800/50 cursor-pointer"
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          className="hover:text-white transition-colors p-1 rounded hover:bg-slate-800/50 cursor-pointer"
          title="Maximize"
          aria-label="Maximize"
        >
          <Square className="w-2.5 h-2.5" />
        </button>
        <button
          className="hover:text-rose-400 transition-colors p-1 rounded hover:bg-rose-500/20 cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </header>
  );
};
