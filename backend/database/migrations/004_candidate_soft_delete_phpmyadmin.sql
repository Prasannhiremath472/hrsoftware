-- ============================================================================
-- Migration 004 — Soft delete for candidates (phpMyAdmin version)
--
-- Adds deleted_at / deleted_by to the candidates table so candidates can be
-- "deleted" from the admin UI without destroying data (KYC, address,
-- documents, biometrics, etc. all stay intact and the candidate can be
-- restored later from the Trash page).
--
-- Plain script — no existence checks. Shared-hosting DB users (Hostinger
-- included) are often denied direct information_schema access even though
-- the ALTER itself is allowed, so this skips that check entirely. Run this
-- ONCE. If you accidentally run it a second time it will error with
-- "Duplicate column name" — that's harmless, it just means it already
-- applied; no data is affected either way.
--
-- HOW TO RUN in phpMyAdmin:
--   1. Select your database in the left sidebar.
--   2. Go to the "SQL" tab.
--   3. Paste this entire file and click "Go".
-- ============================================================================

ALTER TABLE candidates
  ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER updated_at,
  ADD COLUMN deleted_by INT UNSIGNED NULL DEFAULT NULL AFTER deleted_at,
  ADD INDEX idx_candidates_deleted_at (deleted_at);

-- Verify — should show deleted_at and deleted_by
DESCRIBE candidates;
