import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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

const VALID_STEP_KEYS = new Set(STEPS.map((s) => s.key));

import RegistrationStep from './RegistrationStep';
import KycStep from './KycStep';
import AddressStep from './AddressStep';
import DocumentStep from './DocumentStep';
import PhotoStep from './PhotoStep';
import BiometricStep from './BiometricStep';
import DeclarationStep from './DeclarationStep';
import ReviewStep from './ReviewStep';

type StepState = 'done' | 'current' | 'pending';

export default function CandidateWizard() {
  const { id: routeId } = useParams<{ id: string }>();
  // "/candidates/new" mounts this same component with no id — a brand new
  // candidate that doesn't exist yet. isNew flips to false forever once a
  // candidate is created (see handleRegistered), without needing a route
  // change: the wizard just keeps going with the freshly-created id.
  const [newCandidateId, setNewCandidateId] = useState<string | null>(null);
  const isNew = !routeId && !newCandidateId;
  const id = routeId ?? newCandidateId ?? undefined;

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldReduceMotion = useReducedMotion();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [activeStep, setActiveStep] = useState<WizardStepKey>('REGISTRATION');
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

  // Called by RegistrationStep once it creates a brand-new candidate. The
  // wizard then continues in-place (no route change) with real data —
  // loadCandidate below picks it up once newCandidateId flows into `id`.
  const handleRegistered = useCallback((createdId: number) => {
    setNewCandidateId(String(createdId));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await loadCandidate();
      if (!cancelled && data) {
        // A `?step=` query param (e.g. from just-completed registration)
        // takes priority over the server-derived resume step, then is
        // cleared so it doesn't stick around across future visits/reloads.
        const requestedStep = searchParams.get('step');
        if (requestedStep && VALID_STEP_KEYS.has(requestedStep as WizardStepKey)) {
          setActiveStep(requestedStep as WizardStepKey);
          setSearchParams((params) => {
            params.delete('step');
            return params;
          }, { replace: true });
        } else {
          setActiveStep(RESUME_STEP[data.current_step] ?? 'KYC');
        }
      }

      // selectedDocTypes drives which document types DocumentStep's upload
      // section shows. It must be seeded from server truth here — not left
      // to reset to [] whenever the wizard mounts — otherwise resuming a
      // candidate makes previously-selected/uploaded documents disappear
      // even though they were saved. The saved checklist selection is
      // authoritative once it exists; before that, fall back to mandatory
      // types ∪ already-uploaded types.
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

  // Every step past Registration needs a real candidate id to load or save
  // anything against — so until Registration has actually created one,
  // those steps must stay unreachable rather than silently rendering blank.
  const isStepLocked = (key: WizardStepKey) => key !== 'REGISTRATION' && !candidate;

  const goToStep = (key: WizardStepKey) => {
    if (isStepLocked(key)) return;
    setActiveStep(key);
  };

  const goNext = (currentKey: WizardStepKey) => {
    const idx = STEPS.findIndex((s) => s.key === currentKey);
    // Skip over hidden steps (Registration/KYC/Address are now captured up
    // front) rather than landing on one via the forward flow.
    for (let next = idx + 1; next < STEPS.length; next += 1) {
      if (!STEPS[next].hidden) {
        setActiveStep(STEPS[next].key);
        return;
      }
    }
  };

  // In "new" mode there is no candidate yet by definition — only actual
  // loading (fetching an existing candidate) or a missing id after loading
  // finishes should show the skeleton/bail out.
  if (!isNew && (loading || !candidate || !id)) {
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

  // Progress ("done" vs "pending") is anchored to the candidate's actual
  // server-side progress, not the literal activeStep — otherwise detouring
  // into a hidden step (e.g. editing KYC from Review) would mark every
  // visible step "done" relative to that detour instead of real progress.
  const progressIdx = candidate
    ? STEPS.findIndex((s) => s.key === (RESUME_STEP[candidate.current_step] ?? activeStep))
    : 0;
  const activeIdx = STEPS.findIndex((s) => s.key === activeStep);

  const stepState = (key: WizardStepKey): StepState => {
    if (key === activeStep) return 'current';
    // "Rejected" is a candidate-level status, so a rejected application marks the
    // document-verification step rather than any individual step here.
    const keyIdx = STEPS.findIndex((s) => s.key === key);
    return keyIdx < Math.max(progressIdx, activeIdx) ? 'done' : 'pending';
  };

  const renderStep = () => {
    // Registration is the only step that can render before a candidate
    // exists (candidate/id are null in "new" mode), so it takes its own
    // props shape rather than the shared commonProps below.
    if (activeStep === 'REGISTRATION') {
      return (
        <RegistrationStep
          candidateId={id ?? null}
          candidate={candidate}
          onSaved={loadCandidate}
          goNext={() => goNext('REGISTRATION')}
          onCreated={handleRegistered}
        />
      );
    }

    // Every other step requires a real candidate — guaranteed by the guard
    // above (isNew steps never advance past REGISTRATION until one exists).
    if (!candidate || !id) return null;
    const commonProps = {
      candidateId: id,
      candidate,
      onSaved: loadCandidate,
      goNext: () => goNext(activeStep),
    };

    switch (activeStep) {
      case 'KYC':
        return <KycStep {...commonProps} />;
      case 'ADDRESS':
        return <AddressStep {...commonProps} />;
      case 'DOCUMENT_CHECKLIST':
        return (
          <DocumentStep
            {...commonProps}
            selectedDocTypes={selectedDocTypes}
            setSelectedDocTypes={setSelectedDocTypes}
          />
        );
      case 'PHOTO':
        return <PhotoStep {...commonProps} />;
      case 'LEFT_BIOMETRIC':
        return <BiometricStep {...commonProps} hand="LEFT_HAND" />;
      case 'RIGHT_BIOMETRIC':
        return <BiometricStep {...commonProps} hand="RIGHT_HAND" />;
      case 'DECLARATION':
        return <DeclarationStep {...commonProps} />;
      case 'REVIEW':
        return <ReviewStep {...commonProps} goToStep={goToStep} />;
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
          <h1 className="truncate">{candidate ? candidate.full_name : 'New Candidate'}</h1>
          <p className="text-sm text-muted-foreground">
            {candidate ? (
              <>
                <span className="font-mono text-xs">{candidate.candidate_number}</span>
                <span aria-hidden="true"> · </span>
                <span className="tabular">{candidate.mobile}</span>
              </>
            ) : (
              'Register to begin onboarding'
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {candidate && <StatusBadge status={candidate.status} />}
          {candidate?.status === 'COMPLETED' && (
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
              {STEPS.filter((s) => !s.hidden).map((s, i) => {
                const state = stepState(s.key);
                const locked = isStepLocked(s.key);
                return (
                  <li key={s.key} className="shrink-0 lg:w-full">
                    <button
                      type="button"
                      onClick={() => goToStep(s.key)}
                      disabled={locked}
                      aria-disabled={locked}
                      title={locked ? 'Complete Registration first' : undefined}
                      aria-current={state === 'current' ? 'step' : undefined}
                      className={cn(
                        'flex w-full min-h-11 items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors lg:whitespace-normal',
                        state === 'current' && 'bg-primary/10 text-primary',
                        state === 'done' && 'text-foreground hover:bg-secondary',
                        state === 'pending' && 'text-muted-foreground hover:bg-secondary',
                        locked && 'cursor-not-allowed opacity-50 hover:bg-transparent'
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
