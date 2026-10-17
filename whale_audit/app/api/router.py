"""
Master API router aggregating query, controls, audit, and auth endpoints.
"""

from fastapi import APIRouter
from whale_audit.app.api.queries import router as queries_router
from whale_audit.app.api.controls import router as controls_router
from whale_audit.app.api.audit import router as audit_router

api_router = APIRouter(prefix="/api")

api_router.include_router(queries_router, tags=["Queries"])
api_router.include_router(controls_router, prefix="/controls", tags=["Controls"])
api_router.include_router(audit_router, prefix="/audit", tags=["Audit"])
