"""CampusCrafters Registration Marshmallow Schemas."""

from marshmallow import Schema, fields, validate


class RegistrationSubmitSchema(Schema):
    """Schema for submitting full hackathon registration."""

    full_name = fields.String(required=True, validate=validate.Length(min=2, max=128))
    email = fields.Email(required=True, validate=validate.Length(min=5, max=255))
    college = fields.String(required=True, validate=validate.Length(min=2, max=255))
    course = fields.String(allow_none=True, validate=validate.Length(max=128))
    year = fields.String(allow_none=True, validate=validate.Length(max=64))
    phone = fields.String(allow_none=True, validate=validate.Length(max=32))
    skills = fields.List(fields.String(), load_default=[])
    interests = fields.List(fields.String(), load_default=[])
    bio = fields.String(allow_none=True, validate=validate.Length(max=500))
    experience = fields.String(
        required=True,
        validate=validate.OneOf(["beginner", "intermediate", "advanced"]),
    )
    track_id = fields.String(required=True, validate=validate.Length(min=2, max=64))
    rules_accepted = fields.Boolean(
        required=True,
        validate=lambda x: x is True,
        error="You must accept the hackathon rules to register.",
    )


class WaitlistSubmitSchema(Schema):
    """Schema for waitlist application when event is full."""

    full_name = fields.String(required=True, validate=validate.Length(min=2, max=128))
    email = fields.Email(required=True, validate=validate.Length(min=5, max=255))
    college = fields.String(allow_none=True, validate=validate.Length(max=255))
    track_interest = fields.String(load_default="any", validate=validate.Length(max=64))

