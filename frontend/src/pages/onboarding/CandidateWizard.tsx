import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Check, FileText } from 'lucide-react';

import api, { extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Candidate } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/shared/StatusBadge';

import type { CandidateDocument, DocumentType } from '@/types';
import { RESUME_STEP, STEPS, type WizardStepKey } from './wizardSteps';

import KycStep from './KycStep';
import AddressStep from './AddressStep';
import DocumentChecklistStep from './DocumentChecklistStep';
import DocumentUploadStep from './DocumentUploadStep';
import DocumentVerificationStep from './DocumentVerificationStep';
import OriginalVerificationStep from './OriginalVerificationStep';
import PhotoStep from './PhotoStep';
import BiometricStep from './BiometricStep';
import DeclarationStep from './DeclarationStep';
import SignatureStep from './SignatureStep';
import ReviewStep from './ReviewStep';

type StepState = 'done' | 'current' | 'pending';

export default function CandidateWizard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<WizardStepKey>('KYC');
  const [selectedDocTypes, setSelectedDocTypes] = useState<number[]>([]);

  const loadCandidate = useCallback(async (): Promise<Candidate | null> => {
    if (!id) return null;
    try {
      const res = await api.get<{ data: Candidate }>(`/candidates/${id}`);
      setCandidate(res.data.data);
      return res.data.data;
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load candidate'));
      navigate('/candidates');
      return null;
    }
  }, [id, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await loadCandidate();
      if (!cancelled && data) {
        setActiveStep(RESUME_STEP[data.current_step] ?? 'KYC');
      }

      // selectedDocTypes drives which document types the Upload step shows.
      // It must be seeded from server truth here — not left to reset to []
      // whenever the wizard mounts — otherwise resuming a candidate directly
      // on or after the Upload step (without revisiting the Checklist step
      // first) makes previously-selected/uploaded documents disappear even
      // though they were saved. The saved checklist selection (persisted by
      // DocumentChecklistStep) is authoritative once it exists; before that,
      // fall back to mandatory types ∪ already-uploaded types.
      if (!cancelled && id) {
        try {
          const [typesRes, docsRes, selectionRes] = await Promise.all([
            api.get<{ data: DocumentType[] }>('/document-types', { params: { activeOnly: true } }),
            api.get<{ data: CandidateDocument[] }>(`/candidates/${id}/documents`),
            api.get<{ data: number[] }>(`/candidates/${id}/document-selection`),
          ]);
          if (!cancelled) {
            if (selectionRes.data.data.length > 0) {
              setSelectedDocTypes(selectionRes.data.data);
            } else {
              const preselected = new Set<number>(docsRes.data.data.map((d) => d.document_type_id));
              typesRes.data.data.forEach((t) => {
                if (t.is_mandatory) preselected.add(t.id);
              });
              setSelectedDocTypes(Array.from(preselected));
            }
          }
        } catch {
          // Non-fatal — the Checklist/Upload steps will retry their own
          // loads and surface an error there if something is genuinely wrong.
        }
      }

      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCandidate, id]);

  const goToStep = (key: WizardStepKey) => setActiveStep(key);

  const goNext = (currentKey: WizardStepKey) => {
    const idx = STEPS.findIndex((s) => s.key === currentKey);
    if (idx >= 0 && idx < STEPS.length - 1) {
      setActiveStep(STEPS[idx + 1].key);
    }
  };

  if (loading || !candidate || !id) {
    return (
      <div>
        <Skeleton className="mb-5 h-9 w-64" />
        <div className="grid gap-5 lg:grid-cols-[248px_1fr]">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const activeIdx = STEPS.findIndex((s) => s.key === activeStep);

  const stepState = (key: WizardStepKey): StepState => {
    if (key === activeStep) return 'current';
    // "Rejected" is a candidate-level status, so a rejected application marks the
    // document-verification step rather than any individual step here.
    return STEPS.findIndex((s) => s.key === key) < activeIdx ? 'done' : 'pending';
  };

  const commonProps = {
    candidateId: id,
    candidate,
    onSaved: loadCandidate,
    goNext: () => goNext(activeStep),
  };

  const renderStep = () => {
    switch (activeStep) {
      case 'KYC':
        return <KycStep {...commonProps} />;
      case 'ADDRESS':
        return <AddressStep {...commonProps} />;
      case 'DOCUMENT_CHECKLIST':
        return (
          <DocumentChecklistStep
            {...commonProps}
            selectedDocTypes={selectedDocTypes}
            setSelectedDocTypes={setSelectedDocTypes}
          />
        );
      case 'DOCUMENT_UPLOAD':
        return <DocumentUploadStep {...commonProps} selectedDocTypes={selectedDocTypes} />;
      case 'VERIFICATION':
        return <DocumentVerificationStep {...commonProps} />;
      case 'ORIGINAL_VERIFICATION':
        return <OriginalVerificationStep {...commonProps} />;
      case 'PHOTO':
        return <PhotoStep {...commonProps} />;
      case 'LEFT_BIOMETRIC':
        return <BiometricStep {...commonProps} hand="LEFT_HAND" />;
      case 'RIGHT_BIOMETRIC':
        return <BiometricStep {...commonProps} hand="RIGHT_HAND" />;
      case 'DECLARATION':
        return <DeclarationStep {...commonProps} />;
      case 'SIGNATURE':
        return <SignatureStep {...commonProps} />;
      case 'REVIEW':
        return <ReviewStep {...commonProps} goToStep={goToStep} />;
      case 'REGISTRATION':
        return (
          <div className="space-y-3">
            <h2>Registration</h2>
            <p className="text-sm text-muted-foreground">
              Basic registration details were captured when this candidate was created.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Full Name</dt>
                <dd className="text-sm font-medium">{candidate.full_name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Mobile</dt>
                <dd className="text-sm font-medium tabular">{candidate.mobile}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
                <dd className="text-sm font-medium">{candidate.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Coordinator</dt>
                <dd className="text-sm font-medium">{candidate.coordinator_name || 'Unassigned'}</dd>
              </div>
            </dl>
            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => goNext('REGISTRATION')}>
                Continue to KYC
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-3 mb-1" onClick={() => navigate('/candidates')}>
            <ArrowLeft aria-hidden="true" />
            All candidates
          </Button>
          <h1 className="truncate">{candidate.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono text-xs">{candidate.candidate_number}</span>
            <span aria-hidden="true"> · </span>
            <span className="tabular">{candidate.mobile}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={candidate.status} />
          {candidate.status === 'COMPLETED' && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/candidates/${id}/summary`)}>
              <FileText aria-hidden="true" />
              Summary
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Stepper — horizontal scroller on narrow screens, vertical rail on desktop */}
        <Card className="lg:sticky lg:top-20">
          <CardContent className="p-2 sm:p-3">
            <ol
              className="scrollbar-thin flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
              aria-label="Onboarding steps"
            >
              {STEPS.map((s, i) => {
                const state = stepState(s.key);
                return (
                  <li key={s.key} className="shrink-0 lg:w-full">
                    <button
                      type="button"
                      onClick={() => goToStep(s.key)}
                      aria-current={state === 'current' ? 'step' : undefined}
                      className={cn(
                        'flex w-full min-h-11 items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors lg:whitespace-normal',
                        state === 'current' && 'bg-primary/10 text-primary',
                        state === 'done' && 'text-foreground hover:bg-secondary',
                        state === 'pending' && 'text-muted-foreground hover:bg-secondary'
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold tabular',
                          state === 'done' && 'border-success bg-success text-success-foreground',
                          state === 'current' && 'border-primary bg-primary text-primary-foreground',
                          state === 'pending' && 'border-border bg-muted text-muted-foreground'
                        )}
                        aria-hidden="true"
                      >
                        {state === 'done' ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className="lg:hidden">{s.shortLabel}</span>
                      <span className="hidden lg:inline">{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-5 sm:p-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeStep}
                initial={shouldReduceMotion ? false : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
