import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl border p-4 text-xs font-bold shadow-xl transition-all duration-300 ${
              isSuccess
                ? 'border-emerald-100 bg-white text-emerald-950 dark:border-emerald-900/60 dark:bg-zinc-900 dark:text-emerald-300'
                : isError
                ? 'border-rose-100 bg-white text-rose-950 dark:border-rose-900/60 dark:bg-zinc-900 dark:text-rose-300'
                : 'border-gray-100 bg-white text-gray-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : isError ? (
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            ) : (
              <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            )}
            <span className="font-semibold text-xs">{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="ml-3 flex h-5 w-5 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
