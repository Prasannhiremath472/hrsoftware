import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api_exception.dart';
import '../../../core/app_colors.dart';
import '../../../core/spacing.dart';
import '../../../models/biometric.dart';
import '../../../providers/service_providers.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/error_banner.dart';
import '../../../widgets/status_badge.dart';
import '../candidate_wizard_screen.dart';
import '../wizard_step_scaffold.dart';

/// Device status indicator, capture button hitting the mock endpoint,
/// quality score display. This is purely a UI that talks to the backend's
/// mock biometric provider — there is NO real fingerprint SDK integration
/// anywhere in this app, matching BiometricStep.tsx exactly.
class BiometricStepScreen extends ConsumerStatefulWidget {
  final WizardStepProps props;
  final String hand; // 'LEFT_HAND' | 'RIGHT_HAND'

  const BiometricStepScreen({super.key, required this.props, required this.hand});

  @override
  ConsumerState<BiometricStepScreen> createState() => _BiometricStepScreenState();
}

class _BiometricStepScreenState extends ConsumerState<BiometricStepScreen> {
  BiometricDeviceStatus? _deviceStatus;
  BiometricRecord? _record;
  bool _loading = true;
  bool _capturing = false;
  String? _error;

  String get _handLabel => widget.hand == 'LEFT_HAND' ? 'Left Hand' : 'Right Hand';
  BiometricHand get _handEnum => widget.hand == 'LEFT_HAND' ? BiometricHand.leftHand : BiometricHand.rightHand;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant BiometricStepScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.hand != widget.hand) _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final service = ref.read(biometricServiceProvider);
      final results = await Future.wait([
        service.deviceStatus(),
        service.listForCandidate(widget.props.candidateId),
      ]);
      final status = results[0] as BiometricDeviceStatus;
      final records = results[1] as List<BiometricRecord>;
      setState(() {
        _deviceStatus = status;
        _record = records.where((r) => r.hand == _handEnum).cast<BiometricRecord?>().firstOrNullSafe();
      });
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to load biometric status');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _capture() async {
    setState(() => _capturing = true);
    try {
      final record = await ref.read(biometricServiceProvider).capture(widget.props.candidateId, _handEnum);
      setState(() => _record = record);
      await widget.props.onSaved();
      if (mounted) showAppSnackBar(context, '$_handLabel biometric captured');
    } catch (e) {
      if (mounted) showAppSnackBar(context, e is ApiException ? e.message : 'Capture failed', isError: true);
    } finally {
      if (mounted) setState(() => _capturing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        StepHeading(
          title: '$_handLabel Biometric Capture',
          subtitle:
              'Provider: ${_deviceStatus?.provider == 'mock' ? 'Simulated (Mock)' : _deviceStatus?.provider ?? 'unknown'} — this is a development/demo capture, not a real fingerprint scan.',
        ),
        if (_error != null) ErrorBanner(message: _error!, onRetry: _load),
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          margin: const EdgeInsets.only(bottom: AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              StatusBadge(
                label: (_deviceStatus?.connected ?? false) ? 'Device Connected' : 'Device Not Connected',
                color: (_deviceStatus?.connected ?? false) ? AppColors.success : AppColors.destructive,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  _deviceStatus?.deviceName ?? '',
                  style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        if (_record != null)
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            margin: const EdgeInsets.only(bottom: AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Capture Complete', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    StatusBadge(
                      label: _record!.verificationStatus.name.toUpperCase(),
                      color: _record!.verificationStatus == BiometricVerificationStatus.verified ? AppColors.success : AppColors.warning,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                const Text('Quality Score', style: TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: (_record!.qualityScore / 100).clamp(0, 1),
                    minHeight: 8,
                    backgroundColor: AppColors.muted,
                    valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                  ),
                ),
                const SizedBox(height: 6),
                Text('${_record!.qualityScore.toStringAsFixed(1)} / 100', style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
              ],
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
            child: EmptyState(icon: Icons.back_hand_outlined, title: 'No capture recorded yet for ${_handLabel.toLowerCase()}.'),
          ),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _capturing ? null : _capture,
            icon: _capturing
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.fingerprint_rounded, size: 18),
            label: Text(_capturing ? 'Capturing…' : (_record != null ? 'Re-capture' : 'Capture Biometric')),
          ),
        ),
        WizardStepFooter(
          onSave: _record != null
              ? () async {
                  await widget.props.onSaved();
                  widget.props.goNext();
                }
              : null,
          loading: false,
        ),
      ],
    );
  }
}

extension _FirstOrNullSafe<T> on Iterable<T?> {
  T? firstOrNullSafe() => isEmpty ? null : first;
}
