import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_exception.dart';
import '../../core/app_colors.dart';
import '../../core/spacing.dart';
import '../../models/coordinator.dart';
import '../../models/paginated_result.dart';
import '../../providers/service_providers.dart';
import '../../routes/app_router.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/loading_shimmer.dart';
import '../../widgets/pagination_bar.dart';
import '../../widgets/status_badge.dart';

class _CoordinatorQuery {
  final int page;
  final String search;
  final String? status;
  const _CoordinatorQuery({this.page = 1, this.search = '', this.status});

  _CoordinatorQuery copyWith({int? page, String? search, String? status, bool clearStatus = false}) {
    return _CoordinatorQuery(
      page: page ?? this.page,
      search: search ?? this.search,
      status: clearStatus ? null : (status ?? this.status),
    );
  }
}

final _coordinatorQueryProvider = StateProvider.autoDispose<_CoordinatorQuery>((ref) => const _CoordinatorQuery());

final _coordinatorListProvider = FutureProvider.autoDispose<PaginatedResult<Coordinator>>((ref) async {
  final query = ref.watch(_coordinatorQueryProvider);
  final service = ref.watch(coordinatorServiceProvider);
  return service.list(page: query.page, limit: 15, search: query.search, status: query.status);
});

class CoordinatorsScreen extends ConsumerStatefulWidget {
  const CoordinatorsScreen({super.key});

  @override
  ConsumerState<CoordinatorsScreen> createState() => _CoordinatorsScreenState();
}

class _CoordinatorsScreenState extends ConsumerState<CoordinatorsScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _toggleStatus(Coordinator coordinator) async {
    final activating = !coordinator.isActive;
    final confirmed = await showConfirmDialog(
      context,
      title: activating ? 'Activate Coordinator' : 'Deactivate Coordinator',
      message: activating
          ? 'Activate ${coordinator.name}? They will become assignable to candidates again.'
          : 'Deactivate ${coordinator.name}? They will no longer be assignable to new candidates.',
      confirmLabel: activating ? 'Activate' : 'Deactivate',
      destructive: !activating,
    );
    if (!confirmed) return;

    try {
      await ref.read(coordinatorServiceProvider).updateStatus(
            coordinator.id,
            activating ? CoordinatorStatus.active : CoordinatorStatus.inactive,
          );
      ref.invalidate(_coordinatorListProvider);
      if (mounted) {
        showAppSnackBar(context, 'Coordinator ${activating ? 'activated' : 'deactivated'}');
      }
    } catch (e) {
      if (mounted) {
        showAppSnackBar(context, e is ApiException ? e.message : 'Failed to update status', isError: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(_coordinatorQueryProvider);
    final listAsync = ref.watch(_coordinatorListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Coordinators'),
        leading: Builder(
          builder: (context) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(context).openDrawer()),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.coordinatorNew),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Coordinator'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.sm),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    hintText: 'Search name, mobile, code',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                  onSubmitted: (v) => ref.read(_coordinatorQueryProvider.notifier).state =
                      query.copyWith(search: v, page: 1),
                ),
                const SizedBox(height: AppSpacing.sm),
                SizedBox(
                  height: 36,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _FilterChip(
                        label: 'All',
                        selected: query.status == null,
                        onTap: () => ref.read(_coordinatorQueryProvider.notifier).state =
                            query.copyWith(clearStatus: true, page: 1),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      _FilterChip(
                        label: 'Active',
                        selected: query.status == 'ACTIVE',
                        onTap: () => ref.read(_coordinatorQueryProvider.notifier).state =
                            query.copyWith(status: 'ACTIVE', page: 1),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      _FilterChip(
                        label: 'Inactive',
                        selected: query.status == 'INACTIVE',
                        onTap: () => ref.read(_coordinatorQueryProvider.notifier).state =
                            query.copyWith(status: 'INACTIVE', page: 1),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: listAsync.when(
              loading: () => const ShimmerList(),
              error: (e, _) => ErrorBanner(message: 'Failed to load coordinators: $e', onRetry: () => ref.invalidate(_coordinatorListProvider)),
              data: (result) {
                if (result.rows.isEmpty) {
                  return EmptyState(
                    icon: Icons.groups_outlined,
                    title: 'No coordinators found',
                    message: query.search.isNotEmpty ? 'Try a different search term.' : 'Add your first coordinator to get started.',
                    actionLabel: query.search.isEmpty ? 'Add Coordinator' : null,
                    onAction: query.search.isEmpty ? () => context.push(AppRoutes.coordinatorNew) : null,
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(_coordinatorListProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.only(bottom: AppSpacing.lg),
                    itemCount: result.rows.length,
                    itemBuilder: (context, index) {
                      final c = result.rows[index];
                      return _CoordinatorTile(
                        coordinator: c,
                        onTap: () => context.push(AppRoutes.coordinatorEditPath(c.id)),
                        onToggleStatus: () => _toggleStatus(c),
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
              onPageChanged: (p) => ref.read(_coordinatorQueryProvider.notifier).state = query.copyWith(page: p),
            ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      selectedColor: AppColors.primary.withValues(alpha: 0.14),
      labelStyle: TextStyle(
        color: selected ? AppColors.primary : AppColors.mutedForeground,
        fontWeight: FontWeight.w600,
        fontSize: 12.5,
      ),
      side: BorderSide(color: selected ? AppColors.primary.withValues(alpha: 0.4) : AppColors.border),
      backgroundColor: AppColors.card,
    );
  }
}

class _CoordinatorTile extends StatelessWidget {
  final Coordinator coordinator;
  final VoidCallback onTap;
  final VoidCallback onToggleStatus;

  const _CoordinatorTile({required this.coordinator, required this.onTap, required this.onToggleStatus});

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
                backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                child: Text(
                  coordinator.name.isNotEmpty ? coordinator.name[0].toUpperCase() : '?',
                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(coordinator.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text(
                      '${coordinator.mobile}${coordinator.employeeCode != null ? ' • ${coordinator.employeeCode}' : ''}',
                      style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                    ),
                    const SizedBox(height: 2),
                    Text('${coordinator.candidateCount} candidate(s)', style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  StatusBadge.coordinator(coordinator.isActive),
                  const SizedBox(height: 6),
                  GestureDetector(
                    onTap: onToggleStatus,
                    child: Text(
                      coordinator.isActive ? 'Deactivate' : 'Activate',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: coordinator.isActive ? AppColors.destructive : AppColors.success,
                      ),
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
