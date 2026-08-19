const { pool } = require('../db/pool');
const settingsService = require('./settingsService');

/**
 * Server-side fingerprint matching (1:1 verify and 1:N duplicate search).
 *
 * MATCHER STRATEGY
 * ----------------
 * Minutiae matching is a specialist algorithm, and a hand-rolled JS
 * implementation would be materially less accurate than a vendor/industry
 * matcher — which matters, because a bad matcher here means either wrongly
 * flagging a real applicant as a duplicate, or failing to catch one.
 *
 * So this service delegates to a pluggable matcher, resolved via
 * FINGERPRINT_MATCHER:
 *
 *   sdk_agent  — POST the two templates to an operator's local agent, which
 *                uses Mantra's own matcher. Most accurate; requires an agent
 *                to be reachable from the server (only viable when the backend
 *                and agent are on the same network, e.g. on-premise install).
 *
 *   exact      — byte-equality only. Correctly detects a re-submission of the
 *                identical template, and NOTHING else: two scans of the same
 *                finger produce different templates, so this will not catch a
 *                genuine duplicate applicant. Safe default: it never produces
 *                a false positive, but it will miss true duplicates. Do not
 *                mistake this for real biometric matching.
 *
 * Adding a proper server-side matcher later (a native minutiae library bound
 * via FFI, or a matching microservice) means implementing one more branch in
 * resolveMatcher() — nothing else in the codebase changes.
 */

const MATCHER_MODE = (process.env.FINGERPRINT_MATCHER || 'exact').toLowerCase();
const AGENT_MATCH_URL = process.env.FINGERPRINT_AGENT_URL || 'http://127.0.0.1:8891';

async function getThreshold() {
  const raw = await settingsService.getOne('fingerprint_match_threshold');
  return Number(raw) || 1400;
}

/**
 * Compares two base64 templates. Returns a similarity score, or null when the
 * active matcher cannot produce a meaningful score.
 */
async function compareTemplates(templateA, templateB) {
  if (MATCHER_MODE === 'sdk_agent') {
    const res = await fetch(`${AGENT_MATCH_URL}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateA, templateB }),
    });
    if (!res.ok) throw new Error(`Matcher agent returned ${res.status}`);
    const data = await res.json();
    return { score: Number(data.score) || 0, comparable: true };
  }

  // exact mode
  return { score: templateA === templateB ? Number.MAX_SAFE_INTEGER : 0, comparable: false };
}

/**
 * 1:1 — does this template belong to this candidate's stored finger?
 */
async function verifyAgainstCandidate({ candidateId, finger, template }) {
  const [rows] = await pool.query(
    'SELECT template FROM fingerprint_templates WHERE candidate_id = ? AND finger = ? LIMIT 1',
    [candidateId, finger]
  );
  if (!rows[0]) {
    return { matched: false, score: null, reason: 'No stored template for that finger.' };
  }

  const threshold = await getThreshold();
  const { score, comparable } = await compareTemplates(template, rows[0].template);

  return {
    matched: score >= threshold,
    score: comparable ? score : null,
    threshold,
    comparable,
  };
}

/**
 * 1:N — has this fingerprint already been registered by anyone else?
 *
 * Streams stored templates in batches rather than loading every template into
 * memory, so this stays workable as the candidate count grows.
 */
async function searchForDuplicate({ template, excludeCandidateId = null, batchSize = 500 }) {
  const threshold = await getThreshold();
  let offset = 0;
  let compared = 0;
  let best = { candidateId: null, finger: null, score: 0 };

  for (;;) {
    const params = [];
    let where = '';
    if (excludeCandidateId) {
      where = 'WHERE candidate_id <> ?';
      params.push(excludeCandidateId);
    }
    params.push(batchSize, offset);

    const [rows] = await pool.query(
      `SELECT candidate_id, finger, template FROM fingerprint_templates ${where} LIMIT ? OFFSET ?`,
      params
    );
    if (rows.length === 0) break;

    for (const row of rows) {
      compared += 1;
      // eslint-disable-next-line no-await-in-loop
      const { score } = await compareTemplates(template, row.template);
      if (score > best.score) {
        best = { candidateId: row.candidate_id, finger: row.finger, score };
      }
      // Exact-mode short-circuit: nothing can beat an exact hit.
      if (score === Number.MAX_SAFE_INTEGER) break;
    }

    if (best.score === Number.MAX_SAFE_INTEGER) break;
    offset += rows.length;
  }

  const matched = best.candidateId !== null && best.score >= threshold;
  return {
    matched,
    matchedCandidateId: matched ? best.candidateId : null,
    matchedFinger: matched ? best.finger : null,
    score: MATCHER_MODE === 'exact' ? null : best.score,
    threshold,
    candidatesCompared: compared,
    matcherMode: MATCHER_MODE,
  };
}

/** Records every comparison — biometric matching decisions must be auditable. */
async function logMatch({
  matchType,
  probeCandidateId,
  matchedCandidateId,
  finger,
  matchScore,
  thresholdUsed,
  matched,
  candidatesCompared,
  performedBy,
  ipAddress,
}) {
  await pool.query(
    `INSERT INTO fingerprint_match_log
     (match_type, probe_candidate_id, matched_candidate_id, finger, match_score, threshold_used, matched, candidates_compared, performed_by, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      matchType,
      probeCandidateId || null,
      matchedCandidateId || null,
      finger || null,
      matchScore ?? null,
      thresholdUsed ?? null,
      matched ? 1 : 0,
      candidatesCompared ?? null,
      performedBy || null,
      ipAddress || null,
    ]
  );
}

module.exports = {
  verifyAgainstCandidate,
  searchForDuplicate,
  logMatch,
  matcherMode: MATCHER_MODE,
};
