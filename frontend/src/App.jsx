import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [healthStatus, setHealthStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const checkHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      // Hit local FastAPI server (default port 8000)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await axios.get(`${apiUrl}/api/health`)
      setHealthStatus(response.data)
    } catch (err) {
      console.error('Error fetching health status:', err)
      setError(err.message || 'Failed to connect to backend')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              SS
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white m-0">ScreenSync</h1>
              <p className="text-xs text-slate-400">Digital Signage CMS</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Phase 0 — Setup
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col justify-center">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 shadow-xl backdrop-blur-sm max-w-xl w-full mx-auto">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            System Connectivity Status
          </h2>

          <div className="space-y-6">
            {/* Backend connection state */}
            <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="font-medium text-slate-300 font-sans">FastAPI Backend Status</span>
              {loading ? (
                <span className="flex items-center space-x-2 text-slate-400">
                  <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                  <span>Checking...</span>
                </span>
              ) : error ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 font-sans">
                  Disconnected ❌
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                  Connected ✅
                </span>
              )}
            </div>

            {/* Detailed results */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3 text-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 font-sans">
                Connection Parameters
              </h3>

              {loading ? (
                <div className="h-20 flex items-center justify-center text-slate-400 text-xs">
                  Awaiting backend response...
                </div>
              ) : error ? (
                <div className="text-red-400 bg-red-500/5 p-3 rounded-lg border border-red-500/10 text-xs font-mono break-all text-left">
                  <strong>Connection Error:</strong> {error}
                  <p className="mt-2 text-slate-400 font-sans">
                    Ensure the FastAPI server is running at <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-mono">http://localhost:8000</code> and CORS allows requests from this page.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Database Configured:</span>
                    <span className={`font-mono font-semibold ${healthStatus.database?.configured ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {healthStatus.database?.configured ? 'YES' : 'NO (Missing DATABASE_URL)'}
                    </span>
                  </div>
                  {healthStatus.database?.configured && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Database Connected:</span>
                      <span className={`font-mono font-semibold ${healthStatus.database?.connected ? 'text-emerald-400' : 'text-red-400'}`}>
                        {healthStatus.database?.connected ? 'YES' : 'NO (Connection Failed)'}
                      </span>
                    </div>
                  )}
                  {healthStatus.database?.error && (
                    <div className="text-red-400 bg-red-500/5 p-2 rounded border border-red-500/10 text-xs font-mono break-all mt-1">
                      <strong>DB Error:</strong> {healthStatus.database.error}
                    </div>
                  )}
                  <div className="border-t border-slate-800 my-2 pt-2"></div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Supabase Configured:</span>
                    <span className={`font-mono font-semibold ${(healthStatus.supabase?.url_configured && healthStatus.supabase?.key_configured) ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {(healthStatus.supabase?.url_configured && healthStatus.supabase?.key_configured) ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Refresh action */}
            <button
              onClick={checkHealth}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-center block cursor-pointer"
            >
              {loading ? 'Polling server...' : 'Test Connection Again'}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500 font-sans">
        ScreenSync © 2026. Phase 0 setup validated with Tailwind CSS v4 & Axios.
      </footer>
    </div>
  )
}

export default App
