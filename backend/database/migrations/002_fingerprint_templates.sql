-- ============================================================================
-- Migration 002 — Real fingerprint templates (Mantra non-Aadhaar SDK)
--
-- Adds storage for ISO/ANSI fingerprint templates captured via Mantra's
-- non-Aadhaar SDK, enabling 1:1 verification and 1:N duplicate detection.
--
-- IMPORTANT — this is a material change in data sensitivity:
-- Until now the system stored only a one-way hash (proof a capture happened).
-- These tables store ACTUAL BIOMETRIC TEMPLATES, which are personal sensitive
-- data. Before deploying this you should have:
--   * encryption at rest on the MySQL volume (or column-level encryption),
--   * a documented retention/deletion policy,
--   * restricted DB access (templates must never be exposed via any API),
--   * consent captured from the candidate for biometric matching.
-- See BIOMETRIC_SETUP.md.
--
-- Apply with:
--   mysql -u <user> -p <db> < backend/database/migrations/002_fingerprint_templates.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- fingerprint_templates — one row per captured finger
--
-- Matching is done per-FINGER, not per-hand, so this is deliberately a
-- separate table from biometric_records (which stays as the per-hand
-- proof-of-capture record and continues to work unchanged).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fingerprint_templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT UNSIGNED NOT NULL,

  -- Standard finger positions (ISO 19794-2 / ANSI-378 numbering intent).
  finger ENUM(
    'LEFT_THUMB','LEFT_INDEX','LEFT_MIDDLE','LEFT_RING','LEFT_LITTLE',
    'RIGHT_THUMB','RIGHT_INDEX','RIGHT_MIDDLE','RIGHT_RING','RIGHT_LITTLE'
  ) NOT NULL,

  -- The biometric template itself, base64-encoded. Format recorded alongside
  -- because matchers are format-specific and SDKs differ.
  template LONGTEXT NOT NULL,
  template_format ENUM('ISO_19794_2','ANSI_378','PROPRIETARY') NOT NULL DEFAULT 'ISO_19794_2',

  -- Device-reported capture quality (0-100). Low-quality templates match poorly;
  -- the app enforces a configurable minimum before accepting a capture.
  quality_score DECIMAL(5,2) NOT NULL,

  -- Provenance: which physical scanner produced this template.
  device_serial VARCHAR(100) NULL,
  device_model VARCHAR(100) NULL,
  sdk_version VARCHAR(50) NULL,

  captured_by INT UNSIGNED NULL,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_fp_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_fp_captured_by FOREIGN KEY (captured_by) REFERENCES users(id) ON DELETE SET NULL,

  -- Re-capturing the same finger replaces the previous template.
  UNIQUE KEY uq_candidate_finger (candidate_id, finger),
  INDEX idx_fp_candidate (candidate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- fingerprint_match_log — audit trail for every comparison performed
--
-- Biometric matching is a consequential operation (it can flag someone as a
-- duplicate applicant), so every attempt is logged with its score and outcome,
-- separately from the general audit_logs table.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fingerprint_match_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  -- 1:1 verification names both sides; 1:N search leaves matched_candidate_id
  -- NULL when nothing was found above threshold.
  match_type ENUM('VERIFY_1_1','SEARCH_1_N') NOT NULL,
  probe_candidate_id INT UNSIGNED NULL,
  matched_candidate_id INT UNSIGNED NULL,
  finger VARCHAR(20) NULL,

  match_score INT NULL,
  threshold_used INT NULL,
  matched TINYINT(1) NOT NULL DEFAULT 0,

  -- How many stored templates the search compared against.
  candidates_compared INT UNSIGNED NULL,

  performed_by INT UNSIGNED NULL,
  ip_address VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_fpm_probe FOREIGN KEY (probe_candidate_id) REFERENCES candidates(id) ON DELETE SET NULL,
  CONSTRAINT fk_fpm_matched FOREIGN KEY (matched_candidate_id) REFERENCES candidates(id) ON DELETE SET NULL,
  CONSTRAINT fk_fpm_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_fpm_probe (probe_candidate_id),
  INDEX idx_fpm_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Matching settings, inserted only if absent so re-running is safe.
INSERT INTO application_settings (setting_key, setting_value)
SELECT 'fingerprint_match_threshold', '1400'
WHERE NOT EXISTS (SELECT 1 FROM application_settings WHERE setting_key = 'fingerprint_match_threshold');

INSERT INTO application_settings (setting_key, setting_value)
SELECT 'fingerprint_min_quality', '60'
WHERE NOT EXISTS (SELECT 1 FROM application_settings WHERE setting_key = 'fingerprint_min_quality');

INSERT INTO application_settings (setting_key, setting_value)
SELECT 'fingerprint_duplicate_check_on_capture', 'true'
WHERE NOT EXISTS (SELECT 1 FROM application_settings WHERE setting_key = 'fingerprint_duplicate_check_on_capture');
