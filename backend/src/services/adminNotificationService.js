const mailer = require('./mailer');
const logger = require('../utils/logger');

/**
 * Admin-only notification emails — sent to a single fixed operator address,
 * never to candidates or coordinators. These are informational ("something
 * happened") and deliberately best-effort: a notification failing to send
 * must never fail the request that triggered it (candidate submission,
 * coordinator creation), so every call site awaits this but the function
 * itself swallows and logs delivery errors rather than throwing.
 */
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'asadhyatahrs@gmail.com';

async function notifyAdmin({ subject, text, html }) {
  try {
    await mailer.sendMail({ to: ADMIN_NOTIFICATION_EMAIL, subject, text, html });
  } catch (err) {
    logger.error(`Failed to send admin notification: ${err.message}`);
  }
}

async function notifyCandidateSubmitted(candidate) {
  const subject = `Candidate application submitted — ${candidate.candidate_number}`;
  const text =
    `A candidate has completed onboarding and submitted their application.\n\n` +
    `Candidate Number: ${candidate.candidate_number}\n` +
    `Name: ${candidate.full_name}\n` +
    `Mobile: ${candidate.mobile}\n` +
    `Submitted At: ${candidate.submitted_at || new Date().toISOString()}\n`;
  const html =
    `<p>A candidate has completed onboarding and submitted their application.</p>` +
    `<table cellpadding="4"><tr><td><strong>Candidate Number</strong></td><td>${candidate.candidate_number}</td></tr>` +
    `<tr><td><strong>Name</strong></td><td>${candidate.full_name}</td></tr>` +
    `<tr><td><strong>Mobile</strong></td><td>${candidate.mobile}</td></tr>` +
    `<tr><td><strong>Submitted At</strong></td><td>${candidate.submitted_at || new Date().toISOString()}</td></tr></table>`;
  await notifyAdmin({ subject, text, html });
}

async function notifyCoordinatorCreated(coordinator) {
  const subject = `New coordinator added — ${coordinator.name}`;
  const text =
    `A new coordinator record has been created.\n\n` +
    `Name: ${coordinator.name}\n` +
    `Mobile: ${coordinator.mobile}\n` +
    `Email: ${coordinator.email || '—'}\n` +
    `Employee Code: ${coordinator.employee_code || '—'}\n` +
    `Location: ${coordinator.location || '—'}\n` +
    `Status: ${coordinator.status}\n`;
  const html =
    `<p>A new coordinator record has been created.</p>` +
    `<table cellpadding="4"><tr><td><strong>Name</strong></td><td>${coordinator.name}</td></tr>` +
    `<tr><td><strong>Mobile</strong></td><td>${coordinator.mobile}</td></tr>` +
    `<tr><td><strong>Email</strong></td><td>${coordinator.email || '—'}</td></tr>` +
    `<tr><td><strong>Employee Code</strong></td><td>${coordinator.employee_code || '—'}</td></tr>` +
    `<tr><td><strong>Location</strong></td><td>${coordinator.location || '—'}</td></tr>` +
    `<tr><td><strong>Status</strong></td><td>${coordinator.status}</td></tr></table>`;
  await notifyAdmin({ subject, text, html });
}

module.exports = { notifyCandidateSubmitted, notifyCoordinatorCreated, ADMIN_NOTIFICATION_EMAIL };
