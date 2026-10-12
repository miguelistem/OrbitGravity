import { X, AlertTriangle, ShieldAlert, Layers } from 'lucide-react';

interface TransferErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName?: string;
  conversationTitle?: string;
  errorMessage: string;
}

export function TransferErrorModal({
  isOpen,
  onClose,
  targetName,
  conversationTitle,
  errorMessage,
}: TransferErrorModalProps) {
  if (!isOpen) return null;

  // Clean up error message if prefixed with standard Rust Err text
  let cleanMsg = errorMessage;
  if (cleanMsg.includes('Cannot transfer conversation:')) {
    cleanMsg = cleanMsg.replace(/^.*Cannot transfer conversation:\s*/i, '');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#141519] border border-[#2B2E39] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-zinc-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Top-Right 'X' button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#21232C] bg-[#16171C]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="font-semibold text-sm text-zinc-100">
                Cannot Transfer Conversation
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#7D818C] hover:text-zinc-200 hover:bg-[#1E2026] rounded transition cursor-pointer"
            title="Close popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs font-sans">
          {/* Metadata context */}
          {(targetName || conversationTitle) && (
            <div className="flex flex-wrap items-center gap-2 pb-1">
              {targetName && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#191B22] border border-[#262A36] text-[11px] text-zinc-300">
                  <Layers className="w-3 h-3 text-blue-400" />
                  <span>Target:</span>
                  <strong className="text-zinc-100 font-semibold">{targetName}</strong>
                </div>
              )}
              {conversationTitle && (
                <div className="px-2.5 py-1 rounded-md bg-[#191B22] border border-[#262A36] text-[11px] text-zinc-400 truncate max-w-[220px]">
                  <span>Thread:</span>{' '}
                  <span className="text-zinc-200 font-medium">{conversationTitle}</span>
                </div>
              )}
            </div>
          )}

          {/* Reason Card */}
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs leading-relaxed flex items-start gap-3 shadow-inner">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-rose-300">Transfer Conflict</p>
              <p className="text-[11.5px] leading-relaxed text-rose-200/90 break-words">
                {cleanMsg}
              </p>
            </div>
          </div>

          {/* Rule Guidance */}
          <div className="p-3.5 rounded-xl bg-[#171920] border border-[#232632] text-zinc-400 text-[11px] leading-relaxed space-y-1">
            <p className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>Why is this required?</span>
            </p>
            <p>
              To protect conversation history and prevent race conditions or database corruption, all instances within the receiving brain must be terminated/closed before transferring memory into them.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#21232C] bg-[#111215] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1F2229] hover:bg-[#282B34] text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
