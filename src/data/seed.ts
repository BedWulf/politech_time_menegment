import { createItem, updateItem, updateSettings, getAll } from '../services/storage';
import { generateSessionsFromTemplates } from '../services/schedule';

export function seedTestData(): void {
  // Создаём пользователей
  const admin = createItem<any>('users', {
    username: 'admin',
    password_hash: 'admin',
    role: 'admin',
    student_id: null,
    group_id: null,
    created_at: new Date().toISOString(),
  });

  const monitor = createItem<any>('users', {
    username: 'starosta',
    password_hash: 'starosta',
    role: 'monitor',
    student_id: null,
    group_id: null,
    created_at: new Date().toISOString(),
  });

  const student1User = createItem<any>('users', {
    username: 'ivanov',
    password_hash: 'ivanov',
    role: 'student',
    student_id: null,
    group_id: null,
    created_at: new Date().toISOString(),
  });

  const student2User = createItem<any>('users', {
    username: 'petrov',
    password_hash: 'petrov',
    role: 'student',
    student_id: null,
    group_id: null,
    created_at: new Date().toISOString(),
  });

  // Создаём семестр
  const semester = createItem<any>('semesters', {
    name: 'Осенний семестр 2025',
    date_start: '2025-09-01',
    date_end: '2025-12-31',
    is_active: true,
    created_at: new Date().toISOString(),
  });

  updateSettings({ default_semester_id: semester.id });

  // Создаём группу
  const group = createItem<any>('groups', {
    name: 'ИТ-201',
    created_at: new Date().toISOString(),
  });

  // Обновляем старосту
  updateItem('users', monitor.id, { group_id: group.id });

  // Создаём предметы
  const math = createItem<any>('subjects', {
    name: 'Математика',
    created_at: new Date().toISOString(),
  });
  const physics = createItem<any>('subjects', {
    name: 'Физика',
    created_at: new Date().toISOString(),
  });
  const programming = createItem<any>('subjects', {
    name: 'Программирование',
    created_at: new Date().toISOString(),
  });
  const english = createItem<any>('subjects', {
    name: 'Английский язык',
    created_at: new Date().toISOString(),
  });

  // Создаём преподавателей
  const teacher1 = createItem<any>('teachers', {
    full_name: 'Сидоров А.П.',
    created_at: new Date().toISOString(),
  });
  const teacher2 = createItem<any>('teachers', {
    full_name: 'Козлова М.И.',
    created_at: new Date().toISOString(),
  });
  const teacher3 = createItem<any>('teachers', {
    full_name: 'Новиков Д.С.',
    created_at: new Date().toISOString(),
  });
  const teacher4 = createItem<any>('teachers', {
    full_name: 'Белова Е.В.',
    created_at: new Date().toISOString(),
  });

  // Создаём студентов
  const s1 = createItem<any>('students', {
    full_name: 'Иванов Иван Иванович',
    group_id: group.id,
    individual_limit_hours: null,
    user_id: student1User.id,
    created_at: new Date().toISOString(),
  });
  updateItem('users', student1User.id, { student_id: s1.id, group_id: group.id });

  const s2 = createItem<any>('students', {
    full_name: 'Петров Пётр Петрович',
    group_id: group.id,
    individual_limit_hours: null,
    user_id: student2User.id,
    created_at: new Date().toISOString(),
  });
  updateItem('users', student2User.id, { student_id: s2.id, group_id: group.id });

  const s3 = createItem<any>('students', {
    full_name: 'Сидорова Анна Сергеевна',
    group_id: group.id,
    individual_limit_hours: 80,
    user_id: null,
    created_at: new Date().toISOString(),
  });

  createItem<any>('students', {
    full_name: 'Козлов Дмитрий Алексеевич',
    group_id: group.id,
    individual_limit_hours: null,
    user_id: null,
    created_at: new Date().toISOString(),
  });

  createItem<any>('students', {
    full_name: 'Морозова Елена Викторовна',
    group_id: group.id,
    individual_limit_hours: null,
    user_id: null,
    created_at: new Date().toISOString(),
  });

  // Создаём шаблоны расписания
  // Понедельник (weekday=0)
  createItem<any>('schedule_templates', {
    group_id: group.id, weekday: 0, pair_number: 1,
    start_time: '09:00', end_time: '10:30',
    subject_id: math.id, teacher_id: teacher1.id, room: '301',
    date_from: '2025-09-01', date_to: '2025-12-31',
    is_active: true, created_at: new Date().toISOString(),
  });
  createItem<any>('schedule_templates', {
    group_id: group.id, weekday: 0, pair_number: 2,
    start_time: '10:40', end_time: '12:10',
    subject_id: programming.id, teacher_id: teacher3.id, room: '205',
    date_from: '2025-09-01', date_to: '2025-12-31',
    is_active: true, created_at: new Date().toISOString(),
  });

  // Среда (weekday=2)
  createItem<any>('schedule_templates', {
    group_id: group.id, weekday: 2, pair_number: 1,
    start_time: '09:00', end_time: '10:30',
    subject_id: physics.id, teacher_id: teacher2.id, room: '110',
    date_from: '2025-09-01', date_to: '2025-12-31',
    is_active: true, created_at: new Date().toISOString(),
  });
  createItem<any>('schedule_templates', {
    group_id: group.id, weekday: 2, pair_number: 2,
    start_time: '10:40', end_time: '12:10',
    subject_id: english.id, teacher_id: teacher4.id, room: '404',
    date_from: '2025-09-01', date_to: '2025-12-31',
    is_active: true, created_at: new Date().toISOString(),
  });

  // Пятница (weekday=4)
  createItem<any>('schedule_templates', {
    group_id: group.id, weekday: 4, pair_number: 1,
    start_time: '09:00', end_time: '10:30',
    subject_id: math.id, teacher_id: teacher1.id, room: '301',
    date_from: '2025-09-01', date_to: '2025-12-31',
    is_active: true, created_at: new Date().toISOString(),
  });
  createItem<any>('schedule_templates', {
    group_id: group.id, weekday: 4, pair_number: 2,
    start_time: '10:40', end_time: '12:10',
    subject_id: physics.id, teacher_id: teacher2.id, room: '110',
    date_from: '2025-09-01', date_to: '2025-12-31',
    is_active: true, created_at: new Date().toISOString(),
  });

  // Генерируем занятия
  generateSessionsFromTemplates();

  // Перезачёт для Иванова по английскому
  createItem<any>('exemptions', {
    student_id: s1.id,
    type: 'credit_transfer',
    scope: 'subject',
    subject_id: english.id,
    session_id: null,
    date_from: '2025-09-01',
    date_to: '2025-12-31',
    reason: 'Перезачёт по результатам олимпиады',
    comment: '',
    is_active: true,
    created_by: admin.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Освобождение для Сидоровой на период
  createItem<any>('exemptions', {
    student_id: s3.id,
    type: 'individual_plan',
    scope: 'period',
    subject_id: null,
    session_id: null,
    date_from: '2025-10-01',
    date_to: '2025-10-31',
    reason: 'Академический отпуск по болезни',
    comment: 'Справка приложена',
    is_active: true,
    created_by: admin.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
