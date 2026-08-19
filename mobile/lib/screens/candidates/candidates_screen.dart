import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/app_colors.dart';
import '../../core/spacing.dart';
import '../../models/candidate.dart';
import '../../models/coordinator.dart';
import '../../models/paginated_result.dart';
import '../../providers/service_providers.dart';
import '../../routes/app_router.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/loading_shimmer.dart';
import '../../widgets/pagination_bar.dart';
import '../../widgets/status_badge.dart';

class _CandidateQuery {
  final int page;
  final String search;
  final String? status;
  final int? coordinatorId;
  const _CandidateQuery({this.page = 1, this.search = '', this.status, this.coordinatorId});

  _CandidateQuery copyWith({
    int? page,
    String? search,
    String? status,
    bool clearStatus = false,
    int? coordinatorId,
    bool clearCoordinator = false,
  }) {
    return _CandidateQuery(
      page: page ?? this.page,
      search: search ?? this.search,
      status: clearStatus ? null : (status ?? this.status),
      coordinatorId: clearCoordinator ? null : (coordinatorId ?? this.coordinatorId),
    );
  }
}

final _candidateQueryProvider = StateProvider.autoDispose<_CandidateQuery>((ref) => const _CandidateQuery());

final _candidateListProvider = FutureProvider.autoDispose<PaginatedResult<Candidate>>((ref) async {
  final query = ref.watch(_candidateQueryProvider);
  final service = ref.watch(candidateServiceProvider);
  return service.list(
    page: query.page,
    limit: 15,
    search: query.search,
    status: query.status,
    coordinatorId: query.coordinatorId,
  );
});

const _statusOptions = [
  ['DRAFT', 'Draft'],
  ['KYC_PENDING', 'KYC Pending'],
  ['ADDRESS_PENDING', 'Address Pending'],
  ['DOCUMENT_PENDING', 'Document Pending'],
  ['DOCUMENT_VERIFICATION_PENDING', 'Doc. Verification'],
  ['BIOMETRIC_PENDING', 'Biometric Pending'],
  ['COMPLETED', 'Completed'],
  ['REJECTED', 'Rejected'],
];

class CandidatesScreen extends ConsumerStatefulWidget {
  const CandidatesScreen({super.key});

  @override
  ConsumerState<CandidatesScreen> createState() => _CandidatesScreenState();
}

class _CandidatesScreenState extends ConsumerState<CandidatesScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openFilterSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => const _CandidateFilterSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(_candidateQueryProvider);
    final listAsync = ref.watch(_candidateListProvider);
    final activeFilterCount = (query.status != null ? 1 : 0) + (query.coordinatorId != null ? 1 : 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Candidates'),
        leading: Builder(
          builder: (context) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(context).openDrawer()),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.candidateNew),
        icon: const Icon(Icons.person_add_alt_1_rounded),
        label: const Text('Add Candidate'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      hintText: 'Search name, mobile, number',
                      prefixIcon: Icon(Icons.search_rounded),
                    ),
                    onSubmitted: (v) => ref.read(_candidateQueryProvider.notifier).state = query.copyWith(search: v, page: 1),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Stack(
                  children: [
                    IconButton.filledTonal(
                      onPressed: _openFilterSheet,
                      icon: const Icon(Icons.tune_rounded),
                    ),
                    if (activeFilterCount > 0)
                      Positioned(
                        right: 4,
                        top: 4,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(color: AppColors.destructive, shape: BoxShape.circle),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: listAsync.when(
              loading: () => const ShimmerList(),
              error: (e, _) => ErrorBanner(message: 'Failed to load candidates: $e', onRetry: () => ref.invalidate(_candidateListProvider)),
              data: (result) {
                if (result.rows.isEmpty) {
                  return EmptyState(
                    icon: Icons.badge_outlined,
                    title: 'No candidates found',
                    message: query.search.isNotEmpty || activeFilterCount > 0
                        ? 'Try a different search or clear filters.'
                        : 'Register your first candidate to get started.',
                    actionLabel: (query.search.isEmpty && activeFilterCount == 0) ? 'Add Candidate' : null,
                    onAction: (query.search.isEmpty && activeFilterCount == 0) ? () => context.push(AppRoutes.candidateNew) : null,
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(_candidateListProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.only(bottom: AppSpacing.lg),
                    itemCount: result.rows.length,
                    itemBuilder: (context, index) {
                      final candidate = result.rows[index];
                      return _CandidateTile(
                        candidate: candidate,
                        onTap: () => context.push(AppRoutes.candidateWizardPath(candidate.id)),
                      );
                    },
                  ),
                );
              },
            ),
          ),
          if (!listAsync.isLoading && listAsync.hasValue && listAsync.value!.total > 0)
            PaginationBar(
              page: query.page,
              totalPages: listAsync.value!.totalPages,
              total: listAsync.value!.total,
              onPageChanged: (p) => ref.read(_candidateQueryProvider.notifier).state = query.copyWith(page: p),
            ),
        ],
      ),
    );
  }
}

