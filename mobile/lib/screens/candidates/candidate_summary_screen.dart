import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../core/app_colors.dart';
import '../../core/spacing.dart';
import '../../models/address.dart';
import '../../models/biometric.dart';
import '../../models/document.dart';
import '../../models/kyc.dart';
import '../../models/misc.dart';
import '../../providers/candidate_detail_provider.dart';
import '../../providers/service_providers.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/section_card.dart';
import '../../widgets/status_badge.dart';

/// A clean, shareable/printable-style detail view with masked PAN/Aadhaar
/// and no raw biometric data shown — mirrors CandidateSummary.tsx.
class CandidateSummaryScreen extends ConsumerStatefulWidget {
  final int candidateId;
  const CandidateSummaryScreen({super.key, required this.candidateId});

  @override
  ConsumerState<CandidateSummaryScreen> createState() => _CandidateSummaryScreenState();
}

class _SummaryData {
  final KycData? kyc;
  final AddressData? address;
  final List<CandidateDocument> documents;
  final OriginalVerification? originalVerification;
  final List<BiometricRecord> biometrics;

  _SummaryData({
    this.kyc,
    this.address,
    required this.documents,
    this.originalVerification,
    required this.biometrics,
  });
}

class _CandidateSummaryScreenState extends ConsumerState<CandidateSummaryScreen> {
  _SummaryData? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ref.read(kycServiceProvider).get(widget.candidateId),
        ref.read(addressServiceProvider).get(widget.candidateId),
        ref.read(documentServiceProvider).listForCandidate(widget.candidateId),
        ref.read(originalVerificationServiceProvider).get(widget.candidateId),
        ref.read(biometricServiceProvider).listForCandidate(widget.candidateId),
      ]);
      setState(() {
        _data = _SummaryData(
          kyc: results[0] as KycData?,
          address: results[1] as AddressData?,
          documents: results[2] as List<CandidateDocument>,
          originalVerification: results[3] as OriginalVerification?,
          biometrics: results[4] as List<BiometricRecord>,
        );
      });
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Failed to load candidate summary');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final candidateAsync = ref.watch(candidateDetailProvider(widget.candidateId));

    return Scaffold(
      appBar: AppBar(title: const Text('Candidate Summary')),
      body: candidateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorBanner(message: 'Failed to load candidate: $e'),
        data: (candidate) {
          if (_loading) return const Center(child: CircularProgressIndicator());
          if (_error != null) return ErrorBanner(message: _error!, onRetry: _load);
          final data = _data!;

          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: AppColors.sidebar,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            candidate.fullName,
                            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                          ),
                        ),
                        StatusBadge.candidate(candidate.status),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(candidate.candidateNumber, style: const TextStyle(color: AppColors.sidebarMuted, fontSize: 12.5)),
                    const SizedBox(height: 2),
                    Text('${candidate.mobile}${candidate.email != null ? ' • ${candidate.email}' : ''}',
                        style: const TextStyle(color: AppColors.sidebarMuted, fontSize: 12.5)),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              SectionCard(
                title: 'KYC Details',
                child: data.kyc == null
                    ? const Text('Not completed', style: TextStyle(color: AppColors.mutedForeground, fontSize: 13))
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _Row('Applicant Name', data.kyc!.applicantName ?? '—'),
                          _Row('Gender', data.kyc!.gender?.name.toUpperCase() ?? '—'),
                          _Row('DOB', data.kyc!.dob?.split('T').first ?? '—'),
                          _Row('Nationality', data.kyc!.nationality),
                          _Row('PAN Number', data.kyc!.panNumberMasked ?? '—'),
                          _Row('Aadhaar Number', data.kyc!.aadhaarNumberMasked ?? '—'),
                          _Row('Proof of Identity', data.kyc!.proofOfIdentity != null ? proofOfIdentityLabel(data.kyc!.proofOfIdentity!) : '—'),
                        ],
                      ),
              ),
              const SizedBox(height: AppSpacing.md),
              SectionCard(
                title: 'Address Details',
                child: data.address == null
                    ? const Text('Not completed', style: TextStyle(color: AppColors.mutedForeground, fontSize: 13))
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _Row('Residence Address', data.address!.residenceAddress ?? '—'),
                          _Row('Residence PIN', data.address!.residencePinCode ?? '—'),
                          _Row('Permanent Address', data.address!.sameAsResidence ? 'Same as residence' : (data.address!.permanentAddress ?? '—')),
                        ],
                      ),
              ),
              const SizedBox(height: AppSpacing.md),
              SectionCard(
                title: 'Documents (${data.documents.length})',
                child: data.documents.isEmpty
                    ? const Text('No documents uploaded', style: TextStyle(color: AppColors.mutedForeground, fontSize: 13))
                    : Column(
                        children: data.documents
                            .map((d) => Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 4),
                                  child: Row(
                                    children: [
                                      Expanded(child: Text(d.documentTypeName, style: const TextStyle(fontSize: 13))),
                                      StatusBadge.document(d.status),
                                    ],
                                  ),
                                ))
                            .toList(),
                      ),
              ),
              const SizedBox(height: AppSpacing.md),
              SectionCard(
                title: 'Original Verification',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _BoolRow('Originals Verified', data.originalVerification?.originalsVerified ?? false),
                    _BoolRow('Self-Attested Copies Received', data.originalVerification?.selfAttestedReceived ?? false),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              SectionCard(
                title: 'Biometric Capture',
                subtitle: 'No raw biometric data is stored or shown — reference and quality score only.',
                child: data.biometrics.isEmpty
                    ? const Text('Not captured', style: TextStyle(color: AppColors.mutedForeground, fontSize: 13))
                    : Column(
                        children: data.biometrics
                            .map((b) => Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 4),
                                  child: Row(
                                    children: [
                                      Expanded(child: Text(biometricHandLabel(b.hand), style: const TextStyle(fontSize: 13))),
                                      Text('Quality ${b.qualityScore.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                                    ],
                                  ),
                                ))
                            .toList(),
                      ),
              ),
              const SizedBox(height: AppSpacing.xxxl),
            ],
          );
        },
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  const _Row(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 140, child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground))),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}

class _BoolRow extends StatelessWidget {
  final String label;
  final bool value;
  const _BoolRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(value ? Icons.check_circle_rounded : Icons.cancel_rounded, size: 16, color: value ? AppColors.success : AppColors.mutedForeground),
          const SizedBox(width: 8),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}
