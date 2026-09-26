import React from 'react';
import { CheckCircle2, Heart, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'cart' | 'wishlist' | 'info';
  title: string;
  subtitle?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between p-4 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 animate-slide-up"
        >
          <div className="flex items-center gap-3">
            {toast.type === 'cart' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'wishlist' && <Heart className="w-5 h-5 text-rose-400 fill-rose-400 shrink-0" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />}
            <div>
              <p className="text-sm font-medium tracking-wide">{toast.title}</p>
              {toast.subtitle && <p className="text-xs text-slate-400 line-clamp-1">{toast.subtitle}</p>}
            </div>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
