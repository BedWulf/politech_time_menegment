import React, { useState, useMemo } from 'react';
import { User, Settings, Attendance, AttendanceStatus, ClassSession, Exemption } from '../types';
import { getAll, createItem, updateItem, deleteItem, getSettings, updateSettings, exportToJSON, importFromJSON, getStudentsByGroup } from '../services/storage';
import { calculateStudentSummary, isSessionRequiredForStudent, getStudentExemptions } from '../services/attendance';
import { generateSessionsFromTemplates } from '../services/schedule';

interface Props {
  user: User;
  refresh: () => void;
}

type Tab = 'overview' | 'semesters' | 'groups' | 'students' | 'subjects' | 'teachers' | 'templates' | 'sessions' | 'attendance' | 'exemptions' | 'settings' | 'backup';

export default function AdminDashboard({ user, refresh }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: '📊 Обзор' },
    { key: 'semesters', label: '📅 Семестры' },
    { key: 'groups', label: '👥 Группы' },
    { key: 'students', label: '🎓 Студенты' },
    { key: 'subjects', label: '📖 Предметы' },
    { key: 'teachers', label: '👨‍🏫 Преподаватели' },
    { key: 'templates', label: '📋 Шаблоны' },
    { key: 'sessions', label: '📆 Занятия' },
    { key: 'attendance', label: '✅ Посещаемость' },
    { key: 'exemptions', label: '🔄 Перезачёты' },
    { key: 'settings', label: '⚙️ Настройки' },
    { key: 'backup', label: '💾 Бэкап' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Панель администратора</h2>

      <div className="flex gap-1 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'semesters' && <SemestersTab refresh={refresh} />}
      {activeTab === 'groups' && <GroupsTab refresh={refresh} />}
      {activeTab === 'students' && <StudentsTab refresh={refresh} />}
      {activeTab === 'subjects' && <SubjectsTab refresh={refresh} />}
      {activeTab === 'teachers' && <TeachersTab refresh={refresh} />}
      {activeTab === 'templates' && <TemplatesTab refresh={refresh} />}
      {activeTab === 'sessions' && <SessionsTab refresh={refresh} />}
      {activeTab === 'attendance' && <AttendanceTab refresh={refresh} userId={user.id} />}
      {activeTab === 'exemptions' && <ExemptionsTab refresh={refresh} userId={user.id} />}
      {activeTab === 'settings' && <SettingsTab refresh={refresh} />}
      {activeTab === 'backup' && <BackupTab refresh={refresh} />}
    </div>
  );
}

// ===== OVERVIEW =====
function OverviewTab() {
  const groups = getAll<any>('groups');
  const students = getAll<any>('students');
  const sessions = getAll<ClassSession>('class_sessions');
  const settings = getSettings();
  const semester = getAll<any>('semesters').find((s: any) => s.id === settings.default_semester_id);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-400">
        <p className="text-sm text-gray-500">Семестр</p>
        <p className="text-lg font-bold">{semester?.name || 'Не выбран'}</p>
        <p className="text-xs text-gray-400">{semester?.date_start} — {semester?.date_end}</p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-400">
        <p className="text-sm text-gray-500">Групп</p>
        <p className="text-2xl font-bold text-green-700">{groups.length}</p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-400">
        <p className="text-sm text-gray-500">Студентов</p>
        <p className="text-2xl font-bold text-purple-700">{students.length}</p>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-orange-400">
        <p className="text-sm text-gray-500">Занятий создано</p>
        <p className="text-2xl font-bold text-orange-700">{sessions.length}</p>
      </div>
    </div>
  );
}

