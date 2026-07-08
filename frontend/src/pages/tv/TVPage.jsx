import React from 'react';
import { useParams } from 'react-router-dom';
import useSession from '../../hooks/useSession';
import useSlideAssignment from '../../hooks/useSlideAssignment';
import DefaultScreen from '../../components/tv/DefaultScreen';
import { CONTENT_TYPE_REGISTRY } from '../../utils/contentTypeRegistry';

export default function TVPage() {
  const { screenId } = useParams();
  const { loading, error, settings, isConnected, screens } = useSession();
  const assignedSlide = useSlideAssignment(screenId);

  if (loading) {
    return (
      <div className="w-full h-full overflow-hidden flex items-center justify-center bg-black text-slate-500 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-slate-700 border-t-transparent rounded-full"></div>
          <span className="text-sm tracking-wider uppercase font-medium">Booting TV Client...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full overflow-hidden flex items-center justify-center bg-black text-red-500 font-sans p-6 text-center">
        <div>
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // 1. Resolve screen identity and validate existence
  const screenIdNum = Number(screenId);
  const currentScreen = screens?.find(
    (s) => s.id === screenIdNum || s.screen_number === screenIdNum
  );

  if (!currentScreen) {
    return (
      <div className="w-full h-full overflow-hidden flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-12 text-center font-sans">
        <div className="h-16 w-16 rounded-xl bg-red-900/30 border border-red-500/50 flex items-center justify-center font-bold text-2xl text-red-500 shadow-2xl mb-6 animate-pulse">
          ⚠️
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-red-500 mb-4">
          Screen Not Registered
        </h1>
        <p className="text-lg text-slate-400 max-w-lg mb-6 leading-relaxed">
          Screen with ID or number <span className="font-semibold text-slate-200">"{screenId}"</span> is not registered in the ScreenSync system.
        </p>
        <span className="text-xs uppercase tracking-widest text-slate-600 font-extrabold bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
          Action Required: Register this screen in the Admin Panel
        </span>
      </div>
    );
  }

  // 2. Validate screen active status
  if (!currentScreen.is_active) {
    return (
      <div className="w-full h-full overflow-hidden flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-12 text-center font-sans">
        <div className="h-16 w-16 rounded-xl bg-amber-900/30 border border-amber-500/50 flex items-center justify-center font-bold text-2xl text-amber-500 shadow-2xl mb-6">
          🔒
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-amber-500 mb-4">
          Screen Inactive
        </h1>
        <p className="text-lg text-slate-400 max-w-lg mb-6 leading-relaxed">
          Screen <span className="font-semibold text-slate-200">"{currentScreen.screen_name}"</span> (No. {currentScreen.screen_number}) is currently set to inactive.
        </p>
        <span className="text-xs uppercase tracking-widest text-slate-600 font-extrabold bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
          Action Required: Activate this screen in the Admin Panel to resume broadcast
        </span>
      </div>
    );
  }

  // Determine slide renderer component
  let slideView = null;
  if (assignedSlide) {
    const Renderer = CONTENT_TYPE_REGISTRY[assignedSlide.type];
    if (Renderer) {
      slideView = <Renderer key={assignedSlide.id} slide={assignedSlide} />;
    }
  }

  // Fallback to default screen if no assignment or renderer
  if (!slideView) {
    slideView = <DefaultScreen settings={settings} />;
  }

  return (
    <div className="w-full h-full relative bg-black overflow-hidden">
      {/* Slide Content Viewport */}
      {slideView}

      {/* Unobtrusive connection drop warning (top right corner) */}
      {!isConnected && (
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-red-600/90 text-white text-xs font-bold font-sans flex items-center space-x-2 animate-pulse shadow-lg z-50">
          <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
          <span>Reconnecting...</span>
        </div>
      )}
    </div>
  );
}

