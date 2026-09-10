import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api, { API_URL, extractErrorMessage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShineOnHover } from '@/components/shared/ShimmerBar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from '@/components/ui/table';
import type { WizardStepKey, WizardStepProps } from './types';

const SECTIONS = [
  { key: 'REGISTRATION', label: 'Registration (Identity, KYC & Address)' },
  { key: 'DOCUMENT_CHECKLIST', label: 'Documents (Checklist, Upload, Verification & Originals)' },
  { key: 'PHOTO', label: 'Photo' },
  { key: 'LEFT_BIOMETRIC', label: 'Left Hand Biometric' },
  { key: 'RIGHT_BIOMETRIC', label: 'Right Hand Biometric' },
  { key: 'DECLARATION', label: 'Declaration' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];
type Checks = Record<SectionKey, boolean | null>;

interface ReviewStepProps extends WizardStepProps {
  goToStep: (key: WizardStepKey) => void;
}

export default function ReviewStep({ candidateId, goToStep, onSaved }: ReviewStepProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const [checks, setChecks] = useState<Checks | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const [kyc, address, documents, ov, photoOk, biometric] = await Promise.all([
          api
            .get(`/candidates/${candidateId}/kyc`)
            .then((r) => r.data.data)
            .catch(() => null),
          api
            .get(`/candidates/${candidateId}/address`)
            .then((r) => r.data.data)
            .catch(() => null),
          api
            .get(`/candidates/${candidateId}/documents`)
            .then((r) => r.data.data)
            .catch(() => []),
          api
            .get(`/candidates/${candidateId}/original-verification`)
            .then((r) => r.data.data)
            .catch(() => null),
          fetch(`${API_URL}/candidates/${candidateId}/photo?token=${encodeURIComponent(token || '')}`).then((r) => r.ok),
          api
            .get(`/candidates/${candidateId}/biometric`)
            .then((r) => r.data.data)
            .catch(() => []),
        ]);

        const hands = biometric.map((b: { hand: string }) => b.hand);
        const documentsVerified =
          documents.length > 0 && documents.every((d: { status: string }) => d.status === 'VERIFIED');
        const originalsDone = Boolean(ov?.originals_verified && ov?.self_attested_received);
        setChecks({
          REGISTRATION: Boolean(kyc?.is_completed) && Boolean(address?.is_completed),
          DOCUMENT_CHECKLIST: documentsVerified && originalsDone,
          PHOTO: Boolean(photoOk),
          LEFT_BIOMETRIC: hands.includes('LEFT_HAND'),
          RIGHT_BIOMETRIC: hands.includes('RIGHT_HAND'),
          DECLARATION: null,
        });
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Failed to load review data'));
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [candidateId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/candidates/${candidateId}/submit`);
      toast.success('Application submitted successfully');
      await onSaved();
      navigate(`/candidates/${candidateId}/summary`);
    } catch (err: unknown) {
      const errors = (err as { response?: { data?: { errors?: Array<{ message: string }> } } })?.response?.data?.errors;
      if (errors?.length) {
        toast.error(`Cannot submit: ${errors.map((e) => e.message).join('; ')}`);
      } else {
        toast.error(extractErrorMessage(err, 'Submission failed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !checks) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const allDefiniteOk = SECTIONS.filter((s) => checks[s.key] !== null).every((s) => checks[s.key]);

  return (
    <div>
      <h2>Final Review</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Review each section before submitting. Click a section to jump back and edit.
      </p>

      <TableWrapper className="mb-5 rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Section</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {SECTIONS.map((s) => (
            <TableRow key={s.key}>
              <TableCell className="font-medium">{s.label}</TableCell>
              <TableCell>
                {checks[s.key] === null ? (
                  <Badge variant="neutral">Verified on submit</Badge>
                ) : checks[s.key] ? (
                  <Badge variant="success">Complete</Badge>
                ) : (
                  <Badge variant="warning">Incomplete</Badge>
                )}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => goToStep(s.key)}>
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </TableWrapper>

      {!allDefiniteOk && (
        <Alert variant="warning" className="mb-4">
          <AlertDescription>
            Some sections are incomplete. You can still attempt submission — the server will validate everything
            again.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between border-t border-border pt-5">
        <span />
        {/* Magic UI-style shine sweep — reserved for the single terminal action in the wizard. */}
        <ShineOnHover>
          <Button type="button" size="lg" onClick={handleSubmit} loading={submitting}>
            {submitting ? 'Submitting…' : 'Submit Application'}
          </Button>
        </ShineOnHover>
      </div>
    </div>
  );
}
