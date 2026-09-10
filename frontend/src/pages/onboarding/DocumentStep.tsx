import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { CheckCircle2, Eye, FileUp, Upload } from 'lucide-react';

import api, { buildAuthedUrl, extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CandidateDocument, DocumentType } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import { ShimmerBar } from '@/components/shared/ShimmerBar';

import { StepActions, StepHeading, StepLoading } from './StepShell';
import type { WizardStepProps } from './wizardSteps';

const ACCEPTED = '.pdf,.jpg,.jpeg,.png';
const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];

interface DocumentStepProps extends WizardStepProps {
  selectedDocTypes: number[];
  setSelectedDocTypes: (ids: number[]) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentStep({
  candidateId,
  selectedDocTypes,
  setSelectedDocTypes,
  onSaved,
  goNext,
}: DocumentStepProps) {
  const [loading, setLoading] = useState(true);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [documents, setDocuments] = useState<CandidateDocument[]>([]);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [dragOver, setDragOver] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');

  const [originalsVerified, setOriginalsVerified] = useState(false);
  const [selfAttestedReceived, setSelfAttestedReceived] = useState(false);
  const [savingOriginals, setSavingOriginals] = useState(false);

  const load = useCallback(async () => {
    try {
      const [typesRes, docsRes, selectionRes, ovRes] = await Promise.all([
        api.get<{ data: DocumentType[] }>('/document-types', { params: { activeOnly: true } }),
        api.get<{ data: CandidateDocument[] }>(`/candidates/${candidateId}/documents`),
        api.get<{ data: number[] }>(`/candidates/${candidateId}/document-selection`),
        api.get(`/candidates/${candidateId}/original-verification`),
      ]);
      setDocTypes(typesRes.data.data);
      setDocuments(docsRes.data.data);

      const saved = selectionRes.data.data;
      if (saved.length > 0) {
        setSelectedDocTypes(saved);
      } else {
        const preselected = new Set<number>(docsRes.data.data.map((d) => d.document_type_id));
        typesRes.data.data.forEach((t) => {
          if (t.is_mandatory) preselected.add(t.id);
        });
        setSelectedDocTypes(Array.from(preselected));
      }

      if (ovRes.data.data) {
        setOriginalsVerified(Boolean(ovRes.data.data.originals_verified));
        setSelfAttestedReceived(Boolean(ovRes.data.data.self_attested_received));
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load documents'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Checklist ────────────────────────────────────────────────────────
  const toggleDocType = async (id: number, mandatory: boolean | 0 | 1) => {
    if (mandatory) return;
    const next = selectedDocTypes.includes(id)
      ? selectedDocTypes.filter((x) => x !== id)
      : [...selectedDocTypes, id];
    setSelectedDocTypes(next);
    setSavingChecklist(true);
    try {
      await api.put(`/candidates/${candidateId}/document-selection`, { documentTypeIds: next });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save selection'));
    } finally {
      setSavingChecklist(false);
    }
  };

  // ── Upload ───────────────────────────────────────────────────────────
  const uploadedTypeIds = new Set(documents.map((d) => d.document_type_id));
  const relevantTypes = docTypes.filter((t) => selectedDocTypes.includes(t.id) || uploadedTypeIds.has(t.id));
  const allUploaded =
    relevantTypes.length > 0 && relevantTypes.every((t) => documents.some((d) => d.document_type_id === t.id));

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

  // ── Verification ─────────────────────────────────────────────────────
  const allResolved = documents.length > 0 && documents.every((d) => d.status !== 'UPLOADED');

  const viewDocument = (docId: number) => {
    window.open(buildAuthedUrl(`/documents/${docId}/view`), '_blank');
  };

  const verifyDocument = async (docId: number) => {
    try {
      await api.patch(`/documents/${docId}/verify`);
      toast.success('Document verified');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to verify document'));
    }
  };

  const submitReject = async () => {
    if (reason.trim().length < 2) {
      toast.error('A rejection reason is required (at least 2 characters)');
      return;
    }
    try {
      await api.patch(`/documents/${rejecting}/reject`, { reason, comment });
      toast.success('Document rejected');
      setRejecting(null);
      setReason('');
      setComment('');
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to reject document'));
    }
  };

  // ── Original verification + continue ────────────────────────────────
  const canContinue =
    selectedDocTypes.length > 0 && allUploaded && allResolved && originalsVerified && selfAttestedReceived;

  const handleContinue = async () => {
    setSavingOriginals(true);
    try {
      await api.put(`/candidates/${candidateId}/original-verification`, {
        originalsVerified,
        selfAttestedReceived,
      });
      await onSaved();
      goNext();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save'));
    } finally {
      setSavingOriginals(false);
    }
  };

  // Lets onboarding continue when documents aren't available yet (e.g. the
  // candidate hasn't received their certificates). This only moves the
  // wizard forward — nothing here marks documents as verified, so final
  // submission still correctly blocks on missing mandatory documents via
  // the server-side check in submitValidationService.
  const handleSkip = () => {
    if (
      window.confirm(
        'Skip documents for now? You can come back and complete this step later from Final Review — mandatory documents will still be required before the application can be submitted.'
      )
    ) {
      goNext();
    }
  };

  if (loading) return <StepLoading />;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <StepHeading
          title="Documents"
          description="Select, upload, verify, and confirm original documents — all in one step."
          className="mb-0"
        />
        {!canContinue && (
          <Button type="button" variant="outline" size="sm" onClick={handleSkip}>
            Skip for now
          </Button>
        )}
      </div>

      <div className="space-y-8">
        {/* ── Checklist ──────────────────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            1. Document Checklist
          </h3>
          <p className="text-sm text-muted-foreground">
            Select the documents this candidate will submit. Mandatory documents are pre-selected and cannot be
            unchecked.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {docTypes.map((t) => {
              const uploaded = documents.find((d) => d.document_type_id === t.id);
              return (
                <Card key={t.id} className="flex items-center gap-3 p-4">
                  <Checkbox
                    id={`doctype-${t.id}`}
                    checked={selectedDocTypes.includes(t.id)}
                    disabled={Boolean(t.is_mandatory) || savingChecklist}
                    onCheckedChange={() => toggleDocType(t.id, t.is_mandatory)}
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
        </section>

        <Separator />

        {/* ── Upload ─────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            2. Document Upload
          </h3>
          <p className="text-sm text-muted-foreground">
            Upload a PDF, JPG, or PNG file for each selected document type. Drag a file onto a row or use the button.
          </p>

          {relevantTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Select at least one document above to enable uploads.</p>
          ) : (
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
                          <Button type="button" variant="outline" size="sm" onClick={() => viewDocument(doc.id)}>
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
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <Separator />

        {/* ── Verification ───────────────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            3. Document Verification
          </h3>
          <p className="text-sm text-muted-foreground">
            Review each uploaded document and mark it verified or rejected with a reason.
          </p>

          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Upload documents above before verifying them.</p>
          ) : (
            <TableWrapper className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.document_type_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{d.original_filename}</TableCell>
                      <TableCell>
                        <StatusBadge status={d.status} />
                        {d.status === 'REJECTED' && (
                          <div className="mt-1 text-xs text-muted-foreground">{d.reject_reason}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => viewDocument(d.id)}>
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          {d.status !== 'VERIFIED' && (
                            <Button variant="success" size="sm" onClick={() => verifyDocument(d.id)}>
                              Verify
                            </Button>
                          )}
                          {d.status !== 'REJECTED' && (
                            <Button variant="destructive" size="sm" onClick={() => setRejecting(d.id)}>
                              Reject
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          )}
        </section>

        <Separator />

        {/* ── Original verification ─────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            4. Original Verification (Office Use Only)
          </h3>
          <p className="text-sm text-muted-foreground">
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
        </section>
      </div>

      <StepActions className="mt-8">
        {!canContinue && (
          <p className="mr-auto text-sm text-muted-foreground">
            Complete the checklist, upload, verification, and original-verification sections above to continue.
          </p>
        )}
        {!canContinue && (
          <Button type="button" variant="outline" onClick={handleSkip}>
            Skip for now
          </Button>
        )}
        <Button type="button" onClick={handleContinue} loading={savingOriginals} disabled={!canContinue}>
          Continue to Photo
        </Button>
      </StepActions>

      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Blurry scan"
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reject-comment">Comment</Label>
              <Textarea
                id="reject-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Additional details (optional)"
                maxLength={500}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitReject}>
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
