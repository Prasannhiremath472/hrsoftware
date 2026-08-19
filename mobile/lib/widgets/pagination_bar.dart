import 'package:flutter/material.dart';

import '../core/app_colors.dart';
import '../core/spacing.dart';

/// Compact prev/next pager for paginated list screens.
class PaginationBar extends StatelessWidget {
  final int page;
  final int totalPages;
  final int total;
  final ValueChanged<int> onPageChanged;

  const PaginationBar({
    super.key,
    required this.page,
    required this.totalPages,
    required this.total,
    required this.onPageChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppColors.border)),
        color: AppColors.card,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '$total total',
              style: const TextStyle(fontSize: 12.5, color: AppColors.mutedForeground, fontWeight: FontWeight.w500),
            ),
          ),
          IconButton(
            onPressed: page > 1 ? () => onPageChanged(page - 1) : null,
            icon: const Icon(Icons.chevron_left_rounded),
            style: IconButton.styleFrom(
              backgroundColor: AppColors.muted,
              disabledForegroundColor: AppColors.mutedForeground.withValues(alpha: 0.4),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
            child: Text(
              '$page / $totalPages',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.foreground),
            ),
          ),
          IconButton(
            onPressed: page < totalPages ? () => onPageChanged(page + 1) : null,
            icon: const Icon(Icons.chevron_right_rounded),
            style: IconButton.styleFrom(
              backgroundColor: AppColors.muted,
              disabledForegroundColor: AppColors.mutedForeground.withValues(alpha: 0.4),
            ),
          ),
        ],
      ),
    );
  }
}
