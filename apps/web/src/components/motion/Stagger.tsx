'use client';

import { useRef } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from './gsap';

/**
 * Fait entrer les enfants marqués [data-reveal] l'un après l'autre.
 * `watch` relance l'animation quand la liste change (chargement des données).
 */
export function Stagger({
  children,
  className,
  watch,
  as: Component = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  watch?: unknown;
  as?: 'div' | 'ul' | 'ol' | 'section';
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const items = ref.current.querySelectorAll('[data-reveal]');
      if (!items.length) return;
      gsap.fromTo(
        items,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.045, clearProps: 'transform,opacity' },
      );
    },
    { scope: ref, dependencies: [watch] },
  );

  return (
    <Component ref={ref as never} className={className}>
      {children}
    </Component>
  );
}
