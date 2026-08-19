import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:signature/signature.dart';

import '../../../core/api_exception.dart';
import '../../../core/app_colors.dart';
import '../../../core/spacing.dart';
import '../../../providers/service_providers.dart';
import '../../../widgets/error_banner.dart';
import '../candidate_wizard_screen.dart';
import '../wizard_step_scaffold.dart';

/// Touch signature pad (the `signature` package), clear/accept, upload as
/// PNG — the closest Flutter equivalent to the web app's
/// react-signature-canvas-style component.
class SignatureStep extends ConsumerStatefulWidget {
  final WizardStepProps props;
  const SignatureStep({super.key, required this.props});

  @override
  ConsumerState<SignatureStep> createState() => _SignatureStepState();
}

class _SignatureStepState extends ConsumerState<SignatureStep> {
  late final SignatureController _controller;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller = SignatureController(
      penStrokeWidth: 3,
      penColor: AppColors.foreground,
      exportBackgroundColor: Colors.white,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_controller.isEmpty) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final bytes = await _controller.toPngBytes();
      if (bytes == null) throw Exception('Could not export signature');
      final base64Str = base64Encode(bytes);
      final dataUrl = 'data:image/png;base64,$base64Str';
      await ref.read(signatureServiceProvider).save(widget.props.candidateId, dataUrl);
      await widget.props.onSaved();
      if (mounted) widget.props.goNext();
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to save signature');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const StepHeading(title: 'Signature', subtitle: 'Ask the candidate to sign below using their finger or a stylus.'),
        if (_error != null) ErrorBanner(message: _error!),
        Container(
          height: 220,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          clipBehavior: Clip.antiAlias,
          child: Signature(controller: _controller, backgroundColor: Colors.white),
        ),
        const SizedBox(height: AppSpacing.sm),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: () => setState(() => _controller.clear()),
            icon: const Icon(Icons.refresh_rounded, size: 16),
            label: const Text('Clear'),
          ),
        ),
        WizardStepFooter(
          onSave: _save,
          loading: _saving,
          label: 'Accept & Continue',
        ),
      ],
    );
  }
}
