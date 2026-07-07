/* eslint-disable react/only-export-components */
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import useSocket from '../hooks/useSocket';
import sessionService from '../services/sessionService';
import contentService from '../services/contentService';
import settingsService from '../services/settingsService';

export const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { socket, isConnected } = useSocket();

  const [activeAppId, setActiveAppId] = useState(null);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [screens, setScreens] = useState([]);
  const [slides, setSlides] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep a ref of activeAppId to avoid unnecessary trigger re-declarations
  const activeAppIdRef = useRef(null);
  useEffect(() => {
    activeAppIdRef.current = activeAppId;
  }, [activeAppId]);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Session State
      const sessionState = await sessionService.getSessionState();
      setActiveAppId(sessionState.active_app_id);
      setCurrentBatch(sessionState.current_batch);
      setScreens(sessionState.screens || []);

      // 2. Fetch Slides if active app exists
      if (sessionState.active_app_id) {
        const slidesData = await contentService.getSlides(sessionState.active_app_id);
        setSlides(slidesData || []);
      } else {
        setSlides([]);
      }

      // 3. Fetch Settings
      const settingsData = await settingsService.getSettings();
      setSettings(settingsData);
    } catch (err) {
      console.error('Failed to sync session state:', err);
      setError(err.message || 'Failed to sync with server');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial session state on mount
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Set up socket event handlers for real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log('Socket reconnected, forcing full resync...');
      refreshSession();
    };

    const handleAppActivated = (data) => {
      console.log('[WS Event] app:activated ->', data);
      refreshSession();
    };

    const handleBatchChanged = (data) => {
      console.log('[WS Event] batch:changed ->', data);
      // Optimistic instant patch
      if (data && typeof data.current_batch === 'number') {
        setCurrentBatch(data.current_batch);
      }
    };

    const handleContentUpdated = (data) => {
      console.log('[WS Event] content:updated ->', data);
      // Check if update applies to the currently active app
      if (data && data.app_id === activeAppIdRef.current) {
        refreshSession();
      }
    };

    const handleScreenUpdated = () => {
      console.log('[WS Event] screen:updated');
      refreshSession();
    };

    const handleSettingsUpdated = (data) => {
      console.log('[WS Event] settings:updated ->', data);
      if (data) {
        setSettings(data);
      } else {
        refreshSession();
      }
    };

    // Attach listeners
    socket.on('connect', handleConnect);
    socket.on('app:activated', handleAppActivated);
    socket.on('batch:changed', handleBatchChanged);
    socket.on('content:updated', handleContentUpdated);
    socket.on('screen:updated', handleScreenUpdated);
    socket.on('settings:updated', handleSettingsUpdated);

    return () => {
      // Detach listeners
      socket.off('connect', handleConnect);
      socket.off('app:activated', handleAppActivated);
      socket.off('batch:changed', handleBatchChanged);
      socket.off('content:updated', handleContentUpdated);
      socket.off('screen:updated', handleScreenUpdated);
      socket.off('settings:updated', handleSettingsUpdated);
    };
  }, [socket, refreshSession]);

  return (
    <SessionContext.Provider
      value={{
        activeAppId,
        currentBatch,
        screens,
        slides,
        settings,
        loading,
        error,
        refreshSession,
        isConnected,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
