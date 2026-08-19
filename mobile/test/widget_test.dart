// Basic smoke test. The full app (main.dart -> HrKycApp) wires up
// flutter_secure_storage and go_router redirects during its very first
// build, which require real platform channels/plugin registration that
// aren't available under `flutter test`'s harness. Rather than mock the
// whole plugin surface, this smoke test renders the Login screen (the
// app's actual entry UI once bootstrapped) directly under a themed
// MaterialApp + ProviderScope, which is enough to catch build-breaking
// regressions in the widget tree without a live backend or platform
// channels.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/core/app_theme.dart';
import 'package:mobile/screens/auth/login_screen.dart';

void main() {
  testWidgets('Login screen renders the credentials step', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          theme: null,
          home: LoginScreen(),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('HR Onboarding & KYC Portal'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });

  test('AppTheme.light builds a valid ThemeData', () {
    final theme = AppTheme.light;
    expect(theme.useMaterial3, isTrue);
  });
}
