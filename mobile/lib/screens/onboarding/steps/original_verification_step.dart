import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api_exception.dart';
import '../../../core/app_colors.dart';
import '../../../providers/service_providers.dart';
import '../../../widgets/error_banner.dart';
import '../candidate_wizard_screen.dart';
import '../wizard_step_scaffold.dart';

/// Two checkboxes matching the paper form's office-use section.
class OriginalVerificationStep extends ConsumerStatefulWidget {
  final WizardStepProps props;
  const OriginalVerificationStep({super.key, required this.props});

  @override
  ConsumerState<OriginalVerificationStep> createState() => _OriginalVerificationStepState();
}

class _OriginalVerificationStepState extends ConsumerState<OriginalVerificationStep> {
  bool _originalsVerified = false;
  bool _selfAttestedReceived = false;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final record = await ref.read(originalVerificationServiceProvider).get(widget.props.candidateId);
      if (record != null) {
        setState(() {
          _originalsVerified = record.originalsVerified;
          _selfAttestedReceived = record.selfAttestedReceived;
        });
      }
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to load verification status');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(originalVerificationServiceProvider).put(
            widget.props.candidateId,
            originalsVerified: _originalsVerified,
            selfAttestedReceived: _selfAttestedReceived,
          );
      await widget.props.onSaved();
      if (mounted) widget.props.goNext();
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to save verification status');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const StepHeading(
          title: 'Original Document Verification',
          subtitle: 'Office-use only: confirm the physical originals were sighted and self-attested copies collected.',
        ),
        if (_error != null) ErrorBanner(message: _error!),
        Container(
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              CheckboxListTile(
                value: _originalsVerified,
                onChanged: (v) => setState(() => _originalsVerified = v ?? false),
                title: const Text('Original documents verified in person', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                controlAffinity: ListTileControlAffinity.leading,
              ),
              const Divider(height: 1),
              CheckboxListTile(
                value: _selfAttestedReceived,
                onChanged: (v) => setState(() => _selfAttestedReceived = v ?? false),
                title: const Text('Self-attested copies received', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                controlAffinity: ListTileControlAffinity.leading,
              ),
            ],
          ),
        ),
        WizardStepFooter(onSave: _save, loading: _saving),
      ],
    );
  }
}
