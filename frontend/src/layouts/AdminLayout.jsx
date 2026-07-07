import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleGoToPublic = () => {
    logout();
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${
      isActive
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center space-x-3 px-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              SS
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block">ScreenSync</span>
              <span className="text-[10px] text-slate-500 block leading-none">CMS Admin Control</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <NavLink to="/admin" end className={linkClass}>
              <span className="text-sm">Overview</span>
            </NavLink>
            <NavLink to="/admin/apps" className={linkClass}>
              <span className="text-sm">Apps & Slides</span>
            </NavLink>
            <NavLink to="/admin/screens" className={linkClass}>
              <span className="text-sm">Screens</span>
            </NavLink>
            <NavLink to="/admin/settings" className={linkClass}>
              <span className="text-sm">Settings</span>
            </NavLink>
          </nav>
        </div>

        {/* Sidebar Footer / Logout */}
        <div className="border-t border-slate-800 pt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-red-950/40 hover:text-red-400 border border-slate-700/50 hover:border-red-900/30 text-slate-300 rounded-xl font-medium transition-all cursor-pointer"
          >
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold text-white">Admin Management</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleGoToPublic}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              <span>Public Dashboard</span>
            </button>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm text-slate-400">Authenticated Admin</span>
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-auto p-8 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
