export type CoordinatorStatus = 'ACTIVE' | 'INACTIVE';

export interface Coordinator {
  id: number;
  name: string;
  mobile: string;
  email: string | null;
  employee_code: string | null;
  location: string | null;
  status: CoordinatorStatus;
  /** Derived column from the coordinator list/detail query. */
  candidate_count: number;
  created_at: string;
  updated_at: string;
}

/** Request payload for POST /coordinators and PATCH /coordinators/:id. */
export interface CoordinatorPayload {
  name: string;
  mobile: string;
  email?: string;
  employeeCode?: string;
  location?: string;
}
