import React from 'react';
import { useParams } from 'react-router-dom';
import useSession from '../../hooks/useSession';
import useSlideAssignment from '../../hooks/useSlideAssignment';
import DefaultScreen from '../../components/tv/DefaultScreen';
import { CONTENT_TYPE_REGISTRY } from '../../utils/contentTypeRegistry';

export default function TVPage() {
  const { screenId } = useParams();
  const { loading, error, settings, isConnected } = useSession();
  const assignedSlide = useSlideAssignment(screenId);

  if (loading) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center bg-black text-slate-500 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-slate-700 border-t-transparent rounded-full"></div>
          <span className="text-sm tracking-wider uppercase font-medium">Booting TV Client...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center bg-black text-red-500 font-sans p-6 text-center">
        <div>
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Determine slide renderer component
  let slideView = null;
  if (assignedSlide) {
    const Renderer = CONTENT_TYPE_REGISTRY[assignedSlide.type];
    if (Renderer) {
      slideView = <Renderer slide={assignedSlide} />;
    }
  }

  // Fallback to default screen if no assignment or renderer
  if (!slideView) {
    slideView = <DefaultScreen settings={settings} />;
  }

  return (
    <div className="w-full h-full min-h-screen relative bg-black">
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
