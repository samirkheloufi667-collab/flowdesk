'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';
import { gsap, prefersReducedMotion, ScrollTrigger } from '../motion/gsap';

/**
 * Défilement doux pour la page d'accueil, synchronisé avec ScrollTrigger :
 * Lenis avance au rythme de l'horloge de GSAP, et chaque pas de défilement
 * met à jour les animations liées au scroll.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);
}
