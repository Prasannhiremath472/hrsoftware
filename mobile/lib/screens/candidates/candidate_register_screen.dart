import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_exception.dart';
import '../../core/spacing.dart';
import '../../core/validators.dart';
import '../../models/candidate.dart';
import '../../models/coordinator.dart';
import '../../providers/service_providers.dart';
import '../../routes/app_router.dart';
import '../../widgets/coordinator_picker.dart';
import '../../widgets/error_banner.dart';

/// Registration form -> creates a DRAFT candidate server-side (candidate_number
/// is generated server-side, never client-side) -> navigates into the wizard.
class CandidateRegisterScreen extends ConsumerStatefulWidget {
  const CandidateRegisterScreen({super.key});

  @override
  ConsumerState<CandidateRegisterScreen> createState() => _CandidateRegisterScreenState();
}

class _CandidateRegisterScreenState extends ConsumerState<CandidateRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _mobileController = TextEditingController();
  final _emailController = TextEditingController();
  final _dobController = TextEditingController();

  Gender? _gender;
  Coordinator? _coordinator;
  DateTime? _dob;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _fullNameController.dispose();
    _mobileController.dispose();
    _emailController.dispose();
    _dobController.dispose();
    super.dispose();
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 25),
      firstDate: DateTime(now.year - 100),
      lastDate: now,
    );
    if (picked != null) {
      setState(() {
        _dob = picked;
        _dobController.text = '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    final payload = CandidateRegistrationPayload(
      fullName: _fullNameController.text.trim(),
      mobile: _mobileController.text.trim(),
      email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      dob: _dob != null ? _dobController.text : null,
      gender: _gender,
      coordinatorId: _coordinator?.id,
    );

    try {
      final candidate = await ref.read(candidateServiceProvider).create(payload);
      if (mounted) {
        context.pushReplacement(AppRoutes.candidateWizardPath(candidate.id));
      }
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to register candidate');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Register Candidate')),
      body: SafeArea(
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
                const Text(
                  'Enter the candidate\'s basic details to begin the onboarding process. A unique candidate number will be generated automatically.',
                  style: TextStyle(fontSize: 13, color: Colors.black54, height: 1.4),
                ),
                const SizedBox(height: AppSpacing.xl),
                if (_error != null) ErrorBanner(message: _error!),
                TextFormField(
                  controller: _fullNameController,
                  decoration: const InputDecoration(labelText: 'Full Name *'),
                  textCapitalization: TextCapitalization.words,
                  maxLength: 150,
                  validator: (v) => requiredText(v, label: 'Full name', maxLength: 150),
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
                  controller: _dobController,
                  readOnly: true,
                  decoration: const InputDecoration(labelText: 'Date of Birth', suffixIcon: Icon(Icons.calendar_today_rounded, size: 18)),
                  onTap: _pickDob,
                ),
                const SizedBox(height: AppSpacing.lg),
                DropdownButtonFormField<Gender>(
                  initialValue: _gender,
                  decoration: const InputDecoration(labelText: 'Gender'),
                  items: const [
                    DropdownMenuItem(value: Gender.male, child: Text('Male')),
                    DropdownMenuItem(value: Gender.female, child: Text('Female')),
                    DropdownMenuItem(value: Gender.other, child: Text('Other')),
                  ],
                  onChanged: (v) => setState(() => _gender = v),
                ),
                const SizedBox(height: AppSpacing.lg),
                CoordinatorPickerField(
                  value: _coordinator,
                  onChanged: (c) => setState(() => _coordinator = c),
                ),
                const SizedBox(height: AppSpacing.xxl),
                ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Register & Continue'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
