import { useEffect, useState } from 'react';

import api, { extractErrorMessage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CandidateDocument, DocumentType } from '@/types';
import type { WizardStepProps } from './types';

interface DocumentChecklistStepProps extends WizardStepProps {
  selectedDocTypes: number[];
  setSelectedDocTypes: (ids: number[]) => void;
}

export default function DocumentChecklistStep({
  candidateId,
  selectedDocTypes,
  setSelectedDocTypes,
  goNext,
}: DocumentChecklistStepProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [existingDocs, setExistingDocs] = useState<CandidateDocument[]>([]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [typesRes, docsRes, selectionRes] = await Promise.all([
          api.get('/document-types', { params: { activeOnly: true } }),
          api.get(`/candidates/${candidateId}/documents`),
          api.get<{ data: number[] }>(`/candidates/${candidateId}/document-selection`),
        ]);
        setDocTypes(typesRes.data.data);
        setExistingDocs(docsRes.data.data);

        // Saved selection is the source of truth once it exists. First visit
        // (nothing saved yet) falls back to mandatory + already-uploaded types.
        const saved = selectionRes.data.data;
        if (saved.length > 0) {
          setSelectedDocTypes(saved);
        } else {
          const preselected = new Set<number>(docsRes.data.data.map((d: CandidateDocument) => d.document_type_id));
          typesRes.data.data.forEach((t: DocumentType) => {
            if (t.is_mandatory) preselected.add(t.id);
          });
          setSelectedDocTypes(Array.from(preselected));
        }
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Failed to load document types'));
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [candidateId]);

  const toggle = async (id: number, mandatory: boolean | 0 | 1) => {
    if (mandatory) return;
    const next = selectedDocTypes.includes(id)
      ? selectedDocTypes.filter((x) => x !== id)
      : [...selectedDocTypes, id];
    setSelectedDocTypes(next);

    // Persist immediately, matching how every other wizard step saves —
    // the checklist must survive navigating away and back.
    try {
      await api.put(`/candidates/${candidateId}/document-selection`, { documentTypeIds: next });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save selection'));
    }
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      await api.put(`/candidates/${candidateId}/document-selection`, { documentTypeIds: selectedDocTypes });
      goNext();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save selection'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div>
      <h2>Document Checklist</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Select the documents this candidate will submit. Mandatory documents are pre-selected and cannot be
        unchecked.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {docTypes.map((t) => {
          const uploaded = existingDocs.find((d) => d.document_type_id === t.id);
          return (
            <Card key={t.id} className="flex items-center gap-3 p-4">
              <Checkbox
                id={`doctype-${t.id}`}
                checked={selectedDocTypes.includes(t.id)}
                disabled={Boolean(t.is_mandatory)}
                onCheckedChange={() => toggle(t.id, t.is_mandatory)}
              />
              <Label htmlFor={`doctype-${t.id}`} className="flex w-full items-center justify-between font-normal">
                <span>
                  {t.name} {t.is_mandatory ? <span className="text-destructive">*</span> : null}
                </span>
                {uploaded && <Badge variant="info">Uploaded</Badge>}
              </Label>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between border-t border-border pt-5 mt-5">
        <span />
        <Button type="button" onClick={handleContinue} loading={saving} disabled={selectedDocTypes.length === 0}>
          Continue to Upload
        </Button>
      </div>
    </div>
  );
}
