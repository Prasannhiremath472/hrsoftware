import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/app_colors.dart';
import '../../core/spacing.dart';
import '../../core/wizard_steps.dart';
import '../../models/candidate.dart';
import '../../providers/candidate_detail_provider.dart';
import '../../routes/app_router.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/status_badge.dart';
import 'steps/address_step.dart';
import 'steps/biometric_step.dart';
import 'steps/declaration_step.dart';
import 'steps/document_checklist_step.dart';
import 'steps/document_upload_step.dart';
import 'steps/document_verification_step.dart';
import 'steps/kyc_step.dart';
import 'steps/original_verification_step.dart';
import 'steps/photo_step.dart';
import 'steps/registration_step.dart';
import 'steps/review_step.dart';
import 'steps/signature_step.dart';
import 'wizard_step_scaffold.dart';

/// Persistent wizard shell: a horizontal stepper (more mobile-appropriate
/// than the web's vertical sidebar) plus the current step's content. Every
/// step saves to the backend immediately on "Save & Continue" — there is no
/// local-only draft state held across steps.
class CandidateWizardScreen extends ConsumerStatefulWidget {
  final int candidateId;
  final String? initialStepKey;

  const CandidateWizardScreen({super.key, required this.candidateId, this.initialStepKey});

  @override
  ConsumerState<CandidateWizardScreen> createState() => _CandidateWizardScreenState();
}

class _CandidateWizardScreenState extends ConsumerState<CandidateWizardScreen> {
  WizardStepKey? _currentStep;
  final _scrollController = ScrollController();

