import Link from 'next/link';

/** Logo : un losange de flux et le nom. */
export function Brand({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span className="relative flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-teal">
        <span className="size-2.5 rotate-45 rounded-[3px] bg-ink" />
      </span>
      <span className="text-[15px]">FlowDesk</span>
    </Link>
  );
}
