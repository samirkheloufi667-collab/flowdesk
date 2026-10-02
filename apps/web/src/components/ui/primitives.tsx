'use client';

import { forwardRef } from 'react';
import { initials } from '@/lib/format';
import { RevealText } from '../motion/RevealText';

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
export { cx };

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/*
 * Boutons rectangulaires, comme des étiquettes de composition. Le bouton
 * principal est à l'encre ; au survol, une bande outremer le remplit depuis
 * la gauche (pseudo-élément), plutôt qu'un simple changement de teinte.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper before:bg-accent hover:text-paper',
  secondary: 'border border-ink/80 text-ink before:bg-ink hover:text-paper',
  ghost: 'text-ink-2 before:bg-paper-3 hover:text-ink',
  danger: 'border border-late text-late before:bg-late hover:text-paper',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
}

export const buttonClass = (variant: ButtonVariant = 'primary', size: 'sm' | 'md' = 'md', className?: string) =>
  cx(
    'group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-medium tracking-tight transition-colors duration-300',
    "before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:transition-transform before:duration-500 before:ease-[var(--ease-out-expo)] before:content-[''] hover:before:scale-x-100",
    'disabled:pointer-events-none disabled:opacity-40',
    size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-11 px-5 text-[15px]',
    VARIANTS[variant],
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading && <span className="size-3 animate-spin rounded-full border border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
});

/* Champs « soulignés » : une seule ligne d'encre, qui devient bleue au focus. */
const fieldBase =
  'w-full border-0 border-b border-rule-strong bg-transparent px-0 text-[15px] text-ink placeholder:text-faint ' +
  'transition-colors hover:border-ink-2 focus:border-accent focus:outline-none focus:ring-0';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(fieldBase, 'h-11', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cx(fieldBase, 'min-h-28 resize-y py-2 leading-relaxed', className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...rest },
  ref,
) {
  return <select ref={ref} className={cx(fieldBase, 'h-11 cursor-pointer pr-6', className)} {...rest} />;
});

/** Étiquette de champ en petites capitales à chasse fixe. */
export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
        {label}
      </label>
      {children}
      {hint && <p className="pt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

/**
 * Marqueur typographique : un losange de couleur et un mot, sans pastille de
 * fond. Remplace les badges arrondis.
 */
export function Badge({ color, children, className }: { color?: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.08em] uppercase', className)} style={{ color: color ?? 'var(--color-muted)' }}>
      <span aria-hidden className="inline-block size-[6px] rotate-45" style={{ background: color ?? 'currentColor' }} />
      {children}
    </span>
  );
}

/** Initiales en italique, sur un rond de papier. Pas de dégradé. */
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-rule-strong bg-paper-2 font-serif text-ink-2 italic"
      style={{ width: size, height: size, fontSize: size * 0.46 }}
    >
      {initials(name)}
    </span>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="border-l-2 border-late py-1 pl-3 text-sm text-late">
      {children}
    </p>
  );
}

export function Spinner({ label = 'Chargement' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-16 font-mono text-xs tracking-[0.12em] text-muted uppercase" role="status">
      <span className="relative h-px w-16 overflow-hidden bg-rule">
        <span className="absolute inset-y-0 left-0 w-1/3 animate-[loader_1.1s_ease-in-out_infinite] bg-ink" />
      </span>
      {label}
      <style>{'@keyframes loader{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'}</style>
    </div>
  );
}

/** État vide : une phrase en italique, pas d'icône dans un carré. */
export function EmptyState({ title, text, action }: { icon?: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="border-y border-rule py-14">
      <p className="font-serif text-3xl text-ink italic">{title}</p>
      <p className="mt-2 max-w-md text-[15px] text-muted">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Filet de progression : 1 px de haut, rempli à l'encre (ou à la couleur donnée). */
export function Progress({ value, color = 'var(--color-ink)' }: { value: number; color?: string }) {
  return (
    <div className="relative h-px w-full bg-rule" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="absolute inset-y-[-1px] left-0 transition-[width] duration-1000 ease-[var(--ease-out-expo)]" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
}

/**
 * En-tête de page à la manière d'une rubrique : numéro de section, grand titre
 * révélé ligne par ligne, puis un filet.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  index,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  index?: string;
}) {
  return (
    <header className="border-b border-ink pb-6">
      {index && <p className="mb-4 font-mono text-[11px] tracking-[0.16em] text-muted uppercase">{index}</p>}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <RevealText as="h1" className="font-serif text-5xl leading-[0.95] tracking-[-0.01em] sm:text-6xl lg:text-7xl">
            {title}
          </RevealText>
          {subtitle && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Petit titre de section : capitales à chasse fixe et filet. */
export function SectionLabel({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-2">
      <h2 className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">{children}</h2>
      {aside && <div className="font-mono text-[11px] tracking-[0.08em] text-faint uppercase">{aside}</div>}
    </div>
  );
}

/** Choix d'une encre : des carrés pleins ; celui retenu pivote en losange. */
export function InkPicker({ colors, value, onChange, legend = 'Encre' }: { colors: string[]; value: string; onChange: (c: string) => void; legend?: string }) {
  return (
    <fieldset>
      <legend className="mb-3 font-mono text-[11px] tracking-[0.12em] text-muted uppercase">{legend}</legend>
      <div className="flex flex-wrap gap-3">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cx('size-8 transition-transform duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-0.5', value === c ? 'scale-75 rotate-45' : 'rotate-0')}
            style={{ background: c }}
            aria-label={`Encre ${c}`}
            aria-pressed={value === c}
          />
        ))}
      </div>
    </fieldset>
  );
}
