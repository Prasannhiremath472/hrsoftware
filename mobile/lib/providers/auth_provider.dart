import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/secure_storage.dart';
import '../models/auth_models.dart';
import '../services/auth_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final AuthUser? user;

  const AuthState({required this.status, this.user});

  const AuthState.unknown() : this(status: AuthStatus.unknown);
  const AuthState.unauthenticated() : this(status: AuthStatus.unauthenticated);
  const AuthState.authenticated(AuthUser user) : this(status: AuthStatus.authenticated, user: user);
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState.unknown()) {
    ApiClient.instance.setUnauthorizedHandler(() {
      state = const AuthState.unauthenticated();
    });
  }

  final AuthService _authService = AuthService();

  /// Called at app startup: checks stored token validity via GET /auth/me.
  Future<void> bootstrap() async {
    final token = await SecureStorageService.instance.readToken();
    if (token == null || token.isEmpty) {
      state = const AuthState.unauthenticated();
      return;
    }
    try {
      final user = await _authService.me();
      state = AuthState.authenticated(user);
    } catch (_) {
      await SecureStorageService.instance.clearToken();
      state = const AuthState.unauthenticated();
    }
  }

  Future<void> completeLogin(VerifiedSession session) async {
    await SecureStorageService.instance.saveToken(session.token);
    state = AuthState.authenticated(session.user);
  }

  Future<void> logout() async {
    await _authService.logout();
    await SecureStorageService.instance.clearToken();
    state = const AuthState.unauthenticated();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());

final authServiceProvider = Provider<AuthService>((ref) => AuthService());
