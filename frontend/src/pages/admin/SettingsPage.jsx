import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import settingsService from '../../services/settingsService';
import appService from '../../services/appService';
import useApps from '../../hooks/useApps';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import FileUploader from '../../components/admin/FileUploader';
import DefaultScreen from '../../components/tv/DefaultScreen';

const GLOBAL_CONTENT_TYPES = [
  { value: 'text', label: 'Text Message', icon: '📝', desc: 'Display a custom text message on the screen.' },
  { value: 'image', label: 'Image', icon: '🖼️', desc: 'Display a fullscreen image from a URL or file upload.' },
  { value: 'video', label: 'Video', icon: '🎬', desc: 'Loop a background video from a URL or file upload.' },
  { value: 'html', label: 'HTML / URL', icon: '🌐', desc: 'Embed an external website iframe or render custom HTML.' },
];

const APP_CONTENT_TYPES = [
  { value: 'inherit', label: 'Inherit Global Default', icon: '🔄', desc: 'Inherit the default fallback screen configured globally.' },
  ...GLOBAL_CONTENT_TYPES
];

export default function SettingsPage() {
  const { apps, loading: appsLoading, refetch: refetchApps } = useApps();
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalSettings, setGlobalSettings] = useState(null);

  // Target selection: "global" or appId (number)
  const [target, setTarget] = useState('global');

  // Local form states
  const [type, setType] = useState('text');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');

  // Fetch global settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await settingsService.getSettings();
        setGlobalSettings(data);
        // Default target is global, so populate with global values
        setType(data.default_screen_type || 'text');
        setUrl(data.default_screen_url || '');
        setText(data.default_screen_text || '');
      } catch (err) {
        console.error('Failed to load settings:', err);
        toast.error('Failed to load settings');
      } finally {
        setLoadingSettings(false);
      }
    }
    fetchSettings();
  }, []);

  // Update form fields when target changes
  useEffect(() => {
    if (target === 'global') {
      if (globalSettings) {
        setType(globalSettings.default_screen_type || 'text');
        setUrl(globalSettings.default_screen_url || '');
        setText(globalSettings.default_screen_text || '');
      }
    } else {
      const selectedApp = apps.find(a => String(a.id) === String(target));
      if (selectedApp) {
        setType(selectedApp.default_screen_type || 'inherit');
        setUrl(selectedApp.default_screen_url || '');
        setText(selectedApp.default_screen_text || '');
      }
    }
  }, [target, globalSettings, apps]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (target === 'global') {
        const updated = await settingsService.updateSettings({
          default_screen_type: type,
          default_screen_url: url || null,
          default_screen_text: text || null,
        });
        setGlobalSettings(updated);
        toast.success('Global fallback settings saved successfully!');
      } else {
        const selectedApp = apps.find(a => String(a.id) === String(target));
        if (selectedApp) {
          const updatedType = type === 'inherit' ? null : type;
          const updatedUrl = type === 'inherit' ? null : (url || null);
          const updatedText = type === 'inherit' ? null : (text || null);
          
          await appService.updateApp(selectedApp.id, {
            name: selectedApp.name,
            icon_url: selectedApp.icon_url,
            default_screen_type: updatedType,
            default_screen_url: updatedUrl,
            default_screen_text: updatedText
          });
          
          await refetchApps();
          toast.success(`"${selectedApp.name}" default fallback saved!`);
        }
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error(err.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (target === 'global') {
      if (globalSettings) {
        setType(globalSettings.default_screen_type || 'text');
        setUrl(globalSettings.default_screen_url || '');
        setText(globalSettings.default_screen_text || '');
        toast.success('Form reset to saved global settings');
      }
    } else {
      const selectedApp = apps.find(a => String(a.id) === String(target));
      if (selectedApp) {
        setType(selectedApp.default_screen_type || 'inherit');
        setUrl(selectedApp.default_screen_url || '');
        setText(selectedApp.default_screen_text || '');
        toast.success(`Form reset to saved settings for ${selectedApp.name}`);
      }
    }
  };

  if (loadingSettings || appsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  // Compute preview settings dynamically
  let previewSettings = null;
  if (target === 'global') {
    previewSettings = {
      default_screen_type: type,
      default_screen_url: url || null,
      default_screen_text: text || null,
    };
  } else {
    if (type === 'inherit') {
      previewSettings = globalSettings;
    } else {
      previewSettings = {
        default_screen_type: type,
        default_screen_url: url || null,
        default_screen_text: text || null,
      };
    }
  }

  const activeContentTypes = target === 'global' ? GLOBAL_CONTENT_TYPES : APP_CONTENT_TYPES;

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-white">Signage Fallback Settings</h3>
        <p className="text-slate-400 text-sm mt-1">
          Configure default fallback screen type and content when screens have no active slide to broadcast.
        </p>
      </div>

      {/* Target Selector Dropdown */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <label htmlFor="settings-target" className="block text-xs uppercase tracking-widest text-slate-500 font-extrabold mb-1">
            Configure Default Fallback Target
          </label>
          <span className="text-slate-400 text-sm">
            Choose whether to customize settings globally or specify fallbacks for a project.
          </span>
        </div>
        
        <div className="w-full md:w-80">
          <select
            id="settings-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
          >
            <option value="global">🌐 Global Settings (All Screens)</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                📱 Project: {app.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Editor Form Panel */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
          <h4 className="text-base font-semibold text-white tracking-wide border-b border-slate-800/60 pb-3">
            {target === 'global' ? 'Global Fallback Configuration' : `Project Fallback: ${apps.find(a => String(a.id) === String(target))?.name}`}
          </h4>

          {/* Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-350">Default Screen Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeContentTypes.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setType(ct.value)}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    type === ct.value
                      ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 mb-1.5">
                    <span className="text-xl bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">{ct.icon}</span>
                    <span className={`font-semibold text-sm ${type === ct.value ? 'text-indigo-400' : 'text-white'}`}>
                      {ct.label}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 leading-relaxed">{ct.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Type-Specific Inputs */}
          {type !== 'inherit' ? (
            <div className="bg-slate-950/30 border border-slate-850 rounded-xl p-5 space-y-4">
              {type === 'text' && (
                <div>
                  <label htmlFor="settings-text" className="block text-sm font-medium text-slate-350 mb-1.5">
                    Default Screen Message
                  </label>
                  <textarea
                    id="settings-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. Welcome to our office! No content is currently broadcasting."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-650 outline-none transition-all resize-y"
                  />
                </div>
              )}

              {type === 'image' && (
                <div className="space-y-4">
                  <FileUploader
                    bucket="default-screen"
                    onUpload={(uploadedUrl) => setUrl(uploadedUrl)}
                    accept="image/*"
                    currentUrl={url}
                    label="Upload Default Image"
                  />
                  
                  <div>
                    <label htmlFor="settings-url" className="block text-sm font-medium text-slate-350 mb-1.5">
                      Or Use External Image URL
                    </label>
                    <input
                      id="settings-url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/image.png"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-650 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {type === 'video' && (
                <div className="space-y-4">
                  <FileUploader
                    bucket="default-screen"
                    onUpload={(uploadedUrl) => setUrl(uploadedUrl)}
                    accept="video/*"
                    currentUrl={url}
                    label="Upload Default Video"
                  />
                  
                  <div>
                    <label htmlFor="settings-url" className="block text-sm font-medium text-slate-350 mb-1.5">
                      Or Use External Video URL
                    </label>
                    <input
                      id="settings-url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/video.mp4"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-650 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {type === 'html' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="settings-url" className="block text-sm font-medium text-slate-350 mb-1.5">
                      External Website URL (iframe fallback)
                    </label>
                    <input
                      id="settings-url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-650 outline-none transition-all"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      If specified, this website will be framed. Keep blank to render custom HTML code below.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="settings-html" className="block text-sm font-medium text-slate-350 mb-1.5">
                      Custom HTML Code (ignored if website URL is provided)
                    </label>
                    <textarea
                      id="settings-html"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="<h1>Welcome to ScreenSync</h1><p>No content active.</p>"
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-600 outline-none transition-all resize-y font-mono text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-5 text-center text-slate-400 text-sm">
              ℹ️ This project inherits global fallback configurations. Customize by choosing another tab above.
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all text-sm font-medium disabled:opacity-50 cursor-pointer"
            >
              Reset to Saved
            </button>
            
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={saving}
              onClick={handleSave}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              }
            >
              Save Settings
            </Button>
          </div>
        </div>

        {/* Live TV Preview Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-white tracking-wide">
              Live TV Display Preview
            </h4>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full animate-pulse">
              ● Simulated Kiosk
            </span>
          </div>

          {/* TV Frame Mockup */}
          <div className="flex flex-col items-center">
            {/* TV Screen Container */}
            <div className="w-full relative bg-slate-900 border-[10px] border-slate-800 rounded-3xl shadow-2xl overflow-hidden aspect-video transition-all duration-300">
              {/* Glossy TV screen overlay reflection */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-30 z-10" />
              
              {/* Kiosk preview frame */}
              <div className="w-full h-full pointer-events-none select-none overflow-hidden scale-100">
                <DefaultScreen settings={previewSettings} />
              </div>
            </div>
            
            {/* TV Stand Base */}
            <div className="w-28 h-2 bg-slate-800 rounded-b-xl shadow-md z-0" />
            <div className="w-40 h-1 bg-slate-850 rounded-b-md shadow-sm z-0" />
          </div>

          {/* Quick Notice */}
          <div className="bg-slate-900/20 border border-slate-800/50 rounded-xl p-4 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-300 block mb-0.5">ℹ️ Preview Information</span>
            {target === 'global' 
              ? 'This virtual screen illustrates how Kiosk clients will display this fallback content globally.' 
              : 'This virtual screen illustrates how Kiosk clients will display this fallback content when this specific project is active.'}
          </div>
        </div>
      </div>
    </div>
  );
}
