import React from 'react';

/**
 * Spinner Component
 * Animated loading indicator with configurable size and color.
 */
export function Spinner({ size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-3',
  };

  return (
    <div
      className={`${sizeMap[size] || sizeMap.md} rounded-full border-slate-600 border-t-indigo-500 animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export default Spinner;
