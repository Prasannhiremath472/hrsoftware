import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/app_colors.dart';
import '../core/spacing.dart';
import '../models/coordinator.dart';
import '../providers/service_providers.dart';

/// Searchable coordinator picker (bottom sheet), used by the candidate
/// registration screen and the "reassign coordinator" action. Only ACTIVE
/// coordinators are selectable.
class CoordinatorPickerField extends ConsumerStatefulWidget {
  final Coordinator? value;
  final ValueChanged<Coordinator?> onChanged;
  final String label;
  final bool required;

  const CoordinatorPickerField({
    super.key,
    required this.value,
    required this.onChanged,
    this.label = 'Coordinator',
    this.required = false,
  });

  @override
  ConsumerState<CoordinatorPickerField> createState() => _CoordinatorPickerFieldState();
}

class _CoordinatorPickerFieldState extends ConsumerState<CoordinatorPickerField> {
  Future<void> _openPicker() async {
    final selected = await showModalBottomSheet<Coordinator>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _CoordinatorPickerSheet(initial: widget.value),
    );
    if (selected != null) {
      widget.onChanged(selected);
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: _openPicker,
      borderRadius: BorderRadius.circular(8),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: widget.required ? '${widget.label} *' : widget.label,
          suffixIcon: const Icon(Icons.expand_more_rounded),
        ),
        child: Text(
          widget.value?.name ?? 'Select a coordinator',
          style: TextStyle(
            color: widget.value == null ? AppColors.mutedForeground : AppColors.foreground,
          ),
        ),
      ),
    );
  }
}

class _CoordinatorPickerSheet extends ConsumerStatefulWidget {
  final Coordinator? initial;
  const _CoordinatorPickerSheet({this.initial});

  @override
  ConsumerState<_CoordinatorPickerSheet> createState() => _CoordinatorPickerSheetState();
}

class _CoordinatorPickerSheetState extends ConsumerState<_CoordinatorPickerSheet> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final coordinatorsAsync = ref.watch(_activeCoordinatorsProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.lg, AppSpacing.lg, AppSpacing.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Select Coordinator', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: _searchController,
                      decoration: const InputDecoration(
                        hintText: 'Search by name, mobile, code',
                        prefixIcon: Icon(Icons.search_rounded),
                      ),
                      onChanged: (v) => setState(() => _query = v.toLowerCase()),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: coordinatorsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('Failed to load coordinators: $e')),
                  data: (coordinators) {
                    final filtered = coordinators.where((c) {
                      if (_query.isEmpty) return true;
                      return c.name.toLowerCase().contains(_query) ||
                          c.mobile.contains(_query) ||
                          (c.employeeCode?.toLowerCase().contains(_query) ?? false);
                    }).toList();

                    if (filtered.isEmpty) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.all(AppSpacing.xxl),
                          child: Text('No active coordinators found', style: TextStyle(color: AppColors.mutedForeground)),
                        ),
                      );
                    }

                    return ListView.separated(
                      controller: scrollController,
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final c = filtered[index];
                        final isSelected = widget.initial?.id == c.id;
                        return ListTile(
                          title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text('${c.mobile}${c.location != null ? ' • ${c.location}' : ''}'),
                          trailing: isSelected ? const Icon(Icons.check_circle_rounded, color: AppColors.primary) : null,
                          onTap: () => Navigator.of(context).pop(c),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

final _activeCoordinatorsProvider = FutureProvider.autoDispose((ref) async {
  final service = ref.watch(coordinatorServiceProvider);
  final all = await service.listAll();
  return all.where((c) => c.isActive).toList();
});
