import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../core/spacing.dart';
import '../../core/validators.dart';
import '../../models/coordinator.dart';
import '../../providers/service_providers.dart';
import '../../widgets/error_banner.dart';

/// Full-screen add/edit form (mobile-appropriate, not a desktop modal).
/// If [coordinatorId] is null, creates a new coordinator; otherwise edits.
class CoordinatorFormScreen extends ConsumerStatefulWidget {
  final int? coordinatorId;
  const CoordinatorFormScreen({super.key, this.coordinatorId});

  @override
  ConsumerState<CoordinatorFormScreen> createState() => _CoordinatorFormScreenState();
}

class _CoordinatorFormScreenState extends ConsumerState<CoordinatorFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _mobileController = TextEditingController();
  final _emailController = TextEditingController();
  final _employeeCodeController = TextEditingController();
  final _locationController = TextEditingController();

  bool _loading = false;
  bool _initialLoading = false;
  String? _error;

  bool get _isEdit => widget.coordinatorId != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) _loadExisting();
  }

  Future<void> _loadExisting() async {
    setState(() => _initialLoading = true);
    try {
      final coordinator = await ref.read(coordinatorServiceProvider).getOne(widget.coordinatorId!);
      _nameController.text = coordinator.name;
      _mobileController.text = coordinator.mobile;
      _emailController.text = coordinator.email ?? '';
      _employeeCodeController.text = coordinator.employeeCode ?? '';
      _locationController.text = coordinator.location ?? '';
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to load coordinator');
    } finally {
      if (mounted) setState(() => _initialLoading = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _mobileController.dispose();
    _emailController.dispose();
    _employeeCodeController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    final payload = CoordinatorPayload(
      name: _nameController.text.trim(),
      mobile: _mobileController.text.trim(),
      email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      employeeCode: _employeeCodeController.text.trim().isEmpty ? null : _employeeCodeController.text.trim(),
      location: _locationController.text.trim().isEmpty ? null : _locationController.text.trim(),
    );

    try {
      final service = ref.read(coordinatorServiceProvider);
      if (_isEdit) {
        await service.update(widget.coordinatorId!, payload);
      } else {
        await service.create(payload);
      }
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to save coordinator');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit Coordinator' : 'Add Coordinator')),
      body: _initialLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: EdgeInsets.only(
                  left: AppSpacing.lg,
                  right: AppSpacing.lg,
                  top: AppSpacing.lg,
                  bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.xxl,
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_error != null) ErrorBanner(message: _error!),
                      TextFormField(
                        controller: _nameController,
                        decoration: const InputDecoration(labelText: 'Full Name *'),
                        textCapitalization: TextCapitalization.words,
                        maxLength: 150,
                        validator: (v) => requiredText(v, label: 'Name', maxLength: 150),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      TextFormField(
                        controller: _mobileController,
                        decoration: const InputDecoration(labelText: 'Mobile Number *', counterText: ''),
                        keyboardType: TextInputType.phone,
                        maxLength: 10,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        validator: requiredMobile,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      TextFormField(
                        controller: _emailController,
                        decoration: const InputDecoration(labelText: 'Email'),
                        keyboardType: TextInputType.emailAddress,
                        validator: optionalEmail,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      TextFormField(
                        controller: _employeeCodeController,
                        decoration: const InputDecoration(labelText: 'Employee Code', counterText: ''),
                        maxLength: 50,
                        validator: (v) => optionalText(v, label: 'Employee code', maxLength: 50),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      TextFormField(
                        controller: _locationController,
                        decoration: const InputDecoration(labelText: 'Location', counterText: ''),
                        textCapitalization: TextCapitalization.words,
                        maxLength: 150,
                        validator: (v) => optionalText(v, label: 'Location', maxLength: 150),
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                      ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        child: _loading
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Text(_isEdit ? 'Save Changes' : 'Create Coordinator'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}
