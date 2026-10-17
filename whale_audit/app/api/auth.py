"""
Authentication and authorization dependencies for Whale Surveillance Dashboard.
"""

from typing import Optional
from fastapi import Header, HTTPException, status
from pydantic import BaseModel
from whale_audit.app.config import settings


class UserSession(BaseModel):
    user_id: str
    role: str
    is_authenticated: bool
    can_execute: bool
    can_reset_breaker: bool


async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_operator_token: Optional[str] = Header(None),
) -> UserSession:
    token = None
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
        else:
            token = authorization
    elif x_operator_token:
        token = x_operator_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please provide a valid Bearer token.",
        )

    if token == settings.operator_token:
        return UserSession(
            user_id="operator_admin",
            role="operator",
            is_authenticated=True,
            can_execute=True,
            can_reset_breaker=True,
        )

    if token == settings.readonly_token:
        return UserSession(
            user_id="viewer_guest",
            role="viewer",
            is_authenticated=True,
            can_execute=False,
            can_reset_breaker=False,
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authorization token.",
    )


async def require_operator(
    authorization: Optional[str] = Header(None),
    x_operator_token: Optional[str] = Header(None),
) -> UserSession:
    user = await get_current_user(authorization, x_operator_token)
    if user.role != "operator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operator privileges required for this action.",
        )
    return user
