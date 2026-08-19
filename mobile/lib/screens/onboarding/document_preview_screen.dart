import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_exception.dart';
import '../../core/app_colors.dart';
import '../../core/secure_storage.dart';
import '../../core/spacing.dart';
import '../../models/document.dart';
import '../../providers/service_providers.dart';
import '../../widgets/error_banner.dart';

/// Simple in-app viewer: renders images directly; for PDFs, offers "open
/// externally" via url_launcher rather than fighting a native PDF plugin.
class DocumentPreviewScreen extends ConsumerStatefulWidget {
  final CandidateDocument document;
  const DocumentPreviewScreen({super.key, required this.document});

  @override
  ConsumerState<DocumentPreviewScreen> createState() => _DocumentPreviewScreenState();
}

class _DocumentPreviewScreenState extends ConsumerState<DocumentPreviewScreen> {
  Uint8List? _bytes;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.document.isImage) _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final bytes = await ref.read(documentServiceProvider).fetchBytes(widget.document.id);
      setState(() => _bytes = bytes);
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to load document');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openExternally() async {
    final token = await SecureStorageService.instance.readToken();
    final url = ref.read(documentServiceProvider).viewUrl(widget.document.id, token);
    final uri = Uri.tryParse(url);
    if (uri == null || !mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        messenger.showSnackBar(const SnackBar(content: Text('Could not open document externally')));
      }
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Could not open document externally')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final doc = widget.document;
    return Scaffold(
      appBar: AppBar(title: Text(doc.documentTypeName, overflow: TextOverflow.ellipsis)),
      body: Column(
        children: [
          Expanded(
            child: doc.isImage ? _buildImagePreview() : _buildNonImagePreview(),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(doc.originalFilename, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  const SizedBox(height: 2),
                  Text('${(doc.fileSizeBytes / 1024).toStringAsFixed(0)} KB • ${doc.mimeType}', style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
                  const SizedBox(height: AppSpacing.md),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _openExternally,
                      icon: const Icon(Icons.open_in_new_rounded, size: 16),
                      label: const Text('Open Externally'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePreview() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return ErrorBanner(message: _error!, onRetry: _load);
    if (_bytes == null) return const Center(child: Text('No preview available'));
    return InteractiveViewer(
      child: Center(child: Image.memory(_bytes!, fit: BoxFit.contain)),
    );
  }

  Widget _buildNonImagePreview() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.picture_as_pdf_outlined, size: 56, color: AppColors.mutedForeground),
            const SizedBox(height: AppSpacing.md),
            const Text(
              'This file type cannot be previewed in-app. Use "Open Externally" to view it.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.mutedForeground, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}
