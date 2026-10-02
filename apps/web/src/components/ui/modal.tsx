'use client';

import { useEffect, useRef } from 'react';

/**
 * Panneau latéral fondé sur <dialog> : le navigateur gère le piège du focus,
 * la touche Échap et l'accessibilité. Il glisse depuis la droite comme une
 * page qu'on ajoute au dossier, au lieu d'une boîte centrée.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Un clic sur le fond (hors du panneau) le ferme.
        if (e.target === ref.current) onClose();
      }}
      className={`sheet fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full border-l border-ink bg-paper p-0 text-ink ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-6 border-b border-rule px-6 pt-8 pb-5 sm:px-8">
            <h2 className="font-serif text-4xl leading-none">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="ink-link mt-2 font-mono text-[11px] tracking-[0.14em] text-muted uppercase hover:text-ink"
            >
              Fermer · Échap
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">{children}</div>
        </div>
      )}
    </dialog>
  );
}
