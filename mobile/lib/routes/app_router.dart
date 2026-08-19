import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/splash/splash_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/coordinators/coordinators_screen.dart';
import '../screens/coordinators/coordinator_form_screen.dart';
import '../screens/candidates/candidates_screen.dart';
import '../screens/candidates/candidate_register_screen.dart';
import '../screens/candidates/candidate_summary_screen.dart';
import '../screens/onboarding/candidate_wizard_screen.dart';
import '../screens/reports/reports_screen.dart';
import '../screens/settings/settings_screen.dart';
import '../screens/audit/audit_logs_screen.dart';
import '../widgets/app_shell.dart';

/// Route paths, centralized so screens never hardcode a path string twice.
class AppRoutes {
  AppRoutes._();
  static const splash = '/';
  static const login = '/login';
  static const dashboard = '/dashboard';
  static const coordinators = '/coordinators';
  static const coordinatorNew = '/coordinators/new';
  static const coordinatorEdit = '/coordinators/:id/edit';
  static const candidates = '/candidates';
  static const candidateNew = '/candidates/new';
  static const candidateWizard = '/candidates/:id/wizard';
  static const candidateSummary = '/candidates/:id/summary';
  static const reports = '/reports';
  static const settings = '/settings';
  static const auditLogs = '/audit-logs';

  static String coordinatorEditPath(int id) => '/coordinators/$id/edit';
  static String candidateWizardPath(int id, {String? step}) =>
      '/candidates/$id/wizard${step != null ? '?step=$step' : ''}';
  static String candidateSummaryPath(int id) => '/candidates/$id/summary';
}

final routerProvider = Provider<GoRouter>((ref) {
  final refreshListenable = _AuthRefreshListenable(ref);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final isSplash = state.matchedLocation == AppRoutes.splash;
      final isLogin = state.matchedLocation == AppRoutes.login;

      if (authState.status == AuthStatus.unknown) {
        return isSplash ? null : AppRoutes.splash;
      }
      if (authState.status == AuthStatus.unauthenticated) {
        return isLogin ? null : AppRoutes.login;
      }
      // authenticated
      if (isLogin || isSplash) return AppRoutes.dashboard;
      return null;
    },
    routes: [
      GoRoute(path: AppRoutes.splash, builder: (context, state) => const SplashScreen()),
      GoRoute(path: AppRoutes.login, builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: AppRoutes.candidateNew,
        builder: (context, state) => const CandidateRegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.candidateWizard,
        builder: (context, state) {
          final id = int.parse(state.pathParameters['id']!);
          final step = state.uri.queryParameters['step'];
          return CandidateWizardScreen(candidateId: id, initialStepKey: step);
        },
      ),
      GoRoute(
        path: AppRoutes.candidateSummary,
        builder: (context, state) {
          final id = int.parse(state.pathParameters['id']!);
          return CandidateSummaryScreen(candidateId: id);
        },
      ),
      GoRoute(
        path: AppRoutes.coordinatorNew,
        builder: (context, state) => const CoordinatorFormScreen(),
      ),
      GoRoute(
        path: AppRoutes.coordinatorEdit,
        builder: (context, state) {
          final id = int.parse(state.pathParameters['id']!);
          return CoordinatorFormScreen(coordinatorId: id);
        },
      ),
      ShellRoute(
        builder: (context, state, child) {
          return AppShell(location: state.matchedLocation, child: child);
        },
        routes: [
          GoRoute(path: AppRoutes.dashboard, builder: (context, state) => const DashboardScreen()),
          GoRoute(path: AppRoutes.coordinators, builder: (context, state) => const CoordinatorsScreen()),
          GoRoute(path: AppRoutes.candidates, builder: (context, state) => const CandidatesScreen()),
          GoRoute(path: AppRoutes.reports, builder: (context, state) => const ReportsScreen()),
          GoRoute(path: AppRoutes.settings, builder: (context, state) => const SettingsScreen()),
          GoRoute(path: AppRoutes.auditLogs, builder: (context, state) => const AuditLogsScreen()),
        ],
      ),
    ],
  );
});

/// Bridges Riverpod's authProvider state changes into go_router's
/// Listenable-based refresh mechanism, so the redirect logic re-evaluates
/// whenever auth status flips (login, logout, 401-triggered clear).
class _AuthRefreshListenable extends ChangeNotifier {
  _AuthRefreshListenable(Ref ref) {
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (previous?.status != next.status) notifyListeners();
    });
  }
}
