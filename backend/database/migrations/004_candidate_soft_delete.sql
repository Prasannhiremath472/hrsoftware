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
