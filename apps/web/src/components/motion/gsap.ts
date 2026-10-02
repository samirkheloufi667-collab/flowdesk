'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * Point d'entrée unique de GSAP : les plugins sont enregistrés une seule fois,
 * côté navigateur. Depuis 2025, SplitText, Flip et ScrollTrigger sont gratuits
 * et inclus dans le paquet gsap.
 */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Flip);
  gsap.defaults({ ease: 'expo.out', duration: 1 });
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export { Flip, gsap, ScrollTrigger, SplitText, useGSAP };
