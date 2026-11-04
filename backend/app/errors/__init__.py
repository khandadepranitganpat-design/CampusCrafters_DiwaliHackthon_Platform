"""CampusCrafters Error Handling Module."""

from app.errors.exceptions import *
from app.errors.handlers import register_error_handlers

__all__ = ["register_error_handlers"]

