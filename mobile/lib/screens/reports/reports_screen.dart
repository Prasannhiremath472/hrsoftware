import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/app_colors.dart';
import '../../core/spacing.dart';
import '../../models/paginated_result.dart';
import '../../models/reports.dart';
import '../../providers/service_providers.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/loading_shimmer.dart';
import '../../widgets/pagination_bar.dart';
import '../../widgets/section_card.dart';

class _ReportQuery {
  final ReportKey key;
  final int page;
  final String dateFrom;
  final String dateTo;
  const _ReportQuery({this.key = ReportKey.candidates, this.page = 1, this.dateFrom = '', this.dateTo = ''});

  _ReportQuery copyWith({ReportKey? key, int? page, String? dateFrom, String? dateTo}) {
    return _ReportQuery(
      key: key ?? this.key,
      page: page ?? this.page,
      dateFrom: dateFrom ?? this.dateFrom,
      dateTo: dateTo ?? this.dateTo,
    );
  }
}

final _reportQueryProvider = StateProvider.autoDispose<_ReportQuery>((ref) => const _ReportQuery());

final _reportDataProvider = FutureProvider.autoDispose<PaginatedResult<ReportRow>>((ref) async {
  final query = ref.watch(_reportQueryProvider);
  final service = ref.watch(reportServiceProvider);
  return service.fetch(query.key, page: query.page, limit: 15, dateFrom: query.dateFrom, dateTo: query.dateTo);
});

/// Report type picker (tabs), date range filter, paginated card-per-row
/// view — mobile lists read better as cards than wide tables.
class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  Future<void> _pickDateRange() async {
    final query = ref.read(_reportQueryProvider);
    final now = DateTime.now();
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 5),
      lastDate: now,
      initialDateRange: query.dateFrom.isNotEmpty && query.dateTo.isNotEmpty
          ? DateTimeRange(start: DateTime.tryParse(query.dateFrom) ?? now, end: DateTime.tryParse(query.dateTo) ?? now)
          : null,
    );
    if (range != null) {
      String fmt(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
      ref.read(_reportQueryProvider.notifier).state = query.copyWith(dateFrom: fmt(range.start), dateTo: fmt(range.end), page: 1);
    }
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(_reportQueryProvider);
    final dataAsync = ref.watch(_reportDataProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports'),
        leading: Builder(builder: (context) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(context).openDrawer())),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range_rounded),
            onPressed: _pickDateRange,
            tooltip: 'Filter by date range',
          ),
          if (query.dateFrom.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.close_rounded),
              onPressed: () => ref.read(_reportQueryProvider.notifier).state = query.copyWith(dateFrom: '', dateTo: '', page: 1),
              tooltip: 'Clear date filter',
            ),
        ],
      ),
      body: Column(
        children: [
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
              children: reportDefs.map((def) {
                final key = def['key'] as ReportKey;
                final selected = query.key == key;
                return Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.sm),
                  child: ChoiceChip(
                    label: Text(def['label'] as String),
                    selected: selected,
                    onSelected: (_) => ref.read(_reportQueryProvider.notifier).state = query.copyWith(key: key, page: 1),
                    selectedColor: AppColors.primary.withValues(alpha: 0.14),
                    labelStyle: TextStyle(color: selected ? AppColors.primary : AppColors.mutedForeground, fontWeight: FontWeight.w600, fontSize: 12),
                    side: BorderSide(color: selected ? AppColors.primary.withValues(alpha: 0.4) : AppColors.border),
                    backgroundColor: AppColors.card,
                  ),
                );
              }).toList(),
            ),
          ),
          if (query.dateFrom.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('${query.dateFrom} — ${query.dateTo}', style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
              ),
            ),
          Expanded(
            child: dataAsync.when(
              loading: () => const ShimmerList(),
              error: (e, _) => ErrorBanner(message: 'Failed to load report: $e', onRetry: () => ref.invalidate(_reportDataProvider)),
              data: (result) {
                if (result.rows.isEmpty) {
                  return const EmptyState(icon: Icons.bar_chart_rounded, title: 'No data for this report', message: 'Try a different date range.');
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(_reportDataProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    itemCount: result.rows.length,
                    itemBuilder: (context, index) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: SectionCard(child: _ReportRowCard(row: result.rows[index])),
                    ),
                  ),
                );
              },
            ),
          ),
          if (!dataAsync.isLoading && dataAsync.hasValue && dataAsync.value!.total > 0)
            PaginationBar(
              page: query.page,
              totalPages: dataAsync.value!.totalPages,
              total: dataAsync.value!.total,
              onPageChanged: (p) => ref.read(_reportQueryProvider.notifier).state = query.copyWith(page: p),
            ),
        ],
      ),
    );
  }
}

/// Renders a report row generically as a key/value list, matching the
/// TS type ReportRow's "open record of primitives" contract.
class _ReportRowCard extends StatelessWidget {
  final ReportRow row;
  const _ReportRowCard({required this.row});

  String _label(String key) {
    return key.split('_').map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}').join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final entries = row.entries.where((e) => e.value != null).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: entries
          .map((e) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(width: 130, child: Text(_label(e.key), style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground))),
                    Expanded(child: Text('${e.value}', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600))),
                  ],
                ),
              ))
          .toList(),
    );
  }
}
