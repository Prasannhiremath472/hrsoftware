import { Toaster as SonnerToaster } from 'sonner';

/**
 * Sonner already renders its region with aria-live and role="status", so toasts
 * are announced without extra wiring. Styling is mapped onto the app's tokens.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      duration={4500}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group flex w-full items-start gap-3 rounded-md border border-border bg-card p-4 text-sm text-foreground shadow-lg',
          title: 'font-medium',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs font-medium',
          cancelButton: 'bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium',
          closeButton: 'border-border bg-card text-muted-foreground hover:text-foreground',
          success: 'border-success/30 [&_[data-icon]]:text-success',
          error: 'border-destructive/30 [&_[data-icon]]:text-destructive',
          warning: 'border-warning/30 [&_[data-icon]]:text-warning',
          info: 'border-info/30 [&_[data-icon]]:text-info',
        },
      }}
    />
  );
}
