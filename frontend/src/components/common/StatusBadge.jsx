import React from 'react';

/**
 * StatusBadge Component
 * Displays a clean, styled status badge with a pulsing visual indicator dot.
 * 
 * @param {boolean} active - Whether the status is active.
 * @param {string} className - Optional override classes.
 */
export function StatusBadge({ active, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all duration-300 ${
        active
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.05)]'
          : 'bg-slate-800/60 text-slate-400 border-slate-700/50'
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          active
            ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]'
            : 'bg-slate-500'
        }`}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export default StatusBadge;
