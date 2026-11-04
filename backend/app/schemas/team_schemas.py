"""CampusCrafters Team Marshmallow Schemas."""

from marshmallow import Schema, fields, validate


class TeamCreateSchema(Schema):
    """Schema for team creation."""

    name = fields.String(required=True, validate=validate.Length(min=3, max=128))
    track_id = fields.String(required=True, validate=validate.Length(min=2, max=64))


class TeamJoinSchema(Schema):
    """Schema for joining a team via join code."""

    join_code = fields.String(
        required=True,
        validate=validate.Regexp(
            r"^[A-Za-z]{2}-[A-Za-z0-9]{4}$",
            error="Join code must follow XX-XXXX format (e.g. CS-4K9M or CC-4F7K).",
        ),
    )


class TeamRenameSchema(Schema):
    """Schema for renaming a team."""

    name = fields.String(required=True, validate=validate.Length(min=3, max=128))


class TransferLeadershipSchema(Schema):
    """Schema for transferring team leadership."""

    new_leader_id = fields.String(required=True, validate=validate.Length(min=2, max=64))

