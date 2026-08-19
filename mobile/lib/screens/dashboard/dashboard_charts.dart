import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../core/app_colors.dart';
import '../../core/spacing.dart';
import '../../models/candidate.dart';
import '../../models/reports.dart';
import '../../widgets/section_card.dart';

/// Pie/donut chart of candidate status distribution — mirrors
/// frontend/src/components/charts/PieChart.tsx conceptually.
class StatusDistributionChart extends StatelessWidget {
  final Map<CandidateStatus, int> counts;
  const StatusDistributionChart({super.key, required this.counts});

  static const _palette = <CandidateStatus, Color>{
    CandidateStatus.draft: Color(0xFF64748B),
    CandidateStatus.kycPending: Color(0xFFB86A0A),
    CandidateStatus.addressPending: Color(0xFFCC8A2E),
    CandidateStatus.documentPending: Color(0xFFD9A441),
    CandidateStatus.documentVerificationPending: Color(0xFF0A66C2),
    CandidateStatus.biometricPending: Color(0xFF3B82C4),
    CandidateStatus.completed: Color(0xFF1D7C50),
    CandidateStatus.rejected: Color(0xFFC52020),
  };

  @override
  Widget build(BuildContext context) {
    final entries = counts.entries.where((e) => e.value > 0).toList();
    final total = entries.fold<int>(0, (sum, e) => sum + e.value);

    if (total == 0) {
      return const SectionCard(
        child: SizedBox(
          height: 140,
          child: Center(child: Text('No candidate data yet', style: TextStyle(color: AppColors.mutedForeground))),
        ),
      );
    }

    return SectionCard(
      child: Row(
        children: [
          SizedBox(
            width: 140,
            height: 140,
            child: PieChart(
              PieChartData(
                sectionsSpace: 2,
                centerSpaceRadius: 34,
                sections: entries.map((e) {
                  final color = _palette[e.key] ?? AppColors.mutedForeground;
                  return PieChartSectionData(
                    value: e.value.toDouble(),
                    color: color,
                    radius: 26,
                    showTitle: false,
                  );
                }).toList(),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: entries.map((e) {
                final color = _palette[e.key] ?? AppColors.mutedForeground;
                final pct = (e.value / total * 100).toStringAsFixed(0);
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(
                    children: [
                      Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          candidateStatusLabel(e.key),
                          style: const TextStyle(fontSize: 11.5, color: AppColors.foreground),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text('${e.value} ($pct%)', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.mutedForeground)),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

/// Bar chart of registrations per month — mirrors
/// frontend/src/components/charts/BarChart.tsx conceptually.
class MonthlyRegistrationsChart extends StatelessWidget {
  final List<MonthlyRegistrationRow> rows;
  const MonthlyRegistrationsChart({super.key, required this.rows});

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      return const SectionCard(
        child: SizedBox(
          height: 140,
          child: Center(child: Text('No registration history yet', style: TextStyle(color: AppColors.mutedForeground))),
        ),
      );
    }

    final maxVal = rows.map((r) => r.total).fold<int>(0, (a, b) => a > b ? a : b);
    final maxY = (maxVal == 0 ? 1 : maxVal) * 1.25;

    return SectionCard(
      child: SizedBox(
        height: 180,
        child: BarChart(
          BarChartData(
            maxY: maxY,
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false,
              horizontalInterval: (maxY / 4).clamp(1, double.infinity),
              getDrawingHorizontalLine: (_) => const FlLine(color: AppColors.border, strokeWidth: 1),
            ),
            borderData: FlBorderData(show: false),
            titlesData: FlTitlesData(
              leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 26,
                  getTitlesWidget: (value, meta) {
                    final index = value.toInt();
                    if (index < 0 || index >= rows.length) return const SizedBox.shrink();
                    return Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        _shortMonth(rows[index].month),
                        style: const TextStyle(fontSize: 10, color: AppColors.mutedForeground),
                      ),
                    );
                  },
                ),
              ),
            ),
            barGroups: [
              for (var i = 0; i < rows.length; i++)
                BarChartGroupData(
                  x: i,
                  barRods: [
                    BarChartRodData(
                      toY: rows[i].total.toDouble(),
                      color: AppColors.primary,
                      width: 14,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _shortMonth(String raw) {
    // Expecting "YYYY-MM"; degrade gracefully otherwise.
    final parts = raw.split('-');
    if (parts.length != 2) return raw;
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final m = int.tryParse(parts[1]);
    if (m == null || m < 1 || m > 12) return raw;
    return names[m - 1];
  }
}
