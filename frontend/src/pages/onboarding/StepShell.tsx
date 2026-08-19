import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Consistent title / description / body / actions frame for every wizard step. */
export function StepHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-5">
      <h2>{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

/** Right-aligned action row that closes every step. */
export function StepActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5', className)}>
      {children}
    </div>
  );
}

/** Shared skeleton-free loading line for steps that fetch before rendering a form. */
export function StepLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground" role="status">
      {label}
    </div>
  );
}
