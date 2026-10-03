import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('skeleton rounded-control', className)} {...props} />;
}
