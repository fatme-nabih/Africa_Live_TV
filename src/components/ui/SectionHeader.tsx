import type { ReactNode } from 'react';
import { cn } from './cn';

/** En-tête de section : sur-titre or, titre display, filet or, action à droite. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  as: Tag = 'h2',
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-al-gold">{eyebrow}</p>
        )}
        <Tag className="font-display text-xl font-bold leading-tight text-text sm:text-2xl">{title}</Tag>
        <span className="mt-2 block h-0.5 w-10 rounded-pill bg-al-gold" aria-hidden="true" />
        {description && <p className="mt-2 max-w-prose text-sm leading-relaxed text-text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
