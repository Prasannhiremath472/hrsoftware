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
