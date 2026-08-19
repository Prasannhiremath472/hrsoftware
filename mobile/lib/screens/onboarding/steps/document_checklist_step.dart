import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api_exception.dart';
import '../../../core/app_colors.dart';
import '../../../core/spacing.dart';
import '../../../models/document.dart';
import '../../../providers/service_providers.dart';
import '../../../widgets/error_banner.dart';
import '../candidate_wizard_screen.dart';
import '../wizard_step_scaffold.dart';

/// Checkboxes driven by GET /document-types?activeOnly=true (never
/// hardcoded). The checklist selection itself is not persisted separately
/// by the backend — the first document actually uploaded is what marks
/// this step (and the upload step) complete, mirroring the web app.
class DocumentChecklistStep extends ConsumerStatefulWidget {
  final WizardStepProps props;
  const DocumentChecklistStep({super.key, required this.props});

  @override
  ConsumerState<DocumentChecklistStep> createState() => _DocumentChecklistStepState();
}

class _DocumentChecklistStepState extends ConsumerState<DocumentChecklistStep> {
  bool _loading = true;
  String? _error;
  List<DocumentType> _types = [];
  final Set<int> _selected = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final types = await ref.read(documentServiceProvider).listActiveTypes();
      final existing = await ref.read(documentServiceProvider).listForCandidate(widget.props.candidateId);
      setState(() {
        _types = types;
        // Pre-select mandatory types and anything already uploaded.
        _selected.addAll(types.where((t) => t.isMandatory).map((t) => t.id));
        _selected.addAll(existing.map((d) => d.documentTypeId));
      });
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to load document types');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const StepHeading(
          title: 'Document Checklist',
          subtitle: 'Select which documents will be collected for this candidate. Mandatory documents are pre-selected.',
        ),
        if (_error != null) ErrorBanner(message: _error!, onRetry: _load),
        if (_types.isEmpty && _error == null)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text('No active document types configured. Add them from Settings.', style: TextStyle(color: AppColors.mutedForeground)),
          ),
        ..._types.map((type) => Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: CheckboxListTile(
                value: _selected.contains(type.id),
                onChanged: type.isMandatory
                    ? null
                    : (v) => setState(() {
                          if (v == true) {
                            _selected.add(type.id);
                          } else {
                            _selected.remove(type.id);
                          }
                        }),
                title: Text(type.name, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                subtitle: type.isMandatory ? const Text('Mandatory', style: TextStyle(fontSize: 11.5, color: AppColors.destructive)) : null,
                controlAffinity: ListTileControlAffinity.leading,
              ),
            )),
        WizardStepFooter(
          onSave: () async {
            await widget.props.onSaved();
            widget.props.goNext();
          },
          loading: false,
          label: 'Continue to Upload',
        ),
      ],
    );
  }
}
