import { useState, useEffect, useCallback } from 'react';
import appService from '../services/appService';

/**
 * Hook to fetch and manage the list of all available signage apps.
 */
export function useApps() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await appService.getApps();
      setApps(data || []);
    } catch (err) {
      console.error('Failed to fetch apps:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load apps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  return {
    apps,
    loading,
    error,
    refetch: fetchApps,
  };
}

export default useApps;
