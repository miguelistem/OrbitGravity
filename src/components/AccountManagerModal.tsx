import { useState, useEffect } from 'react';
import { AntigravityAccount } from '../types/antigravity';
import { X, ShieldCheck } from 'lucide-react';

interface AccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: AntigravityAccount) => void;
  initialAccount?: AntigravityAccount | null;
}

export function AccountManagerModal({
  isOpen,
  onClose,
  onSave,
  initialAccount,
}: AccountManagerModalProps) {
  const isEditing = !!initialAccount;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<AntigravityAccount['tier']>('Pro');
  const [monthlyTokenAllowance, setMonthlyTokenAllowance] = useState(20_000_000);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [rpmLimit, setRpmLimit] = useState(120);
  const [maxConcurrentSessions, setMaxConcurrentSessions] = useState(6);
  const [dailyBudgetUsd, setDailyBudgetUsd] = useState(50);
  const [spentTodayUsd, setSpentTodayUsd] = useState(0);
  const [apiKeyMasked, setApiKeyMasked] = useState('ag_live_' + Math.random().toString(36).substring(2, 8) + '••••42a1');

  useEffect(() => {
    if (initialAccount) {
      setName(initialAccount.name);
      setEmail(initialAccount.email);
      setTier(initialAccount.tier);
      setMonthlyTokenAllowance(initialAccount.monthlyTokenAllowance);
      setTokensUsed(initialAccount.tokensUsed);
      setRpmLimit(initialAccount.rpmLimit);
      setMaxConcurrentSessions(initialAccount.maxConcurrentSessions);
      setDailyBudgetUsd(initialAccount.dailyBudgetUsd);
      setSpentTodayUsd(initialAccount.spentTodayUsd);
      setApiKeyMasked(initialAccount.apiKeyMasked);
    } else {
      setName('New Account Profile');
      setEmail('engineer@corp.internal');
      setTier('Pro');
      setMonthlyTokenAllowance(50_000_000);
      setTokensUsed(5_000_000);
      setRpmLimit(150);
      setMaxConcurrentSessions(8);
      setDailyBudgetUsd(100);
      setSpentTodayUsd(12.50);
      setApiKeyMasked('ag_live_' + Math.random().toString(36).substring(2, 8) + '••••88c2');
    }
  }, [initialAccount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AntigravityAccount = {
      id: initialAccount ? initialAccount.id : `acc-${Date.now()}`,
      name: name.trim() || 'Account Profile',
      email: email.trim() || 'user@corp.internal',
      tier,
      monthlyTokenAllowance: Number(monthlyTokenAllowance),
      tokensUsed: Number(tokensUsed),
      rpmLimit: Number(rpmLimit),
      currentRpm: initialAccount?.currentRpm || 12,
      maxConcurrentSessions: Number(maxConcurrentSessions),
      dailyBudgetUsd: Number(dailyBudgetUsd),
      spentTodayUsd: Number(spentTodayUsd),
      quotaResetDate: initialAccount?.quotaResetDate || new Date(Date.now() + 30 * 86400000).toISOString(),
      status: tokensUsed / monthlyTokenAllowance >= 0.85 ? 'warning' : 'active',
      apiKeyMasked,
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#121316] border border-[#23252C] rounded-xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden text-zinc-300">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#212328] flex items-center justify-between bg-[#15161A]">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#7D818C]" />
              {isEditing ? `Account Limits: ${name}` : 'Connect Account Profile'}
            </h2>
            <p className="text-[11px] text-[#7D818C] mt-0.5">
              Token allowances, rate limits, and spend caps.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#7D818C] hover:text-zinc-200 hover:bg-[#1E2026] rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Account Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production Cluster"
                className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Email / Team</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. dev@corp.internal"
                className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as any)}
                className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-xs"
              >
                <option value="Starter">Starter (Sandbox)</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise Ultra">Enterprise Ultra</option>
                <option value="Team Unlimited">Team Unlimited</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">API Key</label>
              <input
                type="text"
                value={apiKeyMasked}
                onChange={(e) => setApiKeyMasked(e.target.value)}
                className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#212328] grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Monthly Token Allowance</label>
              <input
                type="number"
                min="1000000"
                step="1000000"
                value={monthlyTokenAllowance}
                onChange={(e) => setMonthlyTokenAllowance(Number(e.target.value))}
                className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Current Tokens Used</label>
              <input
                type="number"
                min="0"
                value={tokensUsed}
                onChange={(e) => setTokensUsed(Number(e.target.value))}
                className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#212328]">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">RPM Limit</label>
              <input
                type="number"
                min="10"
                value={rpmLimit}
                onChange={(e) => setRpmLimit(Number(e.target.value))}
                className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Max Sessions</label>
              <input
                type="number"
                min="1"
                value={maxConcurrentSessions}
                onChange={(e) => setMaxConcurrentSessions(Number(e.target.value))}
                className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Daily Cap ($)</label>
              <input
                type="number"
                min="5"
                value={dailyBudgetUsd}
                onChange={(e) => setDailyBudgetUsd(Number(e.target.value))}
                className="w-full bg-[#0F1012] border border-[#23252C] rounded-md px-3 py-1.5 text-zinc-200 font-mono text-xs"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[#212328] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[#17181D] hover:bg-[#202128] text-zinc-300 rounded text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-1.5 bg-[#1A56DB] hover:bg-[#1E62F0] text-white rounded text-xs font-medium transition cursor-pointer"
            >
              {isEditing ? 'Save Limits' : 'Connect Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
