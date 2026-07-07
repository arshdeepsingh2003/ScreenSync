import React from 'react';
import StatusBadge from '../common/StatusBadge';

/**
 * AppCard Component
 * Displays a digital signage App with glassmorphic cards, nice hover animations,
 * and a status badge showing if it is active.
 * 
 * @param {Object} app - The app details.
 * @param {boolean} isActive - Whether this app is currently active.
 * @param {boolean} isActivating - Whether the activation request is in flight.
 * @param {Function} onClick - Action handler for selecting the app.
 */
export function AppCard({ app, isActive, isActivating, onClick }) {
  // Generate a distinct gradient placeholder based on the app ID/name
  const getGradientClass = (id) => {
    const gradients = [
      'from-indigo-500 to-purple-600 shadow-indigo-500/20',
      'from-emerald-400 to-teal-600 shadow-emerald-500/20',
      'from-pink-500 to-rose-600 shadow-rose-500/20',
      'from-amber-400 to-orange-500 shadow-orange-500/20',
    ];
    const index = typeof id === 'number' ? id % gradients.length : (id?.length || 0) % gradients.length;
    return gradients[index];
  };

  const fallbackGradient = getGradientClass(app.id);

  return (
    <div
      onClick={isActivating ? null : onClick}
      className={`relative overflow-hidden group rounded-2xl p-6 border transition-all duration-300 select-none ${
        isActivating
          ? 'cursor-not-allowed opacity-80'
          : 'cursor-pointer hover:-translate-y-1'
      } ${
        isActive
          ? 'bg-indigo-950/20 border-indigo-500/50 shadow-[0_0_25px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30'
          : 'bg-slate-800/30 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700/60 shadow-xl'
      }`}
    >
      {/* Decorative background glow for active card */}
      {isActive && (
        <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all duration-300" />
      )}

      <div className="flex items-start justify-between">
        {/* App Icon Container */}
        <div className="relative">
          {app.icon_url ? (
            <img
              src={app.icon_url}
              alt={`${app.name} Icon`}
              className="w-14 h-14 rounded-2xl object-cover shadow-lg border border-slate-700/50 group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // If the icon fails to load, nullify icon_url so fallback renders
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${fallbackGradient} flex items-center justify-center font-bold text-xl text-white shadow-md group-hover:scale-105 transition-transform duration-300`}
            >
              {app.name ? app.name.charAt(0).toUpperCase() : 'A'}
            </div>
          )}
        </div>

        {/* Status Badge or Loading Spinner */}
        <div>
          {isActivating ? (
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
              <svg className="animate-spin h-3.5 w-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Activating...</span>
            </div>
          ) : (
            <StatusBadge active={isActive} />
          )}
        </div>
      </div>

      {/* App Info */}
      <div className="mt-5">
        <h4 className="text-base font-bold text-white tracking-tight leading-snug group-hover:text-indigo-300 transition-colors duration-300">
          {app.name}
        </h4>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {app.description || 'No description provided. Control this screen playlist by activating it.'}
        </p>
      </div>

      {/* Hover action guide overlay */}
      {!isActive && !isActivating && (
        <div className="mt-4 flex items-center text-xs font-semibold text-indigo-400 opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 transition-all duration-300">
          <span>Click to activate</span>
          <svg className="w-3.5 h-3.5 ml-1 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default AppCard;
