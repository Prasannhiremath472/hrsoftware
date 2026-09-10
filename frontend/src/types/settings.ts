/**
 * GET /settings returns the application_settings key/value table flattened into a
 * single object. Values are stored as TEXT, so booleans arrive as the strings
 * "true"/"false" and numbers as strings — the UI normalises on read and writes back
 * in the same string form the backend expects.
 */
export interface AppSettings {
  candidate_number_prefix: string;
  max_file_size_mb: string;
  require_original_verification: string;
  require_biometric: string;
  require_declaration: string;
  [key: string]: string;
}

export const SETTING_FLAGS = [
  ['require_original_verification', 'Require Original Verification'],
  ['require_biometric', 'Require Biometric Capture'],
  ['require_declaration', 'Require Declaration'],
] as const;

export function isFlagOn(value: string | undefined): boolean {
  return String(value).toLowerCase() === 'true';
}
