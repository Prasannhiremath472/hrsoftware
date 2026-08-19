/// Authenticated Super Admin, as returned by /auth/me and /auth/verify-otp.
class AuthUser {
  final int id;
  final String name;
  final String email;
  final String role;
  final bool isActive;
  final String? lastLoginAt;

  AuthUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.isActive = true,
    this.lastLoginAt,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as int,
      name: json['name'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      isActive: _asBool(json['is_active']),
      lastLoginAt: json['last_login_at'] as String?,
    );
  }
}

bool _asBool(Object? v) {
  if (v is bool) return v;
  if (v is int) return v == 1;
  if (v is String) return v == '1' || v.toLowerCase() == 'true';
  return true;
}

/// Step 1 of login — password accepted, OTP emailed, session not yet
/// established.
class PreAuthChallenge {
  final String preAuthToken;
  final String expiresAt;
  final int otpTtlMinutes;
  final bool devFallback;

  PreAuthChallenge({
    required this.preAuthToken,
    required this.expiresAt,
    required this.otpTtlMinutes,
    this.devFallback = false,
  });

  factory PreAuthChallenge.fromJson(Map<String, dynamic> json) {
    return PreAuthChallenge(
      preAuthToken: json['preAuthToken'] as String,
      expiresAt: json['expiresAt'] as String,
      otpTtlMinutes: json['otpTtlMinutes'] as int,
      devFallback: json['devFallback'] == true,
    );
  }
}

/// Step 2 of login — OTP verified, JWT issued.
class VerifiedSession {
  final String token;
  final AuthUser user;

  VerifiedSession({required this.token, required this.user});

  factory VerifiedSession.fromJson(Map<String, dynamic> json) {
    return VerifiedSession(
      token: json['token'] as String,
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}
