import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Central app configuration, sourced from the bundled `.env` file (see
/// `.env.example` for documentation on how to point this at the backend
/// from an Android emulator, a physical device, or the web target).
///
/// Never hardcode the API base URL — this is the single source of truth.
class AppConfig {
  AppConfig._();

  static String get apiBaseUrl {
    final value = dotenv.env['API_BASE_URL'];
    if (value == null || value.isEmpty) {
      // Sensible default for the Android emulator if `.env` is missing.
      return 'http://10.0.2.2:5090/api';
    }
    return value;
  }
}
