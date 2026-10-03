import type { ComponentType, ReactNode, SVGProps } from 'react';
import { AcaciaSilhouette, ElephantSilhouette, LionSilhouette } from '@/components/brand/Silhouettes';
import { cn } from './cn';

type Illustration = 'acacia' | 'elephant' | 'lion';

const ILLUSTRATIONS: Record<Illustration, ComponentType<SVGProps<SVGSVGElement>>> = {
  acacia: AcaciaSilhouette,
  elephant: ElephantSilhouette,
  lion: LionSilhouette,
};

/** État vide « hors antenne » : silhouette or à 40 %, message chaleureux, une action. */
export function EmptyState({
  illustration = 'acacia',
  title,
  description,
  action,
  className,
}: {
  illustration?: Illustration;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const Silhouette = ILLUSTRATIONS[illustration];
  return (
    <div className={cn('flex flex-col items-center px-4 py-10 text-center', className)}>
      <Silhouette className="h-24 w-auto text-al-gold opacity-40" />
      <p className="mt-5 font-display text-lg font-bold text-text">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
