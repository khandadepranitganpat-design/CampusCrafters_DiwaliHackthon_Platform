"""CampusCrafters Announcement Marshmallow Schemas."""

from marshmallow import Schema, fields, validate


class AnnouncementCreateSchema(Schema):
    """Schema for broadcasting announcements."""

    title = fields.String(required=True, validate=validate.Length(min=3, max=255))
    message = fields.String(required=True, validate=validate.Length(min=5))
    category = fields.String(
        required=True,
        validate=validate.OneOf(["registration", "community", "event", "submissions", "beginner"]),
    )
    priority = fields.String(
        load_default="normal",
        validate=validate.OneOf(["normal", "high", "urgent"]),
    )

