import {
  Settings, ClassSession, Student, Exemption, Attendance,
  AttendanceStatus, StudentSummary, SessionCost,
  EarlyExitMode, RoundingDirection
} from '../types';
import {
  getSettings, getAll, getExemptionsForStudent,
  getAttendanceForStudent, getActiveSemester
} from './storage';

// ===== Применение округления =====
export function applyRounding(
  minutes: number,
  step: number,
  direction: RoundingDirection
): number {
  if (step <= 0 || minutes <= 0) return minutes;
  switch (direction) {
    case 'up':
      return Math.ceil(minutes / step) * step;
    case 'down':
      return Math.floor(minutes / step) * step;
    case 'nearest':
      return Math.round(minutes / step) * step;
    default:
      return minutes;
  }
}

// ===== Расчёт стоимости занятия =====
export function calculateSessionCost(
  session: ClassSession,
  attendance: Attendance | null,
  settings: Settings
): SessionCost {
  const [sh, sm] = session.start_time.split(':').map(Number);
  const [eh, em] = session.end_time.split(':').map(Number);
  const plannedDuration = (eh * 60 + em) - (sh * 60 + sm);

  if (!attendance || attendance.status === 'absent') {
    return {
      session_id: session.id,
      planned_duration_minutes: plannedDuration,
      actual_absent_minutes: plannedDuration,
      counted_absent_minutes: plannedDuration,
      is_full_absent: true,
    };
  }

  if (attendance.status === 'present' || attendance.status === 'exemption') {
    return {
      session_id: session.id,
      planned_duration_minutes: plannedDuration,
      actual_absent_minutes: 0,
      counted_absent_minutes: 0,
      is_full_absent: false,
    };
  }

  if (attendance.status === 'excused') {
    const counts = settings.excused_reason_counts_to_limit;
    return {
      session_id: session.id,
      planned_duration_minutes: plannedDuration,
      actual_absent_minutes: plannedDuration,
      counted_absent_minutes: counts ? plannedDuration : 0,
      is_full_absent: false,
    };
  }

  // Для late и left_early — считаем по фактическому времени
  let actualAbsentMinutes = attendance.calculated_absent_minutes;

  if (settings.early_exit_mode === 'full_pair') {
    // Любой уход раньше = пропуск всей пары
    return {
      session_id: session.id,
      planned_duration_minutes: plannedDuration,
      actual_absent_minutes: actualAbsentMinutes,
      counted_absent_minutes: plannedDuration,
      is_full_absent: true,
    };
  }

  if (settings.early_exit_mode === 'exact') {
    return {
      session_id: session.id,
      planned_duration_minutes: plannedDuration,
      actual_absent_minutes: actualAbsentMinutes,
      counted_absent_minutes: actualAbsentMinutes,
      is_full_absent: false,
    };
  }

  // rounded
  const rounded = applyRounding(
    actualAbsentMinutes,
    settings.rounding_step_minutes,
    settings.rounding_direction
  );
  return {
    session_id: session.id,
    planned_duration_minutes: plannedDuration,
    actual_absent_minutes: actualAbsentMinutes,
    counted_absent_minutes: rounded,
    is_full_absent: false,
  };
}

// ===== Проверка: обязательно ли занятие для студента =====
export function isSessionRequiredForStudent(
  session: ClassSession,
  student: Student,
  exemptions: Exemption[]
): boolean {
  // Отменённое занятие не обязательно
  if (session.status === 'cancelled') return false;

  // Студент должен быть в группе занятия
  if (session.group_id !== student.group_id) return false;

  // Проверяем семестр
  const semester = getActiveSemester();
  if (semester) {
    if (session.date < semester.date_start || session.date > semester.date_end) return false;
  }

  // Проверяем перезачёты/освобождения
  for (const ex of exemptions) {
    if (!ex.is_active) continue;

    // Освобождение на весь семестр
    if (ex.scope === 'semester') return false;

    // Освобождение по предмету
    if (ex.scope === 'subject' && ex.subject_id === session.subject_id) return false;

    // Освобождение на конкретное занятие
    if (ex.scope === 'session' && ex.session_id === session.id) return false;

    // Освобождение на период
    if (ex.scope === 'period') {
      const from = ex.date_from || semester?.date_start || '1900-01-01';
      const to = ex.date_to || semester?.date_end || '2999-12-31';
      if (session.date >= from && session.date <= to) {
        // Если указан предмет — проверяем
        if (ex.subject_id && ex.subject_id !== session.subject_id) continue;
        return false;
      }
    }
  }

  return true;
}

// ===== Получить перезачёты студента =====
export function getStudentExemptions(studentId: string): Exemption[] {
  return getExemptionsForStudent(studentId);
}

// ===== Подсчёт использованных часов =====
export function calculateStudentUsedHours(studentId: string): { usedMinutes: number; usedHours: number } {
  const settings = getSettings();
  const attendances = getAttendanceForStudent(studentId);
  const sessions = getAll<ClassSession>('class_sessions');
  const student = getAll<Student>('students').find(s => s.id === studentId);
  if (!student) return { usedMinutes: 0, usedHours: 0 };

  const exemptions = getStudentExemptions(studentId);
  let totalAbsentMinutes = 0;

  for (const att of attendances) {
    const session = sessions.find(s => s.id === att.session_id);
    if (!session) continue;
    if (!isSessionRequiredForStudent(session, student, exemptions)) continue;

    const cost = calculateSessionCost(session, att, settings);
    totalAbsentMinutes += cost.counted_absent_minutes;
  }

  return {
    usedMinutes: totalAbsentMinutes,
    usedHours: totalAbsentMinutes / 60,
  };
}

