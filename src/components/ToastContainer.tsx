import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { ToastNotification } from '../types';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3 rounded-xl border shadow-xl flex items-start gap-2.5 bg-[#0f1522] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
              isSuccess
                ? 'border-emerald-500/40 text-emerald-200'
                : isWarning
                ? 'border-amber-500/40 text-amber-200'
                : isError
                ? 'border-rose-500/40 text-rose-200'
                : 'border-blue-500/40 text-slate-200'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isWarning && <AlertCircle className="w-4 h-4 text-amber-400" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {!isSuccess && !isWarning && !isError && (
                <Info className="w-4 h-4 text-blue-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs text-white">
                {toast.title}
              </div>
              <div className="text-[11px] text-[#94a3b8] mt-0.5 leading-snug">
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#64748b] hover:text-white p-0.5 rounded transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
