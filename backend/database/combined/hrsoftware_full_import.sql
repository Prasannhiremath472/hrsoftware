-- ============================================================================
-- Combined import for phpMyAdmin — schema + migrations + seed data
-- Generated from schema.sql + migrations/*.sql + seed.sql
-- ============================================================================

-- ============================================================================
-- Student/Candidate Digital Onboarding, KYC, Document Verification and
-- Biometric Management System — MySQL schema
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- users (Super Admin only — single role by design)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'SUPER_ADMIN',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- coordinators (pure data entities, no login)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coordinators (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(190) NULL,
  employee_code VARCHAR(50) NULL,
  location VARCHAR(150) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_coordinators_status (status),
  INDEX idx_coordinators_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- login_otps — email OTP second factor for Super Admin login
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_otps (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  pre_auth_token VARCHAR(255) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
  consumed_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  ip_address VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_otp_user (user_id),
  INDEX idx_otp_pre_auth_token (pre_auth_token),
  INDEX idx_otp_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- counters — safe sequence generation for candidate_number
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS counters (
  counter_key VARCHAR(50) NOT NULL PRIMARY KEY,
  current_value BIGINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- candidates
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_number VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(190) NULL,
  dob DATE NULL,
  gender ENUM('MALE','FEMALE','OTHER') NULL,
  coordinator_id INT UNSIGNED NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  current_step VARCHAR(40) NOT NULL DEFAULT 'REGISTRATION',
  submitted_at DATETIME NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Soft delete: NULL means active. Deleted candidates keep all related data
  -- (KYC, documents, biometrics, etc.) intact and can be restored from Trash.
  deleted_at DATETIME NULL DEFAULT NULL,
  deleted_by INT UNSIGNED NULL DEFAULT NULL,
  CONSTRAINT fk_candidates_coordinator FOREIGN KEY (coordinator_id) REFERENCES coordinators(id) ON DELETE SET NULL,
  CONSTRAINT fk_candidates_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_candidates_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_candidates_number (candidate_number),
  INDEX idx_candidates_coordinator (coordinator_id),
  INDEX idx_candidates_status (status),
  INDEX idx_candidates_mobile (mobile),
  INDEX idx_candidates_created_at (created_at),
  INDEX idx_candidates_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- candidate_kyc (Section A — Identity Details, matches paper form)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidate_kyc (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT UNSIGNED NOT NULL UNIQUE,
  applicant_name VARCHAR(150) NULL,
  father_spouse_name VARCHAR(150) NULL,
  gender ENUM('MALE','FEMALE') NULL,
  marital_status ENUM('SINGLE','MARRIED') NULL,
  dob DATE NULL,
  nationality VARCHAR(80) NOT NULL DEFAULT 'India',
  residency_status ENUM('RESIDENT_INDIVIDUAL','NON_RESIDENT','FOREIGN_NATIONAL') NULL,
  pan_number VARCHAR(20) NULL,
  aadhaar_number VARCHAR(20) NULL,
  proof_of_identity ENUM('AADHAAR','PAN','PASSPORT','DL','VOTER_ID','OTHER') NULL,
  kyc_provider_mode VARCHAR(20) NOT NULL DEFAULT 'manual',
  kyc_reference VARCHAR(100) NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_kyc_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- candidate_addresses (Section B — Address Details)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidate_addresses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT UNSIGNED NOT NULL UNIQUE,
  residence_address TEXT NULL,
  residence_pin_code VARCHAR(10) NULL,
  contact_email VARCHAR(190) NULL,
  contact_mobile VARCHAR(20) NULL,
  proof_of_address ENUM('AADHAAR','PASSPORT','UTILITY_BILL','BANK_STATEMENT','RENT_AGREEMENT','OTHER') NULL,
  same_as_residence TINYINT(1) NOT NULL DEFAULT 0,
  permanent_address TEXT NULL,
  permanent_pin_code VARCHAR(10) NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_address_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- document_types (DB-configurable, not hardcoded in frontend)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(80) NOT NULL UNIQUE,
  is_mandatory TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- candidate_documents
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidate_documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT UNSIGNED NOT NULL,
  document_type_id INT UNSIGNED NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes INT UNSIGNED NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  status ENUM('UPLOADED','VERIFIED','REJECTED') NOT NULL DEFAULT 'UPLOADED',
  reject_reason VARCHAR(255) NULL,
  reject_comment TEXT NULL,
  verified_by INT UNSIGNED NULL,
  verified_at DATETIME NULL,
  uploaded_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_docs_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_docs_type FOREIGN KEY (document_type_id) REFERENCES document_types(id),
  CONSTRAINT fk_docs_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_docs_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_docs_candidate (candidate_id),
  INDEX idx_docs_type (document_type_id),
  INDEX idx_docs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- candidate_original_verification (office-use-only section of paper form)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidate_original_verification (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT UNSIGNED NOT NULL UNIQUE,
  originals_verified TINYINT(1) NOT NULL DEFAULT 0,
  self_attested_received TINYINT(1) NOT NULL DEFAULT 0,
  verified_by INT UNSIGNED NULL,
  verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ov_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_ov_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- candidate_photos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidate_photos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT UNSIGNED NOT NULL UNIQUE,
  stored_filename VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  captured_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_photo_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- biometric_records — NEVER store raw fingerprint images
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS biometric_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT UNSIGNED NOT NULL,
  hand ENUM('LEFT_HAND','RIGHT_HAND') NOT NULL,
  provider VARCHAR(20) NOT NULL DEFAULT 'mock',
  capture_reference VARCHAR(150) NOT NULL,
  quality_score DECIMAL(5,2) NOT NULL,
  device_info VARCHAR(255) NULL,
  verification_status ENUM('CAPTURED','VERIFIED','FAILED') NOT NULL DEFAULT 'CAPTURED',
  captured_by INT UNSIGNED NULL,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bio_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  UNIQUE KEY uq_candidate_hand (candidate_id, hand),
  INDEX idx_bio_candidate (candidate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- candidate_declarations (Section C)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidate_declarations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT UNSIGNED NOT NULL UNIQUE,
  accepted TINYINT(1) NOT NULL DEFAULT 0,
  accepted_at DATETIME NULL,
  ip_address VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_decl_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- candidate_signatures
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidate_signatures (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT UNSIGNED NOT NULL UNIQUE,
  stored_filename VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sig_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- audit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(60) NULL,
  description VARCHAR(500) NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- application_status_history
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT UNSIGNED NOT NULL,
  old_status VARCHAR(40) NULL,
  new_status VARCHAR(40) NOT NULL,
  changed_by INT UNSIGNED NULL,
  remarks VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hist_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_hist_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_hist_candidate (candidate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- application_settings (key/value)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_settings (
  setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
  setting_value TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- Migration 002
-- ============================================================================
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

-- ============================================================================
-- Migration 003
-- ============================================================================
-- ============================================================================
-- Migration 003 — Persist the document checklist selection
--
-- Previously the "which document types apply to this candidate" checkbox
-- selection lived only in frontend React state, so it reset whenever the
-- wizard remounted (resuming a candidate, jumping between steps) even though
-- every other wizard step saves to the server immediately. This closes that
-- gap so the checklist behaves like every other step: fill it in, leave,
-- come back, and it's still there.
--
-- Apply with:
--   mysql -u <user> -p <db> < backend/database/migrations/003_candidate_document_selection.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS candidate_document_selection (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT UNSIGNED NOT NULL,
  document_type_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_cds_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  CONSTRAINT fk_cds_doctype FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE CASCADE,
  UNIQUE KEY uq_candidate_doctype (candidate_id, document_type_id),
  INDEX idx_cds_candidate (candidate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- Migration 004
-- ============================================================================
-- ============================================================================
-- Migration 004 — Soft delete for candidates
--
-- Candidates can now be "deleted" from the admin UI without destroying data —
-- deleted_at is set instead of removing the row, so every related table
-- (KYC, address, documents, biometrics, etc.) stays intact and the candidate
-- can be restored later from the Trash page. NULL means active/not deleted.
--
-- Apply with:
--   mysql -u <user> -p <db> < backend/database/migrations/004_candidate_soft_delete.sql
-- ============================================================================

ALTER TABLE candidates
  ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER updated_at,
  ADD COLUMN deleted_by INT UNSIGNED NULL DEFAULT NULL AFTER deleted_at,
  ADD CONSTRAINT fk_candidates_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD INDEX idx_candidates_deleted_at (deleted_at);

-- ============================================================================
-- Seed data
-- ============================================================================
-- ============================================================================
-- Seed data: document types + demo coordinators/candidates
-- Admin user is NOT seeded here — use backend/scripts/seedAdmin.js
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- document_types
-- ----------------------------------------------------------------------------
INSERT INTO document_types (name, code, is_mandatory, is_active, display_order) VALUES
  ('SSC Marksheet/Certificate', 'SSC_CERT', 1, 1, 1),
  ('HSC Marksheet/Certificate', 'HSC_CERT', 0, 1, 2),
  ('Diploma Certificate', 'DIPLOMA_CERT', 0, 1, 3),
  ('ITI Certificate', 'ITI_CERT', 0, 1, 4),
  ('Graduation Marksheet/Certificate', 'GRAD_CERT', 0, 1, 5),
  ('Post-graduation Certificate', 'PG_CERT', 0, 1, 6),
  ('Masters Marksheet/Certificate', 'MASTERS_CERT', 0, 1, 7),
  ('Other Courses', 'OTHER_COURSES', 0, 1, 8),
  ('Aadhaar Card', 'AADHAAR_CARD', 1, 1, 9),
  ('PAN Card', 'PAN_CARD', 1, 1, 10),
  ('Caste Certificate', 'CASTE_CERT', 0, 1, 11)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ----------------------------------------------------------------------------
-- application_settings defaults
-- ----------------------------------------------------------------------------
INSERT INTO application_settings (setting_key, setting_value) VALUES
  ('candidate_number_prefix', 'CAN'),
  ('max_file_size_mb', '10'),
  ('require_original_verification', 'true'),
  ('require_biometric', 'true'),
  ('require_signature', 'true'),
  ('require_declaration', 'true')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- ----------------------------------------------------------------------------
-- counters seed for candidate_number sequence (current year)
-- ----------------------------------------------------------------------------
INSERT INTO counters (counter_key, current_value) VALUES
  (CONCAT('candidate_number_', YEAR(CURDATE())), 0)
ON DUPLICATE KEY UPDATE current_value = current_value;

-- ----------------------------------------------------------------------------
-- Demo coordinators (fictional)
-- ----------------------------------------------------------------------------
INSERT INTO coordinators (name, mobile, email, employee_code, location, status) VALUES
  ('Ravi Deshmukh', '9822011111', 'ravi.deshmukh.demo@example.com', 'EMP-1001', 'Pune', 'ACTIVE'),
  ('Sunita Patil', '9822022222', 'sunita.patil.demo@example.com', 'EMP-1002', 'Mumbai', 'ACTIVE'),
  ('Anil Kulkarni', '9822033333', 'anil.kulkarni.demo@example.com', 'EMP-1003', 'Nagpur', 'INACTIVE');

-- ----------------------------------------------------------------------------
-- Demo candidates (fictional, obviously fake names) across statuses
-- ----------------------------------------------------------------------------
INSERT INTO candidates (candidate_number, full_name, mobile, email, dob, gender, coordinator_id, status, current_step, created_at) VALUES
  ('CAN-2026-000001', 'Test Demo Candidate One', '9000000001', 'demo.candidate1@example.com', '2000-01-15', 'MALE', 1, 'DRAFT', 'REGISTRATION', NOW()),
  ('CAN-2026-000002', 'Test Demo Candidate Two', '9000000002', 'demo.candidate2@example.com', '1999-05-22', 'FEMALE', 1, 'KYC_PENDING', 'KYC', NOW()),
  ('CAN-2026-000003', 'Test Demo Candidate Three', '9000000003', 'demo.candidate3@example.com', '2001-11-02', 'MALE', 2, 'DOCUMENT_VERIFICATION_PENDING', 'VERIFICATION', NOW()),
  ('CAN-2026-000004', 'Test Demo Candidate Four', '9000000004', 'demo.candidate4@example.com', '1998-07-30', 'FEMALE', 2, 'BIOMETRIC_PENDING', 'LEFT_BIOMETRIC', NOW()),
  ('CAN-2026-000005', 'Test Demo Candidate Five', '9000000005', 'demo.candidate5@example.com', '2000-09-09', 'MALE', 1, 'COMPLETED', 'SUBMITTED', NOW());

INSERT INTO counters (counter_key, current_value) VALUES (CONCAT('candidate_number_', YEAR(CURDATE())), 5)
ON DUPLICATE KEY UPDATE current_value = GREATEST(current_value, 5);

INSERT INTO candidate_kyc (candidate_id, applicant_name, father_spouse_name, gender, marital_status, dob, nationality, residency_status, pan_number, aadhaar_number, proof_of_identity, is_completed) VALUES
  (2, 'Test Demo Candidate Two', 'Demo Father Two', 'FEMALE', 'SINGLE', '1999-05-22', 'India', 'RESIDENT_INDIVIDUAL', 'ABCDE1234F', '123412341234', 'AADHAAR', 1),
  (3, 'Test Demo Candidate Three', 'Demo Father Three', 'MALE', 'SINGLE', '2001-11-02', 'India', 'RESIDENT_INDIVIDUAL', 'BCDEF2345G', '234523452345', 'AADHAAR', 1),
  (4, 'Test Demo Candidate Four', 'Demo Father Four', 'FEMALE', 'MARRIED', '1998-07-30', 'India', 'RESIDENT_INDIVIDUAL', 'CDEFG3456H', '345634563456', 'PAN', 1),
  (5, 'Test Demo Candidate Five', 'Demo Father Five', 'MALE', 'SINGLE', '2000-09-09', 'India', 'RESIDENT_INDIVIDUAL', 'DEFGH4567I', '456745674567', 'AADHAAR', 1);
