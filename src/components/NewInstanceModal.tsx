import React, { useState } from 'react';
import { X, Folder, Layers, Zap } from 'lucide-react';
import type { AccountProfile, CreateInstanceInput } from '../types';

interface NewInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountProfile[];
  onSubmit: (input: CreateInstanceInput) => Promise<void>;
}

export const NewInstanceModal: React.FC<NewInstanceModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [mode, setMode] = useState<'auth-only' | 'full'>('auth-only');
  const [workspacePath, setWorkspacePath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sync initial account if empty
  const activeAccountId = accountId || accounts[0]?.id || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an instance or project name');
      return;
    }
    if (!activeAccountId) {
      setError('Please select a target account profile');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        accountId: activeAccountId,
        mode,
        workspacePath: workspacePath.trim() || undefined,
      });
      setName('');
      setWorkspacePath('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create instance');
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
              +
            </div>
            <h3 className="font-bold text-base text-white">
              Create New Antigravity Instance
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
          <div>
            <label className="block text-[#94a3b8] font-medium mb-1.5">
              Instance / Project Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NextJS-Payment-Service"
              className="w-full bg-[#080c14] border border-[#1e293b] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[#94a3b8] font-medium mb-1.5">
              Target Account Profile *
            </label>
            <select
              value={activeAccountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-[#080c14] border border-[#1e293b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-[#0e1420]">
                  {acc.name} ({acc.tier}) &bull; {acc.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#94a3b8] font-medium mb-1.5">
              Profile Isolation Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                  mode === 'auth-only'
                    ? 'bg-[#111a2c] border-blue-500/60 shadow-sm'
                    : 'bg-[#080c14] border-[#1e293b] hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="modal-mode"
                  checked={mode === 'auth-only'}
                  onChange={() => setMode('auth-only')}
                  className="mt-0.5 text-blue-500"
                />
                <div>
                  <div className="text-white font-bold text-xs flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>Auth-Only</span>
                    <span className="text-[10px] font-normal px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                      Rec
                    </span>
                  </div>
                  <div className="text-[#64748b] text-[10px] mt-1 leading-snug">
                    ~2 MB &bull; NTFS Junctions for extensions and telemetry.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                  mode === 'full'
                    ? 'bg-[#111a2c] border-blue-500/60 shadow-sm'
                    : 'bg-[#080c14] border-[#1e293b] hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="modal-mode"
                  checked={mode === 'full'}
                  onChange={() => setMode('full')}
                  className="mt-0.5 text-blue-500"
                />
                <div>
                  <div className="text-white font-bold text-xs flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-cyan-400" />
                    <span>Full Isolation</span>
                  </div>
                  <div className="text-[#64748b] text-[10px] mt-1 leading-snug">
                    ~500 MB &bull; Completely decoupled extensions and state.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[#94a3b8] font-medium mb-1.5">
              Initial Workspace Directory (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={workspacePath}
                onChange={(e) => setWorkspacePath(e.target.value)}
                placeholder="e.g. e:\Projects\MyProject"
                className="w-full bg-[#080c14] border border-[#1e293b] rounded-lg pl-8 pr-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono text-[11px]"
              />
              <Folder className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-2.5" />
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
              {isSubmitting ? 'Creating...' : 'Create Instance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
