import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api_exception.dart';
import '../../../core/spacing.dart';
import '../../../core/validators.dart';
import '../../../models/kyc.dart';
import '../../../providers/service_providers.dart';
import '../../../widgets/error_banner.dart';
import '../candidate_wizard_screen.dart';
import '../wizard_step_scaffold.dart';

/// Matches frontend/src/pages/onboarding/KycStep.tsx's exact fields and
/// masking behavior: PAN/Aadhaar are returned masked and are NEVER
/// pre-filled into the editable inputs as if real; they're shown as
/// read-only "current value" hints instead, and left blank on the form
/// (blank == "keep existing value" per the PUT contract).
class KycStep extends ConsumerStatefulWidget {
  final WizardStepProps props;
  const KycStep({super.key, required this.props});

  @override
  ConsumerState<KycStep> createState() => _KycStepState();
}

class _KycStepState extends ConsumerState<KycStep> {
  final _formKey = GlobalKey<FormState>();
  final _applicantNameController = TextEditingController();
  final _fatherSpouseController = TextEditingController();
  final _dobController = TextEditingController();
  final _nationalityController = TextEditingController(text: 'India');
  final _panController = TextEditingController();
  final _aadhaarController = TextEditingController();

  KycGender? _gender;
  MaritalStatus? _maritalStatus;
  ResidencyStatus? _residencyStatus;
  ProofOfIdentity? _proofOfIdentity;
  DateTime? _dob;

  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _panMasked;
  String? _aadhaarMasked;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _applicantNameController.dispose();
    _fatherSpouseController.dispose();
    _dobController.dispose();
    _nationalityController.dispose();
    _panController.dispose();
    _aadhaarController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final kyc = await ref.read(kycServiceProvider).get(widget.props.candidateId);
      if (kyc != null) {
        _applicantNameController.text = kyc.applicantName ?? '';
        _fatherSpouseController.text = kyc.fatherSpouseName ?? '';
        _nationalityController.text = kyc.nationality;
        _gender = kyc.gender;
        _maritalStatus = kyc.maritalStatus;
        _residencyStatus = kyc.residencyStatus;
        _proofOfIdentity = kyc.proofOfIdentity;
        _panMasked = kyc.panNumberMasked;
        _aadhaarMasked = kyc.aadhaarNumberMasked;
        if (kyc.dob != null) {
          _dob = DateTime.tryParse(kyc.dob!);
          _dobController.text = kyc.dob!.split('T').first;
        }
      }
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to load KYC details');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dob ?? DateTime(now.year - 25),
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

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });

    final payload = KycPayload(
      applicantName: _applicantNameController.text.trim(),
      fatherSpouseName: _fatherSpouseController.text.trim().isEmpty ? null : _fatherSpouseController.text.trim(),
      gender: _gender!,
      maritalStatus: _maritalStatus,
      dob: _dobController.text,
      nationality: _nationalityController.text.trim().isEmpty ? null : _nationalityController.text.trim(),
      residencyStatus: _residencyStatus,
      panNumber: _panController.text.trim().isEmpty ? null : _panController.text.trim(),
      aadhaarNumber: _aadhaarController.text.trim().isEmpty ? null : _aadhaarController.text.trim(),
      proofOfIdentity: _proofOfIdentity!,
    );

    try {
      await ref.read(kycServiceProvider).put(widget.props.candidateId, payload);
      await widget.props.onSaved();
      if (mounted) widget.props.goNext();
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to save KYC details');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const StepHeading(
            title: 'KYC — Identity Details',
            subtitle:
                'Enter the applicant\'s identity information manually. This is manual data entry, not a government-verified check — PAN and Aadhaar are not validated against any external registry.',
          ),
          if (_error != null) ErrorBanner(message: _error!),
          TextFormField(
            controller: _applicantNameController,
            decoration: const InputDecoration(labelText: 'Applicant Name *'),
            textCapitalization: TextCapitalization.words,
            maxLength: 150,
            validator: (v) => requiredText(v, label: 'Applicant name', maxLength: 150),
          ),
          const SizedBox(height: AppSpacing.lg),
          TextFormField(
            controller: _fatherSpouseController,
            decoration: const InputDecoration(labelText: "Father's / Spouse's Name", counterText: ''),
            textCapitalization: TextCapitalization.words,
            maxLength: 150,
            validator: (v) => optionalText(v, label: "Father's/Spouse's name", maxLength: 150),
          ),
          const SizedBox(height: AppSpacing.lg),
          DropdownButtonFormField<KycGender>(
            initialValue: _gender,
            decoration: const InputDecoration(labelText: 'Gender *'),
            items: const [
              DropdownMenuItem(value: KycGender.male, child: Text('Male')),
              DropdownMenuItem(value: KycGender.female, child: Text('Female')),
            ],
            onChanged: (v) => setState(() => _gender = v),
            validator: (v) => v == null ? 'Gender is required' : null,
          ),
          const SizedBox(height: AppSpacing.lg),
          DropdownButtonFormField<MaritalStatus>(
            initialValue: _maritalStatus,
            decoration: const InputDecoration(labelText: 'Marital Status'),
            items: const [
              DropdownMenuItem(value: MaritalStatus.single, child: Text('Single')),
              DropdownMenuItem(value: MaritalStatus.married, child: Text('Married')),
            ],
            onChanged: (v) => setState(() => _maritalStatus = v),
          ),
          const SizedBox(height: AppSpacing.lg),
          TextFormField(
            controller: _dobController,
            readOnly: true,
            decoration: const InputDecoration(labelText: 'Date of Birth *', suffixIcon: Icon(Icons.calendar_today_rounded, size: 18)),
            onTap: _pickDob,
            validator: (v) => (v == null || v.isEmpty) ? 'Date of birth is required' : null,
          ),
          const SizedBox(height: AppSpacing.lg),
          TextFormField(
            controller: _nationalityController,
            decoration: const InputDecoration(labelText: 'Nationality', counterText: ''),
            maxLength: 80,
            validator: (v) => optionalText(v, label: 'Nationality', maxLength: 80),
          ),
          const SizedBox(height: AppSpacing.lg),
          DropdownButtonFormField<ResidencyStatus>(
            initialValue: _residencyStatus,
            decoration: const InputDecoration(labelText: 'Residency Status'),
            items: ResidencyStatus.values
                .map((r) => DropdownMenuItem(value: r, child: Text(residencyStatusLabel(r))))
                .toList(),
            onChanged: (v) => setState(() => _residencyStatus = v),
          ),
          const SizedBox(height: AppSpacing.lg),
          TextFormField(
            controller: _panController,
            decoration: InputDecoration(
              labelText: 'PAN Number',
              hintText: _panMasked != null ? 'Current: $_panMasked (leave blank to keep)' : 'ABCDE1234F',
            ),
            textCapitalization: TextCapitalization.characters,
            maxLength: 10,
            validator: optionalPan,
          ),
          const SizedBox(height: AppSpacing.lg),
          TextFormField(
            controller: _aadhaarController,
            decoration: InputDecoration(
              labelText: 'Aadhaar Number',
              hintText: _aadhaarMasked != null ? 'Current: $_aadhaarMasked (leave blank to keep)' : '12-digit number',
            ),
            keyboardType: TextInputType.number,
            maxLength: 12,
            validator: optionalAadhaar,
          ),
          const SizedBox(height: AppSpacing.lg),
          DropdownButtonFormField<ProofOfIdentity>(
            initialValue: _proofOfIdentity,
            decoration: const InputDecoration(labelText: 'Proof of Identity *'),
            items: ProofOfIdentity.values
                .map((p) => DropdownMenuItem(value: p, child: Text(proofOfIdentityLabel(p))))
                .toList(),
            onChanged: (v) => setState(() => _proofOfIdentity = v),
            validator: (v) => v == null ? 'Proof of identity is required' : null,
          ),
          WizardStepFooter(onSave: _save, loading: _saving),
        ],
      ),
    );
  }
}
