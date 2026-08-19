import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';

import api, { buildAuthedUrl, extractErrorMessage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import StatusBadge from '@/components/shared/StatusBadge';
import type { CandidateDocument } from '@/types';
import type { WizardStepProps } from './types';

export default function DocumentVerificationStep({ candidateId, onSaved, goNext }: WizardStepProps) {
  const toast = useToast();
  const [documents, setDocuments] = useState<CandidateDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');

  const load = async () => {
    try {
      const res = await api.get(`/candidates/${candidateId}/documents`);
      setDocuments(res.data.data);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load documents'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  const viewDocument = (docId: number) => {
    window.open(buildAuthedUrl(`/documents/${docId}/view`), '_blank');
  };

  const verify = async (docId: number) => {
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

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const allResolved = documents.length > 0 && documents.every((d) => d.status !== 'UPLOADED');

  return (
    <div>
      <h2>Document Verification</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Review each uploaded document and mark it verified or rejected with a reason.
      </p>

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
                {d.status === 'REJECTED' && <div className="mt-1 text-xs text-muted-foreground">{d.reject_reason}</div>}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => viewDocument(d.id)}>
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  {d.status !== 'VERIFIED' && (
                    <Button variant="success" size="sm" onClick={() => verify(d.id)}>
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

      <div className="flex justify-between border-t border-border pt-5 mt-5">
        <span />
        <Button
          type="button"
          onClick={async () => {
            await onSaved();
            goNext();
          }}
          disabled={!allResolved}
        >
          Continue to Original Verification
        </Button>
      </div>

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
