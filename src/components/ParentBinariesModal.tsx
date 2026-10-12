import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../api';
import { ParentBinaries } from '../types/antigravity';
import { X, Folder, Check, AlertTriangle, Terminal, Code, Sparkles, RefreshCw } from 'lucide-react';

interface ParentBinariesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (binaries: ParentBinaries) => void;
}

export function ParentBinariesModal({ isOpen, onClose, onSaved }: ParentBinariesModalProps) {
  const [appPath, setAppPath] = useState('');
  const [idePath, setIdePath] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (isTauri()) {
      invoke<ParentBinaries>('get_parent_binaries')
        .then((pb) => {
          if (pb) {
            setAppPath(pb.appPath || '');
            setIdePath(pb.idePath || '');
          }
        })
        .catch((err) => console.warn('Could not load parent binaries:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBrowseApp = async () => {
    if (isTauri()) {
      try {
        const selected = await invoke<string | null>('pick_executable_file', {
          title: 'Select Antigravity Desktop Executable (Antigravity.exe)',
        });
        if (selected) {
          setAppPath(selected);
        }
      } catch (err) {
        console.error('Failed to open file picker for Antigravity app:', err);
      }
    } else {
      const manual = window.prompt('Enter path to Antigravity.exe:', appPath);
      if (manual !== null) setAppPath(manual.trim());
    }
  };

  const handleBrowseIde = async () => {
    if (isTauri()) {
      try {
        const selected = await invoke<string | null>('pick_executable_file', {
          title: 'Select Antigravity IDE Executable (Antigravity IDE.exe)',
        });
        if (selected) {
          setIdePath(selected);
        }
      } catch (err) {
        console.error('Failed to open file picker for Antigravity IDE:', err);
      }
    } else {
      const manual = window.prompt('Enter path to Antigravity IDE.exe:', idePath);
      if (manual !== null) setIdePath(manual.trim());
    }
  };

  const handleAutoDetect = async () => {
    if (isTauri()) {
      try {
        const bins = await invoke<Array<{ name: string; path: string; kind: string }>>('get_available_binaries');
        const foundApp = bins.find((b) => b.kind === 'app');
        const foundIde = bins.find((b) => b.kind === 'ide');
        if (foundApp) setAppPath(foundApp.path);
        if (foundIde) setIdePath(foundIde.path);
      } catch (err) {
        console.error('Auto detect failed:', err);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      if (isTauri()) {
        const updated = await invoke<ParentBinaries>('set_parent_binaries', {
          appPath: appPath.trim() || null,
          idePath: idePath.trim() || null,
        });
        onSaved(updated);
      } else {
        onSaved({
          appPath: appPath.trim() || undefined,
          idePath: idePath.trim() || undefined,
          customConfigured: true,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save parent binaries:', err);
      setErrorMsg(err?.message || 'Could not save executable paths.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#121316] border border-[#23252C] rounded-xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden text-zinc-300">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#212328] flex items-center justify-between bg-[#16171B]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <div>
              <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                <span>Configure Parent Antigravity Binaries</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                  Black Hole Root
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#7D818C] hover:text-zinc-200 hover:bg-[#1E2026] rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          <p className="text-[11.5px] text-zinc-400 font-sans leading-relaxed">
            Specify the parent executable files for Google Antigravity on your machine. This anchors the <strong>Black Hole</strong> parent engine, avoiding heuristic disk scans and ensuring instant launching and root memory sync.
          </p>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Antigravity Desktop App */}
          <div className="space-y-1.5 p-3.5 bg-[#16171B] border border-[#23252E] rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-zinc-200 font-medium flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Antigravity App (Standalone Client)</span>
              </label>
              <span className="text-[10.5px] font-mono text-zinc-500">Antigravity.exe</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="C:\Users\...\Programs\antigravity\Antigravity.exe"
                value={appPath}
                onChange={(e) => setAppPath(e.target.value)}
                className="flex-1 bg-[#0E0F12] border border-[#262833] rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={handleBrowseApp}
                className="px-3 py-1.5 bg-[#1E2028] hover:bg-[#282B36] text-zinc-200 hover:text-white rounded-lg border border-[#2D303E] text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Folder className="w-3.5 h-3.5 text-blue-400" />
                <span>Browse...</span>
              </button>
            </div>
          </div>

          {/* Antigravity IDE */}
          <div className="space-y-1.5 p-3.5 bg-[#16171B] border border-[#23252E] rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-zinc-200 font-medium flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-blue-400" />
                <span>Antigravity IDE (VS Code-based)</span>
              </label>
              <span className="text-[10.5px] font-mono text-zinc-500">Antigravity IDE.exe</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="C:\Users\...\Programs\Antigravity IDE\Antigravity IDE.exe"
                value={idePath}
                onChange={(e) => setIdePath(e.target.value)}
                className="flex-1 bg-[#0E0F12] border border-[#262833] rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={handleBrowseIde}
                className="px-3 py-1.5 bg-[#1E2028] hover:bg-[#282B36] text-zinc-200 hover:text-white rounded-lg border border-[#2D303E] text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Folder className="w-3.5 h-3.5 text-blue-400" />
                <span>Browse...</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleAutoDetect}
              className="text-xs text-purple-400 hover:text-purple-300 transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Auto-detect default Windows paths</span>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#212328] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[#17181D] hover:bg-[#202128] text-zinc-300 rounded text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Parent Paths'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
