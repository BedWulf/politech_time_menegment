// ===== Основные модели данных =====

export type Role = 'student' | 'monitor' | 'admin';

export type EarlyExitMode = 'full_pair' | 'exact' | 'rounded';
export type RoundingDirection = 'up' | 'down' | 'nearest';
export type LateMode = 'exact' | 'full_pair' | 'tolerance';
export type ExcusedMode = 'ignore' | 'count' | 'separate';
export type ConflictPolicy = 'role_priority' | 'latest_wins';

export type SessionStatus = 'planned' | 'cancelled' | 'moved' | 'replaced' | 'completed';
export type AttendanceStatus = 'present' | 'late' | 'left_early' | 'absent' | 'excused' | 'exemption';

export type ExemptionType = 'exemption' | 'credit_transfer' | 'individual_plan' | 'other';
export type ExemptionScope = 'subject' | 'session' | 'period' | 'semester';

// ===== Настройки =====
export interface Settings {
  default_semester_id: string;
  default_limit_hours: number;
  default_pair_duration_minutes: number;
  early_exit_mode: EarlyExitMode;
  rounding_step_minutes: number;
  rounding_direction: RoundingDirection;
  late_tolerance_minutes: number;
  late_mode: LateMode;
  excused_reason_counts_to_limit: boolean;
  role_conflict_policy: ConflictPolicy;
}

export const DEFAULT_SETTINGS: Settings = {
  default_semester_id: '',
  default_limit_hours: 100,
  default_pair_duration_minutes: 120,
  early_exit_mode: 'full_pair',
  rounding_step_minutes: 15,
  rounding_direction: 'up',
  late_tolerance_minutes: 10,
  late_mode: 'exact',
  excused_reason_counts_to_limit: false,
  role_conflict_policy: 'role_priority',
};

// ===== Сущности =====
export interface Semester {
  id: string;
  name: string;
  date_start: string; // ISO date
  date_end: string;
  is_active: boolean;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_at: string;
}

export interface Student {
  id: string;
  full_name: string;
  group_id: string;
  individual_limit_hours: number | null; // null = использовать дефолтный
  user_id: string;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  password_hash: string; // простой хеш для локального использования
  role: Role;
  student_id: string | null;
  group_id: string | null; // для старосты
  created_at: string;
}

export interface Teacher {
  id: string;
  full_name: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  created_at: string;
}

export interface ScheduleTemplate {
  id: string;
  group_id: string;
  weekday: number; // 0=Пн, 6=Вс
  pair_number: number | null;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  subject_id: string;
  teacher_id: string;
  room: string;
  date_from: string;
  date_to: string;
  is_active: boolean;
  created_at: string;
}

export interface ClassSession {
  id: string;
  date: string; // ISO date
  group_id: string;
  subject_id: string;
  teacher_id: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  room: string;
  status: SessionStatus;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exemption {
  id: string;
  student_id: string;
  type: ExemptionType;
  scope: ExemptionScope;
  subject_id: string | null;
  session_id: string | null;
  date_from: string | null;
  date_to: string | null;
  reason: string;
  comment: string;
  is_active: boolean;
  created_by: string; // user_id
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  actual_arrival: string | null; // ISO datetime
  actual_departure: string | null; // ISO datetime
  calculated_absent_minutes: number; // рассчитанные пропущенные минуты
  comment: string;
  created_by: string; // user_id
  created_at: string;
  updated_at: string;
  active_revision_id: string | null;
}

export interface AttendanceRevision {
  id: string;
  attendance_id: string;
  old_status: AttendanceStatus | null;
  new_status: AttendanceStatus;
  old_absent_minutes: number;
  new_absent_minutes: number;
  changed_by: string;
  changed_by_role: Role;
  changed_at: string;
  comment: string;
  source: 'web' | 'import' | 'sync';
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

// ===== Расчётные данные =====
export interface StudentSummary {
  student_id: string;
  student_name: string;
  group_name: string;
  limit_hours: number;
  used_hours: number;
  used_minutes: number;
  remaining_hours: number;
  remaining_minutes: number;
  total_required_sessions: number;
  attended_sessions: number;
  missed_sessions: number;
  future_required_sessions: number;
  can_skip_pairs: number;
  exemption_count: number;
  exemption_hours: number;
  limit_usage_percent: number;
  is_over_limit: boolean;
}

export interface SessionCost {
  session_id: string;
  planned_duration_minutes: number;
  actual_absent_minutes: number;
  counted_absent_minutes: number;
  is_full_absent: boolean;
}
