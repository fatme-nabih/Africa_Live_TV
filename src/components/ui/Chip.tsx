import { X } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/** Pastille de filtre : or = sélection. Avec `onRemove`, elle devient retirable (deux boutons distincts). */
export function Chip({
  selected = false,
  onRemove,
  removeLabel = 'Retirer',
  icon,
  className,
  children,
  type = 'button',
  ...props
}: {
  selected?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  icon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const surface = selected
    ? 'border-al-gold bg-al-gold/10 text-text'
    : 'border-line bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text';
  return (
    <span className={cn('inline-flex items-center', onRemove && 'rounded-pill border border-al-gold bg-al-gold/10')}>
      <button
        type={type}
        aria-pressed={onRemove ? undefined : selected}
        className={cn(
          'inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3.5 text-xs font-semibold transition-colors duration-200 sm:min-h-9',
          onRemove ? 'border-transparent pr-2 text-text' : surface,
          className,
        )}
        {...props}
      >
        {icon}
        {children}
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="mr-1 inline-flex size-11 items-center justify-center rounded-pill text-text-muted hover:text-text sm:size-9"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
