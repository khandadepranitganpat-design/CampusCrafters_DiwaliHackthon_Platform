"""CampusCrafters Authentication Marshmallow Schemas."""

from marshmallow import Schema, fields, validate


class DevLoginSchema(Schema):
    """Schema for development login endpoint."""

    email = fields.Email(required=True, validate=validate.Length(min=5, max=255))
    password = fields.String(required=True, validate=validate.Length(min=6, max=128))


class DevSignupSchema(Schema):
    """Schema for development signup endpoint."""

    full_name = fields.String(required=True, validate=validate.Length(min=2, max=128))
    email = fields.Email(required=True, validate=validate.Length(min=5, max=255))
    college = fields.String(required=True, validate=validate.Length(min=2, max=255))
    course = fields.String(allow_none=True, validate=validate.Length(max=128))
    year = fields.String(allow_none=True, validate=validate.Length(max=64))
    phone = fields.String(allow_none=True, validate=validate.Length(max=32))
    password = fields.String(required=True, validate=validate.Length(min=6, max=128))
    confirm_password = fields.String(required=True, validate=validate.Length(min=6, max=128))


class SSOCallbackSchema(Schema):
    """Schema for production SSO authorization callback."""

    code = fields.String(required=True)
    state = fields.String(required=True)
    redirect_uri = fields.Url(required=True)


class ForgotPasswordSchema(Schema):
    """Schema for password reset request simulation."""

    email = fields.Email(required=True)

