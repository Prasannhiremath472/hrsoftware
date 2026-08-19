import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/app_colors.dart';
import '../providers/auth_provider.dart';

/// Persistent shell around the primary sections: a bottom nav for the
/// high-frequency sections (Dashboard/Candidates/Coordinators) and a
/// drawer for the rest (Reports/Settings/Audit Logs), mirroring the web
/// sidebar's priority order without cramming 6 items into a bottom bar.
class AppShell extends ConsumerWidget {
  final Widget child;
  final String location;

  const AppShell({super.key, required this.child, required this.location});

  static const _bottomDestinations = [
    _NavDest('/dashboard', Icons.space_dashboard_outlined, Icons.space_dashboard_rounded, 'Dashboard'),
    _NavDest('/candidates', Icons.badge_outlined, Icons.badge_rounded, 'Candidates'),
    _NavDest('/coordinators', Icons.groups_outlined, Icons.groups_rounded, 'Coordinators'),
  ];

  int _currentIndex() {
    for (var i = 0; i < _bottomDestinations.length; i++) {
      if (location.startsWith(_bottomDestinations[i].path)) return i;
    }
    return -1;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = _currentIndex();
    final user = ref.watch(authProvider).user;

    return Scaffold(
      drawer: _AppDrawer(userName: user?.name ?? '', userEmail: user?.email ?? ''),
      body: SafeArea(bottom: false, child: child),
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex < 0 ? 0 : currentIndex,
        onDestinationSelected: (index) {
          context.go(_bottomDestinations[index].path);
        },
        destinations: _bottomDestinations
            .map((d) => NavigationDestination(
                  icon: Icon(d.icon),
                  selectedIcon: Icon(d.selectedIcon),
                  label: d.label,
                ))
            .toList(),
      ),
    );
  }
}

class _NavDest {
  final String path;
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  const _NavDest(this.path, this.icon, this.selectedIcon, this.label);
}

class _AppDrawer extends ConsumerWidget {
  final String userName;
  final String userEmail;

  const _AppDrawer({required this.userName, required this.userEmail});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Drawer(
      backgroundColor: AppColors.sidebar,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.verified_user_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          userName.isEmpty ? 'Super Admin' : userName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15),
                        ),
                        Text(
                          userEmail,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: AppColors.sidebarMuted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(color: AppColors.sidebarBorder, height: 1),
            const SizedBox(height: 8),
            _DrawerItem(icon: Icons.space_dashboard_outlined, label: 'Dashboard', path: '/dashboard'),
            _DrawerItem(icon: Icons.badge_outlined, label: 'Candidates', path: '/candidates'),
            _DrawerItem(icon: Icons.groups_outlined, label: 'Coordinators', path: '/coordinators'),
            _DrawerItem(icon: Icons.bar_chart_rounded, label: 'Reports', path: '/reports'),
            _DrawerItem(icon: Icons.settings_outlined, label: 'Settings', path: '/settings'),
            _DrawerItem(icon: Icons.history_rounded, label: 'Audit Logs', path: '/audit-logs'),
            const Spacer(),
            const Divider(color: AppColors.sidebarBorder, height: 1),
            ListTile(
              leading: const Icon(Icons.logout_rounded, color: AppColors.sidebarMuted),
              title: const Text('Logout', style: TextStyle(color: Colors.white)),
              onTap: () async {
                Navigator.of(context).pop();
                await ref.read(authProvider.notifier).logout();
              },
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String path;

  const _DrawerItem({required this.icon, required this.label, required this.path});

  @override
  Widget build(BuildContext context) {
    final currentLocation = GoRouterState.of(context).uri.toString();
    final isActive = currentLocation.startsWith(path);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: Material(
        color: isActive ? AppColors.sidebarAccent : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        child: ListTile(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          leading: Icon(icon, color: isActive ? Colors.white : AppColors.sidebarMuted, size: 21),
          title: Text(
            label,
            style: TextStyle(
              color: isActive ? Colors.white : AppColors.sidebarForeground,
              fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
              fontSize: 14,
            ),
          ),
          onTap: () {
            Navigator.of(context).pop();
            context.go(path);
          },
        ),
      ),
    );
  }
}
