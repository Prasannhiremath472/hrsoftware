import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {message && <p className="max-w-sm text-sm text-muted-foreground">{message}</p>}
      {action}
    </div>
  );
}