  void _goToStep(WizardStepKey key) {
    setState(() => _currentStep = key);
    _scrollController.animateTo(0, duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
  }

  Future<void> _onSaved() async {
    ref.invalidate(candidateDetailProvider(widget.candidateId));
  }

  void _goNext() {
    final candidate = ref.read(candidateDetailProvider(widget.candidateId)).valueOrNull;
    if (candidate == null || _currentStep == null) return;
    final currentIndex = wizardStepIndex(_currentStep!);
    if (currentIndex < kWizardSteps.length - 1) {
      _goToStep(kWizardSteps[currentIndex + 1].key);
    }
  }

  @override
  Widget build(BuildContext context) {
    final candidateAsync = ref.watch(candidateDetailProvider(widget.candidateId));

    return Scaffold(
      appBar: AppBar(
        title: candidateAsync.when(
          data: (c) => Text(c.fullName, overflow: TextOverflow.ellipsis),
          loading: () => const Text('Loading…'),
          error: (_, __) => const Text('Candidate'),
        ),
        actions: [
          if (candidateAsync.hasValue)
            IconButton(
              icon: const Icon(Icons.receipt_long_rounded),
              tooltip: 'View Summary',
              onPressed: () => context.push(AppRoutes.candidateSummaryPath(widget.candidateId)),
            ),
        ],
      ),
      body: candidateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load candidate: $e',
          onRetry: () => ref.invalidate(candidateDetailProvider(widget.candidateId)),
        ),
        data: (candidate) {
          _currentStep ??= widget.initialStepKey != null
              ? (_parseStepKey(widget.initialStepKey!) ?? resumeStepFor(candidate.currentStep))
              : resumeStepFor(candidate.currentStep);

          return Column(
            children: [
              _WizardHeader(candidate: candidate, currentStep: _currentStep!, onStepTap: _goToStep),
              Expanded(
                child: SingleChildScrollView(
                  controller: _scrollController,
                  padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.xxxl),
                  child: WizardStepScaffold(
                    child: _buildStepContent(candidate),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  WizardStepKey? _parseStepKey(String raw) {
    for (final s in kWizardSteps) {
      if (s.key.name == raw || s.key.toString() == raw) return s.key;
    }
    return null;
  }

  Widget _buildStepContent(Candidate candidate) {
    final props = WizardStepProps(
      candidateId: widget.candidateId,
      candidate: candidate,
      onSaved: _onSaved,
      goNext: _goNext,
    );

    switch (_currentStep!) {
      case WizardStepKey.registration:
        return RegistrationStep(props: props, onEdited: _goNext);
      case WizardStepKey.kyc:
        return KycStep(props: props);
      case WizardStepKey.address:
        return AddressStep(props: props);
      case WizardStepKey.documentChecklist:
        return DocumentChecklistStep(props: props);
      case WizardStepKey.documentUpload:
        return DocumentUploadStep(props: props);
      case WizardStepKey.verification:
        return DocumentVerificationStep(props: props);
      case WizardStepKey.originalVerification:
        return OriginalVerificationStep(props: props);
      case WizardStepKey.photo:
        return PhotoStep(props: props);
      case WizardStepKey.leftBiometric:
        return BiometricStepScreen(props: props, hand: 'LEFT_HAND');
      case WizardStepKey.rightBiometric:
        return BiometricStepScreen(props: props, hand: 'RIGHT_HAND');
      case WizardStepKey.declaration:
        return DeclarationStep(props: props);
      case WizardStepKey.signature:
        return SignatureStep(props: props);
      case WizardStepKey.review:
        return ReviewStep(props: props, onJumpToStep: _goToStep);
    }
  }
}

/// Shared props every wizard step receives from the shell — mirrors
/// frontend/src/pages/onboarding/wizardSteps.ts WizardStepProps.
class WizardStepProps {
  final int candidateId;
  final Candidate candidate;
  final Future<void> Function() onSaved;
  final VoidCallback goNext;

  const WizardStepProps({
    required this.candidateId,
    required this.candidate,
    required this.onSaved,
    required this.goNext,
  });
}

class _WizardHeader extends StatelessWidget {
  final Candidate candidate;
  final WizardStepKey currentStep;
  final ValueChanged<WizardStepKey> onStepTap;

  const _WizardHeader({required this.candidate, required this.currentStep, required this.onStepTap});

  @override
  Widget build(BuildContext context) {
    final completedIndex = wizardStepIndex(resumeStepFor(candidate.currentStep)) - 1;
    final isRejected = candidate.status == CandidateStatus.rejected;

    return Container(
      color: AppColors.card,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    candidate.candidateNumber,
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.mutedForeground),
                  ),
                ),
                StatusBadge.candidate(candidate.status),
              ],
            ),
          ),
          SizedBox(
            height: 68,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
              itemCount: kWizardSteps.length,
              itemBuilder: (context, index) {
                final step = kWizardSteps[index];
                final isDone = index <= completedIndex && !isRejected;
                final isCurrent = step.key == currentStep;
                return _StepChip(
                  index: index + 1,
                  label: step.shortLabel,
                  isDone: isDone,
                  isCurrent: isCurrent,
                  onTap: () => onStepTap(step.key),
                );
              },
            ),
          ),
          const Divider(height: 1),
        ],
      ),
    );
  }
}

class _StepChip extends StatelessWidget {
  final int index;
  final String label;
  final bool isDone;
  final bool isCurrent;
  final VoidCallback onTap;

  const _StepChip({required this.index, required this.label, required this.isDone, required this.isCurrent, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final color = isCurrent
        ? AppColors.primary
        : isDone
            ? AppColors.success
            : AppColors.mutedForeground;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 68,
        margin: const EdgeInsets.symmetric(horizontal: 4),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: isCurrent ? color.withValues(alpha: 0.15) : (isDone ? color.withValues(alpha: 0.12) : AppColors.muted),
                shape: BoxShape.circle,
                border: Border.all(color: color, width: isCurrent ? 2 : 1),
              ),
              child: Center(
                child: isDone && !isCurrent
                    ? Icon(Icons.check_rounded, size: 14, color: color)
                    : Text('$index', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 9.5, fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500, color: color),
            ),
          ],
        ),
      ),
    );
  }
}
