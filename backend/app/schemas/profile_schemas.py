"""CampusCrafters User Profile Marshmallow Schemas."""

from marshmallow import Schema, fields, validate


class ProfileUpdateSchema(Schema):
    """Schema for updating user profile details."""

    display_name = fields.String(validate=validate.Length(min=2, max=128))
    bio = fields.String(allow_none=True, validate=validate.Length(max=500))
    college = fields.String(validate=validate.Length(min=2, max=255))
    course = fields.String(allow_none=True, validate=validate.Length(max=128))
    year = fields.String(allow_none=True, validate=validate.Length(max=64))
    skills = fields.List(fields.String())

