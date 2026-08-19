import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/app_colors.dart';
import '../../core/spacing.dart';
import '../../models/candidate.dart';
import '../../models/paginated_result.dart';
import '../../models/reports.dart';
import '../../providers/service_providers.dart';
import '../../routes/app_router.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/loading_shimmer.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/status_badge.dart';
import 'dashboard_charts.dart';

class DashboardData {
  final PaginatedResult<Candidate> candidates;
  final List<CoordinatorReportRow> coordinatorStats;
  final List<MonthlyRegistrationRow> monthly;

  DashboardData({required this.candidates, required this.coordinatorStats, required this.monthly});
}

final dashboardDataProvider = FutureProvider.autoDispose<DashboardData>((ref) async {
  final candidateService = ref.watch(candidateServiceProvider);
  final reportService = ref.watch(reportServiceProvider);

  final results = await Future.wait([
    candidateService.list(page: 1, limit: 200),
    reportService.fetch(ReportKey.coordinators, page: 1, limit: 50),
    reportService.monthlyRegistrations(),
  ]);

  final candidates = results[0] as PaginatedResult<Candidate>;
  final coordinatorReport = results[1] as PaginatedResult<ReportRow>;
  final monthly = results[2] as List<MonthlyRegistrationRow>;

  return DashboardData(
    candidates: candidates,
    coordinatorStats: coordinatorReport.rows.map((r) => CoordinatorReportRow.fromJson(r)).toList(),
    monthly: monthly,
  );
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(dashboardDataProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.candidateNew),
        icon: const Icon(Icons.person_add_alt_1_rounded),
        label: const Text('Add Candidate'),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(dashboardDataProvider),
        child: dataAsync.when(
          loading: () => const ShimmerList(count: 8),
          error: (e, _) => ListView(
            children: [
              ErrorBanner(message: 'Failed to load dashboard: $e', onRetry: () => ref.invalidate(dashboardDataProvider)),
            ],
          ),
          data: (data) => _DashboardContent(data: data),
        ),
      ),
    );
  }
}

class _DashboardContent extends StatelessWidget {
  final DashboardData data;
  const _DashboardContent({required this.data});

  Map<CandidateStatus, int> _statusCounts() {
    final counts = <CandidateStatus, int>{};
    for (final c in data.candidates.rows) {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    }
    return counts;
  }

  @override
  Widget build(BuildContext context) {
    final counts = _statusCounts();
    final total = data.candidates.total;
    final completed = counts[CandidateStatus.completed] ?? 0;
    final kycPending = counts[CandidateStatus.kycPending] ?? 0;
    final docPending = counts[CandidateStatus.documentPending] ?? 0;
    final docVerifyPending = counts[CandidateStatus.documentVerificationPending] ?? 0;
    final biometricPending = counts[CandidateStatus.biometricPending] ?? 0;
    final rejected = counts[CandidateStatus.rejected] ?? 0;

    final recent = data.candidates.rows.take(6).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, 100),
      children: [
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: AppSpacing.md,
          crossAxisSpacing: AppSpacing.md,
          childAspectRatio: 1.5,
          children: [
            StatCard(label: 'Total Candidates', value: '$total', icon: Icons.groups_2_rounded, color: AppColors.primary),
            StatCard(label: 'Completed', value: '$completed', icon: Icons.task_alt_rounded, color: AppColors.success),
            StatCard(label: 'KYC Pending', value: '$kycPending', icon: Icons.fact_check_outlined, color: AppColors.warning),
            StatCard(label: 'Documents Pending', value: '$docPending', icon: Icons.description_outlined, color: AppColors.warning),
            StatCard(label: 'Doc. Verification Pending', value: '$docVerifyPending', icon: Icons.rule_folder_outlined, color: AppColors.info),
            StatCard(label: 'Biometric Pending', value: '$biometricPending', icon: Icons.fingerprint_rounded, color: AppColors.info),
            StatCard(label: 'Rejected', value: '$rejected', icon: Icons.cancel_outlined, color: AppColors.destructive),
          ],
        ),
        const SizedBox(height: AppSpacing.xxl),
        const Text('Status Distribution', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: AppSpacing.md),
        StatusDistributionChart(counts: counts),
        const SizedBox(height: AppSpacing.xxl),
        const Text('Monthly Registrations', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: AppSpacing.md),
        MonthlyRegistrationsChart(rows: data.monthly),
        const SizedBox(height: AppSpacing.xxl),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Coordinator-wise Stats', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            TextButton(onPressed: () => Navigator.of(context).pushNamed('/coordinators'), child: const Text('View all')),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        ...data.coordinatorStats.take(5).map((c) => _CoordinatorStatRow(row: c)),
        const SizedBox(height: AppSpacing.xxl),
        const Text('Recent Candidates', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: AppSpacing.sm),
        ...recent.map((c) => _RecentCandidateTile(candidate: c)),
      ],
    );
  }
}

class _CoordinatorStatRow extends StatelessWidget {
  final CoordinatorReportRow row;
  const _CoordinatorStatRow({required this.row});

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
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(row.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                const SizedBox(height: 2),
                Text('${row.totalCandidates} total • ${row.completedCandidates} completed',
                    style: const TextStyle(fontSize: 11.5, color: AppColors.mutedForeground)),
              ],
            ),
          ),
          StatusBadge.coordinator(row.status == 'ACTIVE'),
        ],
      ),
    );
  }
}

class _RecentCandidateTile extends StatelessWidget {
  final Candidate candidate;
  const _RecentCandidateTile({required this.candidate});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 2),
        title: Text(candidate.fullName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
        subtitle: Text('${candidate.candidateNumber} • ${candidate.mobile}', style: const TextStyle(fontSize: 11.5)),
        trailing: StatusBadge.candidate(candidate.status),
        onTap: () => context.push(AppRoutes.candidateWizardPath(candidate.id)),
      ),
    );
  }
}
