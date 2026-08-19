import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api_exception.dart';
import '../../../core/app_colors.dart';
import '../../../core/spacing.dart';
import '../../../providers/service_providers.dart';
import '../../../widgets/error_banner.dart';
import '../candidate_wizard_screen.dart';
import '../wizard_step_scaffold.dart';

/// Checkbox + accepted timestamp display.
class DeclarationStep extends ConsumerStatefulWidget {
  final WizardStepProps props;
  const DeclarationStep({super.key, required this.props});

  @override
  ConsumerState<DeclarationStep> createState() => _DeclarationStepState();
}

class _DeclarationStepState extends ConsumerState<DeclarationStep> {
  bool _accepted = false;
  bool _saving = false;
  String? _error;
  String? _acceptedAt;

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final declaration = await ref.read(declarationServiceProvider).put(widget.props.candidateId, _accepted);
      setState(() => _acceptedAt = declaration.acceptedAt);
      await widget.props.onSaved();
      if (mounted && declaration.accepted) widget.props.goNext();
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to save declaration');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const StepHeading(title: 'Declaration', subtitle: 'The candidate must accept the declaration to proceed to signature.'),
        if (_error != null) ErrorBanner(message: _error!),
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'I hereby declare that the information furnished above is true, correct, and complete to the best of my knowledge and belief. I understand that any false statement made herein may result in the rejection of my application.',
                style: TextStyle(fontSize: 13, height: 1.5, color: AppColors.foreground),
              ),
              const SizedBox(height: AppSpacing.md),
              CheckboxListTile(
                value: _accepted,
                onChanged: (v) => setState(() => _accepted = v ?? false),
                title: const Text('I accept the above declaration', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
              ),
              if (_acceptedAt != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text('Accepted at: $_acceptedAt', style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
              ],
            ],
          ),
        ),
        WizardStepFooter(onSave: _accepted ? _save : null, loading: _saving),
      ],
    );
  }
}
