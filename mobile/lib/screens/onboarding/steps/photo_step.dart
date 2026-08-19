import 'dart:io';
import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api_exception.dart';
import '../../../core/app_colors.dart';
import '../../../core/spacing.dart';
import '../../../providers/service_providers.dart';
import '../../../widgets/error_banner.dart';
import '../candidate_wizard_screen.dart';
import '../wizard_step_scaffold.dart';

/// Live camera preview (front camera default, matching "recent passport
/// size photograph" intent) -> capture -> retake/accept -> upload.
class PhotoStep extends ConsumerStatefulWidget {
  final WizardStepProps props;
  const PhotoStep({super.key, required this.props});

  @override
  ConsumerState<PhotoStep> createState() => _PhotoStepState();
}

class _PhotoStepState extends ConsumerState<PhotoStep> {
  Uint8List? _existingPhoto;
  Uint8List? _capturedBytes;
  bool _loadingExisting = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadExisting();
  }

  Future<void> _loadExisting() async {
    setState(() => _loadingExisting = true);
    try {
      final bytes = await ref.read(photoServiceProvider).fetchBytes(widget.props.candidateId);
      setState(() => _existingPhoto = bytes);
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to load photo');
    } finally {
      if (mounted) setState(() => _loadingExisting = false);
    }
  }

  Future<void> _openCamera() async {
    final bytes = await Navigator.of(context).push<Uint8List>(
      MaterialPageRoute(builder: (_) => const _CameraCaptureScreen()),
    );
    if (bytes != null) {
      setState(() => _capturedBytes = bytes);
    }
  }

  Future<void> _upload() async {
    if (_capturedBytes == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(photoServiceProvider).upload(
            candidateId: widget.props.candidateId,
            bytes: _capturedBytes!,
            filename: 'photo.jpg',
          );
      await widget.props.onSaved();
      if (mounted) widget.props.goNext();
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to upload photo');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final previewBytes = _capturedBytes ?? _existingPhoto;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const StepHeading(title: 'Photo Capture', subtitle: 'Capture a recent passport-size photograph of the candidate.'),
        if (_error != null) ErrorBanner(message: _error!),
        Center(
          child: Container(
            width: 200,
            height: 240,
            decoration: BoxDecoration(
              color: AppColors.muted,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            clipBehavior: Clip.antiAlias,
            child: _loadingExisting
                ? const Center(child: CircularProgressIndicator())
                : previewBytes != null
                    ? Image.memory(previewBytes, fit: BoxFit.cover)
                    : const Center(child: Icon(Icons.person_outline_rounded, size: 64, color: AppColors.mutedForeground)),
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        Center(
          child: OutlinedButton.icon(
            onPressed: _openCamera,
            icon: const Icon(Icons.camera_alt_outlined, size: 18),
            label: Text(previewBytes != null ? 'Retake Photo' : 'Capture Photo'),
          ),
        ),
        WizardStepFooter(
          onSave: _capturedBytes != null ? _upload : null,
          loading: _saving,
          label: _existingPhoto != null && _capturedBytes == null ? 'Continue' : 'Upload & Continue',
        ),
        if (_capturedBytes == null && _existingPhoto != null)
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () async {
                await widget.props.onSaved();
                widget.props.goNext();
              },
              child: const Text('Keep existing photo & continue'),
            ),
          ),
      ],
    );
  }
}

class _CameraCaptureScreen extends StatefulWidget {
  const _CameraCaptureScreen();

  @override
  State<_CameraCaptureScreen> createState() => _CameraCaptureScreenState();
}

class _CameraCaptureScreenState extends State<_CameraCaptureScreen> {
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  bool _initializing = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        setState(() {
          _error = 'No camera available on this device.';
          _initializing = false;
        });
        return;
      }
      final frontCamera = _cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras.first,
      );
      final controller = CameraController(frontCamera, ResolutionPreset.medium, enableAudio: false);
      await controller.initialize();
      if (!mounted) return;
      setState(() {
        _controller = controller;
        _initializing = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Could not access the camera: $e';
        _initializing = false;
      });
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    try {
      final file = await controller.takePicture();
      final bytes = await File(file.path).readAsBytes();
      if (mounted) Navigator.of(context).pop(bytes);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Capture failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white, title: const Text('Capture Photo')),
      body: _initializing
          ? const Center(child: CircularProgressIndicator(color: Colors.white))
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, style: const TextStyle(color: Colors.white))))
              : Column(
                  children: [
                    Expanded(child: Center(child: CameraPreview(_controller!))),
                    SafeArea(
                      top: false,
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: GestureDetector(
                          onTap: _capture,
                          child: Container(
                            width: 68,
                            height: 68,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 4),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}
