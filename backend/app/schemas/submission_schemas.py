"""CampusCrafters Submission Marshmallow Schemas."""

from marshmallow import Schema, fields, validate


class SubmissionDraftSchema(Schema):
    """Schema for auto-saving project draft (partial updates allowed)."""

    problem_statement_id = fields.String(allow_none=True)
    project_title = fields.String(allow_none=True, validate=validate.Length(max=100))
    short_description = fields.String(allow_none=True, validate=validate.Length(max=250))
    detailed_description = fields.String(allow_none=True)
    repository_url = fields.String(allow_none=True, validate=validate.Length(max=512))
    demo_url = fields.String(allow_none=True, validate=validate.Length(max=512))
    presentation_url = fields.String(allow_none=True, validate=validate.Length(max=512))
    tech_stack = fields.List(fields.String(), allow_none=True)


class SubmissionFinalSchema(Schema):
    """Schema for final immutable project submission."""

    problem_statement_id = fields.String(allow_none=True)
    project_title = fields.String(required=True, validate=validate.Length(min=3, max=100))
    short_description = fields.String(required=True, validate=validate.Length(min=10, max=250))
    detailed_description = fields.String(required=True, validate=validate.Length(min=30))
    repository_url = fields.String(
        required=True,
        validate=[
            validate.Length(min=8, max=512),
            validate.Regexp(r"^https://", error="Repository URL must strictly use HTTPS protocol."),
        ],
    )
    demo_url = fields.String(allow_none=True, validate=validate.Length(max=512))
    presentation_url = fields.String(allow_none=True, validate=validate.Length(max=512))
    tech_stack = fields.List(
        fields.String(),
        required=True,
        validate=validate.Length(min=1, error="At least one tech stack item is required."),
    )

