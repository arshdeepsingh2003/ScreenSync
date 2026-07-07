import React from 'react';

export default function TextSlide({ slide }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-12 text-center">
      <h2 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
        {slide.title}
      </h2>
      <p className="text-2xl sm:text-4xl text-slate-300 max-w-4xl leading-relaxed whitespace-pre-wrap">
        {slide.text_content || 'No content provided'}
      </p>
    </div>
  );
}
