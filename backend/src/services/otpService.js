const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { pool } = require('../db/pool');
const mailer = require('./mailer');

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;

function generateOtp() {
  // Cryptographically secure 6-digit code, zero-padded.
  const n = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return String(n).padStart(OTP_LENGTH, '0');
}

function generatePreAuthToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates and emails a new OTP for a user, invalidating any prior
 * unconsumed OTPs for that user. Returns the pre-auth token the client
 * must present alongside the OTP code.
 */
async function issueOtp({ userId, email, name, ipAddress }) {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const preAuthToken = generatePreAuthToken();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await pool.query('UPDATE login_otps SET consumed_at = NOW() WHERE user_id = ? AND consumed_at IS NULL', [userId]);

  await pool.query(
    `INSERT INTO login_otps (user_id, otp_hash, pre_auth_token, max_attempts, expires_at, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, otpHash, preAuthToken, MAX_ATTEMPTS, expiresAt, ipAddress || null]
  );

  const result = await mailer.sendMail({
    to: email,
    subject: 'Your Super Admin login code',
    text: `Hello ${name || ''},\n\nYour one-time login code is: ${otp}\n\nThis code expires in ${OTP_TTL_MINUTES} minutes and can only be used once. If you did not request this, you can safely ignore this email.`,
    html: `<p>Hello ${name || ''},</p><p>Your one-time login code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${otp}</p><p>This code expires in ${OTP_TTL_MINUTES} minutes and can only be used once. If you did not request this, you can safely ignore this email.</p>`,
  });

  return { preAuthToken, expiresAt, emailDelivered: result.delivered, devFallback: result.devFallback };
}

/**
 * Verifies an OTP code against a pre-auth token. Returns the userId on
 * success. Throws a typed error with a `code` on failure so the
 * controller can map it to the right HTTP response.
 */
async function verifyOtp({ preAuthToken, otp }) {
  const [rows] = await pool.query(
    'SELECT * FROM login_otps WHERE pre_auth_token = ? LIMIT 1',
    [preAuthToken]
  );
  const record = rows[0];

  if (!record) {
    const err = new Error('Login session not found or already used');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (record.consumed_at) {
    const err = new Error('This login code has already been used');
    err.code = 'CONSUMED';
    throw err;
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    const err = new Error('This login code has expired. Please request a new one.');
    err.code = 'EXPIRED';
    throw err;
  }
  if (record.attempts >= record.max_attempts) {
    const err = new Error('Too many incorrect attempts. Please request a new code.');
    err.code = 'LOCKED';
    throw err;
  }

  const matches = await bcrypt.compare(otp, record.otp_hash);

  if (!matches) {
    await pool.query('UPDATE login_otps SET attempts = attempts + 1 WHERE id = ?', [record.id]);
    const remaining = record.max_attempts - (record.attempts + 1);
    const err = new Error(
      remaining > 0 ? `Incorrect code. ${remaining} attempt(s) remaining.` : 'Too many incorrect attempts. Please request a new code.'
    );
    err.code = 'INCORRECT';
    throw err;
  }

  await pool.query('UPDATE login_otps SET consumed_at = NOW() WHERE id = ?', [record.id]);
  return record.user_id;
}

module.exports = { issueOtp, verifyOtp, OTP_TTL_MINUTES };
