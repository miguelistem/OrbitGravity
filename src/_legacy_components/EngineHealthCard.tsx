import React from 'react';
import type { EngineHealth } from '../types';

interface EngineHealthCardProps {
  health: EngineHealth;
}

export const EngineHealthCard: React.FC<EngineHealthCardProps> = ({ health }) => {
  return (
    <div className="bg-[#0e1420] border border-[#1e293b] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot shadow-[0_0_8px_#34d399]" />
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Windows Antigravity Engine Health
          </h2>
        </div>
        <span className="text-[11px] font-mono text-[#64748b]">
          {health.statusText}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-[#090d14] border border-[#1a2333]">
          <div className="text-[#64748b] text-[10px] uppercase font-bold tracking-wider">
            Detected Binary
          </div>
          <div
            className="text-slate-200 font-mono text-[11px] mt-1 truncate"
            title="C:\Users\Miguel\AppData\Local\Programs\antigravity\Antigravity.exe"
          >
            {health.detectedBinary}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#090d14] border border-[#1a2333]">
          <div className="text-[#64748b] text-[10px] uppercase font-bold tracking-wider">
            Profiles Directory
          </div>
          <div
            className="text-slate-200 font-mono text-[11px] mt-1 truncate"
            title="%USERPROFILE%\AntigravityProfiles"
          >
            {health.profilesDirectory}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#090d14] border border-[#1a2333]">
          <div className="text-[#64748b] text-[10px] uppercase font-bold tracking-wider">
            Auth-Only Mechanism
          </div>
          <div className="text-emerald-400 font-semibold text-[11px] mt-1">
            {health.mechanism}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#090d14] border border-[#1a2333]">
          <div className="text-[#64748b] text-[10px] uppercase font-bold tracking-wider">
            Total Storage Saved
          </div>
          <div className="text-blue-400 font-bold text-[11px] mt-1">
            {health.storageSaved}
          </div>
        </div>
      </div>
    </div>
  );
};
