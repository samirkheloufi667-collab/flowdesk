'use client';

import { useRef } from 'react';
import { gsap, prefersReducedMotion, SplitText, useGSAP } from './gsap';

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';

/**
 * Révèle un texte ligne par ligne : chaque ligne monte depuis sous un masque,
 * comme une composition qui se met en place. Le découpage est refait si la
 * largeur change (autoSplit), pour que les lignes restent justes au redimensionnement.
 */
export function RevealText({
  as: Component = 'h1',
  children,
  className,
  delay = 0,
  onScroll = false,
}: {
  as?: Tag;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Déclenche la révélation à l'entrée dans l'écran plutôt qu'au chargement. */
  onScroll?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      SplitText.create(ref.current, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'line',
        autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 115,
            duration: 1.25,
            stagger: 0.09,
            delay,
            scrollTrigger: onScroll ? { trigger: ref.current, start: 'top 85%', once: true } : undefined,
          });
        },
      });
    },
    { scope: ref },
  );

  return (
    <Component ref={ref as never} className={className}>
      {children}
    </Component>
  );
}
