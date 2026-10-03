import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type BadgeVariant = 'live' | 'vlc' | 'info' | 'warn';

const VARIANTS: Record<BadgeVariant, string> = {
  live: 'border-al-green/40 bg-al-green/10 text-al-green',
  vlc: 'border-line-gold bg-al-gold/10 text-al-gold',
  info: 'border-line bg-surface-2 text-text-muted',
  warn: 'border-al-red/40 bg-al-red/10 text-al-red-soft',
};

export function Badge({
  variant = 'info',
  className,
  children,
  ...props
}: { variant?: BadgeVariant; children?: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-xs font-semibold leading-5',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {variant === 'live' && <span className="live-dot" aria-hidden="true" />}
      {children ?? (variant === 'live' ? 'En direct' : null)}
    </span>
  );
}
