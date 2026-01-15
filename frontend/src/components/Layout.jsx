import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, PhoneCall } from 'lucide-react';

const Layout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <PhoneCall className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-none">AI Звонарь</h1>
              <span className="text-xs text-gray-500 font-medium">Панель метрик</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-gray-500 hover:text-red-600 transition-colors px-3 py-2 rounded-md hover:bg-gray-50"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Выйти</span>
          </button>
        </div>
      </header>
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
