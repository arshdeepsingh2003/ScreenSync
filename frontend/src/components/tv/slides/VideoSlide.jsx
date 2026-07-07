import React from 'react';

export default function VideoSlide({ slide }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-6">
      {slide.file_url ? (
        <video
          src={slide.file_url}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <span className="text-xl text-slate-500">Video url missing</span>
      )}
    </div>
  );
}
