"""CampusCrafters Domain Exception Hierarchy."""

from typing import Any, Dict, Optional


class AppError(Exception):
    """Base application exception with HTTP status code and standardized error code."""

    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = 500,
        field: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.field = field
        self.details = details or {}


class ValidationError(AppError):
    def __init__(self, message: str = "Field validation failed.", field: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, error_code="VALIDATION_ERROR", status_code=400, field=field, details=details)


class InvalidPayloadError(AppError):
    def __init__(self, message: str = "Malformed or unparseable request JSON body.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, error_code="INVALID_PAYLOAD", status_code=400, details=details)


class MinTeamSizeNotMetError(AppError):
    def __init__(self, message: str = "Team has fewer members than the minimum requirement."):
        super().__init__(message=message, error_code="MIN_TEAM_SIZE_NOT_MET", status_code=400)


class ProblemStatementRequiredError(AppError):
    def __init__(self, message: str = "An active problem statement must be selected prior to final submission."):
        super().__init__(message=message, error_code="PROBLEM_STATEMENT_REQUIRED", status_code=400)


class LeaderCannotLeaveError(AppError):
    def __init__(self, message: str = "Team leader cannot leave a multi-member team without transferring leadership."):
        super().__init__(message=message, error_code="LEADER_CANNOT_LEAVE", status_code=400)


class InvalidStateError(AppError):
    def __init__(self, message: str = "Invalid OAuth state parameter."):
        super().__init__(message=message, error_code="INVALID_STATE", status_code=400)


class AuthenticationError(AppError):
    def __init__(self, message: str = "Authentication failed or token is missing/expired/revoked."):
        super().__init__(message=message, error_code="UNAUTHORIZED", status_code=401)


class AuthorizationError(AppError):
    def __init__(self, message: str = "Access forbidden. Required role or permission missing."):
        super().__init__(message=message, error_code="FORBIDDEN", status_code=403)


class RegistrationRequiredError(AppError):
    def __init__(self, message: str = "Operation requires a registered hackathon participant."):
        super().__init__(message=message, error_code="REGISTRATION_REQUIRED", status_code=403)


class EventStateLockedError(AppError):
    def __init__(self, message: str = "Action not permitted under current event lifecycle state."):
        super().__init__(message=message, error_code="EVENT_STATE_LOCKED", status_code=403)


class NotFoundError(AppError):
    def __init__(self, message: str = "Requested resource not found."):
        super().__init__(message=message, error_code="RESOURCE_NOT_FOUND", status_code=404)


class ConflictError(AppError):
    def __init__(self, message: str = "Conflict with existing resource state.", error_code: str = "RESOURCE_CONFLICT"):
        super().__init__(message=message, error_code=error_code, status_code=409)


class UserAlreadyRegisteredError(ConflictError):
    def __init__(self, message: str = "User is already registered for this hackathon."):
        super().__init__(message=message, error_code="USER_ALREADY_REGISTERED")


class UserAlreadyInTeamError(ConflictError):
    def __init__(self, message: str = "User already belongs to an active team."):
        super().__init__(message=message, error_code="USER_ALREADY_IN_TEAM")


class TeamCapacityExceededError(ConflictError):
    def __init__(self, message: str = "Team has already reached maximum participant capacity."):
        super().__init__(message=message, error_code="TEAM_CAPACITY_EXCEEDED")


class JoinCodeInvalidError(ConflictError):
    def __init__(self, message: str = "Provided team join code is invalid or does not match any active team."):
        super().__init__(message=message, error_code="JOIN_CODE_INVALID")


class SubmissionLockedError(AppError):
    def __init__(self, message: str = "Project submission is permanently locked and cannot be modified."):
        super().__init__(message=message, error_code="SUBMISSION_LOCKED", status_code=423)


class DeadlineExpiredError(AppError):
    def __init__(self, message: str = "Submission deadline has passed."):
        super().__init__(message=message, error_code="DEADLINE_EXPIRED", status_code=423)


class EvaluationLockedError(AppError):
    def __init__(self, message: str = "Evaluation window has closed. Scores cannot be modified."):
        super().__init__(message=message, error_code="EVALUATION_LOCKED", status_code=423)



class SSONotConfiguredError(AppError):
    def __init__(self, message: str = "Campus Crafter SSO is not configured on this server."):
        super().__init__(message=message, error_code="SSO_NOT_CONFIGURED", status_code=503)


class SSOProviderError(AppError):
    def __init__(self, message: str = "The SSO identity provider could not be reached or rejected the request."):
        super().__init__(message=message, error_code="SSO_PROVIDER_ERROR", status_code=502)
