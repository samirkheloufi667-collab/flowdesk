'use client';

import { motion } from 'motion/react';

/**
 * Transition entre les pages de l'application : la nouvelle page monte
 * légèrement en apparaissant. Un template (et non un layout) est recréé à
 * chaque navigation, ce qui relance l'animation.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
