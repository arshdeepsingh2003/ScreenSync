import { useState, useEffect, useCallback } from 'react';
import screenService from '../services/screenService';

/**
 * Hook to fetch and manage the list of all screens.
 */
export function useScreens() {
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchScreens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await screenService.getScreens();
      setScreens(data || []);
    } catch (err) {
      console.error('Failed to fetch screens:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load screens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScreens();
  }, [fetchScreens]);

  return {
    screens,
    loading,
    error,
    refetch: fetchScreens,
  };
}

export default useScreens;
