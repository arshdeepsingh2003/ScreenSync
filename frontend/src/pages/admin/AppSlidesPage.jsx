import React from 'react';
import { useParams } from 'react-router-dom';

export default function AppSlidesPage() {
  const { appId } = useParams();

  return (
    <div className="space-y-4 font-sans">
      <h3 className="text-2xl font-bold text-white">App Slides Manager</h3>
      <p className="text-slate-400 text-sm">
        Manage and reorder slides for App ID: <span className="font-semibold text-indigo-400">#{appId}</span>. (Phase 8 CMS Feature)
      </p>
      <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-600 bg-slate-900/10">
        Slide list & drag-and-drop reorder placeholder.
      </div>
    </div>
  );
}
