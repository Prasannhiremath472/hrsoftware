/// Shared form-field validators, mirroring the backend's express-validator
/// rules exactly (see backend/src/validators/*.js) so client-side and
/// server-side validation never disagree. These are the single source of
/// truth for field formats across every form in the app.
library;

final RegExp _mobileRe = RegExp(r'^[6-9]\d{9}$');
final RegExp _pinCodeRe = RegExp(r'^\d{6}$');
final RegExp _emailRe = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
final RegExp _panRe = RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]$');
final RegExp _aadhaarRe = RegExp(r'^\d{12}$');

/// Required 10-digit Indian mobile number (starts 6-9, no symbols/spaces).
String? requiredMobile(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return 'Mobile number is required';
  if (!_mobileRe.hasMatch(v)) return 'Enter a valid 10-digit mobile number';
  return null;
}

/// Optional 10-digit Indian mobile number — blank is allowed.
String? optionalMobile(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return null;
  if (!_mobileRe.hasMatch(v)) return 'Enter a valid 10-digit mobile number';
  return null;
}

/// Required 6-digit India PIN code.
String? requiredPinCode(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return 'PIN code is required';
  if (!_pinCodeRe.hasMatch(v)) return 'PIN code must be exactly 6 digits';
  return null;
}

/// Optional 6-digit India PIN code — blank is allowed.
String? optionalPinCode(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return null;
  if (!_pinCodeRe.hasMatch(v)) return 'PIN code must be exactly 6 digits';
  return null;
}

/// Optional email address — blank is allowed.
String? optionalEmail(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return null;
  if (!_emailRe.hasMatch(v)) return 'Enter a valid email address';
  return null;
}

/// Required, length-bounded free-text field (e.g. name).
String? requiredText(String? value, {required String label, int minLength = 2, int? maxLength}) {
  final v = value?.trim() ?? '';
  if (v.length < minLength) return '$label is required';
  if (maxLength != null && v.length > maxLength) return '$label is too long';
  return null;
}

/// Optional, length-bounded free-text field.
String? optionalText(String? value, {required String label, int? maxLength}) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return null;
  if (maxLength != null && v.length > maxLength) return '$label is too long';
  return null;
}

/// Optional PAN — format ABCDE1234F. Blank is allowed (server keeps existing
/// value when this field is omitted, matching the masking contract).
String? optionalPan(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return null;
  if (!_panRe.hasMatch(v)) return 'PAN must be 5 letters, 4 digits, then 1 letter';
  return null;
}

/// Optional 12-digit Aadhaar number. Blank is allowed (same masking contract
/// as PAN above).
String? optionalAadhaar(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return null;
  if (!_aadhaarRe.hasMatch(v)) return 'Aadhaar must be exactly 12 digits';
  return null;
}
