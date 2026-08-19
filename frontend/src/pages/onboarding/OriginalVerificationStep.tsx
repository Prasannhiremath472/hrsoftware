import { useEffect, useState } from 'react';

import api, { extractErrorMessage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { WizardStepProps } from './types';

export default function OriginalVerificationStep({ candidateId, onSaved, goNext }: WizardStepProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalsVerified, setOriginalsVerified] = useState(false);
  const [selfAttestedReceived, setSelfAttestedReceived] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/candidates/${candidateId}/original-verification`);
        if (res.data.data) {
          setOriginalsVerified(Boolean(res.data.data.originals_verified));
          setSelfAttestedReceived(Boolean(res.data.data.self_attested_received));
        }
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Failed to load'));
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [candidateId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/candidates/${candidateId}/original-verification`, { originalsVerified, selfAttestedReceived });
      toast.success('Original verification saved');
      await onSaved();
      goNext();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div>
      <h2>Original Document Verification (Office Use Only)</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        To be completed by staff after physically verifying original documents against uploaded copies.
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="originalsVerified"
            checked={originalsVerified}
            onCheckedChange={(v) => setOriginalsVerified(Boolean(v))}
          />
          <Label htmlFor="originalsVerified" className="font-normal">
            Originals verified
          </Label>
        </div>
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="selfAttested"
            checked={selfAttestedReceived}
            onCheckedChange={(v) => setSelfAttestedReceived(Boolean(v))}
          />
          <Label htmlFor="selfAttested" className="font-normal">
            Self-attested document copies received
          </Label>
        </div>
      </div>

      <div className="flex justify-between border-t border-border pt-5 mt-5">
        <span />
        <Button type="button" onClick={handleSave} disabled={saving || !originalsVerified || !selfAttestedReceived}>
          {saving ? 'Saving…' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}
