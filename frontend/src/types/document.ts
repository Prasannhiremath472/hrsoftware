export interface DocumentType {
  id: number;
  name: string;
  code: string;
  is_mandatory: 0 | 1 | boolean;
  is_active: 0 | 1 | boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** POST /document-types payload. */
export interface DocumentTypePayload {
  name: string;
  code: string;
  isMandatory: boolean;
  displayOrder: number;
}

/** PATCH /document-types/:id payload — both fields are independently togglable. */
export interface DocumentTypeUpdatePayload {
  isMandatory?: boolean;
  isActive?: boolean;
}

export type DocumentStatus = 'UPLOADED' | 'VERIFIED' | 'REJECTED';

export interface CandidateDocument {
  id: number;
  candidate_id: number;
  document_type_id: number;
  /** Joined from document_types. */
  document_type_name: string;
  stored_filename: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path: string;
  status: DocumentStatus;
  reject_reason: string | null;
  reject_comment: string | null;
  verified_by: number | null;
  verified_at: string | null;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
}
