import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  /** Shown under the title. Keep it to one or two sentences. */
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app replacement for window.confirm. The native dialog is drawn by the
 * Android WebView outside the page, so it ignores the app's theme and ends up
 * unreadable against a dark UI.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/85 pad-overlay animate-in fade-in"
    >
      <div className="w-full max-w-sm rounded-3xl bg-stone-900 border border-stone-750 p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center justify-center w-8 h-8 rounded-xl ${
              destructive
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
            }`}
          >
            <AlertTriangle size={16} />
          </span>
          <h3 className="text-sm font-bold text-stone-100">{title}</h3>
        </div>

        <div className="text-xs text-stone-300 leading-relaxed">{message}</div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 p-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-xs font-bold text-stone-300 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 p-2.5 rounded-xl text-xs font-bold transition-colors ${
              destructive
                ? 'bg-rose-500 hover:bg-rose-400 text-stone-950'
                : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
