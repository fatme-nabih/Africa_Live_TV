import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold transition-[background-color,border-color,filter,transform] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

// Cible tactile ≥ 44 px sur toutes les tailles (min-h-11 = 44 px).
const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3.5 text-xs',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-14 px-7 text-base',
};

// Jaune = UNE action principale par écran ; rouge = destructif uniquement.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-al-yellow text-black hover:brightness-110',
  secondary: 'border border-line-gold bg-surface-2 text-text hover:bg-surface-3',
  ghost: 'text-text-muted hover:bg-surface-2 hover:text-text',
  danger: 'bg-al-red text-white hover:brightness-110',
};

export function buttonClass({
  variant = 'secondary',
  size = 'md',
  block = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
} = {}) {
  return cn(BASE, SIZES[size], VARIANTS[variant], block && 'w-full', className);
}

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant,
  size,
  block,
  icon,
  className,
  type = 'button',
  children,
  ...props
}: SharedProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, className })} {...props}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  block,
  icon,
  className,
  href,
  children,
  ...props
}: SharedProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string }) {
  const classes = buttonClass({ variant, size, block, className });
  const external = /^(https?:|mailto:|tel:)/.test(href);
  if (external) {
    return (
      <a href={href} className={classes} {...props}>
        {icon}
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {icon}
      {children}
    </Link>
  );
}
