import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

/**
 * AppTable Component
 * Displays all apps in a styled card grid with actions.
 * 
 * @param {Array} apps - List of app objects
 * @param {number} activeAppId - Currently active app ID from session
 * @param {function} onEdit - Callback to open edit modal with app
 * @param {function} onDelete - Callback to open delete confirm with app
 */
export function AppTable({ apps, activeAppId, onEdit, onDelete }) {
  const navigate = useNavigate();

  if (!apps.length) {
    return (
      <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center">
        <svg className="w-12 h-12 text-slate-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-slate-500 text-sm">No apps created yet. Create your first app to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {apps.map((app) => {
        const isActive = app.is_active || app.id === activeAppId;

        return (
          <div
            key={app.id}
            className={`bg-slate-900 border rounded-2xl p-5 flex flex-col space-y-4 transition-all duration-300 hover:shadow-lg ${
              isActive
                ? 'border-indigo-500/40 shadow-md shadow-indigo-500/5'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Top row: Icon + Name + Badge */}
            <div className="flex items-center space-x-3">
              {app.icon_url ? (
                <img
                  src={app.icon_url}
                  alt={app.name}
                  className="h-11 w-11 rounded-xl object-cover border border-slate-700 shrink-0"
                />
              ) : (
                <div className="h-11 w-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <span className="text-slate-500 text-sm font-bold">
                    {app.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-white font-semibold text-sm truncate">{app.name}</h4>
                <div className="mt-1">
                  <StatusBadge active={isActive} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/admin/apps/${app.id}/slides`)}
              >
                Slides
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(app)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(app)} className="!text-red-400 hover:!text-red-300 hover:!bg-red-950/30">
                Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AppTable;
