import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type CardTone = 'default' | 'raised' | 'gold';

const TONES: Record<CardTone, string> = {
  default: 'border-line bg-surface-1',
  raised: 'border-line bg-surface-2',
  gold: 'border-line-gold bg-surface-1',
};

export function Card({
  as: Tag = 'div',
  tone = 'default',
  interactive = false,
  padded = true,
  className,
  ...props
}: {
  as?: 'div' | 'section' | 'article' | 'li' | 'aside';
  tone?: CardTone;
  interactive?: boolean;
  padded?: boolean;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(
        'rounded-card border',
        TONES[tone],
        padded && 'p-4 sm:p-5',
        interactive && 'transition-colors duration-200 hover:border-line-gold hover:bg-surface-2',
        className,
      )}
      {...props}
    />
  );
}
