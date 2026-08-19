import { Badge, type BadgeProps } from '@/components/ui/badge';
import { humanize } from '@/lib/utils';

type Tone = NonNullable<BadgeProps['variant']>;

const STATUS_MAP: Record<string, Tone> = {
  DRAFT: 'neutral',
  KYC_PENDING: 'warning',
  ADDRESS_PENDING: 'warning',
  DOCUMENT_PENDING: 'warning',
  DOCUMENT_VERIFICATION_PENDING: 'warning',
  BIOMETRIC_PENDING: 'warning',
  COMPLETED: 'success',
  REJECTED: 'destructive',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  VERIFIED: 'success',
  UPLOADED: 'info',
  CAPTURED: 'info',
  FAILED: 'destructive',
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status?: string | null;
  variant?: Tone;
}

export default function StatusBadge({ status, children, variant, ...props }: StatusBadgeProps) {
  const tone = variant || (status && STATUS_MAP[status]) || 'neutral';
  return (
    <Badge variant={tone} {...props}>
      {children || humanize(status)}
    </Badge>
  );
}
