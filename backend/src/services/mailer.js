const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;
let initialized = false;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (initialized) return transporter;
  initialized = true;
  if (!isConfigured()) {
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Sends an email. In development, or when SMTP is NOT CONFIGURED, the
 * message is written to the server log instead of being sent, so the OTP
 * login flow remains fully testable without real mail credentials.
 * NEVER logs OTP codes in production (NODE_ENV=production requires SMTP
 * to be configured, or sending fails loudly instead of silently leaking
 * the code to logs).
 */
async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();

  if (!t) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP is NOT CONFIGURED — set SMTP_HOST/SMTP_USER/SMTP_PASS to send email in production');
    }
    logger.info(`[mailer] SMTP NOT CONFIGURED — dev fallback, logging email instead of sending. To: ${to} Subject: ${subject}`);
    logger.info(`[mailer] Body:\n${text}`);
    return { delivered: false, devFallback: true };
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return { delivered: true, devFallback: false };
}

module.exports = { sendMail, isConfigured };
