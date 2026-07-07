import { useState, useEffect, useCallback } from 'react';
import contentService from '../services/contentService';

/**
 * Hook to fetch and manage slides for a specific app.
 */
export function useAppSlides(appId) {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSlides = useCallback(async () => {
    if (!appId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await contentService.getSlides(appId);
      setSlides(data || []);
    } catch (err) {
      console.error('Failed to fetch slides:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load slides');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  return {
    slides,
    setSlides,
    loading,
    error,
    refetch: fetchSlides,
  };
}

export default useAppSlides;
