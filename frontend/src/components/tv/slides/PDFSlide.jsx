import React from 'react';

export default function PDFSlide({ slide }) {
  let url = slide.file_url;
  if (url) {
    if (url.includes('#')) {
      url = `${url}&toolbar=0&navpanes=0`;
    } else {
      url = `${url}#toolbar=0&navpanes=0`;
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-6">
      {url ? (
        <iframe
          src={url}
          title={slide.title || 'PDF Slide'}
          className="w-full h-full border-0 rounded-lg shadow-2xl"
        />
      ) : (
        <span className="text-xl text-slate-500">PDF url missing</span>
      )}
    </div>
  );
}
