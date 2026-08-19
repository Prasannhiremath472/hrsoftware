import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/app_colors.dart';
import '../../core/spacing.dart';
import '../../models/paginated_result.dart';
import '../../providers/service_providers.dart';
import '../../models/audit_log.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/loading_shimmer.dart';
import '../../widgets/pagination_bar.dart';

final _auditPageProvider = StateProvider.autoDispose<int>((ref) => 1);

final _auditLogProvider = FutureProvider.autoDispose<PaginatedResult<AuditLogEntry>>((ref) async {
  final page = ref.watch(_auditPageProvider);
  final service = ref.watch(auditLogServiceProvider);
  return service.list(page: page, limit: 20);
});

/// Paginated, filterable audit log list.
class AuditLogsScreen extends ConsumerWidget {
  const AuditLogsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final page = ref.watch(_auditPageProvider);
    final dataAsync = ref.watch(_auditLogProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Audit Logs'),
        leading: Builder(builder: (context) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(context).openDrawer())),
      ),
      body: Column(
        children: [
          Expanded(
            child: dataAsync.when(
              loading: () => const ShimmerList(),
              error: (e, _) => ErrorBanner(message: 'Failed to load audit logs: $e', onRetry: () => ref.invalidate(_auditLogProvider)),
              data: (result) {
                if (result.rows.isEmpty) {
                  return const EmptyState(icon: Icons.history_rounded, title: 'No audit log entries found');
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(_auditLogProvider),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    itemCount: result.rows.length,
                    itemBuilder: (context, index) => _AuditLogTile(entry: result.rows[index]),
                  ),
                );
              },
            ),
          ),
          if (!dataAsync.isLoading && dataAsync.hasValue && dataAsync.value!.total > 0)
            PaginationBar(
              page: page,
              totalPages: dataAsync.value!.totalPages,
              total: dataAsync.value!.total,
              onPageChanged: (p) => ref.read(_auditPageProvider.notifier).state = p,
            ),
        ],
      ),
    );
  }
}

class _AuditLogTile extends StatelessWidget {
  final AuditLogEntry entry;
  const _AuditLogTile({required this.entry});

  IconData _iconFor(String action) {
    if (action.contains('LOGIN')) return Icons.login_rounded;
    if (action.contains('LOGOUT')) return Icons.logout_rounded;
    if (action.contains('CREATE')) return Icons.add_circle_outline_rounded;
    if (action.contains('UPDATE')) return Icons.edit_outlined;
    if (action.contains('DELETE') || action.contains('REJECT')) return Icons.remove_circle_outline_rounded;
    if (action.contains('VERIFY')) return Icons.verified_outlined;
    if (action.contains('UPLOAD')) return Icons.upload_file_rounded;
    if (action.contains('SUBMIT')) return Icons.send_rounded;
    return Icons.event_note_outlined;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(color: AppColors.info.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(_iconFor(entry.action), size: 17, color: AppColors.info),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entry.description ?? entry.action, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 3),
                Text(
                  '${entry.userName ?? 'System'} • ${entry.createdAt}',
                  style: const TextStyle(fontSize: 11, color: AppColors.mutedForeground),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
