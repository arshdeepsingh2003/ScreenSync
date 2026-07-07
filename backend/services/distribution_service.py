from typing import List, Dict, Optional
from backend.models.content import Content
from backend.models.screen import Screen

def compute_assignment(
    slides: List[Content],
    screens: List[Screen],
    current_batch: int
) -> Dict[int, Optional[Content]]:
    """
    Compute slide assignment for each screen at the current batch.
    
    Inputs:
    - slides: ordered list of active Content items (sorted by display_order).
    - screens: ordered list of active Screen items (sorted by screen_number).
    - current_batch: current batch index (0-based).
    
    Returns:
    - Dict mapping screen.id (int) to Content or None.
    """
    number_of_screens = len(screens)
    if number_of_screens == 0:
        return {}
        
    start_index = current_batch * number_of_screens
    assignment = {}
    
    for position_index, screen in enumerate(screens):
        slide_index = start_index + position_index
        if slide_index < len(slides):
            assignment[screen.id] = slides[slide_index]
        else:
            assignment[screen.id] = None
            
    return assignment
