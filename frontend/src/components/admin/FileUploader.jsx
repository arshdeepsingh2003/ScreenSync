import React, { useState, useRef, useCallback } from 'react';
import uploadService from '../../services/uploadService';
import Spinner from '../common/Spinner';

/**
 * FileUploader Component
 * Drag-and-drop file upload zone that uploads to Supabase Storage.
 * 
 * @param {string} bucket - Target storage bucket (app-icons, slide-media, default-screen)
 * @param {function} onUpload - Callback with the uploaded file URL
 * @param {string} accept - Accepted file types (e.g., "image/*", "video/*,.pdf")
 * @param {string} currentUrl - Currently set file URL for preview
 * @param {string} label - Upload zone label text
 */
export function FileUploader({
  bucket,
  onUpload,
  accept = 'image/*',
  currentUrl = '',
  label = 'Upload File',
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      setError('');
      setUploading(true);

      // Show local preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPreview('');
      }

      try {
        const data = await uploadService.uploadFile(file, bucket);
        setPreview(data.url);
        onUpload(data.url);
      } catch (err) {
        console.error('Upload failed:', err);
        setError(err.response?.data?.detail || 'Upload failed. Please try again.');
        setPreview(currentUrl); // Revert preview
      } finally {
        setUploading(false);
      }
    },
    [bucket, onUpload, currentUrl]
  );

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const isImage = preview && (preview.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(preview));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">{label}</label>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-indigo-500 bg-indigo-500/5'
            : 'border-slate-700 bg-slate-950/50 hover:border-slate-600 hover:bg-slate-900/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center space-y-2 py-2">
            <Spinner size="lg" />
            <span className="text-xs text-slate-400">Uploading...</span>
          </div>
        ) : isImage ? (
          <div className="flex flex-col items-center space-y-3">
            <img
              src={preview}
              alt="Preview"
              className="h-20 w-20 object-cover rounded-xl border border-slate-700"
            />
            <span className="text-xs text-slate-500">Click or drag to replace</span>
          </div>
        ) : preview ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <span className="text-xs text-slate-400 truncate max-w-full">File uploaded</span>
            <span className="text-xs text-slate-500">Click or drag to replace</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 py-2">
            <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            <span className="text-xs text-slate-400">
              Drag & drop or <span className="text-indigo-400 font-medium">browse</span>
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}

export default FileUploader;
