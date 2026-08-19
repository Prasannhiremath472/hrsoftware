import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../core/spacing.dart';
import '../models/candidate.dart';
import '../models/document.dart';

/// Renders a small colored pill for a CandidateStatus or DocumentStatus,
/// matching the web app's StatusBadge component tone.
class StatusBadge extends StatelessWidget {
  final String label;
  final Color color;

  const StatusBadge({super.key, required this.label, required this.color});

  factory StatusBadge.candidate(CandidateStatus status) {
    return StatusBadge(label: candidateStatusLabel(status), color: _candidateColor(status));
  }

  factory StatusBadge.document(DocumentStatus status) {
    return StatusBadge(label: documentStatusLabel(status), color: _documentColor(status));
  }

  factory StatusBadge.coordinator(bool active) {
    return StatusBadge(
      label: active ? 'Active' : 'Inactive',
      color: active ? AppColors.success : AppColors.mutedForeground,
    );
  }

  static Color _candidateColor(CandidateStatus status) {
    switch (status) {
      case CandidateStatus.draft:
        return AppColors.mutedForeground;
      case CandidateStatus.kycPending:
      case CandidateStatus.addressPending:
      case CandidateStatus.documentPending:
      case CandidateStatus.documentVerificationPending:
      case CandidateStatus.biometricPending:
        return AppColors.warning;
      case CandidateStatus.completed:
        return AppColors.success;
      case CandidateStatus.rejected:
        return AppColors.destructive;
    }
  }

  static Color _documentColor(DocumentStatus status) {
    switch (status) {
      case DocumentStatus.uploaded:
        return AppColors.warning;
      case DocumentStatus.verified:
        return AppColors.success;
      case DocumentStatus.rejected:
        return AppColors.destructive;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: 0.1),
      ),
    );
  }
}
