import { CheckCircle2, Fingerprint, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ScannerState = 'idle' | 'scanning' | 'success' | 'error';

interface FingerprintScannerProps {
  state: ScannerState;
  /** Seconds remaining in the capture window; shown while scanning. */
  secondsRemaining?: number;
  className?: string;
}

/**
 * Visual fingerprint-scanner indicator shown to the candidate during capture.
 *
 * This is a status *indicator*, not a preview of the captured print — an
 * Aadhaar RD Service device never releases the fingerprint image to the
 * application (it is encrypted on-device), so there is no real image to
 * render. The animation reflects genuine capture state driven by the
 * device's own responses, so what the candidate sees matches what the
 * hardware is actually doing.
 */
export default function FingerprintScanner({
  state,
  secondsRemaining,
  className,
}: FingerprintScannerProps) {
  const isScanning = state === 'scanning';

  return (
    <div
      className={cn('flex flex-col items-center', className)}
      role="status"
      aria-live="polite"
      aria-label={
        isScanning
          ? 'Scanning fingerprint, place finger on the scanner'
          : state === 'success'
            ? 'Fingerprint captured successfully'
            : state === 'error'
              ? 'Fingerprint capture failed'
              : 'Scanner ready'
      }
    >
      <div
        className={cn(
          'relative flex size-44 items-center justify-center rounded-2xl border-2 transition-colors duration-300',
          isScanning && 'border-primary bg-primary/5',
          state === 'success' && 'border-success bg-success/5',
          state === 'error' && 'border-destructive bg-destructive/5',
          state === 'idle' && 'border-dashed border-border bg-muted/40'
        )}
      >
        {/* Pulsing ring while the device waits for a finger. */}
        {isScanning && (
          <span className="absolute inset-0 animate-ping rounded-2xl border-2 border-primary/40 motion-reduce:animate-none" />
        )}

        <Fingerprint
          className={cn(
            'size-24 transition-colors duration-300',
            isScanning && 'text-primary',
            state === 'success' && 'text-success',
            state === 'error' && 'text-destructive',
            state === 'idle' && 'text-muted-foreground/50'
          )}
          strokeWidth={1.25}
          aria-hidden="true"
        />

        {/* Sweeping scan line — purely indicative of an in-progress read. */}
        {isScanning && (
          <span
            className="pointer-events-none absolute inset-x-3 h-0.5 animate-scan-sweep rounded-full bg-primary/70 motion-reduce:hidden"
            aria-hidden="true"
          />
        )}

        {state === 'success' && (
          <CheckCircle2
            className="absolute -bottom-2 -right-2 size-9 rounded-full bg-card text-success"
            aria-hidden="true"
          />
        )}
        {state === 'error' && (
          <XCircle
            className="absolute -bottom-2 -right-2 size-9 rounded-full bg-card text-destructive"
            aria-hidden="true"
          />
        )}
      </div>

      <p
        className={cn(
          'mt-4 text-center text-sm font-medium',
          isScanning && 'text-primary',
          state === 'success' && 'text-success',
          state === 'error' && 'text-destructive',
          state === 'idle' && 'text-muted-foreground'
        )}
      >
        {isScanning && (
          <>
            Place finger firmly on the scanner
            {typeof secondsRemaining === 'number' && secondsRemaining > 0 && (
              <span className="mt-1 block tabular-nums text-xs text-muted-foreground">
                {secondsRemaining}s remaining
              </span>
            )}
          </>
        )}
        {state === 'success' && 'Fingerprint captured'}
        {state === 'error' && 'Capture failed — please try again'}
        {state === 'idle' && 'Ready to scan'}
      </p>
    </div>
  );
}
