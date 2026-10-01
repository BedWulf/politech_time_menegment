import React, { useState } from 'react';
import { User } from '../types';
import { findUser, getAll } from '../services/storage';

interface Props {
  onLogin: (user: User) => void;
  onReset: () => void;
}

export default function LoginPage({ onLogin, onReset }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = findUser(username, password);
    if (user) {
      onLogin(user);
    } else {
      setError('Неверный логин или пароль');
    }
  };

  const users = getAll<User>('users');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">📚 Учёт посещаемости</h1>
        <p className="text-center text-gray-500 mb-6">Система учёта пропусков студентов</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Введите логин"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Введите пароль"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            Войти
          </button>
        </form>

        <div className="mt-6 border-t pt-4">
          <p className="text-sm text-gray-500 mb-2">Тестовые аккаунты:</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p><span className="font-medium">Админ:</span> admin / admin</p>
            <p><span className="font-medium">Староста:</span> starosta / starosta</p>
            <p><span className="font-medium">Студент:</span> ivanov / ivanov</p>
            <p><span className="font-medium">Студент:</span> petrov / petrov</p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="mt-4 w-full text-sm text-red-500 hover:text-red-700"
        >
          🔄 Сбросить все данные и загрузить тестовые
        </button>
      </div>
    </div>
  );
}
