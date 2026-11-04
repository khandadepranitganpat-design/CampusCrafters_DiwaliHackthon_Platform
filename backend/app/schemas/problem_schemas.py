"""CampusCrafters Problem Statement Marshmallow Schemas."""

from marshmallow import Schema, fields, validate


class ProblemSelectSchema(Schema):
    """Schema for selecting or locking a problem statement."""

    problem_statement_id = fields.String(required=True, validate=validate.Length(min=2, max=64))

