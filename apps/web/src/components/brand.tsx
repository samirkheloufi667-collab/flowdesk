import Link from 'next/link';

/** Logotype : le nom en italique, comme un titre de journal. Pas de pictogramme. */
export function Brand({ href = '/', className = '' }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`font-serif text-[26px] leading-none tracking-[-0.01em] italic ${className}`} aria-label="FlowDesk, accueil">
      FlowDesk<span className="text-accent not-italic">.</span>
    </Link>
  );
}
