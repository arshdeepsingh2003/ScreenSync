class AppNotFoundError(Exception):
    """Raised when an app is not found by ID."""
    pass

class ScreenNotFoundError(Exception):
    """Raised when a screen is not found by ID."""
    pass

class ContentNotFoundError(Exception):
    """Raised when a content/slide is not found by ID."""
    pass

class ScreenNumberTakenError(Exception):
    """Raised when a screen number is already taken by another screen."""
    pass

class InvalidCredentialsError(Exception):
    """Raised when authentication fails due to invalid credentials."""
    pass
