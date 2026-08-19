import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'providers/auth_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Loads .env (see .env.example) for the API base URL. Falls back to the
  // Android-emulator default inside AppConfig if the file is missing, so a
  // fresh checkout still boots (pointed at localhost via 10.0.2.2). This
  // must fully resolve before anything constructs ApiClient.instance (see
  // core/api_client.dart) — awaited here, and ApiClient reads AppConfig
  // per-request rather than caching it at construction time, so ordering
  // relative to Riverpod's bootstrap() below is no longer load-bearing.
  try {
    await dotenv.load(fileName: '.env');
  } catch (e) {
    // No .env bundled (e.g. CI build) — AppConfig.apiBaseUrl falls back
    // safely, but surface unexpected failures in debug so a malformed
    // bundled .env doesn't silently misroute every API call.
    assert(false, 'Failed to load .env: $e');
  }

  final container = ProviderContainer();
  // Validate any stored token before the first frame renders its route.
  await container.read(authProvider.notifier).bootstrap();

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const HrKycApp(),
    ),
  );
}
