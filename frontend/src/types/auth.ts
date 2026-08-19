/** Authenticated Super Admin, as returned by /auth/me and /auth/verify-otp. */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active?: 0 | 1 | boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Step 1 of login — password accepted, OTP emailed, session not yet established. */
export interface PreAuthChallenge {
  preAuthToken: string;
  expiresAt: string;
  otpTtlMinutes: number;
  /** True when the server has no mail transport configured and logged the OTP instead. */
  devFallback?: boolean;
}

/** Step 2 of login — OTP verified, JWT issued. */
export interface VerifiedSession {
  token: string;
  user: AuthUser;
}

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
