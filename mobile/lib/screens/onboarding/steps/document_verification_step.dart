import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api_exception.dart';
import '../../../core/app_colors.dart';
import '../../../core/spacing.dart';
import '../../../models/document.dart';
import '../../../providers/service_providers.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/error_banner.dart';
import '../../../widgets/status_badge.dart';
import '../candidate_wizard_screen.dart';
import '../document_preview_screen.dart';
import '../wizard_step_scaffold.dart';

/// Per-document verify/reject with a reason picker + comment.
class DocumentVerificationStep extends ConsumerStatefulWidget {
  final WizardStepProps props;
  const DocumentVerificationStep({super.key, required this.props});

  @override
  ConsumerState<DocumentVerificationStep> createState() => _DocumentVerificationStepState();
}

const _rejectReasons = [
  'Blurry / unreadable',
  'Wrong document type',
  'Expired document',
  'Details do not match',
  'Incomplete document',
  'Other',
];

class _DocumentVerificationStepState extends ConsumerState<DocumentVerificationStep> {
  bool _loading = true;
  String? _error;
  List<CandidateDocument> _documents = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final docs = await ref.read(documentServiceProvider).listForCandidate(widget.props.candidateId);
      setState(() => _documents = docs);
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to load documents');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify(CandidateDocument doc) async {
    try {
      final updated = await ref.read(documentServiceProvider).verify(doc.id);
      setState(() {
        _documents = _documents.map((d) => d.id == updated.id ? updated : d).toList();
      });
      await widget.props.onSaved();
      if (mounted) showAppSnackBar(context, '${doc.documentTypeName} verified');
    } catch (e) {
      if (mounted) showAppSnackBar(context, e is ApiException ? e.message : 'Verification failed', isError: true);
    }
  }

  Future<void> _reject(CandidateDocument doc) async {
    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _RejectSheet(documentName: doc.documentTypeName),
    );
    if (result == null) return;

    try {
      final updated = await ref.read(documentServiceProvider).reject(
            doc.id,
            reason: result['reason']!,
            comment: result['comment'],
          );
      setState(() {
        _documents = _documents.map((d) => d.id == updated.id ? updated : d).toList();
      });
      await widget.props.onSaved();
      if (mounted) showAppSnackBar(context, '${doc.documentTypeName} rejected');
    } catch (e) {
      if (mounted) showAppSnackBar(context, e is ApiException ? e.message : 'Rejection failed', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));

    final allResolved = _documents.isNotEmpty && _documents.every((d) => d.status != DocumentStatus.uploaded);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const StepHeading(title: 'Document Verification', subtitle: 'Review each uploaded document and verify or reject it.'),
        if (_error != null) ErrorBanner(message: _error!, onRetry: _load),
        if (_documents.isEmpty && _error == null)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: EmptyState(icon: Icons.description_outlined, title: 'No documents uploaded yet'),
          ),
        ..._documents.map((doc) => Container(
              margin: const EdgeInsets.only(bottom: AppSpacing.sm),
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text(doc.documentTypeName, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700))),
                      StatusBadge.document(doc.status),
                    ],
                  ),
                  const SizedBox(height: 4),
                  GestureDetector(
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => DocumentPreviewScreen(document: doc)),
                    ),
                    child: Text(
                      doc.originalFilename,
                      style: const TextStyle(fontSize: 12, color: AppColors.info, decoration: TextDecoration.underline),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (doc.status == DocumentStatus.rejected && doc.rejectReason != null) ...[
                    const SizedBox(height: 4),
                    Text('Rejected: ${doc.rejectReason}', style: const TextStyle(fontSize: 11.5, color: AppColors.destructive)),
                  ],
                  if (doc.status == DocumentStatus.uploaded) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _reject(doc),
                            icon: const Icon(Icons.close_rounded, size: 16, color: AppColors.destructive),
                            label: const Text('Reject', style: TextStyle(color: AppColors.destructive)),
                            style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.destructive)),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => _verify(doc),
                            icon: const Icon(Icons.check_rounded, size: 16),
                            label: const Text('Verify'),
                            style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            )),
        WizardStepFooter(
          onSave: allResolved
              ? () async {
                  await widget.props.onSaved();
                  widget.props.goNext();
                }
              : null,
          loading: false,
          label: 'Continue',
        ),
        if (!allResolved)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text('Verify or reject all documents to continue.', style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
          ),
      ],
    );
  }
}

class _RejectSheet extends StatefulWidget {
  final String documentName;
  const _RejectSheet({required this.documentName});

  @override
  State<_RejectSheet> createState() => _RejectSheetState();
}

class _RejectSheetState extends State<_RejectSheet> {
  String? _reason;
  final _commentController = TextEditingController();

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Reject ${widget.documentName}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: AppSpacing.lg),
              const Text('Reason', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.mutedForeground)),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _rejectReasons
                    .map((r) => ChoiceChip(label: Text(r), selected: _reason == r, onSelected: (_) => setState(() => _reason = r)))
                    .toList(),
              ),
              const SizedBox(height: AppSpacing.lg),
              TextField(
                controller: _commentController,
                decoration: const InputDecoration(labelText: 'Additional comment (optional)', counterText: ''),
                maxLines: 3,
                maxLength: 500,
              ),
              const SizedBox(height: AppSpacing.xl),
              ElevatedButton(
                onPressed: _reason == null
                    ? null
                    : () => Navigator.of(context).pop({'reason': _reason!, 'comment': _commentController.text.trim()}),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.destructive),
                child: const Text('Confirm Rejection'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
