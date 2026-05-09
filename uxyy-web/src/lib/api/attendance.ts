import { apiFetch } from "./client";

export interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'normal' | 'late' | 'early_leave' | 'absent' | 'leave' | 'overtime';
  workHours: number;
  lateMinutes: number;
  earlyMinutes: number;
  location?: string;
}

export interface AttendanceStats {
  totalDays: number;
  normalDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  absentDays: number;
  leaveDays: number;
  overtimeDays: number;
  totalWorkHours: number;
  totalLateMinutes: number;
  totalEarlyMinutes: number;
}

export interface PersonalAttendanceResponse {
  records: AttendanceRecord[];
  stats: AttendanceStats;
}

export interface EnterpriseOverviewResponse {
  date: string;
  totalEmployees: number;
  checkedIn: number;
  checkedOut: number;
  late: number;
  absent: number;
  checkInRate: string;
  details: Array<{
    userId: number;
    userName: string;
    checkIn?: string;
    checkOut?: string;
    status: string;
  }>;
}

export interface DepartmentAttendanceResponse {
  month: string;
  departmentId: string;
  employeeCount: number;
  userStats: Record<number, {
    name: string;
    stats: AttendanceStats;
  }>;
}

export interface CheckInResponse {
  message: string;
  record?: AttendanceRecord;
}

export interface MakeUpRequest {
  id: number;
  userId: number;
  enterpriseId: number;
  date: string;
  type: 'in' | 'out';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approverId?: number;
  approvedAt?: string;
  remark?: string;
  createdAt: string;
}

export async function checkIn(type: 'in' | 'out', location?: string): Promise<CheckInResponse> {
  return apiFetch<CheckInResponse>('/oa/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify({ type, location }),
  });
}

export async function getPersonalAttendance(startDate?: string, endDate?: string): Promise<PersonalAttendanceResponse> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return apiFetch<PersonalAttendanceResponse>(`/oa/attendance/personal${qs ? `?${qs}` : ''}`);
}

export async function getEnterpriseOverview(date?: string): Promise<EnterpriseOverviewResponse> {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  const qs = params.toString();
  return apiFetch<EnterpriseOverviewResponse>(`/oa/attendance/overview${qs ? `?${qs}` : ''}`);
}

export async function getDepartmentAttendance(departmentId: string, month: string): Promise<DepartmentAttendanceResponse> {
  return apiFetch<DepartmentAttendanceResponse>(`/oa/attendance/department/${departmentId}?month=${month}`);
}

export async function requestMakeUp(date: string, type: 'in' | 'out', reason: string): Promise<MakeUpRequest> {
  return apiFetch<MakeUpRequest>('/oa/attendance/make-up', {
    method: 'POST',
    body: JSON.stringify({ date, type, reason }),
  });
}

export async function approveMakeUp(requestId: number, approved: boolean, remark?: string): Promise<MakeUpRequest> {
  return apiFetch<MakeUpRequest>(`/oa/attendance/make-up/${requestId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ approved, remark }),
  });
}