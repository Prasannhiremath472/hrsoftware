import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../core/app_colors.dart';
import '../../core/spacing.dart';
import '../../models/auth_models.dart';
import '../../providers/auth_provider.dart';

/// Two-step login: email+password, then a 6-digit email OTP with a
/// countdown timer, resend, and "use a different account". Mirrors
/// frontend/src/pages/Login.tsx's exact flow and copy tone.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

enum _LoginStep { credentials, otp }

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _otpController = TextEditingController();
  final _credentialsFormKey = GlobalKey<FormState>();

  _LoginStep _step = _LoginStep.credentials;
  String _preAuthToken = '';
  int _otpTtlSeconds = 0;
  bool _devFallback = false;
  String? _error;
  String? _info;
  bool _loading = false;
  Timer? _timer;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _timer?.cancel();
    _emailController.dispose();
    _passwordController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        if (_otpTtlSeconds > 0) _otpTtlSeconds--;
      });
    });
  }

  Future<void> _submitCredentials() async {
    if (!_credentialsFormKey.currentState!.validate()) return;
    setState(() {
      _error = null;
      _info = null;
      _loading = true;
    });
    try {
      final challenge = await ref.read(authServiceProvider).login(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );
      setState(() {
        _preAuthToken = challenge.preAuthToken;
        _otpTtlSeconds = challenge.otpTtlMinutes * 60;
        _devFallback = challenge.devFallback;
        _otpController.clear();
        _step = _LoginStep.otp;
      });
      _startTimer();
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Invalid email or password');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitOtp() async {
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final session = await ref.read(authServiceProvider).verifyOtp(
            preAuthToken: _preAuthToken,
            otp: _otpController.text,
          );
      await ref.read(authProvider.notifier).completeLogin(session);
      // Router redirect handles navigation once auth state flips.
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Incorrect or expired code');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    setState(() {
      _error = null;
      _info = null;
      _loading = true;
    });
    try {
      final PreAuthChallenge challenge = await ref.read(authServiceProvider).resendOtp(preAuthToken: _preAuthToken);
      setState(() {
        _preAuthToken = challenge.preAuthToken;
        _otpTtlSeconds = challenge.otpTtlMinutes * 60;
        _devFallback = challenge.devFallback;
        _otpController.clear();
        _info = 'A new code has been sent to your email.';
      });
      _startTimer();
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Could not resend code');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _backToCredentials() {
    _timer?.cancel();
    setState(() {
      _step = _LoginStep.credentials;
      _otpController.clear();
      _error = null;
      _info = null;
      _preAuthToken = '';
    });
  }

  String get _mmss {
    final m = _otpTtlSeconds ~/ 60;
    final s = _otpTtlSeconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.sidebar,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.xxxl),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Container(
                padding: const EdgeInsets.all(AppSpacing.xxl),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 32, offset: const Offset(0, 16)),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Icon(Icons.verified_user_rounded, color: AppColors.primary, size: 22),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    const Text(
                      'HR Onboarding & KYC Portal',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -0.3),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Super Admin Sign In',
                      style: TextStyle(fontSize: 12, color: AppColors.mutedForeground),
                    ),
                    const SizedBox(height: AppSpacing.xxl),
                    if (_step == _LoginStep.credentials) _buildCredentialsStep() else _buildOtpStep(),
                    const SizedBox(height: AppSpacing.xl),
                    const Text(
                      'Only Super Admin accounts can access this portal. Coordinators do not have login access.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 11.5, color: AppColors.mutedForeground, height: 1.4),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCredentialsStep() {
    return Form(
      key: _credentialsFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _FieldLabel('Email'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: const InputDecoration(hintText: 'admin@example.com'),
            validator: (value) {
              if (value == null || value.trim().isEmpty) return 'Email is required';
              final emailRegex = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
              if (!emailRegex.hasMatch(value.trim())) return 'Enter a valid email';
              return null;
            },
          ),
          const SizedBox(height: AppSpacing.md),
          const _FieldLabel('Password'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            autofillHints: const [AutofillHints.password],
            decoration: InputDecoration(
              hintText: '********',
              suffixIcon: IconButton(
                icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
            ),
            validator: (value) => (value == null || value.isEmpty) ? 'Password is required' : null,
            onFieldSubmitted: (_) => _submitCredentials(),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.md),
            Text(_error!, style: const TextStyle(color: AppColors.destructive, fontSize: 12.5, fontWeight: FontWeight.w600)),
          ],
          const SizedBox(height: AppSpacing.lg),
          ElevatedButton(
            onPressed: _loading ? null : _submitCredentials,
            child: _loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Continue'),
          ),
        ],
      ),
    );
  }

  Widget _buildOtpStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 13.5, color: AppColors.mutedForeground, height: 1.4),
            children: [
              const TextSpan(text: 'We emailed a 6-digit code to '),
              TextSpan(
                text: _emailController.text.trim(),
                style: const TextStyle(color: AppColors.foreground, fontWeight: FontWeight.w700),
              ),
              const TextSpan(text: '. Enter it below to finish signing in.'),
            ],
          ),
        ),
        if (_devFallback) ...[
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.warning.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
            ),
            child: const Text(
              'Email is not configured on this server. Check the backend console log for the code (development only).',
              style: TextStyle(fontSize: 12, color: AppColors.warning, fontWeight: FontWeight.w500),
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.lg),
        const _FieldLabel('One-Time Code'),
        const SizedBox(height: 6),
        TextField(
          controller: _otpController,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          maxLength: 6,
          autofocus: true,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: 10),
          decoration: const InputDecoration(counterText: '', hintText: '000000'),
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => (_otpController.text.length == 6) ? _submitOtp() : null,
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          _otpTtlSeconds > 0 ? 'Code expires in $_mmss' : 'Code expired — request a new one.',
          style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground),
        ),
        if (_error != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Text(_error!, style: const TextStyle(color: AppColors.destructive, fontSize: 12.5, fontWeight: FontWeight.w600)),
        ],
        if (_info != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Text(_info!, style: const TextStyle(color: AppColors.success, fontSize: 12.5, fontWeight: FontWeight.w600)),
        ],
        const SizedBox(height: AppSpacing.lg),
        ElevatedButton(
          onPressed: (_loading || _otpController.text.length != 6) ? null : _submitOtp,
          child: _loading
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text('Verify & Sign In'),
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton(
              onPressed: _loading ? null : _resend,
              child: const Text('Resend code'),
            ),
            TextButton(
              onPressed: _loading ? null : _backToCredentials,
              child: const Text('Use a different account'),
            ),
          ],
        ),
      ],
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(text, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.foreground));
  }
}
