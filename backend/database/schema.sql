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
