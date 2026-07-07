import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { SessionProvider } from './contexts/SessionContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import TVLayout from './layouts/TVLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import TVPage from './pages/tv/TVPage';
import LoginPage from './pages/admin/LoginPage';
import OverviewPage from './pages/admin/OverviewPage';
import AppsPage from './pages/admin/AppsPage';
import AppSlidesPage from './pages/admin/AppSlidesPage';
import ScreensPage from './pages/admin/ScreensPage';
import SettingsPage from './pages/admin/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <SessionProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Dashboard Route */}
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<DashboardPage />} />
              </Route>

              {/* TV Playback Route */}
              <Route path="/tv" element={<TVLayout />}>
                <Route path=":screenId" element={<TVPage />} />
              </Route>

              {/* Admin Public Route */}
              <Route path="/admin/login" element={<LoginPage />} />

              {/* Admin Protected Routes */}
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <AdminLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<OverviewPage />} />
                <Route path="apps" element={<AppsPage />} />
                <Route path="apps/:appId/slides" element={<AppSlidesPage />} />
                <Route path="screens" element={<ScreensPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Fallback Redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SessionProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
