"""CampusCrafters Admin Marshmallow Schemas."""

from marshmallow import Schema, fields, validate


class AdminEventStateSchema(Schema):
    """Schema for admin override of event state."""

    event_state = fields.String(
        required=True,
        validate=validate.OneOf(
            [
                "teaser",
                "reg_open",
                "almost_full",
                "full",
                "reg_closed",
                "event_live",
                "judging",
                "results",
            ]
        ),
    )


class AdminDeadlineSchema(Schema):
    """Schema for admin deadline modification."""

    submission_deadline_utc = fields.String(
        allow_none=True,
        validate=validate.Regexp(
            r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$",
            error="Deadline must be a valid ISO 8601 UTC timestamp (e.g. 2026-11-15T18:30:00Z).",
        ),
    )


class AdminProblemToggleSchema(Schema):
    """Schema for toggling problem statement activation."""

    is_active = fields.Boolean(required=True)

