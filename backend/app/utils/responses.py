"""CampusCrafters Universal Response Envelopes."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from flask import jsonify, Response


def format_utc_now() -> str:
    """Return ISO 8601 UTC timestamp ending strictly in Z."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def success_response(data: Any, status_code: int = 200, meta: Optional[Dict[str, Any]] = None) -> Tuple[Response, int]:
    """Universal success envelope.
    
    Format:
    {
        "success": true,
        "data": { ... },
        "meta": {
            "timestamp": "2026-11-04T12:00:00Z",
            "version": "v1"
        }
    }
    """
    response_meta = {
        "timestamp": format_utc_now(),
        "version": "v1",
    }
    if meta:
        response_meta.update(meta)

    payload = {
        "success": True,
        "data": data,
        "meta": response_meta,
    }
    return jsonify(payload), status_code


def error_response(
    code: str,
    message: str,
    status_code: int = 400,
    field: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> Tuple[Response, int]:
    """Universal error envelope.
    
    Format:
    {
        "success": false,
        "error": {
            "code": "STRING_CODE",
            "message": "Human readable explanation",
            "field": null,
            "details": {}
        },
        "meta": {
            "timestamp": "2026-11-04T12:00:00Z",
            "version": "v1"
        }
    }
    """
    payload = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "field": field,
            "details": details if details is not None else {},
        },
        "meta": {
            "timestamp": format_utc_now(),
            "version": "v1",
        },
    }
    return jsonify(payload), status_code

