import React from 'react';

export default function DefaultScreen({ settings }) {
  // If no settings provided, render a beautiful branded default screen
  if (!settings) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white p-12 text-center">
        <div className="h-20 w-20 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-4xl shadow-2xl shadow-indigo-500/30 animate-pulse mb-6">
          SS
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-4">
          ScreenSync
        </h1>
        <p className="text-xl text-slate-400 max-w-lg">
          Welcome to the Digital Signage Network. No app is currently scheduled for broadcast.
        </p>
      </div>
    );
  }

  const { default_screen_type, default_screen_url, default_screen_text } = settings;

  switch (default_screen_type) {
    case 'image':
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-950">
          {default_screen_url ? (
            <img
              src={default_screen_url}
              alt="Default Screen"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-xl text-slate-500">Default image missing</div>
          )}
        </div>
      );

    case 'video':
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-950">
          {default_screen_url ? (
            <video
              src={default_screen_url}
              className="max-w-full max-h-full object-contain"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <div className="text-xl text-slate-500">Default video missing</div>
          )}
        </div>
      );

    case 'html':
      return (
        <div className="w-full h-full bg-slate-950">
          {default_screen_url ? (
            <iframe
              src={default_screen_url}
              title="Default Screen HTML"
              className="w-full h-full border-0"
            />
          ) : default_screen_text ? (
            <div
              className="w-full h-full p-8 overflow-auto"
              dangerouslySetInnerHTML={{ __html: default_screen_text }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xl text-slate-500">Default HTML content missing</span>
            </div>
          )}
        </div>
      );

    case 'text':
    default:
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-12 text-center">
          <p className="text-3xl sm:text-5xl font-semibold max-w-4xl leading-relaxed whitespace-pre-wrap">
            {default_screen_text || 'No Content Scheduled'}
          </p>
        </div>
      );
  }
}
