import React from 'react';
import Button from '../common/Button';

/**
 * ScreenTable Component
 * Table listing all screens with inline active toggle and actions.
 * 
 * @param {Array} screens - List of screen objects
 * @param {function} onToggleActive - Callback to toggle a screen's active state
 * @param {function} onEdit - Callback to open edit modal
 * @param {function} onDelete - Callback to open delete confirm
 */
export function ScreenTable({ screens, onToggleActive, onEdit, onDelete }) {
  if (!screens.length) {
    return (
      <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center">
        <svg className="w-12 h-12 text-slate-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-slate-500 text-sm">No screens registered. Add your first TV screen.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              #
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Screen Name
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              TV URL
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {screens.map((screen) => (
            <tr key={screen.id} className="hover:bg-slate-800/30 transition-colors">
              {/* Number */}
              <td className="px-6 py-4">
                <span className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-indigo-400">
                  {screen.screen_number}
                </span>
              </td>

              {/* Name */}
              <td className="px-6 py-4">
                <span className="text-sm font-medium text-white">{screen.screen_name}</span>
              </td>

              {/* Active Toggle */}
              <td className="px-6 py-4">
                <button
                  onClick={() => onToggleActive(screen)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    screen.is_active ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                  title={screen.is_active ? 'Click to deactivate' : 'Click to activate'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      screen.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </td>

              {/* TV URL */}
              <td className="px-6 py-4">
                <code className="text-xs text-slate-500 bg-slate-800/60 px-2 py-1 rounded-lg">
                  /tv/{screen.screen_number}
                </code>
              </td>

              {/* Actions */}
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(screen)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(screen)}
                    className="!text-red-400 hover:!text-red-300 hover:!bg-red-950/30"
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ScreenTable;
