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
