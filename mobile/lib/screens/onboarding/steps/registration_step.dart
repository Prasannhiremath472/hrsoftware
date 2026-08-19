import 'package:flutter/material.dart';

import '../../../core/app_colors.dart';
import '../../../widgets/section_card.dart';
import '../candidate_wizard_screen.dart';
import '../wizard_step_scaffold.dart';

/// Read-only summary of the registration data already captured at
/// candidate creation time, with a "Continue" action into KYC. Editing
/// name/mobile/email lives on the Candidates list (PATCH /candidates/:id),
/// not re-litigated here.
class RegistrationStep extends StatelessWidget {
  final WizardStepProps props;
  final VoidCallback onEdited;

  const RegistrationStep({super.key, required this.props, required this.onEdited});

  @override
  Widget build(BuildContext context) {
    final candidate = props.candidate;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const StepHeading(
          title: 'Registration',
          subtitle: 'Basic details captured when this candidate was registered.',
        ),
        SectionCard(
          title: 'Candidate Details',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _InfoRow(label: 'Candidate Number', value: candidate.candidateNumber),
              _InfoRow(label: 'Full Name', value: candidate.fullName),
              _InfoRow(label: 'Mobile', value: candidate.mobile),
              _InfoRow(label: 'Email', value: candidate.email ?? '—'),
              _InfoRow(label: 'Date of Birth', value: candidate.dob ?? '—'),
              _InfoRow(label: 'Gender', value: candidate.gender?.name.toUpperCase() ?? '—'),
              _InfoRow(label: 'Coordinator', value: candidate.coordinatorName ?? 'Unassigned'),
            ],
          ),
        ),
        WizardStepFooter(onSave: onEdited, loading: false, label: 'Continue'),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 130, child: Text(label, style: const TextStyle(fontSize: 12.5, color: AppColors.mutedForeground))),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}
