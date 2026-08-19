import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api_exception.dart';
import '../../../core/app_colors.dart';
import '../../../core/spacing.dart';
import '../../../core/wizard_steps.dart';
import '../../../models/address.dart';
import '../../../models/biometric.dart';
import '../../../models/document.dart';
import '../../../models/kyc.dart';
import '../../../models/misc.dart';
import '../../../providers/candidate_detail_provider.dart';
import '../../../providers/service_providers.dart';
import '../../../routes/app_router.dart';
import '../../../widgets/error_banner.dart';
import '../candidate_wizard_screen.dart';
import '../wizard_step_scaffold.dart';

/// Per-section complete/incomplete summary with tap-to-jump, Submit button
/// that calls POST /submit and surfaces server-side validation errors
/// clearly if incomplete. Server-side re-validation is authoritative —
/// this client-side summary is a convenience preview only.
class ReviewStep extends ConsumerStatefulWidget {
  final WizardStepProps props;
  final ValueChanged<WizardStepKey> onJumpToStep;

  const ReviewStep({super.key, required this.props, required this.onJumpToStep});

  @override
  ConsumerState<ReviewStep> createState() => _ReviewStepState();
}

class _ReviewSectionStatus {
  final String label;
  final bool complete;
  final WizardStepKey step;
  const _ReviewSectionStatus({required this.label, required this.complete, required this.step});
}

class _ReviewStepState extends ConsumerState<ReviewStep> {
  bool _loading = true;
  bool _submitting = false;
  String? _error;
  List<String>? _submitErrors;
  List<_ReviewSectionStatus> _sections = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final candidateId = widget.props.candidateId;
      final results = await Future.wait([
        ref.read(kycServiceProvider).get(candidateId),
        ref.read(addressServiceProvider).get(candidateId),
        ref.read(documentServiceProvider).listForCandidate(candidateId),
        ref.read(originalVerificationServiceProvider).get(candidateId),
        ref.read(photoServiceProvider).fetchBytes(candidateId),
        ref.read(biometricServiceProvider).listForCandidate(candidateId),
      ]);

      final kyc = results[0] as KycData?;
      final address = results[1] as AddressData?;
      final documents = results[2] as List<CandidateDocument>;
      final originalVerification = results[3] as OriginalVerification?;
      final photo = results[4];
      final biometrics = results[5] as List<BiometricRecord>;

      final hasLeft = biometrics.any((b) => b.hand == BiometricHand.leftHand);
      final hasRight = biometrics.any((b) => b.hand == BiometricHand.rightHand);
      final allDocsResolved = documents.isNotEmpty && documents.every((d) => d.status != DocumentStatus.uploaded);

      setState(() {
        _sections = [
          _ReviewSectionStatus(label: 'KYC Details', complete: kyc?.isCompleted ?? false, step: WizardStepKey.kyc),
          _ReviewSectionStatus(label: 'Address Details', complete: address?.isCompleted ?? false, step: WizardStepKey.address),
          _ReviewSectionStatus(label: 'Documents Uploaded', complete: documents.isNotEmpty, step: WizardStepKey.documentUpload),
          _ReviewSectionStatus(label: 'Documents Verified', complete: allDocsResolved, step: WizardStepKey.verification),
          _ReviewSectionStatus(
            label: 'Original Verification',
            complete: (originalVerification?.originalsVerified ?? false) && (originalVerification?.selfAttestedReceived ?? false),
            step: WizardStepKey.originalVerification,
          ),
          _ReviewSectionStatus(label: 'Photo Captured', complete: photo != null, step: WizardStepKey.photo),
          _ReviewSectionStatus(label: 'Left Hand Biometric', complete: hasLeft, step: WizardStepKey.leftBiometric),
          _ReviewSectionStatus(label: 'Right Hand Biometric', complete: hasRight, step: WizardStepKey.rightBiometric),
        ];
      });
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to load review summary');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _submitErrors = null;
      _error = null;
    });
    try {
      await ref.read(candidateServiceProvider).submit(widget.props.candidateId);
      ref.invalidate(candidateDetailProvider(widget.props.candidateId));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Application submitted successfully')));
        context.pushReplacement(AppRoutes.candidateSummaryPath(widget.props.candidateId));
      }
    } catch (e) {
      if (e is ApiException && e.isValidation && e.fieldErrors != null) {
        setState(() => _submitErrors = e.fieldErrors);
      } else {
        setState(() => _error = e is ApiException ? e.message : 'Failed to submit application');
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));

    final allComplete = _sections.isNotEmpty && _sections.every((s) => s.complete);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const StepHeading(title: 'Final Review', subtitle: 'Review every section before submitting. Tap any item to jump back and fix it.'),
        if (_error != null) ErrorBanner(message: _error!, onRetry: _load),
        if (_submitErrors != null && _submitErrors!.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(bottom: AppSpacing.lg),
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.destructive.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.destructive.withValues(alpha: 0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Application is incomplete:', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.destructive, fontSize: 13)),
                const SizedBox(height: 6),
                ..._submitErrors!.map((msg) => Padding(
                      padding: const EdgeInsets.only(bottom: 3),
                      child: Text('• $msg', style: const TextStyle(fontSize: 12.5, color: AppColors.destructive)),
                    )),
              ],
            ),
          ),
        ..._sections.map((section) => Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: ListTile(
                leading: Icon(
                  section.complete ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                  color: section.complete ? AppColors.success : AppColors.mutedForeground,
                ),
                title: Text(section.label, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.mutedForeground),
                onTap: () => widget.onJumpToStep(section.step),
              ),
            )),
        const SizedBox(height: AppSpacing.lg),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _submitting ? null : _submit,
            style: ElevatedButton.styleFrom(backgroundColor: allComplete ? AppColors.success : AppColors.primary),
            child: _submitting
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Submit Application'),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        const Text(
          'Submission triggers a full server-side re-validation of the application.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground),
        ),
      ],
    );
  }
}
