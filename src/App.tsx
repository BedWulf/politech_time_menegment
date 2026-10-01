import React, { useState, useEffect, useCallback } from 'react';
import { User, Role } from './types';
import { getDB, findUser, resetDB, getSettings } from './services/storage';
import { seedTestData } from './data/seed';
import LoginPage from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import MonitorDashboard from './pages/MonitorDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    // Check if DB is empty and seed
    const db = getDB();
    if (db.users.length === 0 && db.students.length === 0) {
      seedTestData();
    }
    // Check for saved session
    const saved = localStorage.getItem('current_user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('current_user');
  };

  const handleReset = () => {
    if (confirm('Вы уверены? Все данные будут удалены и загружены тестовые данные.')) {
      resetDB();
      seedTestData();
      handleLogout();
      refresh();
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} onReset={handleReset} />;
  }

  const role = currentUser.role;

  return (
    <div className="min-h-screen bg-gray-50" key={refreshKey}>
      <nav className="bg-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">📚 Учёт посещаемости</span>
            <span className="text-sm bg-blue-600 px-2 py-1 rounded">
              {role === 'admin' ? 'Администратор' : role === 'monitor' ? 'Староста' : 'Студент'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">{currentUser.username}</span>
            <button
              onClick={handleLogout}
              className="bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded text-sm"
            >
              Выйти
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {role === 'student' && <StudentDashboard user={currentUser} refresh={refresh} />}
        {role === 'monitor' && <MonitorDashboard user={currentUser} refresh={refresh} />}
        {role === 'admin' && <AdminDashboard user={currentUser} refresh={refresh} />}
      </main>
    </div>
  );
}
