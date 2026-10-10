import React, { useState } from 'react';
import { X, Shield, Plus } from 'lucide-react';
import type { CreateAccountInput } from '../types';

interface NewAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateAccountInput) => Promise<void>;
}

export const NewAccountModal: React.FC<NewAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState('Enterprise Ultra');
  const [tokensMax, setTokensMax] = useState('100');
  const [rpmMax, setRpmMax] = useState('300');
  const [dailyCap, setDailyCap] = useState('250');
  const [maxIdes, setMaxIdes] = useState('8');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an account name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        tier,
        tokensMax: parseFloat(tokensMax) || 50,
        rpmMax: parseInt(rpmMax, 10) || 120,
        dailyCap: parseFloat(dailyCap) || 100,
        maxIdes: parseInt(maxIdes, 10) || 6,
      });
      setName('');
      setEmail('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add account profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-[#0f1522] border border-[#1e293b] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-bold text-base text-white">
              Add Connected Account Profile
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#94a3b8] font-medium mb-1.5">
                Profile Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Work Team Enterprise"
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[#94a3b8] font-medium mb-1.5">
                User / Service Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. dev-cluster@company.com"
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#94a3b8] font-medium mb-1.5">
              Account Subscription Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full bg-[#080c14] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
            >
              <option value="Enterprise Ultra" className="bg-[#0e1420]">
                Enterprise Ultra (High RPM, 100M+ tokens)
              </option>
              <option value="Team Unlimited" className="bg-[#0e1420]">
                Team Unlimited (Multi-seat, 250M+ tokens)
              </option>
              <option value="Pro" className="bg-[#0e1420]">
                Pro (Personal & Research, 20M tokens)
              </option>
              <option value="Starter" className="bg-[#0e1420]">
                Starter / Dev Sandbox (5M tokens)
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#94a3b8] font-medium mb-1.5">
                Monthly Token Quota (M)
              </label>
              <input
                type="number"
                value={tokensMax}
                onChange={(e) => setTokensMax(e.target.value)}
                min="1"
                step="5"
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[#94a3b8] font-medium mb-1.5">
                Request Rate Ceiling (RPM)
              </label>
              <input
                type="number"
                value={rpmMax}
                onChange={(e) => setRpmMax(e.target.value)}
                min="10"
                step="10"
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#94a3b8] font-medium mb-1.5">
                Daily Budget Cap ($)
              </label>
              <input
                type="number"
                value={dailyCap}
                onChange={(e) => setDailyCap(e.target.value)}
                min="5"
                step="25"
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[#94a3b8] font-medium mb-1.5">
                Max Concurrent IDE Slots
              </label>
              <input
                type="number"
                value={maxIdes}
                onChange={(e) => setMaxIdes(e.target.value)}
                min="1"
                max="50"
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#94a3b8] hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Add Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
