import json

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.audit_log import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_action(
        self,
        action: str,
        user_id: int = None,
        entity_type: str = None,
        entity_id: int = None,
        details: str | dict = None,
        request: Request = None
    ):
        """Log an audit action"""
        ip_address = None
        user_agent = None

        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")

        if isinstance(details, dict):
            details = json.dumps(details)

        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(audit_log)
        await self.db.commit()
