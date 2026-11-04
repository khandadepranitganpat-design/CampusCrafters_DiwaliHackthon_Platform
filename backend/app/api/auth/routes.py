"""CampusCrafters Authentication Endpoints."""

from flask import Blueprint, current_app, g, request
from app.security.sso import SSO_COOKIE_NAME, sso_client
from app.errors.exceptions import NotFoundError
from app.security.decorators import require_auth
from app.schemas.auth_schemas import DevLoginSchema, DevSignupSchema, SSOCallbackSchema, ForgotPasswordSchema
from app.utils.responses import success_response

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/dev/login", methods=["POST"])
def dev_login():
    """Development login simulation (disabled in production)."""
    if current_app.config.get("ENV") == "production":
        raise NotFoundError("Development authentication routes are disabled in production.")

    data = DevLoginSchema().load(request.get_json() or {})
    result = g.auth_service.dev_login(data["email"], data["password"])
    return success_response(result, 200)


@auth_bp.route("/dev/signup", methods=["POST"])
def dev_signup():
    """Development signup simulation (disabled in production)."""
    if current_app.config.get("ENV") == "production":
        raise NotFoundError("Development authentication routes are disabled in production.")

    data = DevSignupSchema().load(request.get_json() or {})
    result = g.auth_service.dev_signup(data)
    return success_response(result, 201)


@auth_bp.route("/sso/login", methods=["GET"])
def sso_login():
    """Begin Campus Crafter SSO: returns the provider authorization URL and sets the signed flow cookie."""
    flow = sso_client.begin_login()
    response, status = success_response({"authorization_url": flow["authorization_url"], "state": flow["state"]}, 200)
    response.set_cookie(
        SSO_COOKIE_NAME,
        flow["cookie_value"],
        max_age=current_app.config.get("SSO_STATE_TTL_SECONDS", 600),
        httponly=True,
        secure=current_app.config.get("SSO_COOKIE_SECURE", False),
        samesite=current_app.config.get("SSO_COOKIE_SAMESITE", "Lax"),
        path="/api/v1/auth",
    )
    return response, status


@auth_bp.route("/sso/callback", methods=["POST"])
def sso_callback():
    """Production Campus Crafter SSO authorization callback (state/nonce/PKCE verified)."""
    data = SSOCallbackSchema().load(request.get_json() or {})
    claims = sso_client.complete_login(
        data["code"], data["state"], data["redirect_uri"], request.cookies.get(SSO_COOKIE_NAME)
    )
    result = g.auth_service.sso_login_from_claims(claims)
    response, status = success_response(result, 200)
    response.delete_cookie(SSO_COOKIE_NAME, path="/api/v1/auth")
    return response, status


@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_me():
    """Get active authenticated user session context."""
    user_context = g.auth_service.get_current_user_context(g.current_user_id)
    return success_response(user_context, 200)


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    """Server-side token revocation and session logout."""
    g.auth_service.logout(g.token_jti, g.current_user_id, g.token_exp)
    return success_response({"message": "Session revoked successfully."}, 200)


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Password reset instruction dispatch simulation."""
    ForgotPasswordSchema().load(request.get_json() or {})
    return success_response(
        {"message": "If an account exists with this email, reset instructions have been dispatched."},
        200,
    )

