export type CandidateStatus =
  | 'DRAFT'
  | 'KYC_PENDING'
  | 'ADDRESS_PENDING'
  | 'DOCUMENT_PENDING'
  | 'DOCUMENT_VERIFICATION_PENDING'
  | 'BIOMETRIC_PENDING'
  | 'COMPLETED'
  | 'REJECTED';

export const CANDIDATE_STATUSES: CandidateStatus[] = [
  'DRAFT',
  'KYC_PENDING',
  'ADDRESS_PENDING',
  'DOCUMENT_PENDING',
  'DOCUMENT_VERIFICATION_PENDING',
  'BIOMETRIC_PENDING',
  'COMPLETED',
  'REJECTED',
];

/** Server-side progress marker (candidates.current_step). */
export type CandidateStep =
  | 'REGISTRATION'
  | 'KYC'
  | 'ADDRESS'
  | 'DOCUMENT_CHECKLIST'
  | 'DOCUMENT_UPLOAD'
  | 'VERIFICATION'
  | 'ORIGINAL_VERIFICATION'
  | 'PHOTO'
  | 'LEFT_BIOMETRIC'
  | 'RIGHT_BIOMETRIC'
  | 'DECLARATION'
  | 'SIGNATURE'
  | 'SUBMITTED';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Candidate {
  id: number;
  candidate_number: string;
  full_name: string;
  mobile: string;
  email: string | null;
  dob: string | null;
  gender: Gender | null;
  coordinator_id: number | null;
  /** Joined from the coordinators table on list/detail queries. */
  coordinator_name?: string | null;
  status: CandidateStatus;
  current_step: CandidateStep;
  submitted_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/** Paginated list envelope used by /candidates and /audit-logs. */
export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page?: number;
  limit?: number;
}

/** Request payload for POST /candidates. */
export interface CandidateRegistrationPayload {
  fullName: string;
  mobile: string;
  email?: string;
  dob?: string;
  gender?: Gender;
  coordinatorId?: number | string;
}

export type KycGender = 'MALE' | 'FEMALE';
export type MaritalStatus = 'SINGLE' | 'MARRIED';
export type ResidencyStatus = 'RESIDENT_INDIVIDUAL' | 'NON_RESIDENT' | 'FOREIGN_NATIONAL';
export type ProofOfIdentity = 'AADHAAR' | 'PAN' | 'PASSPORT' | 'DL' | 'VOTER_ID' | 'OTHER';

/** GET /candidates/:id/kyc — identity numbers come back masked. */
export interface KycData {
  id: number;
  candidate_id: number;
  applicant_name: string | null;
  father_spouse_name: string | null;
  gender: KycGender | null;
  marital_status: MaritalStatus | null;
  dob: string | null;
  nationality: string;
  residency_status: ResidencyStatus | null;
  pan_number: string | null;
  aadhaar_number: string | null;
  proof_of_identity: ProofOfIdentity | null;
  kyc_provider_mode: string;
  kyc_reference: string | null;
  is_completed: 0 | 1 | boolean;
  created_at: string;
  updated_at: string;
}

/** PUT /candidates/:id/kyc payload. PAN/Aadhaar are omitted when left blank. */
export interface KycPayload {
  applicantName: string;
  fatherSpouseName?: string;
  gender: KycGender | '';
  maritalStatus?: MaritalStatus | '';
  dob: string;
  nationality?: string;
  residencyStatus?: ResidencyStatus;
  panNumber?: string;
  aadhaarNumber?: string;
  proofOfIdentity: ProofOfIdentity | '';
}

export type ProofOfAddress =
  | 'AADHAAR'
  | 'PASSPORT'
  | 'UTILITY_BILL'
  | 'BANK_STATEMENT'
  | 'RENT_AGREEMENT'
  | 'OTHER';

/** GET /candidates/:id/address */
export interface AddressData {
  id: number;
  candidate_id: number;
  residence_address: string | null;
  residence_pin_code: string | null;
  contact_email: string | null;
  contact_mobile: string | null;
  proof_of_address: ProofOfAddress | null;
  same_as_residence: 0 | 1 | boolean;
  permanent_address: string | null;
  permanent_pin_code: string | null;
  is_completed: 0 | 1 | boolean;
  created_at: string;
  updated_at: string;
}

/** PUT /candidates/:id/address payload. */
export interface AddressPayload {
  residenceAddress: string;
  residencePinCode: string;
  contactEmail?: string;
  contactMobile?: string;
  proofOfAddress: ProofOfAddress | '';
  sameAsResidence: boolean;
  permanentAddress?: string;
  permanentPinCode?: string;
}

/** GET/PUT /candidates/:id/original-verification */
export interface OriginalVerification {
  id: number;
  candidate_id: number;
  originals_verified: 0 | 1 | boolean;
  self_attested_received: 0 | 1 | boolean;
  verified_by: number | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/** GET/PUT /candidates/:id/declaration */
export interface Declaration {
  id: number;
  candidate_id: number;
  accepted: 0 | 1 | boolean;
  accepted_at: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

export type BiometricHand = 'LEFT_HAND' | 'RIGHT_HAND';
export type BiometricVerificationStatus = 'CAPTURED' | 'VERIFIED' | 'FAILED';

/** GET /candidates/:id/biometric — no raw fingerprint data, only references + scores. */
export interface BiometricRecord {
  id: number;
  candidate_id: number;
  hand: BiometricHand;
  provider: string;
  capture_reference: string;
  /** DECIMAL(5,2) — MySQL driver may hand this back as a string. */
  quality_score: number | string;
  device_info: string | null;
  verification_status: BiometricVerificationStatus;
  captured_by: number | null;
  captured_at: string;
  created_at: string;
}

/** GET /biometric/device-status */
export interface BiometricDeviceStatus {
  provider: string;
  connected: boolean;
  deviceName: string;
}
