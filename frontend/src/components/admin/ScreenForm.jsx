import React, { useState, useEffect } from 'react';
import Button from '../common/Button';

/**
 * ScreenForm Component
 * Form for creating/editing a screen.
 * 
 * @param {object} screen - Existing screen for edit mode (null for create)
 * @param {function} onSubmit - Callback with form data
 * @param {boolean} loading - Whether the form is submitting
 */
export function ScreenForm({ screen = null, onSubmit, loading = false }) {
  const [screenNumber, setScreenNumber] = useState('');
  const [screenName, setScreenName] = useState('');
  const [isActive, setIsActive] = useState(true);

  const isEdit = !!screen;

  useEffect(() => {
    if (screen) {
      setScreenNumber(String(screen.screen_number || ''));
      setScreenName(screen.screen_name || '');
      setIsActive(screen.is_active !== false);
    } else {
      setScreenNumber('');
      setScreenName('');
      setIsActive(true);
    }
  }, [screen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      screen_number: parseInt(screenNumber, 10),
      screen_name: screenName.trim(),
      is_active: isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Screen Number */}
      <div>
        <label htmlFor="screen-number" className="block text-sm font-medium text-slate-300 mb-1.5">
          Screen Number
        </label>
        <input
          id="screen-number"
          type="number"
          min="1"
          value={screenNumber}
          onChange={(e) => setScreenNumber(e.target.value)}
          required
          placeholder="e.g. 1, 2, 3"
          className="w-32 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-600 outline-none transition-all"
        />
      </div>

      {/* Screen Name */}
      <div>
        <label htmlFor="screen-name" className="block text-sm font-medium text-slate-300 mb-1.5">
          Screen Name
        </label>
        <input
          id="screen-name"
          type="text"
          value={screenName}
          onChange={(e) => setScreenName(e.target.value)}
          required
          placeholder="e.g. Lobby, Break Room, Reception"
          className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-600 outline-none transition-all"
        />
      </div>

      {/* Active Toggle */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
            isActive ? 'bg-indigo-600' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-slate-300">
          {isActive ? 'Active — this screen will receive slides' : 'Inactive — excluded from distribution'}
        </span>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <Button type="submit" variant="primary" size="md" loading={loading}>
          {isEdit ? 'Save Changes' : 'Add Screen'}
        </Button>
      </div>
    </form>
  );
}

export default ScreenForm;
