/**
 * Computes slide assignments for active screens at the current batch.
 * This is a pure function matching the backend's distribution algorithm.
 * 
 * @param {Array} slides - Ordered list of active Content items (sorted by display_order).
 * @param {Array} activeScreens - Ordered list of active Screen items (sorted by screen_number).
 * @param {number} currentBatch - Current batch index (0-based).
 * @returns {Object} Mapping of screen ID to slide object (or null).
 */
export function computeAssignment(slides, activeScreens, currentBatch) {
  const numberOfScreens = activeScreens.length;
  if (numberOfScreens === 0) {
    return {};
  }
  
  const startIndex = currentBatch * numberOfScreens;
  const assignment = {};
  
  activeScreens.forEach((screen, positionIndex) => {
    const slideIndex = startIndex + positionIndex;
    if (slideIndex < slides.length) {
      assignment[screen.id] = slides[slideIndex];
    } else {
      assignment[screen.id] = null;
    }
  });
  
  return assignment;
}
