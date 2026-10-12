import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../api';
import { AntigravityInstance, ConversationInfo } from '../types/antigravity';
import { X, Download, Check, Sparkles, MessageSquare, ArrowRight, Loader2, Globe, Folder } from 'lucide-react';

interface ImportConversationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetInstance: AntigravityInstance;
  instances: AntigravityInstance[];
  onImportComplete: (count: number) => void;
}

export function ImportConversationsModal({
  isOpen,
  onClose,
  targetInstance,
  instances,
  onImportComplete,
}: ImportConversationsModalProps) {
  const [sourceType, setSourceType] = useState<'global' | string>('global');
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const otherInstances = instances.filter((i) => i.id !== targetInstance.id);

  // Load conversations whenever source changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);
    setSelectedIds(new Set());

    const fetchConvs = async () => {
      try {
        if (isTauri()) {
          const isGlobal = sourceType === 'global';
          let profileDir: string | null = null;
          let appType = 'antigravity_ide';
          let sourceName = 'Main Antigravity';

          if (!isGlobal) {
            const found = instances.find((i) => i.id === sourceType);
            if (found) {
              profileDir = found.profileDir || null;
              appType = found.appType || 'antigravity_ide';
              sourceName = found.name;
            }
          }

          const res = await invoke<ConversationInfo[]>('list_conversations', {
            profileDir,
            appType,
            isGlobal,
            sourceName,
          });

          if (isMounted) {
            setConversations(res || []);
          }
        } else {
          // Web preview fallback
          setConversations([
            {
              id: 'demo-conv-1',
              title: 'Multigravity Pro GitHub Research',
              preview: 'Examining codebase architecture and repository forks...',
              step_count: 14,
              last_modified: new Date().toISOString(),
              source_name: sourceType === 'global' ? 'Main Antigravity' : 'Mock Instance',
            },
            {
              id: 'demo-conv-2',
              title: 'API Authentication & Token Refresh Flow',
              preview: 'Building OAuth PKCE token exchange and loopback server...',
              step_count: 8,
              last_modified: new Date().toISOString(),
              source_name: sourceType === 'global' ? 'Main Antigravity' : 'Mock Instance',
            },
          ]);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to list conversations:', err);
          setErrorMsg(err?.message || 'Could not discover conversation history.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchConvs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, sourceType]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === conversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversations.map((c) => c.id)));
    }
  };

  const handleImport = async () => {
    if (selectedIds.size === 0 && conversations.length === 0) return;
    setImporting(true);
    setErrorMsg(null);

    const isGlobal = sourceType === 'global';
    let profileDir: string | null = null;
    let appType = 'antigravity_ide';

    if (!isGlobal) {
      const found = instances.find((i) => i.id === sourceType);
      if (found) {
        profileDir = found.profileDir || null;
        appType = found.appType || 'antigravity_ide';
      }
    }

    const idsToImport = selectedIds.size > 0 ? Array.from(selectedIds) : [];

    try {
      if (isTauri()) {
        const count = await invoke<number>('import_conversations', {
          targetInstanceId: targetInstance.id,
          sourceProfileDir: profileDir,
          sourceAppType: appType,
          isGlobal,
          conversationIds: idsToImport,
        });
        onImportComplete(count);
        onClose();
      } else {
        onImportComplete(idsToImport.length || conversations.length);
        onClose();
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err?.message || 'Failed to copy conversation files.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121316] border border-[#24262F] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#21232B] flex items-center justify-between bg-[#15171C]">
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-blue-400" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Import Conversation History</h2>
              <span className="text-[11px] text-zinc-400 font-sans">
                Transfer past chat transcripts into <span className="text-zinc-200 font-medium">{targetInstance.name}</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-[#1E2028] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Selector Bar */}
        <div className="px-5 py-3 border-b border-[#21232B] bg-[#14151A] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Source Profile:</span>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="bg-[#0E0F12] border border-[#2B2E38] rounded px-2.5 py-1 text-zinc-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="global">🌐 Main Antigravity (Default Windows Profile)</option>
              {otherInstances.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  📁 {inst.name} ({inst.tag || 'Profile'})
                </option>
              ))}
            </select>
          </div>

          {conversations.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-[11px] text-blue-400 hover:text-blue-300 transition cursor-pointer font-medium"
            >
              {selectedIds.size === conversations.length ? 'Deselect All' : `Select All (${conversations.length})`}
            </button>
          )}
        </div>

        {/* Body / Conversations List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 min-h-[250px]">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span>Scanning conversation memory...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-lg text-rose-300 text-xs">
              {errorMsg}
            </div>
          ) : conversations.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-zinc-500 space-y-2 text-xs">
              <MessageSquare className="w-8 h-8 text-zinc-700" />
              <p>No conversations found in the selected source profile.</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = selectedIds.has(conv.id);
              return (
                <div
                  key={conv.id}
                  onClick={() => toggleSelect(conv.id)}
                  className={`p-3 rounded-lg border transition cursor-pointer flex items-start gap-3 select-none ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-600/60 shadow-sm'
                      : 'bg-[#16181E] border-[#22242D] hover:bg-[#1A1C24]'
                  }`}
                >
                  <div className="mt-0.5">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-zinc-600 bg-zinc-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-zinc-100 truncate">
                        {conv.title}
                      </h4>
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                        {conv.last_modified ? conv.last_modified.split('T')[0] : ''}
                      </span>
                    </div>

                    {conv.preview && (
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1 font-sans">
                        {conv.preview}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1.5 text-[9.5px] text-zinc-500 font-mono">
                      <span>ID: {conv.id.substring(0, 8)}</span>
                      <span>•</span>
                      <span>{conv.step_count} messages</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#21232B] bg-[#15171C] flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            {selectedIds.size > 0
              ? `${selectedIds.size} conversation${selectedIds.size > 1 ? 's' : ''} selected`
              : 'Select conversations to import'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#1E2028] transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleImport}
              disabled={importing || (selectedIds.size === 0 && conversations.length === 0)}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <span>Import {selectedIds.size > 0 ? `(${selectedIds.size})` : 'All'}</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
