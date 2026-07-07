import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import FileUploader from './FileUploader';

/**
 * AppForm Component
 * Form for creating or editing an App. Rendered inside a Modal.
 * 
 * @param {object} app - Existing app data for edit mode (null for create)
 * @param {function} onSubmit - Callback with form data { name, icon_url }
 * @param {boolean} loading - Whether the form is submitting
 */
export function AppForm({ app = null, onSubmit, loading = false }) {
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');

  const isEdit = !!app;

  useEffect(() => {
    if (app) {
      setName(app.name || '');
      setIconUrl(app.icon_url || '');
    } else {
      setName('');
      setIconUrl('');
    }
  }, [app]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name: name.trim(), icon_url: iconUrl || null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* App Name */}
      <div>
        <label htmlFor="app-name" className="block text-sm font-medium text-slate-300 mb-1.5">
          App Name
        </label>
        <input
          id="app-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Marketing, Training, WebPT"
          className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-600 outline-none transition-all"
        />
      </div>

      {/* App Icon */}
      <FileUploader
        bucket="app-icons"
        onUpload={(url) => setIconUrl(url)}
        accept="image/*"
        currentUrl={iconUrl}
        label="App Icon"
      />

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary" size="md" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create App'}
        </Button>
      </div>
    </form>
  );
}

export default AppForm;
