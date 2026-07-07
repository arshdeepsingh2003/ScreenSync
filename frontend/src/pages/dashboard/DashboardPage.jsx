import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useSession from '../../hooks/useSession';
import useApps from '../../hooks/useApps';
import appService from '../../services/appService';
import sessionService from '../../services/sessionService';
import AppGrid from '../../components/dashboard/AppGrid';
import PlaybackControls from '../../components/dashboard/PlaybackControls';

/**
 * DashboardPage Component
 * The main control panel for the digital signage system. Shows available apps,
 * session controls for batch paging, list of playlist slides indicating active
 * screens, and real-time screen statuses.
 */
export default function DashboardPage() {
  const {
    activeAppId,
    currentBatch,
    screens,
    slides,
    loading: sessionLoading,
    error: sessionError,
    refreshSession,
  } = useSession();

  const {
    apps,
    loading: appsLoading,
    error: appsError,
    refetch: refetchApps,
  } = useApps();

  const [activatingAppId, setActivatingAppId] = useState(null);
  const [isPaginating, setIsPaginating] = useState(false);
  const [activationError, setActivationError] = useState(null);

  // Derive active app details
  const activeApp = apps.find((app) => Number(app.id) === Number(activeAppId));
  
  // Sort active screens to map slide index assignments correctly
  const activeScreens = screens
    .filter((s) => s.is_active)
    .sort((a, b) => a.screen_number - b.screen_number);

  const handleActivateApp = async (appId) => {
    setActivatingAppId(appId);
    setActivationError(null);
    try {
      await appService.activateApp(appId);
      // State is optimistically highlighted via activeAppId in parent contexts,
      // and confirmed immediately by WebSocket broadcast handler.
    } catch (err) {
      console.error('Failed to activate app:', err);
      setActivationError(err.response?.data?.detail || err.message || 'Failed to activate playlist app');
    } finally {
      setActivatingAppId(null);
    }
  };

  const handleNext = async () => {
    setIsPaginating(true);
    try {
      await sessionService.next();
    } catch (err) {
      console.error('Failed to paginate next:', err);
    } finally {
      setIsPaginating(false);
    }
  };

  const handlePrev = async () => {
    setIsPaginating(true);
    try {
      await sessionService.previous();
    } catch (err) {
      console.error('Failed to paginate previous:', err);
    } finally {
      setIsPaginating(false);
    }
  };

  // Helper to map slide to its assigned screen
  const getAssignedScreenForSlide = (slideIndex) => {
    const screensCount = activeScreens.length;
    if (screensCount === 0) return null;
    
    const startIndex = currentBatch * screensCount;
    const offset = slideIndex - startIndex;
    
    if (offset >= 0 && offset < screensCount) {
      return activeScreens[offset];
    }
    return null;
  };

  // Icon mapping helper for slide types
  const getSlideIcon = (type) => {
    switch (type) {
      case 'image':
        return (
          <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 01.75 0z" />
          </svg>
        );
      case 'video':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        );
      case 'text':
        return (
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3v16.5" />
          </svg>
        );
    }
  };

  const handleGlobalSync = () => {
    refreshSession();
    refetchApps();
  };

  const isLoading = sessionLoading || appsLoading;
  const errorMsg = sessionError || appsError;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Signage Session Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Control active playlists and monitor screen synchronization.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGlobalSync}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-xl text-sm font-semibold cursor-pointer shadow-lg hover:shadow-xl"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>Sync Session</span>
          </button>
          
          <Link
            to="/admin"
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 rounded-xl text-sm font-semibold cursor-pointer shadow-lg hover:shadow-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <span>Admin Panel</span>
          </Link>
        </div>
      </div>

      {activationError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center justify-between">
          <span className="text-sm font-medium">{activationError}</span>
          <button onClick={() => setActivationError(null)} className="text-red-400 hover:text-red-300 font-bold text-lg px-2">×</button>
        </div>
      )}

      {/* Playlists App Grid Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white tracking-tight">Available Playlists</h3>
        <AppGrid
          apps={apps}
          activeAppId={activeAppId}
          activatingAppId={activatingAppId}
          onActivateApp={handleActivateApp}
          loading={appsLoading}
          error={appsError}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* Playback Controls & Playlist Previews (Left Column) */}
        <div className="lg:col-span-2 space-y-8">
          <PlaybackControls
            activeApp={activeApp}
            currentBatch={currentBatch}
            totalSlides={slides.length}
            activeScreensCount={activeScreens.length}
            isPaginating={isPaginating}
            onNext={handleNext}
            onPrev={handlePrev}
          />

          {/* Playlist Slides Preview */}
          <div className="bg-slate-800/20 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Playlist Slides</h3>
              {slides.length > 0 && (
                <span className="text-xs text-slate-400 font-medium bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                  {slides.length} items
                </span>
              )}
            </div>

            {slides.length === 0 ? (
              <div className="text-center py-16 bg-slate-950/20 border border-dashed border-slate-800/60 rounded-xl text-slate-500 text-sm">
                No active slides. Select an App playlist above to load content.
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {slides.map((slide, index) => {
                  const assignedScreen = getAssignedScreenForSlide(index);
                  const isAssigned = !!assignedScreen;

                  return (
                    <div
                      key={slide.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                        isAssigned
                          ? 'bg-indigo-500/5 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.04)]'
                          : 'bg-slate-900/30 border-slate-900 hover:border-slate-850 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        {/* Slide display order / rank badge */}
                        <span className="text-xs font-bold text-slate-500 font-mono w-6 text-right">
                          #{slide.display_order}
                        </span>
                        
                        {/* Slide Type Visual Indicator */}
                        <div className="p-2 bg-slate-950/50 border border-slate-800/60 rounded-lg flex items-center justify-center shrink-0">
                          {getSlideIcon(slide.type)}
                        </div>

                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-white block truncate">
                            {slide.title}
                          </span>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="uppercase tracking-wider font-bold text-slate-500">
                              {slide.type}
                            </span>
                            <span>•</span>
                            <span>{slide.duration || 10} seconds</span>
                          </div>
                        </div>
                      </div>

                      {isAssigned && (
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold tracking-wide uppercase border border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.1)]">
                            On Air
                          </span>
                          <span className="text-[10px] text-indigo-400 font-semibold bg-slate-950/60 px-2.5 py-0.5 rounded-full border border-slate-850">
                            TV #{assignedScreen.screen_number}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Active Screens Sidebar (Right Column) */}
        <div className="space-y-6">
          <div className="bg-slate-800/20 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4">
              Active Screens ({activeScreens.length})
            </h3>
            
            {screens.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No screens configured.
              </div>
            ) : (
              <div className="space-y-3">
                {screens.map((screen) => (
                  <div
                    key={screen.id}
                    className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                      screen.is_active
                        ? 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/60'
                        : 'bg-slate-950/20 border-slate-950 opacity-40'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-white block truncate">
                        {screen.screen_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        TV #{screen.screen_number}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 shrink-0">
                      {screen.is_active ? (
                        <>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold border border-emerald-500/15">
                            Online
                          </span>
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded font-semibold">
                            Offline
                          </span>
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
