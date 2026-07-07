import React from 'react';

/**
 * PlaybackControls Component
 * Provides clean controls for advancing and reversing through content batches,
 * displaying current status, progress indicators, and handling loading states.
 * 
 * @param {Object|null} activeApp - The active App details.
 * @param {number} currentBatch - The current batch index (0-based).
 * @param {number} totalSlides - The total number of slides in the active app.
 * @param {number} activeScreensCount - The count of active screens.
 * @param {boolean} isPaginating - State of Next/Prev API requests.
 * @param {Function} onNext - Trigger next batch action.
 * @param {Function} onPrev - Trigger previous batch action.
 */
export function PlaybackControls({
  activeApp,
  currentBatch,
  totalSlides,
  activeScreensCount,
  isPaginating,
  onNext,
  onPrev,
}) {
  const totalBatches = activeScreensCount > 0 ? Math.ceil(totalSlides / activeScreensCount) : 0;
  
  const hasNoSlides = totalSlides === 0;
  const isFirstBatch = currentBatch === 0;
  const isLastBatch = totalBatches === 0 || currentBatch >= totalBatches - 1;

  // Progress percentage
  const progressPercent = totalBatches > 0 ? ((currentBatch + 1) / totalBatches) * 100 : 0;

  return (
    <div className="bg-slate-800/30 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
      {/* Subtle border glow */}
      {activeApp && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-60" />
      )}

      <h3 className="text-lg font-bold text-white mb-4">Playback Session Control</h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 text-center items-center py-4 px-2 bg-slate-950/40 rounded-xl border border-slate-900 mb-6">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Playlist App</span>
          <span className="text-sm font-bold text-indigo-400 mt-1 block truncate max-w-full px-1">
            {activeApp ? activeApp.name : 'None Active'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Current Batch</span>
          <span className="text-xl font-extrabold text-white mt-1 block">
            {totalBatches > 0 ? `${currentBatch + 1} / ${totalBatches}` : '—'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Slides</span>
          <span className="text-xl font-extrabold text-emerald-400 mt-1 block">
            {totalSlides}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {activeApp && totalBatches > 0 && (
        <div className="mb-6 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>Playback Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(99,102,241,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Paging Buttons */}
      <div className="flex space-x-4">
        {/* Previous Button */}
        <button
          onClick={onPrev}
          disabled={isFirstBatch || isPaginating}
          className="flex-1 py-3 px-4 rounded-xl font-semibold border transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed bg-slate-800/80 hover:bg-slate-700/80 text-white border-slate-700/50"
        >
          {isPaginating ? (
            <svg className="animate-spin h-4 w-4 text-slate-300" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous Batch</span>
            </>
          )}
        </button>

        {/* Next Button */}
        <button
          onClick={onNext}
          disabled={isLastBatch || hasNoSlides || isPaginating}
          className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-550/20"
        >
          {isPaginating ? (
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <>
              <span>Next Batch</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default PlaybackControls;
