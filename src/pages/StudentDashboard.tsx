import React, { useState, useMemo } from 'react';
import { User, ClassSession, Attendance, AttendanceStatus } from '../types';
import { getAll, getSettings, createItem, updateItem, getActiveSemester } from '../services/storage';
import { calculateStudentSummary, isSessionRequiredForStudent, getStudentExemptions, calculateCanSkipPairs } from '../services/attendance';
import { getUpcomingSessionsForStudent } from '../services/schedule';

interface Props {
  user: User;
  refresh: () => void;
}

export default function StudentDashboard({ user, refresh }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'history' | 'exemptions'>('overview');
  const student = getAll<any>('students').find((s: any) => s.id === user.student_id);
  const summary = useMemo(() => student ? calculateStudentSummary(student.id) : null, [student]);
  const settings = getSettings();

  if (!student || !summary) {
    return <div className="text-center py-8 text-gray-500">Студент не найден</div>;
  }

  const exemptions = getStudentExemptions(student.id);
  const upcomingSessions = getUpcomingSessionsForStudent(student.id, 10);
  const attendances = getAll<Attendance>('attendances').filter(a => a.student_id === student.id);
  const allSessions = getAll<ClassSession>('class_sessions').filter(s => s.group_id === student.group_id);

  const handleMarkAttendance = (sessionId: string, status: AttendanceStatus) => {
    const existing = attendances.find(a => a.session_id === sessionId);
    const session = allSessions.find(s => s.id === sessionId);
    if (!session) return;

    const [sh, sm] = session.start_time.split(':').map(Number);
    const [eh, em] = session.end_time.split(':').map(Number);
    const duration = (eh * 60 + em) - (sh * 60 + sm);

    let absentMinutes = 0;
    if (status === 'absent') absentMinutes = duration;
    else if (status === 'left_early') absentMinutes = Math.round(duration * 0.1); // пример: ушёл за 15 мин до конца

    if (existing) {
      updateItem('attendances', existing.id, {
        status,
        calculated_absent_minutes: absentMinutes,
        updated_at: new Date().toISOString(),
      });
    } else {
      createItem<Attendance>('attendances', {
        session_id: sessionId,
        student_id: student.id,
        status,
        actual_arrival: status === 'present' || status === 'late' ? new Date().toISOString() : null,
        actual_departure: null,
        calculated_absent_minutes: absentMinutes,
        comment: '',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active_revision_id: null,
      });
    }
    refresh();
  };

  const tabs = [
    { key: 'overview', label: '📊 Обзор' },
    { key: 'schedule', label: '📅 Расписание' },
    { key: 'history', label: '📋 История' },
    { key: 'exemptions', label: '✅ Перезачёты' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Привет, {student.full_name.split(' ')[1] || student.full_name}!</h2>
      <p className="text-gray-500 mb-4">Группа: {summary.group_name}</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Лимит часов" value={`${summary.limit_hours} ч`} color="blue" />
          <StatCard title="Пропущено" value={`${summary.used_hours} ч`} color={summary.is_over_limit ? 'red' : 'yellow'} />
          <StatCard title="Остаток" value={`${summary.remaining_hours} ч`} color="green" />
          <StatCard title="Можно пропустить пар" value={`${summary.can_skip_pairs}`} color="purple" />
          <StatCard title="Обязательных пар впереди" value={`${summary.future_required_sessions}`} color="indigo" />
          <StatCard title="Перезачтено пар" value={`${summary.exemption_count}`} color="teal" />
          <StatCard title="Использование лимита" value={`${summary.limit_usage_percent}%`} color={summary.limit_usage_percent > 80 ? 'red' : 'blue'} />
          <StatCard title="Посещено пар" value={`${summary.attended_sessions}`} color="green" />
        </div>
      )}

      {activeTab === 'overview' && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Ближайшие пары</h3>
          {upcomingSessions.length === 0 && <p className="text-gray-500">Нет предстоящих пар</p>}
          <div className="space-y-2">
            {upcomingSessions.map(session => {
              const subjects = getAll<any>('subjects');
              const teachers = getAll<any>('teachers');
              const subject = subjects.find((s: any) => s.id === session.subject_id);
              const teacher = teachers.find((t: any) => t.id === session.teacher_id);
              const isRequired = isSessionRequiredForStudent(session, student, exemptions);
              const att = attendances.find(a => a.session_id === session.id);
              const isExempted = !isRequired && session.status !== 'cancelled';

              return (
                <div key={session.id} className={`bg-white rounded-lg p-4 shadow-sm border-l-4 ${
                  session.status === 'cancelled' ? 'border-gray-300 opacity-60' :
                  isExempted ? 'border-teal-400' : 'border-blue-400'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{formatDate(session.date)} • {session.start_time}–{session.end_time}</p>
                      <p className="text-gray-600">{subject?.name} — {teacher?.full_name}</p>
                      <p className="text-sm text-gray-400">Ауд. {session.room}</p>
                    </div>
                    <div className="text-right">
                      {session.status === 'cancelled' && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Отменена</span>
                      )}
                      {isExempted && (
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded">Перезачёт</span>
                      )}
                      {isRequired && session.status !== 'cancelled' && !att && (
                        <div className="flex gap-1 flex-wrap justify-end">
                          <button onClick={() => handleMarkAttendance(session.id, 'present')}
                            className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">✓ Был</button>
                          <button onClick={() => handleMarkAttendance(session.id, 'late')}
                            className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200">Опоздал</button>
                          <button onClick={() => handleMarkAttendance(session.id, 'left_early')}
                            className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200">Ушёл рано</button>
                          <button onClick={() => handleMarkAttendance(session.id, 'absent')}
                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Отсутств.</button>
                        </div>
                      )}
                      {att && (
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(att.status)}`}>
                          {getStatusText(att.status)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule */}
      {activeTab === 'schedule' && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Все пары семестра</h3>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow-sm text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Дата</th>
                  <th className="px-3 py-2 text-left">Время</th>
                  <th className="px-3 py-2 text-left">Предмет</th>
                  <th className="px-3 py-2 text-left">Преподаватель</th>
                  <th className="px-3 py-2 text-left">Статус</th>
                </tr>
              </thead>
              <tbody>
                {allSessions
                  .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
                  .slice(0, 50)
                  .map(session => {
                    const subject = getAll<any>('subjects').find((s: any) => s.id === session.subject_id);
                    const teacher = getAll<any>('teachers').find((t: any) => t.id === session.teacher_id);
                    const isReq = isSessionRequiredForStudent(session, student, exemptions);
                    return (
                      <tr key={session.id} className="border-t">
                        <td className="px-3 py-2">{formatDate(session.date)}</td>
                        <td className="px-3 py-2">{session.start_time}–{session.end_time}</td>
                        <td className="px-3 py-2">{subject?.name}</td>
                        <td className="px-3 py-2">{teacher?.full_name}</td>
                        <td className="px-3 py-2">
                          {session.status === 'cancelled' ? <span className="text-gray-400">Отменена</span> :
                           !isReq ? <span className="text-teal-600">Перезачёт</span> :
                           <span className="text-blue-600">Обязательная</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div>
          <h3 className="text-lg font-semibold mb-3">История отметок</h3>
          {attendances.length === 0 && <p className="text-gray-500">Нет отметок</p>}
          <div className="space-y-2">
            {attendances.map(att => {
              const session = allSessions.find(s => s.id === att.session_id);
              const subject = session ? getAll<any>('subjects').find((s: any) => s.id === session.subject_id) : null;
              return (
                <div key={att.id} className="bg-white rounded-lg p-3 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-medium">{subject?.name} — {session ? formatDate(session.date) : ''}</p>
                    <p className="text-sm text-gray-500">{session?.start_time}–{session?.end_time}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(att.status)}`}>
                    {getStatusText(att.status)} ({att.calculated_absent_minutes} мин)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exemptions */}
      {activeTab === 'exemptions' && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Мои перезачёты и освобождения</h3>
          {exemptions.length === 0 && <p className="text-gray-500">Нет активных перезачётов</p>}
          <div className="space-y-2">
            {exemptions.map(ex => {
              const subject = ex.subject_id ? getAll<any>('subjects').find((s: any) => s.id === ex.subject_id) : null;
              return (
                <div key={ex.id} className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-teal-400">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{getExemptionTypeText(ex.type)}</p>
                      <p className="text-sm text-gray-600">
                        {ex.scope === 'subject' && subject ? `Предмет: ${subject.name}` :
                         ex.scope === 'period' ? `Период: ${ex.date_from} — ${ex.date_to}` :
                         ex.scope === 'semester' ? 'Весь семестр' : 'Конкретное занятие'}
                      </p>
                      <p className="text-sm text-gray-500">{ex.reason}</p>
                    </div>
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded h-fit">Активен</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
  };
  return (
    <div className={`rounded-lg p-4 border ${colors[color] || colors.blue}`}>
      <p className="text-sm opacity-75">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function formatDate(date: string): string {
  const d = new Date(date);
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

function getStatusColor(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    present: 'bg-green-100 text-green-700',
    late: 'bg-yellow-100 text-yellow-700',
    left_early: 'bg-orange-100 text-orange-700',
    absent: 'bg-red-100 text-red-700',
    excused: 'bg-blue-100 text-blue-700',
    exemption: 'bg-teal-100 text-teal-700',
  };
  return map[status];
}

function getStatusText(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    present: 'Присутствовал',
    late: 'Опоздал',
    left_early: 'Ушёл раньше',
    absent: 'Отсутствовал',
    excused: 'Уваж. причина',
    exemption: 'Перезачёт',
  };
  return map[status];
}

function getExemptionTypeText(type: string): string {
  const map: Record<string, string> = {
    exemption: 'Освобождение',
    credit_transfer: 'Перезачёт',
    individual_plan: 'Индивидуальный план',
    other: 'Другое',
  };
  return map[type] || type;
}
