import React, { useState, useMemo } from 'react';
import { User, Settings, Attendance, AttendanceStatus, ClassSession, Exemption } from '../types';
import { getAll, createItem, updateItem, deleteItem, getSettings, updateSettings, exportToJSON, importFromJSON, downloadCSV, parseCSV, getStudentsByGroup, addAuditLog, getAuditLog } from '../services/storage';
import { calculateStudentSummary, isSessionRequiredForStudent, getStudentExemptions } from '../services/attendance';
import { generateSessionsFromTemplates } from '../services/schedule';
import { useToast } from '../components/Toast';

interface Props {
  user: User;
  refresh: () => void;
}

type Tab = 'overview' | 'semesters' | 'groups' | 'students' | 'subjects' | 'teachers' | 'templates' | 'sessions' | 'attendance' | 'exemptions' | 'reports' | 'settings' | 'audit' | 'import' | 'backup';

export default function AdminDashboard({ user, refresh }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const toast = useToast();

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
    { key: 'reports', label: '📈 Отчёты' },
    { key: 'settings', label: '⚙️ Настройки' },
    { key: 'audit', label: '📝 Журнал' },
    { key: 'import', label: '📥 Импорт CSV' },
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
      {activeTab === 'semesters' && <SemestersTab refresh={refresh} userId={user.id} />}
      {activeTab === 'groups' && <GroupsTab refresh={refresh} userId={user.id} />}
      {activeTab === 'students' && <StudentsTab refresh={refresh} userId={user.id} />}
      {activeTab === 'subjects' && <SubjectsTab refresh={refresh} userId={user.id} />}
      {activeTab === 'teachers' && <TeachersTab refresh={refresh} userId={user.id} />}
      {activeTab === 'templates' && <TemplatesTab refresh={refresh} userId={user.id} />}
      {activeTab === 'sessions' && <SessionsTab refresh={refresh} userId={user.id} />}
      {activeTab === 'attendance' && <AttendanceTab refresh={refresh} userId={user.id} />}
      {activeTab === 'exemptions' && <ExemptionsTab refresh={refresh} userId={user.id} />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'settings' && <SettingsTab refresh={refresh} userId={user.id} />}
      {activeTab === 'audit' && <AuditTab />}
      {activeTab === 'import' && <ImportTab refresh={refresh} userId={user.id} />}
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
  const exemptions = getAll<Exemption>('exemptions').filter(e => e.is_active);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          <p className="text-sm text-gray-500">Занятий</p>
          <p className="text-2xl font-bold text-orange-700">{sessions.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-teal-400">
          <p className="text-sm text-gray-500">Активных перезачётов</p>
          <p className="text-2xl font-bold text-teal-700">{exemptions.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-red-400">
          <p className="text-sm text-gray-500">Превышен лимит</p>
          <p className="text-2xl font-bold text-red-700">
            {students.filter((s: any) => calculateStudentSummary(s.id).is_over_limit).length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-yellow-400">
          <p className="text-sm text-gray-500">Лимит &gt;80%</p>
          <p className="text-2xl font-bold text-yellow-700">
            {students.filter((s: any) => calculateStudentSummary(s.id).limit_usage_percent > 80).length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-indigo-400">
          <p className="text-sm text-gray-500">Отменённых пар</p>
          <p className="text-2xl font-bold text-indigo-700">
            {sessions.filter(s => s.status === 'cancelled').length}
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== SEMESTERS =====
function SemestersTab({ refresh, userId }: { refresh: () => void; userId: string }) {
  const semesters = getAll<any>('semesters');
  const settings = getSettings();
  const [name, setName] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const toast = useToast();

  const handleAdd = () => {
    if (!name || !dateStart || !dateEnd) { toast.showToast('Заполните все поля', 'warning'); return; }
    const s = createItem<any>('semesters', { name, date_start: dateStart, date_end: dateEnd, is_active: true, created_at: new Date().toISOString() });
    addAuditLog(userId, 'create', 'semester', s.id, '', name);
    setName(''); setDateStart(''); setDateEnd('');
    toast.showToast('Семестр добавлен', 'success');
    refresh();
  };

  const handleSetActive = (id: string) => {
    updateSettings({ default_semester_id: id });
    toast.showToast('Семестр активирован', 'success');
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить семестр?')) return;
    deleteItem('semesters', id);
    addAuditLog(userId, 'delete', 'semester', id);
    toast.showToast('Семестр удалён', 'success');
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
            <div className="flex gap-2">
              <button onClick={() => handleSetActive(s.id)} className={`px-3 py-1 rounded text-sm ${s.id === settings.default_semester_id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                {s.id === settings.default_semester_id ? '✓ Активный' : 'Активировать'}
              </button>
              <button onClick={() => handleDelete(s.id)} className="px-3 py-1 rounded text-sm bg-red-100 text-red-700 hover:bg-red-200">Удалить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== GROUPS =====
function GroupsTab({ refresh, userId }: { refresh: () => void; userId: string }) {
  const groups = getAll<any>('groups');
  const [name, setName] = useState('');
  const toast = useToast();

  const handleAdd = () => {
    if (!name) { toast.showToast('Введите название', 'warning'); return; }
    const g = createItem<any>('groups', { name, created_at: new Date().toISOString() });
    addAuditLog(userId, 'create', 'group', g.id, '', name);
    setName('');
    toast.showToast('Группа добавлена', 'success');
    refresh();
  };

  const handleDelete = (id: string) => {
    const students = getStudentsByGroup(id);
    if (students.length > 0) { toast.showToast('Нельзя удалить: в группе есть студенты', 'error'); return; }
    if (!confirm('Удалить группу?')) return;
    deleteItem('groups', id);
    addAuditLog(userId, 'delete', 'group', id);
    toast.showToast('Группа удалена', 'success');
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
              <div>
                <span className="font-medium">{g.name}</span>
                <span className="text-sm text-gray-500 ml-2">({count} студентов)</span>
              </div>
              <button onClick={() => handleDelete(g.id)} className="px-3 py-1 rounded text-sm bg-red-100 text-red-700 hover:bg-red-200">Удалить</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== STUDENTS =====
function StudentsTab({ refresh, userId }: { refresh: () => void; userId: string }) {
  const students = getAll<any>('students');
  const groups = getAll<any>('groups');
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [limit, setLimit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const toast = useToast();

  const handleAdd = () => {
    if (!name || !groupId) { toast.showToast('Заполните ФИО и группу', 'warning'); return; }
    const s = createItem<any>('students', {
      full_name: name, group_id: groupId,
      individual_limit_hours: limit ? Number(limit) : null,
      user_id: null, created_at: new Date().toISOString(),
    });
    addAuditLog(userId, 'create', 'student', s.id, '', name);
    setName(''); setLimit('');
    toast.showToast('Студент добавлен', 'success');
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить студента? Все его отметки тоже будут удалены.')) return;
    // Удаляем связанные записи
    const attendances = getAll<Attendance>('attendances').filter(a => a.student_id === id);
    attendances.forEach(a => deleteItem('attendances', a.id));
    const exemptions = getAll<Exemption>('exemptions').filter(e => e.student_id === id);
    exemptions.forEach(e => deleteItem('exemptions', e.id));
    deleteItem('students', id);
    addAuditLog(userId, 'delete', 'student', id);
    toast.showToast('Студент удалён', 'success');
    refresh();
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditName(s.full_name);
    setEditLimit(s.individual_limit_hours?.toString() || '');
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateItem('students', editingId, {
      full_name: editName,
      individual_limit_hours: editLimit ? Number(editLimit) : null,
    });
    addAuditLog(userId, 'update', 'student', editingId, '', editName);
    setEditingId(null);
    toast.showToast('Изменения сохранены', 'success');
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
          <input value={limit} onChange={e => setLimit(e.target.value)} placeholder="Лимит (часов)" type="number" className="border rounded px-3 py-2 w-36" />
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
              <th className="px-4 py-2 text-center">Действия</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s: any) => {
              const group = groups.find((g: any) => g.id === s.group_id);
              const summary = calculateStudentSummary(s.id);
              const isEditing = editingId === s.id;
              return (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input value={editName} onChange={e => setEditName(e.target.value)} className="border rounded px-2 py-1 w-full" />
                    ) : s.full_name}
                  </td>
                  <td className="px-4 py-2">{group?.name}</td>
                  <td className="px-4 py-2 text-center">
                    {isEditing ? (
                      <input value={editLimit} onChange={e => setEditLimit(e.target.value)} type="number" className="border rounded px-2 py-1 w-16" />
                    ) : `${summary.limit_hours} ч`}
                  </td>
                  <td className="px-4 py-2 text-center">{summary.used_hours} ч</td>
                  <td className="px-4 py-2 text-center font-medium">{summary.remaining_hours} ч</td>
                  <td className="px-4 py-2 text-center">
                    {isEditing ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={saveEdit} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">✓</button>
                        <button onClick={() => setEditingId(null)} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">✗</button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => startEdit(s)} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">✎</button>
                        <button onClick={() => handleDelete(s.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">✕</button>
                      </div>
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

// ===== SUBJECTS =====
function SubjectsTab({ refresh, userId }: { refresh: () => void; userId: string }) {
  const subjects = getAll<any>('subjects');
  const [name, setName] = useState('');
  const toast = useToast();

  const handleAdd = () => {
    if (!name) { toast.showToast('Введите название', 'warning'); return; }
    const s = createItem<any>('subjects', { name, created_at: new Date().toISOString() });
    addAuditLog(userId, 'create', 'subject', s.id, '', name);
    setName('');
    toast.showToast('Предмет добавлен', 'success');
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить предмет?')) return;
    deleteItem('subjects', id);
    addAuditLog(userId, 'delete', 'subject', id);
    toast.showToast('Предмет удалён', 'success');
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {subjects.map((s: any) => (
          <div key={s.id} className="bg-white rounded-lg p-3 shadow-sm flex justify-between items-center">
            <span>{s.name}</span>
            <button onClick={() => handleDelete(s.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== TEACHERS =====
function TeachersTab({ refresh, userId }: { refresh: () => void; userId: string }) {
  const teachers = getAll<any>('teachers');
  const [name, setName] = useState('');
  const toast = useToast();

  const handleAdd = () => {
    if (!name) { toast.showToast('Введите ФИО', 'warning'); return; }
    const t = createItem<any>('teachers', { full_name: name, created_at: new Date().toISOString() });
    addAuditLog(userId, 'create', 'teacher', t.id, '', name);
    setName('');
    toast.showToast('Преподаватель добавлен', 'success');
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить преподавателя?')) return;
    deleteItem('teachers', id);
    addAuditLog(userId, 'delete', 'teacher', id);
    toast.showToast('Преподаватель удалён', 'success');
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {teachers.map((t: any) => (
          <div key={t.id} className="bg-white rounded-lg p-3 shadow-sm flex justify-between items-center">
            <span>{t.full_name}</span>
            <button onClick={() => handleDelete(t.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== TEMPLATES =====
function TemplatesTab({ refresh, userId }: { refresh: () => void; userId: string }) {
  const templates = getAll<any>('schedule_templates');
  const groups = getAll<any>('groups');
  const subjects = getAll<any>('subjects');
  const teachers = getAll<any>('teachers');
  const weekdays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const toast = useToast();

  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [weekday, setWeekday] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [room, setRoom] = useState('');

  const handleAdd = () => {
    if (!groupId || !subjectId || !teacherId) { toast.showToast('Заполните обязательные поля', 'warning'); return; }
    const t = createItem<any>('schedule_templates', {
      group_id: groupId, weekday, pair_number: null,
      start_time: startTime, end_time: endTime,
      subject_id: subjectId, teacher_id: teacherId, room,
      date_from: '2025-09-01', date_to: '2025-12-31',
      is_active: true, created_at: new Date().toISOString(),
    });
    addAuditLog(userId, 'create', 'template', t.id);
    toast.showToast('Шаблон добавлен', 'success');
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить шаблон?')) return;
    deleteItem('schedule_templates', id);
    addAuditLog(userId, 'delete', 'template', id);
    toast.showToast('Шаблон удалён', 'success');
    refresh();
  };

  const handleGenerate = () => {
    const count = generateSessionsFromTemplates().length;
    addAuditLog(userId, 'generate', 'sessions', '', '', `Сгенерировано: ${count}`);
    toast.showToast(`Сгенерировано занятий: ${count}`, 'success');
    refresh();
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <h3 className="font-semibold mb-3">Добавить шаблон расписания</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={groupId} onChange={e => setGroupId(e.target.value)} className="border rounded px-3 py-2">
            <option value="">-- Группа --</option>
            {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={weekday} onChange={e => setWeekday(Number(e.target.value))} className="border rounded px-3 py-2">
            {weekdays.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="border rounded px-3 py-2" />
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="border rounded px-3 py-2" />
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="border rounded px-3 py-2">
            <option value="">-- Предмет --</option>
            {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="border rounded px-3 py-2">
            <option value="">-- Преподаватель --</option>
            {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <input value={room} onChange={e => setRoom(e.target.value)} placeholder="Аудитория" className="border rounded px-3 py-2" />
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Добавить шаблон</button>
          <button onClick={handleGenerate} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">⚡ Сгенерировать занятия на семестр</button>
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
              <th className="px-3 py-2"></th>
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
                  <td className="px-3 py-2">
                    <button onClick={() => handleDelete(t.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">✕</button>
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

// ===== SESSIONS =====
function SessionsTab({ refresh, userId }: { refresh: () => void; userId: string }) {
  const sessions = getAll<ClassSession>('class_sessions');
  const subjects = getAll<any>('subjects');
  const groups = getAll<any>('groups');
  const teachers = getAll<any>('teachers');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const toast = useToast();

  const filtered = sessions
    .filter(s => !filterGroup || s.group_id === filterGroup)
    .filter(s => !filterDate || s.date === filterDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

  const handleCancel = (id: string) => {
    updateItem('class_sessions', id, { status: 'cancelled', updated_at: new Date().toISOString() });
    addAuditLog(userId, 'cancel', 'session', id);
    toast.showToast('Занятие отменено', 'success');
    refresh();
  };

  const handleRestore = (id: string) => {
    updateItem('class_sessions', id, { status: 'planned', updated_at: new Date().toISOString() });
    addAuditLog(userId, 'restore', 'session', id);
    toast.showToast('Занятие восстановлено', 'success');
    refresh();
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4 flex gap-2 flex-wrap items-center">
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="border rounded px-3 py-2">
          <option value="">Все группы</option>
          {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="border rounded px-3 py-2" />
        <button onClick={() => { setFilterGroup(''); setFilterDate(''); }} className="text-sm text-blue-600 hover:underline">Сбросить</button>
        <span className="text-sm text-gray-500 ml-auto">Показано: {filtered.length} из {sessions.length}</span>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">Дата</th>
              <th className="px-3 py-2 text-left">Время</th>
              <th className="px-3 py-2 text-left">Группа</th>
              <th className="px-3 py-2 text-left">Предмет</th>
              <th className="px-3 py-2 text-left">Преподаватель</th>
              <th className="px-3 py-2 text-left">Статус</th>
              <th className="px-3 py-2 text-left">Действие</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map(s => {
              const group = groups.find((g: any) => g.id === s.group_id);
              const subject = subjects.find((su: any) => su.id === s.subject_id);
              const teacher = teachers.find((t: any) => t.id === s.teacher_id);
              return (
                <tr key={s.id} className={`border-t ${s.status === 'cancelled' ? 'opacity-50 line-through' : ''}`}>
                  <td className="px-3 py-2">{s.date}</td>
                  <td className="px-3 py-2">{s.start_time}–{s.end_time}</td>
                  <td className="px-3 py-2">{group?.name}</td>
                  <td className="px-3 py-2">{subject?.name}</td>
                  <td className="px-3 py-2">{teacher?.full_name}</td>
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
  const toast = useToast();

  const handleAdd = () => {
    if (!selectedSession || !selectedStudent) { toast.showToast('Выберите студента и занятие', 'warning'); return; }
    const existing = getAll<Attendance>('attendances').find(
      a => a.session_id === selectedSession && a.student_id === selectedStudent
    );
    if (existing) {
      updateItem('attendances', existing.id, {
        status, calculated_absent_minutes: Number(absentMin), updated_at: new Date().toISOString(),
      });
    } else {
      createItem<Attendance>('attendances', {
        session_id: selectedSession, student_id: selectedStudent, status,
        actual_arrival: null, actual_departure: null,
        calculated_absent_minutes: Number(absentMin), comment: '',
        created_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        active_revision_id: null,
      });
    }
    addAuditLog(userId, 'mark', 'attendance', selectedSession, '', `${selectedStudent}: ${status}`);
    toast.showToast('Отметка сохранена', 'success');
    refresh();
  };

  const attendances = getAll<Attendance>('attendances');

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <h3 className="font-semibold mb-3">Добавить/изменить отметку</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="border rounded px-3 py-2">
            <option value="">-- Студент --</option>
            {students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)} className="border rounded px-3 py-2">
            <option value="">-- Занятие --</option>
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

      <div className="bg-white rounded-lg shadow-sm overflow-hidden max-h-[50vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">Студент</th>
              <th className="px-3 py-2 text-left">Занятие</th>
              <th className="px-3 py-2 text-left">Статус</th>
              <th className="px-3 py-2 text-center">Пропущено мин</th>
            </tr>
          </thead>
          <tbody>
            {attendances.slice(-30).reverse().map(a => {
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
  const toast = useToast();

  const handleAdd = () => {
    if (!studentId) { toast.showToast('Выберите студента', 'warning'); return; }
    const ex = createItem<Exemption>('exemptions', {
      student_id: studentId, type: type as any, scope: scope as any,
      subject_id: subjectId || null, session_id: null,
      date_from: dateFrom || null, date_to: dateTo || null,
      reason, comment: '', is_active: true,
      created_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    addAuditLog(userId, 'create', 'exemption', ex.id, '', reason);
    setStudentId(''); setReason(''); setSubjectId('');
    toast.showToast('Перезачёт добавлен', 'success');
    refresh();
  };

  const handleToggle = (id: string, active: boolean) => {
    updateItem('exemptions', id, { is_active: active, updated_at: new Date().toISOString() });
    addAuditLog(userId, active ? 'activate' : 'deactivate', 'exemption', id);
    toast.showToast(active ? 'Перезачёт активирован' : 'Перезачёт деактивирован', 'success');
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить перезачёт?')) return;
    deleteItem('exemptions', id);
    addAuditLog(userId, 'delete', 'exemption', id);
    toast.showToast('Перезачёт удалён', 'success');
    refresh();
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <h3 className="font-semibold mb-3">Добавить перезачёт / освобождение</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select value={studentId} onChange={e => setStudentId(e.target.value)} className="border rounded px-3 py-2">
            <option value="">-- Студент --</option>
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
              <option value="">-- Предмет --</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {scope === 'period' && (
            <>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded px-3 py-2" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded px-3 py-2" />
            </>
          )}
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Причина" className="border rounded px-3 py-2 md:col-span-3" />
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
                  {ex.type === 'credit_transfer' ? 'Перезачёт' : ex.type === 'exemption' ? 'Освобождение' : ex.type === 'individual_plan' ? 'Инд. план' : 'Другое'} • {ex.scope}
                  {subject ? ` — ${subject.name}` : ''}
                  {ex.date_from ? ` (${ex.date_from} — ${ex.date_to})` : ''}
                </p>
                <p className="text-sm text-gray-400">{ex.reason}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleToggle(ex.id, !ex.is_active)} className={`px-3 py-1 rounded text-sm ${ex.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {ex.is_active ? 'Активен' : 'Неактивен'}
                </button>
                <button onClick={() => handleDelete(ex.id)} className="px-3 py-1 rounded text-sm bg-red-100 text-red-700 hover:bg-red-200">✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== REPORTS =====
function ReportsTab() {
  const students = getAll<any>('students');
  const groups = getAll<any>('groups');
  const sessions = getAll<ClassSession>('class_sessions');
  const subjects = getAll<any>('subjects');
  const [reportType, setReportType] = useState<'groups' | 'students' | 'subjects'>('groups');

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setReportType('groups')} className={`px-4 py-2 rounded text-sm ${reportType === 'groups' ? 'bg-blue-600 text-white' : 'bg-white'}`}>По группам</button>
        <button onClick={() => setReportType('students')} className={`px-4 py-2 rounded text-sm ${reportType === 'students' ? 'bg-blue-600 text-white' : 'bg-white'}`}>По студентам</button>
        <button onClick={() => setReportType('subjects')} className={`px-4 py-2 rounded text-sm ${reportType === 'subjects' ? 'bg-blue-600 text-white' : 'bg-white'}`}>По предметам</button>
      </div>

      {reportType === 'groups' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Группа</th>
                <th className="px-4 py-2 text-center">Студентов</th>
                <th className="px-4 py-2 text-center">Ср. пропусков</th>
                <th className="px-4 py-2 text-center">Ср. остаток</th>
                <th className="px-4 py-2 text-center">Превышен лимит</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g: any) => {
                const groupStudents = students.filter((s: any) => s.group_id === g.id);
                const summaries = groupStudents.map((s: any) => calculateStudentSummary(s.id));
                const avgUsed = summaries.length ? summaries.reduce((a, s) => a + s.used_hours, 0) / summaries.length : 0;
                const avgRemaining = summaries.length ? summaries.reduce((a, s) => a + s.remaining_hours, 0) / summaries.length : 0;
                const overLimit = summaries.filter(s => s.is_over_limit).length;
                return (
                  <tr key={g.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{g.name}</td>
                    <td className="px-4 py-2 text-center">{groupStudents.length}</td>
                    <td className="px-4 py-2 text-center">{avgUsed.toFixed(1)} ч</td>
                    <td className="px-4 py-2 text-center">{avgRemaining.toFixed(1)} ч</td>
                    <td className="px-4 py-2 text-center">
                      {overLimit > 0 ? <span className="text-red-600 font-medium">{overLimit}</span> : '0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reportType === 'students' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">Студент</th>
                <th className="px-4 py-2 text-left">Группа</th>
                <th className="px-4 py-2 text-center">Лимит</th>
                <th className="px-4 py-2 text-center">Пропущено</th>
                <th className="px-4 py-2 text-center">Остаток</th>
                <th className="px-4 py-2 text-center">Можно пропустить</th>
                <th className="px-4 py-2 text-center">Перезачтено</th>
                <th className="px-4 py-2 text-center">Использование</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s: any) => {
                const group = groups.find((g: any) => g.id === s.group_id);
                const sum = calculateStudentSummary(s.id);
                return (
                  <tr key={s.id} className={`border-t ${sum.is_over_limit ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-2">{s.full_name}</td>
                    <td className="px-4 py-2">{group?.name}</td>
                    <td className="px-4 py-2 text-center">{sum.limit_hours}</td>
                    <td className="px-4 py-2 text-center">{sum.used_hours}</td>
                    <td className="px-4 py-2 text-center font-medium">{sum.remaining_hours}</td>
                    <td className="px-4 py-2 text-center">{sum.can_skip_pairs}</td>
                    <td className="px-4 py-2 text-center">{sum.exemption_count}</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${sum.limit_usage_percent > 80 ? 'bg-red-500' : sum.limit_usage_percent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, sum.limit_usage_percent)}%` }}></div>
                        </div>
                        <span className="text-xs">{sum.limit_usage_percent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reportType === 'subjects' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Предмет</th>
                <th className="px-4 py-2 text-center">Всего пар</th>
                <th className="px-4 py-2 text-center">Отменено</th>
                <th className="px-4 py-2 text-center">Проведено</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub: any) => {
                const subSessions = sessions.filter(s => s.subject_id === sub.id);
                const cancelled = subSessions.filter(s => s.status === 'cancelled').length;
                return (
                  <tr key={sub.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{sub.name}</td>
                    <td className="px-4 py-2 text-center">{subSessions.length}</td>
                    <td className="px-4 py-2 text-center">{cancelled}</td>
                    <td className="px-4 py-2 text-center">{subSessions.length - cancelled}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===== SETTINGS =====
function SettingsTab({ refresh, userId }: { refresh: () => void; userId: string }) {
  const settings = getSettings();
  const [s, setS] = useState({ ...settings });
  const toast = useToast();

  const handleSave = () => {
    updateSettings({
      ...s,
      default_limit_hours: Number(s.default_limit_hours),
      default_pair_duration_minutes: Number(s.default_pair_duration_minutes),
      rounding_step_minutes: Number(s.rounding_step_minutes),
      late_tolerance_minutes: Number(s.late_tolerance_minutes),
    });
    addAuditLog(userId, 'update', 'settings', '', '', JSON.stringify(s));
    toast.showToast('Настройки сохранены!', 'success');
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
        <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">💾 Сохранить настройки</button>
      </div>
    </div>
  );
}

// ===== AUDIT =====
function AuditTab() {
  const logs = getAuditLog(100);
  const users = getAll<any>('users');

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Журнал изменений (последние 100)</h3>
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">Время</th>
              <th className="px-3 py-2 text-left">Пользователь</th>
              <th className="px-3 py-2 text-left">Действие</th>
              <th className="px-3 py-2 text-left">Объект</th>
              <th className="px-3 py-2 text-left">Детали</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const user = users.find((u: any) => u.id === log.user_id);
              return (
                <tr key={log.id} className="border-t">
                  <td className="px-3 py-2 text-xs text-gray-500">{new Date(log.created_at).toLocaleString('ru')}</td>
                  <td className="px-3 py-2">{user?.username || log.user_id.slice(0, 8)}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{log.action}</span>
                  </td>
                  <td className="px-3 py-2">{log.entity_type}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">{log.new_value || log.old_value || '—'}</td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">Журнал пуст</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== IMPORT CSV =====
function ImportTab({ refresh, userId }: { refresh: () => void; userId: string }) {
  const [importType, setImportType] = useState<'students' | 'groups' | 'subjects' | 'teachers' | 'templates'>('students');
  const [csvText, setCsvText] = useState('');
  const toast = useToast();
  const groups = getAll<any>('groups');
  const subjects = getAll<any>('subjects');
  const teachers = getAll<any>('teachers');

  const handleImport = () => {
    if (!csvText.trim()) { toast.showToast('Вставьте CSV данные', 'warning'); return; }
    const rows = parseCSV(csvText);
    if (rows.length === 0) { toast.showToast('Не удалось распарсить CSV', 'error'); return; }

    let count = 0;
    const weekdays: Record<string, number> = { 'пн': 0, 'mon': 0, 'вт': 1, 'tue': 1, 'ср': 2, 'wed': 2, 'чт': 3, 'thu': 3, 'пт': 4, 'fri': 4, 'сб': 5, 'sat': 5, 'вс': 6, 'sun': 6 };

    for (const row of rows) {
      try {
        if (importType === 'students') {
          const group = groups.find((g: any) => g.name === row.group);
          if (!group) continue;
          createItem('students', {
            full_name: row.full_name, group_id: group.id,
            individual_limit_hours: row.individual_limit_hours ? Number(row.individual_limit_hours) : null,
            user_id: null, created_at: new Date().toISOString(),
          });
          count++;
        } else if (importType === 'groups') {
          createItem('groups', { name: row.name, created_at: new Date().toISOString() });
          count++;
        } else if (importType === 'subjects') {
          createItem('subjects', { name: row.name, created_at: new Date().toISOString() });
          count++;
        } else if (importType === 'teachers') {
          createItem('teachers', { full_name: row.full_name, created_at: new Date().toISOString() });
          count++;
        } else if (importType === 'templates') {
          const group = groups.find((g: any) => g.name === row.group);
          const subject = subjects.find((s: any) => s.name === row.subject);
          const teacher = teachers.find((t: any) => t.full_name === row.teacher);
          if (!group || !subject || !teacher) continue;
          const wd = weekdays[row.weekday?.toLowerCase()] ?? Number(row.weekday);
          createItem('schedule_templates', {
            group_id: group.id, weekday: wd, pair_number: row.pair_number ? Number(row.pair_number) : null,
            start_time: row.start_time, end_time: row.end_time,
            subject_id: subject.id, teacher_id: teacher.id, room: row.room || '',
            date_from: row.date_from || '2025-09-01', date_to: row.date_to || '2025-12-31',
            is_active: true, created_at: new Date().toISOString(),
          });
          count++;
        }
      } catch (e) {
        console.warn('Import row error:', row, e);
      }
    }

    addAuditLog(userId, 'import', importType, '', '', `Импортировано: ${count}`);
    toast.showToast(`Импортировано записей: ${count}`, 'success');
    setCsvText('');
    refresh();
  };

  const templates: Record<string, string> = {
    students: 'group,full_name,individual_limit_hours\nИТ-201,Иванов Иван Иванович,\nИТ-201,Петров Пётр Петрович,80',
    groups: 'name\nИТ-201\nИТ-202',
    subjects: 'name\nМатематика\nФизика',
    teachers: 'full_name\nСидоров А.П.\nКозлова М.И.',
    templates: 'group,weekday,start_time,end_time,subject,teacher,room,date_from,date_to\nИТ-201,пн,09:00,10:30,Математика,Сидоров А.П.,301,2025-09-01,2025-12-31',
  };

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <h3 className="font-semibold mb-3">Импорт из CSV</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Тип данных:</label>
          <select value={importType} onChange={e => { setImportType(e.target.value as any); setCsvText(''); }} className="border rounded px-3 py-2">
            <option value="students">Студенты</option>
            <option value="groups">Группы</option>
            <option value="subjects">Предметы</option>
            <option value="teachers">Преподаватели</option>
            <option value="templates">Шаблоны расписания</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Формат CSV:</label>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">{templates[importType]}</pre>
        </div>
        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          placeholder="Вставьте CSV данные сюда..."
          className="w-full border rounded px-3 py-2 h-40 font-mono text-sm"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={handleImport} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">📥 Импортировать</button>
          <button onClick={() => setCsvText(templates[importType])} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">Заполнить пример</button>
        </div>
      </div>
    </div>
  );
}

// ===== BACKUP =====
function BackupTab({ refresh }: { refresh: () => void }) {
  const toast = useToast();

  const handleExportJSON = () => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.showToast('Резервная копия скачана', 'success');
  };

  const handleExportCSV = (collection: string, name: string) => {
    downloadCSV(collection as any, `${name}_${new Date().toISOString().split('T')[0]}.csv`);
    toast.showToast(`${name} экспортирован в CSV`, 'success');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (importFromJSON(result)) {
        toast.showToast('Данные восстановлены!', 'success');
        refresh();
      } else {
        toast.showToast('Ошибка импорта!', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">💾 Резервное копирование</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Экспорт всех данных в JSON (полная копия)</p>
            <button onClick={handleExportJSON} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">📥 Скачать полную копию (JSON)</button>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Восстановление из JSON</p>
            <input type="file" accept=".json" onChange={handleImport} className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">📊 Экспорт в CSV</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <button onClick={() => handleExportCSV('students', 'students')} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm">Студенты</button>
          <button onClick={() => handleExportCSV('groups', 'groups')} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm">Группы</button>
          <button onClick={() => handleExportCSV('subjects', 'subjects')} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm">Предметы</button>
          <button onClick={() => handleExportCSV('teachers', 'teachers')} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm">Преподаватели</button>
          <button onClick={() => handleExportCSV('class_sessions', 'sessions')} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm">Занятия</button>
          <button onClick={() => handleExportCSV('attendances', 'attendances')} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm">Посещаемость</button>
          <button onClick={() => handleExportCSV('exemptions', 'exemptions')} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm">Перезачёты</button>
          <button onClick={() => handleExportCSV('schedule_templates', 'templates')} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm">Шаблоны</button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          💡 <strong>Важно:</strong> Данные хранятся в localStorage браузера. При очистке кэша браузера данные будут потеряны.
          Делайте регулярные резервные копии. Файл бэкапа можно открыть на любом компьютере.
        </p>
      </div>
    </div>
  );
}
