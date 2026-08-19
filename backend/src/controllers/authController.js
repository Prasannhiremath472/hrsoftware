const bcrypt = require('bcrypt');
const asyncHandler = require('../middleware/asyncHandler');
const { ok, fail } = require('../utils/response');
const userModel = require('../models/userModel');
const auditLogModel = require('../models/auditLogModel');
const otpService = require('../services/otpService');
const otpModel = require('../models/otpModel');
const { signToken } = require('../utils/jwt');

/**
 * Step 1 of login: verify email + password. On success, does NOT issue a
 * JWT — instead generates and emails an OTP, returning a short-lived
 * pre-auth token the client must present with the OTP to complete login.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findByEmail(email);
  if (!user || !user.is_active) {
    return fail(res, 'Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    await auditLogModel.record({
      userId: user.id,
      action: 'LOGIN_FAILED',
      entityType: 'USER',
      entityId: user.id,
      description: `Failed login attempt (wrong password) for ${user.email}`,
      ipAddress: auditLogModel.ipFromReq(req),
      userAgent: req.headers['user-agent'],
    });
    return fail(res, 'Invalid email or password', 401);
  }

  const { preAuthToken, expiresAt, devFallback } = await otpService.issueOtp({
    userId: user.id,
    email: user.email,
    name: user.name,
    ipAddress: auditLogModel.ipFromReq(req),
  });

  await auditLogModel.record({
    userId: user.id,
    action: 'LOGIN_OTP_SENT',
    entityType: 'USER',
    entityId: user.id,
    description: `OTP sent to ${user.email} for login verification`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(
    res,
    {
      preAuthToken,
      expiresAt,
      otpTtlMinutes: otpService.OTP_TTL_MINUTES,
      // Only present in non-production runs without SMTP configured, so the
      // frontend can show a "check server logs" hint during local dev.
      devFallback: devFallback || undefined,
    },
    'Password verified. A one-time code has been sent to your registered email.'
  );
});

/**
 * Step 2 of login: verify the OTP against the pre-auth token. On success,
 * issues the real JWT.
 */
const verifyOtp = asyncHandler(async (req, res) => {
  const { preAuthToken, otp } = req.body;

  let userId;
  try {
    userId = await otpService.verifyOtp({ preAuthToken, otp });
  } catch (err) {
    const status = err.code === 'NOT_FOUND' ? 404 : 401;
    return fail(res, err.message, status);
  }

  const user = await userModel.findById(userId);
  if (!user || !user.is_active) {
    return fail(res, 'Account not found or inactive', 401);
  }

  await userModel.updateLastLogin(user.id);

  const token = signToken({ sub: user.id, role: user.role });

  await auditLogModel.record({
    userId: user.id,
    action: 'LOGIN',
    entityType: 'USER',
    entityId: user.id,
    description: `User ${user.email} logged in (OTP verified)`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  }, 'Login successful');
});

/**
 * Resends a fresh OTP for an in-progress login (invalidates the previous
 * one). Requires the current pre-auth token so it cannot be used to spam
 * arbitrary accounts without already having passed the password step.
 */
const resendOtp = asyncHandler(async (req, res) => {
  const { preAuthToken } = req.body;

  const userId = await otpModel.findUserIdByPreAuthToken(preAuthToken);
  if (!userId) {
    return fail(res, 'Login session not found or already used. Please sign in again.', 404);
  }

  const user = await userModel.findById(userId);
  if (!user || !user.is_active) {
    return fail(res, 'Account not found or inactive', 401);
  }

  const { preAuthToken: newToken, expiresAt, devFallback } = await otpService.issueOtp({
    userId: user.id,
    email: user.email,
    name: user.name,
    ipAddress: auditLogModel.ipFromReq(req),
  });

  await auditLogModel.record({
    userId: user.id,
    action: 'LOGIN_OTP_RESENT',
    entityType: 'USER',
    entityId: user.id,
    description: `OTP resent to ${user.email}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, {
    preAuthToken: newToken,
    expiresAt,
    otpTtlMinutes: otpService.OTP_TTL_MINUTES,
    devFallback: devFallback || undefined,
  }, 'A new code has been sent to your registered email.');
});

const me = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) return fail(res, 'User not found', 404);
  return ok(res, user, 'OK');
});

const logout = asyncHandler(async (req, res) => {
  await auditLogModel.record({
    userId: req.user.id,
    action: 'LOGOUT',
    entityType: 'USER',
    entityId: req.user.id,
    description: `User ${req.user.email} logged out`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return ok(res, null, 'Logged out');
});

module.exports = { login, verifyOtp, resendOtp, me, logout };
