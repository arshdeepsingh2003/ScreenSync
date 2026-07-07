import { useMemo } from 'react';
import useSession from './useSession';
import { computeAssignment } from '../utils/distribution';

/**
 * Hook to compute the assigned slide content for a specific screen.
 * Resolves screen rank position and applies the distribution algorithm.
 * 
 * @param {string|number} screenId - The database ID or screen_number of the target TV.
 * @returns {Object|null} The assigned slide object or null if it falls back to the Default Screen.
 */
export function useSlideAssignment(screenId) {
  const { slides, screens, currentBatch } = useSession();

  return useMemo(() => {
    if (!screens || screens.length === 0) {
      return null;
    }

    // 1. Filter active screens and sort by screen_number (just like backend)
    const activeScreens = screens
      .filter((s) => s.is_active)
      .sort((a, b) => a.screen_number - b.screen_number);

    // 2. Find position index of the requested screen
    const screenIndex = activeScreens.findIndex(
      (s) => s.id === Number(screenId) || s.screen_number === Number(screenId)
    );

    if (screenIndex === -1) {
      // Screen is not active or does not exist
      return null;
    }

    // 3. Compute assignment map for active screens
    const assignmentMap = computeAssignment(slides, activeScreens, currentBatch);

    // Get the screen object to retrieve its exact database ID key
    const targetScreen = activeScreens[screenIndex];
    return assignmentMap[targetScreen.id] || null;
  }, [slides, screens, currentBatch, screenId]);
}

export default useSlideAssignment;
