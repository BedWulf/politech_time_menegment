import React, { useState, useEffect, useCallback } from 'react';
import { User } from './types';
import { getDB, findUser, resetDB } from './services/storage';
import { seedTestData } from './data/seed';
import { ToastProvider } from './components/Toast';
import LoginPage from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import MonitorDashboard from './pages/MonitorDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const db = getDB();
    if (db.users.length === 0 && db.students.length === 0) {
      seedTestData();
    }
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

  return (
    <ToastProvider>
      {!currentUser ? (
        <LoginPage onLogin={handleLogin} onReset={handleReset} />
      ) : (
        <div className="min-h-screen bg-gray-50" key={refreshKey}>
          <nav className="bg-blue-700 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold">📚 Учёт посещаемости</span>
                <span className="text-sm bg-blue-600 px-2 py-1 rounded">
                  {currentUser.role === 'admin' ? 'Администратор' : currentUser.role === 'monitor' ? 'Староста' : 'Студент'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm hidden sm:inline">{currentUser.username}</span>
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
            {currentUser.role === 'student' && <StudentDashboard user={currentUser} refresh={refresh} />}
            {currentUser.role === 'monitor' && <MonitorDashboard user={currentUser} refresh={refresh} />}
            {currentUser.role === 'admin' && <AdminDashboard user={currentUser} refresh={refresh} />}
          </main>
        </div>
      )}
    </ToastProvider>
  );
}
