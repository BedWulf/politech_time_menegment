import {
  Settings, DEFAULT_SETTINGS, Semester, Group, Student, User,
  Teacher, Subject, ScheduleTemplate, ClassSession, Exemption,
  Attendance, AttendanceRevision, AuditLog
} from '../types';

const DB_KEY = 'attendance_app_db';

interface Database {
  settings: Settings;
  semesters: Semester[];
  groups: Group[];
  students: Student[];
  users: User[];
  teachers: Teacher[];
  subjects: Subject[];
  schedule_templates: ScheduleTemplate[];
  class_sessions: ClassSession[];
  exemptions: Exemption[];
  attendances: Attendance[];
  attendance_revisions: AttendanceRevision[];
  audit_log: AuditLog[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getDefaultDB(): Database {
  return {
    settings: { ...DEFAULT_SETTINGS },
    semesters: [],
    groups: [],
    students: [],
    users: [],
    teachers: [],
    subjects: [],
    schedule_templates: [],
    class_sessions: [],
    exemptions: [],
    attendances: [],
    attendance_revisions: [],
    audit_log: [],
  };
}

function loadDB(): Database {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw) as Database;
      // Ensure all keys exist
      const def = getDefaultDB();
      for (const key of Object.keys(def) as (keyof Database)[]) {
        if (!(key in db)) {
          (db as any)[key] = def[key];
        }
      }
      return db;
    }
  } catch (e) {
    console.error('Failed to load DB:', e);
  }
  return getDefaultDB();
}

function saveDB(db: Database): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

let _db: Database | null = null;

export function getDB(): Database {
  if (!_db) _db = loadDB();
  return _db;
}

export function saveCurrentDB(): void {
  if (_db) saveDB(_db);
}

export function resetDB(): void {
  _db = getDefaultDB();
  saveDB(_db);
}

// ===== Settings =====
export function getSettings(): Settings {
  return getDB().settings;
}

export function updateSettings(partial: Partial<Settings>): Settings {
  const db = getDB();
  db.settings = { ...db.settings, ...partial };
  saveDB(db);
  return db.settings;
}

// ===== Generic CRUD =====
export function getAll<T extends { id: string }>(collection: keyof Database): T[] {
  return (getDB()[collection] as unknown as T[]) || [];
}

export function getById<T extends { id: string }>(collection: keyof Database, id: string): T | null {
  const items = getDB()[collection] as unknown as T[];
  return items?.find(i => i.id === id) || null;
}

export function createItem<T extends { id: string }>(collection: keyof Database, item: Omit<T, 'id'>): T {
  const db = getDB();
  const newItem = { ...item, id: generateId() } as T;
  (db[collection] as any).push(newItem);
  saveDB(db);
  return newItem;
}

export function updateItem(collection: keyof Database, id: string, updates: Record<string, any>): any {
  const db = getDB();
  const items = db[collection] as any[];
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...updates };
  saveDB(db);
  return items[idx];
}

export function deleteItem(collection: keyof Database, id: string): boolean {
  const db = getDB();
  const items = db[collection] as any[];
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return false;
  items.splice(idx, 1);
  saveDB(db);
  return true;
}

// ===== Specific helpers =====
export function getStudentsByGroup(groupId: string): Student[] {
  return getAll<Student>('students').filter(s => s.group_id === groupId);
}

export function getSessionsByGroup(groupId: string): ClassSession[] {
  return getAll<ClassSession>('class_sessions').filter(s => s.group_id === groupId);
}

export function getSessionsByDate(date: string): ClassSession[] {
  return getAll<ClassSession>('class_sessions').filter(s => s.date === date);
}

export function getAttendanceForSession(sessionId: string): Attendance[] {
  return getAll<Attendance>('attendances').filter(a => a.session_id === sessionId);
}

export function getAttendanceForStudent(studentId: string): Attendance[] {
  return getAll<Attendance>('attendances').filter(a => a.student_id === studentId);
}

export function getExemptionsForStudent(studentId: string): Exemption[] {
  return getAll<Exemption>('exemptions').filter(e => e.student_id === studentId && e.is_active);
}

export function getActiveSemester(): Semester | null {
  const db = getDB();
  const semId = db.settings.default_semester_id;
  if (semId) {
    const s = db.semesters.find(s => s.id === semId);
    if (s) return s;
  }
  return db.semesters.find(s => s.is_active) || db.semesters[0] || null;
}

export function findUser(username: string, password: string): User | null {
  const users = getAll<User>('users');
  return users.find(u => u.username === username && u.password_hash === password) || null;
}

// ===== Export/Import =====
export function exportToJSON(): string {
  return JSON.stringify(getDB(), null, 2);
}

export function exportToCSV(collection: keyof Database): string {
  const items = getDB()[collection] as any[];
  if (!items || items.length === 0) return '';
  const headers = Object.keys(items[0]);
  const rows = items.map(item => headers.map(h => JSON.stringify(item[h] ?? '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function importFromJSON(json: string): boolean {
  try {
    const data = JSON.parse(json);
    _db = { ...getDefaultDB(), ...data };
    if (_db) saveDB(_db);
    return true;
  } catch {
    return false;
  }
}
