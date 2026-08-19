import { toast as sonnerToast } from 'sonner';

/**
 * Thin wrapper over Sonner that preserves the call-site shape the app used with
 * the previous hand-rolled ToastContext: `toast.success(msg)` / `toast.error(msg)`
 * / `toast.warning(msg)` / `toast.info(msg)`.
 */
export const toast = {
  success: (message: string, description?: string) => sonnerToast.success(message, { description }),
  error: (message: string, description?: string) => sonnerToast.error(message, { description }),
  warning: (message: string, description?: string) => sonnerToast.warning(message, { description }),
  info: (message: string, description?: string) => sonnerToast.info(message, { description }),
  message: (message: string, description?: string) => sonnerToast(message, { description }),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};

export type Toast = typeof toast;

/** Hook form kept so components read the same as before. */
export function useToast(): Toast {
  return toast;
}
