import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock } from 'lucide-react';

const Login = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('Login attempt with password:', password); // Debug log
    setError('');
    setIsLoading(true);

    try {
      console.log('Sending request to /api/login...');
      const response = await axios.post('/api/login', { password });
      console.log('Response received:', response.data);

      if (response.data.success) {
        console.log('Login successful, saving token and redirecting...');
        localStorage.setItem('token', response.data.token);
        navigate('/dashboard');
      } else {
        console.warn('Login failed: Success flag is false');
        setError('Неверный пароль');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response) {
        // Server responded with a status code outside 2xx
        console.error('Server error data:', err.response.data);
        if (err.response.status === 401) {
          setError('Неверный пароль');
        } else if (err.response.status === 404 || err.response.status >= 500) {
          // 404 (Server not found/Endpoint not found) or 500+ (Server error)
          // Fallback to demo mode
          console.warn(`Server responded with ${err.response.status}. Falling back to demo mode.`);
          if (password === '1234') {
            localStorage.setItem('token', 'demo-token');
            alert('Внимание: Сервер недоступен или не настроен (Vercel). Включен демонстрационный режим.');
            navigate('/dashboard');
          } else {
            setError(`Ошибка сервера: ${err.response.status}.`);
          }
        } else {
          setError(`Ошибка сервера: ${err.response.status}`);
        }
      } else if (err.request) {
        // Request was made but no response received (or backend not reachable)
        console.warn('Backend not reachable. Falling back to demo mode.');
        if (password === '1234') {
          localStorage.setItem('token', 'demo-token');
          alert('Внимание: Сервер недоступен. Включен демонстрационный режим.');
          navigate('/dashboard');
        } else {
          setError('Сервер не отвечает. Убедитесь, что backend запущен.');
        }
      } else {
        // Something happened in setting up the request
        console.error('Request setup error:', err.message);
        setError('Ошибка отправки запроса');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white p-8 rounded-lg border border-gray-100 shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Вход в систему</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Пароль
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              placeholder="Введите пароль"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-50 p-2 rounded">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
