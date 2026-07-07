import React from 'react';
import AppCard from './AppCard';

/**
 * SkeletonCard Component
 * Pulsing loading card placeholder.
 */
const SkeletonCard = () => (
  <div className="bg-slate-800/20 border border-slate-850 rounded-2xl p-6 shadow-xl animate-pulse">
    <div className="flex items-start justify-between">
      <div className="w-14 h-14 bg-slate-800 rounded-2xl" />
      <div className="w-16 h-5 bg-slate-850 rounded-full" />
    </div>
    <div className="mt-5 space-y-2">
      <div className="h-4 bg-slate-800 rounded w-2/3" />
      <div className="h-3 bg-slate-850 rounded w-full" />
      <div className="h-3 bg-slate-850 rounded w-5/6" />
    </div>
  </div>
);

/**
 * AppGrid Component
 * Displays available digital signage playlists in a responsive card grid,
 * featuring beautiful skeleton loaders and empty states.
 * 
 * @param {Array} apps - List of all apps.
 * @param {string|number|null} activeAppId - ID of currently active app.
 * @param {string|number|null} activatingAppId - ID of app currently being activated (local optimistic status).
 * @param {Function} onActivateApp - Event handler triggered when an app card is clicked.
 * @param {boolean} loading - Loading state for the apps list.
 * @param {string|null} error - Error message, if any.
 */
export function AppGrid({
  apps,
  activeAppId,
  activatingAppId,
  onActivateApp,
  loading,
  error,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
        <svg className="mx-auto h-12 w-12 text-red-400/80 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <h3 className="font-bold text-lg text-white">Failed to Load Playlists</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">{error}</p>
      </div>
    );
  }

  if (!apps || apps.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-800/10 border border-dashed border-slate-800/60 rounded-2xl">
        <svg className="mx-auto h-12 w-12 text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
        </svg>
        <h3 className="font-bold text-base text-slate-200">No Playlists Available</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
          Create some playlists in the Admin portal to distribute content to screens.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {apps.map((app) => (
        <AppCard
          key={app.id}
          app={app}
          isActive={Number(activeAppId) === Number(app.id)}
          isActivating={Number(activatingAppId) === Number(app.id)}
          onClick={() => onActivateApp(app.id)}
        />
      ))}
    </div>
  );
}

export default AppGrid;
