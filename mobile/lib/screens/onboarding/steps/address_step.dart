import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api_exception.dart';
import '../../../core/spacing.dart';
import '../../../core/validators.dart';
import '../../../models/address.dart';
import '../../../providers/service_providers.dart';
import '../../../widgets/error_banner.dart';
import '../candidate_wizard_screen.dart';
import '../wizard_step_scaffold.dart';

/// Residence + "same as permanent" checkbox + permanent address, proof of
/// address picker — matches AddressStep.tsx.
class AddressStep extends ConsumerStatefulWidget {
  final WizardStepProps props;
  const AddressStep({super.key, required this.props});

  @override
  ConsumerState<AddressStep> createState() => _AddressStepState();
}

class _AddressStepState extends ConsumerState<AddressStep> {
  final _formKey = GlobalKey<FormState>();
  final _residenceAddressController = TextEditingController();
  final _residencePinController = TextEditingController();
  final _contactEmailController = TextEditingController();
  final _contactMobileController = TextEditingController();
  final _permanentAddressController = TextEditingController();
  final _permanentPinController = TextEditingController();

  ProofOfAddress? _proofOfAddress;
  bool _sameAsResidence = false;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _residenceAddressController.dispose();
    _residencePinController.dispose();
    _contactEmailController.dispose();
    _contactMobileController.dispose();
    _permanentAddressController.dispose();
    _permanentPinController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final address = await ref.read(addressServiceProvider).get(widget.props.candidateId);
      if (address != null) {
        _residenceAddressController.text = address.residenceAddress ?? '';
        _residencePinController.text = address.residencePinCode ?? '';
        _contactEmailController.text = address.contactEmail ?? '';
        _contactMobileController.text = address.contactMobile ?? '';
        _permanentAddressController.text = address.permanentAddress ?? '';
        _permanentPinController.text = address.permanentPinCode ?? '';
        _proofOfAddress = address.proofOfAddress;
        _sameAsResidence = address.sameAsResidence;
      }
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to load address details');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });

    final payload = AddressPayload(
      residenceAddress: _residenceAddressController.text.trim(),
      residencePinCode: _residencePinController.text.trim(),
      contactEmail: _contactEmailController.text.trim().isEmpty ? null : _contactEmailController.text.trim(),
      contactMobile: _contactMobileController.text.trim().isEmpty ? null : _contactMobileController.text.trim(),
      proofOfAddress: _proofOfAddress!,
      sameAsResidence: _sameAsResidence,
      permanentAddress: _sameAsResidence ? _residenceAddressController.text.trim() : _permanentAddressController.text.trim(),
      permanentPinCode: _sameAsResidence ? _residencePinController.text.trim() : _permanentPinController.text.trim(),
    );

    try {
      await ref.read(addressServiceProvider).put(widget.props.candidateId, payload);
      await widget.props.onSaved();
      if (mounted) widget.props.goNext();
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to save address details');
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
          const StepHeading(title: 'Address Details', subtitle: 'Residence and permanent address information.'),
          if (_error != null) ErrorBanner(message: _error!),
          TextFormField(
            controller: _residenceAddressController,
            decoration: const InputDecoration(labelText: 'Residence Address *'),
            maxLines: 3,
            maxLength: 500,
            validator: (v) => requiredText(v, label: 'Residence address', minLength: 5, maxLength: 500),
          ),
          const SizedBox(height: AppSpacing.lg),
          TextFormField(
            controller: _residencePinController,
            decoration: const InputDecoration(labelText: 'Residence PIN Code *', counterText: ''),
            keyboardType: TextInputType.number,
            maxLength: 6,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            validator: requiredPinCode,
          ),
          const SizedBox(height: AppSpacing.lg),
          TextFormField(
            controller: _contactEmailController,
            decoration: const InputDecoration(labelText: 'Contact Email'),
            keyboardType: TextInputType.emailAddress,
            validator: optionalEmail,
          ),
          const SizedBox(height: AppSpacing.lg),
          TextFormField(
            controller: _contactMobileController,
            decoration: const InputDecoration(labelText: 'Contact Mobile', counterText: ''),
            keyboardType: TextInputType.phone,
            maxLength: 10,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            validator: optionalMobile,
          ),
          const SizedBox(height: AppSpacing.lg),
          DropdownButtonFormField<ProofOfAddress>(
            initialValue: _proofOfAddress,
            decoration: const InputDecoration(labelText: 'Proof of Address *'),
            items: ProofOfAddress.values
                .map((p) => DropdownMenuItem(value: p, child: Text(proofOfAddressLabel(p))))
                .toList(),
            onChanged: (v) => setState(() => _proofOfAddress = v),
            validator: (v) => v == null ? 'Proof of address is required' : null,
          ),
          const SizedBox(height: AppSpacing.md),
          CheckboxListTile(
            value: _sameAsResidence,
            onChanged: (v) => setState(() => _sameAsResidence = v ?? false),
            title: const Text('Permanent address same as residence', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
          ),
          if (!_sameAsResidence) ...[
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              controller: _permanentAddressController,
              decoration: const InputDecoration(labelText: 'Permanent Address'),
              maxLines: 3,
              maxLength: 500,
              validator: (v) => optionalText(v, label: 'Permanent address', maxLength: 500),
            ),
            const SizedBox(height: AppSpacing.lg),
            TextFormField(
              controller: _permanentPinController,
              decoration: const InputDecoration(labelText: 'Permanent PIN Code', counterText: ''),
              keyboardType: TextInputType.number,
              maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              validator: optionalPinCode,
            ),
          ],
          WizardStepFooter(onSave: _save, loading: _saving),
        ],
      ),
    );
  }
}
