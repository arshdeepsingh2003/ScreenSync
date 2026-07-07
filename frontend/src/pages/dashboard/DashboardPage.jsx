import React from 'react';
import useSession from '../../hooks/useSession';
import sessionService from '../../services/sessionService';

export default function DashboardPage() {
  const {
    activeAppId,
    currentBatch,
    screens,
    slides,
    loading,
    error,
    refreshSession,
  } = useSession();

  const handleNext = async () => {
    try {
      await sessionService.next();
    } catch (err) {
      console.error('Failed to paginate next:', err);
    }
  };

  const handlePrev = async () => {
    try {
      await sessionService.previous();
    } catch (err) {
      console.error('Failed to paginate previous:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Signage Session Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Control active playlists and monitor screen synchronization.</p>
        </div>
        <button
          onClick={refreshSession}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium cursor-pointer"
        >
          Force Sync
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl">
          <h3 className="font-semibold text-lg">Failed to load session</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Control Panel */}
          <div className="md:col-span-2 space-y-6">
            {/* Live Playback Controls */}
            <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
              <h3 className="text-lg font-bold text-white mb-4">Playback Session Control</h3>
              
              <div className="grid grid-cols-3 gap-4 text-center items-center py-4 bg-slate-950/40 rounded-xl border border-slate-900 mb-6">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Active App ID</span>
                  <span className="text-2xl font-black text-indigo-400">{activeAppId || 'None'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Current Batch</span>
                  <span className="text-2xl font-black text-white">{currentBatch}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Slides</span>
                  <span className="text-2xl font-black text-emerald-400">{slides.length}</span>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handlePrev}
                  disabled={currentBatch === 0}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-white border border-slate-700/50 cursor-pointer"
                >
                  Previous Batch
                </button>
                <button
                  onClick={handleNext}
                  disabled={slides.length === 0}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-white shadow-lg shadow-indigo-500/20 cursor-pointer"
                >
                  Next Batch
                </button>
              </div>
            </div>

            {/* Slide Playlist Preview */}
            <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
              <h3 className="text-lg font-bold text-white mb-4">Playlist Slides</h3>
              {slides.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/20 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                  No slides in the active App playlist.
                </div>
              ) : (
                <div className="space-y-3">
                  {slides.map((slide, index) => {
                    const isAssigned = index >= currentBatch * (screens.length || 1) && 
                                      index < (currentBatch + 1) * (screens.length || 1);
                    return (
                      <div
                        key={slide.id}
                        className={`flex items-center justify-between p-4 rounded-xl border ${
                          isAssigned
                            ? 'bg-indigo-500/10 border-indigo-500/30'
                            : 'bg-slate-900/40 border-slate-900'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-bold text-slate-500 font-mono w-4">#{slide.display_order}</span>
                          <div>
                            <span className="text-sm font-semibold text-white block">{slide.title}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{slide.type}</span>
                          </div>
                        </div>
                        {isAssigned && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-medium">
                            On Air
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Screens / Sync sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
              <h3 className="text-lg font-bold text-white mb-4">Active Screens ({screens.filter(s => s.is_active).length})</h3>
              {screens.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No screens configured.</div>
              ) : (
                <div className="space-y-3">
                  {screens.map((screen) => (
                    <div
                      key={screen.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        screen.is_active
                          ? 'bg-slate-900/60 border-slate-800'
                          : 'bg-slate-950/20 border-slate-950 opacity-40'
                      }`}
                    >
                      <div>
                        <span className="text-sm font-semibold text-white block">{screen.screen_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">TV #{screen.screen_number}</span>
                      </div>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          screen.is_active ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-slate-600'
                        }`}
                      ></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
