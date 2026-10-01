import { ScheduleTemplate, ClassSession, SessionStatus } from '../types';
import { getAll, createItem, getActiveSemester } from './storage';

// Генерация занятий из шаблонов на весь семестр
export function generateSessionsFromTemplates(semesterId?: string): ClassSession[] {
  const semester = getActiveSemester();
  if (!semester) return [];

  const templates = getAll<ScheduleTemplate>('schedule_templates').filter(t => t.is_active);
  const existingSessions = getAll<ClassSession>('class_sessions');
  const generated: ClassSession[] = [];

  // Получаем все даты в диапазоне семестра
  const start = new Date(semester.date_start);
  const end = new Date(semester.date_end);
  const dates: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  for (const template of templates) {
    // Проверяем, что шаблон активен в пределах дат
    for (const date of dates) {
      if (date < template.date_from || date > template.date_to) continue;

      const dateObj = new Date(date);
      const weekday = dateObj.getDay();
      // JS: 0=Вс, 1=Пн ... 6=Сб. Наши: 0=Пн ... 6=Вс
      const ourWeekday = weekday === 0 ? 6 : weekday - 1;

      if (ourWeekday !== template.weekday) continue;

      // Проверяем, не существует ли уже такое занятие
      const exists = existingSessions.some(
        s => s.date === date &&
             s.group_id === template.group_id &&
             s.start_time === template.start_time &&
             s.subject_id === template.subject_id
      );

      if (exists) continue;

      const session: Omit<ClassSession, 'id'> = {
        date,
        group_id: template.group_id,
        subject_id: template.subject_id,
        teacher_id: template.teacher_id,
        start_time: template.start_time,
        end_time: template.end_time,
        room: template.room,
        status: 'planned' as SessionStatus,
        template_id: template.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const created = createItem<ClassSession>('class_sessions', session);
      generated.push(created);
    }
  }

  return generated;
}

// Получить уникальные даты занятий для группы
export function getGroupSessionDates(groupId: string): string[] {
  const sessions = getAll<ClassSession>('class_sessions')
    .filter(s => s.group_id === groupId && s.status !== 'cancelled');
  const dates = [...new Set(sessions.map(s => s.date))];
  return dates.sort();
}

// Получить занятия группы на конкретную дату
export function getGroupSessionsOnDate(groupId: string, date: string): ClassSession[] {
  return getAll<ClassSession>('class_sessions')
    .filter(s => s.group_id === groupId && s.date === date)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

// Получить ближайшие занятия студента
export function getUpcomingSessionsForStudent(studentId: string, limit: number = 10): ClassSession[] {
  const student = getAll<any>('students').find(s => s.id === studentId);
  if (!student) return [];

  const today = new Date().toISOString().split('T')[0];
  return getAll<ClassSession>('class_sessions')
    .filter(s => s.group_id === student.group_id && s.date >= today && s.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
    .slice(0, limit);
}
