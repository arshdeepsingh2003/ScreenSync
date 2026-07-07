import React from 'react';

export default function ImageSlide({ slide }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-6">
      {slide.file_url ? (
        <img
          src={slide.file_url}
          alt={slide.title || 'Image Slide'}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
      ) : (
        <span className="text-xl text-slate-500">Image url missing</span>
      )}
    </div>
  );
}
