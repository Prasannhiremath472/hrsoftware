import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';

import api, { extractErrorMessage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AddressData, BiometricRecord, Candidate, CandidateDocument, KycData } from '@/types';

interface SummaryData {
  candidate: Candidate;
  kyc: KycData | null;
  address: AddressData | null;
  documents: CandidateDocument[];
  biometric: BiometricRecord[];
}

export default function CandidateSummary() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [candidate, kyc, address, documents, biometric] = await Promise.all([
          api.get(`/candidates/${id}`).then((r) => r.data.data),
          api
            .get(`/candidates/${id}/kyc`)
            .then((r) => r.data.data)
            .catch(() => null),
          api
            .get(`/candidates/${id}/address`)
            .then((r) => r.data.data)
            .catch(() => null),
          api
            .get(`/candidates/${id}/documents`)
            .then((r) => r.data.data)
            .catch(() => []),
          api
            .get(`/candidates/${id}/biometric`)
            .then((r) => r.data.data)
            .catch(() => []),
        ]);
        setData({ candidate, kyc, address, documents, biometric });
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Failed to load summary'));
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [id]);

  if (loading || !data) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const { candidate, kyc, address, documents, biometric } = data;

  return (
    <div className="min-h-screen bg-secondary/40 p-4 sm:p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-between gap-3 print:hidden">
        <Button asChild variant="outline">
          <Link to={`/candidates/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Wizard
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </Button>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-6 shadow-xs sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1>Candidate Onboarding Summary</h1>
            <div className="text-sm text-muted-foreground">{candidate.candidate_number}</div>
          </div>
          <Badge variant="success">{candidate.status}</Badge>
        </div>

        <Separator className="my-5" />

        <h3>Identity Details</h3>
        <div className="mb-5 mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <strong>Name:</strong> {candidate.full_name}
          </div>
          <div>
            <strong>Father&apos;s/Spouse Name:</strong> {kyc?.father_spouse_name || '-'}
          </div>
          <div>
            <strong>Gender:</strong> {kyc?.gender || candidate.gender || '-'}
          </div>
          <div>
            <strong>Marital Status:</strong> {kyc?.marital_status || '-'}
          </div>
          <div>
            <strong>Date of Birth:</strong> {kyc?.dob ? new Date(kyc.dob).toLocaleDateString() : '-'}
          </div>
          <div>
            <strong>Nationality:</strong> {kyc?.nationality || '-'}
          </div>
          <div>
            <strong>PAN:</strong> {kyc?.pan_number || '-'}
          </div>
          <div>
            <strong>Aadhaar:</strong> {kyc?.aadhaar_number || '-'}
          </div>
        </div>

        <h3>Address Details</h3>
        <div className="mb-5 mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <strong>Residence:</strong> {address?.residence_address || '-'} {address?.residence_pin_code || ''}
          </div>
          <div>
            <strong>Permanent:</strong> {address?.permanent_address || '-'} {address?.permanent_pin_code || ''}
          </div>
          <div>
            <strong>Contact Email:</strong> {address?.contact_email || candidate.email || '-'}
          </div>
          <div>
            <strong>Contact Mobile:</strong> {address?.contact_mobile || candidate.mobile || '-'}
          </div>
        </div>

        <h3>Documents</h3>
        <table className="mb-5 mt-3 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-border p-1.5 text-left">Document</th>
              <th className="border-b border-border p-1.5 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id}>
                <td className="p-1.5">{d.document_type_name}</td>
                <td className="p-1.5">{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Biometric Capture</h3>
        <div className="mb-5 mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {biometric.map((b) => (
            <div key={b.id}>
              <strong>{b.hand.replace('_', ' ')}:</strong> {b.verification_status} (quality {b.quality_score})
            </div>
          ))}
          {biometric.length === 0 && <div className="text-muted-foreground">No biometric records</div>}
        </div>

        <Separator className="my-5" />
        <p className="text-xs text-muted-foreground">
          This summary contains masked identity numbers only. No raw biometric data is included or stored beyond
          quality scores and capture references.
        </p>
      </div>
    </div>
  );
}
