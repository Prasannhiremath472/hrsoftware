import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted motion-reduce:animate-none', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Placeholder rows for a table body while data loads. */
function SkeletonRows({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9" style={{ width: `${92 - (i % 3) * 9}%` }} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Placeholder for a dashboard stat tile. */
function SkeletonStat() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-16" />
    </div>
  );
}

export { Skeleton, SkeletonRows, SkeletonStat };
