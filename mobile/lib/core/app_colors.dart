import 'package:flutter/material.dart';

/// Design tokens converted 1:1 from the web app's HSL custom properties in
/// frontend/src/index.css, so the mobile palette matches the web palette
/// exactly (same brand, cross-platform consistency).
///
///   --background: 210 20% 98%      --primary: 224 71% 40%
///   --foreground: 222 47% 11%      --destructive: 0 72% 45%
///   --success: 152 62% 30%         --warning: 33 90% 38%
///   --info: 210 90% 40%            --border: 214 25% 90%
class AppColors {
  AppColors._();

  static const Color background = Color(0xFFF9FAFB);
  static const Color foreground = Color(0xFF0F1729);

  static const Color card = Color(0xFFFFFFFF);
  static const Color cardForeground = Color(0xFF0F1729);

  static const Color popover = Color(0xFFFFFFFF);
  static const Color popoverForeground = Color(0xFF0F1729);

  static const Color primary = Color(0xFF1E44AE);
  static const Color primaryForeground = Color(0xFFF8FAFC);

  static const Color secondary = Color(0xFFF2F5F8);
  static const Color secondaryForeground = Color(0xFF1F2B47);

  static const Color muted = Color(0xFFF2F5F8);
  static const Color mutedForeground = Color(0xFF5A687C);

  static const Color accent = Color(0xFFEEF2F6);
  static const Color accentForeground = Color(0xFF1F2B47);

  static const Color destructive = Color(0xFFC52020);
  static const Color destructiveForeground = Color(0xFFF8FAFC);

  static const Color success = Color(0xFF1D7C50);
  static const Color successForeground = Color(0xFFF3FCF7);

  static const Color warning = Color(0xFFB86A0A);
  static const Color warningForeground = Color(0xFFFEFAF0);

  static const Color info = Color(0xFF0A66C2);
  static const Color infoForeground = Color(0xFFF5FAFE);

  static const Color border = Color(0xFFDFE5EC);
  static const Color input = Color(0xFFD9DFE8);
  static const Color ring = Color(0xFF1E44AE);

  /// Deep navy used for nav chrome (bottom nav / drawer / app bar accents).
  static const Color sidebar = Color(0xFF141D33);
  static const Color sidebarForeground = Color(0xFFD9E0E8);
  static const Color sidebarMuted = Color(0xFF8D9BB0);
  static const Color sidebarAccent = Color(0xFF1F2B47);
  static const Color sidebarBorder = Color(0xFF26324A);

  /// Status-specific colors used by StatusBadge, mapped from CandidateStatus.
  static const Color draft = mutedForeground;
  static const Color pending = warning;
  static const Color completed = success;
  static const Color rejected = destructive;
}
