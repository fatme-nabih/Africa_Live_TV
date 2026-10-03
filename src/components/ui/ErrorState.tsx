import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { cn } from './cn';

/** Erreur annoncée aux lecteurs d'écran. Le rouge reste réservé aux alertes. */
export function ErrorState({
  title = 'Signal interrompu',
  description,
  onRetry,
  retryLabel = 'Réessayer',
  action,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-start gap-3 rounded-card border border-al-red/40 bg-al-red/5 p-4 sm:p-5', className)}
    >
      <div className="flex items-start gap-3">
        <TriangleAlert size={20} className="mt-0.5 shrink-0 text-al-red-soft" aria-hidden="true" />
        <div>
          <p className="font-display text-base font-bold text-text">{title}</p>
          {description && <p className="mt-1 text-sm leading-relaxed text-text-muted">{description}</p>}
        </div>
      </div>
      {(onRetry || action) && (
        <div className="flex flex-wrap gap-2">
          {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>{retryLabel}</Button>}
          {action}
        </div>
      )}
    </div>
  );
}
