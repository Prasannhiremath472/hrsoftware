import { useEffect, useState } from 'react';

import api, { buildAuthedUrl, extractErrorMessage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import SignaturePad from '@/components/shared/SignaturePad';
import type { WizardStepProps } from './types';

export default function SignatureStep({ candidateId, onSaved, goNext }: WizardStepProps) {
  const toast = useToast();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    fetch(buildAuthedUrl(`/candidates/${candidateId}/signature`))
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setExistingSignature(objectUrl);
      })
      .catch(() => {
        /* no existing signature — the empty pad covers this */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [candidateId]);

  const handleSave = async () => {
    // Nothing changed — an existing signature already covers this step.
    if (!dataUrl && existingSignature) {
      goNext();
      return;
    }
    if (!dataUrl) {
      toast.error('Please sign before continuing');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/candidates/${candidateId}/signature`, { signatureBase64: dataUrl });
      toast.success('Signature saved');
      await onSaved();
      goNext();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save signature'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div>
      <h2>Signature of Applicant</h2>
      <p className="mb-5 text-sm text-muted-foreground">Use your mouse, stylus, or finger to sign in the box below.</p>

      {existingSignature && !dataUrl && (
        <div className="mb-5 max-w-md">
          <p className="mb-2 text-sm font-medium text-foreground">Previously saved signature</p>
          <div className="rounded-md border border-border bg-card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={existingSignature} alt="Existing signature" className="block max-h-32" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Sign below only if you need to replace it.</p>
        </div>
      )}

      <div className="mb-5 max-w-md">
        <SignaturePad onChange={setDataUrl} />
      </div>

      <div className="flex justify-between border-t border-border pt-5">
        <span />
        <Button type="button" onClick={handleSave} disabled={saving || (!dataUrl && !existingSignature)}>
          {saving
            ? 'Saving…'
            : dataUrl
              ? 'Accept & Continue'
              : existingSignature
                ? 'Continue'
                : 'Accept & Continue'}
        </Button>
      </div>
    </div>
  );
}
