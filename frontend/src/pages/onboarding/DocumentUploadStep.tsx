import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { CheckCircle2, Eye, FileUp, Upload } from 'lucide-react';

import api, { buildAuthedUrl, extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CandidateDocument, DocumentType } from '@/types';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import StatusBadge from '@/components/shared/StatusBadge';
import { ShimmerBar } from '@/components/shared/ShimmerBar';

import { StepActions, StepHeading, StepLoading } from './StepShell';
import type { WizardStepProps } from './wizardSteps';

const ACCEPTED = '.pdf,.jpg,.jpeg,.png';
const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

interface DocumentUploadStepProps extends WizardStepProps {
  selectedDocTypes: number[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUploadStep({
  candidateId,
  selectedDocTypes,
  onSaved,
  goNext,
}: DocumentUploadStepProps) {
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [documents, setDocuments] = useState<CandidateDocument[]>([]);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const [typesRes, docsRes] = await Promise.all([
        api.get<{ data: DocumentType[] }>('/document-types', { params: { activeOnly: true } }),
        api.get<{ data: CandidateDocument[] }>(`/candidates/${candidateId}/documents`),
      ]);
      setDocTypes(typesRes.data.data);
      setDocuments(docsRes.data.data);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load documents'));
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    load();
  }, [load]);

  // selectedDocTypes only reflects the checklist step's in-memory selection
  // for THIS visit to the wizard — it resets whenever the wizard remounts
  // (e.g. resuming a candidate from the list, or jumping to a later step
  // without revisiting the checklist first). Documents already uploaded to
  // the server are truth that must never be hidden just because the
  // checklist wasn't re-selected this session, so they're always shown here
  // regardless of what's currently in selectedDocTypes.
  const uploadedTypeIds = new Set(documents.map((d) => d.document_type_id));
  const relevantTypes = docTypes.filter((t) => selectedDocTypes.includes(t.id) || uploadedTypeIds.has(t.id));

  const handleUpload = async (typeId: number, file: File | undefined) => {
    if (!file) return;

    if (!ACCEPTED_MIME.includes(file.type)) {
      toast.error('Unsupported file type', 'Upload a PDF, JPG, or PNG file.');
      return;
    }

    setProgress((prev) => ({ ...prev, [typeId]: 0 }));
    try {
      const formData = new FormData();
      formData.append('documentTypeId', String(typeId));
      formData.append('file', file);

      await api.post(`/candidates/${candidateId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (!event.total) return;
          setProgress((prev) => ({ ...prev, [typeId]: Math.round((event.loaded / event.total!) * 100) }));
        },
      });
      toast.success('Document uploaded');
      await load();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Upload failed'));
    } finally {
      setProgress((prev) => {
        const next = { ...prev };
        delete next[typeId];
        return next;
      });
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>, typeId: number) => {
    e.preventDefault();
    setDragOver(null);
    handleUpload(typeId, e.dataTransfer.files?.[0]);
  };

  if (loading) return <StepLoading />;

  const allUploaded =
    relevantTypes.length > 0 && relevantTypes.every((t) => documents.some((d) => d.document_type_id === t.id));

  return (
    <div>
      <StepHeading
        title="Document Upload"
        description="Upload a PDF, JPG, or PNG file for each selected document type. Drag a file onto a row or use the button."
      />

      <div className="space-y-3">
        {relevantTypes.map((t) => {
          const doc = documents.find((d) => d.document_type_id === t.id);
          const pct = progress[t.id];
          const isUploading = pct !== undefined;

          return (
            <div
              key={t.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(t.id);
              }}
              onDragLeave={() => setDragOver((cur) => (cur === t.id ? null : cur))}
              onDrop={(e) => onDrop(e, t.id)}
              className={cn(
                'rounded-md border border-border bg-card p-4 transition-colors',
                dragOver === t.id && 'border-primary bg-primary/5',
                doc && 'border-l-2 border-l-success'
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {doc ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <FileUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="text-sm font-medium">{t.name}</span>
                    {Boolean(t.is_mandatory) && (
                      <span className="text-destructive" aria-label="required">
                        *
                      </span>
                    )}
                  </div>

                  {doc ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-6 text-sm text-muted-foreground">
                      <span className="max-w-56 truncate" title={doc.original_filename}>
                        {doc.original_filename}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular">{formatBytes(doc.file_size_bytes)}</span>
                      <StatusBadge status={doc.status} />
                    </div>
                  ) : (
                    <p className="mt-1.5 text-sm text-muted-foreground">Not uploaded yet</p>
                  )}

                  {isUploading && (
                    <div className="mt-3">
                      {/* Once the bytes are sent, the server is still storing/scanning —
                          an indeterminate shimmer is honest about that phase. */}
                      {pct < 100 ? (
                        <Progress value={pct} aria-label={`Uploading ${t.name}`} />
                      ) : (
                        <ShimmerBar label={`Processing ${t.name}`} />
                      )}
                      <p className="mt-1 text-xs tabular text-muted-foreground">
                        {pct < 100 ? `${pct}%` : 'Processing…'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {doc && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(buildAuthedUrl(`/documents/${doc.id}/view`), '_blank')}
                    >
                      <Eye aria-hidden="true" />
                      View
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    loading={isUploading}
                    onClick={() => fileInputRefs.current[t.id]?.click()}
                  >
                    {!isUploading && <Upload aria-hidden="true" />}
                    {isUploading ? 'Uploading…' : doc ? 'Replace' : 'Upload'}
                  </Button>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[t.id] = el;
                    }}
                    type="file"
                    accept={ACCEPTED}
                    className="sr-only"
                    aria-label={`Upload ${t.name}`}
                    disabled={isUploading}
                    onChange={(e) => {
                      handleUpload(t.id, e.target.files?.[0]);
                      // Reset so re-picking the same file still fires a change event.
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <StepActions className="mt-5">
        {!allUploaded && (
          <p className="mr-auto text-sm text-muted-foreground">Upload every selected document to continue.</p>
        )}
        <Button
          type="button"
          disabled={!allUploaded}
          onClick={async () => {
            await onSaved();
            goNext();
          }}
        >
          Continue to Verification
        </Button>
      </StepActions>
    </div>
  );
}
