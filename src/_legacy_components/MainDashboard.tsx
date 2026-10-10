import React, { useState } from 'react';
import { Shield, Plus, AlertTriangle, X } from 'lucide-react';
import type { AccountProfile, EngineHealth } from '../types';
import { AccountCard } from './AccountCard';
import { EngineHealthCard } from './EngineHealthCard';

interface MainDashboardProps {
  accounts: AccountProfile[];
  health: EngineHealth;
  onOpenNewAccount: () => void;
  onResetCycle: (accountId: string) => void;
  onCopyKey: (key: string) => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  accounts,
  health,
  onOpenNewAccount,
  onResetCycle,
  onCopyKey,
}) => {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Check if any account is near or exceeding quota limit (> 80%)
  const warningAccounts = accounts.filter((a) => {
    const tokenPct = (a.tokensUsed / Math.max(0.1, a.tokensMax)) * 100;
    const rpmPct = (a.rpmCurrent / Math.max(1, a.rpmMax)) * 100;
    return a.status === 'warning' || tokenPct >= 80 || rpmPct >= 80;
  });

  const showWarningBanner = !bannerDismissed && warningAccounts.length > 0;
  const warnedAccountName = warningAccounts[0]?.name || 'Personal Pro - Dev & Research';

  return (
    <main className="flex-1 bg-[#090d14] flex flex-col overflow-y-auto select-none">
      {/* Account Quota Warning Banner */}
      {showWarningBanner && (
        <div className="m-5 mb-0 p-4 rounded-xl bg-amber-950/25 border border-amber-500/40 text-amber-200 flex items-start gap-3 shadow-md animate-in fade-in duration-200">
          <div className="text-amber-400 mt-0.5 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-amber-300">
              Account Quota Warning ({warningAccounts.length} account near limit)
            </div>
            <div className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              <span className="font-semibold text-amber-200">
                {warnedAccountName}
              </span>{' '}
              has exceeded 85% of monthly token allowances or is reaching request rate limits.
              New Antigravity instances bound to this account may be throttled.
            </div>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-amber-400 hover:text-amber-200 text-xs px-2 py-1 rounded hover:bg-amber-500/10 transition cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header & Controls */}
      <div className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-white tracking-tight">
              Connected Accounts &amp; Quota Telemetry
            </h1>
          </div>
          <p className="text-xs text-[#64748b] mt-1">
            Real-time local token usage, request-rate (RPM) ceilings, active sessions, and budget rollover timers.
          </p>
        </div>

        <button
          onClick={onOpenNewAccount}
          className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Account Profile</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      <div className="px-5 pb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {accounts.map((acc) => (
          <AccountCard
            key={acc.id}
            account={acc}
            onResetCycle={onResetCycle}
            onCopyKey={onCopyKey}
          />
        ))}
      </div>

      {/* Instance Activity & Storage Health Section */}
      <div className="px-5 pb-6">
        <EngineHealthCard health={health} />
      </div>
    </main>
  );
};
