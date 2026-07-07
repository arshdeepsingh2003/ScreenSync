import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import FileUploader from './FileUploader';

const CONTENT_TYPES = [
  { value: 'image', label: 'Image', icon: '🖼️' },
  { value: 'video', label: 'Video', icon: '🎬' },
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'html', label: 'HTML', icon: '🌐' },
];

/**
 * SlideForm Component
 * Type-aware form for creating/editing a slide.
 * Fields adapt based on selected content type.
 * 
 * @param {object} slide - Existing slide for edit mode (null for create)
 * @param {function} onSubmit - Callback with form data
 * @param {boolean} loading - Whether the form is submitting
 */
export function SlideForm({ slide = null, onSubmit, loading = false }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('image');
  const [fileUrl, setFileUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [duration, setDuration] = useState('');

  const isEdit = !!slide;

  useEffect(() => {
    if (slide) {
      setTitle(slide.title || '');
      setType(slide.type || 'image');
      setFileUrl(slide.file_url || '');
      setTextContent(slide.text_content || '');
      setDuration(slide.duration != null ? String(slide.duration) : '');
    } else {
      setTitle('');
      setType('image');
      setFileUrl('');
      setTextContent('');
      setDuration('');
    }
  }, [slide]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      title: title.trim(),
      type,
      file_url: ['image', 'video', 'pdf'].includes(type) ? fileUrl || null : null,
      text_content: ['text', 'html'].includes(type) ? textContent : null,
      duration: duration ? parseInt(duration, 10) : null,
    };
    onSubmit(data);
  };

  const needsFileUpload = ['image', 'video', 'pdf'].includes(type);
  const needsTextarea = ['text', 'html'].includes(type);

  const acceptMap = {
    image: 'image/*',
    video: 'video/*',
    pdf: '.pdf',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label htmlFor="slide-title" className="block text-sm font-medium text-slate-300 mb-1.5">
          Slide Title
        </label>
        <input
          id="slide-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Welcome Banner, Product Demo"
          className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-600 outline-none transition-all"
        />
      </div>

      {/* Content Type */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Content Type</label>
        <div className="grid grid-cols-5 gap-2">
          {CONTENT_TYPES.map((ct) => (
            <button
              key={ct.value}
              type="button"
              onClick={() => setType(ct.value)}
              className={`flex flex-col items-center py-3 px-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                type === ct.value
                  ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <span className="text-lg mb-1">{ct.icon}</span>
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional: File Upload */}
      {needsFileUpload && (
        <FileUploader
          bucket="slide-media"
          onUpload={(url) => setFileUrl(url)}
          accept={acceptMap[type]}
          currentUrl={fileUrl}
          label={`Upload ${type.charAt(0).toUpperCase() + type.slice(1)}`}
        />
      )}

      {/* Conditional: Text/HTML Content */}
      {needsTextarea && (
        <div>
          <label htmlFor="slide-text" className="block text-sm font-medium text-slate-300 mb-1.5">
            {type === 'html' ? 'HTML Content' : 'Text Content'}
          </label>
          <textarea
            id="slide-text"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            required
            rows={type === 'html' ? 8 : 4}
            placeholder={type === 'html' ? '<h1>Hello World</h1>' : 'Enter slide text content...'}
            className={`w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-600 outline-none transition-all resize-y ${
              type === 'html' ? 'font-mono text-sm' : ''
            }`}
          />
        </div>
      )}

      {/* Duration */}
      <div>
        <label htmlFor="slide-duration" className="block text-sm font-medium text-slate-300 mb-1.5">
          Duration <span className="text-slate-500">(seconds, optional)</span>
        </label>
        <input
          id="slide-duration"
          type="number"
          min="1"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Auto"
          className="w-32 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-600 outline-none transition-all"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary" size="md" loading={loading}>
          {isEdit ? 'Save Changes' : 'Add Slide'}
        </Button>
      </div>
    </form>
  );
}

export default SlideForm;