// ===== Подсчёт оставшихся часов =====
export function calculateRemainingHours(studentId: string): {
  limitHours: number;
  usedHours: number;
  remainingHours: number;
  remainingMinutes: number;
} {
  const settings = getSettings();
  const student = getAll<Student>('students').find(s => s.id === studentId);
  const limitHours = student?.individual_limit_hours ?? settings.default_limit_hours;
  const { usedHours } = calculateStudentUsedHours(studentId);
  const remainingHours = Math.max(0, limitHours - usedHours);

  return {
    limitHours,
    usedHours,
    remainingHours,
    remainingMinutes: remainingHours * 60,
  };
}

// ===== Будущие обязательные пары =====
export function calculateFutureRequiredSessions(studentId: string): ClassSession[] {
  const student = getAll<Student>('students').find(s => s.id === studentId);
  if (!student) return [];

  const semester = getActiveSemester();
  const today = new Date().toISOString().split('T')[0];
  const sessions = getAll<ClassSession>('class_sessions')
    .filter(s => s.group_id === student.group_id && s.date >= today);

  if (semester) {
    const filtered = sessions.filter(s => s.date >= semester.date_start && s.date <= semester.date_end);
    sessions.length = 0;
    sessions.push(...filtered);
  }

  const exemptions = getStudentExemptions(studentId);
  return sessions.filter(s => isSessionRequiredForStudent(s, student, exemptions));
}

// ===== Сколько пар можно пропустить =====
export function calculateCanSkipPairs(studentId: string): number {
  const { remainingMinutes } = calculateRemainingHours(studentId);
  const futureSessions = calculateFutureRequiredSessions(studentId);

  // Сортируем по дате
  const sorted = [...futureSessions].sort((a, b) => a.date.localeCompare(b.date));

  let remaining = remainingMinutes;
  let canSkip = 0;

  for (const session of sorted) {
    const [sh, sm] = session.start_time.split(':').map(Number);
    const [eh, em] = session.end_time.split(':').map(Number);
    const duration = (eh * 60 + em) - (sh * 60 + sm);

    if (remaining >= duration) {
      remaining -= duration;
      canSkip++;
    } else {
      break;
    }
  }

  return canSkip;
}

// ===== Полная сводка по студенту =====
export function calculateStudentSummary(studentId: string): StudentSummary {
  const student = getAll<Student>('students').find(s => s.id === studentId);
  const settings = getSettings();
  if (!student) {
    return {
      student_id: studentId,
      student_name: '',
      group_name: '',
      limit_hours: 0,
      used_hours: 0,
      used_minutes: 0,
      remaining_hours: 0,
      remaining_minutes: 0,
      total_required_sessions: 0,
      attended_sessions: 0,
      missed_sessions: 0,
      future_required_sessions: 0,
      can_skip_pairs: 0,
      exemption_count: 0,
      exemption_hours: 0,
      limit_usage_percent: 0,
      is_over_limit: false,
    };
  }

  const group = getAll<any>('groups').find(g => g.id === student.group_id);
  const limitHours = student.individual_limit_hours ?? settings.default_limit_hours;
  const { usedMinutes, usedHours } = calculateStudentUsedHours(studentId);
  const remainingHours = Math.max(0, limitHours - usedHours);
  const remainingMinutes = remainingHours * 60;

  const exemptions = getStudentExemptions(studentId);
  const semester = getActiveSemester();

  // Все обязательные пары за семестр
  const allSessions = getAll<ClassSession>('class_sessions')
    .filter(s => s.group_id === student.group_id);
  const requiredSessions = allSessions.filter(s => isSessionRequiredForStudent(s, student, exemptions));
  const futureRequired = requiredSessions.filter(s => {
    const today = new Date().toISOString().split('T')[0];
    return s.date >= today;
  });

  // Посещённые
  const attendances = getAttendanceForStudent(studentId);
  const attended = attendances.filter(a => a.status === 'present' || a.status === 'late').length;
  const missed = requiredSessions.length - attended;

  // Перезачтённые часы
  let exemptionMinutes = 0;
  const exemptedSessions = allSessions.filter(s => !isSessionRequiredForStudent(s, student, exemptions) && s.status !== 'cancelled');
  for (const s of exemptedSessions) {
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    exemptionMinutes += (eh * 60 + em) - (sh * 60 + sm);
  }

  const canSkip = calculateCanSkipPairs(studentId);
  const usagePercent = limitHours > 0 ? (usedHours / limitHours) * 100 : 0;

  return {
    student_id: studentId,
    student_name: student.full_name,
    group_name: group?.name || '',
    limit_hours: limitHours,
    used_hours: Math.round(usedHours * 100) / 100,
    used_minutes: usedMinutes,
    remaining_hours: Math.round(remainingHours * 100) / 100,
    remaining_minutes: remainingMinutes,
    total_required_sessions: requiredSessions.length,
    attended_sessions: attended,
    missed_sessions: missed,
    future_required_sessions: futureRequired.length,
    can_skip_pairs: canSkip,
    exemption_count: exemptedSessions.length,
    exemption_hours: Math.round((exemptionMinutes / 60) * 100) / 100,
    limit_usage_percent: Math.round(usagePercent),
    is_over_limit: usedHours > limitHours,
  };
}

// ===== Пересчёт итогов студента =====
export function recalculateStudentTotals(studentId: string): StudentSummary {
  return calculateStudentSummary(studentId);
}
