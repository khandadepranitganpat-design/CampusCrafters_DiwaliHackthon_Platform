"""CampusCrafters Global Error Handlers."""

import logging
from flask import Flask, jsonify, request
from marshmallow import ValidationError as MarshmallowValidationError
from werkzeug.exceptions import HTTPException, NotFound, MethodNotAllowed

from app.errors.exceptions import AppError, ValidationError
from app.utils.responses import error_response

logger = logging.getLogger(__name__)


def register_error_handlers(app: Flask) -> None:
    """Register centralized error handlers on the Flask application."""

    @app.errorhandler(AppError)
    def handle_app_error(err: AppError):
        logger.warning(
            "AppError caught [%s]: %s (path: %s, method: %s)",
            err.error_code,
            err.message,
            request.path,
            request.method,
        )
        return error_response(
            code=err.error_code,
            message=err.message,
            status_code=err.status_code,
            field=err.field,
            details=err.details,
        )

    @app.errorhandler(MarshmallowValidationError)
    def handle_marshmallow_error(err: MarshmallowValidationError):
        logger.info("Marshmallow validation error on %s: %s", request.path, err.messages)
        # Flatten first error message
        field = None
        message = "Validation failed for request payload."
        if isinstance(err.messages, dict) and err.messages:
            field = next(iter(err.messages.keys()))
            first_val = err.messages[field]
            if isinstance(first_val, list) and first_val:
                message = str(first_val[0])
            else:
                message = str(first_val)

        return error_response(
            code="VALIDATION_ERROR",
            message=message,
            status_code=400,
            field=field,
            details=err.messages if isinstance(err.messages, dict) else {},
        )

    @app.errorhandler(NotFound)
    def handle_not_found(err: NotFound):
        return error_response(
            code="RESOURCE_NOT_FOUND",
            message=f"Endpoint or resource not found: {request.path}",
            status_code=404,
        )

    @app.errorhandler(MethodNotAllowed)
    def handle_method_not_allowed(err: MethodNotAllowed):
        return error_response(
            code="METHOD_NOT_ALLOWED",
            message=f"HTTP method {request.method} is not allowed for {request.path}",
            status_code=405,
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        return error_response(
            code="HTTP_ERROR",
            message=err.description or "HTTP error occurred.",
            status_code=err.code or 400,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_exception(err: Exception):
        logger.exception("Unhandled server exception encountered on %s %s: %s", request.method, request.path, str(err))
        return error_response(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred. Please try again later.",
            status_code=500,
        )

