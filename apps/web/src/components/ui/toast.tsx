'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useState } from 'react';

interface Toast {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

const ToastContext = createContext<(kind: Toast['kind'], text: string) => void>(() => undefined);

/** Notifications éphémères en bas d'écran : confirmation d'une action ou erreur de l'API. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, kind, text }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border border-line bg-surface-2/95 px-4 py-3 text-sm shadow-xl shadow-black/40 backdrop-blur"
          >
            {t.kind === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0 text-teal" />
            ) : (
              <XCircle className="size-4 shrink-0 text-danger" />
            )}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
