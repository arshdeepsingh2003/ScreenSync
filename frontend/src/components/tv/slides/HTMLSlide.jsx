import React from 'react';

export default function HTMLSlide({ slide }) {
  // If slide.file_url is present, render as iframe. Otherwise, render inline HTML.
  return (
    <div className="w-full h-full bg-slate-950 text-white">
      {slide.file_url ? (
        <iframe
          src={slide.file_url}
          title={slide.title || 'HTML Slide'}
          className="w-full h-full border-0"
        />
      ) : slide.text_content ? (
        <div
          className="w-full h-full p-8 overflow-auto"
          dangerouslySetInnerHTML={{ __html: slide.text_content }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xl text-slate-500">HTML content missing</span>
        </div>
      )}
    </div>
  );
}
