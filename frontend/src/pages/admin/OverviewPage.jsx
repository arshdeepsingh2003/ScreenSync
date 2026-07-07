import React from 'react';
import { Link } from 'react-router-dom';
import useSession from '../../hooks/useSession';
import useApps from '../../hooks/useApps';

export default function OverviewPage() {
  const { screens, activeAppId } = useSession();
  const { apps, loading: appsLoading } = useApps();

  const activeApp = apps.find((a) => a.id === activeAppId);
  const activeAppName = activeApp ? activeApp.name : 'None';

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h3 className="text-2xl font-bold text-white">System Overview</h3>
        <p className="text-slate-400 text-sm mt-1">CMS Control Hub for ScreenSync signage network.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Apps Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between h-48">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Apps Management</span>
            <h4 className="text-3xl font-extrabold text-white mt-2">
              Active: {appsLoading ? 'Loading...' : activeAppName}
            </h4>
            <p className="text-slate-500 text-xs mt-1">Configure slideshows and playlists.</p>
          </div>
          <Link
            to="/admin/apps"
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center space-x-1"
          >
            <span>Manage Apps &rarr;</span>
          </Link>
        </div>

        {/* Screens Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between h-48">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Screens Management</span>
            <h4 className="text-3xl font-extrabold text-white mt-2">{screens.length} Screens</h4>
            <p className="text-slate-500 text-xs mt-1">Configure active TV displays.</p>
          </div>
          <Link
            to="/admin/screens"
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center space-x-1"
          >
            <span>Manage Screens &rarr;</span>
          </Link>
        </div>

        {/* Settings Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between h-48">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Global Settings</span>
            <h4 className="text-3xl font-extrabold text-white mt-2">Configuration</h4>
            <p className="text-slate-500 text-xs mt-1">Configure Default Screen fallbacks.</p>
          </div>
          <Link
            to="/admin/settings"
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center space-x-1"
          >
            <span>Manage Settings &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
