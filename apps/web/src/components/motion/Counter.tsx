'use client';

import { useRef } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from './gsap';

const fmt = new Intl.NumberFormat('fr-FR');

/** Nombre qui défile jusqu'à sa valeur ; repart de la valeur précédente quand elle change. */
export function Counter({ value, className, suffix = '' }: { value: number; className?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef({ n: 0 });

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const render = () => (el.textContent = fmt.format(Math.round(current.current.n)) + suffix);
      if (prefersReducedMotion()) {
        current.current.n = value;
        render();
        return;
      }
      gsap.to(current.current, { n: value, duration: 1.6, ease: 'power4.out', onUpdate: render });
    },
    { dependencies: [value, suffix] },
  );

  return (
    <span ref={ref} className={className} aria-label={`${value}${suffix}`}>
      0{suffix}
    </span>
  );
}
