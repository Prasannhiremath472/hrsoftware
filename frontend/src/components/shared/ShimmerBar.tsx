import type { ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';

/**
 * Magic UI-inspired shimmer sweep, adapted for an indeterminate upload/processing
 * indicator rather than a marketing CTA. The sweep is a single translucent band
 * over the primary colour — no gradient stack, no glow — and it disables itself
 * under prefers-reduced-motion, falling back to a static filled bar.
 */
export function ShimmerBar({ className, label }: { className?: string; label?: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/15', className)}
      role="progressbar"
      aria-label={label ?? 'Working'}
    >
      {shouldReduceMotion ? (
        <div className="h-full w-1/3 rounded-full bg-primary" />
      ) : (
        <div className="absolute inset-y-0 -left-1/3 w-1/3 animate-shimmer rounded-full bg-primary" />
      )}
    </div>
  );
}

/**
 * A restrained take on Magic UI's "shine border" — a one-pass highlight that
 * sweeps across a surface on hover. Used only on the wizard's primary advance
 * button so it reads as an affordance, not decoration.
 */
export function ShineOnHover({ className, children }: { className?: string; children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <span className={cn('group/shine relative inline-flex overflow-hidden rounded-md', className)}>
      {children}
      {!shouldReduceMotion && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 -left-full w-1/2 skew-x-12 bg-white/20',
            'transition-transform duration-700 ease-out group-hover/shine:translate-x-[300%]'
          )}
        />
      )}
    </span>
  );
}