class _CandidateTile extends StatelessWidget {
  final Candidate candidate;
  final VoidCallback onTap;
  const _CandidateTile({required this.candidate, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.xs),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.info.withValues(alpha: 0.1),
                child: Text(
                  candidate.fullName.isNotEmpty ? candidate.fullName[0].toUpperCase() : '?',
                  style: const TextStyle(color: AppColors.info, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(candidate.fullName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text('${candidate.candidateNumber} • ${candidate.mobile}', style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                    if (candidate.coordinatorName != null) ...[
                      const SizedBox(height: 2),
                      Text('Coordinator: ${candidate.coordinatorName}', style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              StatusBadge.candidate(candidate.status),
            ],
          ),
        ),
      ),
    );
  }
}

class _CandidateFilterSheet extends ConsumerStatefulWidget {
  const _CandidateFilterSheet();

  @override
  ConsumerState<_CandidateFilterSheet> createState() => _CandidateFilterSheetState();
}

class _CandidateFilterSheetState extends ConsumerState<_CandidateFilterSheet> {
  String? _status;
  int? _coordinatorId;

  @override
  void initState() {
    super.initState();
    final query = ref.read(_candidateQueryProvider);
    _status = query.status;
    _coordinatorId = query.coordinatorId;
  }

  @override
  Widget build(BuildContext context) {
    final coordinatorsAsync = ref.watch(_allCoordinatorsForFilterProvider);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Filter Candidates', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: AppSpacing.lg),
              const Text('Status', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.mutedForeground)),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ChoiceChip(
                    label: const Text('All'),
                    selected: _status == null,
                    onSelected: (_) => setState(() => _status = null),
                  ),
                  for (final s in _statusOptions)
                    ChoiceChip(
                      label: Text(s[1]),
                      selected: _status == s[0],
                      onSelected: (_) => setState(() => _status = s[0]),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              const Text('Coordinator', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.mutedForeground)),
              const SizedBox(height: AppSpacing.sm),
              coordinatorsAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text('Failed to load coordinators', style: const TextStyle(color: AppColors.destructive, fontSize: 12)),
                data: (coordinators) => DropdownButtonFormField<int?>(
                  initialValue: _coordinatorId,
                  isExpanded: true,
                  decoration: const InputDecoration(hintText: 'Any coordinator'),
                  items: [
                    const DropdownMenuItem<int?>(value: null, child: Text('Any coordinator')),
                    ...coordinators.map((c) => DropdownMenuItem<int?>(value: c.id, child: Text(c.name))),
                  ],
                  onChanged: (v) => setState(() => _coordinatorId = v),
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        ref.read(_candidateQueryProvider.notifier).state = const _CandidateQuery();
                        Navigator.of(context).pop();
                      },
                      child: const Text('Clear'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        final current = ref.read(_candidateQueryProvider);
                        ref.read(_candidateQueryProvider.notifier).state = current.copyWith(
                          status: _status,
                          clearStatus: _status == null,
                          coordinatorId: _coordinatorId,
                          clearCoordinator: _coordinatorId == null,
                          page: 1,
                        );
                        Navigator.of(context).pop();
                      },
                      child: const Text('Apply'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final _allCoordinatorsForFilterProvider = FutureProvider.autoDispose<List<Coordinator>>((ref) async {
  final service = ref.watch(coordinatorServiceProvider);
  return service.listAll();
});
