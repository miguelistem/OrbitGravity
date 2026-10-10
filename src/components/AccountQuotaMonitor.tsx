import { useState } from 'react';
import { AntigravityAccount, AntigravityInstance } from '../types/antigravity';
import { formatCompactNumber, formatCurrency, formatTimeLeft } from '../utils/formatters';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  RotateCcw, 
  Plus, 
  CreditCard, 
  CheckCircle2, 
  Copy, 
  Check, 
  SlidersHorizontal 
} from 'lucide-react';

interface AccountQuotaMonitorProps {
  accounts: AntigravityAccount[];
  instances: AntigravityInstance[];
  onUpdateAccount: (account: AntigravityAccount) => void;
  onOpenAddAccountModal: () => void;
  onOpenEditAccountModal: (account: AntigravityAccount) => void;
}

export function AccountQuotaMonitor({
  accounts,
  instances,
  onUpdateAccount,
  onOpenAddAccountModal,
  onOpenEditAccountModal,
}: AccountQuotaMonitorProps) {
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const handleCopyKey = (accountId: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(accountId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleSimulateReset = (account: AntigravityAccount) => {
    onUpdateAccount({
      ...account,
      tokensUsed: 0,
      spentTodayUsd: 0,
      currentRpm: 4,
      status: 'active',
      quotaResetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
  };

  const warningAccounts = accounts.filter(
    (a) => a.tokensUsed / a.monthlyTokenAllowance >= 0.85 || a.status === 'warning' || a.status === 'throttled'
  );

  return (
    <div className="space-y-5 text-zinc-300">
      {/* Top Banner Alert if any account near limit */}
      {warningAccounts.length > 0 && (
        <div className="bg-[#1C1A14] border border-[#3D351E] rounded-lg p-3.5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-medium text-amber-300">
              Account Quota Warning ({warningAccounts.length} account{warningAccounts.length > 1 ? 's' : ''} near ceiling)
            </h4>
            <p className="text-[11px] text-[#A3997F] mt-0.5">
              {warningAccounts.map(a => a.name).join(', ')} has reached over 85% of monthly allowance. Subsequent calls may encounter rate throttling.
            </p>
          </div>
        </div>
      )}

      {/* Account Cards Grid Header */}
      <div className="flex items-center justify-between border-b border-[#212328] pb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#7D818C]" />
            Account Quotas & Limit Telemetry
          </h2>
          <p className="text-xs text-[#7D818C] mt-0.5">
            Cloud project bindings, token quotas, request-per-minute caps, and billing cycles.
          </p>
        </div>
        <button
          onClick={onOpenAddAccountModal}
          className="px-3 py-1.5 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Connect Account Profile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {accounts.map((account) => {
          const boundInstances = instances.filter((i) => i.accountId === account.id);
          const activeSessions = boundInstances.filter((i) => i.status === 'running').length;
          const tokenPercent = Math.min(100, Math.round((account.tokensUsed / account.monthlyTokenAllowance) * 100));
          const rpmPercent = Math.min(100, Math.round((account.currentRpm / account.rpmLimit) * 100));
          const budgetPercent = Math.min(100, Math.round((account.spentTodayUsd / account.dailyBudgetUsd) * 100));
          const isWarning = tokenPercent >= 85 || account.status === 'warning';

          return (
            <div
              key={account.id}
              className={`bg-[#141519] rounded-lg border p-4 transition flex flex-col justify-between ${
                isWarning
                  ? 'border-[#3D351E]'
                  : 'border-[#22242B] hover:border-[#2C2E36]'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-xs font-semibold text-zinc-100 truncate block max-w-[200px]" title={account.name}>
                      {account.name}
                    </span>
                    <div className="text-[11px] text-[#7D818C] font-mono mt-0.5 flex items-center gap-1.5">
                      <span>{account.email}</span>
                      <span>·</span>
                      <span className="text-zinc-300 font-sans">{account.tier}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono ${
                        isWarning
                          ? 'bg-[#292212] text-amber-400 border border-[#423519]'
                          : 'bg-[#18191E] text-zinc-400 border border-[#262830]'
                      }`}
                    >
                      {account.status.toUpperCase()}
                    </span>
                    <button
                      onClick={() => onOpenEditAccountModal(account)}
                      title="Configure Limits"
                      className="p-1 text-[#7D818C] hover:text-zinc-200 rounded transition cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* API Key Strip */}
                <div className="bg-[#101114] rounded px-2.5 py-1.5 border border-[#202228] mb-3.5 flex items-center justify-between text-[11px] font-mono text-[#7D818C]">
                  <span className="truncate mr-2">{account.apiKeyMasked}</span>
                  <button
                    onClick={() => handleCopyKey(account.id, account.apiKeyMasked)}
                    className="text-[#7D818C] hover:text-zinc-200 transition cursor-pointer"
                    title="Copy API Key"
                  >
                    {copiedKeyId === account.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Meters Section */}
                <div className="space-y-3 text-xs">
                  {/* Monthly Token Allowance */}
                  <div>
                    <div className="flex justify-between items-center mb-1 text-zinc-300">
                      <span className="text-[11px] text-[#7D818C]">Monthly Tokens</span>
                      <span className="font-mono text-[11px]">
                        {formatCompactNumber(account.tokensUsed)} / {formatCompactNumber(account.monthlyTokenAllowance)}{' '}
                        <span className="text-[#7D818C]">({tokenPercent}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1 bg-[#202228] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          tokenPercent >= 85 ? 'bg-amber-500' : 'bg-zinc-300'
                        }`}
                        style={{ width: `${tokenPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1 text-[10px] text-[#6B7280] font-mono">
                      <span>Remaining: {formatCompactNumber(Math.max(0, account.monthlyTokenAllowance - account.tokensUsed))}</span>
                      <span>Resets: {formatTimeLeft(account.quotaResetDate)}</span>
                    </div>
                  </div>

                  {/* RPM Rate Limit Meter */}
                  <div>
                    <div className="flex justify-between items-center mb-1 text-zinc-300">
                      <span className="text-[11px] text-[#7D818C]">Request Rate (RPM)</span>
                      <span className="font-mono text-[11px]">
                        {account.currentRpm} / {account.rpmLimit} req/min
                      </span>
                    </div>
                    <div className="w-full h-1 bg-[#202228] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-400 rounded-full"
                        style={{ width: `${rpmPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Daily Budget & Concurrent Sessions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1F2127]">
                    <div className="bg-[#101114] p-2 rounded border border-[#202228]">
                      <div className="text-[10px] text-[#7D818C] mb-0.5">Daily Spend</div>
                      <div className="font-mono text-zinc-200 text-xs font-medium">
                        {formatCurrency(account.spentTodayUsd)}
                      </div>
                      <div className="text-[10px] text-[#6B7280] mt-0.5">
                        Cap: {formatCurrency(account.dailyBudgetUsd)}
                      </div>
                    </div>

                    <div className="bg-[#101114] p-2 rounded border border-[#202228]">
                      <div className="text-[10px] text-[#7D818C] mb-0.5">Concurrent Fleet</div>
                      <div className="font-mono text-zinc-200 text-xs font-medium">
                        {activeSessions} / {account.maxConcurrentSessions} active
                      </div>
                      <div className="text-[10px] text-[#6B7280] mt-0.5">
                        {account.maxConcurrentSessions - activeSessions} available
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Actions */}
              <div className="pt-3 mt-3 border-t border-[#1F2127] flex items-center justify-between text-xs">
                <span className="text-[#6B7280] text-[11px]">
                  {boundInstances.length} instance{boundInstances.length === 1 ? '' : 's'} linked
                </span>
                <button
                  onClick={() => handleSimulateReset(account)}
                  className="px-2 py-0.5 text-[11px] text-[#7D818C] hover:text-zinc-200 hover:bg-[#1E2026] rounded transition flex items-center gap-1 cursor-pointer font-mono"
                  title="Simulate Quota Cycle Reset"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Cycle
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
