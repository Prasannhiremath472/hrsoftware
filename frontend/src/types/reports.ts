export type ReportKey = 'candidates' | 'coordinators' | 'status' | 'biometric' | 'documents';

export const REPORT_DEFS: Array<{ key: ReportKey; label: string }> = [
  { key: 'candidates', label: 'Candidates Report' },
  { key: 'coordinators', label: 'Coordinators Report' },
  { key: 'status', label: 'Status Distribution Report' },
  { key: 'biometric', label: 'Biometric Capture Report' },
  { key: 'documents', label: 'Documents Report' },
];

/**
 * Report rows are rendered generically from whatever columns the backend returns,
 * so they are typed as an open record of primitives.
 */
export type ReportRow = Record<string, string | number | boolean | null>;

/** GET /reports/coordinators — also drives the dashboard's coordinator table. */
export interface CoordinatorReportRow {
  id: number;
  name: string;
  mobile: string;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  total_candidates: number;
  completed_candidates: number;
}

/** GET /reports/monthly-registrations */
export interface MonthlyRegistrationRow {
  month: string;
  total: number;
}

/** Derived client-side from the candidate list for the dashboard pie chart. */
export interface StatusDistributionRow {
  status: string;
  total: number;
}
