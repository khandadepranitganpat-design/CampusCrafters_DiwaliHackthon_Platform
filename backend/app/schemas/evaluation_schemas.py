"""CampusCrafters Evaluation Marshmallow Schemas."""

from marshmallow import Schema, fields, validate


class EvaluationScoreSchema(Schema):
    """Schema for judge rubric scoring."""

    innovation_score = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=30, error="Innovation score must be between 0 and 30."),
    )
    technical_score = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=30, error="Technical score must be between 0 and 30."),
    )
    uiux_score = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=20, error="UI/UX score must be between 0 and 20."),
    )
    impact_score = fields.Integer(
        required=True,
        validate=validate.Range(min=0, max=20, error="Impact score must be between 0 and 20."),
    )
    feedback = fields.String(allow_none=True, validate=validate.Length(max=1000))

