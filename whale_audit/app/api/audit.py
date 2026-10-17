"""
Audit log querying endpoints.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from whale_audit.app.state.db import get_db
from whale_audit.app.state.models import OperatorActionLog

router = APIRouter()


@router.get("/logs")
async def get_audit_logs(
    action_type: Optional[str] = Query(None),
    operator_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    query = select(OperatorActionLog).order_by(desc(OperatorActionLog.timestamp))
    if action_type:
        query = query.where(OperatorActionLog.action_type == action_type)
    if operator_id:
        query = query.where(OperatorActionLog.operator_id == operator_id)
    query = query.limit(limit)

    result = await db.execute(query)
    logs = [
        {
            "id": l.id,
            "operator_id": l.operator_id,
            "action_type": l.action_type,
            "payload": l.payload_json,
            "ip_address": l.ip_address,
            "status": l.status,
            "details": l.details,
            "timestamp": l.timestamp.isoformat() if l.timestamp else "",
        }
        for l in result.scalars().all()
    ]

    return {
        "status": "success",
        "total": len(logs),
        "logs": logs,
    }
