import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/api_exception.dart';
import '../../../core/app_colors.dart';
import '../../../core/spacing.dart';
import '../../../models/document.dart';
import '../../../providers/service_providers.dart';
import '../../../widgets/error_banner.dart';
import '../../../widgets/status_badge.dart';
import '../candidate_wizard_screen.dart';
import '../wizard_step_scaffold.dart';

/// Camera capture OR file picker per selected document type, upload
/// progress, view/replace.
class DocumentUploadStep extends ConsumerStatefulWidget {
  final WizardStepProps props;
  const DocumentUploadStep({super.key, required this.props});

  @override
  ConsumerState<DocumentUploadStep> createState() => _DocumentUploadStepState();
}

class _DocumentUploadStepState extends ConsumerState<DocumentUploadStep> {
  bool _loading = true;
  String? _error;
  List<DocumentType> _types = [];
  List<CandidateDocument> _documents = [];
  final Set<int> _uploadingTypeIds = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ref.read(documentServiceProvider).listActiveTypes(),
        ref.read(documentServiceProvider).listForCandidate(widget.props.candidateId),
      ]);
      setState(() {
        _types = results[0] as List<DocumentType>;
        _documents = results[1] as List<CandidateDocument>;
      });
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to load documents');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  CandidateDocument? _documentFor(int typeId) {
    for (final d in _documents) {
      if (d.documentTypeId == typeId) return d;
    }
    return null;
  }

  Future<void> _pickAndUpload(DocumentType type, {required bool fromCamera}) async {
    try {
      String? path;
      String name = 'document';
      if (fromCamera) {
        final picker = ImagePicker();
        final file = await picker.pickImage(source: ImageSource.camera, imageQuality: 85);
        if (file == null) return;
        path = file.path;
        name = file.name;
      } else {
        final result = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
        );
        if (result == null || result.files.single.path == null) return;
        path = result.files.single.path;
        name = result.files.single.name;
      }


      if (path == null) return;
      final bytes = await File(path).readAsBytes();

      setState(() => _uploadingTypeIds.add(type.id));
      final doc = await ref.read(documentServiceProvider).upload(
            candidateId: widget.props.candidateId,
            documentTypeId: type.id,
            bytes: bytes,
            filename: name,
          );
      setState(() {
        _documents.removeWhere((d) => d.documentTypeId == type.id);
        _documents.add(doc);
      });
      await widget.props.onSaved();
      if (mounted) showAppSnackBar(context, '${type.name} uploaded');
    } catch (e) {
      if (mounted) {
        showAppSnackBar(context, e is ApiException ? e.message : 'Upload failed', isError: true);
      }
    } finally {
      if (mounted) setState(() => _uploadingTypeIds.remove(type.id));
    }
  }

  void _showUploadOptions(DocumentType type) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Take Photo'),
              onTap: () {
                Navigator.of(context).pop();
                _pickAndUpload(type, fromCamera: true);
              },
            ),
            ListTile(
              leading: const Icon(Icons.folder_outlined),
              title: const Text('Choose File (PDF/Image)'),
              onTap: () {
                Navigator.of(context).pop();
                _pickAndUpload(type, fromCamera: false);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));

    final allUploaded = _types.where((t) => t.isMandatory).every((t) => _documentFor(t.id) != null);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const StepHeading(
          title: 'Document Upload',
          subtitle: 'Capture or select a file for each document. Accepted formats: PDF, JPG, PNG.',
        ),
        if (_error != null) ErrorBanner(message: _error!, onRetry: _load),
        ..._types.map((type) {
          final doc = _documentFor(type.id);
          final uploading = _uploadingTypeIds.contains(type.id);
          return Container(
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
                    Expanded(
                      child: Text(type.name, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
                    ),
                    if (type.isMandatory)
                      const Padding(
                        padding: EdgeInsets.only(right: 6),
                        child: Text('Required', style: TextStyle(fontSize: 10.5, color: AppColors.destructive, fontWeight: FontWeight.w700)),
                      ),
                    if (doc != null) StatusBadge.document(doc.status),
                  ],
                ),
                if (doc != null) ...[
                  const SizedBox(height: 6),
                  Text(doc.originalFilename, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground), overflow: TextOverflow.ellipsis),
                  if (doc.status == DocumentStatus.rejected && doc.rejectReason != null) ...[
                    const SizedBox(height: 4),
                    Text('Rejected: ${doc.rejectReason}', style: const TextStyle(fontSize: 11.5, color: AppColors.destructive)),
                  ],
                ],
                const SizedBox(height: AppSpacing.sm),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: uploading ? null : () => _showUploadOptions(type),
                    icon: uploading
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                        : Icon(doc != null ? Icons.refresh_rounded : Icons.upload_file_rounded, size: 17),
                    label: Text(uploading ? 'Uploading…' : (doc != null ? 'Replace' : 'Upload')),
                  ),
                ),
              ],
            ),
          );
        }),
        WizardStepFooter(
          onSave: allUploaded
              ? () async {
                  await widget.props.onSaved();
                  widget.props.goNext();
                }
              : null,
          loading: false,
          label: 'Continue to Verification',
        ),
        if (!allUploaded)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text('Upload all mandatory documents to continue.', style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
          ),
      ],
    );
  }
}
