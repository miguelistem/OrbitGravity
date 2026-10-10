import React, { useState } from 'react';
import { Copy, Check, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import type { AccountProfile } from '../types';

interface AccountCardProps {
  account: AccountProfile;
  onResetCycle: (id: string) => void;
  onCopyKey: (key: string) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onResetCycle,
  onCopyKey,
}) => {
  const [copied, setCopied] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const tokenPct = Math.min(
    100,
    Math.round((account.tokensUsed / Math.max(0.1, account.tokensMax)) * 100)
  );
  const rpmPct = Math.min(
    100,
    Math.round((account.rpmCurrent / Math.max(1, account.rpmMax)) * 100)
  );
  const spendPct = Math.min(
    100,
    Math.round((account.dailySpend / Math.max(0.1, account.dailyCap)) * 100)
  );

  const isWarn = account.status === 'warning' || tokenPct >= 80 || rpmPct >= 80;

  const handleCopy = () => {
    onCopyKey(account.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = async () => {
    setIsResetting(true);
    await onResetCycle(account.id);
    setTimeout(() => setIsResetting(false), 600);
  };

  return (
    <div
      className={`p-5 rounded-2xl bg-[#0e1420] border transition-all duration-300 flex flex-col justify-between ${
        isWarn
          ? 'border-amber-500/50 shadow-[0_0_24px_-4px_rgba(245,158,11,0.22)]'
          : 'border-[#1e293b] hover:border-slate-700'
      } card-glow`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className="font-bold text-sm text-white truncate"
              title={account.name}
            >
              {account.name}
            </h3>
            <div className="text-xs text-[#64748b] mt-0.5 font-mono truncate">
              {account.email} &bull;{' '}
              <span className="text-blue-400 font-sans font-medium">
                {account.tier}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                isWarn
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {isWarn ? 'WARNING' : 'ACTIVE'}
            </span>
            <button
              className="text-[#64748b] hover:text-slate-300 p-0.5 transition cursor-pointer"
              title="View Profile Details"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* API Key Pill */}
        <div className="mt-3.5 py-1.5 px-3 bg-[#080c14] border border-[#1a2333] rounded-lg flex items-center justify-between text-xs font-mono text-[#94a3b8] group/key">
          <span className="text-[11px] truncate tracking-wide">
            {account.apiKey}
          </span>
          <button
            onClick={handleCopy}
            className="text-[#64748b] hover:text-white p-1 rounded transition cursor-pointer shrink-0 ml-2"
            title="Copy API Key"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 group-hover/key:text-slate-300" />
            )}
          </button>
        </div>

        {/* Metric 1: Monthly Tokens */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#94a3b8] font-medium flex items-center gap-1.5">
              <Sparkles
                className={`w-3 h-3 ${isWarn ? 'text-amber-400' : 'text-blue-400'}`}
              />
              <span>Monthly Tokens</span>
            </span>
            <span className="font-mono font-semibold text-slate-200 text-xs">
              {account.tokensUsed.toFixed(1)}{account.tokensUnit} /{' '}
              {account.tokensMax.toFixed(1)}{account.tokensUnit} ({tokenPct}%)
            </span>
          </div>

          <div className="h-2 w-full bg-[#162030] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isWarn ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-blue-500'
              }`}
              style={{ width: `${tokenPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#64748b] mt-1 font-mono">
            <span>
              Remaining:{' '}
              {Math.max(0, account.tokensMax - account.tokensUsed).toFixed(1)}
              {account.tokensUnit}
            </span>
            <span>Resets: {account.resetsIn}</span>
          </div>
        </div>

        {/* Metric 2: Request Rate (RPM) */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#94a3b8] font-medium">Request Rate (RPM)</span>
            <span className="font-mono font-semibold text-slate-200 text-xs">
              {account.rpmCurrent} / {account.rpmMax} req/min ({rpmPct}%)
            </span>
          </div>

          <div className="h-1.5 w-full bg-[#162030] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                rpmPct > 80
                  ? 'bg-orange-400 shadow-[0_0_8px_#fb923c]'
                  : 'bg-cyan-400'
              }`}
              style={{ width: `${rpmPct}%` }}
            />
          </div>
        </div>

        {/* Split Metric: Daily Spend & Concurrent IDEs */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#1a2333]">
          <div className="bg-[#090d14]/50 p-2 rounded-lg border border-[#162030]">
            <div className="text-[10px] text-[#64748b] font-medium">
              Daily Spend
            </div>
            <div className="text-xs font-bold font-mono text-slate-200 mt-0.5">
              ${account.dailySpend.toFixed(2)}
            </div>
            <div className="text-[10px] text-[#64748b] mt-0.5 font-mono">
              Cap: ${account.dailyCap.toFixed(2)} ({spendPct}%)
            </div>
          </div>

          <div className="bg-[#090d14]/50 p-2 rounded-lg border border-[#162030]">
            <div className="text-[10px] text-[#64748b] font-medium">
              Concurrent IDEs
            </div>
            <div
              className={`text-xs font-bold font-mono mt-0.5 ${
                account.activeIdes > 0 ? 'text-blue-400' : 'text-slate-200'
              }`}
            >
              {account.activeIdes} / {account.maxIdes} active
            </div>
            <div className="text-[10px] text-[#64748b] mt-0.5 font-mono">
              {Math.max(0, account.maxIdes - account.activeIdes)} slots available
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-[#64748b] pt-4 mt-3 border-t border-[#1a2333]">
        <span>{account.instancesLinked} instances linked</span>
        <button
          onClick={handleReset}
          disabled={isResetting}
          className="hover:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-[11px]"
          title="Reset quota usage counters for this billing cycle"
        >
          <RefreshCw
            className={`w-3 h-3 ${isResetting ? 'animate-spin text-blue-400' : ''}`}
          />
          <span>Reset Cycle</span>
        </button>
      </div>
    </div>
  );
};