// ===== SEMESTERS =====
function SemestersTab({ refresh }: { refresh: () => void }) {
  const semesters = getAll<any>('semesters');
  const settings = getSettings();
  const [name, setName] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const handleAdd = () => {
    if (!name || !dateStart || !dateEnd) return;
    createItem('semesters', { name, date_start: dateStart, date_end: dateEnd, is_active: true, created_at: new Date().toISOString() });
    setName(''); setDateStart(''); setDateEnd('');
    refresh();
  };

  const handleSetActive = (id: string) => {
    updateSettings({ default_semester_id: id });
    refresh();
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <h3 className="font-semibold mb-3">Добавить семестр</h3>
        <div className="flex gap-2 flex-wrap">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название" className="border rounded px-3 py-2 flex-1 min-w-[150px]" />
          <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="border rounded px-3 py-2" />
          <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="border rounded px-3 py-2" />
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Добавить</button>
        </div>
      </div>
      <div className="space-y-2">
        {semesters.map((s: any) => (
          <div key={s.id} className={`bg-white rounded-lg p-4 shadow-sm flex justify-between items-center ${s.id === settings.default_semester_id ? 'border-l-4 border-blue-500' : ''}`}>
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-gray-500">{s.date_start} — {s.date_end}</p>
            </div>
            <button
              onClick={() => handleSetActive(s.id)}
              className={`px-3 py-1 rounded text-sm ${s.id === settings.default_semester_id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              {s.id === settings.default_semester_id ? '✓ Активный' : 'Сделать активным'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== GROUPS =====
function GroupsTab({ refresh }: { refresh: () => void }) {
  const groups = getAll<any>('groups');
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name) return;
    createItem('groups', { name, created_at: new Date().toISOString() });
    setName('');
    refresh();
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название группы" className="border rounded px-3 py-2 flex-1" />
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Добавить</button>
        </div>
      </div>
      <div className="space-y-2">
        {groups.map((g: any) => {
          const count = getStudentsByGroup(g.id).length;
          return (
            <div key={g.id} className="bg-white rounded-lg p-4 shadow-sm flex justify-between items-center">
              <span className="font-medium">{g.name}</span>
              <span className="text-sm text-gray-500">{count} студентов</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== STUDENTS =====
function StudentsTab({ refresh }: { refresh: () => void }) {
  const students = getAll<any>('students');
  const groups = getAll<any>('groups');
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [limit, setLimit] = useState('');

  const handleAdd = () => {
    if (!name || !groupId) return;
    createItem('students', {
      full_name: name,
      group_id: groupId,
      individual_limit_hours: limit ? Number(limit) : null,
      user_id: null,
      created_at: new Date().toISOString(),
    });
    setName(''); setLimit('');
    refresh();
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <h3 className="font-semibold mb-3">Добавить студента</h3>
        <div className="flex gap-2 flex-wrap">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="ФИО" className="border rounded px-3 py-2 flex-1 min-w-[200px]" />
          <select value={groupId} onChange={e => setGroupId(e.target.value)} className="border rounded px-3 py-2">
            {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input value={limit} onChange={e => setLimit(e.target.value)} placeholder="Лимит (часов)" type="number" className="border rounded px-3 py-2 w-32" />
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Добавить</button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">ФИО</th>
              <th className="px-4 py-2 text-left">Группа</th>
              <th className="px-4 py-2 text-center">Лимит</th>
              <th className="px-4 py-2 text-center">Пропущено</th>
              <th className="px-4 py-2 text-center">Остаток</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s: any) => {
              const group = groups.find((g: any) => g.id === s.group_id);
              const summary = calculateStudentSummary(s.id);
              return (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2">{s.full_name}</td>
                  <td className="px-4 py-2">{group?.name}</td>
                  <td className="px-4 py-2 text-center">{summary.limit_hours} ч</td>
                  <td className="px-4 py-2 text-center">{summary.used_hours} ч</td>
                  <td className="px-4 py-2 text-center font-medium">{summary.remaining_hours} ч</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== SUBJECTS =====
function SubjectsTab({ refresh }: { refresh: () => void }) {
  const subjects = getAll<any>('subjects');
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name) return;
    createItem('subjects', { name, created_at: new Date().toISOString() });
    setName('');
    refresh();
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название предмета" className="border rounded px-3 py-2 flex-1" />
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Добавить</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {subjects.map((s: any) => (
          <div key={s.id} className="bg-white rounded-lg p-3 shadow-sm">{s.name}</div>
        ))}
      </div>
    </div>
  );
}

// ===== TEACHERS =====
function TeachersTab({ refresh }: { refresh: () => void }) {
  const teachers = getAll<any>('teachers');
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name) return;
    createItem('teachers', { full_name: name, created_at: new Date().toISOString() });
    setName('');
    refresh();
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="ФИО преподавателя" className="border rounded px-3 py-2 flex-1" />
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Добавить</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {teachers.map((t: any) => (
          <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm">{t.full_name}</div>
        ))}
      </div>
    </div>
  );
}

// ===== TEMPLATES =====
function TemplatesTab({ refresh }: { refresh: () => void }) {
  const templates = getAll<any>('schedule_templates');
  const groups = getAll<any>('groups');
  const subjects = getAll<any>('subjects');
  const teachers = getAll<any>('teachers');
  const weekdays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [weekday, setWeekday] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [room, setRoom] = useState('');

  const handleAdd = () => {
    if (!groupId || !subjectId || !teacherId) return;
    createItem('schedule_templates', {
      group_id: groupId, weekday, pair_number: null,
      start_time: startTime, end_time: endTime,
      subject_id: subjectId, teacher_id: teacherId, room,
      date_from: '2025-09-01', date_to: '2025-12-31',
      is_active: true, created_at: new Date().toISOString(),
    });
    refresh();
  };

  const handleGenerate = () => {
    const count = generateSessionsFromTemplates().length;
    alert(`Сгенерировано занятий: ${count}`);
    refresh();
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <h3 className="font-semibold mb-3">Добавить шаблон расписания</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={groupId} onChange={e => setGroupId(e.target.value)} className="border rounded px-3 py-2">
            {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={weekday} onChange={e => setWeekday(Number(e.target.value))} className="border rounded px-3 py-2">
            {weekdays.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="border rounded px-3 py-2" />
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="border rounded px-3 py-2" />
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="border rounded px-3 py-2">
            {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="border rounded px-3 py-2">
            {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <input value={room} onChange={e => setRoom(e.target.value)} placeholder="Аудитория" className="border rounded px-3 py-2" />
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Добавить шаблон</button>
          <button onClick={handleGenerate} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">⚡ Сгенерировать занятия</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Группа</th>
              <th className="px-3 py-2 text-left">День</th>
              <th className="px-3 py-2 text-left">Время</th>
              <th className="px-3 py-2 text-left">Предмет</th>
              <th className="px-3 py-2 text-left">Преподаватель</th>
              <th className="px-3 py-2 text-left">Ауд.</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t: any) => {
              const group = groups.find((g: any) => g.id === t.group_id);
              const subject = subjects.find((s: any) => s.id === t.subject_id);
              const teacher = teachers.find((te: any) => te.id === t.teacher_id);
              return (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2">{group?.name}</td>
                  <td className="px-3 py-2">{weekdays[t.weekday]}</td>
                  <td className="px-3 py-2">{t.start_time}–{t.end_time}</td>
                  <td className="px-3 py-2">{subject?.name}</td>
                  <td className="px-3 py-2">{teacher?.full_name}</td>
                  <td className="px-3 py-2">{t.room}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== SESSIONS =====
function SessionsTab({ refresh }: { refresh: () => void }) {
  const sessions = getAll<ClassSession>('class_sessions');
  const subjects = getAll<any>('subjects');
  const groups = getAll<any>('groups');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const filtered = sessions
    .filter(s => !filterGroup || s.group_id === filterGroup)
    .filter(s => !filterDate || s.date === filterDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

  const handleCancel = (id: string) => {
    updateItem('class_sessions', id, { status: 'cancelled', updated_at: new Date().toISOString() });
    refresh();
  };

  const handleRestore = (id: string) => {
    updateItem('class_sessions', id, { status: 'planned', updated_at: new Date().toISOString() });
    refresh();
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4 flex gap-2 flex-wrap">
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="border rounded px-3 py-2">
          <option value="">Все группы</option>
          {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="border rounded px-3 py-2" />
        <button onClick={() => { setFilterGroup(''); setFilterDate(''); }} className="text-sm text-blue-600 hover:underline">Сбросить фильтры</button>
      </div>

      <p className="text-sm text-gray-500 mb-2">Показано: {filtered.length} из {sessions.length}</p>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">Дата</th>
              <th className="px-3 py-2 text-left">Время</th>
              <th className="px-3 py-2 text-left">Группа</th>
              <th className="px-3 py-2 text-left">Предмет</th>
              <th className="px-3 py-2 text-left">Статус</th>
              <th className="px-3 py-2 text-left">Действие</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map(s => {
              const group = groups.find((g: any) => g.id === s.group_id);
              const subject = subjects.find((su: any) => su.id === s.subject_id);
              return (
                <tr key={s.id} className={`border-t ${s.status === 'cancelled' ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2">{s.date}</td>
                  <td className="px-3 py-2">{s.start_time}–{s.end_time}</td>
                  <td className="px-3 py-2">{group?.name}</td>
                  <td className="px-3 py-2">{subject?.name}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-1 rounded ${s.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {s.status === 'cancelled' ? 'Отменено' : 'Запланировано'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {s.status === 'cancelled' ? (
                      <button onClick={() => handleRestore(s.id)} className="text-xs text-green-600 hover:underline">Восстановить</button>
                    ) : (
                      <button onClick={() => handleCancel(s.id)} className="text-xs text-red-600 hover:underline">Отменить</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== ATTENDANCE =====
function AttendanceTab({ refresh, userId }: { refresh: () => void; userId: string }) {
  const students = getAll<any>('students');
  const sessions = getAll<ClassSession>('class_sessions');
  const subjects = getAll<any>('subjects');
  const groups = getAll<any>('groups');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [absentMin, setAbsentMin] = useState('0');

  const handleAdd = () => {
    if (!selectedSession || !selectedStudent) return;
    const existing = getAll<Attendance>('attendances').find(
      a => a.session_id === selectedSession && a.student_id === selectedStudent
    );
    if (existing) {
      updateItem('attendances', existing.id, {
        status,
        calculated_absent_minutes: Number(absentMin),
        updated_at: new Date().toISOString(),
      });
    } else {
      createItem<Attendance>('attendances', {
        session_id: selectedSession,
        student_id: selectedStudent,
        status,
        actual_arrival: null,
        actual_departure: null,
        calculated_absent_minutes: Number(absentMin),
        comment: '',
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active_revision_id: null,
      });
    }
    refresh();
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <h3 className="font-semibold mb-3">Добавить/изменить отметку</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="border rounded px-3 py-2">
            <option value="">Выберите студента</option>
            {students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)} className="border rounded px-3 py-2">
            <option value="">Выберите занятие</option>
            {sessions.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50).map(s => {
              const subject = subjects.find((su: any) => su.id === s.subject_id);
              return <option key={s.id} value={s.id}>{s.date} {s.start_time} {subject?.name}</option>;
            })}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value as AttendanceStatus)} className="border rounded px-3 py-2">
            <option value="present">Присутствовал</option>
            <option value="late">Опоздал</option>
            <option value="left_early">Ушёл раньше</option>
            <option value="absent">Отсутствовал</option>
            <option value="excused">Уваж. причина</option>
          </select>
          <input type="number" value={absentMin} onChange={e => setAbsentMin(e.target.value)} placeholder="Пропущено мин" className="border rounded px-3 py-2" />
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Сохранить</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Студент</th>
              <th className="px-3 py-2 text-left">Занятие</th>
              <th className="px-3 py-2 text-left">Статус</th>
              <th className="px-3 py-2 text-center">Пропущено мин</th>
            </tr>
          </thead>
          <tbody>
            {getAll<Attendance>('attendances').slice(-20).reverse().map(a => {
              const student = students.find((s: any) => s.id === a.student_id);
              const session = sessions.find(s => s.id === a.session_id);
              const subject = session ? subjects.find((su: any) => su.id === session.subject_id) : null;
              return (
                <tr key={a.id} className="border-t">
                  <td className="px-3 py-2">{student?.full_name}</td>
                  <td className="px-3 py-2">{session?.date} {session?.start_time} {subject?.name}</td>
                  <td className="px-3 py-2">{a.status}</td>
                  <td className="px-3 py-2 text-center">{a.calculated_absent_minutes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== EXEMPTIONS =====
function ExemptionsTab({ refresh, userId }: { refresh: () => void; userId: string }) {
  const exemptions = getAll<Exemption>('exemptions');
  const students = getAll<any>('students');
  const subjects = getAll<any>('subjects');
  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState('credit_transfer');
  const [scope, setScope] = useState('subject');
  const [subjectId, setSubjectId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reason, setReason] = useState('');

  const handleAdd = () => {
    if (!studentId) return;
    createItem<Exemption>('exemptions', {
      student_id: studentId,
      type: type as any,
      scope: scope as any,
      subject_id: subjectId || null,
      session_id: null,
      date_from: dateFrom || null,
      date_to: dateTo || null,
      reason,
      comment: '',
      is_active: true,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setStudentId(''); setReason('');
    refresh();
  };

  const handleToggle = (id: string, active: boolean) => {
    updateItem('exemptions', id, { is_active: active, updated_at: new Date().toISOString() });
    refresh();
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <h3 className="font-semibold mb-3">Добавить перезачёт / освобождение</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={studentId} onChange={e => setStudentId(e.target.value)} className="border rounded px-3 py-2">
            <option value="">Выберите студента</option>
            {students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <select value={type} onChange={e => setType(e.target.value)} className="border rounded px-3 py-2">
            <option value="credit_transfer">Перезачёт</option>
            <option value="exemption">Освобождение</option>
            <option value="individual_plan">Индивидуальный план</option>
            <option value="other">Другое</option>
          </select>
          <select value={scope} onChange={e => setScope(e.target.value)} className="border rounded px-3 py-2">
            <option value="subject">По предмету</option>
            <option value="period">По периоду</option>
            <option value="semester">На весь семестр</option>
            <option value="session">На занятие</option>
          </select>
          {scope === 'subject' && (
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="border rounded px-3 py-2">
              <option value="">Выберите предмет</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {(scope === 'period') && (
            <>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded px-3 py-2" placeholder="С" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded px-3 py-2" placeholder="По" />
            </>
          )}
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Причина" className="border rounded px-3 py-2" />
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Добавить</button>
        </div>
      </div>

      <div className="space-y-2">
        {exemptions.map((ex: any) => {
          const student = students.find((s: any) => s.id === ex.student_id);
          const subject = ex.subject_id ? subjects.find((s: any) => s.id === ex.subject_id) : null;
          return (
            <div key={ex.id} className={`bg-white rounded-lg p-4 shadow-sm flex justify-between items-center ${!ex.is_active ? 'opacity-50' : ''}`}>
              <div>
                <p className="font-medium">{student?.full_name}</p>
                <p className="text-sm text-gray-500">
                  {ex.type === 'credit_transfer' ? 'Перезачёт' : ex.type === 'exemption' ? 'Освобождение' : ex.type} • {ex.scope}
                  {subject ? ` — ${subject.name}` : ''}
                  {ex.date_from ? ` (${ex.date_from} — ${ex.date_to})` : ''}
                </p>
                <p className="text-sm text-gray-400">{ex.reason}</p>
              </div>
              <button
                onClick={() => handleToggle(ex.id, !ex.is_active)}
                className={`px-3 py-1 rounded text-sm ${ex.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              >
                {ex.is_active ? 'Активен' : 'Неактивен'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== SETTINGS =====
function SettingsTab({ refresh }: { refresh: () => void }) {
  const settings = getSettings();
  const [s, setS] = useState({ ...settings });

  const handleSave = () => {
    updateSettings({
      ...s,
      default_limit_hours: Number(s.default_limit_hours),
      default_pair_duration_minutes: Number(s.default_pair_duration_minutes),
      rounding_step_minutes: Number(s.rounding_step_minutes),
      late_tolerance_minutes: Number(s.late_tolerance_minutes),
    });
    alert('Настройки сохранены!');
    refresh();
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm max-w-2xl">
      <h3 className="text-lg font-semibold mb-4">Настройки системы</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Лимит пропусков по умолчанию (часов)</label>
          <input type="number" value={s.default_limit_hours} onChange={e => setS({ ...s, default_limit_hours: Number(e.target.value) })} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Длительность пары по умолчанию (минут)</label>
          <input type="number" value={s.default_pair_duration_minutes} onChange={e => setS({ ...s, default_pair_duration_minutes: Number(e.target.value) })} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Режим учёта раннего ухода</label>
          <select value={s.early_exit_mode} onChange={e => setS({ ...s, early_exit_mode: e.target.value as any })} className="border rounded px-3 py-2 w-full">
            <option value="full_pair">full_pair — вся пара</option>
            <option value="exact">exact — фактическое время</option>
            <option value="rounded">rounded — с округлением</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Шаг округления (минут)</label>
          <select value={s.rounding_step_minutes} onChange={e => setS({ ...s, rounding_step_minutes: Number(e.target.value) })} className="border rounded px-3 py-2 w-full">
            <option value={0}>Без округления</option>
            <option value={5}>5 минут</option>
            <option value={10}>10 минут</option>
            <option value={15}>15 минут</option>
            <option value={30}>30 минут</option>
            <option value={60}>60 минут</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Направление округления</label>
          <select value={s.rounding_direction} onChange={e => setS({ ...s, rounding_direction: e.target.value as any })} className="border rounded px-3 py-2 w-full">
            <option value="up">Вверх</option>
            <option value="down">Вниз</option>
            <option value="nearest">До ближайшего</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Допустимое опоздание (минут)</label>
          <input type="number" value={s.late_tolerance_minutes} onChange={e => setS({ ...s, late_tolerance_minutes: Number(e.target.value) })} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Уважительная причина учитывается в лимите?</label>
          <select value={s.excused_reason_counts_to_limit ? 'true' : 'false'} onChange={e => setS({ ...s, excused_reason_counts_to_limit: e.target.value === 'true' })} className="border rounded px-3 py-2 w-full">
            <option value="false">Нет — не учитывать</option>
            <option value="true">Да — учитывать</option>
          </select>
        </div>
        <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Сохранить настройки</button>
      </div>
    </div>
  );
}

// ===== BACKUP =====
function BackupTab({ refresh }: { refresh: () => void }) {
  const handleExport = () => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (importFromJSON(result)) {
        alert('Данные успешно импортированы!');
        refresh();
      } else {
        alert('Ошибка импорта!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm max-w-lg">
      <h3 className="text-lg font-semibold mb-4">Резервное копирование</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Экспорт всех данных в JSON файл</p>
          <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            📥 Скачать резервную копию
          </button>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-2">Импорт данных из JSON файла</p>
          <input type="file" accept=".json" onChange={handleImport} className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </div>
        <div className="border-t pt-4">
          <p className="text-sm text-gray-500">
            💡 Данные хранятся в localStorage браузера. Для надёжного хранения делайте регулярные резервные копии.
            Файл бэкапа можно открыть на любом компьютере с этим приложением.
          </p>
        </div>
      </div>
    </div>
  );
}
