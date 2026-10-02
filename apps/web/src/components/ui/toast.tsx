'use client';

import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useState } from 'react';

interface Toast {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

const ToastContext = createContext<(kind: Toast['kind'], text: string) => void>(() => undefined);

/** Notifications : une ligne d'encre en bas à gauche, qui monte puis s'efface. */
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
      <div className="pointer-events-none fixed bottom-5 left-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-col items-start gap-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, clipPath: 'inset(0 100% 0 0)' }}
              animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0% 0 0)' }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-center gap-3 bg-ink px-4 py-3 text-sm text-paper"
            >
              <span className={t.kind === 'success' ? 'font-mono text-[11px] tracking-[0.14em] text-[#9aa1ff] uppercase' : 'font-mono text-[11px] tracking-[0.14em] text-[#ff8a6b] uppercase'}>
                {t.kind === 'success' ? 'Fait' : 'Erreur'}
              </span>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
