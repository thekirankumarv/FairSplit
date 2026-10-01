import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, Undo2, X } from 'lucide-react';

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  actionLabel,
  onAction,
  duration = 4000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed left-4 right-4 z-50 flex flex-col items-center pointer-events-none"
         style={{ bottom: 'calc(var(--bottom-nav-height) + var(--inset-bottom) + 1rem)' }}>
      <div className="pointer-events-auto w-full max-w-sm flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-stone-900/95 backdrop-blur-md border border-stone-750 shadow-2xl text-stone-100 text-xs sm:text-sm animate-in slide-in-from-bottom-5 fade-in duration-200">
        <div className="flex items-center gap-2.5 truncate min-w-0">
          {type === 'success' && <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />}
          {type === 'error' && <AlertCircle size={18} className="text-rose-400 flex-shrink-0" />}
          {type === 'info' && <Info size={18} className="text-blue-400 flex-shrink-0" />}
          <span className="truncate font-semibold text-stone-200">{message}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {actionLabel && onAction && (
            <button
              onClick={() => {
                onAction();
                onClose();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors"
            >
              <Undo2 size={13} />
              <span>{actionLabel}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
