import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

export default function TVLayout() {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleContainerClick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
      });
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className="w-screen h-screen bg-black text-white overflow-hidden select-none cursor-none relative"
    >
      <Outlet />

      {/* Floating Kiosk Fullscreen Overlay/Prompt */}
      {!isFullscreen && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-indigo-500/40 text-slate-200 text-sm px-5 py-2.5 rounded-full shadow-2xl flex items-center space-x-3 animate-bounce cursor-pointer z-50 transition-all hover:bg-slate-800 hover:border-indigo-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="font-sans font-medium tracking-wide">Click anywhere to enter fullscreen kiosk mode</span>
        </div>
      )}
    </div>
  );
}

