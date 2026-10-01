import React, { useState, useMemo } from 'react';
import { User, Attendance, AttendanceStatus, ClassSession } from '../types';
import { getAll, createItem, updateItem, getStudentsByGroup } from '../services/storage';
import { calculateStudentSummary, isSessionRequiredForStudent, getStudentExemptions } from '../services/attendance';

interface Props {
  user: User;
  refresh: () => void;
}

export default function MonitorDashboard({ user, refresh }: Props) {
  const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'report'>('students');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const groupStudents = useMemo(() => {
    if (!user.group_id) return [];
    return getStudentsByGroup(user.group_id);
  }, [user.group_id]);

  const groupSessions = useMemo(() => {
    if (!user.group_id) return [];
    return getAll<ClassSession>('class_sessions').filter(s => s.group_id === user.group_id);
  }, [user.group_id]);

  const todaySessions = useMemo(() => {
    return groupSessions.filter(s => s.date === selectedDate).sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [groupSessions, selectedDate]);

  const handleMarkStudent = (sessionId: string, studentId: string, status: AttendanceStatus) => {
    const session = groupSessions.find(s => s.id === sessionId);
    if (!session) return;

    const [sh, sm] = session.start_time.split(':').map(Number);
    const [eh, em] = session.end_time.split(':').map(Number);
    const duration = (eh * 60 + em) - (sh * 60 + sm);

    let absentMinutes = 0;
    if (status === 'absent') absentMinutes = duration;
    else if (status === 'left_early') absentMinutes = Math.round(duration * 0.1);

    const existing = getAll<Attendance>('attendances').find(
      a => a.session_id === sessionId && a.student_id === studentId
    );

    if (existing) {
      updateItem('attendances', existing.id, {
        status,
        calculated_absent_minutes: absentMinutes,
        updated_at: new Date().toISOString(),
      });
    } else {
      createItem<Attendance>('attendances', {
        session_id: sessionId,
        student_id: studentId,
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
    { key: 'students', label: '👥 Студенты группы' },
    { key: 'attendance', label: '📝 Посещаемость' },
    { key: 'report', label: '📊 Отчёт' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Панель старосты</h2>

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

      {/* Students */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Студент</th>
                <th className="px-4 py-3 text-center">Лимит</th>
                <th className="px-4 py-3 text-center">Пропущено</th>
                <th className="px-4 py-3 text-center">Остаток</th>
                <th className="px-4 py-3 text-center">Можно пропустить</th>
                <th className="px-4 py-3 text-center">Статус</th>
              </tr>
            </thead>
            <tbody>
              {groupStudents.map(student => {
                const summary = calculateStudentSummary(student.id);
                return (
                  <tr key={student.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{student.full_name}</td>
                    <td className="px-4 py-3 text-center">{summary.limit_hours} ч</td>
                    <td className="px-4 py-3 text-center">{summary.used_hours} ч</td>
                    <td className="px-4 py-3 text-center font-medium">{summary.remaining_hours} ч</td>
                    <td className="px-4 py-3 text-center">{summary.can_skip_pairs} пар</td>
                    <td className="px-4 py-3 text-center">
                      {summary.is_over_limit ? (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Превышен</span>
                      ) : summary.limit_usage_percent > 80 ? (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">Почти исчерпан</span>
                      ) : (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Норма</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Attendance */}
      {activeTab === 'attendance' && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm font-medium">Дата:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
            <span className="text-sm text-gray-500">Пар сегодня: {todaySessions.length}</span>
          </div>

          {todaySessions.length === 0 && (
            <p className="text-gray-500 bg-white rounded-lg p-4">Нет пар на выбранную дату</p>
          )}

          {todaySessions.map(session => {
            const subject = getAll<any>('subjects').find((s: any) => s.id === session.subject_id);
            const attendances = getAll<Attendance>('attendances').filter(a => a.session_id === session.id);

            return (
              <div key={session.id} className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <h4 className="font-semibold mb-3">
                  {subject?.name} • {session.start_time}–{session.end_time}
                  {session.status === 'cancelled' && <span className="ml-2 text-xs text-gray-400">(Отменена)</span>}
                </h4>
                <div className="space-y-2">
                  {groupStudents.map(student => {
                    const exemptions = getStudentExemptions(student.id);
                    const isRequired = isSessionRequiredForStudent(session, student, exemptions);
                    const att = attendances.find(a => a.student_id === student.id);

                    if (!isRequired) {
                      return (
                        <div key={student.id} className="flex items-center justify-between py-1 px-2 bg-teal-50 rounded">
                          <span className="text-sm">{student.full_name}</span>
                          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded">Перезачёт</span>
                        </div>
                      );
                    }

                    return (
                      <div key={student.id} className="flex items-center justify-between py-1 px-2">
                        <span className="text-sm">{student.full_name}</span>
                        <div className="flex gap-1">
                          {(['present', 'late', 'left_early', 'absent', 'excused'] as AttendanceStatus[]).map(status => (
                            <button
                              key={status}
                              onClick={() => handleMarkStudent(session.id, student.id, status)}
                              className={`text-xs px-2 py-1 rounded transition ${
                                att?.status === status
                                  ? getActiveBtnColor(status)
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {getShortStatusText(status)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report */}
      {activeTab === 'report' && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-semibold mb-3">Сводка по группе</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-600">Всего студентов</p>
              <p className="text-2xl font-bold text-blue-700">{groupStudents.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-green-600">Средний остаток</p>
              <p className="text-2xl font-bold text-green-700">
                {groupStudents.length > 0
                  ? (groupStudents.reduce((sum, s) => sum + calculateStudentSummary(s.id).remaining_hours, 0) / groupStudents.length).toFixed(1)
                  : 0} ч
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-sm text-red-600">Превышен лимит</p>
              <p className="text-2xl font-bold text-red-700">
                {groupStudents.filter(s => calculateStudentSummary(s.id).is_over_limit).length}
              </p>
            </div>
          </div>

          <h4 className="font-medium mb-2">У кого лимит почти исчерпан (&gt;80%):</h4>
          <ul className="list-disc list-inside text-sm text-gray-700">
            {groupStudents
              .filter(s => calculateStudentSummary(s.id).limit_usage_percent > 80)
              .map(s => {
                const sum = calculateStudentSummary(s.id);
                return <li key={s.id}>{s.full_name} — {sum.limit_usage_percent}% ({sum.remaining_hours} ч осталось)</li>;
              })}
            {groupStudents.filter(s => calculateStudentSummary(s.id).limit_usage_percent > 80).length === 0 && (
              <li className="text-gray-400">Нет студентов с критическим расходом</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function getActiveBtnColor(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    present: 'bg-green-500 text-white',
    late: 'bg-yellow-500 text-white',
    left_early: 'bg-orange-500 text-white',
    absent: 'bg-red-500 text-white',
    excused: 'bg-blue-500 text-white',
    exemption: 'bg-teal-500 text-white',
  };
  return map[status];
}

function getShortStatusText(status: AttendanceStatus): string {
  const map: Record<AttendanceStatus, string> = {
    present: '✓',
    late: '⏰',
    left_early: '🚪',
    absent: '✗',
    excused: 'Ув.',
    exemption: 'Пер.',
  };
  return map[status];
}
